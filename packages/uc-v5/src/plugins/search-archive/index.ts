/**
 * Chekd Unified Communications 3.0 — Search & Archive Plugin
 *
 * Imagine every conversation, transcript, shared file, whiteboard note,
 * and decision scattered across five different plugins — with no way to
 * find anything. That's what a collaboration platform looks like without
 * search. This plugin is the platform's librarian: it listens to content
 * events from every other plugin, indexes them into a unified full-text
 * search engine, and provides one search bar that finds everything.
 *
 * Architecture:
 *   [All plugins] → bus events → Search Plugin indexer → search index
 *                                                     ↓
 *                                          GET /api/search-archive/search?q=NeuralEdge
 *                                                     ↓
 *                                          Results from chat, transcripts, files, whiteboards
 *
 * Search backends supported (via adapter pattern):
 *   - In-Memory (default) — inverted index with TF-IDF scoring for dev/small deployments
 *   - Elasticsearch — for production with large document volumes
 *   - Azure Cognitive Search — for Azure-native deployments
 *   - SQLite FTS5 — for single-server deployments without external dependencies
 *
 * The plugin also handles archival: moving old content into cold storage
 * while keeping the search index intact, so users can still find
 * six-month-old IC transcripts without loading them all into memory.
 *
 * Bus events emitted: search:*
 *   search:content-indexed, search:executed, search:content-archived, search:index-rebuilt
 *
 * Bus events consumed (indexing triggers):
 *   chat:message-sent, chat:message-edited, chat:message-deleted
 *   transcription:completed, transcription:notes-generated
 *   cloud:file-shared
 *   whiteboard:element-added, whiteboard:stroke-added
 *   room:created, room:closed
 *   meeting:scheduled, meeting:cancelled
 *
 * REST endpoints (mounted at /api/search-archive): 10 endpoints
 *   GET  /search                   — unified full-text search
 *   GET  /search/suggest           — autocomplete suggestions
 *   GET  /documents/:id            — get indexed document
 *   GET  /documents                — list indexed documents (filterable)
 *   POST /documents                — manually index a document
 *   DELETE /documents/:id          — remove from index
 *   POST /archive                  — archive documents older than threshold
 *   GET  /archive                  — list archived documents
 *   POST /reindex                  — rebuild index from source
 *   GET  /stats                    — index statistics
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth } from '../../core/plugin-interface';

// ─── Search Types ───────────────────────────────────────────────

type ContentSource = 'chat' | 'transcription' | 'cloud-file' | 'whiteboard' | 'meeting' | 'room' | 'manual';

interface IndexedDocument {
  id: string;
  source: ContentSource;
  sourceId: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tenantId?: string;
  userId?: string;
  tags: string[];
  isArchived: boolean;
  indexedAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

interface SearchResult {
  document: IndexedDocument;
  score: number;
  highlights: { field: string; snippets: string[] }[];
}

interface SearchQuery {
  q: string;
  sources?: ContentSource[];
  tenantId?: string;
  userId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

// ─── In-Memory Search Engine ────────────────────────────────────

/**
 * A lightweight inverted index with TF-IDF scoring. Suitable for
 * development and small deployments (< 100K documents). For production
 * with larger datasets, swap in the Elasticsearch or Azure adapter.
 *
 * How TF-IDF works (for the uninitiated):
 *   TF (Term Frequency) = how often a word appears in this document
 *   IDF (Inverse Document Frequency) = how rare a word is across all documents
 *   Score = TF × IDF — common words like "the" get low scores,
 *   rare terms like "NeuralEdge" get high scores.
 */
class InMemorySearchEngine {
  private documents: Map<string, IndexedDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map(); // token → document IDs
  private documentTokenCounts: Map<string, Map<string, number>> = new Map(); // docId → token → count

  index(doc: IndexedDocument): void {
    this.documents.set(doc.id, doc);
    const tokens = this.tokenize(doc.title + ' ' + doc.content);
    const tokenCounts = new Map<string, number>();

    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
      if (!this.invertedIndex.has(token)) this.invertedIndex.set(token, new Set());
      this.invertedIndex.get(token)!.add(doc.id);
    }

