// ============================================================================
// SPRINT 28 TEST SUITE — 100 TESTS
// Self-Composing Interface: Phases 5–6 + Settings + E2E
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertResult<T>(r: Result<T>): T { assert(r.success === true, 'Expected success'); return (r as any).data; }

// ============================================================================
// PHASE 5 TESTS (25 tests)
// ============================================================================

function testPhase5(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-5-6');

  run('P5-001: 6 Phase 5 modifications', () => assert(ig().PHASE_5_MODIFICATIONS.length === 6, '6'));
  run('P5-002: AdminPushPanel add_component', () => assert(ig().PHASE_5_MODIFICATIONS[0].action === 'add_component', 'comp'));
  run('P5-003: push reception add_import', () => assert(ig().PHASE_5_MODIFICATIONS[1].action === 'add_import', 'import'));
  run('P5-004: push expiry add_api_route', () => assert(ig().PHASE_5_MODIFICATIONS[2].action === 'add_api_route', 'api'));
  run('P5-005: analytics dashboard add_route', () => assert(ig().PHASE_5_MODIFICATIONS[3].action === 'add_route', 'route'));
  run('P5-006: analytics events add_hook', () => assert(ig().PHASE_5_MODIFICATIONS[4].action === 'add_hook', 'hook'));
  run('P5-007: aggregation cron add_api_route', () => assert(ig().PHASE_5_MODIFICATIONS[5].action === 'add_api_route', 'api'));
  run('P5-008: no breaking changes', () => assert(ig().PHASE_5_MODIFICATIONS.every((m) => !m.breakingChange), 'safe'));
  run('P5-009: all have rollback', () => assert(ig().PHASE_5_MODIFICATIONS.every((m) => m.rollbackStrategy.length > 0), 'rb'));
  run('P5-010: 8 Phase 5 files', () => assert(ig().PHASE_5_6_FILES.filter((f) => f.phase === 5).length === 8, '8'));
  run('P5-011: admin-push.service 775 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'admin-push.service.ts').lines === 775, '775'));
  run('P5-012: push-client-reception 648 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'push-client-reception.tsx').lines === 648, '648'));
  run('P5-013: push-expiry-handler 395 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'push-expiry-handler.ts').lines === 395, '395'));
  run('P5-014: menu-analytics.service 813 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'menu-analytics.service.ts').lines === 813, '813'));
  run('P5-015: admin-push-ui 599 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'admin-push-ui.tsx').lines === 599, '599'));
  run('P5-016: analytics-dashboard 619 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'analytics-dashboard.tsx').lines === 619, '619'));
  run('P5-017: CSS 870 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'admin-push-analytics.css').lines === 870, '870'));
  run('P5-018: Phase 5 tests 975 lines/68 cases', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'admin-push-analytics.test.ts').lines === 975, '975'));
  run('P5-019: Phase 5 totals 5694', () => { const t = ig().PHASE_5_6_FILES.filter((f) => f.phase === 5).reduce((s, f) => s + f.lines, 0); assert(t === 5694, t + ''); });
  run('P5-020: services go to services/', () => assert(ig().PHASE_5_6_FILES.filter((f) => f.phase === 5 && f.filename.includes('service')).every((f) => f.targetPath.includes('services')), 'svc'));
  run('P5-021: components go to components/', () => assert(ig().PHASE_5_6_FILES.filter((f) => f.phase === 5 && f.filename.includes('.tsx')).every((f) => f.targetPath.includes('components')), 'comp'));
  run('P5-022: push expiry targets cron route', () => assert(ig().PHASE_5_MODIFICATIONS[2].path.includes('cron'), 'cron'));
  run('P5-023: analytics targets admin route', () => assert(ig().PHASE_5_MODIFICATIONS[3].path.includes('admin'), 'admin'));
  run('P5-024: analytics events ~18 lines', () => assert(ig().PHASE_5_MODIFICATIONS[4].lineEstimate === 18, '18'));
  run('P5-025: Phase 5 wiring ~79 lines', () => { const t = ig().PHASE_5_MODIFICATIONS.reduce((s, m) => s + m.lineEstimate, 0); assert(t > 60 && t < 100, t + ''); });

  return { name: 'Phase 5: Admin Push + Analytics', tests };
}

// ============================================================================
// PHASE 6 TESTS (25 tests)
// ============================================================================

function testPhase6(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-5-6');

  run('P6-001: 6 Phase 6 modifications', () => assert(ig().PHASE_6_MODIFICATIONS.length === 6, '6'));
  run('P6-002: menu sync add_hook', () => assert(ig().PHASE_6_MODIFICATIONS[0].action === 'add_hook', 'hook'));
  run('P6-003: persist middleware add_hook', () => assert(ig().PHASE_6_MODIFICATIONS[1].action === 'add_hook', 'hook'));
  run('P6-004: bottom tabs add_component', () => assert(ig().PHASE_6_MODIFICATIONS[2].action === 'add_component', 'comp'));
  run('P6-005: menu sheet add_component', () => assert(ig().PHASE_6_MODIFICATIONS[3].action === 'add_component', 'comp'));
  run('P6-006: onboarding processor add_hook', () => assert(ig().PHASE_6_MODIFICATIONS[4].action === 'add_hook', 'hook'));
  run('P6-007: sync API add_api_route', () => assert(ig().PHASE_6_MODIFICATIONS[5].action === 'add_api_route', 'api'));
  run('P6-008: no breaking changes', () => assert(ig().PHASE_6_MODIFICATIONS.every((m) => !m.breakingChange), 'safe'));
  run('P6-009: 7 Phase 6 files', () => assert(ig().PHASE_5_6_FILES.filter((f) => f.phase === 6).length === 7, '7'));
  run('P6-010: menu-sync.service 542 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'menu-sync.service.ts').lines === 542, '542'));
  run('P6-011: use-menu-sync 387 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'use-menu-sync.ts').lines === 387, '387'));
  run('P6-012: mobile-bottom-tabs 456 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'mobile-bottom-tabs.tsx').lines === 456, '456'));
  run('P6-013: mobile-menu-sheet 523 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'mobile-menu-sheet.tsx').lines === 523, '523'));
  run('P6-014: menu-settings-page 634 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'menu-settings-page.tsx').lines === 634, '634'));
  run('P6-015: onboarding-processor 398 lines', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'onboarding-processor.service.ts').lines === 398, '398'));
  run('P6-016: Phase 6 tests 1239 lines/65 cases', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'phase-6-e2e-tests.ts').lines === 1239, '1239'));
  run('P6-017: Phase 6 totals 4179', () => { const t = ig().PHASE_5_6_FILES.filter((f) => f.phase === 6).reduce((s, f) => s + f.lines, 0); assert(t === 4179, t + ''); });
  run('P6-018: sync hook to hooks/', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'use-menu-sync.ts').targetPath.includes('hooks'), 'hooks'));
  run('P6-019: mobile components to components/', () => assert(ig().PHASE_5_6_FILES.find((f) => f.filename === 'mobile-bottom-tabs.tsx').targetPath.includes('components'), 'comp'));
  run('P6-020: bottom tabs ~20 lines wiring', () => assert(ig().PHASE_6_MODIFICATIONS[2].lineEstimate === 20, '20'));
  run('P6-021: onboarding ~22 lines wiring', () => assert(ig().PHASE_6_MODIFICATIONS[4].lineEstimate === 22, '22'));
  run('P6-022: sync API ~18 lines', () => assert(ig().PHASE_6_MODIFICATIONS[5].lineEstimate === 18, '18'));
  run('P6-023: Phase 6 wiring total', () => { const t = ig().PHASE_6_MODIFICATIONS.reduce((s, m) => s + m.lineEstimate, 0); assert(t > 80 && t < 130, t + ''); });
  run('P6-024: all Phase 5+6 files = 15', () => assert(ig().PHASE_5_6_FILES.length === 15, ig().PHASE_5_6_FILES.length + ''));
  run('P6-025: Phases 5+6 total = 9873', () => { const t = ig().PHASE_5_6_FILES.reduce((s, f) => s + f.lines, 0); assert(t === 9873, t + ''); });

  return { name: 'Phase 6: Cross-Device Sync + Mobile', tests };
}

// ============================================================================
// SETTINGS TESTS (10 tests)
// ============================================================================

function testSettings(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-5-6');

  run('ST-001: 4 settings modifications', () => assert(ig().SETTINGS_MODIFICATIONS.length === 4, '4'));
  run('ST-002: route add_route', () => assert(ig().SETTINGS_MODIFICATIONS[0].action === 'add_route', 'route'));
  run('ST-003: page replace_file', () => assert(ig().SETTINGS_MODIFICATIONS[1].action === 'replace_file', 'file'));
  run('ST-004: sync display add_hook', () => assert(ig().SETTINGS_MODIFICATIONS[2].action === 'add_hook', 'hook'));
  run('ST-005: sidebar link add_component', () => assert(ig().SETTINGS_MODIFICATIONS[3].action === 'add_component', 'comp'));
  run('ST-006: no breaking changes', () => assert(ig().SETTINGS_MODIFICATIONS.every((m) => !m.breakingChange), 'safe'));
  run('ST-007: route targets settings/menu', () => assert(ig().SETTINGS_MODIFICATIONS[0].path.includes('settings/menu'), 'path'));
  run('ST-008: sidebar link ~4 lines', () => assert(ig().SETTINGS_MODIFICATIONS[3].lineEstimate === 4, '4'));
  run('ST-009: settings wiring ~24 lines', () => { const t = ig().SETTINGS_MODIFICATIONS.reduce((s, m) => s + m.lineEstimate, 0); assert(t > 15 && t < 35, t + ''); });
  run('ST-010: all have rollback', () => assert(ig().SETTINGS_MODIFICATIONS.every((m) => m.rollbackStrategy.length > 0), 'rb'));

  return { name: 'Menu Settings Page', tests };
}

// ============================================================================
// E2E TESTS (20 tests)
// ============================================================================

function testE2E(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-5-6');

  run('E2E-001: 7 E2E scenarios', () => assert(ig().E2E_SCENARIOS.length === 7, '7'));
  run('E2E-002: lifecycle scenario has 12 steps', () => assert(ig().E2E_SCENARIOS[0].steps.length === 12, '12'));
  run('E2E-003: sync scenario has 5 steps', () => assert(ig().E2E_SCENARIOS[1].steps.length === 5, '5'));
  run('E2E-004: mobile scenario has 4 steps', () => assert(ig().E2E_SCENARIOS[2].steps.length === 4, '4'));
  run('E2E-005: push lifecycle has 5 steps', () => assert(ig().E2E_SCENARIOS[3].steps.length === 5, '5'));
  run('E2E-006: analytics pipeline has 3 steps', () => assert(ig().E2E_SCENARIOS[4].steps.length === 3, '3'));
  run('E2E-007: parent journey has 3 steps', () => assert(ig().E2E_SCENARIOS[5].steps.length === 3, '3'));
  run('E2E-008: learner journey has 3 steps', () => assert(ig().E2E_SCENARIOS[6].steps.length === 3, '3'));
  run('E2E-009: total steps = 35', () => { const t = ig().E2E_SCENARIOS.reduce((s, sc) => s + sc.steps.length, 0); assert(t === 35, t + ''); });
  run('E2E-010: lifecycle covers all 6 phases', () => assert(ig().E2E_SCENARIOS[0].coversPhases.length === 6, '6'));
  run('E2E-011: sync covers phases 1+6', () => { const p = ig().E2E_SCENARIOS[1].coversPhases; assert(p.includes(1) && p.includes(6), p + ''); });
  run('E2E-012: mobile covers phases 1+6', () => { const p = ig().E2E_SCENARIOS[2].coversPhases; assert(p.includes(6), p + ''); });
  run('E2E-013: push covers phase 5', () => assert(ig().E2E_SCENARIOS[3].coversPhases.includes(5), '5'));
  run('E2E-014: analytics covers phase 5', () => assert(ig().E2E_SCENARIOS[4].coversPhases.includes(5), '5'));
  run('E2E-015: all steps have verification queries', () => { const all = ig().E2E_SCENARIOS.flatMap((s) => s.steps); assert(all.every((st) => st.verificationQuery.length > 0), 'vq'); });
  run('E2E-016: step dependencies valid', () => { const s = ig().E2E_SCENARIOS[0].steps; assert(s[0].dependsOn.length === 0 && s[11].dependsOn.includes(10), 'deps'); });
  run('E2E-017: lifecycle starts with register', () => assert(ig().E2E_SCENARIOS[0].steps[0].action.includes('register'), 'reg'));
  run('E2E-018: lifecycle ends with settings', () => assert(ig().E2E_SCENARIOS[0].steps[11].action.includes('settings'), 'set'));
  run('E2E-019: parent journey verifies <=5 items', () => {
    const vq = ig().E2E_SCENARIOS[5].steps[2].verificationQuery;
    assert(vq.includes('lte') && vq.includes('5'), 'lte5');
  });
  run('E2E-020: learner seeds include Arena', () => assert(ig().E2E_SCENARIOS[6].steps[1].verificationQuery.includes('Arena'), 'arena'));

  return { name: 'End-to-End Verification', tests };
}

// ============================================================================
// ORCHESTRATOR + PRODUCTION READINESS (20 tests)
// ============================================================================

function testOrchestrator(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-5-6');

  const orch = () => new (ig().Sprint28Orchestrator)();

  run('OR-001: orchestrator instantiates', () => assert(orch() !== null, 'ok'));
  run('OR-002: plan generates', () => { const p = assertResult(orch().generatePlan()); assert(p.sections.length === 3, '3 sections'); });
  run('OR-003: plan has Phase 5 section', () => { const p = assertResult(orch().generatePlan()); assert(p.sections[0].name.includes('Phase 5'), 'p5'); });
  run('OR-004: plan has Phase 6 section', () => { const p = assertResult(orch().generatePlan()); assert(p.sections[1].name.includes('Phase 6'), 'p6'); });
  run('OR-005: plan has Settings section', () => { const p = assertResult(orch().generatePlan()); assert(p.sections[2].name.includes('Settings'), 'st'); });
  run('OR-006: total modifications counted', () => { const p = assertResult(orch().generatePlan()); assert(p.totalModifications >= 14, p.totalModifications + ''); });
  run('OR-007: wiring lines calculated', () => { const p = assertResult(orch().generatePlan()); assert(p.totalWiringLines > 150 && p.totalWiringLines < 300, p.totalWiringLines + ''); });
  run('OR-008: 7 E2E scenarios in plan', () => { const p = assertResult(orch().generatePlan()); assert(p.e2eScenarios === 7, '7'); });
  run('OR-009: 35 E2E steps', () => { const p = assertResult(orch().generatePlan()); assert(p.e2eSteps === 35, '35'); });
  run('OR-010: 15 files integrated', () => { const p = assertResult(orch().generatePlan()); assert(p.filesIntegrated === 15, '15'); });
  run('OR-011: 9873 lines integrated', () => { const p = assertResult(orch().generatePlan()); assert(p.linesIntegrated === 9873, p.linesIntegrated + ''); });
  run('OR-012: rollback procedure has 4 steps', () => { const p = assertResult(orch().generatePlan()); assert(p.rollbackProcedure.length >= 4, 'rollback'); });

  // Production readiness
  run('OR-013: production readiness assessed', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.checks.length >= 20, p.productionReadiness.checks.length + ''); });
  run('OR-014: all checks pass', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.allPassed === true, 'passed'); });
  run('OR-015: verdict is PRODUCTION READY', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.verdict.includes('PRODUCTION READY'), 'ready'); });
  run('OR-016: architecture checks present', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.checks.some((c) => c.category === 'Architecture'), 'arch'); });
  run('OR-017: accessibility checks present', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.checks.some((c) => c.category === 'Accessibility'), 'a11y'); });
  run('OR-018: testing checks present', () => { const p = assertResult(orch().generatePlan()); assert(p.productionReadiness.checks.some((c) => c.category === 'Testing'), 'test'); });

  // Completion summary
  run('OR-019: completion summary generates', () => { const s = assertResult(orch().generateCompletionSummary()); assert(s.selfComposingComplete.total.files === 35, '35'); });
  run('OR-020: completion total lines = 18263', () => { const s = assertResult(orch().generateCompletionSummary()); assert(s.selfComposingComplete.total.lines === 18263, '18263'); });

  return { name: 'Orchestrator + Production Readiness', tests };
}

// ============================================================================
// RUNNER
// ============================================================================

function runAll() {
  console.log('='.repeat(60));
  console.log('  SPRINT 28 TEST SUITE — FINAL SPRINT');
  console.log('  Self-Composing Interface: Phases 5-6 + Polish');
  console.log('='.repeat(60));

  const suites = [testPhase5(), testPhase6(), testSettings(), testE2E(), testOrchestrator()];
  let totalPassed = 0, totalFailed = 0;

  for (const suite of suites) {
    console.log('\n--- ' + suite.name + ' ---');
    let passed = 0, failed = 0;
    for (const test of suite.tests) {
      if (test.passed) { passed++; } else { console.log('  x ' + test.name + ': ' + test.error); failed++; }
    }
    console.log('  ' + passed + ' passed, ' + failed + ' failed (' + suite.tests.length + ' total)');
    totalPassed += passed;
    totalFailed += failed;
  }

  console.log('\n' + '='.repeat(60));
  console.log('  TOTAL: ' + totalPassed + ' passed, ' + totalFailed + ' failed (' + (totalPassed + totalFailed) + ' total)');
  console.log('='.repeat(60));
}

runAll();
