/**
 * ============================================================================
 * S&R Canvas: D3 Data Visualisation Bridge
 * ============================================================================
 *
 * The lens on the telescope. The output rendering system captures and
 * displays raw data; this module transforms that data into visual
 * understanding using D3.js.
 *
 * We do NOT build a fixed set of charts. We build a BRIDGE to the
 * entire D3 ecosystem:
 *
 *   1. CHART REGISTRY — register any D3 visualisation once, use it
 *      everywhere in the canvas (node outputs, dashboards, domain views).
 *
 *   2. BUNDLED LIBRARY — common chart types ship ready-to-use (bar,
 *      line, donut, histogram, gauge, sparkline, heatmap).
 *
 *   3. USER IMPORT SYSTEM — operators import additional D3 vis from
 *      npm, Observable notebooks, or custom code with one call.
 *
 * D3 + REACT PATTERN: D3 handles maths (scales, arcs, layouts), React
 * handles DOM (SVG elements). For axes/transitions that MUST use D3
 * DOM manipulation, we use useRef + useEffect.
 *
 * @module scholarly/sr/canvas/dataviz
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';

// Types from the output rendering system
// In production these are imports; here we re-declare the shapes needed.
interface PortOutput { portId: string; label: string; dataType: string; data: unknown; sizeBytes?: number }
interface NodeOutputData { ports: Record<string, PortOutput>; completedAt: number; durationMs: number; error?: string }


// ============================================================================
// §1 — CANVAS THEME & COLOUR PALETTES
// ============================================================================

export const CANVAS_THEME = {
  background: '#0F1923',
  surface: '#162230',
  border: '#253545',
  gridline: '#1A2D3D',
  text: {
    primary: '#E8ECF0',
    secondary: '#8BA4B8',
    muted: '#5A7A90',
    accent: '#4DA6FF',
  },
  font: {
    family: "'IBM Plex Mono', 'Menlo', monospace",
    sansFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    size: { xs: 9, sm: 10, md: 11, lg: 13, xl: 16 },
  },
} as const;

export const PALETTES = {
  default: ['#4DA6FF', '#66BB6A', '#FFB74D', '#AB47BC', '#EF5350', '#26C6DA', '#FF7043', '#9CCC65'],
  health: ['#66BB6A', '#A5D6A7', '#FFE082', '#FFB74D', '#FF9800', '#EF5350'],
  score: ['#EF5350', '#FF9800', '#FFB74D', '#FFE082', '#A5D6A7', '#66BB6A'],
  mono: ['#0D3B66', '#1A5276', '#2980B9', '#4DA6FF', '#7EC8E3', '#AED9E0'],
  diverging: ['#4DA6FF', '#89C4F4', '#BDC3C7', '#E8A87C', '#EF5350'],
  competition: ['#FFD700', '#C0C0C0', '#CD7F32', '#8BA4B8', '#5A7A90'],
} as const;

export type PaletteName = keyof typeof PALETTES;

export function paletteColor(palette: PaletteName, index: number): string {
  const p = PALETTES[palette];
  return p[index % p.length]!;
}


// ============================================================================
// §2 — CHART REGISTRY
// ============================================================================

export interface ChartComponentProps<TData = unknown> {
  data: TData;
  width: number;
  height: number;
  palette?: PaletteName;
  config?: Record<string, unknown>;
  compact?: boolean;
  title?: string;
}

export interface ChartRegistration {
  id: string;
  label: string;
  description: string;
  category: 'distribution' | 'comparison' | 'composition' | 'relationship' | 'trend' | 'indicator' | 'spatial' | 'custom';
  icon: string;
  /** Returns true if this chart can render the given data shape. */
  canRender: (data: unknown) => boolean;
  /** Higher = preferred when multiple charts match. Builtins: 50, user: 100. */
  priority: number;
  Component: React.FC<ChartComponentProps<any>>;
  source: 'builtin' | 'user';
}

const chartRegistry: Map<string, ChartRegistration> = new Map();

export function registerChart(reg: ChartRegistration): void { chartRegistry.set(reg.id, reg); }
export function unregisterChart(id: string): boolean { return chartRegistry.delete(id); }
export function getChart(id: string): ChartRegistration | undefined { return chartRegistry.get(id); }
export function getAllCharts(): ChartRegistration[] { return Array.from(chartRegistry.values()); }

export function getCompatibleCharts(data: unknown): ChartRegistration[] {
  return Array.from(chartRegistry.values())
    .filter(c => c.canRender(data))
    .sort((a, b) => b.priority - a.priority);
}

export function getBestChart(data: unknown): ChartRegistration | null {
  return getCompatibleCharts(data)[0] ?? null;
}

export function getChartsByCategory(cat: ChartRegistration['category']): ChartRegistration[] {
  return Array.from(chartRegistry.values()).filter(c => c.category === cat);
}

export function listCharts(): Array<{ id: string; label: string; category: string; source: string }> {
  return Array.from(chartRegistry.values()).map(c => ({ id: c.id, label: c.label, category: c.category, source: c.source }));
}


// ============================================================================
// §3 — D3 HELPER UTILITIES
// ============================================================================

export const MARGINS = {
  full: { top: 24, right: 16, bottom: 32, left: 48 },
  compact: { top: 12, right: 8, bottom: 20, left: 32 },
  sparkline: { top: 2, right: 2, bottom: 2, left: 2 },
} as const;

export function createLinearScale(domain: [number, number], range: [number, number], nice = true): d3.ScaleLinear<number, number> {
  const s = d3.scaleLinear().domain(domain).range(range);
  return nice ? s.nice() : s;
}

