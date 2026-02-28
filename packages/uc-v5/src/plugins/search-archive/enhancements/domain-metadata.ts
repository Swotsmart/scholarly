/**
 * Scholarly Unified Communications 4.0 — Search Domain Metadata Enhancement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE LIBRARIAN'S CATALOGUE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The base Search Archive plugin is a good librarian — it indexes every
 * document and finds it by keyword. But a great librarian also maintains
 * a catalogue system: subject classifications, cross-references, and
 * structured metadata that lets you find things not just by what they
 * say, but by what they're about.
 *
 * This enhancement adds configurable domain taxonomies, content tagging,
 * auto-tagging rules, and faceted search. Whether the domain is education
 * (phonics phases, curriculum strands), legal (matter types, jurisdictions),
 * or product development (sprints, components), the same engine classifies
 * and retrieves content through structured metadata.
 *
 * REST endpoints added to /api/search-archive:
 *   POST /taxonomies                     — Create a taxonomy
 *   GET  /taxonomies                     — List taxonomies
 *   GET  /taxonomies/:id                 — Get taxonomy with categories
 *   PUT  /taxonomies/:id                 — Update taxonomy
 *   DELETE /taxonomies/:id               — Delete taxonomy
 *   POST /tags                           — Tag content with metadata
 *   GET  /tags/:contentId                — Get tags for content
 *   DELETE /tags/:contentId/:tagId       — Remove a tag
 *   POST /tagging-rules                  — Create auto-tagging rule
 *   GET  /tagging-rules                  — List tagging rules
 *   DELETE /tagging-rules/:id            — Delete tagging rule
 *   GET  /faceted-search                 — Search with taxonomy facet filters
 *   GET  /facets                         — Get available facet counts for a query
 *
 * Bus events emitted:
 *   search:taxonomy-created, search:taxonomy-updated,
 *   search:content-tagged, search:content-untagged,
 *   search:auto-tag-applied, search:faceted-search-executed
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface Taxonomy {
  id: string;
  name: string;
  description: string;
  /** Domain this taxonomy belongs to (e.g., 'education', 'legal', 'product') */
  domain: string;
  categories: TaxonomyCategory[];
  /** Whether this taxonomy is active for indexing */
  isActive: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description?: string;
  /** Allowed values for this category (if enumerated) */
  allowedValues?: string[];
  /** Whether values are free-form or must come from allowedValues */
  isEnumerated: boolean;
  /** Whether content can have multiple values from this category */
  isMultiValue: boolean;
  /** Display order */
  order: number;
}

export interface ContentTag {
  id: string;
  /** The content being tagged (search document ID) */
  contentId: string;
  /** Source type of the content */
  contentType: 'chat-message' | 'transcript' | 'file' | 'whiteboard' | 'meeting' | 'webinar' | 'custom';
  /** Taxonomy category ID */
  categoryId: string;
  /** Category name (denormalised for query performance) */
  categoryName: string;
  /** Tag value */
  value: string;
  /** How this tag was applied */
  source: 'manual' | 'auto-rule' | 'ai-suggested';
  /** Confidence score for auto-applied tags (0-1) */
  confidence?: number;
  appliedBy?: string;
  appliedAt: Date;
}

export interface TaggingRule {
  id: string;
  name: string;
  /** Content type(s) this rule applies to */
  contentTypes: ContentTag['contentType'][];
  /** Pattern to match in content (regex string or keyword list) */
  matchPattern: {
    type: 'regex' | 'keywords' | 'all';
    /** For regex: the pattern string. For keywords: comma-separated words */
    value: string;
    /** Whether to match case-sensitively */
    caseSensitive: boolean;
  };
  /** Tag to apply when pattern matches */
  applyTag: {
    categoryId: string;
    categoryName: string;
    value: string;
  };
  /** Confidence assigned to auto-applied tags */
  confidence: number;
  isActive: boolean;
  tenantId?: string;
  createdAt: Date;
}

export interface FacetedSearchRequest {
  /** Free-text query (optional — can search by facets only) */
  query?: string;
  /** Facet filters: categoryId → value(s) */
  facets: Record<string, string | string[]>;
  /** Content types to include */
  contentTypes?: ContentTag['contentType'][];
  /** Date range */
  dateFrom?: string;
  dateTo?: string;
  /** Pagination */
  offset?: number;
  limit?: number;
}

export interface FacetedSearchResult {
  query?: string;
  appliedFacets: Record<string, string[]>;
  totalResults: number;
  results: FacetedResultItem[];
  /** Available facet counts for further drill-down */
  availableFacets: FacetCount[];
}

export interface FacetedResultItem {
  contentId: string;
  contentType: ContentTag['contentType'];
  /** Preview text */
  snippet: string;
  /** All tags on this content */
  tags: { categoryName: string; value: string }[];
  /** Relevance score */
  score: number;
  indexedAt: Date;
}

