'use client';
/**
 * MathCanvasSpreadsheetPanel — Session 6: Spreadsheet View
 *
 * GeoGebra has a dedicated Spreadsheet view in their Calculator Suite where
 * students enter data in cells, build lists, and feed them directly into
 * charts and statistics. This panel is Scholarly's equivalent — but wired
 * natively into MathCanvas Stats mode so every dataset the student enters
 * is immediately available as a visualise() prompt.
 *
 * Architecture principle: the spreadsheet is a data-entry layer, not a
 * computation engine. The student enters raw data here; the Scholarly AI
 * (MathCanvas Stats mode) does the analytical heavy lifting. Think of it
 * as the difference between a clipboard and a calculator: the clipboard
 * holds numbers, the calculator interprets them. The student hands the
 * clipboard to the AI.
 *
 * Two-column layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ Dataset name  [My Data ▾]  [+ New] [⬇ CSV]  │
 *   ├─────────────────────────────────────────────┤
 *   │  #  │  X (Label)   │  Y (Value)             │
 *   ├─────┼──────────────┼───────────────────────┤
 *   │  1  │ Monday       │ 42                     │
 *   │  2  │ Tuesday      │ 38                     │
 *   │  3  │  …           │  …                     │
 *   │  +  │  [add row]                            │
 *   ├─────────────────────────────────────────────┤
 *   │ Summary: n=5  mean=40.2  sd=3.1  min=35     │
 *   ├─────────────────────────────────────────────┤
 *   │ [📊 Analyse with Stats AI]                  │
 *   └─────────────────────────────────────────────┘
 *
 * The "Analyse with Stats AI" button calls the parent's onAnalyse callback
 * with a pre-formatted prompt describing the dataset. The Stats mode
 * buildStatsSystemPrompt() then picks it up exactly as if the student had
 * typed "analyse this data: [42, 38, ...]" in the prompt bar.
 *
 * Data persistence: dataset state lives in component state (session-local).
 * It survives mode switches (MathCanvasPage keeps the panel mounted) but
 * not page reloads — consistent with annotation overlay behaviour.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Download, BarChart2, RefreshCw,
  ChevronDown, ChevronUp, Table2,
} from 'lucide-react';

// ─── Design tokens (mirrors MathCanvasPage.tsx LIGHT palette) ────────────────
const T = {
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#93c5fd',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  vio: '#8b5cf6', vioLt: '#f5f3ff', vioMid: '#ddd6fe',
  red: '#dc2626', redLt: '#fef2f2',
  ink: '#0f1419', muted: '#6b7280', muted2: '#9ca3af',
  border: '#e1eaef', border2: '#c5d8e4',
  bg: '#f7f8f8', sf: '#ffffff',
  fs: "'Open Sans', system-ui, sans-serif" as const,
  fm: "'JetBrains Mono', Menlo, monospace" as const,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpreadsheetRow {
  id: string;
  label: string;  // X column — categorical label or x-value
  value: string;  // Y column — numeric value (string so partial input works)
}

export interface SpreadsheetDataset {
  id: string;
  name: string;
  rows: SpreadsheetRow[];
  xHeader: string;
  yHeader: string;
}

function makeRow(label = '', value = ''): SpreadsheetRow {
  return { id: crypto.randomUUID(), label, value };
}

function makeDataset(name = 'Dataset 1'): SpreadsheetDataset {
  return {
    id: crypto.randomUUID(),
    name,
    xHeader: 'Label',
    yHeader: 'Value',
    rows: [
      makeRow('Group A', ''),
      makeRow('Group B', ''),
      makeRow('Group C', ''),
      makeRow('', ''),
    ],
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SpreadsheetPanelProps {
  /** Called when student clicks "Analyse with Stats AI" */
  onAnalyse: (prompt: string, numericData: number[]) => void;
}

// ─── Summary stats (pure math, no lib needed) ─────────────────────────────────

function computeSummary(values: number[]) {
  if (values.length === 0) return null;
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  return { n, mean, sd, min, max, median, sum };
}

