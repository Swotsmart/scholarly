// ============================================================================
// SPRINT 27 TEST SUITE — 100 TESTS
// Self-Composing Interface Integration: Phases 1–4
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertResult<T>(r: Result<T>): T { assert(r.success === true, 'Expected success'); return (r as any).data; }

// ============================================================================
// PHASE 1 TESTS (30 tests) — Store + Registry + Sidebar
// ============================================================================

function testPhase1(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-1-4');

  // Modification specs
  run('P1-001: 7 Phase 1 modifications defined', () => assert(ig().PHASE_1_MODIFICATIONS.length === 7, '7'));
  run('P1-002: layout.tsx replace_import', () => assert(ig().PHASE_1_MODIFICATIONS[0].action === 'replace_import', 'replace'));
  run('P1-003: types barrel add_import', () => assert(ig().PHASE_1_MODIFICATIONS[1].action === 'add_import', 'add'));
  run('P1-004: menu-registry replace_file', () => assert(ig().PHASE_1_MODIFICATIONS[2].action === 'replace_file', 'replace'));
  run('P1-005: composing-menu-store replace_file', () => assert(ig().PHASE_1_MODIFICATIONS[3].action === 'replace_file', 'replace'));
  run('P1-006: sidebar replace_file', () => assert(ig().PHASE_1_MODIFICATIONS[4].action === 'replace_file', 'replace'));
  run('P1-007: init role add_hook', () => assert(ig().PHASE_1_MODIFICATIONS[5].action === 'add_hook', 'hook'));
  run('P1-008: sidebar-store shim replace_file', () => assert(ig().PHASE_1_MODIFICATIONS[6].action === 'replace_file', 'replace'));
  run('P1-009: no breaking changes in Phase 1', () => assert(ig().PHASE_1_MODIFICATIONS.every((m: any) => !m.breakingChange), 'no breaks'));
  run('P1-010: all have rollback strategies', () => assert(ig().PHASE_1_MODIFICATIONS.every((m: any) => m.rollbackStrategy.length > 0), 'rollbacks'));

  // File inventory
  run('P1-011: 5 Phase 1 files in inventory', () => assert(ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 1).length === 5, '5'));
  run('P1-012: composing-menu-types 220 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'composing-menu-types.ts').lines === 220, '220'));
  run('P1-013: menu-registry 363 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'menu-registry.ts').lines === 363, '363'));
  run('P1-014: composing-menu-store 846 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'composing-menu-store.ts').lines === 846, '846'));
  run('P1-015: self-composing-sidebar 557 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'self-composing-sidebar.tsx').lines === 557, '557'));
  run('P1-016: sidebar-store-shim 16 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'sidebar-store-shim.ts').lines === 16, '16'));
  run('P1-017: Phase 1 totals 2002 lines', () => { const total = ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 1).reduce((s: any, f: any) => s + f.lines, 0); assert(total === 2002, total + ' != 2002'); });

  // Target paths
  run('P1-018: types go to src/types/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'composing-menu-types.ts').targetPath === 'packages/web/src/types/', 'types'));
  run('P1-019: registry goes to src/config/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'menu-registry.ts').targetPath === 'packages/web/src/config/', 'config'));
  run('P1-020: store goes to src/stores/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'composing-menu-store.ts').targetPath === 'packages/web/src/stores/', 'stores'));
  run('P1-021: sidebar goes to src/components/layout/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'self-composing-sidebar.tsx').targetPath.includes('components/layout'), 'layout'));

  // Orchestrator
  run('P1-022: orchestrator instantiates', () => assert(new (ig().IntegrationOrchestrator)() !== null, 'ok'));
  run('P1-023: plan generates', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases.length === 4, '4 phases'); });
  run('P1-024: plan has Phase 1', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[0].name === 'Store + Registry + Sidebar', 'name'); });
  run('P1-025: Phase 1 has 5 self-composing files', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[0].selfComposingFiles.length === 5, '5'); });
  run('P1-026: Phase 1 dependencies listed', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[0].dependencies.length > 0, 'deps'); });
  run('P1-027: Phase 1 has verification command', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[0].verificationCommand.includes('composing-menu'), 'cmd'); });
  run('P1-028: plan wiring lines calculated', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.totalWiringLines > 0, 'wiring > 0'); });
  run('P1-029: plan has rollback procedure', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.rollbackProcedure.length >= 4, '4+ steps'); });
  run('P1-030: plan has verification steps', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.length === 10, '10 steps'); });

  return { name: 'Phase 1: Store + Registry + Sidebar', tests };
}

// ============================================================================
// PHASE 2 TESTS (20 tests) — Toast + Command Palette
// ============================================================================

