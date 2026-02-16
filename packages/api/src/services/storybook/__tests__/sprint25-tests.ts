// ============================================================================
// SPRINT 25 TEST SUITE — 120 TESTS
// Scholarly Platform — Performance + Marketplace
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertContains(h: string, n: string, ctx?: string): void { if (!h.includes(n)) throw new Error(`Expected "${n}"${ctx ? ` (${ctx})` : ''}`); }
function assertResult<T>(r: Result<T>, c?: string): T { assert(r.success === true, `Expected success${c ? ` for ${c}` : ''}`); return (r as any).data; }

// ============================================================================
// PATH B TESTS (60 tests) — Load Testing & Performance
// ============================================================================

function testPathB(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const inf = () => require('../infrastructure/load-testing-performance');

  // B25-001: k6 Load Test Scenarios (20 tests)
  run('B001: 3 personas defined', () => assert(inf().ALL_PERSONAS.length === 3, '3 personas'));
  run('B002: learner has 100 VUs', () => assert(inf().LEARNER_PERSONA.vus === 100, '100'));
  run('B003: teacher has 50 VUs', () => assert(inf().TEACHER_PERSONA.vus === 50, '50'));
  run('B004: creator has 20 VUs', () => assert(inf().CREATOR_PERSONA.vus === 20, '20'));
  run('B005: total VUs = 170', () => assert(inf().ALL_PERSONAS.reduce((s: number, p: any) => s + p.vus, 0) === 170, '170'));
  run('B006: learner has 6 actions', () => assert(inf().LEARNER_PERSONA.actions.length === 6, '6 actions'));
  run('B007: teacher has 5 actions', () => assert(inf().TEACHER_PERSONA.actions.length === 5, '5 actions'));
  run('B008: creator has 6 actions', () => assert(inf().CREATOR_PERSONA.actions.length === 6, '6 actions'));
  run('B009: action weights sum to ~1.0', () => { for (const p of inf().ALL_PERSONAS) { const sum = p.actions.reduce((s: number, a: any) => s + a.weight, 0); assert(Math.abs(sum - 1.0) < 0.01, `${p.name} weights sum to ${sum}`); } });
  run('B010: library search P95 target 500ms', () => assert(inf().LEARNER_PERSONA.actions.find((a: any) => a.name === 'browse_library').p95Target === 500, '500ms'));
  run('B011: story generation target 5000ms', () => assert(inf().CREATOR_PERSONA.actions.find((a: any) => a.name === 'generate_story').p95Target === 5000, '5s'));
  run('B012: generation returns 202', () => assert(inf().CREATOR_PERSONA.actions.find((a: any) => a.name === 'generate_story').expectedStatus === 202, '202'));
  run('B013: k6 script generator instantiates', () => assert(new (inf().K6ScriptGenerator)() !== null, 'gen'));
  run('B014: k6 script generated', () => { const g = new (inf().K6ScriptGenerator)(); const s = assertResult(g.generateScript(inf().ALL_PERSONAS, 'https://staging.scholarly.app')); assert(s.length > 500, 'script length'); });
  run('B015: script has 3 scenarios', () => { const s = assertResult(new (inf().K6ScriptGenerator)().generateScript(inf().ALL_PERSONAS, 'https://test')); assertContains(s, 'learner:'); assertContains(s, 'teacher:'); assertContains(s, 'creator:'); });
  run('B016: script has thresholds', () => { const s = assertResult(new (inf().K6ScriptGenerator)().generateScript(inf().ALL_PERSONAS, 'https://test')); assertContains(s, 'thresholds'); assertContains(s, 'http_req_duration'); });
  run('B017: script has ramping-vus', () => { const s = assertResult(new (inf().K6ScriptGenerator)().generateScript(inf().ALL_PERSONAS, 'https://test')); assertContains(s, 'ramping-vus'); });
  run('B018: script has error rate abort', () => { const s = assertResult(new (inf().K6ScriptGenerator)().generateScript(inf().ALL_PERSONAS, 'https://test')); assertContains(s, 'http_req_failed'); });
  run('B019: learner think time 2-8s', () => assert(inf().LEARNER_PERSONA.thinkTime.min === 2000 && inf().LEARNER_PERSONA.thinkTime.max === 8000, 'think'));
  run('B020: script has auth helper', () => { const s = assertResult(new (inf().K6ScriptGenerator)().generateScript(inf().ALL_PERSONAS, 'https://test')); assertContains(s, 'getAuthToken'); });

  // B25-002: Database Query Optimisation (20 tests)
  run('B021: 20 queries profiled', () => assert(inf().TOP_20_QUERIES.length === 20, '20 queries'));
  run('B022: hot path queries < 10ms target', () => assert(inf().TOP_20_QUERIES.filter((q: any) => q.category === 'read_hot').every((q: any) => q.expectedP95ms <= 10), 'hot <10ms'));
  run('B023: search queries < 100ms target', () => assert(inf().TOP_20_QUERIES.filter((q: any) => q.category === 'search').every((q: any) => q.expectedP95ms <= 100), 'search <100ms'));
  run('B024: index migration generated', () => { const svc = new (inf().DatabaseOptimisationService)(); const m = assertResult(svc.generateIndexMigration()); assertContains(m, 'CREATE INDEX'); });
  run('B025: indexes use CONCURRENTLY', () => { const m = assertResult(new (inf().DatabaseOptimisationService)().generateIndexMigration()); assertContains(m, 'CONCURRENTLY'); });
  run('B026: GIN index for full-text search', () => { const m = assertResult(new (inf().DatabaseOptimisationService)().generateIndexMigration()); assertContains(m, 'gin'); });
  run('B027: partial indexes present', () => { const m = assertResult(new (inf().DatabaseOptimisationService)().generateIndexMigration()); assertContains(m, 'WHERE status'); });
  run('B028: unique index count > 10', () => assert(new (inf().DatabaseOptimisationService)().getUniqueIndexCount() > 10, '>10'));
  run('B029: staging pool max=20', () => assert(inf().CONNECTION_POOL_CONFIGS.staging.max === 20, '20'));
  run('B030: production pool max=50', () => assert(inf().CONNECTION_POOL_CONFIGS.production.max === 50, '50'));
  run('B031: mastery lookup is very_high freq', () => assert(inf().TOP_20_QUERIES.find((q: any) => q.name === 'get_learner_mastery').frequency === 'very_high', 'very_high'));
  run('B032: full-text search has GIN index', () => assert(inf().TOP_20_QUERIES.find((q: any) => q.name === 'search_library_fulltext').indexes[0].type === 'gin', 'gin'));
  run('B033: recommendations exclude read books', () => assertContains(inf().TOP_20_QUERIES.find((q: any) => q.name === 'get_recommendations').sql, 'NOT IN'));
  run('B034: write queries have no indexes', () => assert(inf().TOP_20_QUERIES.find((q: any) => q.name === 'insert_reading_session').indexes.length === 0, 'no idx'));
  run('B035: device sync query uses deviceId', () => assertContains(inf().TOP_20_QUERIES.find((q: any) => q.name === 'get_device_sync_log').sql, 'deviceId'));
  run('B036: bounty query has partial index', () => assert(inf().TOP_20_QUERIES.find((q: any) => q.name === 'list_active_bounties').indexes[0].partial !== undefined, 'partial'));
  run('B037: earnings query groups by month', () => assertContains(inf().TOP_20_QUERIES.find((q: any) => q.name === 'get_creator_earnings').sql, 'DATE_TRUNC'));
  run('B038: migration header has count', () => { const m = assertResult(new (inf().DatabaseOptimisationService)().generateIndexMigration()); assertContains(m, 'Total indexes'); });
  run('B039: pool acquire timeout staging 10s', () => assert(inf().CONNECTION_POOL_CONFIGS.staging.acquireTimeoutMs === 10000, '10s'));
  run('B040: pool acquire timeout prod 5s', () => assert(inf().CONNECTION_POOL_CONFIGS.production.acquireTimeoutMs === 5000, '5s'));

  // B25-003: CDN Optimisation (10 tests)
  run('B041: 5 cache behaviours defined', () => assert(inf().CDN_CACHE_BEHAVIOURS.length === 5, '5 behaviours'));
  run('B042: illustrations cached 1 year', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/illustrations/*').ttl.default === 86400 * 365, '1yr'));
  run('B043: audio has Range header', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/audio/*').headers.includes('Range'), 'Range'));
  run('B044: audio not compressed', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/audio/*').compress === false, 'no compress'));
  run('B045: API not cached', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/api/*').ttl.default === 0, 'no cache'));
  run('B046: illustrations have origin shield', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/illustrations/*').originShield === true, 'shield'));
  run('B047: CDN TF generated', () => { const svc = new (inf().CdnOptimisationService)(); assertResult(svc.generateCacheBehaviourTerraform(inf().CDN_CACHE_BEHAVIOURS)); });
  run('B048: CDN TF has origin shield', () => { const tf = assertResult(new (inf().CdnOptimisationService)().generateCacheBehaviourTerraform(inf().CDN_CACHE_BEHAVIOURS)); assertContains(tf, 'origin_shield'); });
  run('B049: CDN TF has TLS 1.2', () => { const tf = assertResult(new (inf().CdnOptimisationService)().generateCacheBehaviourTerraform(inf().CDN_CACHE_BEHAVIOURS)); assertContains(tf, 'TLSv1.2'); });
  run('B050: thumbnails cache query params', () => assert(inf().CDN_CACHE_BEHAVIOURS.find((b: any) => b.pathPattern === '/thumbnails/*').queryStrings.includes('w'), 'w param'));

  // B25-004: Performance Baseline (10 tests)
  run('B051: 12 performance targets', () => assert(inf().PERFORMANCE_TARGETS.length === 12, '12 targets'));
  run('B052: API P95 target < 200ms', () => assert(inf().PERFORMANCE_TARGETS.find((t: any) => t.metric === 'API Response P95').target === '<200', '200ms'));
  run('B053: library search < 500ms', () => assert(inf().PERFORMANCE_TARGETS.find((t: any) => t.metric === 'Library Search P95').target === '<500', '500ms'));
  run('B054: generation < 30s', () => assert(inf().PERFORMANCE_TARGETS.find((t: any) => t.metric === 'Storybook Generation P95').target === '<30', '30s'));
  run('B055: CDN hit ratio > 95%', () => assert(inf().PERFORMANCE_TARGETS.find((t: any) => t.metric === 'CDN Cache Hit Ratio').target === '>95', '95%'));
  run('B056: error rate < 1%', () => assert(inf().PERFORMANCE_TARGETS.find((t: any) => t.metric === 'Error Rate').target === '<1', '1%'));
  run('B057: 6 capacity plan components', () => assert(inf().CAPACITY_PLAN.length === 6, '6 components'));
  run('B058: ECS headroom documented', () => assertContains(inf().CAPACITY_PLAN.find((c: any) => c.component === 'ECS Tasks').headroom, '50%'));
  run('B059: RDS production recommendation', () => assertContains(inf().CAPACITY_PLAN.find((c: any) => c.component === 'RDS (PostgreSQL)').scalingAction, 'r6g.large'));
  run('B060: CloudFront needs no scaling', () => assertContains(inf().CAPACITY_PLAN.find((c: any) => c.component === 'CloudFront').scalingAction, 'None'));

  return { name: 'Path B: Load Testing & Performance', tests };
}

// ============================================================================
// PATH C TESTS (60 tests) — Marketplace & Creator Economy
// ============================================================================

function testPathC(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const mkt = () => require('../storybook/marketplace-creator-economy');

  const mkProfile = (overrides?: any): any => ({
    id: 'c1', userId: 'u1', displayName: 'Test Creator', bio: 'A test bio',
    tier: 'bronze', credentials: [], onboardingStatus: 'complete',
    contentGuidelines: { accepted: true, version: '1.0' },
    sdkSetup: { completed: true, apiKeyGenerated: true, firstBookGenerated: true },
    statistics: { totalBooks: 5, publishedBooks: 3, totalReads: 100, totalEarnings: 50, averageRating: 4.0, averageCompletionRate: 0.75, engagementScore: 100 },
    ...overrides,
  });

  // C25-001: Creator Onboarding (15 tests)
  run('C001: onboarding service instantiates', () => assert(new (mkt().CreatorOnboardingService)() !== null, 'svc'));
  run('C002: 5 onboarding steps defined', () => assert(mkt().ONBOARDING_STEPS.length === 5, '5 steps'));
  run('C003: 4 required steps', () => assert(mkt().ONBOARDING_STEPS.filter((s: any) => s.required).length === 4, '4 req'));
  run('C004: credentials step is optional', () => assert(mkt().ONBOARDING_STEPS.find((s: any) => s.id === 'credentials').required === false, 'optional'));
  run('C005: 4 tier levels', () => assert(Object.keys(mkt().TIER_REQUIREMENTS).length === 4, '4 tiers'));
  run('C006: bronze requires 0 books', () => assert(mkt().TIER_REQUIREMENTS.bronze.minBooks === 0, '0 books'));
  run('C007: platinum requires credentials', () => assert(mkt().TIER_REQUIREMENTS.platinum.credentialsRequired === true, 'creds'));
  run('C008: platinum requires 20+ books', () => assert(mkt().TIER_REQUIREMENTS.platinum.minBooks === 20, '20 books'));
  run('C009: tier upgrade evaluates correctly', () => { const svc = new (mkt().CreatorOnboardingService)(); const r = assertResult(svc.evaluateTierUpgrade(mkProfile({ tier: 'bronze', statistics: { publishedBooks: 5, averageRating: 4.0, engagementScore: 100 } }))); assert(r.eligible === true, 'eligible for silver'); assert(r.nextTier === 'silver', 'silver'); });
  run('C010: tier upgrade fails insufficient books', () => { const svc = new (mkt().CreatorOnboardingService)(); const r = assertResult(svc.evaluateTierUpgrade(mkProfile({ tier: 'bronze', statistics: { publishedBooks: 1, averageRating: 2.0, engagementScore: 10 } }))); assert(r.eligible === false, 'not eligible'); assert(r.requirements!.length > 0, 'requirements'); });
  run('C011: max tier returns not eligible', () => { const svc = new (mkt().CreatorOnboardingService)(); const r = assertResult(svc.evaluateTierUpgrade(mkProfile({ tier: 'platinum' }))); assert(r.eligible === false, 'at max'); });
  run('C012: progress 100% when complete', () => { const svc = new (mkt().CreatorOnboardingService)(); assert(svc.calculateProgress(mkProfile()) === 100, '100%'); });
  run('C013: progress 0% when empty', () => { const svc = new (mkt().CreatorOnboardingService)(); assert(svc.calculateProgress(mkProfile({ displayName: '', bio: '', contentGuidelines: { accepted: false }, sdkSetup: { apiKeyGenerated: false, firstBookGenerated: false } })) === 0, '0%'); });
  run('C014: gold requires 4.0+ rating', () => assert(mkt().TIER_REQUIREMENTS.gold.minRating === 4.0, '4.0'));
  run('C015: silver requires 3.5+ rating', () => assert(mkt().TIER_REQUIREMENTS.silver.minRating === 3.5, '3.5'));

  // C25-002: Revenue Sharing (15 tests)
  run('C016: revenue engine instantiates', () => assert(new (mkt().RevenueShareEngine)() !== null, 'engine'));
  run('C017: default creator share 40%', () => assert(mkt().DEFAULT_REVENUE_CONFIG.creatorSharePercent === 40, '40%'));
  run('C018: default platform share 50%', () => assert(mkt().DEFAULT_REVENUE_CONFIG.platformSharePercent === 50, '50%'));
  run('C019: default DAO share 10%', () => assert(mkt().DEFAULT_REVENUE_CONFIG.daoTreasuryPercent === 10, '10%'));
  run('C020: shares sum to 100%', () => { const c = mkt().DEFAULT_REVENUE_CONFIG; assert(c.creatorSharePercent + c.platformSharePercent + c.daoTreasuryPercent === 100, '100%'); });
  run('C021: min payout $10', () => assert(mkt().DEFAULT_REVENUE_CONFIG.minPayoutAmount === 10.00, '$10'));
  run('C022: engagement score > 0 for active content', () => { const e = new (mkt().RevenueShareEngine)(); const s = e.calculateEngagementScore({ totalReadingTimeMinutes: 500, completionRate: 0.8, reReadRate: 0.3, averageAccuracy: 0.85, reads: 100 }); assert(s > 0, 'positive'); });
  run('C023: higher engagement = higher score', () => { const e = new (mkt().RevenueShareEngine)(); const low = e.calculateEngagementScore({ totalReadingTimeMinutes: 10, completionRate: 0.3, reReadRate: 0, averageAccuracy: 0.5, reads: 5 }); const high = e.calculateEngagementScore({ totalReadingTimeMinutes: 500, completionRate: 0.9, reReadRate: 0.4, averageAccuracy: 0.9, reads: 200 }); assert(high > low, 'high > low'); });
  run('C024: tier multiplier bronze=1.0', () => assert(new (mkt().RevenueShareEngine)().getTierMultiplier('bronze') === 1.0, '1.0'));
  run('C025: tier multiplier platinum=1.5', () => assert(new (mkt().RevenueShareEngine)().getTierMultiplier('platinum') === 1.5, '1.5'));
  run('C026: earning calculation succeeds', () => { const e = new (mkt().RevenueShareEngine)(); const r = assertResult(e.calculateEarning({ creatorId: 'c1', storyId: 's1', period: '2026-02', tier: 'silver', metrics: { reads: 100, totalReadingTimeMinutes: 500, completionRate: 0.8, reReadRate: 0.2, averageAccuracy: 0.85 }, totalRevenuePool: 10000, totalPlatformEngagement: 1000 })); assert(r.adjustedAmount > 0, 'positive earning'); assert(r.tierMultiplier === 1.1, 'silver mult'); });
  run('C027: platinum earns more than bronze', () => { const e = new (mkt().RevenueShareEngine)(); const m = { reads: 100, totalReadingTimeMinutes: 500, completionRate: 0.8, reReadRate: 0.2, averageAccuracy: 0.85 }; const b = assertResult(e.calculateEarning({ creatorId: 'c1', storyId: 's1', period: '2026-02', tier: 'bronze', metrics: m, totalRevenuePool: 10000, totalPlatformEngagement: 1000 })); const p = assertResult(e.calculateEarning({ creatorId: 'c1', storyId: 's1', period: '2026-02', tier: 'platinum', metrics: m, totalRevenuePool: 10000, totalPlatformEngagement: 1000 })); assert(p.adjustedAmount > b.adjustedAmount, 'plat > bronze'); });
  run('C028: meets minimum payout', () => { const e = new (mkt().RevenueShareEngine)(); assert(e.meetsMinimumPayout(15) === true, 'above'); assert(e.meetsMinimumPayout(5) === false, 'below'); });
  run('C029: engagement weights sum to 1.0', () => { const w = mkt().DEFAULT_REVENUE_CONFIG.engagementWeights; assert(Math.abs(w.readingTimeWeight + w.completionRateWeight + w.reReadWeight + w.accuracyWeight - 1.0) < 0.01, '1.0'); });
  run('C030: earning status is calculated', () => { const r = assertResult(new (mkt().RevenueShareEngine)().calculateEarning({ creatorId: 'c1', storyId: 's1', period: '2026-02', tier: 'bronze', metrics: { reads: 10, totalReadingTimeMinutes: 50, completionRate: 0.7, reReadRate: 0.1, averageAccuracy: 0.8 }, totalRevenuePool: 1000, totalPlatformEngagement: 100 })); assert(r.status === 'calculated', 'calculated'); });

  // C25-003: Content Bounty System (15 tests)
  run('C031: bounty service instantiates', () => assert(new (mkt().BountyService)() !== null, 'bounty'));
  run('C032: validates matching submission', () => { const svc = new (mkt().BountyService)(); const bounty = { requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } }; const r = assertResult(svc.validateSubmission(bounty as any, { phonicsPhase: 3, decodabilityScore: 0.90, pageCount: 12, ageGroup: '5-6' })); assert(r.valid === true, 'valid'); });
  run('C033: rejects wrong phase', () => { const svc = new (mkt().BountyService)(); const bounty = { requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } }; const r = assertResult(svc.validateSubmission(bounty as any, { phonicsPhase: 5, decodabilityScore: 0.90, pageCount: 12, ageGroup: '5-6' })); assert(r.valid === false, 'invalid'); });
  run('C034: rejects low decodability', () => { const svc = new (mkt().BountyService)(); const bounty = { requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } }; const r = assertResult(svc.validateSubmission(bounty as any, { phonicsPhase: 3, decodabilityScore: 0.60, pageCount: 12, ageGroup: '5-6' })); assert(r.valid === false, 'invalid'); assert(r.issues.some((i: string) => i.includes('Decodability')), 'dec issue'); });
  run('C035: rejects wrong page count', () => { const svc = new (mkt().BountyService)(); const bounty = { requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } }; const r = assertResult(svc.validateSubmission(bounty as any, { phonicsPhase: 3, decodabilityScore: 0.90, pageCount: 4, ageGroup: '5-6' })); assert(r.valid === false, 'invalid'); });
  run('C036: accepting submissions when active', () => { const svc = new (mkt().BountyService)(); assert(svc.isAcceptingSubmissions({ status: 'active', timeline: { submissionDeadline: new Date(Date.now() + 86400000) } } as any) === true, 'accepting'); });
  run('C037: not accepting when expired', () => { const svc = new (mkt().BountyService)(); assert(svc.isAcceptingSubmissions({ status: 'active', timeline: { submissionDeadline: new Date(Date.now() - 86400000) } } as any) === false, 'expired'); });
  run('C038: not accepting when closed', () => { const svc = new (mkt().BountyService)(); assert(svc.isAcceptingSubmissions({ status: 'submissions_closed', timeline: { submissionDeadline: new Date(Date.now() + 86400000) } } as any) === false, 'closed'); });
  run('C039: average score calculated', () => { const svc = new (mkt().BountyService)(); assert(svc.calculateAverageScore({ scores: [{ score: 8 }, { score: 6 }, { score: 10 }] } as any) === 8, 'avg 8'); });
  run('C040: winner selected by highest score', () => { const svc = new (mkt().BountyService)(); const subs = [{ id: 's1', scores: [{ score: 7 }] }, { id: 's2', scores: [{ score: 9 }] }, { id: 's3', scores: [{ score: 5 }] }]; const r = assertResult(svc.selectWinner(subs as any)); assert(r.winner.id === 's2', 'highest wins'); });
  run('C041: runner up identified', () => { const svc = new (mkt().BountyService)(); const subs = [{ id: 's1', scores: [{ score: 7 }] }, { id: 's2', scores: [{ score: 9 }] }]; const r = assertResult(svc.selectWinner(subs as any)); assert(r.runnerUp?.id === 's1', 'runner up'); });
  run('C042: no submissions fails', () => { const svc = new (mkt().BountyService)(); assert(svc.selectWinner([]).success === false, 'fails'); });
  run('C043: zero score for no scores', () => assert(new (mkt().BountyService)().calculateAverageScore({ scores: [] } as any) === 0, '0'));
  run('C044: wrong age group rejected', () => { const svc = new (mkt().BountyService)(); const r = assertResult(svc.validateSubmission({ requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } } as any, { phonicsPhase: 3, decodabilityScore: 0.90, pageCount: 12, ageGroup: '7-8' })); assert(r.valid === false, 'wrong age'); });
  run('C045: multiple issues reported', () => { const svc = new (mkt().BountyService)(); const r = assertResult(svc.validateSubmission({ requirements: { phonicsPhase: 3, minDecodability: 0.85, pageCount: { min: 8, max: 16 }, ageGroup: '5-6' } } as any, { phonicsPhase: 5, decodabilityScore: 0.50, pageCount: 4, ageGroup: '7-8' })); assert(r.issues.length >= 3, '3+ issues'); });

  // C25-004: OER Channel + Events (15 tests)
  run('C046: OER service instantiates', () => assert(new (mkt().OerService)() !== null, 'oer'));
  run('C047: 4 CC licenses defined', () => assert(Object.keys(mkt().OER_LICENSE_DETAILS).length === 4, '4 licenses'));
  run('C048: CC-BY allows commercial', () => assert(mkt().OER_LICENSE_DETAILS['CC-BY-4.0'].commercial === true, 'commercial'));
  run('C049: CC-BY-NC blocks commercial', () => assert(mkt().OER_LICENSE_DETAILS['CC-BY-NC-4.0'].commercial === false, 'no commercial'));
  run('C050: badge threshold 100 downloads', () => assert(mkt().DEFAULT_OER_CONFIG.oerBadgeThreshold === 100, '100'));
  run('C051: qualifies for badge at threshold', () => { const svc = new (mkt().OerService)(); assert(svc.qualifiesForBadge({ downloadCount: 150 } as any) === true, 'qualifies'); });
  run('C052: no badge below threshold', () => { const svc = new (mkt().OerService)(); assert(svc.qualifiesForBadge({ downloadCount: 50 } as any) === false, 'no badge'); });
  run('C053: attribution generated correctly', () => { const svc = new (mkt().OerService)(); const a = svc.generateAttribution('Jane', 'Finn the Fox', 'CC-BY-4.0'); assertContains(a, 'Jane'); assertContains(a, 'Finn the Fox'); assertContains(a, 'Attribution 4.0'); });
  run('C054: license validation works', () => { const svc = new (mkt().OerService)(); assert(svc.isLicenseEnabled('CC-BY-4.0') === true, 'enabled'); });
  run('C055: rate limit enforced', () => { const svc = new (mkt().OerService)(); assert(svc.isWithinRateLimit(10) === true, 'under'); assert(svc.isWithinRateLimit(60) === false, 'over'); });
  run('C056: free for schools enabled', () => assert(mkt().DEFAULT_OER_CONFIG.freeForSchools === true, 'free'));
  run('C057: 8 marketplace events defined', () => assert(mkt().MARKETPLACE_EVENTS.length === 8, '8 events'));
  run('C058: events use scholarly.marketplace.* subjects', () => assert(mkt().MARKETPLACE_EVENTS.every((e: any) => e.natsSubject.startsWith('scholarly.marketplace.')), 'subjects'));
  run('C059: payout event has stripeTransferId', () => assert(mkt().MARKETPLACE_EVENTS.find((e: any) => e.type === 'payout.processed').payload.stripeTransferId !== undefined, 'stripe'));
  run('C060: bounty awarded event exists', () => assert(mkt().MARKETPLACE_EVENTS.some((e: any) => e.type === 'bounty.awarded'), 'awarded'));

  return { name: 'Path C: Marketplace & Creator Economy', tests };
}

// Run all
function runAll(): void {
  const suites = [testPathB(), testPathC()];
  let tp = 0, tf = 0;
  for (const s of suites) {
    console.log(`\n${'='.repeat(60)}\n  ${s.name}\n${'='.repeat(60)}`);
    let p = 0, f = 0;
    for (const t of s.tests) { if (t.passed) { console.log(`  ✓ ${t.name}`); p++; } else { console.log(`  ✗ ${t.name}: ${t.error}`); f++; } }
    console.log(`\n  ${p} passed, ${f} failed (${s.tests.length} total)`);
    tp += p; tf += f;
  }
  console.log(`\n${'='.repeat(60)}\n  TOTAL: ${tp} passed, ${tf} failed (${tp + tf} total)\n${'='.repeat(60)}\n`);
}
runAll();