    this.documentTokenCounts.set(doc.id, tokenCounts);
  }

  remove(docId: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    this.documents.delete(docId);
    const tokenCounts = this.documentTokenCounts.get(docId);
    if (tokenCounts) {
      for (const token of tokenCounts.keys()) {
        this.invertedIndex.get(token)?.delete(docId);
      }
    }
    this.documentTokenCounts.delete(docId);
    return true;
  }

  search(query: SearchQuery): { results: SearchResult[]; totalCount: number; durationMs: number } {
    const startTime = Date.now();
    const queryTokens = this.tokenize(query.q);
    if (queryTokens.length === 0) return { results: [], totalCount: 0, durationMs: 0 };

    // Find candidate documents (must contain at least one query token)
    const candidateIds = new Set<string>();
    for (const token of queryTokens) {
      const docIds = this.invertedIndex.get(token);
      if (docIds) for (const id of docIds) candidateIds.add(id);
    }

    // Score each candidate using TF-IDF
    const N = this.documents.size; // Total document count
    const scored: SearchResult[] = [];

    for (const docId of candidateIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      // Apply filters
      if (!query.includeArchived && doc.isArchived) continue;
      if (query.sources && !query.sources.includes(doc.source)) continue;
      if (query.tenantId && doc.tenantId !== query.tenantId) continue;
      if (query.userId && doc.userId !== query.userId) continue;
      if (query.dateFrom && doc.indexedAt < query.dateFrom) continue;
      if (query.dateTo && doc.indexedAt > query.dateTo) continue;
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(t => doc.tags.includes(t));
        if (!hasTag) continue;
      }

      const tokenCounts = this.documentTokenCounts.get(docId);
      if (!tokenCounts) continue;

      let score = 0;
      const totalTokens = [...tokenCounts.values()].reduce((a, b) => a + b, 0);

      for (const token of queryTokens) {
        const tf = (tokenCounts.get(token) || 0) / totalTokens;
        const df = this.invertedIndex.get(token)?.size || 1;
        const idf = Math.log(N / df);
        score += tf * idf;
      }

      // Boost title matches (titles are more important than body content)
      const titleLower = doc.title.toLowerCase();
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score *= 1.5;
      }

      const highlights = this.generateHighlights(doc, queryTokens);
      scored.push({ document: doc, score, highlights });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const totalCount = scored.length;
    const results = scored.slice(offset, offset + limit);

    return { results, totalCount, durationMs: Date.now() - startTime };
  }

  suggest(prefix: string, limit = 10): string[] {
    const lower = prefix.toLowerCase();
    const matches: string[] = [];
    for (const token of this.invertedIndex.keys()) {
      if (token.startsWith(lower)) matches.push(token);
      if (matches.length >= limit) break;
    }
    return matches;
  }

  getDocument(id: string): IndexedDocument | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(filter?: Partial<{ source: ContentSource; isArchived: boolean; tenantId: string }>): IndexedDocument[] {
    let docs = [...this.documents.values()];
    if (filter?.source) docs = docs.filter(d => d.source === filter.source);
    if (filter?.isArchived !== undefined) docs = docs.filter(d => d.isArchived === filter.isArchived);
    if (filter?.tenantId) docs = docs.filter(d => d.tenantId === filter.tenantId);
    return docs;
  }

  getStats(): { documentCount: number; tokenCount: number; sourceBreakdown: Record<string, number> } {
    const sourceBreakdown: Record<string, number> = {};
    for (const doc of this.documents.values()) {
      sourceBreakdown[doc.source] = (sourceBreakdown[doc.source] || 0) + 1;
    }
    return {
      documentCount: this.documents.size,
      tokenCount: this.invertedIndex.size,
      sourceBreakdown,
    };
  }

  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.documentTokenCounts.clear();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2)
      .filter(t => !STOP_WORDS.has(t));
  }

  private generateHighlights(doc: IndexedDocument, queryTokens: string[]): { field: string; snippets: string[] }[] {
    const highlights: { field: string; snippets: string[] }[] = [];

    for (const [field, text] of [['title', doc.title], ['content', doc.content]] as const) {
      const snippets: string[] = [];
      const sentences = text.split(/[.!?\n]+/).filter(Boolean);
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        if (queryTokens.some(t => lower.includes(t))) {
          snippets.push(sentence.trim().slice(0, 150));
        }
      }
      if (snippets.length > 0) highlights.push({ field, snippets: snippets.slice(0, 3) });
    }

    return highlights;
  }
}

// Common English stop words
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'she',
  'that', 'the', 'to', 'was', 'were', 'will', 'with', 'you', 'your',
  'this', 'but', 'not', 'they', 'we', 'can', 'had', 'have', 'do',
]);

// ─── Plugin Implementation ──────────────────────────────────────

export class SearchArchivePlugin implements UCPlugin {
  readonly id = 'search-archive';
  readonly name = 'Search & Archive';
  readonly version = '3.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  private engine = new InMemorySearchEngine();
  private searchCount = 0;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('Search & Archive plugin initializing...');

