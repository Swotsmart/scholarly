/**
 * MathKernel Client
 * TypeScript client for the SageMath CAS microservice.
 *
 * DEPLOY TO: packages/api/src/services/mathkernel/mathkernel-client.ts
 *            (create the mathkernel/ directory if it doesn't exist)
 *
 * This client mirrors the pattern used by other service clients in the codebase.
 * It degrades gracefully: if MATH_KERNEL_URL is absent or the service is
 * unavailable, all methods return { available: false } so the calling code
 * can fall back to the Claude rubric path without crashing.
 *
 * The Kokoro lesson: the service can be fully implemented but silently useless
 * if the URL is never configured. This client surfaces that clearly.
 */

// Node 20+ has native fetch — no import needed

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CASVerifyRequest {
  type: 'roots' | 'derivative' | 'integral' | 'expression' | 'geometry' | 'statistics';
  expression?: string;
  studentAnswer?: string | number | number[];
  expectedValue?: number;
  dataset?: number[];
  statType?: 'mean' | 'stdev' | 'median';
}

export interface CASVerifyResponse {
  available: boolean;
  verified?: boolean;
  method?: string;
  reason?: string;
  casResult?: {
    expected: string;
    delta: number;
  };
}

export interface CASRubricCriterion {
  label: string;
  score: number;
  comment: string;
  verificationMethod: string;
  casVerified: boolean;
}

export interface CASRubricRequest {
  strand: 'functions' | 'geometry' | 'statistics';
  intent?: string;
  scores?: {
    visualisation: number;
    construction: number;
    elegance: number;
    curriculumHits: number;
  };
  // CAS verification hints
  expression?: string;
  claimedRoots?: number[];
  claimedDerivative?: string;
  claimedIntegral?: string;
  dataset?: number[];
  statType?: string;
  geometryType?: string;
  geometryExpected?: number;
  studentGeometryAnswer?: number;
}

export interface CASRubricResponse {
  available: boolean;
  criteria?: CASRubricCriterion[];
  narrative?: string;
  grade?: string;
  casVerified?: boolean;
  casMethod?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class MathKernelClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.MATH_KERNEL_URL || '').replace(/\/$/, '');
    this.timeoutMs = 15_000; // 15s — SageMath can take a moment for complex expressions
  }

  /**
   * Whether the MathKernel service is configured.
   * An absent URL means the Kokoro-class silent failure pattern — surface it clearly.
   */
  get isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  /**
   * Check service health. Returns false (not throws) if unreachable.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      const res = await this._fetch('/health', { method: 'GET' });
      const data = await res.json() as { status: string; sage_ready: boolean };
      return data.status === 'ok' && data.sage_ready;
    } catch {
      return false;
    }
  }

  /**
   * Verify a single mathematical expression or claim.
   * Returns { available: false } if the service is not configured or unreachable.
   */
  async verify(req: CASVerifyRequest): Promise<CASVerifyResponse> {
    if (!this.isConfigured) {
      return { available: false, reason: 'MATH_KERNEL_URL not configured' };
    }
    try {
      const res = await this._fetch('/verify', {
        method: 'POST',
        body: JSON.stringify({
          type: req.type,
          expression: req.expression,
          student_answer: req.studentAnswer,
          expected_value: req.expectedValue,
          dataset: req.dataset,
          stat_type: req.statType,
        }),
      });
      if (!res.ok) {
        return { available: true, verified: false, reason: `CAS returned ${res.status}` };
      }
      const data = await res.json() as {
        verified: boolean;
        method: string;
        reason: string;
        cas_result: { expected: string; delta: number } | null;
      };
      return {
        available: true,
        verified: data.verified,
        method: data.method,
        reason: data.reason,
        casResult: data.cas_result ?? undefined,
      };
    } catch (err) {
      return { available: false, reason: `CAS unreachable: ${(err as Error).message}` };
    }
  }

  /**
   * Generate a full CAS-verified rubric for a MathCanvas submission.
   * Falls back gracefully if CAS is unavailable — callers should handle
   * { available: false } by using the Claude rubric path.
   */
  async getRubric(req: CASRubricRequest): Promise<CASRubricResponse> {
    if (!this.isConfigured) {
      return { available: false, error: 'MATH_KERNEL_URL not configured — using Claude rubric' };
    }
    try {
      const res = await this._fetch('/rubric', {
        method: 'POST',
        body: JSON.stringify({
          strand: req.strand,
          intent: req.intent,
          scores: req.scores ? {
            visualisation: req.scores.visualisation,
            construction: req.scores.construction,
            elegance: req.scores.elegance,
            curriculum_hits: req.scores.curriculumHits,
          } : undefined,
          expression: req.expression,
          claimed_roots: req.claimedRoots,
          claimed_derivative: req.claimedDerivative,
          claimed_integral: req.claimedIntegral,
          dataset: req.dataset,
          stat_type: req.statType,
          geometry_type: req.geometryType,
          geometry_expected: req.geometryExpected,
          student_geometry_answer: req.studentGeometryAnswer,
        }),
      });
      if (!res.ok) {
        return { available: true, error: `CAS rubric error: ${res.status}` };
      }
      const data = await res.json() as {
        criteria: Array<{
          label: string;
          score: number;
          comment: string;
          verification_method: string;
          cas_verified: boolean;
        }>;
        narrative: string;
        grade: string;
        cas_verified: boolean;
        cas_method: string;
      };
      return {
        available: true,
        criteria: data.criteria.map(c => ({
          label: c.label,
          score: c.score,
          comment: c.comment,
          verificationMethod: c.verification_method,
          casVerified: c.cas_verified,
        })),
        narrative: data.narrative,
        grade: data.grade,
        casVerified: data.cas_verified,
        casMethod: data.cas_method,
      };
    } catch (err) {
      return { available: false, error: `CAS unreachable: ${(err as Error).message}` };
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _fetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    } as Parameters<typeof fetch>[1]).finally(() => clearTimeout(timer)) as unknown as Promise<Response>;
  }
}

// Singleton — instantiate once at module load
export const mathKernelClient = new MathKernelClient();