export function createBandScale(domain: string[], range: [number, number], padding = 0.2): d3.ScaleBand<string> {
  return d3.scaleBand<string>().domain(domain).range(range).padding(padding);
}

export function createColorScale(domain: string[], palette: PaletteName = 'default'): d3.ScaleOrdinal<string, string> {
  return d3.scaleOrdinal<string, string>().domain(domain).range(PALETTES[palette] as unknown as string[]);
}

export function renderAxis(ref: SVGGElement | null, axis: d3.Axis<any>): void {
  if (!ref) return;
  const g = d3.select(ref);
  g.call(axis);
  g.selectAll('.domain').attr('stroke', CANVAS_THEME.border);
  g.selectAll('.tick line').attr('stroke', CANVAS_THEME.gridline);
  g.selectAll('.tick text')
    .attr('fill', CANVAS_THEME.text.muted)
    .attr('font-family', CANVAS_THEME.font.family)
    .attr('font-size', CANVAS_THEME.font.size.xs);
}

export function formatChartValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return d3.format('.2s')(value);
  if (Math.abs(value) >= 1_000) return d3.format('.3s')(value);
  if (Number.isInteger(value)) return String(value);
  return d3.format('.1f')(value);
}

export function extractNumericField(data: unknown[], field: string): number[] {
  return data.map(d => (typeof d === 'object' && d !== null ? (d as any)[field] : undefined)).filter((v): v is number => typeof v === 'number');
}

export function isNumericTable(data: unknown): data is Record<string, unknown>[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  if (typeof first !== 'object' || first === null) return false;
  return Object.values(first).some(v => typeof v === 'number');
}

export function isNumberArray(data: unknown): data is number[] {
  return Array.isArray(data) && data.length > 0 && data.every(d => typeof d === 'number');
}

export function detectNumericFields(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  return Object.entries(data[0]!).filter(([, v]) => typeof v === 'number').map(([k]) => k);
}

export function detectCategoricalFields(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  return Object.entries(data[0]!).filter(([k, v]) => {
    if (typeof v !== 'string') return false;
    return new Set(data.map(d => (d as any)[k])).size <= 20;
  }).map(([k]) => k);
}


// ============================================================================
// §4 — BUILT-IN CHART LIBRARY
// ============================================================================
//
// Each chart: D3 for data transformation, React for SVG rendering,
// useRef+useEffect only for axes. Canvas theme inherited throughout.

// ── Bar Chart ───────────────────────────────────────────────────────────

const BarChart: React.FC<ChartComponentProps<Record<string, unknown>[]>> = ({
  data, width, height, palette = 'default', config = {}, compact = false, title,
}) => {
  const xRef = useRef<SVGGElement>(null);
  const yRef = useRef<SVGGElement>(null);
  const m = compact ? MARGINS.compact : MARGINS.full;
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;

  const catField = (config['categoryField'] as string) ?? detectCategoricalFields(data)[0] ?? Object.keys(data[0] ?? {})[0] ?? 'name';
  const valField = (config['valueField'] as string) ?? detectNumericFields(data)[0] ?? 'value';
  const cats = data.map(d => String((d as any)[catField] ?? ''));
  const vals = data.map(d => Number((d as any)[valField] ?? 0));

  const x = useMemo(() => createBandScale(cats, [0, iW]), [cats, iW]);
  const y = useMemo(() => createLinearScale([0, Math.max(...vals, 1)], [iH, 0]), [vals, iH]);

  useEffect(() => { renderAxis(xRef.current, d3.axisBottom(x)); }, [x]);
  useEffect(() => { renderAxis(yRef.current, d3.axisLeft(y).ticks(5).tickFormat(d => formatChartValue(d as number))); }, [y]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${m.left},${m.top})`}>
        {y.ticks(5).map(t => <line key={t} x1={0} x2={iW} y1={y(t)} y2={y(t)} stroke={CANVAS_THEME.gridline} strokeDasharray="2,3" />)}
        {data.map((_, i) => (
          <rect key={i} x={x(cats[i]!)} y={y(vals[i]!)} width={x.bandwidth()} height={iH - y(vals[i]!)}
            fill={paletteColor(palette, i)} rx={2} opacity={0.85}>
            <title>{`${cats[i]}: ${formatChartValue(vals[i]!)}`}</title>
          </rect>
        ))}
        <g ref={xRef} transform={`translate(0,${iH})`} />
        <g ref={yRef} />
      </g>
    </svg>
  );
};

registerChart({ id: 'bar', label: 'Bar Chart', description: 'Vertical bars comparing categories.', category: 'comparison', icon: '▐', priority: 50, canRender: d => isNumericTable(d) && (d as any[]).length <= 50, Component: BarChart, source: 'builtin' });

// ── Horizontal Bar ──────────────────────────────────────────────────────

const HBarChart: React.FC<ChartComponentProps<Record<string, unknown>[]>> = ({
  data, width, height, palette = 'default', config = {}, compact = false, title,
}) => {
  const xRef = useRef<SVGGElement>(null);
  const yRef = useRef<SVGGElement>(null);
  const m = compact ? MARGINS.compact : { ...MARGINS.full, left: 80 };
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;

  const catField = (config['categoryField'] as string) ?? detectCategoricalFields(data)[0] ?? Object.keys(data[0] ?? {})[0] ?? 'name';
  const valField = (config['valueField'] as string) ?? detectNumericFields(data)[0] ?? 'value';
  const cats = data.map(d => String((d as any)[catField] ?? ''));
  const vals = data.map(d => Number((d as any)[valField] ?? 0));

  const yBand = useMemo(() => createBandScale(cats, [0, iH], 0.15), [cats, iH]);
  const x = useMemo(() => createLinearScale([0, Math.max(...vals, 1)], [0, iW]), [vals, iW]);

  useEffect(() => { renderAxis(xRef.current, d3.axisBottom(x).ticks(5).tickFormat(d => formatChartValue(d as number))); }, [x]);
  useEffect(() => { renderAxis(yRef.current, d3.axisLeft(yBand)); }, [yBand]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${m.left},${m.top})`}>
        {data.map((_, i) => (
          <rect key={i} x={0} y={yBand(cats[i]!)} width={x(vals[i]!)} height={yBand.bandwidth()}
            fill={paletteColor(palette, i)} rx={2} opacity={0.85}>
            <title>{`${cats[i]}: ${formatChartValue(vals[i]!)}`}</title>
          </rect>
        ))}
        <g ref={xRef} transform={`translate(0,${iH})`} />
        <g ref={yRef} />
      </g>
    </svg>
  );
};