function fmt(n: number, dp = 2): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(dp);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MathCanvasSpreadsheetPanel({ onAnalyse }: SpreadsheetPanelProps) {
  const [datasets, setDatasets] = useState<SpreadsheetDataset[]>([makeDataset()]);
  const [activeId, setActiveId] = useState<string>(datasets[0].id);
  const [showDatasetMenu, setShowDatasetMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = datasets.find(d => d.id === activeId) ?? datasets[0];

  // Close dataset dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDatasetMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  const updateDataset = useCallback((patch: Partial<SpreadsheetDataset>) => {
    setDatasets(prev => prev.map(d => d.id === activeId ? { ...d, ...patch } : d));
  }, [activeId]);

  const updateRow = useCallback((rowId: string, patch: Partial<SpreadsheetRow>) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== activeId) return d;
      return { ...d, rows: d.rows.map(r => r.id === rowId ? { ...r, ...patch } : r) };
    }));
  }, [activeId]);

  const addRow = useCallback(() => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== activeId) return d;
      return { ...d, rows: [...d.rows, makeRow()] };
    }));
  }, [activeId]);

  const deleteRow = useCallback((rowId: string) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== activeId) return d;
      const next = d.rows.filter(r => r.id !== rowId);
      return { ...d, rows: next.length ? next : [makeRow()] };
    }));
  }, [activeId]);

  const addDataset = useCallback(() => {
    const ds = makeDataset(`Dataset ${datasets.length + 1}`);
    setDatasets(prev => [...prev, ds]);
    setActiveId(ds.id);
    setShowDatasetMenu(false);
  }, [datasets.length]);

  const deleteDataset = useCallback((id: string) => {
    setDatasets(prev => {
      const next = prev.filter(d => d.id !== id);
      if (next.length === 0) {
        const fresh = makeDataset();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
    setShowDatasetMenu(false);
  }, [activeId]);

  const clearDataset = useCallback(() => {
    updateDataset({ rows: [makeRow(), makeRow(), makeRow(), makeRow()] });
  }, [updateDataset]);

  // ── Derive numeric values ──────────────────────────────────────────────────
  const numericRows = active.rows.filter(r => r.value.trim() !== '' && !isNaN(parseFloat(r.value)));
  const numericValues = numericRows.map(r => parseFloat(r.value));
  const summary = computeSummary(numericValues);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = `${active.xHeader},${active.yHeader}`;
    const rows = active.rows
      .filter(r => r.label.trim() || r.value.trim())
      .map(r => `"${r.label.replace(/"/g, '""')}",${r.value}`)
      .join('\n');
    const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${active.name}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Build Stats AI prompt ──────────────────────────────────────────────────
  const buildPrompt = (): string => {
    const labelled = numericRows.filter(r => r.label.trim());
    const unlabelled = numericRows.filter(r => !r.label.trim());

    let prompt = `Analyse this dataset: "${active.name}". `;

    if (labelled.length > 0) {
      const pairs = labelled.map(r => `${r.label}=${r.value}`).join(', ');
      prompt += `Data (${active.xHeader} → ${active.yHeader}): ${pairs}. `;
    } else {
      prompt += `Values: ${numericValues.join(', ')}. `;
    }

    if (summary) {
      prompt += `(n=${summary.n}, mean=${fmt(summary.mean)}, sd=${fmt(summary.sd)}, `;
      prompt += `min=${fmt(summary.min)}, max=${fmt(summary.max)}, median=${fmt(summary.median)}) `;
    }

    prompt += 'Show distribution, key statistics, and any notable patterns.';
    return prompt;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      fontFamily: T.fs, gap: 0, overflow: 'hidden',
    }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', borderBottom: `1px solid ${T.border}`,
        background: T.sf, flexShrink: 0, flexWrap: 'wrap',
      }}>

        {/* Dataset selector */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDatasetMenu(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.bg,
              fontSize: 12, fontWeight: 600, color: T.ink, cursor: 'pointer',
              maxWidth: 130, overflow: 'hidden',
            }}
          >
            <Table2 size={12} style={{ color: T.em, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.name}
            </span>
            {showDatasetMenu ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {showDatasetMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: T.sf, border: `1px solid ${T.border}`,
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              minWidth: 160, marginTop: 2,
            }}>
              {datasets.map(ds => (
                <div
                  key={ds.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px',
                    background: ds.id === activeId ? T.emLt : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setActiveId(ds.id); setShowDatasetMenu(false); }}
                >
                  <span style={{ flex: 1, fontSize: 12, color: T.ink }}>{ds.name}</span>
                  {datasets.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteDataset(ds.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={10} style={{ color: T.muted }} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, padding: '4px 6px' }}>
                <button
                  onClick={addDataset}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 4px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 11, color: T.bl,
                  }}
                >
                  <Plus size={11} /> New dataset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Clear */}
        <button
          title="Clear all rows"
          onClick={clearDataset}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <RefreshCw size={13} style={{ color: T.muted }} />
        </button>

        {/* Export CSV */}
        <button
          title="Export CSV"
          onClick={exportCSV}
          disabled={numericValues.length === 0}
          style={{
            background: 'none', border: 'none', cursor: numericValues.length > 0 ? 'pointer' : 'default',
            padding: 4, display: 'flex', alignItems: 'center',
            opacity: numericValues.length > 0 ? 1 : 0.35,
          }}
        >
          <Download size={13} style={{ color: T.muted }} />
        </button>
      </div>

      {/* ── Column headers ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px',
        background: T.bg, borderBottom: `1px solid ${T.border2}`,
        flexShrink: 0,
      }}>
        <div style={{ padding: '5px 4px', fontSize: 10, color: T.muted, textAlign: 'center' }}>#</div>
        {/* Editable X header */}
        <input
          value={active.xHeader}
          onChange={e => updateDataset({ xHeader: e.target.value })}
          style={{
            padding: '5px 8px', fontSize: 10, fontWeight: 700,
            color: T.muted, background: 'transparent', border: 'none',
            outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em',
            cursor: 'text',
          }}
        />
        {/* Editable Y header */}
        <input
          value={active.yHeader}
          onChange={e => updateDataset({ yHeader: e.target.value })}
          style={{
            padding: '5px 8px', fontSize: 10, fontWeight: 700,
            color: T.muted, background: 'transparent', border: 'none',
            outline: 'none', textTransform: 'uppercase', letterSpacing: '0.05em',
            cursor: 'text', borderLeft: `1px solid ${T.border}`,
          }}
        />
        <div />
      </div>

      {/* ── Rows ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active.rows.map((row, idx) => (
          <SpreadsheetRowView
            key={row.id}
            row={row}
            index={idx + 1}
            onChange={patch => updateRow(row.id, patch)}
            onDelete={() => deleteRow(row.id)}
            onEnter={addRow}
            isEven={idx % 2 === 0}
          />
        ))}

        {/* Add row button */}
        <button
          onClick={addRow}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', background: 'none',
            border: 'none', borderTop: `1px solid ${T.border}`,
            cursor: 'pointer', fontSize: 11, color: T.bl,
            justifyContent: 'center',
          }}
        >
          <Plus size={11} /> Add row
        </button>
      </div>

      {/* ── Summary ── */}
      {summary && (
        <div style={{
          borderTop: `1px solid ${T.border}`, flexShrink: 0,
          background: T.bg,
        }}>
          <button
            onClick={() => setShowSummary(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: 'none', border: 'none',
              cursor: 'pointer', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Summary — {summary.n} values
            </span>
            {showSummary ? <ChevronUp size={10} style={{ color: T.muted }} /> : <ChevronDown size={10} style={{ color: T.muted }} />}
          </button>

          {showSummary && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1, padding: '0 8px 8px', 
            }}>
              {[
                { label: 'n', value: summary.n },
                { label: 'Mean', value: fmt(summary.mean) },
                { label: 'SD', value: fmt(summary.sd) },
                { label: 'Min', value: fmt(summary.min) },
                { label: 'Median', value: fmt(summary.median) },
                { label: 'Max', value: fmt(summary.max) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 6px', borderRadius: 6, background: T.sf,
                  border: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: T.fm }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Analyse button ── */}
      <div style={{
        padding: '8px 10px', borderTop: `1px solid ${T.border}`,
        background: T.sf, flexShrink: 0,
      }}>
        <button
          onClick={() => numericValues.length > 0 && onAnalyse(buildPrompt(), numericValues)}
          disabled={numericValues.length < 2}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, padding: '9px 12px', borderRadius: 8,
            background: numericValues.length >= 2 ? T.em : T.border,
            color: numericValues.length >= 2 ? '#fff' : T.muted,
            border: 'none', cursor: numericValues.length >= 2 ? 'pointer' : 'default',
            fontSize: 12, fontWeight: 700,
            transition: 'background 0.15s',
          }}
        >
          <BarChart2 size={14} />
          {numericValues.length < 2
            ? 'Enter at least 2 values to analyse'
            : `Analyse "${active.name}" with Stats AI`}
        </button>
        {numericValues.length >= 2 && (
          <p style={{ margin: '5px 0 0', fontSize: 10, color: T.muted, textAlign: 'center', lineHeight: 1.4 }}>
            Sends {numericValues.length} values to Statistics mode
          </p>
        )}
      </div>

    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function SpreadsheetRowView({
  row, index, onChange, onDelete, onEnter, isEven,
}: {
  row: SpreadsheetRow;
  index: number;
  onChange: (patch: Partial<SpreadsheetRow>) => void;
  onDelete: () => void;
  onEnter: () => void;
  isEven: boolean;
}) {
  const isNumeric = row.value.trim() !== '' && !isNaN(parseFloat(row.value));
  const isBadValue = row.value.trim() !== '' && !isNumeric;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px',
      background: isEven ? T.sf : T.bg,
      borderBottom: `1px solid ${T.border}`,
      alignItems: 'center',
    }}>
      {/* Row number */}
      <div style={{ padding: '4px', textAlign: 'center', fontSize: 10, color: T.muted2 }}>
        {index}
      </div>

      {/* Label cell */}
      <input
        value={row.label}
        onChange={e => onChange({ label: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && onEnter()}
        placeholder="—"
        style={{
          padding: '5px 8px', fontSize: 12, color: T.ink,
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: T.fs,
        }}
      />

      {/* Value cell */}
      <input
        value={row.value}
        onChange={e => onChange({ value: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && onEnter()}
        placeholder="0"
        inputMode="numeric"
        style={{
          padding: '5px 8px', fontSize: 12,
          color: isBadValue ? T.red : isNumeric ? T.ink : T.muted,
          background: 'transparent',
          border: 'none',
          borderLeft: `1px solid ${T.border}`,
          outline: 'none',
          fontFamily: T.fm,
        }}
      />

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.4,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
      >
        <Trash2 size={11} style={{ color: T.red }} />
      </button>
    </div>
  );
}
