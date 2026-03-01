/**
 * ============================================================================
 * S&R Canvas: Output Rendering & Dashboard System
 * ============================================================================
 *
 * The missing nervous system. The canvas already has eyes (the node
 * palette), hands (drag-and-drop wiring), and a heartbeat (execution
 * status). What it lacks is the ability to SHOW what the workflow
 * produced — to render the data flowing through those wires so the
 * operator can see, inspect, and act on results.
 *
 * This file provides four layers of output rendering, each building on
 * the last like Russian nesting dolls:
 *
 *   Layer 1: TYPE RENDERERS — atomic components that know how to render
 *   a specific port data type (table, record, scalar, signal, binary).
 *   These are the vocabulary of output rendering.
 *
 *   Layer 2: NODE OUTPUT PANEL — the right-panel inspector view that
 *   shows a node's outputs after execution. Shows port-by-port output
 *   with the appropriate type renderer. This is what you see when you
 *   click a completed node.
 *
 *   Layer 3: WORKFLOW RESULTS DASHBOARD — the full-canvas overlay that
 *   appears when a workflow completes. Shows the entire data flow:
 *   which nodes ran, how long they took, what they produced, and a
 *   visual summary of the pipeline's end-to-end results.
 *
 *   Layer 4: DOMAIN DASHBOARDS — pluggable templates that provide
 *   domain-specific views for specific workflow types. The competition
 *   dashboard shows leaderboards and scores; the migration dashboard
 *   shows content counts and cutover status; the analytics dashboard
 *   shows charts and insights. These register with a dashboard registry
 *   and the system automatically selects the right one based on the
 *   workflow's template tags.
 *
 * INTEGRATION WITH EXISTING CANVAS:
 *
 *   This file exports components that plug into sr-canvas-production.tsx:
 *
 *   1. RunState is extended with nodeOutputs (backward-compatible)
 *   2. NodeOutputPanel replaces the bare status pill in the right panel
 *   3. WorkflowResultsDashboard mounts as an overlay when run completes
 *   4. DomainDashboard renders inside the results dashboard when a
 *      matching domain template is found
 *
 * DESIGN PHILOSOPHY:
 *
 *   The canvas uses a dark industrial theme (IBM Plex Sans, #0F1923
 *   background, #162230 panels, #253545 borders). This output system
 *   inherits that palette but introduces subtle colour coding by data
 *   type: tables glow blue, records glow amber, scalars glow green,
 *   signals glow purple. Think of it as the difference between a
 *   railway signal box's control panel (the canvas) and the departure
 *   board showing train arrivals (the output system) — same station,
 *   same design language, different purpose.
 *
 * @module scholarly/sr/canvas/output-rendering
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// ── Cross-module imports from sr-canvas-dataviz.tsx ──────────────────────
// In production, these come from the dataviz module. During development,
// they share the same services/sr/ directory.
//
// import { NodeDataViz, AutoChart, ChartDashboard } from './sr-canvas-dataviz';
//
// For this file to compile standalone, we provide inline fallbacks that
// render gracefully when the dataviz module is unavailable (progressive
// enhancement — the dashboard works without charts, charts enhance it).

type NodeDataVizProps = { node: any; output: any; width?: number };
type AutoChartProps = { data: unknown; dataType?: string; width?: number; height?: number; title?: string; palette?: string; compact?: boolean };
type ChartDashboardCellDef = { id: string; title: string; data: unknown; dataType?: string; chartId?: string; palette?: string; span?: number; height?: number };

let NodeDataViz: React.FC<NodeDataVizProps>;
let AutoChart: React.FC<AutoChartProps>;
let ChartDashboard: React.FC<{ cells: ChartDashboardCellDef[]; title?: string }>;

try {
  // Dynamic resolution — works when both modules are bundled together
  const dataviz = require('./sr-canvas-dataviz');
  NodeDataViz = dataviz.NodeDataViz;
  AutoChart = dataviz.AutoChart;
  ChartDashboard = dataviz.ChartDashboard;
} catch {
  // Graceful fallback — plain data display when dataviz module is absent
  NodeDataViz = ({ node, output }) => null;
  AutoChart = ({ data, title }) => null;
  ChartDashboard = ({ cells, title }) => null;
}


// ============================================================================
// §1 — EXTENDED TYPES
// ============================================================================

/** Output data captured from a completed node execution. */
export interface NodeOutputData {
  /** Port outputs keyed by portId. */
  ports: Record<string, PortOutput>;
  /** When this node completed. */
  completedAt: number;
  /** Execution duration in milliseconds. */
  durationMs: number;
  /** Error if the node failed. */
  error?: string;
}

export interface PortOutput {
  portId: string;
  label: string;
  dataType: string;
  /** The actual data — could be array (table), object (record), primitive (scalar), null (signal). */
  data: unknown;
  /** Byte count for binary data. */
  sizeBytes?: number;
}

/**
 * Extended RunState that includes node outputs.
 * Backward-compatible: nodeOutputs is optional, so existing code
 * that uses RunState without outputs continues to work.
 */
export interface ExtendedRunState {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  nodeStates: Record<string, string>;
  nodeOutputs?: Record<string, NodeOutputData>;
  pausedAtNodeId?: string;
  error?: { nodeId: string; message: string };
  startedAt: number;
  durationMs: number;
}

/** Port type metadata for rendering decisions. */
interface PortTypeMeta {
  color: string;
  bgColor: string;
  icon: string;
  label: string;
}

const PORT_TYPE_META: Record<string, PortTypeMeta> = {
  table:  { color: '#4DA6FF', bgColor: 'rgba(77,166,255,0.08)', icon: '⊞', label: 'Table' },
  record: { color: '#FFB74D', bgColor: 'rgba(255,183,77,0.08)', icon: '◉', label: 'Record' },
  scalar: { color: '#66BB6A', bgColor: 'rgba(102,187,106,0.08)', icon: '◆', label: 'Scalar' },
  signal: { color: '#AB47BC', bgColor: 'rgba(171,71,188,0.08)', icon: '⚡', label: 'Signal' },
  binary: { color: '#78909C', bgColor: 'rgba(120,144,156,0.08)', icon: '⬡', label: 'Binary' },
  any:    { color: '#8BA4B8', bgColor: 'rgba(139,164,184,0.08)', icon: '○', label: 'Any' },
};

function getPortMeta(dataType: string): PortTypeMeta {
  return PORT_TYPE_META[dataType] ?? PORT_TYPE_META['any']!;
}

/** Status display config. */
const STATUS_META: Record<string, { color: string; glyph: string }> = {
  pending:   { color: '#5A7A90', glyph: '○' },
  running:   { color: '#4DA6FF', glyph: '◉' },
  completed: { color: '#66BB6A', glyph: '✓' },
  failed:    { color: '#EF5350', glyph: '✕' },
  paused:    { color: '#AB47BC', glyph: '⏸' },
  skipped:   { color: '#5A7A90', glyph: '–' },
  cancelled: { color: '#FF9800', glyph: '■' },
};


// ============================================================================
// §2 — TYPE RENDERERS (Layer 1)
// ============================================================================
//
// Each renderer knows how to display one port data type. They receive
// raw data and render it with the canvas's visual language. Think of
// these as display adapters: the same data object renders differently
// depending on its declared type.

// ── Table Renderer ──────────────────────────────────────────────────────

interface TableRendererProps {
  data: unknown[];
  maxRows?: number;
  compact?: boolean;
}

const TableRenderer: React.FC<TableRendererProps> = ({ data, maxRows = 50, compact = false }) => {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = compact ? 10 : 25;

  if (!Array.isArray(data) || data.length === 0) {
    return <EmptyState message="No rows" icon="⊞" />;
  }

  // Extract columns from first row
  const columns = useMemo(() => {
    const first = data[0];
    if (typeof first !== 'object' || first === null) return ['value'];
    return Object.keys(first);
  }, [data]);

  // Filter
  const filtered = useMemo(() => {
    if (!filterText.trim()) return data;
    const lower = filterText.toLowerCase();
    return data.filter(row => {
      if (typeof row !== 'object' || row === null) return String(row).toLowerCase().includes(lower);
      return Object.values(row).some(v => String(v).toLowerCase().includes(lower));
    });
  }, [data, filterText]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = (a as any)?.[sortCol] ?? '';
      const vb = (b as any)?.[sortCol] ?? '';
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) { setSortAsc(p => !p); }
    else { setSortCol(col); setSortAsc(true); }
  };

  const cellVal = (row: unknown, col: string): string => {
    if (typeof row !== 'object' || row === null) return String(row);
    const v = (row as any)[col];
    if (v === null || v === undefined) return '–';
    if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
    return String(v);
  };

  return (
    <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Stats + filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: '#5A7A90', fontSize: 11 }}>
          {filtered.length === data.length ? `${data.length} rows` : `${filtered.length}/${data.length} rows`}
          {' · '}{columns.length} cols
        </span>
        {!compact && (
          <input
            type="text" value={filterText} onChange={e => { setFilterText(e.target.value); setPage(0); }}
            placeholder="Filter..."
            style={{ flex: 1, background: '#0F1923', border: '1px solid #253545', borderRadius: 4, padding: '3px 6px', color: '#D0D8E0', fontSize: 11, outline: 'none' }}
          />
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #253545', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{
                  padding: '6px 8px', textAlign: 'left', cursor: 'pointer',
                  background: '#1A2D3D', color: '#8BA4B8', borderBottom: '1px solid #253545',
                  whiteSpace: 'nowrap', userSelect: 'none', fontSize: 11,
                }}>
                  {col} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '4px 8px', color: '#C0CCD8', borderBottom: '1px solid #1A2D3D',
                    maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                    title={cellVal(row, col)}
                  >
                    {formatCellValue(cellVal(row, col))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          <PaginationBtn label="◀" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} />
          <span style={{ color: '#5A7A90', fontSize: 11 }}>{page + 1} / {totalPages}</span>
          <PaginationBtn label="▶" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} />
        </div>
      )}
    </div>
  );
};

// ── Record Renderer ─────────────────────────────────────────────────────

interface RecordRendererProps {
  data: Record<string, unknown>;
  depth?: number;
  compact?: boolean;
}

