/**
 * MathKernel Client — Chunk 5 Extension
 *
 * Adds REPL and Steps endpoints to the existing mathkernel-client.ts.
 * This file is a PATCH — merge its contents into the end of
 * packages/api/src/services/mathkernel/mathkernel-client.ts
 *
 * ─────────────────────────────────────────────────────────────────────
 * DEPLOYMENT NOTE:
 *   Append everything below the "PATCH START" marker into
 *   mathkernel-client.ts, above the final closing brace if any.
 *   The existing kernelClient object gains two new namespaces: repl and steps.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── PATCH START ────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface REPLRequest {
  command: string;             // "diff" | "integrate" | "solve" | "factor" | "expand" | "simplify" | "partial" | "gradient" | "taylor" | "limit" | "evaluate"
  expression: string;
  variable?: string;           // default "x"
  variables?: string[];        // for gradient (["x","y"])
  lower?: number;              // definite integral lower bound
  upper?: number;              // definite integral upper bound
  point?: number;              // Taylor expansion point / limit target
  order?: number;              // Taylor series order (default 5)
}

export interface REPLResponse {
  success: boolean;
  command: string;
  expression: string;
  result: string;              // plain-text CAS result
  latex: string;               // LaTeX for KaTeX rendering
  numeric?: number | null;     // numeric approximation where meaningful
  steps_available: boolean;    // whether /steps can produce working
  error?: string | null;
}

export interface WorkingStep {
  step_number: number;
  rule: string;                // e.g. "Power Rule", "Sum Rule"
  explanation: string;         // full sentence
  expression: string;          // plain-text after this step
  latex: string;               // LaTeX after this step
  note?: string | null;        // teacher annotation
}

export interface StepsRequest {
  operation: string;           // "diff" | "integrate" | "factor" | "solve" | "simplify" | "expand" | "partial_x" | "partial_y" | "gradient"
  expression: string;
  variable?: string;
  lower?: number;
  upper?: number;
}

export interface StepsResponse {
  success: boolean;
  operation: string;
  expression: string;
  final_result: string;
  final_latex: string;
  steps: WorkingStep[];
  concept_note?: string | null;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// REPL demo responses — returned when MATH_KERNEL_URL is not configured
// ---------------------------------------------------------------------------

function demoREPLResponse(req: REPLRequest): REPLResponse {
  const demos: Record<string, Partial<REPLResponse>> = {
    diff: {
      result: '3*x^2 - 3',
      latex: '3x^{2} - 3',
      numeric: 0,
      steps_available: true,
    },
    integrate: {
      result: 'x^3 - 3*x',
      latex: 'x^{3} - 3x + C',
      steps_available: true,
    },
    factor: {
      result: '(x - sqrt(3))*(x + sqrt(3))*(x - 1)*(x + 1)',
      latex: '(x - \\sqrt{3})(x + \\sqrt{3})(x - 1)(x + 1)',
      steps_available: true,
    },
    solve: {
      result: 'x = -1, x = 1',
      latex: 'x = -1,\\; x = 1',
      steps_available: true,
    },
    gradient: {
      result: '[2*x, 2*y]',
      latex: '\\nabla f = [2x,\\; 2y]',
      steps_available: true,
    },
    simplify: {
      result: 'x^2 + 2*x + 1',
      latex: 'x^{2} + 2x + 1',
      steps_available: true,
    },
    partial: {
      result: '2*x + y',
      latex: '2x + y',
      steps_available: true,
    },
  };

  const d = demos[req.command] ?? { result: '(demo)', latex: '\\text{demo}', steps_available: false };

  return {
    success: true,
    command: req.command,
    expression: req.expression,
    result: d.result ?? '',
    latex: d.latex ?? '',
    numeric: d.numeric ?? null,
    steps_available: d.steps_available ?? false,
    error: null,
  };
}

function demoStepsResponse(req: StepsRequest): StepsResponse {
  return {
    success: true,
    operation: req.operation,
    expression: req.expression,
    final_result: '3*x^2 - 3',
    final_latex: '3x^{2} - 3',
    steps: [
      {
        step_number: 1,
        rule: 'Identify',
        explanation: `We want to find d/dx[${req.expression}].`,
        expression: req.expression,
        latex: req.expression,
        note: null,
      },
      {
        step_number: 2,
        rule: 'Power Rule',
        explanation: 'd/dx[x³] = 3x²  (multiply by power, reduce power by 1)',
        expression: '3*x^2',
        latex: '3x^{2}',
        note: null,
      },
      {
        step_number: 3,
        rule: 'Constant Rule',
        explanation: 'd/dx[−3] = 0  (constants differentiate to zero)',
        expression: '0',
        latex: '0',
        note: null,
      },
      {
        step_number: 4,
        rule: 'Combine',
        explanation: 'Combine differentiated terms: 3x² − 3',
        expression: '3*x^2 - 3',
        latex: '3x^{2} - 3',
        note: null,
      },
    ],
    concept_note:
      'The derivative gives the instantaneous rate of change at any point on the curve.',
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Client extensions — append to kernelClient in mathkernel-client.ts
// ---------------------------------------------------------------------------

/**
 * Evaluate a single REPL command against the SageMath kernel.
 * Degrades to demo response when MATH_KERNEL_URL is not set.
 */
export async function replEvaluate(req: REPLRequest): Promise<REPLResponse> {
  const baseUrl = process.env.MATH_KERNEL_URL;
  if (!baseUrl) {
    return demoREPLResponse(req);
  }
  try {
    const res = await fetch(`${baseUrl}/repl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`MathKernel /repl ${res.status}`);
    return await res.json() as REPLResponse;
  } catch (err) {
    return {
      success: false,
      command: req.command,
      expression: req.expression,
      result: '',
      latex: '',
      steps_available: false,
      error: err instanceof Error ? err.message : 'MathKernel unavailable',
    };
  }
}

/**
 * Generate step-by-step working for an operation.
 * Degrades to demo steps when MATH_KERNEL_URL is not set.
 */
export async function stepsGenerate(req: StepsRequest): Promise<StepsResponse> {
  const baseUrl = process.env.MATH_KERNEL_URL;
  if (!baseUrl) {
    return demoStepsResponse(req);
  }
  try {
    const res = await fetch(`${baseUrl}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`MathKernel /steps ${res.status}`);
    return await res.json() as StepsResponse;
  } catch (err) {
    return {
      success: false,
      operation: req.operation,
      expression: req.expression,
      final_result: '',
      final_latex: '',
      steps: [],
      error: err instanceof Error ? err.message : 'MathKernel unavailable',
    };
  }
}

// ─── PATCH END ──────────────────────────────────────────────────────────────