function testPhase2(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-1-4');

  run('P2-001: 4 Phase 2 modifications', () => assert(ig().PHASE_2_MODIFICATIONS.length === 4, '4'));
  run('P2-002: toast import add_import', () => assert(ig().PHASE_2_MODIFICATIONS[0].action === 'add_import', 'import'));
  run('P2-003: cmd palette add_hook', () => assert(ig().PHASE_2_MODIFICATIONS[1].action === 'add_hook', 'hook'));
  run('P2-004: toast container add_component', () => assert(ig().PHASE_2_MODIFICATIONS[2].action === 'add_component', 'component'));
  run('P2-005: ARIA live region add_component', () => assert(ig().PHASE_2_MODIFICATIONS[3].action === 'add_component', 'aria'));
  run('P2-006: no breaking changes', () => assert(ig().PHASE_2_MODIFICATIONS.every((m: any) => !m.breakingChange), 'safe'));
  run('P2-007: all have rollback', () => assert(ig().PHASE_2_MODIFICATIONS.every((m: any) => m.rollbackStrategy.length > 0), 'rb'));
  run('P2-008: 3 Phase 2 files', () => assert(ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 2).length === 3, '3'));
  run('P2-009: use-menu-toast 384 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'use-menu-toast.ts').lines === 384, '384'));
  run('P2-010: menu-toast-container 456 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'menu-toast-container.tsx').lines === 456, '456'));
  run('P2-011: command-palette-integration 461 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'command-palette-integration.ts').lines === 461, '461'));
  run('P2-012: Phase 2 totals 1301 lines', () => { const total = ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 2).reduce((s: any, f: any) => s + f.lines, 0); assert(total === 1301, total + ''); });
  run('P2-013: toast hook to hooks dir', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'use-menu-toast.ts').targetPath.includes('hooks'), 'hooks'));
  run('P2-014: toast container to components', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'menu-toast-container.tsx').targetPath.includes('components'), 'comp'));
  run('P2-015: palette integration to lib', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'command-palette-integration.ts').targetPath.includes('lib'), 'lib'));
  run('P2-016: plan Phase 2 deps include Phase 1', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[1].dependencies.some((d: any) => d.includes('Phase 1')), 'dep'); });
  run('P2-017: Phase 2 targets command-palette.tsx', () => assert(ig().PHASE_2_MODIFICATIONS.some((m: any) => m.file === 'command-palette.tsx'), 'palette'));
  run('P2-018: Phase 2 targets layout.tsx', () => assert(ig().PHASE_2_MODIFICATIONS.some((m: any) => m.file === 'layout.tsx'), 'layout'));
  run('P2-019: Phase 2 cmd palette wiring ~18 lines', () => assert(ig().PHASE_2_MODIFICATIONS[1].lineEstimate === 18, '18'));
  run('P2-020: verification step for promotion toast', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.some((s: any) => s.name.includes('Promotion Toast')), 'toast'); });

  return { name: 'Phase 2: Toast + Command Palette', tests };
}

// ============================================================================
// PHASE 3 TESTS (25 tests) — Seed Engine
// ============================================================================

function testPhase3(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-1-4');

  run('P3-001: 5 Phase 3 modifications', () => assert(ig().PHASE_3_MODIFICATIONS.length === 5, '5'));
  run('P3-002: seed engine replace_file', () => assert(ig().PHASE_3_MODIFICATIONS[0].action === 'replace_file', 'replace'));
  run('P3-003: role matrix replace_file', () => assert(ig().PHASE_3_MODIFICATIONS[1].action === 'replace_file', 'replace'));
  run('P3-004: session hook add_hook', () => assert(ig().PHASE_3_MODIFICATIONS[2].action === 'add_hook', 'hook'));
  run('P3-005: onboarding bridge replace_file', () => assert(ig().PHASE_3_MODIFICATIONS[3].action === 'replace_file', 'replace'));
  run('P3-006: seed UI add_component', () => assert(ig().PHASE_3_MODIFICATIONS[4].action === 'add_component', 'comp'));
  run('P3-007: no breaking changes', () => assert(ig().PHASE_3_MODIFICATIONS.every((m: any) => !m.breakingChange), 'safe'));
  run('P3-008: session hook ~35 lines', () => assert(ig().PHASE_3_MODIFICATIONS[2].lineEstimate === 35, '35'));
  run('P3-009: 6 Phase 3 files', () => assert(ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 3).length === 6, '6'));
  run('P3-010: seed-engine 587 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'seed-engine.service.ts').lines === 587, '587'));
  run('P3-011: role-match-matrix 312 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'role-match-matrix.ts').lines === 312, '312'));
  run('P3-012: temporal-heuristics 245 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'temporal-heuristics.ts').lines === 245, '245'));
  run('P3-013: peer-patterns 198 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'peer-patterns.service.ts').lines === 198, '198'));
  run('P3-014: seed-ui-components 324 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'seed-ui-components.tsx').lines === 324, '324'));
  run('P3-015: onboarding-bridge 128 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'onboarding-bridge.ts').lines === 128, '128'));
  run('P3-016: Phase 3 totals 1794 lines', () => { const total = ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 3).reduce((s: any, f: any) => s + f.lines, 0); assert(total === 1794, total + ''); });
  run('P3-017: seed engine to services/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'seed-engine.service.ts').targetPath.includes('services'), 'svc'));
  run('P3-018: role matrix to config/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'role-match-matrix.ts').targetPath.includes('config'), 'cfg'));
  run('P3-019: plan Phase 3 deps include Phase 2', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[2].dependencies.some((d: any) => d.includes('Phase 2')), 'dep'); });
  run('P3-020: plan Phase 3 deps include Onboarding', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[2].dependencies.some((d: any) => d.includes('Onboarding')), 'onb'); });
  run('P3-021: seed engine description mentions 5 signals', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'seed-engine.service.ts').description.includes('5-signal'), '5sig'));
  run('P3-022: temporal weights 0.30', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'seed-engine.service.ts').description.includes('0.30'), 'wt'));
  run('P3-023: verification step for seeds', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.some((s: any) => s.name.includes('Seed Suggestions')), 'seeds'); });
  run('P3-024: verification step for pin/dismiss', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.some((s: any) => s.name.includes('Pin/Dismiss')), 'pin'); });
  run('P3-025: seed UI handlers ~8 lines', () => assert(ig().PHASE_3_MODIFICATIONS[4].lineEstimate === 8, '8'));

  return { name: 'Phase 3: Seed Engine', tests };
}

