/**
 * ============================================================================
 * S&R Integration: Health Check HTTP Prober
 * ============================================================================
 *
 * The third and final "track section." The Health Monitor node and the
 * Cutover Service both delegate endpoint verification to this prober.
 * It's deliberately small and focused — a stethoscope, not an MRI machine.
 *
 * The prober runs a sequence of lightweight checks against a target URL:
 *   1. DNS resolution — can we resolve the domain?
 *   2. SSL certificate — is it valid and not expiring soon?
 *   3. HTTP availability — does the homepage return the expected status?
 *   4. Content match — does the response body contain expected content?
 *   5. Response time — is it within acceptable latency bounds?
 *
 * Each check produces a named result with status, timing, and detail.
 * The aggregate status is: 'healthy' if all pass, 'degraded' if any
 * warn, 'unhealthy' if any fail.
 *
 * DESIGN: The prober is stateless and side-effect-free. It takes a config,
 * runs checks, and returns a result. No persistence, no retries (that's
 * the caller's job), no event publishing. This makes it trivially testable
 * and reusable beyond migration — any workflow node can use it for
 * deployment verification, uptime monitoring, or smoke testing.
 *
 * @module scholarly/sr/integrations/health-prober
 */

import {
  Result,
  success,
  failure,
  Errors,
} from './sr-workflow-engine';

import type { HealthCheckResult } from './sr-migration-workflow-template';


// ============================================================================
// §1 — CONFIGURATION & TYPES
// ============================================================================

export interface HealthProbeConfig {
  /** The URL to probe (e.g., https://marie-erudits.scholarly.app). */
  targetUrl: string;

  /** Domain for DNS and SSL checks (e.g., marie-erudits.scholarly.app). */
  domain: string;

  /** Expected HTTP status code. Default: 200. */
  expectedStatusCode?: number;

  /** Request timeout in milliseconds. Default: 10_000. */
  timeoutMs?: number;

  /** Whether to check SSL certificate validity. Default: true. */
  checkSsl?: boolean;

  /** Whether to check DNS resolution. Default: true. */
  checkDns?: boolean;

  /** Optional string that must appear in the response body. */
  contentMatch?: string;

  /** Maximum acceptable response time in ms. Default: 5_000. */
  maxResponseTimeMs?: number;

  /** Custom fetch implementation (for testing). */
  fetchImpl?: typeof globalThis.fetch;

  /** Shell executor for DNS/SSL checks (for testing). */
  shellExec?: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/** Individual check result within the health report. */
interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  responseTimeMs: number;
  detail: string;
}


// ============================================================================
// §2 — HEALTH PROBER
// ============================================================================

export class HealthProber {
  private fetchFn: typeof globalThis.fetch;
  private exec: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

  constructor(options?: {
    fetchImpl?: typeof globalThis.fetch;
    shellExec?: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  }) {
    this.fetchFn = options?.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.exec = options?.shellExec ?? defaultShellExec;
  }

