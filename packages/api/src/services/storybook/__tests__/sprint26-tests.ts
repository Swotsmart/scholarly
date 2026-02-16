// ============================================================================
// SPRINT 26 TEST SUITE — 120 TESTS
// Scholarly Platform — Beta Launch + Seed Library
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertContains(h: string, n: string): void { if (!h.includes(n)) throw new Error('Expected "' + n + '"'); }
function assertResult<T>(r: Result<T>): T { assert(r.success === true, 'Expected success'); return (r as any).data; }

// ============================================================================
// PATH B TESTS (60 tests)
// ============================================================================

function testPathB(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const inf = () => require('../infrastructure/production-beta-infrastructure');

  run('B001: production config exists', () => assert(inf().PRODUCTION_CONFIG !== undefined, 'exists'));
  run('B002: region ap-southeast-2', () => assert(inf().PRODUCTION_CONFIG.region === 'ap-southeast-2', 'region'));
  run('B003: 3 AZs', () => assert(inf().PRODUCTION_CONFIG.availabilityZones.length === 3, '3'));
  run('B004: RDS db.r6g.large', () => assert(inf().PRODUCTION_CONFIG.database.instanceClass === 'db.r6g.large', 'class'));
  run('B005: RDS multi-AZ', () => assert(inf().PRODUCTION_CONFIG.database.multiAz === true, 'multiAz'));
  run('B006: RDS read replica', () => assert(inf().PRODUCTION_CONFIG.database.readReplica === true, 'replica'));
  run('B007: RDS 35-day backup', () => assert(inf().PRODUCTION_CONFIG.database.backupRetention === 35, '35'));
  run('B008: RDS deletion protection', () => assert(inf().PRODUCTION_CONFIG.database.deletionProtection === true, 'prot'));
  run('B009: Redis cache.r6g.large', () => assert(inf().PRODUCTION_CONFIG.cache.nodeType === 'cache.r6g.large', 'type'));
  run('B010: Redis 2 clusters', () => assert(inf().PRODUCTION_CONFIG.cache.numCacheClusters === 2, '2'));
  run('B011: Redis auto failover', () => assert(inf().PRODUCTION_CONFIG.cache.automaticFailover === true, 'fo'));
  run('B012: NATS 3 nodes', () => assert(inf().PRODUCTION_CONFIG.messaging.clusterSize === 3, '3'));
  run('B013: ECS API 2-8', () => { const a = inf().PRODUCTION_CONFIG.compute.apiService; assert(a.minCapacity === 2 && a.maxCapacity === 8, '2-8'); });
  run('B014: ECS 1024/2048', () => { const a = inf().PRODUCTION_CONFIG.compute.apiService; assert(a.cpu === 1024 && a.memory === 2048, 'cpu'); });
  run('B015: WAF enabled', () => assert(inf().PRODUCTION_CONFIG.cdn.wafEnabled === true, 'waf'));
  run('B016: PagerDuty enabled', () => assert(inf().PRODUCTION_CONFIG.monitoring.pagerdutyIntegration === true, 'pd'));
  run('B017: S3 replication', () => assert(inf().PRODUCTION_CONFIG.backup.s3Replication.enabled === true, 'repl'));
  run('B018: S3 repl dest', () => assert(inf().PRODUCTION_CONFIG.backup.s3Replication.destinationRegion === 'ap-southeast-1', 'dest'));
  run('B019: TF gen instantiates', () => assert(new (inf().ProductionTerraformGenerator)(inf().PRODUCTION_CONFIG) !== null, 'gen'));
  run('B020: TF output valid', () => { const tf = assertResult(new (inf().ProductionTerraformGenerator)(inf().PRODUCTION_CONFIG).generateProductionTerraform()); assertContains(tf, 'terraform'); assertContains(tf, 'module "vpc"'); });
  run('B021: beta svc instantiates', () => assert(new (inf().BetaAccessService)() !== null, 'svc'));
  run('B022: generate 5 codes', () => assert(assertResult(new (inf().BetaAccessService)().generateInviteCodes({ cohort: 'educator-beta', count: 5, maxUsesPerCode: 10, expiresInDays: 30, createdBy: 'a' })).length === 5, '5'));
  run('B023: EDU prefix', () => assert(assertResult(new (inf().BetaAccessService)().generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' }))[0].code.startsWith('EDU-'), 'EDU'));
  run('B024: PAR prefix', () => assert(assertResult(new (inf().BetaAccessService)().generateInviteCodes({ cohort: 'parent-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' }))[0].code.startsWith('PAR-'), 'PAR'));
  run('B025: redeem code', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assert(assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'u1' })).cohort === 'educator-beta', 'cohort'); });
  run('B026: reject invalid', () => assert(!new (inf().BetaAccessService)().redeemInviteCode({ code: 'BAD', userId: 'u1' }).success, 'fail'));
  run('B027: reject exhausted', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'u1' })); assert(!svc.redeemInviteCode({ code: c[0].code, userId: 'u2' }).success, 'exh'); });
  run('B028: reject duplicate', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 2, maxUsesPerCode: 5, expiresInDays: 30, createdBy: 'a' })); assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'u1' })); assert(!svc.redeemInviteCode({ code: c[1].code, userId: 'u1' }).success, 'dup'); });
  run('B029: flags assigned', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assert(typeof assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'u1' })).featureFlags['enchanted-library'] === 'boolean', 'fl'); });
  run('B030: educator gets enchanted-library', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assert(assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'u1' })).featureFlags['enchanted-library'] === true, 'el'); });
  run('B031: feedback widget always on', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'general-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assert(assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'ug' })).featureFlags['feedback-widget'] === true, 'fw'); });
  run('B032: submit feedback', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 1, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'uf' })); assert(assertResult(svc.submitFeedback({ userId: 'uf', cohort: 'educator-beta', type: 'bug', severity: 'medium', title: 'T', description: 'D', context: { currentPage: '/', deviceType: 'web', appVersion: '1.0', sessionDuration: 0 } })).status === 'new', 'new'); });
  run('B033: reject non-enrolled feedback', () => assert(!new (inf().BetaAccessService)().submitFeedback({ userId: 'x', cohort: 'educator-beta', type: 'bug', severity: 'low', title: 'T', description: 'D', context: { currentPage: '/', deviceType: 'web', appVersion: '1.0', sessionDuration: 0 } }).success, 'fail'));
  run('B034: cohort analytics', () => { const svc = new (inf().BetaAccessService)(); const c = assertResult(svc.generateInviteCodes({ cohort: 'educator-beta', count: 2, maxUsesPerCode: 1, expiresInDays: 30, createdBy: 'a' })); assertResult(svc.redeemInviteCode({ code: c[0].code, userId: 'a1' })); assertResult(svc.redeemInviteCode({ code: c[1].code, userId: 'a2' })); assert(assertResult(svc.getCohortAnalytics()).find((x: any) => x.cohort === 'educator-beta').totalUsers === 2, '2'); });
  run('B035: 8 feature flags', () => assert(inf().BETA_FEATURE_FLAGS.length === 8, '8'));
  run('B036: flags have strategies', () => assert(inf().BETA_FEATURE_FLAGS.every((f: any) => f.strategies.length > 0), 'strats'));
  run('B037: staging config', () => assert(inf().STAGING_CONFIG !== undefined, 'staging'));
  run('B038: config diff >= 15', () => assert(assertResult(new (inf().ProductionTerraformGenerator)(inf().PRODUCTION_CONFIG).generateConfigDiff()).length >= 15, '15+'));
  run('B039: 5 CDN behaviours', () => assert(inf().PRODUCTION_CDN_CACHE_BEHAVIOURS.length === 5, '5'));
  run('B040: illust TTL 1yr', () => assert(inf().PRODUCTION_CDN_CACHE_BEHAVIOURS[0].ttl === 31536000, '1yr'));
  run('B041: 3 ZAP profiles', () => assert(Object.keys(inf().ZAP_SCAN_PROFILES).length === 3, '3'));
  run('B042: apiScan exists', () => assert(inf().ZAP_SCAN_PROFILES.apiScan !== undefined, 'api'));
  run('B043: baseline exists', () => assert(inf().ZAP_SCAN_PROFILES.baselineScan !== undefined, 'bl'));
  run('B044: full scan 120min', () => assert(inf().ZAP_SCAN_PROFILES.fullScan.maxDurationMinutes === 120, '120'));
  run('B045: pen test svc', () => assert(new (inf().SecurityPenTestService)() !== null, 'svc'));
  run('B046: ZAP cmd gen', () => assertContains(assertResult(new (inf().SecurityPenTestService)().generateZapCommand(inf().ZAP_SCAN_PROFILES.apiScan)), 'zaproxy'));
  run('B047: readiness eval', () => assert(typeof assertResult(new (inf().SecurityPenTestService)().evaluateLaunchReadiness([], inf().MANUAL_SECURITY_CHECKS)).approved === 'boolean', 'bool'));
  run('B048: empty = approved', () => { const checks = inf().MANUAL_SECURITY_CHECKS.map((c: any) => ({ ...c, status: 'pass' })); assert(assertResult(new (inf().SecurityPenTestService)().evaluateLaunchReadiness([], checks)).approved === true, 'ok'); });
  run('B049: critical blocks', () => { const f = { id: 'F1', name: 'SQLi', description: 'd', risk: 'critical', confidence: 'high', url: '/t', method: 'GET', solution: 's', cweid: 89, wascid: 19, owaspCategory: 'A03', remediation: { priority: 'immediate', estimatedEffort: '2h', description: 'fix', status: 'pending' } }; assert(!assertResult(new (inf().SecurityPenTestService)().evaluateLaunchReadiness([f as any], [])).approved, 'blocked'); });
  run('B050: 12 manual checks', () => assert(inf().MANUAL_SECURITY_CHECKS.length === 12, '12'));
  run('B051: 5+ OWASP categories', () => assert(new Set(inf().MANUAL_SECURITY_CHECKS.map((c: any) => c.owaspTop10)).size >= 5, '5+'));
  run('B052: 5 DR procedures', () => assert(inf().DISASTER_RECOVERY_PROCEDURES.length === 5, '5'));
  run('B053: DR-001 RDS', () => assert(inf().DISASTER_RECOVERY_PROCEDURES[0].id === 'DR-001', '001'));
  run('B054: DR-001 7 steps', () => assert(inf().DISASTER_RECOVERY_PROCEDURES[0].steps.length === 7, '7'));
  run('B055: DR-001 rollback', () => assert(inf().DISASTER_RECOVERY_PROCEDURES[0].rollbackSteps.length > 0, 'rb'));
  run('B056: DR-002 S3', () => assert(inf().DISASTER_RECOVERY_PROCEDURES[1].id === 'DR-002', '002'));
  run('B057: DR svc', () => assert(new (inf().DisasterRecoveryService)() !== null, 'svc'));
  run('B058: DR plan', () => { const p = assertResult(new (inf().DisasterRecoveryService)().generateDRPlan()); assert(p.procedures.length === 5 && p.contacts.length === 3, 'plan'); });
  run('B059: DR test plan', () => assert(assertResult(new (inf().DisasterRecoveryService)().generateDRTestPlan('DR-001')).steps.length === 7, '7'));
  run('B060: DR bad ID fails', () => assert(!new (inf().DisasterRecoveryService)().generateDRTestPlan('DR-999').success, 'fail'));

  return { name: 'Path B: Production + Beta Infrastructure', tests };
}

