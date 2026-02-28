/**
 * Unified Communications 4.0 — Whiteboard Plugin
 *
 * A collaborative canvas that multiple users can draw on simultaneously.
 * Think of it as a shared sheet of paper on a table — everyone can see
 * what everyone else draws, cursors are visible in real time, and the
 * paper remembers everything even after you walk away.
 *
 * The plugin manages board state as an ordered list of operations (strokes,
 * shapes, text, images, sticky notes). Real-time sync uses the platform's
 * WebSocket layer with a last-write-wins merge strategy for MVP. A future
 * upgrade to Yjs CRDTs would make it fully conflict-free, but LWW works
 * well for the typical 2-10 concurrent editors in education and business
 * settings.
 *
 * Use cases across deployments:
 *   - Brainstorming sessions (any company)
 *   - Classroom lessons with teacher drawing + student annotations (Scholarly)
 *   - Identity document markup / annotation (Chekd-ID)
 *   - Sales pitch visual planning
 *
 * Key abstractions:
 *   Board      — a canvas with metadata, pages, and participant list
 *   BoardPage  — a single canvas page (boards can be multi-page)
 *   Operation  — an atomic drawing action (stroke, shape, text, move, delete)
 *   Template   — pre-built board layouts (SWOT, Kanban, mind map, etc.)
 *
 * Event prefix: whiteboard:*
 * REST endpoints: 16 under /api/whiteboard/
 * WebSocket: real-time operation sync, cursor sharing, laser pointer
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToolType = 'PEN' | 'HIGHLIGHTER' | 'ERASER' | 'TEXT' | 'STICKY_NOTE'
  | 'RECT' | 'CIRCLE' | 'ARROW' | 'LINE' | 'IMAGE' | 'LASER' | 'SELECT';

export type ExportFormat = 'PNG' | 'SVG' | 'PDF';

export interface Board {
  id: string;
  name: string;
  tenantId: string;
  createdBy: string;
  /** Active pages on this board */
  pages: BoardPage[];
  /** Current participants viewing/editing */
  activeParticipants: string[];
  /** Board-level settings */
  isReadOnly: boolean;
  showGrid: boolean;
  backgroundColor: string;
  templateId?: string;
  /** Associated room (for in-meeting whiteboards) */
  roomId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPage {
  id: string;
  boardId: string;
  pageNumber: number;
  title: string;
  /** All operations on this page (the source of truth for rendering) */
  operations: BoardOperation[];
}

export interface BoardOperation {
  id: string;
  pageId: string;
  userId: string;
  tool: ToolType;
  /** Drawing data: points for pen/line, bounds for shapes, text content, etc. */
  data: Record<string, unknown>;
  /** Visual properties */
  color: string;
  strokeWidth: number;
  opacity: number;
  /** Z-order for layering */
  zIndex: number;
  /** For move/resize operations: reference to the target operation ID */
  targetOperationId?: string;
  /** Soft delete flag (eraser removes by flagging, not deleting) */
  isDeleted: boolean;
  createdAt: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Pre-populated operations that form the template layout */
  pages: { title: string; operations: Partial<BoardOperation>[] }[];
  thumbnailUrl?: string;
  isBuiltIn: boolean;
  tenantId?: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  pageId: string;
}

// ─── Built-in Templates ─────────────────────────────────────────────────────

