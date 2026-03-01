'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  Plus,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Trash2,
} from 'lucide-react';

// ============================================================================
// DYNAMIC IMPORT — FULL CANVAS COMPONENT
// ============================================================================
// SRCanvasProduction is 3,813 lines of custom SVG canvas with drag-and-drop,
// typed port connections, undo/redo, recipe system, AI Intelligence Layer,
// and real-time execution dashboard. Loaded dynamically (ssr: false) because
// it uses SVG refs, mouse events, and WebSocket that only work client-side.

const SRCanvasProduction = dynamic(
  () => import('@/components/canvas-v2/SRCanvas'),
  {
    ssr: false,
    loading: () => <CanvasLoadingSkeleton />,
  }
);

// ============================================================================
// API CONFIGURATION
// ============================================================================

const ACTION_ENGINE_URL =
  process.env.NEXT_PUBLIC_ACTION_ENGINE_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3024`
    : 'http://localhost:3024');

const CANVAS_API_PREFIX = '/api/v1/canvas';
const API_BASE = `${ACTION_ENGINE_URL}${CANVAS_API_PREFIX}`;

const WS_URL =
  process.env.NEXT_PUBLIC_ACTION_ENGINE_WS_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3024`
    : 'ws://localhost:3024');

const DEFAULT_TENANT = 'default';
const DEFAULT_USER = 'canvas-user';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowSummary {
  workflowId: string;
  name: string;
  description: string;
  version: number;
  updatedAt: string;
  tags: string[];
}

interface CanvasPageState {
  view: 'list' | 'editor';
  workflows: WorkflowSummary[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-full bg-[#0F1923]">
      <div className="w-60 border-r border-[#253545] p-4 space-y-3">
        <div className="h-8 bg-[#162230] rounded animate-pulse" />
        <div className="h-6 bg-[#162230] rounded animate-pulse w-3/4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-[#162230] rounded animate-pulse" />
        ))}
      </div>
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
            <p className="text-sm text-[#8BA4B8] font-mono">Loading Canvas...</p>
          </div>
        </div>
      </div>
      <div className="w-72 border-l border-[#253545] p-4 space-y-3">
        <div className="h-8 bg-[#162230] rounded animate-pulse" />
        <div className="h-32 bg-[#162230] rounded animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// API HELPERS
// ============================================================================

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': DEFAULT_TENANT,
    'X-User-Id': DEFAULT_USER,
  };
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...apiHeaders(), ...(opts?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.ok === false) throw new Error(json.error?.message ?? 'API error');
  return json.data as T;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CanvasPage() {
  const [state, setState] = useState<CanvasPageState>({
    view: 'list',
    workflows: [],
    selectedId: null,
    loading: true,
    error: null,
  });

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await apiFetch<{ workflows: WorkflowSummary[] }>('/workflows');
      setState(prev => ({ ...prev, workflows: data.workflows ?? [], loading: false, error: null }));
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load' }));
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  async function handleCreate() {
    try {
      const data = await apiFetch<{ workflow: WorkflowSummary }>('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: `Workflow ${state.workflows.length + 1}`,
          description: '',
          definition: { nodes: [], edges: [], triggers: [] },
          tags: [],
        }),
      });
      if (data.workflow?.workflowId) {
        setState(prev => ({ ...prev, view: 'editor', selectedId: data.workflow.workflowId }));
      }
      await fetchWorkflows();
    } catch (err) {
      console.error('Create failed:', err);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this workflow?')) return;
    try {
      await apiFetch(`/workflows/${id}`, { method: 'DELETE' });
      await fetchWorkflows();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const handleSave = useCallback(async (definition: any) => {
    if (!state.selectedId) return;
    try {
      await apiFetch(`/workflows/${state.selectedId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: definition.name ?? 'Untitled',
          description: definition.description ?? '',
          definition,
          tags: definition.tags ?? [],
        }),
      });
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [state.selectedId]);

  // ══════════════════════════════════════════════════════════════
  // EDITOR VIEW — full SRCanvasProduction
  // ══════════════════════════════════════════════════════════════
  if (state.view === 'editor' && state.selectedId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1520] border-b border-[#253545] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#8BA4B8] hover:text-white"
            onClick={() => { setState(p => ({ ...p, view: 'list', selectedId: null })); fetchWorkflows(); }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Workflows
          </Button>
          <Badge variant="outline" className="text-[#5A7A90] text-xs">
            {state.selectedId.slice(0, 8)}...
          </Badge>
        </div>
        <div className="flex-1 min-h-0">
          <SRCanvasProduction
            apiConfig={{
              baseUrl: API_BASE,
              wsUrl: `${WS_URL}${CANVAS_API_PREFIX}`,
              tenantId: DEFAULT_TENANT,
              userId: DEFAULT_USER,
            }}
            onSave={handleSave}
          />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visual Workflow Designer</h1>
          <p className="text-muted-foreground">
            Visual workflow designer — build, test, and deploy automation pipelines
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Workflow
        </Button>
      </div>

      <CanvasHealthBadge />

      {state.loading ? (
        <Card><CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading workflows...</p>
        </CardContent></Card>
      ) : state.error ? (
        <Card><CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="font-medium text-lg mb-2">Connection Issue</h3>
          <p className="text-muted-foreground mb-2">{state.error}</p>
          <p className="text-sm text-muted-foreground mb-4">Ensure action-engine is running on port 3024 and migration 010 is applied.</p>
          <Button variant="outline" onClick={() => { setState(p => ({ ...p, loading: true, error: null })); fetchWorkflows(); }}>Retry</Button>
        </CardContent></Card>
      ) : state.workflows.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium text-lg mb-2">No workflows yet</h3>
          <p className="text-muted-foreground mb-4">Create your first visual workflow to get started.</p>
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Create First Workflow</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.workflows.map(wf => (
            <Card key={wf.workflowId} className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setState(p => ({ ...p, view: 'editor', selectedId: wf.workflowId }))}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{wf.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{wf.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline">v{wf.version}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={(e) => handleDelete(wf.workflowId, e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {wf.tags?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {wf.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3">Updated {new Date(wf.updatedAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HEALTH BADGE
// ============================================================================

function CanvasHealthBadge() {
  const [health, setHealth] = useState<{ ok: boolean; nodeTypes: number } | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);
  if (!health) return null;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={health.ok ? 'success' : 'destructive'}>Canvas Engine {health.ok ? 'Connected' : 'Offline'}</Badge>
      {health.nodeTypes > 0 && <Badge variant="outline">{health.nodeTypes} node types</Badge>}
    </div>
  );
}