const RecordRenderer: React.FC<RecordRendererProps> = ({ data, depth = 0, compact = false }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return <EmptyState message="No data" icon="◉" />;
  }

  const entries = Object.entries(data);
  if (entries.length === 0) return <EmptyState message="Empty record" icon="◉" />;

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
      {entries.map(([key, value]) => {
        const isNested = typeof value === 'object' && value !== null;
        const isArray = Array.isArray(value);
        const isExpanded = expanded.has(key);

        return (
          <div key={key} style={{
            borderBottom: depth === 0 ? '1px solid #1A2D3D' : 'none',
            padding: depth === 0 ? '6px 0' : '2px 0',
          }}>
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: isNested ? 'pointer' : 'default' }}
              onClick={() => isNested && toggle(key)}
            >
              {/* Key */}
              <span style={{ color: '#8BA4B8', minWidth: compact ? 80 : 120, flexShrink: 0, fontWeight: 600 }}>
                {isNested && <span style={{ color: '#5A7A90', marginRight: 4 }}>{isExpanded ? '▼' : '▶'}</span>}
                {key}
              </span>

              {/* Value */}
              {!isNested && (
                <span style={{ color: getValueColor(value), wordBreak: 'break-word' }}>
                  {formatCellValue(String(value ?? '–'))}
                </span>
              )}
              {isNested && !isExpanded && (
                <span style={{ color: '#5A7A90' }}>
                  {isArray ? `[${(value as unknown[]).length} items]` : `{${Object.keys(value as object).length} fields}`}
                </span>
              )}
            </div>

            {/* Nested expansion */}
            {isNested && isExpanded && (
              <div style={{ marginLeft: 16, marginTop: 4, paddingLeft: 12, borderLeft: '2px solid #253545' }}>
                {isArray ? (
                  (value as unknown[]).length <= 5 ? (
                    (value as unknown[]).map((item, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        {typeof item === 'object' && item !== null ? (
                          <RecordRenderer data={item as Record<string, unknown>} depth={depth + 1} compact />
                        ) : (
                          <span style={{ color: getValueColor(item) }}>{String(item)}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <TableRenderer data={value as unknown[]} compact />
                  )
                ) : (
                  <RecordRenderer data={value as Record<string, unknown>} depth={depth + 1} compact={compact} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Scalar Renderer ─────────────────────────────────────────────────────

interface ScalarRendererProps {
  data: unknown;
  label?: string;
}

const ScalarRenderer: React.FC<ScalarRendererProps> = ({ data, label }) => {
  const displayValue = data === null || data === undefined ? '–' : String(data);
  const isNumeric = typeof data === 'number';
  const isBoolean = typeof data === 'boolean';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ color: '#8BA4B8', fontSize: 12, fontWeight: 600 }}>{label}:</span>}
      <span style={{
        fontSize: isNumeric ? 18 : 14,
        fontWeight: isNumeric ? 700 : 400,
        fontFamily: isNumeric ? "'IBM Plex Mono', monospace" : 'inherit',
        color: isBoolean ? (data ? '#66BB6A' : '#EF5350') : isNumeric ? '#E0E0E0' : '#C0CCD8',
      }}>
        {isBoolean ? (data ? '✓ true' : '✕ false') : displayValue}
      </span>
    </div>
  );
};

// ── Signal Renderer ─────────────────────────────────────────────────────

const SignalRenderer: React.FC<{ fired: boolean; timestamp?: number }> = ({ fired, timestamp }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: fired ? '#AB47BC' : '#5A7A90' }}>
    <span style={{ fontSize: 16 }}>{fired ? '⚡' : '○'}</span>
    <span style={{ fontSize: 12 }}>{fired ? 'Signal fired' : 'No signal'}</span>
    {timestamp && (
      <span style={{ fontSize: 10, color: '#5A7A90' }}>
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    )}
  </div>
);

// ── Universal Output Renderer ───────────────────────────────────────────
// Dispatches to the appropriate type renderer based on the port's dataType.

interface OutputRendererProps {
  port: PortOutput;
  compact?: boolean;
}

const OutputRenderer: React.FC<OutputRendererProps> = ({ port, compact = false }) => {
  const { dataType, data } = port;

  if (data === undefined || data === null) {
    return <EmptyState message="No output" icon={getPortMeta(dataType).icon} />;
  }

  // Table: array of objects
  if (dataType === 'table' || (dataType === 'any' && Array.isArray(data))) {
    return <TableRenderer data={data as unknown[]} compact={compact} />;
  }

  // Record: object
  if (dataType === 'record' || (dataType === 'any' && typeof data === 'object' && !Array.isArray(data))) {
    return <RecordRenderer data={data as Record<string, unknown>} compact={compact} />;
  }

  // Signal: boolean or null
  if (dataType === 'signal') {
    return <SignalRenderer fired={!!data} timestamp={typeof data === 'number' ? data : undefined} />;
  }

  // Binary: show size
  if (dataType === 'binary') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#78909C' }}>
        <span style={{ fontSize: 16 }}>⬡</span>
        <span style={{ fontSize: 12 }}>Binary data</span>
        {port.sizeBytes && <span style={{ fontSize: 10 }}>({formatBytes(port.sizeBytes)})</span>}
      </div>
    );
  }

  // Scalar fallback
  return <ScalarRenderer data={data} />;
};


// ============================================================================
// §3 — NODE OUTPUT PANEL (Layer 2)
// ============================================================================
//
// Replaces the bare status pill in the canvas right panel. When you
// click a completed node, this panel shows all its output ports with
// the appropriate renderer. For a running node it shows a progress
// indicator. For a failed node it shows the error with context.

interface NodeOutputPanelProps {
  nodeId: string;
  nodeLabel: string;
  nodeTypeId: string;
  nodeCategory: string;
  categoryColor: string;
  state: string;
  output?: NodeOutputData;
  /** Port definitions from the NodeTypeDefinition. */
  portDefs: Array<{ portId: string; label: string; dataType: string }>;
  onExport?: (portId: string, format: 'json' | 'csv') => void;
}

export const NodeOutputPanel: React.FC<NodeOutputPanelProps> = ({
  nodeId, nodeLabel, nodeTypeId, nodeCategory, categoryColor,
  state, output, portDefs, onExport,
}) => {
  const [expandedPorts, setExpandedPorts] = useState<Set<string>>(() => new Set(portDefs.map(p => p.portId)));
  const [activeTab, setActiveTab] = useState<'outputs' | 'meta'>('outputs');

  const statusMeta = STATUS_META[state] ?? STATUS_META['pending']!;

  const togglePort = (portId: string) => {
    setExpandedPorts(prev => {
      const next = new Set(prev);
      next.has(portId) ? next.delete(portId) : next.add(portId);
      return next;
    });
  };

  return (
    <div>
      {/* Status bar */}
      <div style={{
        padding: '8px 12px', borderRadius: 8, marginBottom: 12,
        background: statusMeta.color + '12',
        border: `1px solid ${statusMeta.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, color: statusMeta.color }}>{statusMeta.glyph}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: statusMeta.color, textTransform: 'uppercase' as const }}>
            {state}
          </span>
        </div>
        {output && (
          <span style={{ fontSize: 10, color: '#5A7A90' }}>
            {(output.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Running: progress indicator */}
      {state === 'running' && (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }}>◉</div>
          <div style={{ fontSize: 12, color: '#5A7A90' }}>Executing...</div>
        </div>
      )}

      {/* Paused: pause info */}
      {state === 'paused' && output?.ports['__paused'] && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(171,71,188,0.08)', border: '1px solid rgba(171,71,188,0.25)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#AB47BC', marginBottom: 4 }}>⏸ PAUSED — WAITING FOR INPUT</div>
          <div style={{ fontSize: 12, color: '#C0CCD8' }}>
            {String((output.ports['__paused']?.data as any)?.__pauseReason ?? 'Awaiting human input')}
          </div>
        </div>
      )}

      {/* Failed: error detail */}
      {state === 'failed' && output?.error && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#EF5350', marginBottom: 4 }}>✕ EXECUTION FAILED</div>
          <div style={{ fontSize: 12, color: '#E0A0A0', fontFamily: "'IBM Plex Mono', monospace", wordBreak: 'break-word' }}>
            {output.error}
          </div>
        </div>
      )}

      {/* Completed: tab bar */}
      {state === 'completed' && output && (
        <>
          <div style={{ display: 'flex', gap: 2, marginBottom: 12, borderBottom: '1px solid #253545' }}>
            <TabButton label="Outputs" active={activeTab === 'outputs'} onClick={() => setActiveTab('outputs')} />
            <TabButton label="Metadata" active={activeTab === 'meta'} onClick={() => setActiveTab('meta')} />
          </div>

          {activeTab === 'outputs' && (
            <div>
              {portDefs.map(def => {
                const portOutput = output.ports[def.portId];
                const meta = getPortMeta(def.dataType);
                const isExpanded = expandedPorts.has(def.portId);
                const hasData = portOutput?.data !== undefined && portOutput?.data !== null;

                return (
                  <div key={def.portId} style={{
                    marginBottom: 8, borderRadius: 8, overflow: 'hidden',
                    border: `1px solid ${meta.color}22`, background: meta.bgColor,
                  }}>
                    {/* Port header */}
                    <div
                      onClick={() => hasData && togglePort(def.portId)}
                      style={{
                        padding: '8px 12px', cursor: hasData ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: meta.color, fontSize: 12 }}>{meta.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#D0D8E0' }}>{def.label}</span>
                        <span style={{ fontSize: 10, color: '#5A7A90' }}>({meta.label})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {hasData && portOutput && getDataSummary(def.dataType, portOutput.data)}
                        {hasData && (
                          <span style={{ color: '#5A7A90', fontSize: 10 }}>{isExpanded ? '▼' : '▶'}</span>
                        )}
                      </div>
                    </div>

                    {/* Port output content */}
                    {isExpanded && hasData && portOutput && (
                      <div style={{ padding: '0 12px 12px' }}>
                        <OutputRenderer port={portOutput} compact />
                        {/* Export buttons */}
                        {onExport && (def.dataType === 'table' || def.dataType === 'record') && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                            <ExportBtn label="JSON" onClick={() => onExport(def.portId, 'json')} />
                            {def.dataType === 'table' && <ExportBtn label="CSV" onClick={() => onExport(def.portId, 'csv')} />}
                          </div>
                        )}
                      </div>
                    )}

                    {/* No data */}
                    {!hasData && (
                      <div style={{ padding: '4px 12px 8px', fontSize: 11, color: '#5A7A90' }}>
                        No output
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'meta' && (
            <RecordRenderer data={{
              nodeId,
              typeId: nodeTypeId,
              category: nodeCategory,
              completedAt: new Date(output.completedAt).toISOString(),
              durationMs: output.durationMs,
              portsWithData: Object.keys(output.ports).filter(k => !k.startsWith('__')).length,
            }} compact />
          )}
        </>
      )}

      {/* Pending: nothing to show */}
      {state === 'pending' && (
        <div style={{ padding: '12px 0', textAlign: 'center', color: '#5A7A90', fontSize: 12 }}>
          Awaiting execution
        </div>
      )}
    </div>
  );
};


// ============================================================================
// §4 — WORKFLOW RESULTS DASHBOARD (Layer 3)
// ============================================================================
//
// The departure board — now with live commentary. When a workflow
// completes (or is in-progress), this overlay shows:
//
//   - AI-generated run narrative (what happened, in plain language)
//   - Progress bar with milestone pills
//   - Next Steps panel with priority-ordered actions
//   - Per-node cards with insight + data + visualisation
//   - Domain dashboard with charts and highlights
//   - Timeline (Gantt-style execution bars)

interface WorkflowNodeInfo {
  nodeId: string;
  label: string;
  typeId: string;
  category: string;
  position: { x: number; y: number };
  portDefs: Array<{ portId: string; label: string; dataType: string }>;
}

interface WorkflowResultsDashboardProps {
  runState: ExtendedRunState;
  nodes: WorkflowNodeInfo[];
  workflowName: string;
  workflowTags: string[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  onExport?: (nodeId: string, portId: string, format: 'json' | 'csv') => void;
  onResume?: (nodeId: string) => void;
  onRetry?: (nodeId: string) => void;
  /** Pre-computed insights (pass from parent to avoid re-computation). */
  insights?: OutputInsightBundle | null;
}

export const WorkflowResultsDashboard: React.FC<WorkflowResultsDashboardProps> = ({
  runState, nodes, workflowName, workflowTags, onClose, onNodeSelect, onExport,
  onResume, onRetry, insights: externalInsights,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'pipeline' | 'domain' | 'timeline'>('overview');
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  // AI Intelligence — compute insights if not passed externally
  const aiEngine = useRef(new OutputIntelligence());
  const insights = useMemo(
    () => externalInsights ?? aiEngine.current.analyse(runState, nodes, workflowTags),
    [externalInsights, runState, nodes, workflowTags],
  );

  // Domain dashboard
  const domainDashboard = useMemo(() => findDomainDashboard(workflowTags), [workflowTags]);

  // Pipeline stats
  const stats = useMemo(() => {
    const nodeStates = Object.entries(runState.nodeStates);
    const completed = nodeStates.filter(([, s]) => s === 'completed').length;
    const failed = nodeStates.filter(([, s]) => s === 'failed').length;
    const paused = nodeStates.filter(([, s]) => s === 'paused').length;

    let totalTableRows = 0;
    let totalRecordFields = 0;
    if (runState.nodeOutputs) {
      for (const output of Object.values(runState.nodeOutputs)) {
        for (const port of Object.values(output.ports)) {
          if (Array.isArray(port.data)) totalTableRows += port.data.length;
          else if (typeof port.data === 'object' && port.data !== null) {
            totalRecordFields += Object.keys(port.data).length;
          }
        }
      }
    }
    return { total: nodeStates.length, completed, failed, paused, totalTableRows, totalRecordFields };
  }, [runState]);

  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.position.x - b.position.x),
    [nodes],
  );

  const healthColors = { healthy: '#66BB6A', attention: '#FFB74D', warning: '#FF9800', critical: '#EF5350' };
  const statusColor = healthColors[insights.runHealth];

  // Handle next step actions
  const handleStepAction = useCallback((step: NextStep) => {
    if (step.actionType === 'resume' && step.nodeId && onResume) onResume(step.nodeId);
    else if (step.actionType === 'retry' && step.nodeId && onRetry) onRetry(step.nodeId);
    else if (step.nodeId) onNodeSelect(step.nodeId);
  }, [onResume, onRetry, onNodeSelect]);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '60vh', minHeight: 400,
      background: '#0D1720', borderTop: `2px solid ${statusColor}44`,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      zIndex: 100, boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #253545',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HealthIndicator health={insights.runHealth} size={32} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E8ECF0' }}>{workflowName}</div>
            <div style={{ fontSize: 11, color: '#8BA4B8', marginTop: 2 }}>
              {insights.runNarrative}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, marginRight: 8 }}>
            <TabButton label="Overview" active={activeView === 'overview'} onClick={() => setActiveView('overview')} />
            <TabButton label="Pipeline" active={activeView === 'pipeline'} onClick={() => setActiveView('pipeline')} />
            {domainDashboard && (
              <TabButton label={domainDashboard.label} active={activeView === 'domain'} onClick={() => setActiveView('domain')} />
            )}
            <TabButton label="Timeline" active={activeView === 'timeline'} onClick={() => setActiveView('timeline')} />
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #253545', borderRadius: 6, color: '#8BA4B8',
            cursor: 'pointer', padding: '4px 10px', fontSize: 12,
          }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* ── Overview View (NEW: the hero view) ─────────────────────── */}
        {activeView === 'overview' && (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* Left column: progress + insights + next steps */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProgressBar report={insights.progressReport} />

              {/* Summary metrics */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <SummaryCard label="Duration" value={`${(runState.durationMs / 1000).toFixed(1)}s`} color="#4DA6FF" />
                <SummaryCard label="Nodes" value={`${stats.completed}/${stats.total}`} color="#66BB6A" />
                {stats.totalTableRows > 0 && <SummaryCard label="Data Rows" value={formatNumber(stats.totalTableRows)} color="#4DA6FF" />}
                {stats.failed > 0 && <SummaryCard label="Failed" value={String(stats.failed)} color="#EF5350" />}
              </div>

              <NextStepsPanel steps={insights.nextSteps} onAction={handleStepAction} />

              {/* Node health overview — radial gauges */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 10 }}>
                  Node Health
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {orderedNodes.map(node => {
                    const nodeInsight = insights.nodeInsights.get(node.nodeId);
                    return (
                      <div
                        key={node.nodeId}
                        onClick={() => { setExpandedNode(node.nodeId); setActiveView('pipeline'); }}
                        style={{ cursor: 'pointer', textAlign: 'center' }}
                        title={nodeInsight?.summary ?? node.label}
                      >
                        <HealthIndicator health={nodeInsight?.health ?? 'healthy'} size={36} />
                        <div style={{ fontSize: 9, color: '#8BA4B8', marginTop: 4, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: key findings */}
            <div style={{ width: 320, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 10 }}>
                Key Findings
              </div>
              {orderedNodes.map(node => {
                const insight = insights.nodeInsights.get(node.nodeId);
                if (!insight || (insight.health === 'healthy' && insight.findings.length === 0)) return null;
                return <NodeInsightCard key={node.nodeId} insight={insight} />;
              })}
              {Array.from(insights.nodeInsights.values()).every(i => i.health === 'healthy' && i.findings.length === 0) && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#66BB6A' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>All Clear</div>
                  <div style={{ fontSize: 11, color: '#5A7A90', marginTop: 4 }}>No issues detected across the pipeline.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Pipeline View ──────────────────────────────────────────── */}
        {activeView === 'pipeline' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <SummaryCard label="Duration" value={`${(runState.durationMs / 1000).toFixed(1)}s`} color="#4DA6FF" />
              <SummaryCard label="Nodes" value={`${stats.completed}/${stats.total}`} color="#66BB6A" />
              {stats.totalTableRows > 0 && <SummaryCard label="Rows" value={formatNumber(stats.totalTableRows)} color="#4DA6FF" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orderedNodes.map(node => {
                const state = runState.nodeStates[node.nodeId] ?? 'pending';
                const output = runState.nodeOutputs?.[node.nodeId];
                const sm = STATUS_META[state] ?? STATUS_META['pending']!;
                const nodeInsight = insights.nodeInsights.get(node.nodeId);
                const isOpen = expandedNode === node.nodeId;

                return (
                  <div key={node.nodeId} style={{
                    borderRadius: 8, overflow: 'hidden',
                    border: `1px solid ${sm.color}22`,
                    background: isOpen ? '#162230' : '#0F1923',
                  }}>
                    <div
                      onClick={() => setExpandedNode(isOpen ? null : node.nodeId)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HealthIndicator health={nodeInsight?.health ?? 'healthy'} size={20} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#D0D8E0' }}>{node.label}</span>
                        {nodeInsight && (
                          <span style={{ fontSize: 10, color: '#8BA4B8', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            — {nodeInsight.summary}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {output && <span style={{ fontSize: 10, color: '#5A7A90' }}>{(output.durationMs / 1000).toFixed(2)}s</span>}
                        {output && getNodeOutputBadges(node.portDefs, output)}
                        <span style={{ color: '#5A7A90', fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid #253545' }}>
                        {/* AI Insight */}
                        {nodeInsight && <NodeInsightCard insight={nodeInsight} />}

                        {/* Data visualisation for numeric outputs */}
                        {output && <NodeDataViz node={node} output={output} />}

                        {/* Raw output panel */}
                        <NodeOutputPanel
                          nodeId={node.nodeId} nodeLabel={node.label} nodeTypeId={node.typeId}
                          nodeCategory={node.category} categoryColor="#8BA4B8"
                          state={state} output={output} portDefs={node.portDefs}
                          onExport={onExport ? (portId, fmt) => onExport(node.nodeId, portId, fmt) : undefined}
                        />
                        <button onClick={() => onNodeSelect(node.nodeId)} style={{
                          marginTop: 8, padding: '4px 10px', fontSize: 11, color: '#4DA6FF',
                          background: 'rgba(77,166,255,0.08)', border: '1px solid rgba(77,166,255,0.2)',
                          borderRadius: 4, cursor: 'pointer',
                        }}>
                          Select in Canvas →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Domain Dashboard ───────────────────────────────────────── */}
        {activeView === 'domain' && domainDashboard && (
          <domainDashboard.Component
            runState={runState}
            nodes={nodes}
            insights={insights.nodeInsights}
            narrative={insights.runNarrative}
          />
        )}

        {/* ── Timeline ───────────────────────────────────────────────── */}
        {activeView === 'timeline' && (
          <TimelineView runState={runState} nodes={orderedNodes} />
        )}
      </div>
    </div>
  );
};


// ============================================================================
// §5 — TIMELINE VIEW
// ============================================================================
// A Gantt-style timeline showing when each node started and ended.

interface TimelineViewProps {
  runState: ExtendedRunState;
  nodes: WorkflowNodeInfo[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ runState, nodes }) => {
  const totalMs = runState.durationMs || 1;
  const barHeight = 28;
  const labelWidth = 160;

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ color: '#5A7A90' }}>Total: {(totalMs / 1000).toFixed(2)}s</span>
        <div style={{ flex: 1, height: 1, background: '#253545' }} />
        <span style={{ color: '#5A7A90' }}>0s</span>
        <span style={{ color: '#5A7A90' }}>{(totalMs / 1000).toFixed(1)}s</span>
      </div>

      {nodes.map(node => {
        const state = runState.nodeStates[node.nodeId] ?? 'pending';
        const output = runState.nodeOutputs?.[node.nodeId];
        const sm = STATUS_META[state] ?? STATUS_META['pending']!;

        // Calculate bar position
        const startMs = output ? output.completedAt - output.durationMs - runState.startedAt : 0;
        const durationMs = output?.durationMs ?? 0;
        const leftPct = Math.max(0, (startMs / totalMs) * 100);
        const widthPct = Math.max(1, (durationMs / totalMs) * 100);

        return (
          <div key={node.nodeId} style={{
            display: 'flex', alignItems: 'center', marginBottom: 4, height: barHeight,
          }}>
            <div style={{
              width: labelWidth, flexShrink: 0, fontSize: 11, color: '#8BA4B8',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8,
            }}>
              {node.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: barHeight, background: '#0F1923', borderRadius: 4 }}>
              <div style={{
                position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`,
                height: '100%', borderRadius: 4,
                background: `${sm.color}44`, border: `1px solid ${sm.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 24,
              }}>
                <span style={{ fontSize: 9, color: sm.color, fontWeight: 600 }}>
                  {durationMs > 0 ? `${(durationMs / 1000).toFixed(2)}s` : sm.glyph}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ============================================================================
// §6 — DOMAIN DASHBOARD REGISTRY (Layer 4)
// ============================================================================
//
// Pluggable domain-specific views. Each domain dashboard registers
// with a matcher function (typically checking workflow tags) and a
// React component that renders the domain-specific view.

interface DomainDashboardDef {
  id: string;
  label: string;
  /** Returns true if this dashboard should be shown for the given workflow tags. */
  matches: (tags: string[]) => boolean;
  /** The dashboard component. */
  Component: React.FC<DomainDashboardProps>;
}

export interface DomainDashboardProps {
  runState: ExtendedRunState;
  nodes: WorkflowNodeInfo[];
  /** AI-generated insights for each node — domain dashboards can surface these. */
  insights?: Map<string, NodeOutputInsight>;
  /** Workflow-level narrative from OutputIntelligence. */
  narrative?: string;
}

const domainDashboards: DomainDashboardDef[] = [];

/** Register a domain dashboard. */
export function registerDomainDashboard(def: DomainDashboardDef): void {
  domainDashboards.push(def);
}

/** Find the best matching domain dashboard for the given tags. */
function findDomainDashboard(tags: string[]): DomainDashboardDef | null {
  return domainDashboards.find(d => d.matches(tags)) ?? null;
}


// ── Competition Dashboard ───────────────────────────────────────────────

const CompetitionDashboard: React.FC<DomainDashboardProps> = ({ runState, nodes, insights, narrative }) => {
  // Extract competition-specific outputs
  const getOutput = (nodeId: string, portId: string): unknown => {
    return runState.nodeOutputs?.[nodeId]?.ports[portId]?.data;
  };

  // Find nodes by typeId pattern
  const findNode = (typeIdFragment: string) => nodes.find(n => n.typeId.includes(typeIdFragment));

  const registrationNode = findNode('registration-management');
  const intakeNode = findNode('submission-intake');
  const scoringNode = findNode('competition-scoring');
  const resultsNode = findNode('results-publication');

  const regSummary = registrationNode ? getOutput(registrationNode.nodeId, 'registrationSummary') as Record<string, unknown> | undefined : undefined;
  const intakeSummary = intakeNode ? getOutput(intakeNode.nodeId, 'intakeSummary') as Record<string, unknown> | undefined : undefined;
  const scoringSummary = scoringNode ? getOutput(scoringNode.nodeId, 'scoringSummary') as Record<string, unknown> | undefined : undefined;
  const rankings = resultsNode ? getOutput(resultsNode.nodeId, 'rankings') as Record<string, unknown> | undefined : undefined;
  const pubSummary = resultsNode ? getOutput(resultsNode.nodeId, 'publicationSummary') as Record<string, unknown> | undefined : undefined;

  // Build chart data from scored results
  const scoreDistribution = scoringSummary?.['scoreDistribution'] as Array<{ bin: string; count: number }> | undefined;
  const categoryBreakdown = regSummary?.['byCategory'] as Array<{ category: string; count: number }> | undefined;

  return (
    <div>
      {/* AI narrative banner */}
      {narrative && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(77,166,255,0.04)', border: '1px solid rgba(77,166,255,0.12)',
          fontSize: 12, color: '#8BA4B8', lineHeight: 1.5,
        }}>
          {narrative}
        </div>
      )}

      {/* Hero stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {regSummary && <SummaryCard label="Registered" value={String(regSummary['totalRegistered'] ?? '–')} color="#AB47BC" />}
        {regSummary && <SummaryCard label="Eligible" value={String(regSummary['totalEligible'] ?? '–')} color="#66BB6A" />}
        {intakeSummary && <SummaryCard label="Submissions" value={String(intakeSummary['totalReceived'] ?? '–')} color="#4DA6FF" />}
        {intakeSummary && <SummaryCard label="Late" value={String(intakeSummary['totalLate'] ?? '0')} color="#FF9800" />}
        {scoringSummary && <SummaryCard label="Avg Score" value={String(scoringSummary['averageAutoScore'] ?? '–')} color="#FFB74D" />}
        {scoringSummary && <SummaryCard label="Low Confidence" value={String(scoringSummary['lowConfidenceCount'] ?? '0')} color="#EF5350" />}
      </div>

      {/* D3 Charts row — score distribution + category breakdown */}
      {(scoreDistribution || categoryBreakdown) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {scoreDistribution && scoreDistribution.length > 0 && (
            <div style={{ flex: 1, minWidth: 280 }}>
              <AutoChart
                data={scoreDistribution}
                dataType="table"
                title="Score Distribution"
                palette="score"
                height={200}
                compact
              />
            </div>
          )}
          {categoryBreakdown && categoryBreakdown.length > 0 && (
            <div style={{ flex: 1, minWidth: 280 }}>
              <AutoChart
                data={categoryBreakdown}
                dataType="table"
                title="Registrations by Category"
                palette="competition"
                height={200}
                compact
              />
            </div>
          )}
        </div>
      )}

      {/* AI node insights for competition nodes */}
      {insights && insights.size > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 10 }}>
            AI Analysis
          </div>
          {[registrationNode, intakeNode, scoringNode, resultsNode]
            .filter((n): n is NonNullable<typeof n> => n != null)
            .map(node => {
              const insight = insights.get(node.nodeId);
              if (!insight || (insight.health === 'healthy' && insight.findings.length === 0)) return null;
              return <NodeInsightCard key={node.nodeId} insight={insight} />;
            })
          }
        </div>
      )}

      {/* Winner highlight */}
      {pubSummary?.['winner'] && (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,183,77,0.04) 100%)',
          border: '1px solid rgba(255,215,0,0.2)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#FFD700', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
            🏆 Winner
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>
            {String((pubSummary['winner'] as any)?.displayName ?? 'Unknown')}
          </div>
          <div style={{ fontSize: 14, color: '#FFB74D', marginTop: 4 }}>
            Score: {String((pubSummary['winner'] as any)?.totalScore ?? '–')}
            {' · '}Rank: #{String((pubSummary['winner'] as any)?.rank ?? '–')}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {rankings && (rankings as any)['rankings'] && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8ECF0', marginBottom: 10 }}>Leaderboard</div>
          <div style={{ border: '1px solid #253545', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr style={{ background: '#1A2D3D' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Category</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {((rankings as any)['rankings'] as any[]).slice(0, 20).map((r: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={tdStyle}>
                      {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                    </td>
                    <td style={tdStyle}>{r.displayName}</td>
                    <td style={tdStyle}>{r.ageCategory}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: getScoreColor(r.totalScore) }}>
                      {r.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Publication summary */}
      {pubSummary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SummaryCard label="Certificates" value={String(pubSummary['certificatesGenerated'] ?? '0')} color="#AB47BC" />
          <SummaryCard label="Notifications" value={String(pubSummary['notificationsSent'] ?? '0')} color="#4DA6FF" />
          {Boolean(pubSummary['leaderboardUrl']) && (
            <SummaryCard label="Leaderboard" value="Published ✓" color="#66BB6A" />
          )}
        </div>
      )}
    </div>
  );
};

// Register competition dashboard
registerDomainDashboard({
  id: 'competition-dictation',
  label: 'Competition',
  matches: (tags) => tags.some(t => t === 'competition' || t === 'dictation' || t === 'dicta-dor'),
  Component: CompetitionDashboard,
});


// ── Migration Dashboard ─────────────────────────────────────────────────

const MigrationDashboard: React.FC<DomainDashboardProps> = ({ runState, nodes, insights, narrative }) => {
  const getOutput = (nodeId: string, portId: string): unknown => {
    return runState.nodeOutputs?.[nodeId]?.ports[portId]?.data;
  };
  const findNode = (typeIdFragment: string) => nodes.find(n => n.typeId.includes(typeIdFragment));

  const sourceNode = findNode('platform-export');
  const transformNode = findNode('content-transform');
  const importNode = findNode('service-import');
  const cutoverNode = findNode('infrastructure-cutover');
  const healthNode = findNode('health-monitor');

  const sourceContent = sourceNode ? getOutput(sourceNode.nodeId, 'content') as unknown[] | undefined : undefined;
  const transformResult = transformNode ? getOutput(transformNode.nodeId, 'transformResult') as Record<string, unknown> | undefined : undefined;
  const importResult = importNode ? getOutput(importNode.nodeId, 'importResult') as Record<string, unknown> | undefined : undefined;
  const cutoverResult = cutoverNode ? getOutput(cutoverNode.nodeId, 'cutoverResult') as Record<string, unknown> | undefined : undefined;
  const healthReport = healthNode ? getOutput(healthNode.nodeId, 'healthReport') as Record<string, unknown> | undefined : undefined;

  // Build chart data from source content types
  const contentTypeCounts = useMemo(() => {
    if (!sourceContent || !Array.isArray(sourceContent)) return null;
    const counts: Record<string, number> = {};
    for (const item of sourceContent) {
      const type = (item as any)?.sourceType ?? 'unknown';
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [sourceContent]);

  // Import pipeline funnel data
  const funnelData = useMemo(() => {
    const stages: Array<{ stage: string; count: number }> = [];
    if (sourceContent) stages.push({ stage: 'Extracted', count: sourceContent.length });
    if (transformResult?.['totalTransformed']) stages.push({ stage: 'Transformed', count: Number(transformResult['totalTransformed']) });
    if (importResult?.['importedCount']) stages.push({ stage: 'Imported', count: Number(importResult['importedCount']) });
    if (importResult?.['failedCount']) stages.push({ stage: 'Failed', count: Number(importResult['failedCount']) });
    return stages.length >= 2 ? stages : null;
  }, [sourceContent, transformResult, importResult]);

  return (
    <div>
      {/* AI narrative banner */}
      {narrative && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(77,166,255,0.04)', border: '1px solid rgba(77,166,255,0.12)',
          fontSize: 12, color: '#8BA4B8', lineHeight: 1.5,
        }}>
          {narrative}
        </div>
      )}

      {/* Hero stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {sourceContent && <SummaryCard label="Items Extracted" value={formatNumber(sourceContent.length)} color="#4DA6FF" />}
        {importResult && <SummaryCard label="Items Imported" value={String(importResult['importedCount'] ?? '–')} color="#66BB6A" />}
        {cutoverResult && (
          <SummaryCard
            label="Cutover"
            value={String(cutoverResult['status'] ?? 'pending')}
            color={cutoverResult['status'] === 'active' ? '#66BB6A' : '#FF9800'}
          />
        )}
        {healthReport && (
          <SummaryCard
            label="Health"
            value={String(healthReport['status'] ?? 'unknown')}
            color={healthReport['status'] === 'healthy' ? '#66BB6A' : healthReport['status'] === 'degraded' ? '#FF9800' : '#EF5350'}
          />
        )}
      </div>

      {/* D3 Charts row — content types donut + migration funnel */}
      {(contentTypeCounts || funnelData) && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {contentTypeCounts && contentTypeCounts.length > 0 && (
            <div style={{ flex: 1, minWidth: 250 }}>
              <AutoChart
                data={contentTypeCounts}
                dataType="table"
                title="Content by Type"
                palette="default"
                height={200}
                compact
              />
            </div>
          )}
          {funnelData && (
            <div style={{ flex: 1, minWidth: 250 }}>
              <AutoChart
                data={funnelData}
                dataType="table"
                title="Migration Pipeline"
                palette="health"
                height={200}
                compact
              />
            </div>
          )}
        </div>
      )}

      {/* AI node insights for migration nodes */}
      {insights && insights.size > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 10 }}>
            AI Analysis
          </div>
          {[sourceNode, transformNode, importNode, cutoverNode, healthNode]
            .filter((n): n is NonNullable<typeof n> => n != null)
            .map(node => {
              const insight = insights.get(node.nodeId);
              if (!insight || (insight.health === 'healthy' && insight.findings.length === 0)) return null;
              return <NodeInsightCard key={node.nodeId} insight={insight} />;
            })
          }
        </div>
      )}

      {/* Health check details */}
      {healthReport && (healthReport['checks'] as any[]) && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8ECF0', marginBottom: 10 }}>Health Checks</div>
          {((healthReport['checks'] as any[]) ?? []).map((check: any, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: '1px solid #1A2D3D', fontSize: 12,
            }}>
              <HealthIndicator health={check.status === 'pass' ? 'healthy' : check.status === 'warn' ? 'warning' : 'error'} size={16} />
              <span style={{ color: '#C0CCD8' }}>{check.name}</span>
              <span style={{ color: '#5A7A90', marginLeft: 'auto', fontSize: 10 }}>{check.responseTimeMs}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

registerDomainDashboard({
  id: 'migration-platform',
  label: 'Migration',
  matches: (tags) => tags.some(t => t === 'migration'),
  Component: MigrationDashboard,
});


// ── Analytics Dashboard ─────────────────────────────────────────────────

const AnalyticsDashboard: React.FC<DomainDashboardProps> = ({ runState, nodes }) => {
  // Generic analytics: show all table outputs with row counts, all record outputs as cards
  const outputs = runState.nodeOutputs ?? {};

  const tableOutputs: Array<{ label: string; rows: number; nodeLabel: string }> = [];
  const recordOutputs: Array<{ label: string; data: Record<string, unknown>; nodeLabel: string }> = [];

  for (const node of nodes) {
    const nodeOutput = outputs[node.nodeId];
    if (!nodeOutput) continue;
    for (const portDef of node.portDefs) {
      const port = nodeOutput.ports[portDef.portId];
      if (!port?.data) continue;
      if (portDef.dataType === 'table' && Array.isArray(port.data)) {
        tableOutputs.push({ label: portDef.label, rows: port.data.length, nodeLabel: node.label });
      } else if (portDef.dataType === 'record' && typeof port.data === 'object') {
        recordOutputs.push({ label: portDef.label, data: port.data as Record<string, unknown>, nodeLabel: node.label });
      }
    }
  }

  return (
    <div>
      {tableOutputs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8ECF0', marginBottom: 10 }}>Data Outputs</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {tableOutputs.map((t, i) => (
              <SummaryCard key={i} label={`${t.nodeLabel} → ${t.label}`} value={`${formatNumber(t.rows)} rows`} color="#4DA6FF" />
            ))}
          </div>
        </div>
      )}
      {recordOutputs.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8ECF0', marginBottom: 10 }}>Results</div>
          {recordOutputs.map((r, i) => (
            <div key={i} style={{
              marginBottom: 12, padding: 12, borderRadius: 8,
              background: 'rgba(255,183,77,0.04)', border: '1px solid rgba(255,183,77,0.15)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#FFB74D', marginBottom: 8 }}>{r.nodeLabel} → {r.label}</div>
              <RecordRenderer data={r.data} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

registerDomainDashboard({
  id: 'analytics-generic',
  label: 'Analytics',
  matches: (tags) => tags.some(t => t === 'analytics' || t === 'education' || t === 'report'),
  Component: AnalyticsDashboard,
});


// ============================================================================
// §7 — SHARED UI PRIMITIVES
// ============================================================================

const EmptyState: React.FC<{ message: string; icon: string }> = ({ message, icon }) => (
  <div style={{ textAlign: 'center', padding: '12px 0', color: '#5A7A90' }}>
    <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 11 }}>{message}</div>
  </div>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: active ? 'rgba(77,166,255,0.12)' : 'transparent',
    border: 'none', borderBottom: active ? '2px solid #4DA6FF' : '2px solid transparent',
    color: active ? '#4DA6FF' : '#5A7A90',
  }}>
    {label}
  </button>
);

// ── Health Indicator ─────────────────────────────────────────────────────
// Radial status indicator used throughout dashboards. Colour maps:
//   healthy → green ring    warning → amber ring
//   error   → red ring      pending → grey ring

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#66BB6A',
  warning: '#FF9800',
  error: '#EF5350',
  critical: '#D32F2F',
  pending: '#5A7A90',
};

const HealthIndicator: React.FC<{ health: string; size?: number }> = ({ health, size = 24 }) => {
  const color = HEALTH_COLORS[health] ?? HEALTH_COLORS['pending']!;
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  // Full ring for healthy, 3/4 for warning, 1/2 for error, empty for pending
  const fillFraction = health === 'healthy' ? 1.0
    : health === 'warning' ? 0.75
    : health === 'error' || health === 'critical' ? 0.5
    : 0.25;
  const dashArray = `${circumference * fillFraction} ${circumference * (1 - fillFraction)}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Background track */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`${color}22`} strokeWidth={2.5} />
      {/* Filled arc */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={dashArray}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      {/* Centre dot */}
      <circle cx={size / 2} cy={size / 2} r={size * 0.12}
        fill={color} style={{ transition: 'fill 0.3s ease' }} />
    </svg>
  );
};


const SummaryCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '10px 14px', borderRadius: 8, minWidth: 100,
    background: `${color}08`, border: `1px solid ${color}22`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>
      {value}
    </div>
  </div>
);

const PaginationBtn: React.FC<{ label: string; onClick: () => void; disabled: boolean }> = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: 'none', border: '1px solid #253545', borderRadius: 4, color: disabled ? '#253545' : '#8BA4B8',
    cursor: disabled ? 'default' : 'pointer', padding: '2px 8px', fontSize: 11,
  }}>
    {label}
  </button>
);

const ExportBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{
    padding: '2px 8px', fontSize: 10, fontWeight: 600,
    background: 'rgba(77,166,255,0.06)', border: '1px solid rgba(77,166,255,0.15)',
    borderRadius: 4, color: '#4DA6FF', cursor: 'pointer',
  }}>
    ↓ {label}
  </button>
);


// ── Formatting Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCellValue(value: string): React.ReactNode {
  // Boolean rendering
  if (value === 'true') return <span style={{ color: '#66BB6A' }}>✓ true</span>;
  if (value === 'false') return <span style={{ color: '#EF5350' }}>✕ false</span>;
  if (value === '–' || value === 'null' || value === 'undefined') return <span style={{ color: '#5A7A90' }}>–</span>;
  // URL rendering
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return <span style={{ color: '#4DA6FF', textDecoration: 'underline' }} title={value}>{value.slice(0, 50)}{value.length > 50 ? '…' : ''}</span>;
  }
  return value;
}

function getValueColor(value: unknown): string {
  if (value === null || value === undefined) return '#5A7A90';
  if (typeof value === 'number') return '#4DA6FF';
  if (typeof value === 'boolean') return value ? '#66BB6A' : '#EF5350';
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return '#4DA6FF';
  return '#C0CCD8';
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#66BB6A';
  if (score >= 70) return '#FFB74D';
  if (score >= 50) return '#FF9800';
  return '#EF5350';
}

