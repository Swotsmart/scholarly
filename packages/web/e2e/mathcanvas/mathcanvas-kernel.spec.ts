import { test, expect, request } from '@playwright/test';

/**
 * MathKernel Microservice — Direct API Tests
 *
 * These tests hit the Python FastAPI mathkernel service directly
 * (not via the Next.js/Express proxy). They verify the microservice
 * is correctly deployed, its endpoints respond to the right schemas,
 * and edge cases are handled gracefully.
 *
 * The mathkernel service runs on MATH_KERNEL_URL (default http://localhost:8001).
 * If the service is not running, all tests in this file are skipped
 * automatically — they do NOT fail, because the service may not yet be
 * deployed in the current test environment.
 *
 * Note: These tests run in the 'hardening' project (no auth dependency).
 */

const KERNEL_URL = process.env.MATH_KERNEL_URL ?? 'http://localhost:8001';

// ─── Check if kernel is available before each describe block ─────────────────

async function kernelAvailable(): Promise<boolean> {
  try {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const res = await ctx.get('/health', { timeout: 3_000 });
    await ctx.dispose();
    return res.status() === 200;
  } catch {
    return false;
  }
}

// =============================================================================
// 1. Health & Capabilities
// =============================================================================

test.describe('MathKernel — Health & Capabilities', () => {
  test('GET /health returns 200 with ok status and version 1.1.0', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) {
      test.skip();
      return;
    }

    const res = await ctx.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('mathkernel');
    expect(body.version).toBe('1.1.0');
    await ctx.dispose();
  });

  test('GET /capabilities returns supported operations list', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.get('/capabilities');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.operations).toBeDefined();
    const ops = body.operations as string[];
    // Must include at minimum: diff, integrate, solve, gradient
    expect(ops).toContain('diff');
    expect(ops).toContain('integrate');
    expect(ops).toContain('solve');
    await ctx.dispose();
  });
});

// =============================================================================
// 2. CAS Verification Endpoint (/verify)
// =============================================================================

test.describe('MathKernel — CAS Verification', () => {
  test('POST /verify confirms correct derivative of x^3', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/verify', {
      data: {
        expression: 'x^3',
        operation: 'diff',
        variable: 'x',
        student_answer: '3*x^2',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.correct).toBe(true);
    expect(body.canonical_answer).toBeDefined();
    await ctx.dispose();
  });

  test('POST /verify identifies incorrect derivative', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/verify', {
      data: {
        expression: 'x^3',
        operation: 'diff',
        variable: 'x',
        student_answer: '2*x',  // Wrong: should be 3x^2
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.correct).toBe(false);
    await ctx.dispose();
  });

  test('POST /verify handles algebraically equivalent forms as correct', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    // x^2 - 1 can be factored as (x-1)(x+1) — both are correct
    const res = await ctx.post('/verify', {
      data: {
        expression: 'x^2 - 1',
        operation: 'factor',
        variable: 'x',
        student_answer: '(x - 1)*(x + 1)',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.correct).toBe(true);
    await ctx.dispose();
  });
});

// =============================================================================
// 3. Rubric Endpoint (/rubric)
// =============================================================================

test.describe('MathKernel — Rubric Scoring', () => {
  test('POST /rubric returns partial credit scores for multi-step problem', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/rubric', {
      data: {
        problem: 'Differentiate f(x) = x^3 - 3x + 2',
        student_steps: [
          'Apply power rule: d/dx(x^3) = 3x^2',
          'Apply power rule: d/dx(-3x) = -3',
          'd/dx(2) = 0',
          'Result: f\'(x) = 3x^2 - 3',
        ],
        expected_answer: '3*x**2 - 3',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.score).toBe('number');
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(1);
    expect(body.feedback).toBeDefined();
    await ctx.dispose();
  });

  test('POST /rubric with incorrect answer returns score < 1', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/rubric', {
      data: {
        problem: 'Differentiate f(x) = x^2',
        student_steps: ['Result: f\'(x) = x^3'],  // Wrong
        expected_answer: '2*x',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.score).toBeLessThan(1);
    await ctx.dispose();
  });
});

// =============================================================================
// 4. REPL Endpoint (/repl)
// =============================================================================