// ============================================================================
// PHASE 4 TESTS (25 tests) — Decay + Overflow
// ============================================================================

function testPhase4(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-1-4');

  run('P4-001: 4 Phase 4 modifications', () => assert(ig().PHASE_4_MODIFICATIONS.length === 4, '4'));
  run('P4-002: decay wrapper wrap_component', () => assert(ig().PHASE_4_MODIFICATIONS[0].action === 'wrap_component', 'wrap'));
  run('P4-003: overflow drawer add_component', () => assert(ig().PHASE_4_MODIFICATIONS[1].action === 'add_component', 'comp'));
  run('P4-004: reduced motion add_hook', () => assert(ig().PHASE_4_MODIFICATIONS[2].action === 'add_hook', 'hook'));
  run('P4-005: decay cycle add_hook', () => assert(ig().PHASE_4_MODIFICATIONS[3].action === 'add_hook', 'hook'));
  run('P4-006: no breaking changes', () => assert(ig().PHASE_4_MODIFICATIONS.every((m: any) => !m.breakingChange), 'safe'));
  run('P4-007: all have rollback', () => assert(ig().PHASE_4_MODIFICATIONS.every((m: any) => m.rollbackStrategy.length > 0), 'rb'));
  run('P4-008: 6 Phase 4 files', () => assert(ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 4).length === 6, '6'));
  run('P4-009: overflow-drawer 353 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'overflow-drawer.tsx').lines === 353, '353'));
  run('P4-010: decay-item-wrapper 232 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'decay-item-wrapper.tsx').lines === 232, '232'));
  run('P4-011: more-button 59 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'more-button.tsx').lines === 59, '59'));
  run('P4-012: use-reduced-motion 103 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'use-reduced-motion.ts').lines === 103, '103'));
  run('P4-013: decay-overflow-styles 564 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'decay-overflow-styles.css').lines === 564, '564'));
  run('P4-014: decay-overflow-tests 482 lines', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'decay-overflow-tests.ts').lines === 482, '482'));
  run('P4-015: Phase 4 totals 1793 lines', () => { const total = ig().PHASE_1_4_FILES.filter((f: any) => f.phase === 4).reduce((s: any, f: any) => s + f.lines, 0); assert(total === 1793, total + ''); });
  run('P4-016: overflow drawer to components/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'overflow-drawer.tsx').targetPath.includes('components'), 'comp'));
  run('P4-017: reduced motion to hooks/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'use-reduced-motion.ts').targetPath.includes('hooks'), 'hooks'));
  run('P4-018: styles to src/styles/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'decay-overflow-styles.css').targetPath.includes('styles'), 'styles'));
  run('P4-019: tests to __tests__/', () => assert(ig().PHASE_1_4_FILES.find((f: any) => f.filename === 'decay-overflow-tests.ts').targetPath.includes('__tests__'), 'tests'));
  run('P4-020: plan Phase 4 deps include Phase 1', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.phases[3].dependencies.some((d: any) => d.includes('Phase 1')), 'dep'); });
  run('P4-021: decay wrapper ~14 lines wiring', () => assert(ig().PHASE_4_MODIFICATIONS[0].lineEstimate === 14, '14'));
  run('P4-022: overflow drawer ~16 lines wiring', () => assert(ig().PHASE_4_MODIFICATIONS[1].lineEstimate === 16, '16'));
  run('P4-023: decay cycle ~7 lines wiring', () => assert(ig().PHASE_4_MODIFICATIONS[3].lineEstimate === 7, '7'));
  run('P4-024: verification for decay visual', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.some((s: any) => s.name.includes('Decay Visual')), 'decay'); });
  run('P4-025: verification for reduced motion', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.verificationSteps.some((s: any) => s.name.includes('Reduced Motion')), 'rm'); });

  return { name: 'Phase 4: Decay + Overflow', tests };
}