function getDataSummary(dataType: string, data: unknown): React.ReactNode {
  const style = { fontSize: 10, color: '#5A7A90', fontFamily: "'IBM Plex Mono', monospace" as const };
  if (dataType === 'table' && Array.isArray(data)) {
    return <span style={style}>{data.length} rows</span>;
  }
  if (dataType === 'record' && typeof data === 'object' && data !== null) {
    return <span style={style}>{Object.keys(data).length} fields</span>;
  }
  return null;
}

function getNodeOutputBadges(portDefs: Array<{ portId: string; dataType: string }>, output: NodeOutputData): React.ReactNode {
  const badges: React.ReactNode[] = [];
  for (const def of portDefs) {
    const port = output.ports[def.portId];
    if (!port?.data) continue;
    const meta = getPortMeta(def.dataType);
    badges.push(
      <span key={def.portId} style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '1px 5px', borderRadius: 3, fontSize: 9,
        background: `${meta.color}15`, color: meta.color,
      }}>
        {meta.icon}
      </span>
    );
  }
  return <>{badges}</>;
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', color: '#8BA4B8',
  borderBottom: '1px solid #253545', fontSize: 11, fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '5px 10px', color: '#C0CCD8', borderBottom: '1px solid #1A2D3D',
};


// ============================================================================
// §8 — CANVAS INTEGRATION HELPERS
// ============================================================================
//
// Functions that the main canvas component calls to wire up the output
// rendering system. These bridge the gap between the existing RunState
// and the extended version.