  /**
   * Run all configured health checks against the target.
   * Returns a structured HealthCheckResult that the Health Monitor
   * node outputs directly.
   */
  async probe(config: HealthProbeConfig): Promise<Result<HealthCheckResult>> {
    const checks: CheckResult[] = [];
    const fetchFn = config.fetchImpl ?? this.fetchFn;
    const exec = config.shellExec ?? this.exec;

    try {
      // Check 1: DNS Resolution
      if (config.checkDns !== false) {
        checks.push(await this.checkDns(config.domain, exec));
      }

      // Check 2: SSL Certificate
      if (config.checkSsl !== false) {
        checks.push(await this.checkSsl(config.domain, exec));
      }

      // Check 3: HTTP Availability
      const httpCheck = await this.checkHttp(config, fetchFn);
      checks.push(httpCheck);

      // Check 4: Content Match (only if HTTP succeeded and contentMatch specified)
      if (config.contentMatch && httpCheck.status !== 'fail') {
        checks.push(await this.checkContent(config, fetchFn));
      }

      // Determine aggregate status
      const hasFailure = checks.some(c => c.status === 'fail');
      const hasWarning = checks.some(c => c.status === 'warn');
      const status: HealthCheckResult['status'] = hasFailure
        ? 'unhealthy'
        : hasWarning
          ? 'degraded'
          : 'healthy';

      return success({
        status,
        checks,
        checkedAt: new Date(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure(Errors.internal(`Health probe error: ${msg}`));
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Individual checks
  // ──────────────────────────────────────────────────────────────────────

  /** Validate domain string to prevent command injection. */
  private static isValidDomain(domain: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$/.test(domain) && domain.length <= 253;
  }

  private async checkDns(
    domain: string,
    exec: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>,
  ): Promise<CheckResult> {
    const start = Date.now();
    if (!HealthProber.isValidDomain(domain)) {
      return { name: 'dns_resolution', status: 'fail', responseTimeMs: 0, detail: 'Invalid domain name' };
    }
    try {
      const result = await exec(`dig +short +time=5 ${domain}`);
      const elapsed = Date.now() - start;
      const resolved = result.stdout.trim();

      if (result.exitCode !== 0 || resolved.length === 0) {
        return { name: 'dns_resolution', status: 'fail', responseTimeMs: elapsed, detail: `${domain} did not resolve` };
      }

      return {
        name: 'dns_resolution',
        status: elapsed > 2000 ? 'warn' : 'pass',
        responseTimeMs: elapsed,
        detail: `Resolved to: ${resolved.split('\n')[0]}`,
      };
    } catch {
      return { name: 'dns_resolution', status: 'fail', responseTimeMs: Date.now() - start, detail: 'DNS check failed' };
    }
  }

  private async checkSsl(
    domain: string,
    exec: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>,
  ): Promise<CheckResult> {
    const start = Date.now();
    if (!HealthProber.isValidDomain(domain)) {
      return { name: 'ssl_certificate', status: 'fail', responseTimeMs: 0, detail: 'Invalid domain name' };
    }
    try {
      // Use openssl to check certificate expiry
      const result = await exec(
        `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null`,
      );
      const elapsed = Date.now() - start;

      if (result.exitCode !== 0 || !result.stdout.includes('notAfter')) {
        return { name: 'ssl_certificate', status: 'fail', responseTimeMs: elapsed, detail: 'SSL certificate not found or invalid' };
      }

      // Parse expiry date
      const match = result.stdout.match(/notAfter=(.+)/);
      if (match) {
        const expiryDate = new Date(match[1]!);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          return { name: 'ssl_certificate', status: 'fail', responseTimeMs: elapsed, detail: `Certificate expired ${-daysUntilExpiry} days ago` };
        }
        if (daysUntilExpiry < 14) {
          return { name: 'ssl_certificate', status: 'warn', responseTimeMs: elapsed, detail: `Certificate expires in ${daysUntilExpiry} days` };
        }
        return { name: 'ssl_certificate', status: 'pass', responseTimeMs: elapsed, detail: `Valid, expires in ${daysUntilExpiry} days` };
      }

      return { name: 'ssl_certificate', status: 'warn', responseTimeMs: elapsed, detail: 'Could not parse certificate expiry' };
    } catch {
      return { name: 'ssl_certificate', status: 'fail', responseTimeMs: Date.now() - start, detail: 'SSL check command failed' };
    }
  }

  private async checkHttp(
    config: HealthProbeConfig,
    fetchFn: typeof globalThis.fetch,
  ): Promise<CheckResult> {
    const start = Date.now();
    const timeoutMs = config.timeoutMs ?? 10_000;
    const expectedStatus = config.expectedStatusCode ?? 200;
    const maxResponseTime = config.maxResponseTimeMs ?? 5_000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetchFn(config.targetUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Scholarly-HealthProbe/1.0' },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - start;

      if (response.status !== expectedStatus) {
        return {
          name: 'http_availability',
          status: 'fail',
          responseTimeMs: elapsed,
          detail: `Expected ${expectedStatus}, got ${response.status}`,
        };
      }

      const status: CheckResult['status'] = elapsed > maxResponseTime ? 'warn' : 'pass';
      return {
        name: 'http_availability',
        status,
        responseTimeMs: elapsed,
        detail: `HTTP ${response.status} in ${elapsed}ms`,
      };
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        name: 'http_availability',
        status: 'fail',
        responseTimeMs: elapsed,
        detail: msg.includes('abort') ? `Timed out after ${timeoutMs}ms` : `Request failed: ${msg}`,
      };
    }
  }

  private async checkContent(
    config: HealthProbeConfig,
    fetchFn: typeof globalThis.fetch,
  ): Promise<CheckResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs ?? 10_000);

      const response = await fetchFn(config.targetUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Scholarly-HealthProbe/1.0' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const body = await response.text();
      const elapsed = Date.now() - start;

      const found = body.includes(config.contentMatch!);
      return {
        name: 'content_match',
        status: found ? 'pass' : 'fail',
        responseTimeMs: elapsed,
        detail: found
          ? `Found expected content: "${config.contentMatch!.slice(0, 50)}"`
          : `Expected content not found in response body`,
      };
    } catch {
      return { name: 'content_match', status: 'fail', responseTimeMs: Date.now() - start, detail: 'Content check request failed' };
    }
  }
}


// ============================================================================
// §3 — DEFAULT SHELL EXECUTOR
// ============================================================================

async function defaultShellExec(
  cmd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const result = await execAsync(cmd, { timeout: 15_000 });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? String(err),
      exitCode: e.code ?? 1,
    };
  }
}


// ============================================================================
// §4 — FACTORY
// ============================================================================

export function createHealthProber(options?: {
  fetchImpl?: typeof globalThis.fetch;
  shellExec?: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}): HealthProber {
  return new HealthProber(options);
}