export interface FacetCount {
  categoryId: string;
  categoryName: string;
  values: { value: string; count: number }[];
}

// ─── Domain Metadata Manager ────────────────────────────────────────

export class DomainMetadataManager {
  private taxonomies: Map<string, Taxonomy> = new Map();
  private contentTags: Map<string, ContentTag[]> = new Map(); // contentId → tags
  private taggingRules: Map<string, TaggingRule> = new Map();
  /** Reverse index: categoryId:value → contentIds (for faceted search) */
  private facetIndex: Map<string, Set<string>> = new Map();
  /** Content metadata store for search results */
  private contentStore: Map<string, { contentType: ContentTag['contentType']; snippet: string; indexedAt: Date }> = new Map();

  constructor(private ctx: PluginContext) {}

  // ─── Event Subscriptions ──────────────────────────────────────────

  subscribeToEvents(): void {
    // When new content is indexed by the base search plugin, run auto-tagging
    this.ctx.bus.on('search:content-indexed', (evt: any) => {
      this.autoTagContent(evt.contentId, evt.contentType, evt.text || evt.content || '');
      // Store content metadata for faceted search results
      this.contentStore.set(evt.contentId, {
        contentType: evt.contentType || 'custom',
        snippet: (evt.text || evt.content || '').slice(0, 200),
        indexedAt: new Date(),
      });
    });
  }

  // ─── Taxonomy CRUD ────────────────────────────────────────────────

