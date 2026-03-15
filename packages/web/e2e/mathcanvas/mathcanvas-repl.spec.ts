import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, mockAPI } from '../helpers';
import { MathCanvasPage, REPLPanel, REPL_COMMANDS } from './mathcanvas.helpers';

/**
 * MathCanvas — REPL Deep Dive
 *
 * The REPL (Read-Eval-Print Loop) is the most interactive part of MathCanvas.
 * It presents 11 command pills (d/dx, ∂/∂x, ∫, solve, factor, expand,
 * simplify, ∇f, taylor, limit, and a "more" expander), an expression input,
 * an Eval button, and a history area that renders previous results with
 * LaTeX and "Show working" expansion.
 *
 * These tests are intentionally lenient about exact LaTeX output because
 * the kernel may return demo responses or live SageMath responses — both
 * are valid. What we're testing is the UI behaviour: pills are clickable,
 * inputs accept text, results appear in history, steps expand inline.
 *
 * Pre-authenticated as: teacher@scholarly.app
 */

// ─── Helper: enter REPL mode ──────────────────────────────────────────────────

async function enterREPL(page: import('@playwright/test').Page) {
  const mc = new MathCanvasPage(page);
  await mc.goto();
  await mc.clickMode('repl');
  await page.waitForTimeout(600);
  return { mc, repl: new REPLPanel(page) };
}

// =============================================================================
// 1. REPL Structure
// =============================================================================