registerChart({ id: 'hbar', label: 'Horizontal Bar', description: 'Horizontal bars — better for long labels.', category: 'comparison', icon: '▬', priority: 45, canRender: d => isNumericTable(d) && (d as any[]).length >= 3 && (d as any[]).length <= 30, Component: HBarChart, source: 'builtin' });

// ── Line Chart ──────────────────────────────────────────────────────────

const LineChart: React.FC<ChartComponentProps<Record<string, unknown>[]>> = ({
  data, width, height, palette = 'default', config = {}, compact = false, title,
}) => {
  const xRef = useRef<SVGGElement>(null);
  const yRef = useRef<SVGGElement>(null);
  const m = compact ? MARGINS.compact : MARGINS.full;
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;

  const xField = (config['xField'] as string) ?? Object.keys(data[0] ?? {})[0] ?? 'x';
  const yFields = (config['yFields'] as string[]) ?? detectNumericFields(data).slice(0, 4);
  const xVals = data.map((d, i) => (d as any)[xField] ?? i);
  const isXNum = xVals.every(v => typeof v === 'number');

  const xScale = useMemo(() => {
    if (isXNum) return createLinearScale([d3.min(xVals as number[])!, d3.max(xVals as number[])!], [0, iW]);
    return d3.scalePoint<string>().domain(xVals.map(String)).range([0, iW]);
  }, [xVals, iW, isXNum]);

  const allY = yFields.flatMap(f => extractNumericField(data, f));
  const yScale = useMemo(() => createLinearScale([Math.min(0, d3.min(allY) ?? 0), d3.max(allY) ?? 1], [iH, 0]), [allY, iH]);

  useEffect(() => { renderAxis(xRef.current, d3.axisBottom(xScale as any).ticks(compact ? 4 : 8)); }, [xScale, compact]);
  useEffect(() => { renderAxis(yRef.current, d3.axisLeft(yScale).ticks(5).tickFormat(d => formatChartValue(d as number))); }, [yScale]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${m.left},${m.top})`}>
        {yScale.ticks(5).map(t => <line key={t} x1={0} x2={iW} y1={yScale(t)} y2={yScale(t)} stroke={CANVAS_THEME.gridline} strokeDasharray="2,3" />)}
        {yFields.map((field, fi) => {
          const lineGen = d3.line<number>()
            .x((_, i) => {
              if (isXNum) return (xScale as d3.ScaleLinear<number, number>)(xVals[i] as number);
              return (xScale as d3.ScalePoint<string>)(String(xVals[i])) ?? 0;
            })
            .y((_, i) => yScale(Number((data[i] as any)[field] ?? 0)))
            .curve(d3.curveMonotoneX);
          const yArr = data.map(d => Number((d as any)[field] ?? 0));
          return (
            <g key={field}>
              <path d={lineGen(yArr) ?? ''} fill="none" stroke={paletteColor(palette, fi)} strokeWidth={2} opacity={0.9} />
              {!compact && yArr.map((v, i) => {
                const cx = isXNum ? (xScale as d3.ScaleLinear<number, number>)(xVals[i] as number) : ((xScale as d3.ScalePoint<string>)(String(xVals[i])) ?? 0);
                return <circle key={i} cx={cx} cy={yScale(v)} r={3} fill={paletteColor(palette, fi)} opacity={0.7}><title>{`${field}: ${formatChartValue(v)}`}</title></circle>;
              })}
            </g>
          );
        })}
        <g ref={xRef} transform={`translate(0,${iH})`} />
        <g ref={yRef} />
      </g>
    </svg>
  );
};

registerChart({ id: 'line', label: 'Line Chart', description: 'Lines connecting points — ideal for trends.', category: 'trend', icon: '⟋', priority: 50, canRender: d => isNumericTable(d) && (d as any[]).length >= 3, Component: LineChart, source: 'builtin' });

// ── Donut Chart ─────────────────────────────────────────────────────────

const DonutChart: React.FC<ChartComponentProps<Record<string, unknown>[]>> = ({
  data, width, height, palette = 'default', config = {}, compact = false, title,
}) => {
  const radius = Math.min(width, height) / 2 - (compact ? 8 : 20);
  const innerR = (config['innerRadius'] as number) ?? radius * 0.55;
  const catField = (config['categoryField'] as string) ?? detectCategoricalFields(data)[0] ?? Object.keys(data[0] ?? {})[0] ?? 'name';
  const valField = (config['valueField'] as string) ?? detectNumericFields(data)[0] ?? 'value';

  const pieData = useMemo(() => d3.pie<Record<string, unknown>>().value(d => Number((d as any)[valField] ?? 0)).sort(null)(data), [data, valField]);
  const arcGen = useMemo(() => d3.arc<d3.PieArcDatum<Record<string, unknown>>>().innerRadius(innerR).outerRadius(radius), [innerR, radius]);
  const labelArc = useMemo(() => d3.arc<d3.PieArcDatum<Record<string, unknown>>>().innerRadius(radius * 0.75).outerRadius(radius * 0.75), [radius]);
  const total = d3.sum(data, d => Number((d as any)[valField] ?? 0));

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={16} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${width / 2},${height / 2})`}>
        {pieData.map((d, i) => (
          <g key={i}>
            <path d={arcGen(d) ?? ''} fill={paletteColor(palette, i)} stroke={CANVAS_THEME.background} strokeWidth={2} opacity={0.85}>
              <title>{`${(d.data as any)[catField]}: ${formatChartValue(d.value)} (${((d.value / total) * 100).toFixed(1)}%)`}</title>
            </path>
            {!compact && d.endAngle - d.startAngle > 0.3 && (
              <text transform={`translate(${labelArc.centroid(d)})`} textAnchor="middle" fill={CANVAS_THEME.text.primary} fontSize={CANVAS_THEME.font.size.xs}>
                {((d.value / total) * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
        <text textAnchor="middle" dy="-0.2em" fill={CANVAS_THEME.text.primary} fontSize={CANVAS_THEME.font.size.xl} fontWeight="700">{formatChartValue(total)}</text>
        <text textAnchor="middle" dy="1.2em" fill={CANVAS_THEME.text.muted} fontSize={CANVAS_THEME.font.size.xs}>total</text>
      </g>
    </svg>
  );
};

registerChart({ id: 'donut', label: 'Donut Chart', description: 'Proportional composition with centre stat.', category: 'composition', icon: '◎', priority: 50, canRender: d => isNumericTable(d) && (d as any[]).length >= 2 && (d as any[]).length <= 12, Component: DonutChart, source: 'builtin' });

// ── Histogram ───────────────────────────────────────────────────────────

const HistogramChart: React.FC<ChartComponentProps<number[]>> = ({
  data, width, height, palette = 'score', config = {}, compact = false, title,
}) => {
  const xRef = useRef<SVGGElement>(null);
  const yRef = useRef<SVGGElement>(null);
  const m = compact ? MARGINS.compact : MARGINS.full;
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;
  const binCount = (config['bins'] as number) ?? Math.min(Math.ceil(Math.sqrt(data.length)), 20);

  const x = useMemo(() => createLinearScale([d3.min(data) ?? 0, d3.max(data) ?? 1], [0, iW]), [data, iW]);
  const bins = useMemo(() => d3.bin().domain(x.domain() as [number, number]).thresholds(x.ticks(binCount))(data), [data, x, binCount]);
  const y = useMemo(() => createLinearScale([0, d3.max(bins, b => b.length) ?? 1], [iH, 0]), [bins, iH]);

  const colorScale = useMemo(() => d3.scaleSequential(d3.interpolateRgbBasis(PALETTES[palette] as unknown as string[])).domain(x.domain()), [x, palette]);

  useEffect(() => { renderAxis(xRef.current, d3.axisBottom(x).ticks(compact ? 4 : 8).tickFormat(d => formatChartValue(d as number))); }, [x, compact]);
  useEffect(() => { renderAxis(yRef.current, d3.axisLeft(y).ticks(5)); }, [y]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${m.left},${m.top})`}>
        {bins.map((bin, i) => {
          const bx = x(bin.x0 ?? 0);
          const bw = Math.max(1, x(bin.x1 ?? 0) - bx - 1);
          const midpoint = ((bin.x0 ?? 0) + (bin.x1 ?? 0)) / 2;
          return (
            <rect key={i} x={bx} y={y(bin.length)} width={bw} height={iH - y(bin.length)}
              fill={colorScale(midpoint)} rx={1} opacity={0.85}>
              <title>{`${formatChartValue(bin.x0 ?? 0)}–${formatChartValue(bin.x1 ?? 0)}: ${bin.length}`}</title>
            </rect>
          );
        })}
        <g ref={xRef} transform={`translate(0,${iH})`} />
        <g ref={yRef} />
      </g>
    </svg>
  );
};

registerChart({ id: 'histogram', label: 'Histogram', description: 'Distribution of a numeric variable.', category: 'distribution', icon: '▊', priority: 60, canRender: d => isNumberArray(d) && (d as number[]).length >= 5, Component: HistogramChart, source: 'builtin' });

// ── Radial Gauge ────────────────────────────────────────────────────────

const GaugeChart: React.FC<ChartComponentProps<number>> = ({
  data, width, height, palette = 'health', config = {}, title,
}) => {
  const min = (config['min'] as number) ?? 0;
  const max = (config['max'] as number) ?? 100;
  const label = (config['label'] as string) ?? '';
  const thresholds = (config['thresholds'] as number[]) ?? [max * 0.33, max * 0.66, max];
  const radius = Math.min(width, height) / 2 - 12;
  const arcWidth = radius * 0.2;

  const angle = useMemo(() => d3.scaleLinear().domain([min, max]).range([-Math.PI * 0.75, Math.PI * 0.75]).clamp(true), [min, max]);
  const bgArc = useMemo(() => d3.arc()({ innerRadius: radius - arcWidth, outerRadius: radius, startAngle: -Math.PI * 0.75, endAngle: Math.PI * 0.75 }) ?? '', [radius, arcWidth]);
  const valArc = useMemo(() => d3.arc()({ innerRadius: radius - arcWidth, outerRadius: radius, startAngle: -Math.PI * 0.75, endAngle: angle(data) }) ?? '', [radius, arcWidth, angle, data]);

  // Determine colour from thresholds
  const color = useMemo(() => {
    const p = PALETTES[palette];
    const idx = thresholds.findIndex(t => data <= t);
    return p[idx >= 0 ? idx : p.length - 1] ?? p[0]!;
  }, [data, thresholds, palette]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${width / 2},${height / 2 + 10})`}>
        <path d={bgArc} fill={CANVAS_THEME.gridline} />
        <path d={valArc} fill={color} opacity={0.9} />
        <text textAnchor="middle" dy="-0.1em" fill={color} fontSize={radius * 0.4} fontWeight="700">{formatChartValue(data)}</text>
        {label && <text textAnchor="middle" dy="1.3em" fill={CANVAS_THEME.text.muted} fontSize={CANVAS_THEME.font.size.xs}>{label}</text>}
      </g>
    </svg>
  );
};

registerChart({ id: 'gauge', label: 'Gauge', description: 'Radial gauge showing a single value against a range.', category: 'indicator', icon: '◔', priority: 60, canRender: d => typeof d === 'number', Component: GaugeChart, source: 'builtin' });

// ── Sparkline ───────────────────────────────────────────────────────────

const Sparkline: React.FC<ChartComponentProps<number[]>> = ({
  data, width, height, palette = 'default', config = {},
}) => {
  const m = MARGINS.sparkline;
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;
  const showArea = (config['area'] as boolean) ?? true;
  const color = PALETTES[palette][0]!;

  const x = useMemo(() => d3.scaleLinear().domain([0, data.length - 1]).range([0, iW]), [data, iW]);
  const y = useMemo(() => d3.scaleLinear().domain([d3.min(data) ?? 0, d3.max(data) ?? 1]).range([iH, 0]), [data, iH]);

  const lineGen = useMemo(() => d3.line<number>().x((_, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX), [x, y]);
  const areaGen = useMemo(() => d3.area<number>().x((_, i) => x(i)).y0(iH).y1(d => y(d)).curve(d3.curveMonotoneX), [x, y, iH]);

  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? last;
  const trend = last >= prev ? color : '#EF5350';

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${m.left},${m.top})`}>
        {showArea && <path d={areaGen(data) ?? ''} fill={color} opacity={0.08} />}
        <path d={lineGen(data) ?? ''} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
        <circle cx={x(data.length - 1)} cy={y(last)} r={2.5} fill={trend} />
      </g>
    </svg>
  );
};

registerChart({ id: 'sparkline', label: 'Sparkline', description: 'Compact inline trend line.', category: 'trend', icon: '~', priority: 40, canRender: d => isNumberArray(d) && (d as number[]).length >= 3, Component: Sparkline, source: 'builtin' });

// ── Heatmap ─────────────────────────────────────────────────────────────

const Heatmap: React.FC<ChartComponentProps<Record<string, unknown>[]>> = ({
  data, width, height, palette = 'score', config = {}, compact = false, title,
}) => {
  const xField = (config['xField'] as string) ?? detectCategoricalFields(data)[0] ?? Object.keys(data[0] ?? {})[0] ?? 'x';
  const yField = (config['yField'] as string) ?? detectCategoricalFields(data)[1] ?? Object.keys(data[0] ?? {})[1] ?? 'y';
  const valField = (config['valueField'] as string) ?? detectNumericFields(data)[0] ?? 'value';

  const xCats = [...new Set(data.map(d => String((d as any)[xField])))];
  const yCats = [...new Set(data.map(d => String((d as any)[yField])))];

  const m = compact ? MARGINS.compact : { ...MARGINS.full, left: 60 };
  const iW = width - m.left - m.right;
  const iH = height - m.top - m.bottom;

  const xScale = useMemo(() => createBandScale(xCats, [0, iW], 0.05), [xCats, iW]);
  const yScale = useMemo(() => createBandScale(yCats, [0, iH], 0.05), [yCats, iH]);
  const vals = data.map(d => Number((d as any)[valField] ?? 0));
  const colorScale = useMemo(() => d3.scaleSequential(d3.interpolateRgbBasis(PALETTES[palette] as unknown as string[])).domain([d3.min(vals) ?? 0, d3.max(vals) ?? 1]), [vals, palette]);

  return (
    <svg width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }}>
      {title && <text x={width / 2} y={14} textAnchor="middle" fill={CANVAS_THEME.text.secondary} fontSize={CANVAS_THEME.font.size.md} fontFamily={CANVAS_THEME.font.sansFamily}>{title}</text>}
      <g transform={`translate(${m.left},${m.top})`}>
        {data.map((d, i) => {
          const xv = String((d as any)[xField]);
          const yv = String((d as any)[yField]);
          const v = Number((d as any)[valField] ?? 0);
          return (
            <rect key={i} x={xScale(xv)} y={yScale(yv)} width={xScale.bandwidth()} height={yScale.bandwidth()}
              fill={colorScale(v)} rx={2}>
              <title>{`${xv} × ${yv}: ${formatChartValue(v)}`}</title>
            </rect>
          );
        })}
        {/* X labels */}
        {xCats.map(c => (
          <text key={c} x={(xScale(c) ?? 0) + xScale.bandwidth() / 2} y={iH + 14}
            textAnchor="middle" fill={CANVAS_THEME.text.muted} fontSize={CANVAS_THEME.font.size.xs}>{c}</text>
        ))}
        {/* Y labels */}
        {yCats.map(c => (
          <text key={c} x={-6} y={(yScale(c) ?? 0) + yScale.bandwidth() / 2}
            textAnchor="end" dominantBaseline="middle" fill={CANVAS_THEME.text.muted} fontSize={CANVAS_THEME.font.size.xs}>{c}</text>
        ))}
      </g>
    </svg>
  );
};

registerChart({ id: 'heatmap', label: 'Heatmap', description: 'Colour-coded grid showing intensity across two categories.', category: 'relationship', icon: '▦', priority: 45, canRender: d => isNumericTable(d) && detectCategoricalFields(d as Record<string, unknown>[]).length >= 2, Component: Heatmap, source: 'builtin' });


// ============================================================================
// §5 — AUTO CHART RENDERER
// ============================================================================
//
// The magic component. Give it data from any port and it automatically
// selects the best chart, renders it with appropriate config, and lets
// the user switch to any other compatible chart via a picker.

interface AutoChartProps {
  /** The raw data from a port output. */
  data: unknown;
  /** The port's declared data type. */
  dataType: string;
  /** Available width. */
  width: number;
  /** Available height. */
  height: number;
  /** Preferred chart ID (overrides auto-selection). */
  preferredChart?: string;
  /** Palette name. */
  palette?: PaletteName;
  /** Extra config passed to the chart. */
  config?: Record<string, unknown>;
  /** Whether to show the chart picker controls. */
  showPicker?: boolean;
  /** Compact mode. */
  compact?: boolean;
  /** Title. */
  title?: string;
}

export const AutoChart: React.FC<AutoChartProps> = ({
  data, dataType, width, height, preferredChart, palette = 'default',
  config = {}, showPicker = true, compact = false, title,
}) => {
  const compatible = useMemo(() => getCompatibleCharts(data), [data]);
  const [selectedId, setSelectedId] = useState<string | null>(preferredChart ?? null);

  const chart = useMemo(() => {
    if (selectedId) return getChart(selectedId) ?? compatible[0] ?? null;
    return compatible[0] ?? null;
  }, [selectedId, compatible]);

  if (!chart) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CANVAS_THEME.text.muted, fontSize: 11 }}>
        No chart available for this data shape
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Chart picker */}
      {showPicker && compatible.length > 1 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 4, flexWrap: 'wrap' }}>
          {compatible.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              title={c.description}
              style={{
                padding: '2px 6px', fontSize: 9, borderRadius: 3, cursor: 'pointer',
                background: (chart.id === c.id) ? 'rgba(77,166,255,0.15)' : 'transparent',
                border: `1px solid ${(chart.id === c.id) ? 'rgba(77,166,255,0.3)' : CANVAS_THEME.border}`,
                color: (chart.id === c.id) ? CANVAS_THEME.text.accent : CANVAS_THEME.text.muted,
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Render the chart */}
      <chart.Component data={data} width={width} height={height} palette={palette} config={config} compact={compact} title={title} />
    </div>
  );
};


// ============================================================================
// §6 — NODE DATA VISUALISATION COMPONENT
// ============================================================================
//
// Plugs into the pipeline view: for each completed node, scans its
// output ports and renders auto-charts for any visualisable data.

interface NodeDataVizProps {
  node: { nodeId: string; label: string; typeId: string; portDefs: Array<{ portId: string; label: string; dataType: string }> };
  output: NodeOutputData;
  width?: number;
}

export const NodeDataViz: React.FC<NodeDataVizProps> = ({ node, output, width = 500 }) => {
  const vizPorts = node.portDefs.filter(def => {
    const port = output.ports[def.portId];
    if (!port?.data || def.portId.startsWith('__')) return false;
    return getCompatibleCharts(port.data).length > 0;
  });

  if (vizPorts.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: CANVAS_THEME.text.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 }}>
        Visualisations
      </div>
      {vizPorts.map(def => {
        const port = output.ports[def.portId]!;
        return (
          <div key={def.portId} style={{ marginBottom: 8, padding: 8, background: CANVAS_THEME.background, borderRadius: 6, border: `1px solid ${CANVAS_THEME.border}` }}>
            <AutoChart data={port.data} dataType={def.dataType} width={width - 16} height={200} title={def.label} compact showPicker />
          </div>
        );
      })}
    </div>
  );
};


// ============================================================================
// §7 — USER IMPORT SYSTEM
// ============================================================================
//
// The extensibility gateway. Users can register their own D3
// visualisations — from npm packages, Observable notebooks, custom
// code, or any source that produces a React component conforming to
// the ChartComponentProps interface.
//
// Three import paths:
//
//   1. COMPONENT IMPORT — user provides a React component directly.
//      registerUserChart({ id: 'my-sankey', Component: MySankey, ... })
//
//   2. D3 FUNCTION IMPORT — user provides a D3 render function that
//      takes (svgElement, data, config) and we wrap it in a React
//      component using the useRef+useEffect bridge.
//      registerD3Function({ id: 'my-force', render: myForceLayout, ... })
//
//   3. OBSERVABLE IMPORT — user provides an Observable notebook cell
//      reference and we embed it via the Observable runtime.
//      (Placeholder — requires @observablehq/runtime at build time.)

/** Import a user-provided React chart component. */
export function registerUserChart(def: {
  id: string;
  label: string;
  description: string;
  category?: ChartRegistration['category'];
  icon?: string;
  canRender: (data: unknown) => boolean;
  priority?: number;
  Component: React.FC<ChartComponentProps<any>>;
}): void {
  registerChart({
    id: def.id,
    label: def.label,
    description: def.description,
    category: def.category ?? 'custom',
    icon: def.icon ?? '◇',
    canRender: def.canRender,
    priority: def.priority ?? 100,
    Component: def.Component,
    source: 'user',
  });
}

/**
 * Import a raw D3 render function and wrap it in a React component.
 *
 * The render function receives:
 *   - svg: the SVGSVGElement (D3 has full control inside this element)
 *   - data: the chart data
 *   - config: { width, height, palette, ...chartConfig }
 *
 * Example:
 *   registerD3Function({
 *     id: 'force-graph',
 *     label: 'Force Graph',
 *     description: 'D3 force-directed graph layout.',
 *     canRender: (d) => Array.isArray(d) && d[0]?.nodes,
 *     render: (svg, data, config) => {
 *       const { width, height } = config;
 *       // Full D3 code here — d3.select(svg), bindData, etc.
 *     },
 *   });
 */
export function registerD3Function(def: {
  id: string;
  label: string;
  description: string;
  category?: ChartRegistration['category'];
  icon?: string;
  canRender: (data: unknown) => boolean;
  priority?: number;
  render: (svg: SVGSVGElement, data: unknown, config: Record<string, unknown> & { width: number; height: number; palette: string }) => void;
  /** Optional cleanup function called before re-render. */
  cleanup?: (svg: SVGSVGElement) => void;
}): void {
  // Create a React wrapper component
  const D3Wrapper: React.FC<ChartComponentProps> = ({ data, width, height, palette = 'default', config = {}, title }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (!svgRef.current) return;
      // Clean previous render
      if (def.cleanup) {
        def.cleanup(svgRef.current);
      } else {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      // Render
      def.render(svgRef.current, data, { width, height, palette, ...config });
    }, [data, width, height, palette, config]);

    return (
      <div>
        {title && (
          <div style={{ fontSize: CANVAS_THEME.font.size.md, color: CANVAS_THEME.text.secondary, fontFamily: CANVAS_THEME.font.sansFamily, marginBottom: 4, textAlign: 'center' }}>
            {title}
          </div>
        )}
        <svg ref={svgRef} width={width} height={height} style={{ fontFamily: CANVAS_THEME.font.family }} />
      </div>
    );
  };
  D3Wrapper.displayName = `D3_${def.id}`;

  registerChart({
    id: def.id,
    label: def.label,
    description: def.description,
    category: def.category ?? 'custom',
    icon: def.icon ?? '◇',
    canRender: def.canRender,
    priority: def.priority ?? 100,
    Component: D3Wrapper,
    source: 'user',
  });
}

/**
 * Bulk import: register multiple charts at once from a chart pack.
 *
 * A chart pack is a module that exports an array of chart definitions.
 * This is the pattern for distributing community chart libraries:
 *
 *   // my-chart-pack.ts
 *   export const charts = [
 *     { id: 'treemap', label: 'Treemap', ... },
 *     { id: 'sunburst', label: 'Sunburst', ... },
 *   ];
 *
 *   // In your canvas setup:
 *   import { charts } from 'my-chart-pack';
 *   importChartPack(charts);
 */
export function importChartPack(
  charts: Array<Parameters<typeof registerUserChart>[0] | (Parameters<typeof registerD3Function>[0] & { type: 'd3' })>,
): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  for (const chart of charts) {
    try {
      if ('render' in chart && (chart as any).type === 'd3') {
        registerD3Function(chart as Parameters<typeof registerD3Function>[0]);
      } else if ('Component' in chart) {
        registerUserChart(chart as Parameters<typeof registerUserChart>[0]);
      } else {
        errors.push(`Chart "${(chart as any).id}": must have either 'Component' or 'render' + type:'d3'`);
        continue;
      }
      imported++;
    } catch (e) {
      errors.push(`Chart "${(chart as any).id}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { imported, errors };
}


// ============================================================================
// §8 — CHART PICKER COMPONENT
// ============================================================================
//
// A standalone UI for browsing and selecting charts. Used in the
// dashboard configuration view and the node output inspector.

interface ChartPickerProps {
  data: unknown;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAll?: boolean;
}

export const ChartPicker: React.FC<ChartPickerProps> = ({ data, selectedId, onSelect, showAll = false }) => {
  const compatible = useMemo(() => getCompatibleCharts(data), [data]);
  const all = useMemo(() => getAllCharts(), []);
  const displayed = showAll ? all : compatible;

  const byCategory = useMemo(() => {
    const groups: Record<string, ChartRegistration[]> = {};
    for (const c of displayed) {
      (groups[c.category] ??= []).push(c);
    }
    return groups;
  }, [displayed]);

  const categoryLabels: Record<string, string> = {
    distribution: '📊 Distribution', comparison: '📶 Comparison', composition: '🎯 Composition',
    relationship: '🔗 Relationship', trend: '📈 Trend', indicator: '⏱ Indicator',
    spatial: '🗺 Spatial', custom: '◇ Custom',
  };

  return (
    <div style={{ fontSize: 11, fontFamily: CANVAS_THEME.font.sansFamily }}>
      {Object.entries(byCategory).map(([cat, charts]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: CANVAS_THEME.text.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 }}>
            {categoryLabels[cat] ?? cat}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {charts.map(c => {
              const isSelected = selectedId === c.id;
              const isCompatible = compatible.some(cc => cc.id === c.id);
              return (
                <button key={c.id} onClick={() => isCompatible && onSelect(c.id)}
                  title={`${c.label}: ${c.description}${c.source === 'user' ? ' (user import)' : ''}`}
                  disabled={!isCompatible}
                  style={{
                    padding: '4px 8px', borderRadius: 4, cursor: isCompatible ? 'pointer' : 'not-allowed',
                    background: isSelected ? 'rgba(77,166,255,0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(77,166,255,0.3)' : CANVAS_THEME.border}`,
                    color: !isCompatible ? CANVAS_THEME.gridline : isSelected ? CANVAS_THEME.text.accent : CANVAS_THEME.text.secondary,
                    opacity: isCompatible ? 1 : 0.4,
                    fontSize: 10,
                  }}>
                  {c.icon} {c.label}
                  {c.source === 'user' && <span style={{ marginLeft: 3, fontSize: 8, color: CANVAS_THEME.text.muted }}>⬆</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {displayed.length === 0 && (
        <div style={{ color: CANVAS_THEME.text.muted, padding: '12px 0', textAlign: 'center' }}>
          No charts registered. Use registerUserChart() or registerD3Function() to add visualisations.
        </div>
      )}
    </div>
  );
};


// ============================================================================
// §9 — MULTI-CHART DASHBOARD LAYOUT
// ============================================================================
//
// Composite component for domain dashboards: arranges multiple charts
// in a responsive grid layout. Each cell can render a different chart
// type with different data — the dashboard definition is declarative.

export interface DashboardCell {
  id: string;
  title: string;
  data: unknown;
  dataType: string;
  chartId?: string;
  palette?: PaletteName;
  config?: Record<string, unknown>;
  /** Grid span: 1 = quarter, 2 = half, 4 = full width. */
  span?: 1 | 2 | 3 | 4;
  /** Chart height in pixels. */
  height?: number;
}

interface ChartDashboardProps {
  cells: DashboardCell[];
  columns?: number;
  gap?: number;
}

export const ChartDashboard: React.FC<ChartDashboardProps> = ({ cells, columns = 4, gap = 12 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const colWidth = (containerWidth - gap * (columns - 1)) / columns;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', gap }}>
      {cells.map(cell => {
        const span = cell.span ?? 2;
        const w = colWidth * span + gap * (span - 1);
        const h = cell.height ?? 200;
        return (
          <div key={cell.id} style={{ width: w, flexShrink: 0 }}>
            <AutoChart
              data={cell.data} dataType={cell.dataType}
              width={w} height={h}
              preferredChart={cell.chartId} palette={cell.palette}
              config={cell.config} title={cell.title}
              showPicker compact
            />
          </div>
        );
      })}
    </div>
  );
};


// ============================================================================
// §10 — D3 ECOSYSTEM RE-EXPORTS
// ============================================================================
//
// Convenience re-exports so that user chart code can import D3 modules
// through us rather than needing a separate d3 dependency. This ensures
// version consistency and lets us add canvas-theme defaults.

export {
  // Scales
  scaleLinear, scaleBand, scaleOrdinal, scaleSequential, scaleTime, scaleLog, scalePow, scalePoint,
  // Shapes
  line, area, arc, pie, stack, curveMonotoneX, curveBasis, curveStep, curveCardinal,
  // Layouts
  bin, histogram, treemap, pack, partition, tree, cluster,
  // Axes
  axisBottom, axisTop, axisLeft, axisRight,
  // Arrays
  min, max, sum, mean, median, extent, range, group, rollup, sort as d3sort,
  // Format
  format, formatPrefix, timeFormat,
  // Interpolation
  interpolate, interpolateRgb, interpolateRgbBasis, interpolateHsl,
  // Colours
  color, rgb, hsl,
  // Selections (for useRef+useEffect pattern)
  select, selectAll,
  // Transitions (for useRef+useEffect pattern)
  transition,
  // Force (for custom force layouts)
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY,
  // Geo (for map projections)
  geoPath, geoMercator, geoNaturalEarth1, geoAlbers,
} from 'd3';


// ============================================================================
// §11 — USAGE EXAMPLES (Documentation)
// ============================================================================
//
// These are not executable — they serve as inline documentation for
// developers extending the chart library.
//
// EXAMPLE 1: Register a custom Sankey diagram
//
//   import { registerD3Function } from './sr-canvas-dataviz';
//   import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
//
//   registerD3Function({
//     id: 'sankey',
//     label: 'Sankey Diagram',
//     description: 'Flow diagram showing weighted relationships.',
//     category: 'relationship',
//     icon: '⇶',
//     canRender: (d) => {
//       if (!d || typeof d !== 'object') return false;
//       const obj = d as any;
//       return Array.isArray(obj.nodes) && Array.isArray(obj.links);
//     },
//     render: (svg, data, config) => {
//       const { width, height } = config;
//       const { nodes, links } = data as any;
//       const layout = sankey()
//         .nodeWidth(15).nodePadding(10)
//         .extent([[1, 1], [width - 1, height - 1]]);
//       const graph = layout({ nodes: [...nodes], links: [...links] });
//       const s = d3.select(svg);
//       s.selectAll('.link')
//         .data(graph.links).join('path')
//         .attr('class', 'link')
//         .attr('d', sankeyLinkHorizontal())
//         .attr('stroke', '#4DA6FF')
//         .attr('stroke-width', d => Math.max(1, d.width))
//         .attr('fill', 'none').attr('opacity', 0.4);
//       // ... nodes, labels, etc.
//     },
//   });
//
// EXAMPLE 2: Import a chart pack
//
//   import { importChartPack } from './sr-canvas-dataviz';
//   import { communityCharts } from '@scholarly/chart-pack-community';
//
//   const result = importChartPack(communityCharts);
//   console.log(`Imported ${result.imported} charts, ${result.errors.length} errors`);
//
// EXAMPLE 3: Use AutoChart in a custom dashboard
//
//   import { AutoChart, ChartDashboard } from './sr-canvas-dataviz';
//
//   const cells = [
//     { id: 'scores', title: 'Score Distribution', data: scores,
//       dataType: 'table', chartId: 'histogram', span: 2, height: 250 },
//     { id: 'categories', title: 'By Age Group', data: breakdown,
//       dataType: 'table', chartId: 'donut', span: 1, height: 200 },
//     { id: 'health', title: 'System Health', data: 87,
//       dataType: 'scalar', chartId: 'gauge', span: 1, height: 200 },
//   ];
//   return <ChartDashboard cells={cells} columns={4} />;