  createTaxonomy(input: Omit<Taxonomy, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Taxonomy {
    const taxonomy: Taxonomy = {
      ...input,
      id: `tax-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.taxonomies.set(taxonomy.id, taxonomy);
    this.ctx.bus.emit('search:taxonomy-created', { taxonomyId: taxonomy.id, name: taxonomy.name, domain: taxonomy.domain });
    return taxonomy;
  }

  updateTaxonomy(id: string, updates: Partial<Taxonomy>): Taxonomy | null {
    const taxonomy = this.taxonomies.get(id);
    if (!taxonomy) return null;
    Object.assign(taxonomy, updates, { updatedAt: new Date() });
    this.ctx.bus.emit('search:taxonomy-updated', { taxonomyId: id, name: taxonomy.name });
    return taxonomy;
  }

  deleteTaxonomy(id: string): boolean {
    return this.taxonomies.delete(id);
  }

  // ─── Content Tagging ──────────────────────────────────────────────

  tagContent(
    contentId: string,
    contentType: ContentTag['contentType'],
    categoryId: string,
    value: string,
    source: ContentTag['source'] = 'manual',
    appliedBy?: string,
    confidence?: number,
  ): ContentTag {
    // Resolve category name
    let categoryName = categoryId;
    for (const taxonomy of this.taxonomies.values()) {
      const cat = taxonomy.categories.find(c => c.id === categoryId);
      if (cat) {
        categoryName = cat.name;
        // Validate value if enumerated
        if (cat.isEnumerated && cat.allowedValues && !cat.allowedValues.includes(value)) {
          throw new Error(`Value "${value}" not allowed for category "${cat.name}". Allowed: ${cat.allowedValues.join(', ')}`);
        }
        break;
      }
    }

    const tag: ContentTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contentId, contentType, categoryId, categoryName, value,
      source, confidence, appliedBy, appliedAt: new Date(),
    };

    // Store tag
    if (!this.contentTags.has(contentId)) this.contentTags.set(contentId, []);
    this.contentTags.get(contentId)!.push(tag);

    // Update facet index
    const facetKey = `${categoryId}:${value}`;
    if (!this.facetIndex.has(facetKey)) this.facetIndex.set(facetKey, new Set());
    this.facetIndex.get(facetKey)!.add(contentId);

    this.ctx.bus.emit('search:content-tagged', {
      contentId, contentType, categoryId, categoryName, value, source,
    });

    return tag;
  }

  removeTag(contentId: string, tagId: string): boolean {
    const tags = this.contentTags.get(contentId);
    if (!tags) return false;

    const index = tags.findIndex(t => t.id === tagId);
    if (index === -1) return false;

    const tag = tags[index];
    tags.splice(index, 1);

    // Update facet index
    const facetKey = `${tag.categoryId}:${tag.value}`;
    this.facetIndex.get(facetKey)?.delete(contentId);

    this.ctx.bus.emit('search:content-untagged', {
      contentId, tagId, categoryId: tag.categoryId, value: tag.value,
    });

    return true;
  }

  getTagsForContent(contentId: string): ContentTag[] {
    return this.contentTags.get(contentId) || [];
  }

  // ─── Auto-Tagging ────────────────────────────────────────────────

  createTaggingRule(input: Omit<TaggingRule, 'id' | 'createdAt'>): TaggingRule {
    const rule: TaggingRule = {
      ...input,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    };
    this.taggingRules.set(rule.id, rule);
    return rule;
  }

  deleteTaggingRule(id: string): boolean {
    return this.taggingRules.delete(id);
  }

  private autoTagContent(contentId: string, contentType: string, text: string): void {
    for (const rule of this.taggingRules.values()) {
      if (!rule.isActive) continue;
      if (rule.contentTypes.length > 0 && !rule.contentTypes.includes(contentType as any)) continue;

      let matches = false;

      switch (rule.matchPattern.type) {
        case 'regex': {
          try {
            const flags = rule.matchPattern.caseSensitive ? '' : 'i';
            const regex = new RegExp(rule.matchPattern.value, flags);
            matches = regex.test(text);
          } catch { /* Invalid regex — skip */ }
          break;
        }
        case 'keywords': {
          const keywords = rule.matchPattern.value.split(',').map(k => k.trim());
          const normalised = rule.matchPattern.caseSensitive ? text : text.toLowerCase();
          matches = keywords.some(k => {
            const kw = rule.matchPattern.caseSensitive ? k : k.toLowerCase();
            return normalised.includes(kw);
          });
          break;
        }
        case 'all':
          matches = true;
          break;
      }

      if (matches) {
        try {
          this.tagContent(
            contentId, contentType as ContentTag['contentType'],
            rule.applyTag.categoryId, rule.applyTag.value,
            'auto-rule', undefined, rule.confidence,
          );
          this.ctx.bus.emit('search:auto-tag-applied', {
            contentId, ruleId: rule.id, ruleName: rule.name,
            categoryId: rule.applyTag.categoryId, value: rule.applyTag.value,
          });
        } catch { /* Tag validation failed — skip */ }
      }
    }
  }

  // ─── Faceted Search ───────────────────────────────────────────────

  facetedSearch(request: FacetedSearchRequest): FacetedSearchResult {
    const appliedFacets: Record<string, string[]> = {};
    let candidateContentIds: Set<string> | null = null;

    // Intersect facet filters
    for (const [categoryId, values] of Object.entries(request.facets)) {
      const valueArray = Array.isArray(values) ? values : [values];
      appliedFacets[categoryId] = valueArray;

      const matchingIds = new Set<string>();
      for (const value of valueArray) {
        const facetKey = `${categoryId}:${value}`;
        const ids = this.facetIndex.get(facetKey);
        if (ids) ids.forEach(id => matchingIds.add(id));
      }

      if (candidateContentIds === null) {
        candidateContentIds = matchingIds;
      } else {
        // Intersect
        const current = candidateContentIds as Set<string>;
        candidateContentIds = new Set(Array.from(current).filter(id => matchingIds.has(id)));
      }
    }

    // If no facets applied, use all tagged content
    if (candidateContentIds === null) {
      candidateContentIds = new Set<string>();
      for (const tags of this.contentTags.values()) {
        if (tags.length > 0) candidateContentIds.add(tags[0].contentId);
      }
    }

    // Apply content type filter
    if (request.contentTypes?.length) {
      candidateContentIds = new Set([...candidateContentIds].filter(id => {
        const meta = this.contentStore.get(id);
        return meta && request.contentTypes!.includes(meta.contentType);
      }));
    }

    // Apply text query filter (simple keyword match on stored snippets)
    if (request.query) {
      const queryLower = request.query.toLowerCase();
      candidateContentIds = new Set([...candidateContentIds].filter(id => {
        const meta = this.contentStore.get(id);
        return meta && meta.snippet.toLowerCase().includes(queryLower);
      }));
    }

    // Build results
    const allIds = [...candidateContentIds];
    const offset = request.offset || 0;
    const limit = request.limit || 20;
    const pageIds = allIds.slice(offset, offset + limit);

    const results: FacetedResultItem[] = pageIds.map(contentId => {
      const meta = this.contentStore.get(contentId);
      const tags = this.contentTags.get(contentId) || [];
      return {
        contentId,
        contentType: meta?.contentType || 'custom',
        snippet: meta?.snippet || '',
        tags: tags.map(t => ({ categoryName: t.categoryName, value: t.value })),
        score: 1.0, // Simplified scoring
        indexedAt: meta?.indexedAt || new Date(),
      };
    });

    // Compute available facets for drill-down
    const facetCounts = this.computeFacetCounts(candidateContentIds);

    this.ctx.bus.emit('search:faceted-search-executed', {
      query: request.query, facetCount: Object.keys(appliedFacets).length,
      resultCount: allIds.length,
    });

    return {
      query: request.query,
      appliedFacets,
      totalResults: allIds.length,
      results,
      availableFacets: facetCounts,
    };
  }

  private computeFacetCounts(contentIds: Set<string>): FacetCount[] {
    const counts: Map<string, Map<string, number>> = new Map(); // categoryId → value → count
    const categoryNames: Map<string, string> = new Map();

    for (const contentId of contentIds) {
      const tags = this.contentTags.get(contentId) || [];
      for (const tag of tags) {
        categoryNames.set(tag.categoryId, tag.categoryName);
        if (!counts.has(tag.categoryId)) counts.set(tag.categoryId, new Map());
        const valueCounts = counts.get(tag.categoryId)!;
        valueCounts.set(tag.value, (valueCounts.get(tag.value) || 0) + 1);
      }
    }

    return [...counts.entries()].map(([categoryId, valueCounts]) => ({
      categoryId,
      categoryName: categoryNames.get(categoryId) || categoryId,
      values: [...valueCounts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }));
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    // ── Taxonomies ─────────────────────────────────────────────────
    router.post('/taxonomies', (req, res) => {
      const taxonomy = this.createTaxonomy(req.body);
      res.status(201).json(taxonomy);
    });

    router.get('/taxonomies', (_req, res) => {
      res.json({ taxonomies: [...this.taxonomies.values()] });
    });

    router.get('/taxonomies/:id', (req, res) => {
      const taxonomy = this.taxonomies.get(req.params.id);
      if (!taxonomy) return res.status(404).json({ error: 'Taxonomy not found' });
      res.json(taxonomy);
    });

    router.put('/taxonomies/:id', (req, res) => {
      const taxonomy = this.updateTaxonomy(req.params.id, req.body);
      if (!taxonomy) return res.status(404).json({ error: 'Taxonomy not found' });
      res.json(taxonomy);
    });

    router.delete('/taxonomies/:id', (req, res) => {
      if (!this.deleteTaxonomy(req.params.id)) return res.status(404).json({ error: 'Taxonomy not found' });
      res.json({ deleted: true });
    });

    // ── Content Tags ───────────────────────────────────────────────
    router.post('/tags', (req, res) => {
      try {
        const { contentId, contentType, categoryId, value, appliedBy } = req.body;
        const tag = this.tagContent(contentId, contentType, categoryId, value, 'manual', appliedBy);
        res.status(201).json(tag);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    router.get('/tags/:contentId', (req, res) => {
      res.json({ contentId: req.params.contentId, tags: this.getTagsForContent(req.params.contentId) });
    });

    router.delete('/tags/:contentId/:tagId', (req, res) => {
      if (!this.removeTag(req.params.contentId, req.params.tagId)) {
        return res.status(404).json({ error: 'Tag not found' });
      }
      res.json({ removed: true });
    });

    // ── Tagging Rules ──────────────────────────────────────────────
    router.post('/tagging-rules', (req, res) => {
      const rule = this.createTaggingRule(req.body);
      res.status(201).json(rule);
    });

    router.get('/tagging-rules', (_req, res) => {
      res.json({ rules: [...this.taggingRules.values()] });
    });

    router.delete('/tagging-rules/:id', (req, res) => {
      if (!this.deleteTaggingRule(req.params.id)) return res.status(404).json({ error: 'Rule not found' });
      res.json({ deleted: true });
    });

    // ── Faceted Search ─────────────────────────────────────────────
    router.get('/faceted-search', (req, res) => {
      const facets: Record<string, string | string[]> = {};
      // Parse facet query params: ?facet.phase=3&facet.subject=Maths,English
      for (const [key, val] of Object.entries(req.query)) {
        if (key.startsWith('facet.') && typeof val === 'string') {
          const categoryId = key.slice(6);
          facets[categoryId] = val.includes(',') ? val.split(',') : val;
        }
      }

      const result = this.facetedSearch({
        query: req.query.q as string,
        facets,
        contentTypes: req.query.types ? (req.query.types as string).split(',') as any[] : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      res.json(result);
    });

    router.get('/facets', (req, res) => {
      // Get facet counts without filtering — shows what's available
      const result = this.facetedSearch({ query: req.query.q as string, facets: {} });
      res.json({ availableFacets: result.availableFacets });
    });

    return router;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): {
    taxonomyCount: number; taggedContentCount: number;
    totalTags: number; taggingRuleCount: number; facetIndexSize: number;
  } {
    let totalTags = 0;
    for (const tags of this.contentTags.values()) totalTags += tags.length;
    return {
      taxonomyCount: this.taxonomies.size,
      taggedContentCount: this.contentTags.size,
      totalTags,
      taggingRuleCount: this.taggingRules.size,
      facetIndexSize: this.facetIndex.size,
    };
  }
}

export default DomainMetadataManager;