/**
 * Capture a node's output data and merge it into the extended run state.
 * Call this from the execution controller when a node completes.
 */
export function captureNodeOutput(
  prevState: ExtendedRunState,
  nodeId: string,
  outputs: Record<string, unknown>,
  portDefs: Array<{ portId: string; label: string; dataType: string }>,
  durationMs: number,
  error?: string,
): ExtendedRunState {
  const portOutputs: Record<string, PortOutput> = {};
  for (const def of portDefs) {
    portOutputs[def.portId] = {
      portId: def.portId,
      label: def.label,
      dataType: def.dataType,
      data: outputs[def.portId],
    };
  }

  return {
    ...prevState,
    nodeOutputs: {
      ...prevState.nodeOutputs,
      [nodeId]: {
        ports: portOutputs,
        completedAt: Date.now(),
        durationMs,
        error,
      },
    },
  };
}

/**
 * Export a port's data as JSON or CSV.
 * Returns a download URL (blob URL) and filename.
 */
export function exportPortData(
  nodeId: string,
  portId: string,
  data: unknown,
  format: 'json' | 'csv',
): { url: string; filename: string } {
  let content: string;
  let mimeType: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
  } else {
    // CSV: only for arrays
    if (!Array.isArray(data) || data.length === 0) {
      content = '';
      mimeType = 'text/csv';
    } else {
      const headers = typeof data[0] === 'object' && data[0] !== null ? Object.keys(data[0]) : ['value'];
      const rows = data.map(row => {
        if (typeof row !== 'object' || row === null) return [String(row)];
        return headers.map(h => {
          const v = (row as any)[h];
          const s = String(v ?? '');
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        });
      });
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv';
    }
  }

  const blob = new Blob([content], { type: mimeType });
  return {
    url: URL.createObjectURL(blob),
    filename: `${nodeId}_${portId}.${format}`,
  };
}


// ============================================================================
// §9 — AI OUTPUT INTELLIGENCE: TYPES
// ============================================================================
//
// The canvas's existing WorkflowIntelligence (§5 in sr-canvas-production.tsx)
// is the architect who reads blueprints: it understands what nodes DO.
// This output intelligence is the building inspector who reads gauges:
// it understands what nodes PRODUCED, whether the results are healthy,
// and what the operator should do next.
//
// Three responsibilities, like a good teaching assistant:
//
//   EXPLAIN — translate raw data into plain language.
//     "3 submissions scored with low NLP confidence. This means the
//      auto-scorer wasn't sure — those need priority human review."
//
//   ASSESS — evaluate whether results meet expectations.
//     "Average score of 72 is normal for difficulty 3. One score of 12
//      is an outlier — possibly a blank submission."
//
//   GUIDE — recommend concrete next actions.
//     "Judging is paused. 3 submissions assigned to 2 judges. Once
//      judges finish, resume the workflow to aggregate and publish."
//
// The engine runs LOCALLY by default — deterministic rule-based analysis
// that works offline with zero API calls. If a Claude API endpoint is
// configured, it can request richer AI-generated narratives. The local
// layer always runs first; the AI layer enhances, never replaces.

/** Insight about a single node's output. */
export interface NodeOutputInsight {
  nodeId: string;
  /** Plain-language summary of what this node produced. */
  summary: string;
  /** Key findings — the most important things to notice. */
  findings: OutputFinding[];
  /** Health assessment. */
  health: 'healthy' | 'attention' | 'warning' | 'critical';
  /** What to do next based on this output. */
  guidance?: string;
  /** Educational explanation — why this matters, written for non-experts. */
  explanation?: string;
}

export interface OutputFinding {
  label: string;
  detail: string;
  severity: 'info' | 'attention' | 'warning' | 'critical';
  portId?: string;
  metric?: { label: string; value: number | string; unit?: string; threshold?: number };
}

/** Complete intelligence output for a workflow run. */
export interface OutputInsightBundle {
  /** Plain-language narrative of the entire run's results. */
  runNarrative: string;
  /** Overall health. */
  runHealth: 'healthy' | 'attention' | 'warning' | 'critical';
  /** Per-node insights. */
  nodeInsights: Map<string, NodeOutputInsight>;
  /** Recommended next steps (ordered by priority). */
  nextSteps: NextStep[];
  /** Progress report. */
  progressReport: ProgressReport;
  generatedAt: number;
}

export interface NextStep {
  priority: 'immediate' | 'soon' | 'when_ready';
  label: string;
  detail: string;
  nodeId?: string;
  actionable: boolean;
  actionType?: 'resume' | 'retry' | 'configure' | 'export' | 'review' | 'navigate';
}

export interface ProgressReport {
  percentComplete: number;
  currentPhase: string;
  liveStatus: string;
  estimatedRemainingMs: number | null;
  milestones: Array<{ label: string; completed: boolean; nodeId: string }>;
}


// ============================================================================
// §10 — OUTPUT INTELLIGENCE ENGINE
// ============================================================================

export class OutputIntelligence {
  private apiBaseUrl: string | null;
  private apiHeaders: Record<string, string>;

  constructor(apiConfig?: { baseUrl: string; authToken?: string }) {
    this.apiBaseUrl = apiConfig?.baseUrl ?? null;
    this.apiHeaders = {
      'Content-Type': 'application/json',
      ...(apiConfig?.authToken ? { Authorization: `Bearer ${apiConfig.authToken}` } : {}),
    };
  }

  /**
   * Analyse the workflow run and produce contextual insights.
   * Call whenever runState changes — the engine is stateless and fast.
   */
  analyse(
    runState: ExtendedRunState,
    nodes: WorkflowNodeInfo[],
    workflowTags: string[],
  ): OutputInsightBundle {
    const nodeInsights = new Map<string, NodeOutputInsight>();
    const nextSteps: NextStep[] = [];
    const domain = this.detectDomain(workflowTags);
    const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);

    for (const node of ordered) {
      const state = runState.nodeStates[node.nodeId] ?? 'pending';
      const output = runState.nodeOutputs?.[node.nodeId];
      const insight = this.analyseNodeOutput(node, state, output, domain, runState);
      nodeInsights.set(node.nodeId, insight);

      if (insight.guidance) {
        nextSteps.push({
          priority: insight.health === 'critical' ? 'immediate' : insight.health === 'warning' ? 'soon' : 'when_ready',
          label: node.label,
          detail: insight.guidance,
          nodeId: node.nodeId,
          actionable: state === 'paused' || state === 'failed',
          actionType: state === 'paused' ? 'resume' : state === 'failed' ? 'retry' : 'review',
        });
      }
    }