const BUILT_IN_TEMPLATES: BoardTemplate[] = [
  { id: 'tpl-swot', name: 'SWOT Analysis', description: '2x2 grid: Strengths, Weaknesses, Opportunities, Threats', category: 'Business', pages: [{ title: 'SWOT', operations: [] }], isBuiltIn: true },
  { id: 'tpl-kanban', name: 'Kanban Board', description: 'To Do / In Progress / Done columns', category: 'Project', pages: [{ title: 'Kanban', operations: [] }], isBuiltIn: true },
  { id: 'tpl-mindmap', name: 'Mind Map', description: 'Central topic with branching ideas', category: 'Brainstorm', pages: [{ title: 'Mind Map', operations: [] }], isBuiltIn: true },
  { id: 'tpl-flowchart', name: 'Flowchart', description: 'Decision flow with start, process, and end nodes', category: 'Process', pages: [{ title: 'Flow', operations: [] }], isBuiltIn: true },
  { id: 'tpl-retro', name: 'Retrospective', description: 'What went well / What to improve / Actions', category: 'Agile', pages: [{ title: 'Retro', operations: [] }], isBuiltIn: true },
  { id: 'tpl-lesson', name: 'Lesson Plan', description: 'Objective, Activities, Assessment, Reflection', category: 'Education', pages: [{ title: 'Plan', operations: [] }], isBuiltIn: true },
];

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class WhiteboardPlugin implements UCPlugin {
  readonly id = 'whiteboard';
  readonly name = 'Whiteboard';
  readonly version = '4.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  /** In-memory cursor positions (ephemeral — not persisted) */
  private cursors: Map<string, CursorPosition[]> = new Map();
  /** Per-user undo stacks: boardId:userId → operationId[] */
  private undoStacks: Map<string, string[]> = new Map();
  private redoStacks: Map<string, string[]> = new Map();

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    // Seed built-in templates
    for (const tpl of BUILT_IN_TEMPLATES) {
      const existing = await ctx.storage.get('wb_templates', tpl.id);
      if (!existing) await ctx.storage.set('wb_templates', tpl.id, tpl);
    }
    ctx.logger.info('[Whiteboard] Initialised — boards, pages, shapes, templates, cursors');
  }

  getRoutes(): Router {
    const r = Router();

    // Board lifecycle
    r.post('/boards', this.w(this.createBoard));
    r.get('/boards', this.w(this.listBoards));
    r.get('/boards/:boardId', this.w(this.getBoard));
    r.put('/boards/:boardId', this.w(this.updateBoard));
    r.delete('/boards/:boardId', this.w(this.deleteBoard));

    // Pages
    r.post('/boards/:boardId/pages', this.w(this.addPage));
    r.delete('/boards/:boardId/pages/:pageId', this.w(this.removePage));
    r.put('/boards/:boardId/pages/reorder', this.w(this.reorderPages));

    // Operations (draw, shape, text, etc.)
    r.post('/boards/:boardId/pages/:pageId/operations', this.w(this.addOperation));
    r.delete('/boards/:boardId/pages/:pageId/operations/:opId', this.w(this.deleteOperation));

    // Undo/Redo
    r.post('/boards/:boardId/undo', this.w(this.undo));
    r.post('/boards/:boardId/redo', this.w(this.redo));

    // Templates
    r.get('/templates', this.w(this.listTemplates));
    r.post('/boards/:boardId/apply-template', this.w(this.applyTemplate));

    // Export
    r.post('/boards/:boardId/export', this.w(this.exportBoard));

    // Cursors (read — writes come via WebSocket)
    r.get('/boards/:boardId/cursors', this.w(this.getCursors));

    return r;
  }

  async handleWebSocketMessage(
    sessionId: string, userId: string, roomId: string | undefined,
    type: string, data: any, reply: (m: unknown) => void,
    broadcast: (rid: string, m: unknown, excludeSessionId?: string) => void,
  ): Promise<boolean> {
    // Real-time cursor sharing
    if (type === 'wb-cursor-move') {
      const { boardId, pageId, x, y, userName, userColor } = data;
      if (!boardId) return true;
      const cursor: CursorPosition = { userId, userName: userName || userId, userColor: userColor || '#3B82F6', x, y, pageId };
      if (!this.cursors.has(boardId)) this.cursors.set(boardId, []);
      const boardCursors = this.cursors.get(boardId)!;
      const idx = boardCursors.findIndex(c => c.userId === userId);
      if (idx >= 0) boardCursors[idx] = cursor; else boardCursors.push(cursor);
      // Broadcast to other participants
      if (roomId || boardId) {
        broadcast(roomId || boardId, { type: 'wb-cursor-update', data: cursor }, sessionId);
      }
      reply({ type: 'wb-cursor-move:ack', data: { ok: true } });
      return true;
    }

    // Real-time operation broadcast (draw stroke, add shape)
    if (type === 'wb-operation') {
      const { boardId, pageId, operation } = data;
      if (boardId && pageId && operation) {
        // Persist the operation
        const board = await this.ctx.storage.get<Board>('wb_boards', boardId);
        if (board) {
          const page = board.pages.find(p => p.id === pageId);
          if (page) {
            const op: BoardOperation = {
              id: uuidv4(), pageId, userId,
              tool: operation.tool || 'PEN',
              data: operation.data || {},
              color: operation.color || '#000000',
              strokeWidth: operation.strokeWidth || 2,
              opacity: operation.opacity || 1,
              zIndex: page.operations.length,
              isDeleted: false,
              createdAt: new Date().toISOString(),
            };
            page.operations.push(op);
            board.updatedAt = new Date().toISOString();
            await this.ctx.storage.set('wb_boards', board.id, board);

            // Track for undo
            const undoKey = boardId + ':' + userId;
            if (!this.undoStacks.has(undoKey)) this.undoStacks.set(undoKey, []);
            this.undoStacks.get(undoKey)!.push(op.id);
            this.redoStacks.delete(undoKey);

            // Broadcast to other users
            if (roomId || boardId) {
              broadcast(roomId || boardId, { type: 'wb-operation-applied', data: { boardId, pageId, operation: op } }, sessionId);
            }
          }
        }
      }
      reply({ type: 'wb-operation:ack', data: { ok: true } });
      return true;
    }

    // Laser pointer (ephemeral — not persisted)
    if (type === 'wb-laser') {
      const { boardId, x, y, userName } = data;
      if (roomId || boardId) {
        broadcast(roomId || boardId, { type: 'wb-laser', data: { userId, userName, x, y } }, sessionId);
      }
      return true;
    }

    return false;
  }

  async shutdown(): Promise<void> {
    this.cursors.clear();
    this.undoStacks.clear();
    this.redoStacks.clear();
    this.ctx.logger.info('[Whiteboard] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return { status: 'healthy', details: { activeBoardSessions: this.cursors.size } };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'whiteboard.board', label: 'Whiteboard', description: 'Collaborative drawing and diagramming', icon: 'Pen', routePath: '/whiteboard', requiredRoles: [] },
    ];
  }

  // ─── Board Lifecycle ──────────────────────────────────────────────────────

  private async createBoard(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const { name, roomId, templateId, showGrid, backgroundColor } = req.body;

    const firstPage: BoardPage = { id: uuidv4(), boardId: '', pageNumber: 1, title: 'Page 1', operations: [] };

    const board: Board = {
      id: uuidv4(), name: name || 'Untitled Board', tenantId: u.tenantId,
      createdBy: u.userId, pages: [firstPage], activeParticipants: [u.userId],
      isReadOnly: false, showGrid: showGrid !== false, backgroundColor: backgroundColor || '#FFFFFF',
      templateId, roomId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    firstPage.boardId = board.id;

    // Apply template if specified
    if (templateId) {
      const tpl = await this.ctx.storage.get<BoardTemplate>('wb_templates', templateId);
      if (tpl && tpl.pages.length > 0) {
        board.pages = tpl.pages.map((p, i) => ({
          id: uuidv4(), boardId: board.id, pageNumber: i + 1, title: p.title,
          operations: (p.operations || []).map(op => ({
            id: uuidv4(), pageId: '', userId: 'template', tool: op.tool || 'TEXT' as ToolType,
            data: op.data || {}, color: op.color || '#000000', strokeWidth: op.strokeWidth || 2,
            opacity: op.opacity || 1, zIndex: 0, isDeleted: false, createdAt: new Date().toISOString(),
          })),
        }));
        // Fix pageId references
        for (const page of board.pages) {
          for (const op of page.operations) op.pageId = page.id;
        }
      }
    }

    await this.ctx.storage.set('wb_boards', board.id, board);
    this.ctx.bus.emit('whiteboard:board-created', {
      boardId: board.id, name: board.name, createdBy: u.userId,
      roomId: board.roomId, tenantId: u.tenantId,
    }, 'whiteboard');
    res.status(201).json(board);
  }

  private async listBoards(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.roomId) filter.roomId = req.query.roomId;
    const boards = await this.ctx.storage.query<Board>('wb_boards', filter, {
      limit: 50, orderBy: { field: 'updatedAt', direction: 'desc' },
    });
    // Return lightweight (no operations)
    const lite = boards.map(b => ({
      ...b, pages: b.pages.map(p => ({ ...p, operations: undefined, operationCount: p.operations.length })),
    }));
    res.json({ boards: lite, total: boards.length });
  }

  private async getBoard(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    res.json(board);
  }

  private async updateBoard(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const { name, isReadOnly, showGrid, backgroundColor } = req.body;
    if (name !== undefined) board.name = name;
    if (isReadOnly !== undefined) board.isReadOnly = isReadOnly;
    if (showGrid !== undefined) board.showGrid = showGrid;
    if (backgroundColor !== undefined) board.backgroundColor = backgroundColor;
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);
    res.json(board);
  }

  private async deleteBoard(req: Request, res: Response): Promise<void> {
    await this.ctx.storage.delete('wb_boards', req.params.boardId);
    this.cursors.delete(req.params.boardId);
    this.ctx.bus.emit('whiteboard:board-deleted', {
      boardId: req.params.boardId, deletedBy: this.user(req).userId,
    }, 'whiteboard');
    res.json({ success: true });
  }

  // ─── Pages ────────────────────────────────────────────────────────────────

  private async addPage(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const page: BoardPage = {
      id: uuidv4(), boardId: board.id,
      pageNumber: board.pages.length + 1,
      title: req.body.title || 'Page ' + (board.pages.length + 1),
      operations: [],
    };
    board.pages.push(page);
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);
    res.status(201).json(page);
  }

  private async removePage(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    if (board.pages.length <= 1) { res.status(400).json({ error: 'Cannot remove last page' }); return; }
    board.pages = board.pages.filter(p => p.id !== req.params.pageId);
    board.pages.forEach((p, i) => p.pageNumber = i + 1);
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);
    res.json({ success: true });
  }

  private async reorderPages(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const { pageOrder } = req.body; // string[] of page IDs in new order
    if (pageOrder && Array.isArray(pageOrder)) {
      const reordered: BoardPage[] = [];
      for (const pid of pageOrder) {
        const page = board.pages.find(p => p.id === pid);
        if (page) { page.pageNumber = reordered.length + 1; reordered.push(page); }
      }
      board.pages = reordered;
      board.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('wb_boards', board.id, board);
    }
    res.json({ pages: board.pages.map(p => ({ id: p.id, pageNumber: p.pageNumber, title: p.title })) });
  }

  // ─── Operations (REST fallback — primary path is WebSocket) ───────────────

  private async addOperation(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    if (board.isReadOnly) { res.status(403).json({ error: 'Board is read-only' }); return; }
    const page = board.pages.find(p => p.id === req.params.pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }

    const u = this.user(req);
    const { tool, data: opData, color, strokeWidth, opacity } = req.body;
    const op: BoardOperation = {
      id: uuidv4(), pageId: page.id, userId: u.userId,
      tool: tool || 'PEN', data: opData || {},
      color: color || '#000000', strokeWidth: strokeWidth || 2,
      opacity: opacity || 1, zIndex: page.operations.length,
      isDeleted: false, createdAt: new Date().toISOString(),
    };
    page.operations.push(op);
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);

    this.ctx.bus.emit('whiteboard:operation-added', {
      boardId: board.id, pageId: page.id, operationId: op.id,
      tool: op.tool, userId: u.userId, tenantId: board.tenantId,
    }, 'whiteboard');

    res.status(201).json(op);
  }

  private async deleteOperation(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const page = board.pages.find(p => p.id === req.params.pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    const op = page.operations.find(o => o.id === req.params.opId);
    if (op) {
      op.isDeleted = true;
      board.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('wb_boards', board.id, board);
    }
    res.json({ success: true });
  }

  // ─── Undo / Redo (per-user) ───────────────────────────────────────────────

  private async undo(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const u = this.user(req);
    const undoKey = board.id + ':' + u.userId;
    const stack = this.undoStacks.get(undoKey);
    if (!stack || stack.length === 0) { res.json({ undone: false }); return; }

    const opId = stack.pop()!;
    // Find and soft-delete the operation
    for (const page of board.pages) {
      const op = page.operations.find(o => o.id === opId);
      if (op) { op.isDeleted = true; break; }
    }
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);

    if (!this.redoStacks.has(undoKey)) this.redoStacks.set(undoKey, []);
    this.redoStacks.get(undoKey)!.push(opId);

    res.json({ undone: true, operationId: opId });
  }

  private async redo(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const u = this.user(req);
    const undoKey = board.id + ':' + u.userId;
    const stack = this.redoStacks.get(undoKey);
    if (!stack || stack.length === 0) { res.json({ redone: false }); return; }

    const opId = stack.pop()!;
    for (const page of board.pages) {
      const op = page.operations.find(o => o.id === opId);
      if (op) { op.isDeleted = false; break; }
    }
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);

    if (!this.undoStacks.has(undoKey)) this.undoStacks.set(undoKey, []);
    this.undoStacks.get(undoKey)!.push(opId);

    res.json({ redone: true, operationId: opId });
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  private async listTemplates(req: Request, res: Response): Promise<void> {
    const templates = await this.ctx.storage.query<BoardTemplate>('wb_templates', {}, { limit: 50 });
    res.json({ templates, total: templates.length });
  }

  private async applyTemplate(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const tpl = await this.ctx.storage.get<BoardTemplate>('wb_templates', req.body.templateId);
    if (!tpl) { res.status(404).json({ error: 'Template not found' }); return; }

    // Add template pages to existing board
    for (const tplPage of tpl.pages) {
      const page: BoardPage = {
        id: uuidv4(), boardId: board.id,
        pageNumber: board.pages.length + 1, title: tplPage.title,
        operations: (tplPage.operations || []).map(op => ({
          id: uuidv4(), pageId: '', userId: 'template',
          tool: (op.tool || 'TEXT') as ToolType,
          data: op.data || {}, color: op.color || '#000000',
          strokeWidth: op.strokeWidth || 2, opacity: op.opacity || 1,
          zIndex: 0, isDeleted: false, createdAt: new Date().toISOString(),
        })),
      };
      for (const op of page.operations) op.pageId = page.id;
      board.pages.push(page);
    }

    board.templateId = tpl.id;
    board.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('wb_boards', board.id, board);
    res.json(board);
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  private async exportBoard(req: Request, res: Response): Promise<void> {
    const board = await this.ctx.storage.get<Board>('wb_boards', req.params.boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    const format = (req.body.format || 'PNG') as ExportFormat;
    const includeGrid = req.body.includeGrid !== false;

    // In production: render operations to canvas server-side using node-canvas or puppeteer
    // For now, return the board data for client-side rendering
    this.ctx.bus.emit('whiteboard:exported', {
      boardId: board.id, format, exportedBy: this.user(req).userId, tenantId: board.tenantId,
    }, 'whiteboard');

    res.json({
      boardId: board.id, format, includeGrid,
      pageCount: board.pages.length,
      operationCount: board.pages.reduce((sum, p) => sum + p.operations.filter(o => !o.isDeleted).length, 0),
      message: 'Export data ready for client-side rendering',
      board,
    });
  }

  // ─── Cursors ──────────────────────────────────────────────────────────────

  private async getCursors(req: Request, res: Response): Promise<void> {
    const cursors = this.cursors.get(req.params.boardId) || [];
    res.json({ cursors });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private user(req: Request): { userId: string; tenantId: string } {
    const u = (req as any).scholarlyUser;
    if (u) return { userId: u.userId, tenantId: u.tenantId };
    return {
      userId: (req.body?.userId || req.query?.userId || 'anonymous') as string,
      tenantId: (req.body?.tenantId || req.query?.tenantId || '__default__') as string,
    };
  }

  private w(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response) => fn.call(this, req, res).catch((err: any) => {
      this.ctx.logger.error('[Whiteboard] ' + err.message);
      res.status(500).json({ error: 'Internal whiteboard error' });
    });
  }
}

export default WhiteboardPlugin;