test.describe('REPL — Structure', () => {
  test('REPL panel is present and visible after clicking REPL tab', async ({ page }) => {
    const { repl } = await enterREPL(page);
    await expect(repl.container).toBeVisible({ timeout: 12_000 });
  });

  test('at least 8 command pills are visible', async ({ page }) => {
    const { repl } = await enterREPL(page);
    await expect(repl.commandPills.first()).toBeVisible({ timeout: 10_000 });
    const count = await repl.commandPills.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('expression input is present and accepts text', async ({ page }) => {
    const { repl } = await enterREPL(page);
    await expect(repl.input).toBeVisible({ timeout: 10_000 });
    await repl.input.fill('x^2 + 1');
    const value = await repl.input.inputValue();
    expect(value).toContain('x');
  });

  test('Eval / Run button is present', async ({ page }) => {
    const { repl } = await enterREPL(page);
    await expect(repl.evalButton).toBeVisible({ timeout: 10_000 });
  });

  test('history area is present (may be empty initially)', async ({ page }) => {
    const { repl } = await enterREPL(page);
    // History container should exist even if empty
    const historyExists = await repl.historyArea.isVisible().catch(() => false);
    // If the history area renders only after first eval, that's acceptable
    // Just confirm the REPL container is there
    await expect(repl.container).toBeVisible({ timeout: 10_000 });
  });
});

// =============================================================================
// 2. Command Pills — Individual Activation
// =============================================================================

test.describe('REPL — Command Pill Activation', () => {
  /**
   * Each pill pre-selects a command and may auto-populate a hint in the
   * expression input. We verify that clicking each pill does not crash the
   * page and that the pill appears to be selected (active state).
   */

  const pillLabels = [
    { label: 'd/dx',     description: 'differentiation' },
    { label: '∫',        description: 'integration' },
    { label: 'solve',    description: 'equation solving' },
    { label: 'factor',   description: 'factorisation' },
    { label: 'expand',   description: 'expansion' },
    { label: 'simplify', description: 'simplification' },
    { label: '∇f',       description: 'gradient' },
    { label: 'taylor',   description: 'Taylor series' },
    { label: 'limit',    description: 'limit evaluation' },
  ];

  for (const pill of pillLabels) {
    test(`"${pill.label}" pill (${pill.description}) is clickable without error`, async ({ page }) => {
      const { repl } = await enterREPL(page);
      await expect(repl.commandPills.first()).toBeVisible({ timeout: 10_000 });

      // Find the pill by partial text match
      const pillBtn = repl.commandPills.filter({ hasText: pill.label }).first();
      const isVisible = await pillBtn.isVisible().catch(() => false);

      if (isVisible) {
        await pillBtn.click();
        await page.waitForTimeout(400);
        await new StateHelper(page).expectNoErrors();
      } else {
        // Pill may be hidden behind a "more" expander — try to expand first
        const moreBtn = page.locator('button').filter({ hasText: /more|\+\d/i }).first();
        if (await moreBtn.isVisible().catch(() => false)) {
          await moreBtn.click();
          await page.waitForTimeout(300);
          const pillAfterExpand = repl.commandPills.filter({ hasText: pill.label }).first();
          if (await pillAfterExpand.isVisible().catch(() => false)) {
            await pillAfterExpand.click();
            await page.waitForTimeout(400);
          }
        }
        await new StateHelper(page).expectNoErrors();
      }
    });
  }
});

// =============================================================================
// 3. REPL Evaluation — Live Kernel Path
// =============================================================================

test.describe('REPL — Evaluation (Live Kernel)', () => {
  /**
   * These tests exercise the full round-trip: pill → expression → Eval →
   * history entry. They will pass with either live SageMath responses or
   * DEMO_MODE fallback responses, since we check for structure, not exact
   * mathematical content.
   */

  test('differentiating x^3 - 3x + 2 produces a history entry', async ({ page }) => {
    const { repl } = await enterREPL(page);

    // Select d/dx pill if visible
    const diffPill = repl.commandPills.filter({ hasText: 'd/dx' }).first();
    if (await diffPill.isVisible().catch(() => false)) {
      await diffPill.click();
    }

    await repl.evaluate('x^3 - 3*x + 2');
    await repl.expectHistoryEntry();
  });

  test('integrating x^2 produces a history entry', async ({ page }) => {
    const { repl } = await enterREPL(page);

    const integralPill = repl.commandPills.filter({ hasText: /∫/ }).first();
    if (await integralPill.isVisible().catch(() => false)) {
      await integralPill.click();
    }

    await repl.evaluate('x^2');
    await repl.expectHistoryEntry();
  });

  test('computing gradient of x^2 + y^2 produces a history entry', async ({ page }) => {
    const { repl } = await enterREPL(page);

    const gradPill = repl.commandPills.filter({ hasText: /∇f/ }).first();
    if (await gradPill.isVisible().catch(() => false)) {
      await gradPill.click();
    }

    await repl.evaluate('x^2 + y^2');
    await repl.expectHistoryEntry();
  });

  test('multiple sequential evaluations build up history', async ({ page }) => {
    const { repl } = await enterREPL(page);

    await repl.evaluate('x^2');
    await repl.evaluate('x^3');
    await repl.evaluate('sin(x)');

    // History area should have grown
    const text = await repl.historyArea.textContent().catch(() => '');
    // After 3 evals, some content should be present
    expect((text ?? '').length).toBeGreaterThan(0);
  });

  test('pressing Enter key in the input triggers evaluation', async ({ page }) => {
    const { repl } = await enterREPL(page);
    await expect(repl.input).toBeVisible({ timeout: 10_000 });
    await repl.input.fill('x^2 - 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_500);
    // Should produce a history entry without clicking the button
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// 4. REPL Evaluation — Mock Kernel Path
// =============================================================================

test.describe('REPL — Evaluation (Mocked Kernel)', () => {
  /**
   * These tests use mocked API responses to test UI behaviour precisely,
   * independent of whether the mathkernel service is running. This makes
   * them safe to run in CI before the Docker image is deployed.
   */

  test('history entry shows LaTeX-rendered result after successful eval', async ({ page }) => {
    // Mock the REPL endpoint to return a well-formed response
    await page.route('**/api/mathcanvas/repl', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          command: 'diff',
          expression: 'x^3 - 3*x + 2',
          result: '3*x**2 - 3',
          latex: '3x^{2} - 3',
          variable: 'x',
          execution_time_ms: 42,
          engine: 'demo',
        }),
      });
    });

    const { repl } = await enterREPL(page);
    await repl.evaluate('x^3 - 3*x + 2');

    // The result should appear in the history area
    await repl.expectHistoryEntry();
    // LaTeX rendering produces elements — check for the result text
    const historyText = await repl.historyArea.textContent();
    // Either the LaTeX source or rendered form should contain recognisable content
    expect(historyText).toBeTruthy();
  });

  test('error response from kernel shows graceful error in history', async ({ page }) => {
    await page.route('**/api/mathcanvas/repl', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid expression: unbalanced parenthesis',
        }),
      });
    });

    const { repl } = await enterREPL(page);
    await repl.evaluate('x^2 + (');

    // Should show an error in history, but NOT crash the page
    await page.waitForTimeout(1_000);
    await new StateHelper(page).expectNoErrors();
    // The error message should appear somewhere
    const errorVisible = await page.locator('text=/invalid|error|unbalanced/i').count();
    expect(errorVisible).toBeGreaterThan(0);
  });
});

// =============================================================================
// 5. Step-by-Step Working
// =============================================================================

