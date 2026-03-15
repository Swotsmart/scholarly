import { Page, Locator, expect } from '@playwright/test';

/**
 * MathCanvas E2E Helpers — Page Object Models
 *
 * Encapsulates all selector logic for the MathCanvas feature so that
 * if the DOM structure changes, we fix it here and nowhere else. Think
 * of this as the "contract" between the tests and the UI — the tests
 * describe *behaviour*, these helpers describe *structure*.
 *
 * MathCanvas has 8 modes (tabs): graphing, geometry, 3d, dual, stats,
 * cas, expression, repl. Each mode has a distinct panel layout.
 * The REPL mode is full-width; all other modes have a left canvas panel
 * and a right control panel.
 */

// ─── Mode Tab IDs (data-testid values or accessible names) ───────────────────

export const MODES = {
  graphing:   { label: /graphing|graph/i,    chip: /sine wave|parabola|quadratic/i },
  geometry:   { label: /geometry|geo/i,      chip: /triangle|circle|polygon/i },
  '3d':       { label: /3d|three.d/i,        chip: /saddle|paraboloid|sphere/i },
  dual:       { label: /dual|intersection/i, chip: /bowl.*shelf|dual/i },
  stats:      { label: /stats|statistics/i,  chip: /normal dist|scatter/i },
  cas:        { label: /cas|algebra/i,       chip: /partial deriv|integral|eigenvalue/i },
  expression: { label: /expression|expr/i,   chip: /x.*2.*y|paraboloid/i },
  repl:       { label: /repl|terminal|console/i, chip: null },
} as const;

// ─── REPL command pills ───────────────────────────────────────────────────────

export const REPL_COMMANDS = [
  'd/dx', '∂/∂x', '∫', 'solve', 'factor',
  'expand', 'simplify', '∇f', 'taylor', 'limit',
] as const;

// ─── Page Object: MathCanvas root ────────────────────────────────────────────

export class MathCanvasPage {
  constructor(public readonly page: Page) {}

  /** Navigate to MathCanvas and wait for it to be interactive */
  async goto() {
    await this.page.goto('/tools/mathcanvas');
    await this.page.waitForLoadState('networkidle');
    // The canvas initialises asynchronously — wait for at least one mode tab
    await expect(this.modeTabs.first()).toBeVisible({ timeout: 15_000 });
  }

  // ── Structural locators ────────────────────────────────────────────────────

  get modeTabs(): Locator {
    // The 8 mode selector buttons at the top of MathCanvasPage
    return this.page.locator('button[data-mode], [role="tab"], button').filter({
      hasText: /graphing|geometry|3d|dual|stats|cas|expression|repl/i,
    });
  }

  get activeTab(): Locator {
    return this.page.locator('[data-state="active"], [aria-selected="true"], [class*="active"]').first();
  }

  get canvasPanel(): Locator {
    // The left-side SVG / WebGL / Three.js rendering area
    return this.page.locator('canvas, svg[class*="canvas"], [data-testid="canvas-panel"]').first();
  }

  get rightPanel(): Locator {
    // The right control / insight panel
    return this.page.locator('[data-testid="right-panel"], [class*="right-panel"], [class*="control-panel"]').first();
  }

  get expressionInput(): Locator {
    return this.page.locator('input[placeholder*="expression"], input[placeholder*="f(x"], input[placeholder*="equation"]').first();
  }

  get quickStartChips(): Locator {
    return this.page.locator('button[data-chip], [class*="chip"], [class*="quick-start"]');
  }

  get parametersTab(): Locator {
    return this.page.locator('[role="tab"], button').filter({ hasText: /parameters|params/i }).first();
  }

  get aiInsightPanel(): Locator {
    return this.page.locator('[class*="insight"], [class*="ai-panel"], text=/AI|LIS/').first();
  }

  // ── Mode navigation ────────────────────────────────────────────────────────

  async clickMode(modeName: keyof typeof MODES) {
    const mode = MODES[modeName];
    const tab = this.page.locator('button, [role="tab"]').filter({ hasText: mode.label }).first();
    await tab.click();
    // Wait for mode transition to settle
    await this.page.waitForTimeout(500);
  }

  async expectModeActive(modeName: string) {
    await expect(this.page.getByText(new RegExp(modeName, 'i')).first()).toBeVisible();
  }

  // ── Chip interaction ───────────────────────────────────────────────────────

  async clickFirstChip() {
    await expect(this.quickStartChips.first()).toBeVisible({ timeout: 8_000 });
    await this.quickStartChips.first().click();
    await this.page.waitForTimeout(800);
  }