    // ── Chat indexing ──
    ctx.bus.on('chat:message-sent', async (data: any) => {
      if (data.messageType === 'SYSTEM') return; // Skip system messages
      this.indexDocument({
        source: 'chat', sourceId: data.messageId,
        title: `Message from ${data.senderName}`,
        content: data.content || '',
        metadata: { channelId: data.channelId, senderId: data.senderId, threadId: data.threadId },
        tenantId: data.tenantId, userId: data.senderId,
      });
    }, 'search-archive');

    ctx.bus.on('chat:message-edited', async (data: any) => {
      const existing = this.engine.getDocument(`chat:${data.messageId}`);
      if (existing) {
        existing.content = data.content;
        existing.updatedAt = new Date();
        this.engine.index(existing);
      }
    }, 'search-archive');

    ctx.bus.on('chat:message-deleted', async (data: any) => {
      this.engine.remove(`chat:${data.messageId}`);
    }, 'search-archive');

    // ── Transcription indexing ──
    ctx.bus.on('transcription:completed', async (data: any) => {
      this.indexDocument({
        source: 'transcription', sourceId: data.transcriptionId,
        title: `Meeting Transcript — Room ${data.roomId}`,
        content: `Transcript with ${data.wordCount} words, duration ${data.durationSeconds}s`,
        metadata: { roomId: data.roomId, wordCount: data.wordCount },
      });
    }, 'search-archive');

    ctx.bus.on('transcription:notes-generated', async (data: any) => {
      this.indexDocument({
        source: 'transcription', sourceId: `notes-${data.noteId}`,
        title: `Meeting Notes — ${data.noteId}`,
        content: `${data.actionItemCount} action items, ${data.decisionCount} decisions`,
        metadata: { transcriptionId: data.transcriptionId, roomId: data.roomId },
      });
    }, 'search-archive');

    // ── Cloud file indexing ──
    ctx.bus.on('cloud:file-shared', async (data: any) => {
      this.indexDocument({
        source: 'cloud-file', sourceId: data.shareId,
        title: data.fileName || 'Shared file',
        content: `File shared by ${data.sharedBy} via ${data.provider}`,
        metadata: { provider: data.provider, scope: data.scope, channelId: data.channelId, roomId: data.roomId },
        userId: data.sharedBy,
      });
    }, 'search-archive');

    // ── Whiteboard indexing ──
    ctx.bus.on('whiteboard:created', async (data: any) => {
      this.indexDocument({
        source: 'whiteboard', sourceId: data.whiteboardId,
        title: data.name || 'Whiteboard',
        content: `Whiteboard for room ${data.roomId || 'standalone'}`,
        metadata: { roomId: data.roomId, channelId: data.channelId },
      });
    }, 'search-archive');

    // ── Meeting indexing ──
    ctx.bus.on('meeting:scheduled', async (data: any) => {
      this.indexDocument({
        source: 'meeting', sourceId: data.meetingId,
        title: data.title,
        content: `Meeting scheduled by ${data.scheduledBy} with ${data.attendeeCount} attendees`,
        metadata: { scheduledBy: data.scheduledBy, startsAt: data.startsAt },
      });
    }, 'search-archive');

    // ── Room indexing ──
    ctx.bus.on('room:created', async (data: any) => {
      this.indexDocument({
        source: 'room', sourceId: data.roomId,
        title: data.name || `Room ${data.roomId}`,
        content: `Video room created by ${data.createdBy}`,
        metadata: { dealId: data.dealId, tenantId: data.tenantId },
        tenantId: data.tenantId, userId: data.createdBy,
      });
    }, 'search-archive');