    const progressReport = this.buildProgressReport(runState, ordered);
    const runNarrative = this.buildRunNarrative(runState, ordered, nodeInsights, domain);

    const healths = Array.from(nodeInsights.values()).map(i => i.health);
    const runHealth: OutputInsightBundle['runHealth'] =
      healths.includes('critical') ? 'critical'
      : healths.includes('warning') ? 'warning'
      : healths.includes('attention') ? 'attention'
      : 'healthy';

    const priorityOrder = { immediate: 0, soon: 1, when_ready: 2 };
    nextSteps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { runNarrative, runHealth, nodeInsights, nextSteps, progressReport, generatedAt: Date.now() };
  }

  /**
   * Request richer AI-generated insight via the Claude API.
   * Falls back to local analysis if unavailable.
   */
  async analyseWithAI(
    runState: ExtendedRunState,
    nodes: WorkflowNodeInfo[],
    workflowTags: string[],
  ): Promise<OutputInsightBundle> {
    const local = this.analyse(runState, nodes, workflowTags);
    if (!this.apiBaseUrl) return local;

    try {
      const context = this.buildAIContext(runState, nodes, workflowTags, local);
      const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/run-explain`, {
        method: 'POST',
        headers: this.apiHeaders,
        body: JSON.stringify({
          context,
          prompt: 'Analyse this workflow execution. Explain the results in plain language suitable for a non-technical educator. Highlight anything unusual, concerning, or particularly good. Suggest concrete next actions. Use encouraging, empowering language — the goal is to help the user understand and feel confident, not overwhelmed.',
        }),
      });
      if (!response.ok) return local;

      const aiResult = await response.json();
      return {
        ...local,
        runNarrative: aiResult.narrative || local.runNarrative,
        nextSteps: aiResult.suggestions
          ? aiResult.suggestions.map((s: string, i: number) => ({
              priority: i === 0 ? 'immediate' as const : 'when_ready' as const,
              label: 'AI Suggestion', detail: s, actionable: false,
            }))
          : local.nextSteps,
      };
    } catch {
      return local;
    }
  }

  // ── Per-Node Analysis ───────────────────────────────────────────────

  private analyseNodeOutput(
    node: WorkflowNodeInfo,
    state: string,
    output: NodeOutputData | undefined,
    domain: string,
    runState: ExtendedRunState,
  ): NodeOutputInsight {
    const findings: OutputFinding[] = [];
    let summary = '';
    let health: NodeOutputInsight['health'] = 'healthy';
    let guidance: string | undefined;
    let explanation: string | undefined;

    // ── State-Based Analysis ────────────────────────────────────────

    if (state === 'pending') {
      return {
        nodeId: node.nodeId, summary: 'Waiting to execute.',
        findings: [], health: 'healthy',
        explanation: 'This node hasn\'t run yet. It will execute automatically when all its upstream dependencies complete — like a relay runner waiting for the baton.',
      };
    }

    if (state === 'running') {
      return {
        nodeId: node.nodeId, summary: 'Currently executing...',
        findings: [], health: 'healthy',
        explanation: 'This node is processing data right now. Execution time depends on the volume and complexity of input. Think of it as a chef working through orders — larger batches take longer.',
      };
    }

    if (state === 'failed') {
      return {
        nodeId: node.nodeId,
        summary: `Failed: ${output?.error ?? 'Unknown error'}`,
        findings: [{
          label: 'Execution Failed',
          detail: output?.error ?? 'The node encountered an error during execution.',
          severity: 'critical',
        }],
        health: 'critical',
        guidance: 'Review the error message above. Common fixes: check service availability, verify configuration settings, and ensure input data from upstream nodes is valid. Once resolved, you can retry this node.',
        explanation: 'When a node fails, everything downstream pauses — like a blocked railway line. Fix the issue at this node to unblock the rest of the pipeline. Your progress up to this point is preserved.',
      };
    }

    if (state === 'paused') {
      const pauseReason = output?.ports['__paused']?.data as any;
      const reason = pauseReason?.__pauseReason ?? 'Awaiting human input';
      return {
        nodeId: node.nodeId,
        summary: `Paused: ${reason}`,
        findings: [{
          label: 'Workflow Paused', detail: reason, severity: 'attention',
        }],
        health: 'attention',
        guidance: 'This is an intentional checkpoint — the workflow is designed to pause here for human judgement. Complete the required action (e.g., review, scoring, approval), then click Resume to continue.',
        explanation: 'Pause nodes are like quality gates in a factory. They ensure that automated processing doesn\'t skip steps that need a human eye. All progress is safely preserved while you take the time you need.',
      };
    }

    // ── Completed: Analyse Outputs ────────────────────────────────────

    if (state === 'completed' && output) {
      const durationSec = output.durationMs / 1000;
      if (durationSec > 30) {
        findings.push({
          label: 'Slow Execution',
          detail: `This node took ${durationSec.toFixed(1)}s — longer than typical. This may be expected for large datasets, but worth noting if it recurs.`,
          severity: durationSec > 120 ? 'warning' : 'attention',
          metric: { label: 'Duration', value: durationSec, unit: 's', threshold: 30 },
        });
      }

      // Port-specific analysis
      for (const def of node.portDefs) {
        const port = output.ports[def.portId];
        if (!port?.data || def.portId.startsWith('__')) continue;

        if (def.dataType === 'table' && Array.isArray(port.data)) {
          this.analyseTableOutput(def.portId, def.label, port.data, findings);
        }
        if (def.dataType === 'record' && typeof port.data === 'object' && port.data !== null) {
          this.analyseRecordOutput(def.portId, def.label, port.data as Record<string, unknown>, findings);
        }
      }

      // Domain-specific analysis
      const domainResult = this.domainAnalysis(node, output, domain, runState);
      if (domainResult.findings.length > 0) findings.push(...domainResult.findings);
      if (domainResult.summary) summary = domainResult.summary;
      if (domainResult.guidance) guidance = domainResult.guidance;
      if (domainResult.explanation) explanation = domainResult.explanation;

      // Default summary
      if (!summary) {
        const parts: string[] = [];
        for (const def of node.portDefs) {
          const port = output.ports[def.portId];
          if (!port?.data || def.portId.startsWith('__')) continue;
          if (Array.isArray(port.data)) parts.push(`${port.data.length} ${def.label.toLowerCase()}`);
          else if (typeof port.data === 'object') parts.push(def.label);
        }
        summary = parts.length > 0
          ? `Produced ${parts.join(', ')}. Completed in ${durationSec.toFixed(1)}s.`
          : `Completed in ${durationSec.toFixed(1)}s.`;
      }

      if (findings.some(f => f.severity === 'critical')) health = 'critical';
      else if (findings.some(f => f.severity === 'warning')) health = 'warning';
      else if (findings.some(f => f.severity === 'attention')) health = 'attention';
    }

    return { nodeId: node.nodeId, summary, findings, health, guidance, explanation };
  }

  // ── Table Analysis ──────────────────────────────────────────────────

  private analyseTableOutput(portId: string, label: string, rows: unknown[], findings: OutputFinding[]): void {
    if (rows.length === 0) {
      findings.push({
        label: `Empty ${label}`,
        detail: `The ${label} output produced 0 rows. This might be perfectly fine (e.g., no errors found) or might indicate a problem upstream — worth checking.`,
        severity: 'attention', portId,
      });
      return;
    }

    // Null field detection
    if (typeof rows[0] === 'object' && rows[0] !== null) {
      const sampleSize = Math.min(rows.length, 100);
      const sample = rows.slice(0, sampleSize);
      const fields = Object.keys(rows[0] as object);
      for (const field of fields) {
        const nullCount = sample.filter(r => {
          const v = (r as any)?.[field];
          return v === null || v === undefined || v === '';
        }).length;
        const nullPct = (nullCount / sampleSize) * 100;
        if (nullPct > 50) {
          findings.push({
            label: `Sparse Field: ${field}`,
            detail: `${nullPct.toFixed(0)}% of rows have empty "${field}" values. Like a form where most people skip a question — the data is still usable, but this column may not be reliable for analysis.`,
            severity: nullPct > 90 ? 'warning' : 'attention', portId,
            metric: { label: 'Empty %', value: nullPct, unit: '%', threshold: 50 },
          });
        }
      }
    }

    if (rows.length > 1000) {
      findings.push({
        label: 'Large Dataset',
        detail: `${rows.length.toLocaleString()} rows produced. You can view a sample here, or export to CSV for full analysis in a spreadsheet.`,
        severity: 'info', portId,
        metric: { label: 'Rows', value: rows.length },
      });
    }
  }

  // ── Record Analysis ─────────────────────────────────────────────────

  private analyseRecordOutput(portId: string, label: string, data: Record<string, unknown>, findings: OutputFinding[]): void {
    const statusFields = ['status', 'health', 'result', 'outcome'];
    for (const field of statusFields) {
      if (data[field] !== undefined) {
        const val = String(data[field]);
        const isNegative = ['failed', 'error', 'unhealthy', 'critical', 'rejected'].includes(val.toLowerCase());
        if (isNegative) {
          findings.push({
            label: `${label}: ${field} = ${val}`,
            detail: `The ${field} field indicates a problem. Expand the record below to see full details.`,
            severity: 'warning', portId,
          });
        }
      }
    }

    const errorFields = ['errorCount', 'errors', 'failedCount', 'failed'];
    for (const field of errorFields) {
      const val = data[field];
      if (typeof val === 'number' && val > 0) {
        findings.push({
          label: `${label}: ${val} error(s)`,
          detail: `${val} error(s) reported. Review the output data for specifics.`,
          severity: val > 10 ? 'warning' : 'attention', portId,
          metric: { label: 'Errors', value: val },
        });
      }
    }
  }

  // ── Domain-Specific Analysis ────────────────────────────────────────

  private domainAnalysis(
    node: WorkflowNodeInfo,
    output: NodeOutputData,
    domain: string,
    _runState: ExtendedRunState,
  ): { findings: OutputFinding[]; summary?: string; guidance?: string; explanation?: string } {
    const findings: OutputFinding[] = [];
    let summary: string | undefined;
    let guidance: string | undefined;
    let explanation: string | undefined;

    // ── Competition Domain ─────────────────────────────────────────

    if (domain === 'competition') {

      // Registration Management
      if (node.typeId.includes('registration-management')) {
        const reg = output.ports['registrationSummary']?.data as Record<string, unknown> | undefined;
        if (reg) {
          const eligible = reg['totalEligible'] as number ?? 0;
          const waitlisted = reg['waitlisted'] as number ?? 0;
          const rejected = (reg['rejectedLateRegistration'] as number ?? 0) + (reg['rejectedAgeCategory'] as number ?? 0);
          summary = `${eligible} eligible participants from ${reg['totalRegistered']} registrations.`;
          if (waitlisted > 0) {
            findings.push({ label: 'Waitlisted Participants', detail: `${waitlisted} participants exceeded capacity and were placed on a waitlist — like a sold-out venue with a queue outside. Consider increasing the limit or running an additional round.`, severity: 'attention', metric: { label: 'Waitlisted', value: waitlisted } });
          }
          if (rejected > 0) {
            findings.push({ label: 'Filtered Registrations', detail: `${rejected} registration(s) didn't pass the filters (late deadline or wrong age category). These filters are working as designed to keep the competition fair.`, severity: 'info', metric: { label: 'Filtered', value: rejected } });
          }
          if (eligible < 5) {
            findings.push({ label: 'Low Participation', detail: `Only ${eligible} eligible participants. A competition works best with at least 10–15. Consider extending the registration deadline, broadening the age categories, or promoting the event more widely.`, severity: 'warning', metric: { label: 'Eligible', value: eligible, threshold: 10 } });
            guidance = 'Consider promoting the competition or extending registration before proceeding to dictation delivery.';
          }
          explanation = 'Registration management is the box office before the curtain rises. It checks eligibility (age, deadline, capacity) and produces a clean roster of who\'s competing. Disqualified or withdrawn participants are automatically excluded — this keeps everything fair without manual checking.';
        }
      }

      // Dictation Delivery
      if (node.typeId.includes('dictation-delivery')) {
        const session = output.ports['session']?.data as Record<string, unknown> | undefined;
        if (session) {
          const duration = session['durationSeconds'] as number ?? 0;
          const config = session['playbackConfig'] as Record<string, unknown> | undefined;
          const readings = config?.['readCount'] as number ?? 3;
          summary = `Dictation delivered: ${Math.round(duration / 60)}min ${duration % 60}s across ${readings} readings.`;
          explanation = `The dictation was read ${readings} time(s) following La Dictée tradition — first at natural pace for overall comprehension, then slowly with pauses for writing, then once more at natural pace for final checking. Think of it as hear-write-verify.`;
        }
      }

      // Submission Intake
      if (node.typeId.includes('submission-intake')) {
        const intake = output.ports['intakeSummary']?.data as Record<string, unknown> | undefined;
        if (intake) {
          const total = intake['totalReceived'] as number ?? 0;
          const late = intake['totalLate'] as number ?? 0;
          summary = `${total} submissions collected (${total - late} on time, ${late} late).`;
          if (late > 0 && total > 0 && late / total > 0.3) {
            findings.push({ label: 'High Late Submission Rate', detail: `${((late / total) * 100).toFixed(0)}% of submissions arrived after the deadline. Like an exam where a third of students ask for extra time — the window may need to be longer for future rounds.`, severity: 'attention', metric: { label: 'Late %', value: (late / total) * 100, unit: '%', threshold: 20 } });
          }
          if (total === 0) {
            findings.push({ label: 'No Submissions Received', detail: 'Zero submissions came in. Check that participants were notified, the submission interface was accessible, and the window was long enough. This is like an exam room where nobody showed up — investigate before proceeding.', severity: 'critical' });
            guidance = 'Investigate why no submissions were received before proceeding to scoring.';
          }
          explanation = 'The submission window opens automatically after the dictation finishes and stays open for the configured period. Late submissions are accepted with a penalty (like points deducted for tardiness). The invigilator has collected all papers — now they go to marking.';
        }
      }

      // Scoring
      if (node.typeId.includes('competition-scoring')) {
        const scoring = output.ports['scoringSummary']?.data as Record<string, unknown> | undefined;
        if (scoring) {
          const avg = scoring['averageAutoScore'] as number ?? 0;
          const min = scoring['minAutoScore'] as number ?? 0;
          const max = scoring['maxAutoScore'] as number ?? 0;
          const low = scoring['lowConfidenceCount'] as number ?? 0;
          const total = scoring['autoScored'] as number ?? 0;
          summary = `Auto-scored ${total} submissions. Average: ${avg}/100 (range: ${min}–${max}).`;

          if (low > 0) {
            findings.push({
              label: 'Low-Confidence Scores',
              detail: `${low} submission(s) scored below 0.7 confidence. The NLP model is like a tutor saying "I\'m not entirely sure about my marking" — these should get priority review from human judges who can catch nuances the model might miss (unusual formatting, creative punctuation, dialectal spelling).`,
              severity: 'attention',
              metric: { label: 'Low Confidence', value: low, threshold: 0 },
            });
          }
          if (avg < 40) {
            findings.push({
              label: 'Low Average Score',
              detail: `Average of ${avg}/100 is quite low. This could mean the dictation was very difficult for this group, or there were systematic issues (audio quality, time pressure). Compare against previous rounds to calibrate.`,
              severity: 'warning',
              metric: { label: 'Avg Score', value: avg, unit: '/100', threshold: 40 },
            });
          } else if (avg > 90) {
            findings.push({
              label: 'Very High Average',
              detail: `Average of ${avg}/100 is exceptionally high. Great news for the participants! But verify the dictation difficulty was appropriate — if everyone aces it, the competition loses its differentiating power.`,
              severity: 'info',
              metric: { label: 'Avg Score', value: avg, unit: '/100' },
            });
          }
          if (min < 15 && total > 5) {
            findings.push({
              label: 'Potential Outlier',
              detail: `The lowest score is ${min}/100 — significantly below average. This could be a blank submission, a technical issue, or a participant who struggled. The human judges will verify.`,
              severity: 'attention',
              metric: { label: 'Min Score', value: min, unit: '/100' },
            });
          }

          explanation = 'Auto-scoring uses NLP (natural language processing) to compare each submission word-by-word against the reference text. It checks four dimensions: spelling (orthographe), grammar (grammaire), accents, and punctuation — weighted 40/30/15/15 by default. The confidence score tells you how certain the model is. Think of it as a very thorough but slightly robotic first pass before the human judges refine the scores.';
          if (!scoring['finalised']) {
            guidance = 'Auto-scoring is complete — this is the "machine marking" stage. Human judges will now review and refine these scores. Once all judges finish, resume the workflow to calculate final aggregated results.';
          }
        }
      }

      // Judging Review (paused state is handled generically, but we add domain-specific context if output data exists)
      if (node.typeId.includes('judging-review')) {
        const pauseMeta = output.ports['__paused']?.data as Record<string, unknown> | undefined;
        if (pauseMeta) {
          const meta = pauseMeta['__pauseMetadata'] as Record<string, unknown> | undefined;
          const count = meta?.['submissionCount'] as number ?? 0;
          const judges = meta?.['judgesPerSubmission'] as number ?? 2;
          summary = `Judging in progress: ${count} submissions, ${judges} judges each.`;
          explanation = `Each submission is assigned to ${judges} independent judges — like having two examiners mark the same paper. This catches errors and ensures fairness. When judges disagree beyond a threshold, a third judge or median rule resolves the difference. The workflow stays paused until all judges submit their scores.`;
          guidance = `${count} submissions are waiting for judges. Monitor judging progress in the judging dashboard. Once all judges have submitted scores, click Resume to aggregate results and proceed to publication.`;
        }
      }

      // Results Publication
      if (node.typeId.includes('results-publication')) {
        const pub = output.ports['publicationSummary']?.data as Record<string, unknown> | undefined;
        if (pub) {
          const winner = pub['winner'] as Record<string, unknown> | undefined;
          const certs = pub['certificatesGenerated'] as number ?? 0;
          const notifs = pub['notificationsSent'] as number ?? 0;
          summary = winner
            ? `🏆 Results published! Winner: ${winner['displayName']} with ${winner['totalScore']}/100.`
            : 'Results published successfully.';
          if (certs === 0) {
            findings.push({ label: 'No Certificates Generated', detail: 'Certificate generation was disabled or failed. Participants won\'t receive downloadable certificates. You can re-run this node with generateCertificates enabled if needed.', severity: 'attention' });
          }
          if (notifs === 0) {
            findings.push({ label: 'No Notifications Sent', detail: 'Participant notifications were skipped. Consider announcing results manually through your communication channels.', severity: 'attention' });
          }
          if (pub['leaderboardUrl']) {
            findings.push({ label: 'Leaderboard Live', detail: `The public leaderboard is now live at the published URL. Share it with participants and audiences.`, severity: 'info' });
          }
          explanation = 'Results publication is the awards ceremony. Rankings are calculated overall and per age category. Tiebreakers use error severity — between two equal scores, the one with fewer major errors wins (a wrong word is worse than a missing accent). Certificates are generated as PDFs and participants are notified via their preferred channel.';
        }
      }
    }

    // ── Migration Domain ──────────────────────────────────────────────

    if (domain === 'migration') {

      if (node.typeId.includes('platform-export')) {
        const content = output.ports['content']?.data;
        if (Array.isArray(content)) {
          summary = `Extracted ${content.length} content items from source platform.`;
          if (content.length === 0) {
            findings.push({ label: 'Empty Export', detail: 'No content was extracted. This is like opening a moving truck and finding it empty — verify the API credentials, site URL, and that the source platform has accessible content.', severity: 'critical' });
            guidance = 'Check the platform export configuration: API key, site URL, and content type filters. The source platform may also have rate limits or permissions that block the export.';
          }
          explanation = 'The platform export node pulls content from the source — pages, products, blog posts, media files. Think of it as photographing every room before a house renovation. This snapshot becomes the basis for transformation and import into the new platform.';
        }
      }

      if (node.typeId.includes('content-transform')) {
        const items = output.ports['items']?.data;
        if (Array.isArray(items)) {
          summary = `Transformed ${items.length} content items for the target platform.`;
          explanation = 'Content transformation adapts the source content to fit the target platform\'s format — like translating a book from one language to another while preserving the meaning. URLs are remapped, images are re-referenced, and metadata is restructured.';
        }
      }

      if (node.typeId.includes('service-import')) {
        const result = output.ports['importResult']?.data as Record<string, unknown> | undefined;
        if (result) {
          const imported = result['importedCount'] as number ?? 0;
          const failed = result['failedCount'] as number ?? 0;
          summary = `Imported ${imported} items${failed > 0 ? ` (${failed} failed)` : ''}.`;
          if (failed > 0 && imported > 0 && failed / imported > 0.1) {
            findings.push({ label: 'Import Failures', detail: `${((failed / (imported + failed)) * 100).toFixed(0)}% of items failed to import. Review the failed items for patterns — common causes are missing media files, unsupported content types, or duplicate slugs.`, severity: 'warning', metric: { label: 'Failed', value: failed, threshold: 0 } });
          }
          explanation = 'The service import writes transformed content into the target platform. Each item is created via the platform\'s API. Failures are logged individually so you can fix and retry specific items without re-running the entire migration.';
        }
      }

      if (node.typeId.includes('infrastructure-cutover')) {
        const result = output.ports['cutoverResult']?.data as Record<string, unknown> | undefined;
        if (result) {
          const status = String(result['status'] ?? 'unknown');
          summary = `Cutover: ${status}.`;
          if (status === 'active') {
            findings.push({ label: 'Cutover Active', detail: 'DNS and traffic are now pointing to the new platform. The old site is no longer serving visitors. This is the "flipping the switch" moment.', severity: 'info' });
            guidance = 'The cutover is live. Monitor health checks closely for the next 30 minutes. If anything is wrong, the cutover can be rolled back to restore the original site.';
          }
          explanation = 'Infrastructure cutover switches the live traffic from the old platform to the new one — like redirecting a river to flow through the newly built channel. DNS updates propagate gradually (5–60 minutes worldwide), so there\'s a brief period where some visitors see the old site and some see the new one.';
        }
      }

      if (node.typeId.includes('health-monitor')) {
        const report = output.ports['healthReport']?.data as Record<string, unknown> | undefined;
        if (report) {
          const status = String(report['status'] ?? 'unknown');
          summary = `Health check: ${status}.`;
          if (status === 'unhealthy') {
            findings.push({ label: 'Unhealthy Site', detail: 'One or more health checks failed. The migrated site may not be fully operational — like a building that passed most inspections but failed the fire safety check. Investigate immediately.', severity: 'critical' });
            guidance = 'Check which specific health checks failed (DNS, SSL, HTTP, content). If DNS hasn\'t propagated yet, wait 5–10 minutes and retry. If SSL failed, check certificate provisioning. The cutover can be rolled back if needed.';
          } else if (status === 'degraded') {
            findings.push({ label: 'Degraded Health', detail: 'Some checks returned warnings — the site works but may need attention. Like a car that runs but has a dashboard warning light. Usually this resolves itself (DNS propagation, SSL warm-up) but monitor closely.', severity: 'warning' });
          } else if (status === 'healthy') {
            findings.push({ label: 'All Checks Passing', detail: 'DNS, SSL, HTTP, and content checks all pass. The migrated site is fully operational. 🎉', severity: 'info' });
          }
          explanation = 'Health monitoring runs four types of checks: DNS (can the domain be resolved?), SSL (is the certificate valid?), HTTP (does the site respond?), and content (are key pages and assets accessible?). Healthy means everything passes. Degraded means warnings but functional. Unhealthy means something needs fixing.';
        }
      }
    }

    return { findings, summary, guidance, explanation };
  }

  // ── Progress Report ─────────────────────────────────────────────────

  private buildProgressReport(runState: ExtendedRunState, nodes: WorkflowNodeInfo[]): ProgressReport {
    const total = nodes.length;
    const states = nodes.map(n => runState.nodeStates[n.nodeId] ?? 'pending');
    const completed = states.filter(s => s === 'completed').length;
    const running = states.filter(s => s === 'running').length;
    const paused = states.filter(s => s === 'paused').length;
    const failed = states.filter(s => s === 'failed').length;

    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    let currentPhase = 'Initialising';
    let liveStatus = 'Preparing to execute';

    if (runState.status === 'completed') {
      currentPhase = 'Complete';
      liveStatus = 'All nodes finished successfully — the full pipeline has run.';
    } else if (runState.status === 'failed') {
      currentPhase = 'Failed';
      const failedNode = nodes.find(n => runState.nodeStates[n.nodeId] === 'failed');
      liveStatus = `Stopped at "${failedNode?.label ?? 'unknown node'}". Fix the issue and retry.`;
    } else if (paused > 0) {
      const pausedNode = nodes.find(n => runState.nodeStates[n.nodeId] === 'paused');
      currentPhase = 'Paused — Human Input Required';
      liveStatus = pausedNode
        ? `Waiting at "${pausedNode.label}". Complete the required action and click Resume.`
        : 'Waiting for human input.';
    } else if (running > 0) {
      const runningNode = nodes.find(n => runState.nodeStates[n.nodeId] === 'running');
      currentPhase = 'Executing';
      liveStatus = runningNode ? `Running "${runningNode.label}"...` : 'Processing...';
    }

    // Estimate remaining time
    let estimatedRemainingMs: number | null = null;
    if (runState.nodeOutputs && completed > 0) {
      const remaining = total - completed - failed;
      if (remaining > 0) {
        const durations = Object.values(runState.nodeOutputs).map(o => o.durationMs);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        estimatedRemainingMs = Math.round(avgDuration * remaining);
      }
    }

    const milestones = nodes.map(n => ({
      label: n.label,
      completed: runState.nodeStates[n.nodeId] === 'completed',
      nodeId: n.nodeId,
    }));

    return { percentComplete, currentPhase, liveStatus, estimatedRemainingMs, milestones };
  }

  // ── Run Narrative ───────────────────────────────────────────────────

  private buildRunNarrative(
    runState: ExtendedRunState,
    nodes: WorkflowNodeInfo[],
    insights: Map<string, NodeOutputInsight>,
    domain: string,
  ): string {
    const total = nodes.length;
    const completed = Object.values(runState.nodeStates).filter(s => s === 'completed').length;
    const failed = Object.values(runState.nodeStates).filter(s => s === 'failed').length;
    const duration = (runState.durationMs / 1000).toFixed(1);
    const parts: string[] = [];

    if (runState.status === 'completed') {
      parts.push(`Workflow completed successfully in ${duration}s — all ${total} nodes executed.`);
    } else if (runState.status === 'failed') {
      parts.push(`Workflow failed after ${duration}s. ${completed} of ${total} nodes completed before the failure.`);
    } else if (runState.status === 'paused') {
      parts.push(`Workflow paused at ${completed} of ${total} nodes (${Math.round((completed / total) * 100)}%).`);
    } else if (runState.status === 'running') {
      parts.push(`Workflow running — ${completed} of ${total} nodes complete so far.`);
    }

    const allFindings = Array.from(insights.values()).flatMap(i => i.findings);
    const criticals = allFindings.filter(f => f.severity === 'critical');
    const warnings = allFindings.filter(f => f.severity === 'warning');
    if (criticals.length > 0) parts.push(`⚠ ${criticals.length} critical issue(s) need immediate attention.`);
    if (warnings.length > 0) parts.push(`${warnings.length} warning(s) to review when ready.`);

    // Domain-specific headline
    if (domain === 'competition') {
      const resultsInsight = Array.from(insights.values()).find(i => i.summary.includes('Winner') || i.summary.includes('🏆'));
      if (resultsInsight) parts.push(resultsInsight.summary);
      else {
        const scoringInsight = Array.from(insights.values()).find(i => i.summary.includes('Auto-scored'));
        if (scoringInsight) parts.push(scoringInsight.summary);
      }
    } else if (domain === 'migration') {
      const healthInsight = Array.from(insights.values()).find(i => i.summary.includes('Health check'));
      if (healthInsight) parts.push(healthInsight.summary);
    }

    return parts.join(' ');
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private detectDomain(tags: string[]): string {
    if (tags.some(t => ['competition', 'dictation', 'dicta-dor'].includes(t))) return 'competition';
    if (tags.some(t => t === 'migration')) return 'migration';
    if (tags.some(t => ['analytics', 'education', 'report'].includes(t))) return 'analytics';
    return 'generic';
  }

  private buildAIContext(
    runState: ExtendedRunState,
    nodes: WorkflowNodeInfo[],
    tags: string[],
    localAnalysis: OutputInsightBundle,
  ): Record<string, unknown> {
    return {
      domain: this.detectDomain(tags),
      tags, status: runState.status, durationMs: runState.durationMs,
      nodeCount: nodes.length,
      completedCount: Object.values(runState.nodeStates).filter(s => s === 'completed').length,
      failedCount: Object.values(runState.nodeStates).filter(s => s === 'failed').length,
      localNarrative: localAnalysis.runNarrative,
      localHealth: localAnalysis.runHealth,
      findings: Array.from(localAnalysis.nodeInsights.values())
        .flatMap(i => i.findings)
        .map(f => ({ label: f.label, severity: f.severity, detail: f.detail })),
      nextSteps: localAnalysis.nextSteps.map(s => s.detail),
    };
  }
}


