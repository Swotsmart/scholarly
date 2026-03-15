/**
 * MathCanvas REPL + Steps API Routes
 *
 * Proxies browser requests to the mathkernel Python microservice.
 * This follows the same pattern as the existing voice service proxy —
 * the browser never talks directly to port 8001.
 *
 * Routes:
 *   POST /api/mathcanvas/repl    → mathkernel /repl
 *   POST /api/mathcanvas/steps   → mathkernel /steps
 *   GET  /api/mathcanvas/health  → mathkernel /health (for UI status badge)
 *
 * Degrades gracefully when MATH_KERNEL_URL is not set:
 *   Returns demo responses so the UI is always functional.
 *
 * Mount in packages/api/src/index.ts:
 *   import mathcanvasRoutes from './routes/mathcanvas.routes';
 *   app.use('/api/mathcanvas', mathcanvasRoutes);
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All REPL/steps routes require authentication
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const REPLRequestSchema = z.object({
  command: z.string().min(1).max(50),
  expression: z.string().min(1).max(500),
  variable: z.string().max(10).optional().default('x'),
  variables: z.array(z.string()).optional(),
  lower: z.number().optional(),
  upper: z.number().optional(),
  point: z.number().optional(),
  order: z.number().int().min(1).max(20).optional(),
});

const StepsRequestSchema = z.object({
  operation: z.enum(['diff','integrate','factor','solve','simplify','expand','partial_x','partial_y','gradient']),
  expression: z.string().min(1).max(500),
  variable: z.string().max(10).optional().default('x'),
  lower: z.number().optional(),
  upper: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Proxy helper
// ---------------------------------------------------------------------------

async function proxyToKernel(path: string, body: unknown): Promise<unknown> {
  const baseUrl = process.env.MATH_KERNEL_URL;
  if (!baseUrl) {
    throw new Error('MATH_KERNEL_URL not configured — returning demo mode');
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`MathKernel ${path} returned ${res.status}`);
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// Demo responses (when MATH_KERNEL_URL not set)
// ---------------------------------------------------------------------------

function demoREPL(body: { command: string; expression: string }) {
  return {
    success: true,
    command: body.command,
    expression: body.expression,
    result: 'Demo mode — connect MATH_KERNEL_URL for live CAS',
    latex: '\\text{Demo mode}',
    numeric: null,
    steps_available: true,
    error: null,
  };
}

function demoSteps(body: { operation: string; expression: string }) {
  return {
    success: true,
    operation: body.operation,
    expression: body.expression,
    final_result: 'Demo',
    final_latex: '\\text{Demo mode — connect MATH\\_KERNEL\\_URL}',
    steps: [
      {
        step_number: 1,
        rule: 'Demo',
        explanation: 'Set MATH_KERNEL_URL to connect to the SageMath kernel for real step-by-step working.',
        expression: body.expression,
        latex: body.expression,
        note: null,
      },
    ],
    concept_note: null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/health', async (_req: Request, res: Response) => {
  const baseUrl = process.env.MATH_KERNEL_URL;
  if (!baseUrl) {
    return res.json({ status: 'demo', sage_ready: false, repl_ready: false, steps_ready: false });
  }
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ status: 'unavailable', sage_ready: false });
  }
});

router.post('/repl', async (req: Request, res: Response) => {
  const parsed = REPLRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  try {
    const result = await proxyToKernel('/repl', parsed.data);
    return res.json(result);
  } catch (err) {
    // Graceful degradation — return demo if kernel unreachable
    const msg = err instanceof Error ? err.message : 'Kernel unavailable';
    if (msg.includes('demo mode') || msg.includes('MATH_KERNEL_URL')) {
      return res.json(demoREPL(parsed.data as { command: string; expression: string }));
    }
    return res.status(503).json({ success: false, error: msg, result: '', latex: '', steps_available: false });
  }
});

router.post('/steps', async (req: Request, res: Response) => {
  const parsed = StepsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  try {
    const result = await proxyToKernel('/steps', parsed.data);
    return res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kernel unavailable';
    if (msg.includes('demo mode') || msg.includes('MATH_KERNEL_URL')) {
      return res.json(demoSteps(parsed.data as { operation: string; expression: string }));
    }
    return res.status(503).json({ success: false, error: msg, final_result: '', final_latex: '', steps: [] });
  }
});

export default router;