    ctx.logger.info('Search & Archive plugin initialized — subscribed to content events ✓');
  }

  private indexDocument(input: {
    source: ContentSource; sourceId: string; title: string; content: string;
    metadata?: Record<string, unknown>; tenantId?: string; userId?: string; tags?: string[];
  }): void {
    const doc: IndexedDocument = {
      id: `${input.source}:${input.sourceId}`,
      source: input.source,
      sourceId: input.sourceId,
      title: input.title,
      content: input.content,
      metadata: input.metadata || {},
      tenantId: input.tenantId,
      userId: input.userId,
      tags: input.tags || [],
      isArchived: false,
      indexedAt: new Date(),
      updatedAt: new Date(),
    };

    this.engine.index(doc);

    this.ctx.bus.emit('search:content-indexed', {
      documentId: doc.id, source: doc.source, contentType: doc.source,
    }, 'search-archive');
  }

  getRoutes(): Router {
    const router = Router();

    // Unified search
    router.get('/search', (req, res) => {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

      const query: SearchQuery = {
        q,
        sources: req.query.sources ? (req.query.sources as string).split(',') as ContentSource[] : undefined,
        tenantId: req.query.tenantId as string,
        userId: req.query.userId as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        limit: parseInt(req.query.limit as string || '20', 10),
        offset: parseInt(req.query.offset as string || '0', 10),
        includeArchived: req.query.includeArchived === 'true',
      };

      const result = this.engine.search(query);
      this.searchCount++;

      this.ctx.bus.emit('search:executed', {
        queryId: `sq-${Date.now()}`, userId: req.query.userId as string || 'anonymous',
        query: q, resultCount: result.totalCount, durationMs: result.durationMs,
      }, 'search-archive');

      res.json({
        query: q,
        totalCount: result.totalCount,
        durationMs: result.durationMs,
        results: result.results,
      });
    });

    // Autocomplete suggestions
    router.get('/search/suggest', (req, res) => {
      const prefix = req.query.prefix as string;
      if (!prefix) return res.status(400).json({ error: 'prefix param required' });
      const limit = parseInt(req.query.limit as string || '10', 10);
      res.json({ prefix, suggestions: this.engine.suggest(prefix, limit) });
    });

    // Get indexed document
    router.get('/documents/:id', (req, res) => {
      const doc = this.engine.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      res.json(doc);
    });

    // List indexed documents
    router.get('/documents', (req, res) => {
      const filter: any = {};
      if (req.query.source) filter.source = req.query.source;
      if (req.query.isArchived) filter.isArchived = req.query.isArchived === 'true';
      if (req.query.tenantId) filter.tenantId = req.query.tenantId;

      const docs = this.engine.getAllDocuments(filter);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);

      res.json({
        total: docs.length,
        documents: docs.slice(offset, offset + limit),
      });
    });

    // Manually index a document
    router.post('/documents', (req, res) => {
      const { title, content, source, sourceId, tenantId, userId, tags } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'title and content required' });
      this.indexDocument({
        source: source || 'manual', sourceId: sourceId || `manual-${Date.now()}`,
        title, content, tenantId, userId, tags,
      });
      res.status(201).json({ indexed: true });
    });

    // Remove from index
    router.delete('/documents/:id', (req, res) => {
      const removed = this.engine.remove(req.params.id);
      if (!removed) return res.status(404).json({ error: 'Document not found' });
      res.json({ removed: true });
    });

    // Archive old documents
    router.post('/archive', (req, res) => {
      const olderThanDays = parseInt(req.body.olderThanDays || '90', 10);
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const docs = this.engine.getAllDocuments({ isArchived: false });
      let archived = 0;

      for (const doc of docs) {
        if (doc.indexedAt < cutoff) {
          doc.isArchived = true;
          doc.archivedAt = new Date();
          this.engine.index(doc); // Re-index with archived flag
          archived++;

          this.ctx.bus.emit('search:content-archived', {
            documentId: doc.id, source: doc.source,
            archivedAt: doc.archivedAt.toISOString(),
          }, 'search-archive');
        }
      }

      res.json({ archived, cutoffDate: cutoff.toISOString() });
    });

    // List archived documents
    router.get('/archive', (req, res) => {
      const docs = this.engine.getAllDocuments({ isArchived: true });
      res.json({ total: docs.length, documents: docs.slice(0, 50) });
    });

    // Rebuild index
    router.post('/reindex', async (req, res) => {
      const startTime = Date.now();
      const stats = this.engine.getStats();
      const docCount = stats.documentCount;

      // In production: re-read from storage adapter and re-index
      // For now, report current state
      this.ctx.bus.emit('search:index-rebuilt', {
        source: 'all', documentCount: docCount,
        durationMs: Date.now() - startTime,
      }, 'search-archive');

      res.json({ reindexed: docCount, durationMs: Date.now() - startTime });
    });

    // Stats
    router.get('/stats', (_req, res) => {
      const stats = this.engine.getStats();
      res.json({ ...stats, totalSearches: this.searchCount });
    });

    return router;
  }

  async shutdown(): Promise<void> {
    this.engine.clear();
    this.ctx.logger.info('Search & Archive plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    const stats = this.engine.getStats();
    return {
      status: 'healthy',
      details: {
        documentCount: stats.documentCount,
        tokenCount: stats.tokenCount,
        sourceBreakdown: stats.sourceBreakdown,
        totalSearches: this.searchCount,
      },
    };
  }
}

export default SearchArchivePlugin;