// ============================================================================
// §11 — INSIGHT DISPLAY COMPONENTS
// ============================================================================

interface NodeInsightCardProps { insight: NodeOutputInsight }

export const NodeInsightCard: React.FC<NodeInsightCardProps> = ({ insight }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const healthColors = { healthy: '#66BB6A', attention: '#FFB74D', warning: '#FF9800', critical: '#EF5350' };
  const healthGlyphs = { healthy: '✓', attention: '◉', warning: '⚠', critical: '✕' };
  const color = healthColors[insight.health];

  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: `${color}06`, border: `1px solid ${color}20` }}>
      {/* Summary */}
      <div style={{ fontSize: 12, color: '#D0D8E0', marginBottom: insight.findings.length > 0 ? 8 : 0 }}>
        <span style={{ color, fontWeight: 600, marginRight: 6 }}>{healthGlyphs[insight.health]}</span>
        {insight.summary}
      </div>

      {/* Findings */}
      {insight.findings.map((f, i) => {
        const fc = { info: '#5A7A90', attention: '#FFB74D', warning: '#FF9800', critical: '#EF5350' }[f.severity];
        const fg = { info: 'ℹ', attention: '◉', warning: '⚠', critical: '✕' }[f.severity];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, padding: '4px 8px', borderRadius: 4, background: `${fc}08` }}>
            <span style={{ color: fc, fontSize: 10, flexShrink: 0, marginTop: 2 }}>{fg}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: fc }}>{f.label}</span>
              {f.metric && <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#8BA4B8' }}>{f.metric.value}{f.metric.unit ?? ''}</span>}
              <div style={{ fontSize: 10, color: '#8BA4B8', marginTop: 2, lineHeight: 1.4 }}>{f.detail}</div>
            </div>
          </div>
        );
      })}

      {/* Guidance */}
      {insight.guidance && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(77,166,255,0.06)', border: '1px solid rgba(77,166,255,0.15)', fontSize: 11, color: '#8BB8D0', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: '#4DA6FF', marginRight: 4 }}>→</span>{insight.guidance}
        </div>
      )}

      {/* Explanation toggle */}
      {insight.explanation && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setShowExplanation(p => !p)} style={{ background: 'none', border: 'none', color: '#5A7A90', cursor: 'pointer', fontSize: 10, padding: 0, textDecoration: 'underline' }}>
            {showExplanation ? 'Hide explanation ▲' : 'Why does this matter? ▼'}
          </button>
          {showExplanation && (
            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 4, background: '#0F1923', fontSize: 11, color: '#8BA4B8', lineHeight: 1.5, borderLeft: '2px solid #253545' }}>
              {insight.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Progress Bar ────────────────────────────────────────────────────────

export const ProgressBar: React.FC<{ report: ProgressReport }> = ({ report }) => {
  const color = report.currentPhase.includes('Paused') ? '#AB47BC'
    : report.currentPhase.includes('Failed') ? '#EF5350'
    : report.currentPhase === 'Complete' ? '#66BB6A'
    : '#4DA6FF';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{report.currentPhase}</span>
        <span style={{ fontSize: 11, color: '#5A7A90' }}>{report.percentComplete}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#1A2D3D', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${report.percentComplete}%`, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: '#8BA4B8', marginTop: 6 }}>{report.liveStatus}</div>
      {report.estimatedRemainingMs !== null && report.estimatedRemainingMs > 0 && (
        <div style={{ fontSize: 10, color: '#5A7A90', marginTop: 2 }}>Estimated remaining: ~{(report.estimatedRemainingMs / 1000).toFixed(0)}s</div>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {report.milestones.map(m => (
          <span key={m.nodeId} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: m.completed ? 'rgba(102,187,106,0.1)' : 'rgba(90,122,144,0.1)',
            color: m.completed ? '#66BB6A' : '#5A7A90',
            border: `1px solid ${m.completed ? 'rgba(102,187,106,0.2)' : 'rgba(90,122,144,0.2)'}`,
          }}>
            {m.completed ? '✓' : '○'} {m.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Next Steps Panel ────────────────────────────────────────────────────

export const NextStepsPanel: React.FC<{ steps: NextStep[]; onAction?: (step: NextStep) => void }> = ({ steps, onAction }) => {
  if (steps.length === 0) return null;
  const priorityColors = { immediate: '#EF5350', soon: '#FF9800', when_ready: '#4DA6FF' };
  const priorityLabels = { immediate: 'DO NOW', soon: 'SOON', when_ready: 'WHEN READY' };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5A7A90', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 }}>What To Do Next</div>
      {steps.map((step, i) => {
        const c = priorityColors[step.priority];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', marginBottom: 4, borderRadius: 6, background: `${c}06`, border: `1px solid ${c}15` }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: c, padding: '2px 4px', borderRadius: 2, background: `${c}15`, whiteSpace: 'nowrap', marginTop: 2 }}>{priorityLabels[step.priority]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#D0D8E0' }}>{step.label}</div>
              <div style={{ fontSize: 11, color: '#8BA4B8', marginTop: 2 }}>{step.detail}</div>
            </div>
            {step.actionable && onAction && (
              <button onClick={() => onAction(step)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: `${c}15`, border: `1px solid ${c}30`, color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {step.actionType === 'resume' ? '▶ Resume' : step.actionType === 'retry' ? '↻ Retry' : 'View'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};


// ============================================================================
// §12 — CANVAS INTEGRATION HOOK
// ============================================================================
//
// Convenience factory for the main canvas component.
//
// Usage in sr-canvas-production.tsx:
//
//   const outputAI = useRef(createOutputIntelligence(apiConfig));
//   const insights = useMemo(
//     () => runState ? outputAI.current.analyse(runState, nodeInfos, tags) : null,
//     [runState, nodeInfos, tags],
//   );
//
//   // In the right panel:
//   {insight && <NodeInsightCard insight={insight} />}
//
//   // In the results dashboard:
//   {insights && <ProgressBar report={insights.progressReport} />}
//   {insights && <NextStepsPanel steps={insights.nextSteps} onAction={handleAction} />}

export function createOutputIntelligence(
  apiConfig?: { baseUrl: string; authToken?: string },
): OutputIntelligence {
  return new OutputIntelligence(apiConfig);
}