// ============================================================================
// PATH C TESTS (60 tests)
// ============================================================================

function testPathC(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const sb = () => require('../storybook/seed-library-publication');

  run('C001: distribution=100', () => { const d = sb().PHASE_DISTRIBUTION; assert(d[2]+d[3]+d[4]+d[5]===100, '100'); });
  run('C002: phase 2=20', () => assert(sb().PHASE_DISTRIBUTION[2]===20, '20'));
  run('C003: phase 3=30', () => assert(sb().PHASE_DISTRIBUTION[3]===30, '30'));
  run('C004: phase 4=25', () => assert(sb().PHASE_DISTRIBUTION[4]===25, '25'));
  run('C005: phase 5=25', () => assert(sb().PHASE_DISTRIBUTION[5]===25, '25'));
  run('C006: 4 series', () => assert(sb().SEED_SERIES.length===4, '4'));
  run('C007: Finn 4 phases', () => assert(sb().SEED_SERIES[0].phases.length===4, '4'));
  run('C008: all protagonists', () => assert(sb().SEED_SERIES.every((s: any)=>s.protagonist.role==='protagonist'), 'p'));
  run('C009: GPC 4 phases', () => assert(Object.keys(sb().PHASE_GPC_TARGETS).length===4, '4'));
  run('C010: P2 7 groups', () => assert(sb().PHASE_GPC_TARGETS[2].length===7, '7'));
  run('C011: P3 4 groups', () => assert(sb().PHASE_GPC_TARGETS[3].length===4, '4'));
  run('C012: art styles 4+', () => assert(Object.keys(sb().AGE_STYLE_PREFERENCE).length>=4, '4+'));
  run('C013: orchestrator', () => assert(new (sb().SeedLibraryOrchestrator)()!==null, 'ok'));
  run('C014: catalog>=100', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).length>=100, '100+'));
  run('C015: has series', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).some((s: any)=>s.seriesId==='finn-fox'), 'finn'));
  run('C016: has standalone', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).some((s: any)=>!s.seriesId), 'sa'));
  run('C017: all have GPCs', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).every((s: any)=>s.targetGpcs.length>0), 'gpcs'));
  run('C018: all have taught set', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).every((s: any)=>s.taughtGpcSet.length>0), 'ts'));
  run('C019: all have chars', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).every((s: any)=>s.characters.length>0), 'ch'));
  run('C020: P2=8 pages', () => assert(assertResult(new (sb().SeedLibraryOrchestrator)().planCatalog()).filter((s: any)=>s.phase===2).every((s: any)=>s.pageCount===8), '8'));
  run('C021: cost estimate', () => { const o = new (sb().SeedLibraryOrchestrator)(); assert(assertResult(o.estimateCost(assertResult(o.planCatalog()))).costRange.min>0, '>0'); });
  run('C022: cost range valid', () => { const o = new (sb().SeedLibraryOrchestrator)(); const c = assertResult(o.estimateCost(assertResult(o.planCatalog()))); assert(c.costRange.min>=50 && c.costRange.max<=250, 'range'); });
  run('C023: cost breakdown', () => { const o = new (sb().SeedLibraryOrchestrator)(); const c = assertResult(o.estimateCost(assertResult(o.planCatalog()))); assert(c.breakdown.narrative.min>0 && c.breakdown.illustration.min>0, 'bd'); });
  run('C024: batches of 10', () => { const o = new (sb().SeedLibraryOrchestrator)(); const b = assertResult(o.createBatches(assertResult(o.planCatalog()))); assert(b.length>=10 && b[0].specs.length===10, '10'); });
  run('C025: sequential IDs', () => { const o = new (sb().SeedLibraryOrchestrator)(); const b = assertResult(o.createBatches(assertResult(o.planCatalog()))); assert(b[0].batchNumber===1 && b[1].batchNumber===2, 'seq'); });
  run('C026: costs defined', () => { const c = sb().GENERATION_COSTS; assert(c.narrative.avgPerBook>0 && c.illustration.avgPerPage>0, 'costs'); });
  run('C027: single book gen', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.success, 'gen')); });
  run('C028: gen has pages', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.story.pages.length===s[0].pageCount, 'pages')); });
  run('C029: gen has illustrations', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.story.pages.every((p: any)=>p.illustrationUrl.includes('s3://')), 'urls')); });
  run('C030: gen has metadata', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.story.metadata.phase>=2, 'phase')); });
  run('C031: QA svc', () => assert(new (sb().QualityAssuranceService)()!==null, 'qa'));
  run('C032: QA pass runs', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(r.success, 'ran')); });
  run('C033: QA checks automated', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(r.data.byStage.automated!==undefined, 'auto')); });
  run('C034: QA has AI stage', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(r.data.byStage.aiReview!==undefined, 'ai')); });
  run('C035: QA has manual stage', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(r.data.byStage.manualSpotCheck!==undefined, 'manual')); });
  run('C036: QA reports pass rate', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(typeof r.data.overallPassRate==='number', 'rate')); });
  run('C037: QA failed books tracked', () => { const qa = new (sb().QualityAssuranceService)(); return qa.runQAPass([]).then((r: any) => assert(Array.isArray(r.data.failedBooks), 'array')); });
  run('C038: gen cost tracked', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.cost.total>0, 'cost')); });
  run('C039: gen cost breakdown', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.cost.narrative>0 && r.data.cost.illustration>0, 'bd')); });
  run('C040: gen has audio manifest', () => { const o = new (sb().SeedLibraryOrchestrator)(); const s = assertResult(o.planCatalog()); return o.generateSingleBook(s[0]).then((r: any) => assert(r.data.story.audioManifest.narratorVoice.length>0, 'voice')); });
  run('C041: pub svc', () => assert(new (sb().LibraryPublicationService)()!==null, 'pub'));
  run('C042: 10 shelves', () => assert(sb().LIBRARY_SHELVES.length===10, '10'));
  run('C043: series shelves', () => { const sh = sb().LIBRARY_SHELVES; assert(sh.some((s: any)=>s.id==='finn-fox-series') && sh.some((s: any)=>s.id==='star-scouts-series'), 'series'); });
  run('C044: personalised shelves', () => { const sh = sb().LIBRARY_SHELVES; assert(sh.some((s: any)=>s.id==='ready-for-you') && sh.some((s: any)=>s.id==='adventures-waiting'), 'pers'); });
  run('C045: phase shelves', () => { const sh = sb().LIBRARY_SHELVES; for (let p=2;p<=5;p++) assert(sh.some((s: any)=>s.id==='phase-'+p), 'p'+p); });
  run('C046: publish to library', () => { const pub = new (sb().LibraryPublicationService)(); return pub.publishToLibrary([]).then((r: any) => assert(r.success, 'pub')); });
  run('C047: manifest storage', () => { const pub = new (sb().LibraryPublicationService)(); return pub.publishToLibrary([]).then((r: any) => assert(r.data.storageUsed.s3Bucket==='scholarly-production', 'bucket')); });
  run('C048: manifest shelves', () => { const pub = new (sb().LibraryPublicationService)(); return pub.publishToLibrary([]).then((r: any) => assert(Array.isArray(r.data.shelvesPopulated), 'shelves')); });
  run('C049: search index flag', () => { const pub = new (sb().LibraryPublicationService)(); return pub.publishToLibrary([]).then((r: any) => assert(r.data.searchIndexUpdated===true, 'idx')); });
  run('C050: by-phase tracking', () => { const pub = new (sb().LibraryPublicationService)(); return pub.publishToLibrary([]).then((r: any) => assert(typeof r.data.byPhase==='object', 'byPhase')); });
  run('C051: E2E 12 steps', () => assert(sb().E2E_USER_JOURNEY.length===12, '12'));
  run('C052: starts with login', () => assert(sb().E2E_USER_JOURNEY[0].name==='Learner Login', 'login'));
  run('C053: ends with Grafana', () => assert(sb().E2E_USER_JOURNEY[11].name==='Grafana Metrics Updated', 'grafana'));
  run('C054: step deps', () => assert(sb().E2E_USER_JOURNEY[7].dependsOn.includes(7), 'dep'));
  run('C055: BKT step', () => assert(sb().E2E_USER_JOURNEY.some((s: any)=>s.name.includes('BKT')), 'bkt'));
  run('C056: recs step', () => assert(sb().E2E_USER_JOURNEY.some((s: any)=>s.name.includes('Updated Recommendations')), 'recs'));
  run('C057: E2E svc', () => assert(new (sb().E2EVerificationService)()!==null, 'svc'));
  run('C058: E2E runs', () => { return new (sb().E2EVerificationService)().runE2EVerification().then((r: any) => assert(r.success && r.data.totalSteps===12, '12')); });
  run('C059: E2E verdict', () => { return new (sb().E2EVerificationService)().runE2EVerification().then((r: any) => assert(r.data.verdict.length>0, 'verdict')); });
  run('C060: E2E verification queries', () => assert(typeof sb().E2E_USER_JOURNEY[0].verificationQuery==='string', 'query'));

  return { name: 'Path C: Seed Library + Publication', tests };
}

async function runAll() {
  console.log('=' .repeat(60));
  console.log('  SPRINT 26 TEST SUITE');
  console.log('  Beta Launch + Seed Library');
  console.log('='.repeat(60));

  const suites = [testPathB(), testPathC()];
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
