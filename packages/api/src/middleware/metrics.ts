/**
 * Prometheus-compatible Metrics
 *
 * Collects request counters, duration histograms, error counters,
 * and infrastructure gauges. Exposes at /metrics endpoint.
 */

import { Router, Request, Response, NextFunction } from 'express';

// Simple metrics registry (no external dependency)
interface MetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels: Record<string, string>;
  value: number;
  buckets?: number[];
  // Pre-computed bucket counters for histograms (avoids unbounded array growth)
  bucketCounts?: number[];
  histogramSum?: number;
  histogramCount?: number;
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

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
      // Increment pre-computed bucket counters in-place
      for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
        if (value <= DEFAULT_BUCKETS[i]) {
          entry.bucketCounts![i]++;
        }
      }
      entry.histogramSum! += value;
      entry.histogramCount! += 1;
      entry.value = entry.histogramCount!;
    } else {
      const bucketCounts = new Array(DEFAULT_BUCKETS.length).fill(0);
      for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
        if (value <= DEFAULT_BUCKETS[i]) {
          bucketCounts[i] = 1;
        }
      }
      this.metrics.set(key, [{
        name,
        type: 'histogram',
        help,
        labels,
        value: 1,
        bucketCounts,
        histogramSum: value,
        histogramCount: 1,
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
          const buckets = DEFAULT_BUCKETS;

          for (let i = 0; i < buckets.length; i++) {
            const bucketLabels = labelStr ? `${labelStr},le="${buckets[i]}"` : `le="${buckets[i]}"`;
            output.push(`${entry.name}_bucket{${bucketLabels}} ${entry.bucketCounts[i]}`);
          }
          const infLabels = labelStr ? `${labelStr},le="+Inf"` : `le="+Inf"`;
          output.push(`${entry.name}_bucket{${infLabels}} ${entry.histogramCount}`);
          output.push(`${entry.name}_sum${labelStr ? `{${labelStr}}` : ''} ${entry.histogramSum}`);
          output.push(`${entry.name}_count${labelStr ? `{${labelStr}}` : ''} ${entry.histogramCount}`);
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
 * Middleware to collect request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const durationSec = durationMs / 1000;

    const labels = {
      method: req.method,
      path: normalizePath(req.route?.path || req.path),
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
      { method: req.method, path: normalizePath(req.route?.path || req.path) },
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
 * Normalize path to prevent high cardinality (replace IDs with :id)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id')
    .replace(/\/c[a-z0-9]{20,30}/g, '/:id')
    .replace(/\/[0-9]+/g, '/:id');
}

/**
 * Metrics endpoint router
 */
const metricsRouter = Router();

metricsRouter.get('/metrics', (_req: Request, res: Response) => {
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