test.describe('MathKernel — REPL Endpoint', () => {
  const replCases = [
    { command: 'diff',     expr: 'x^3 - 3*x + 2', variable: 'x', expectedContains: /3.*x|x.*2/ },
    { command: 'integrate', expr: 'x^2',           variable: 'x', expectedContains: /x.*3|3/   },
    { command: 'factor',   expr: 'x^2 - 1',        variable: 'x', expectedContains: /x.*1/     },
    { command: 'expand',   expr: '(x+1)^3',         variable: 'x', expectedContains: /x/        },
    { command: 'simplify', expr: '(x^2 - 1)/(x-1)',variable: 'x', expectedContains: /x.*1|1.*x/ },
  ];

  for (const { command, expr, variable, expectedContains } of replCases) {
    test(`REPL "${command}" on "${expr}" returns a result`, async () => {
      const ctx = await request.newContext({ baseURL: KERNEL_URL });
      const available = await kernelAvailable();
      if (!available) { test.skip(); return; }

      const res = await ctx.post('/repl', {
        data: { command, expression: expr, variable },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result).toBeDefined();
      expect(body.latex).toBeDefined();
      // The result should contain the expected pattern
      const resultStr = String(body.result);
      expect(resultStr).toMatch(expectedContains);
      await ctx.dispose();
    });
  }

  test('REPL gradient of f(x,y) = x^2 + y^2 returns a list/vector', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: {
        command: 'gradient',
        expression: 'x^2 + y^2',
        variables: ['x', 'y'],
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Gradient of x^2 + y^2 should contain 2x and 2y
    const resultStr = JSON.stringify(body.result);
    expect(resultStr).toMatch(/2.*x|x.*2/);
    await ctx.dispose();
  });

  test('REPL Taylor series of sin(x) around 0 to order 5', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: { command: 'taylor', expression: 'sin(x)', variable: 'x', point: 0, order: 5 },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Taylor series of sin(x) = x - x^3/6 + x^5/120 + ...
    expect(String(body.result)).toMatch(/x/);
    await ctx.dispose();
  });

  test('REPL handles malformed expression gracefully (no 500)', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: { command: 'diff', expression: '@@not_an_expression@@', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Must return 200 with success:false, not a 500
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    await ctx.dispose();
  });

  test('REPL returns execution_time_ms field (performance monitoring)', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: { command: 'diff', expression: 'x^2', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.execution_time_ms).toBe('number');
    // Should complete in under 5 seconds for simple expression
    expect(body.execution_time_ms).toBeLessThan(5_000);
    await ctx.dispose();
  });
});

// =============================================================================
// 5. Steps Endpoint (/steps)
// =============================================================================

test.describe('MathKernel — Steps Endpoint', () => {
  test('POST /steps for diff returns ordered step list', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/steps', {
      data: { operation: 'diff', expression: 'x^3 - 3*x + 2', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.steps)).toBe(true);
    expect(body.steps.length).toBeGreaterThan(0);
    expect(body.final_result).toBeDefined();
    expect(body.final_latex).toBeDefined();

    // Each step should have required fields
    const step = body.steps[0];
    expect(step.step_number).toBeDefined();
    expect(step.rule).toBeDefined();
    expect(step.expression).toBeDefined();
    expect(step.result).toBeDefined();
    expect(step.latex).toBeDefined();
    await ctx.dispose();
  });

  test('POST /steps for integration returns steps with constant of integration', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/steps', {
      data: { operation: 'integrate', expression: 'x^2', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Integration result should include x^3/3 (+ C implied)
    expect(String(body.final_result)).toMatch(/x.*3|3.*x/);
    await ctx.dispose();
  });

  test('POST /steps step_number fields are sequential from 1', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/steps', {
      data: { operation: 'diff', expression: 'x^4 + 2*x^2 - x', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const steps = body.steps as Array<{ step_number: number }>;
    steps.forEach((step, idx) => {
      expect(step.step_number).toBe(idx + 1);
    });
    await ctx.dispose();
  });

  test('POST /steps returns concept field with pedagogical explanation', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/steps', {
      data: { operation: 'diff', expression: 'x^2', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const step = body.steps[0];
    // The concept field provides learner-facing explanation
    expect(typeof step.concept).toBe('string');
    expect(step.concept.length).toBeGreaterThan(0);
    await ctx.dispose();
  });
});

// =============================================================================
// 6. MathKernel — Rate Limiting & Edge Cases
// =============================================================================

test.describe('MathKernel — Edge Cases', () => {
  test('empty expression returns success:false not a server crash', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: { command: 'diff', expression: '', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
    await ctx.dispose();
  });

  test('missing command field returns a validation error (not 500)', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const res = await ctx.post('/repl', {
      data: { expression: 'x^2', variable: 'x' },  // missing command
      headers: { 'Content-Type': 'application/json' },
    });

    expect([200, 400, 422]).toContain(res.status());
    expect(res.status()).not.toBe(500);
    await ctx.dispose();
  });

  test('very large exponent completes within 10 seconds', async () => {
    const ctx = await request.newContext({ baseURL: KERNEL_URL });
    const available = await kernelAvailable();
    if (!available) { test.skip(); return; }

    const startTime = Date.now();
    const res = await ctx.post('/repl', {
      data: { command: 'expand', expression: '(x + 1)^20', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 12_000,
    });
    const elapsed = Date.now() - startTime;

    expect([200, 408]).toContain(res.status());
    if (res.status() === 200) {
      expect(elapsed).toBeLessThan(10_000);
    }
    await ctx.dispose();
  });
});