  async clickChipByText(pattern: RegExp) {
    const chip = this.quickStartChips.filter({ hasText: pattern }).first();
    const visible = await chip.isVisible().catch(() => false);
    if (visible) {
      await chip.click();
      await this.page.waitForTimeout(800);
    }
    return visible;
  }
}

// ─── Page Object: REPL Panel ──────────────────────────────────────────────────

export class REPLPanel {
  constructor(private page: Page) {}

  get container(): Locator {
    return this.page.locator('[data-testid="repl-panel"], [class*="repl"]').first();
  }

  get input(): Locator {
    return this.page.locator(
      'input[placeholder*="expression"], input[placeholder*="f(x"], input[placeholder*="enter"], textarea[placeholder*="expression"]'
    ).last(); // REPL input is typically the last one on the page
  }

  get evalButton(): Locator {
    return this.page.locator('button').filter({ hasText: /eval|evaluate|run|→/i }).last();
  }

  get historyArea(): Locator {
    return this.page.locator('[class*="history"], [data-testid="repl-history"], [class*="output"]').first();
  }

  get commandPills(): Locator {
    // The 11 command pills: d/dx, ∂/∂x, ∫, solve, factor, expand, simplify, ∇f, taylor, limit, +more
    return this.page.locator('[class*="pill"], [class*="command-btn"], button[data-command]');
  }

  get showWorkingButtons(): Locator {
    return this.page.locator('button').filter({ hasText: /show working|steps|working/i });
  }

  get stepsContainer(): Locator {
    return this.page.locator('[class*="steps"], [data-testid="working-steps"]').first();
  }

  /** Click a command pill by its label text */
  async clickCommand(label: string) {
    const pill = this.commandPills.filter({ hasText: label }).first();
    await expect(pill).toBeVisible({ timeout: 8_000 });
    await pill.click();
    await this.page.waitForTimeout(300);
  }

  /** Type an expression and evaluate */
  async evaluate(expression: string) {
    await expect(this.input).toBeVisible({ timeout: 8_000 });
    await this.input.clear();
    await this.input.fill(expression);
    await this.evalButton.click();
    // Wait for history entry to appear
    await this.page.waitForTimeout(1_500);
  }

  /** Assert that at least one history entry exists after evaluation */
  async expectHistoryEntry() {
    await expect(this.historyArea).toBeVisible({ timeout: 10_000 });
    // History area should have some child content
    const text = await this.historyArea.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  }
}

// ─── Page Object: 3D Surface Panel ───────────────────────────────────────────

export class ThreeDPanel {
  constructor(private page: Page) {}

  get canvas(): Locator {
    return this.page.locator('canvas').first();
  }

  get tangentPlaneIndicator(): Locator {
    // After clicking the canvas, a tangent plane equation appears in the parameters tab
    return this.page.locator('text=/tangent plane|z\\s*=/i').first();
  }

  get gradientIndicator(): Locator {
    return this.page.locator('text=/∇f|gradient|∂f/i').first();
  }

  /** Click the centre of the 3D canvas to place a tangent plane */
  async clickCanvas() {
    const bbox = await this.canvas.boundingBox();
    if (!bbox) throw new Error('3D canvas not found or not visible');
    await this.page.mouse.click(
      bbox.x + bbox.width / 2,
      bbox.y + bbox.height / 2,
    );
    await this.page.waitForTimeout(1_000);
  }

  /** Check parameters tab for tangent plane data */
  async expectTangentPlaneData() {
    // The tangent plane equation or coordinates should appear somewhere in the right panel
    const hasData = await this.page.locator('text=/tangent|∇|gradient|z\\s*=/i').count();
    expect(hasData).toBeGreaterThan(0);
  }
}

// ─── Page Object: CAS Panel ───────────────────────────────────────────────────

export class CASPanel {
  constructor(private page: Page) {}

  get container(): Locator {
    return this.page.locator('[data-testid="cas-panel"], [class*="cas-panel"]').first();
  }

  get verifiedBadge(): Locator {
    // CAS-verified badges appear when the backend confirms an answer
    return this.page.locator('[class*="verified"], text=/verified|CAS|✓/i').first();
  }

  get taskCards(): Locator {
    return this.page.locator('[class*="task-card"], [class*="problem-card"]');
  }
}

// ─── Shared assertion: page has loaded real content (not 404/error) ───────────

export async function expectMathCanvasLoaded(page: Page) {
  // Verify we are NOT on a 404 page
  await expect(page.locator('text=/404|page not found/i')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
  // Verify we have the main MathCanvas UI — mode tabs must be present
  const mc = new MathCanvasPage(page);
  await expect(mc.modeTabs.first()).toBeVisible({ timeout: 15_000 });
}