// ============================================================================
// CROSS-CUTTING TESTS (additional — dependency validation, summary)
// ============================================================================

function testCrossCutting(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const ig = () => require('../integration/self-composing-phases-1-4');

  // Dependency validation
  run('XC-001: dependency report generated', () => { const r: any = assertResult(new (ig().IntegrationOrchestrator)().validateDependencies()); assert(r.totalChecks >= 10, '10+ checks'); });
  run('XC-002: all deps met (assumed)', () => { const r: any = assertResult(new (ig().IntegrationOrchestrator)().validateDependencies()); assert(r.allDependenciesMet === true, 'met'); });
  run('XC-003: Phase 1 deps include Zustand', () => { const r: any = assertResult(new (ig().IntegrationOrchestrator)().validateDependencies()); assert(r.checks.some((c: any) => c.name.includes('Zustand')), 'zustand'); });
  run('XC-004: Phase 1 deps include Auth', () => { const r: any = assertResult(new (ig().IntegrationOrchestrator)().validateDependencies()); assert(r.checks.some((c: any) => c.name.includes('Auth')), 'auth'); });
  run('XC-005: Phase 3 deps include Onboarding', () => { const r: any = assertResult(new (ig().IntegrationOrchestrator)().validateDependencies()); assert(r.checks.some((c: any) => c.name.includes('Onboarding')), 'onb'); });

  // Summary
  run('XC-006: summary generated', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.selfComposingFilesIntegrated > 0, 'files'); });
  run('XC-007: 20 files integrated', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.selfComposingFilesIntegrated === 20, '20'); });
  run('XC-008: ~6890 lines integrated', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.selfComposingLinesIntegrated > 6000 && s.selfComposingLinesIntegrated < 8000, s.selfComposingLinesIntegrated + ''); });
  run('XC-009: wiring lines ~159', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.wiringLinesAdded > 100 && s.wiringLinesAdded < 250, s.wiringLinesAdded + ''); });
  run('XC-010: 0 breaking changes', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.breakingChanges === 0, '0'); });
  run('XC-011: 2 files replaced', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.existingFilesReplaced === 2, '2'); });
  run('XC-012: 2 files backed up', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.existingFilesBackedUp === 2, '2'); });
  run('XC-013: 10 verification steps', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.verificationSteps === 10, '10'); });
  run('XC-014: Sprint 28 remaining: Phase 5 = 8 files', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.remainingForSprint28.phase5Files === 8, '8'); });
  run('XC-015: Sprint 28 remaining: Phase 6 = 7 files', () => { const s: any = assertResult(new (ig().IntegrationOrchestrator)().generateSummary()); assert(s.remainingForSprint28.phase6Files === 7, '7'); });

  // File inventory totals
  run('XC-016: total Phases 1-4 files = 20', () => assert(ig().PHASE_1_4_FILES.length === 20, ig().PHASE_1_4_FILES.length + ''));
  run('XC-017: all files have source path', () => assert(ig().PHASE_1_4_FILES.every((f: any) => f.sourcePath.length > 0), 'src'));
  run('XC-018: all files have target path', () => assert(ig().PHASE_1_4_FILES.every((f: any) => f.targetPath.length > 0), 'tgt'));
  run('XC-019: all files have description', () => assert(ig().PHASE_1_4_FILES.every((f: any) => f.description.length > 0), 'desc'));
  run('XC-020: plan files modified list populated', () => { const plan: any = assertResult(new (ig().IntegrationOrchestrator)().generatePlan()); assert(plan.filesModified.length >= 3, '3+'); });

  return { name: 'Cross-Cutting: Dependencies + Summary', tests };
}

// ============================================================================
// RUNNER
// ============================================================================

function runAll() {
  console.log('='.repeat(60));
  console.log('  SPRINT 27 TEST SUITE');
  console.log('  Self-Composing Interface: Phases 1-4');
  console.log('='.repeat(60));

  const suites = [testPhase1(), testPhase2(), testPhase3(), testPhase4(), testCrossCutting()];
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