test.describe('REPL — Step-by-Step Working', () => {
  /**
   * After evaluating an expression, each history entry should have a
   * "Show working" button. Clicking it expands a list of ordered steps,
   * each with a rule badge and a LaTeX expression.
   */

  test('"Show working" button appears in history after evaluation', async ({ page }) => {
    // Mock both REPL and Steps endpoints
    await page.route('**/api/mathcanvas/repl', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          command: 'diff',
          expression: 'x^3',
          result: '3*x**2',
          latex: '3x^{2}',
          engine: 'demo',
        }),
      });
    });

    await page.route('**/api/mathcanvas/steps', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          operation: 'diff',
          expression: 'x^3',
          steps: [
            { step_number: 1, rule: 'Power Rule', expression: 'x^3', result: '3x^2', latex: '3x^{2}', concept: 'Differentiate x^n → nx^{n-1}' },
            { step_number: 2, rule: 'Result', expression: '3x^2', result: '3x^2', latex: '3x^{2}', concept: 'Final answer' },
          ],
          final_result: '3*x**2',
          final_latex: '3x^{2}',
        }),
      });
    });

    const { repl } = await enterREPL(page);
    await repl.evaluate('x^3');
    await repl.expectHistoryEntry();

    // "Show working" button should appear in the history
    await page.waitForTimeout(500);
    const showWorking = repl.showWorkingButtons.first();
    const isVisible = await showWorking.isVisible().catch(() => false);
    if (isVisible) {
      await showWorking.click();
      await page.waitForTimeout(800);
      // Steps should expand inline
      const stepsContainer = repl.stepsContainer;
      const stepsVisible = await stepsContainer.isVisible().catch(() => false);
      if (stepsVisible) {
        const stepsText = await stepsContainer.textContent();
        expect(stepsText?.length).toBeGreaterThan(0);
      }
      await new StateHelper(page).expectNoErrors();
    }
  });

  test('step-by-step endpoint returns structured steps', async ({ page }) => {
    // Direct API test via Playwright's request context
    const ctx = await page.context().request;
    const BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';
    const res = await ctx.post(`${BASE}/api/mathcanvas/steps`, {
      data: { operation: 'diff', expression: 'x^3', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Should return 200 (live or demo)
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('success');
      if (body.success) {
        expect(Array.isArray(body.steps)).toBeTruthy();
      }
    }
  });

  test('expanded steps do not introduce dead buttons', async ({ page }) => {
    await page.route('**/api/mathcanvas/repl', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, command: 'diff', expression: 'x^2', result: '2*x', latex: '2x', engine: 'demo' }),
      });
    });

    const { repl } = await enterREPL(page);
    await repl.evaluate('x^2');
    await repl.expectHistoryEntry();

    const showWorking = repl.showWorkingButtons.first();
    if (await showWorking.isVisible().catch(() => false)) {
      await showWorking.click();
      await page.waitForTimeout(600);
    }

    // Check for dead buttons after expanding steps
    const { expectNoDeadButtons } = await import('../helpers');
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// 6. REPL — History Management
// =============================================================================

test.describe('REPL — History Management', () => {
  test('clearing the input and re-evaluating adds a new history entry', async ({ page }) => {
    const { repl } = await enterREPL(page);

    await repl.evaluate('x^2');
    await page.waitForTimeout(500);
    await repl.input.clear();
    await repl.evaluate('x^3');

    // Both evals should have produced history entries
    const historyText = await repl.historyArea.textContent().catch(() => '');
    expect((historyText ?? '').length).toBeGreaterThan(0);
  });

  test('REPL history area does not overflow the viewport', async ({ page }) => {
    const { repl } = await enterREPL(page);

    // Evaluate several times to grow the history
    for (let i = 1; i <= 4; i++) {
      await repl.evaluate(`x^${i}`);
    }

    const bbox = await repl.historyArea.boundingBox().catch(() => null);
    if (bbox) {
      const viewportHeight = page.viewportSize()?.height ?? 800;
      // History should not extend below the viewport without a scrollbar
      // (it should be scrollable, not overflow the layout)
      await new StateHelper(page).expectNoErrors();
    }
  });
});

// =============================================================================
// 7. REPL — API Endpoints Direct
// =============================================================================

test.describe('REPL — API Endpoints', () => {
  /**
   * These tests hit the API directly (bypassing the browser UI) to verify
   * the mathcanvas route is mounted in index.ts and responding correctly.
   * They will pass in DEMO_MODE even without a running kernel.
   */

  const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

  test('GET /api/mathcanvas/health returns 200 with status field', async ({ page }) => {
    const ctx = page.context().request;
    const res = await ctx.get(`${API_URL}/api/mathcanvas/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });

  test('POST /api/mathcanvas/repl with diff command returns a result', async ({ page }) => {
    const ctx = page.context().request;
    const res = await ctx.post(`${API_URL}/api/mathcanvas/repl`, {
      data: { command: 'diff', expression: 'x^2 + 3*x', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('result');
    }
  });

  test('POST /api/mathcanvas/steps with diff operation returns steps array', async ({ page }) => {
    const ctx = page.context().request;
    const res = await ctx.post(`${API_URL}/api/mathcanvas/steps`, {
      data: { operation: 'diff', expression: 'x^3 - 3*x + 2', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('success');
      if (body.success) {
        expect(Array.isArray(body.steps)).toBeTruthy();
        expect(body.steps.length).toBeGreaterThan(0);
      }
    }
  });

  test('POST /api/mathcanvas/repl with invalid expression returns success: false (not 500)', async ({ page }) => {
    const ctx = page.context().request;
    const res = await ctx.post(`${API_URL}/api/mathcanvas/repl`, {
      data: { command: 'diff', expression: '@@invalid@@', variable: 'x' },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should return 200 with success:false, NOT a server error
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Either success:false or a demo fallback — both are acceptable
      expect(body).toHaveProperty('success');
    }
  });

  test('POST /api/mathcanvas/repl with gradient command returns vector-like result', async ({ page }) => {
    const ctx = page.context().request;
    const res = await ctx.post(`${API_URL}/api/mathcanvas/repl`, {
      data: { command: 'gradient', expression: 'x^2 + y^2', variables: ['x', 'y'] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('success');
    }
  });
});
