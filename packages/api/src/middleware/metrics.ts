/**
 * Prometheus-compatible Metrics
 *
 * Collects request counters, duration histograms, error counters,
 * and infrastructure gauges. Exposes at /metrics endpoint.
 */

import { Router, Request, Response, NextFunction } from 'express';

// Prometheus histogram bucket boundaries (seconds)
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// Simple metrics registry (no external dependency)
interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels: Record<string, string>;
  value: number;
  // Histogram: pre-computed cumulative bucket counts (avoids unbounded observation array)
  bucketCounts?: number[];
  histogramSum?: number;
}

class MetricsRegistry {
  private metrics = new Map<string, MetricEntry[]>();

  private getKey(name: string, labels: Record<string, string>): string {
    const sortedLabels = Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${sortedLabels}}`;
  }

  increment(name: string, help: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);
    if (existing && existing.length > 0) {
      existing[0].value += value;
    } else {
      this.metrics.set(key, [{ name, type: 'counter', help, labels, value }]);
    }
  }

  gauge(name: string, help: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.getKey(name, labels);
    this.metrics.set(key, [{ name, type: 'gauge', help, labels, value }]);
  }

  observe(name: string, help: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);
    if (existing && existing.length > 0) {
      const entry = existing[0];
      // Increment cumulative bucket counts (O(1) per observation, no unbounded array)
      for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
        if (value <= HISTOGRAM_BUCKETS[i]) {
          entry.bucketCounts![i]++;
        }
      }
      entry.bucketCounts![HISTOGRAM_BUCKETS.length]++; // +Inf bucket
      entry.histogramSum! += value;
      entry.value++; // count
    } else {
      const bucketCounts = new Array(HISTOGRAM_BUCKETS.length + 1).fill(0);
      for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
        if (value <= HISTOGRAM_BUCKETS[i]) {
          bucketCounts[i]++;
        }
      }
      bucketCounts[HISTOGRAM_BUCKETS.length] = 1; // +Inf bucket
      this.metrics.set(key, [{
        name,
        type: 'histogram',
        help,
        labels,
        value: 1,
        bucketCounts,
        histogramSum: value,
      }]);
    }
  }

  serialize(): string {
    const output: string[] = [];
    const seenHelp = new Set<string>();

    for (const entries of this.metrics.values()) {
      for (const entry of entries) {
        if (!seenHelp.has(entry.name)) {
          output.push(`# HELP ${entry.name} ${entry.help}`);
          output.push(`# TYPE ${entry.name} ${entry.type}`);
          seenHelp.add(entry.name);
        }

        const labelStr = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        if (entry.type === 'histogram' && entry.bucketCounts) {
          for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
            const bucketLabels = labelStr ? `${labelStr},le="${HISTOGRAM_BUCKETS[i]}"` : `le="${HISTOGRAM_BUCKETS[i]}"`;
            output.push(`${entry.name}_bucket{${bucketLabels}} ${entry.bucketCounts[i]}`);
          }
          const infLabels = labelStr ? `${labelStr},le="+Inf"` : `le="+Inf"`;
          output.push(`${entry.name}_bucket{${infLabels}} ${entry.bucketCounts[HISTOGRAM_BUCKETS.length]}`);
          output.push(`${entry.name}_sum${labelStr ? `{${labelStr}}` : ''} ${entry.histogramSum}`);
          output.push(`${entry.name}_count${labelStr ? `{${labelStr}}` : ''} ${entry.value}`);

        } else {
          output.push(`${entry.name}${labelStr ? `{${labelStr}}` : ''} ${entry.value}`);
        }
      }
    }

    return output.join('\n') + '\n';
  }
}

export const registry = new MetricsRegistry();

/**
 * Normalize path to prevent high cardinality (replace IDs with :id).
 * Exported for use in error-handler.ts.
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id')
    .replace(/\/c[a-z0-9]{20,30}/g, '/:id')
    .replace(/\/[0-9]+/g, '/:id');
}

/**
 * Middleware to collect request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const durationSec = durationMs / 1000;

    // Use matched route pattern when available; fall back to 'unmatched' to cap cardinality
    const path = req.route?.path ? normalizePath(req.route.path) : 'unmatched';

    const labels = {
      method: req.method,
      path,
      status: String(res.statusCode),
    };

    registry.increment(
      'http_requests_total',
      'Total HTTP requests',
      labels,
    );

    registry.observe(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      { method: req.method, path },
      durationSec,
    );

    if (res.statusCode >= 400) {
      registry.increment(
        'http_errors_total',
        'Total HTTP errors',
        { method: req.method, status: String(res.statusCode) },
      );
    }
  });

  next();
}

/**
 * Metrics endpoint router
 */
const metricsRouter = Router();

metricsRouter.get('/', (_req: Request, res: Response) => {
  // Update infrastructure gauges
  const mem = process.memoryUsage();
  registry.gauge('process_heap_used_bytes', 'Heap memory used', {}, mem.heapUsed);
  registry.gauge('process_heap_total_bytes', 'Total heap memory', {}, mem.heapTotal);
  registry.gauge('process_rss_bytes', 'Resident set size', {}, mem.rss);
  registry.gauge('process_uptime_seconds', 'Process uptime', {}, process.uptime());

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(registry.serialize());
});

export { metricsRouter };
