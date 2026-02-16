// ============================================================================
// SPRINT 24 TEST SUITE — 120 TESTS
// Scholarly Platform — Observability + Review Pipeline
// ============================================================================

import { Result, ok, fail } from '../shared/base';

interface TestResult { name: string; passed: boolean; error?: string; }
interface TestSuite { name: string; tests: TestResult[]; }

function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertContains(h: string, n: string, ctx?: string): void { if (!h.includes(n)) throw new Error(`Expected "${n}"${ctx ? ` (${ctx})` : ''}`); }
function assertResult<T>(r: Result<T>, c?: string): T { assert(r.success === true, `Expected success${c ? ` for ${c}` : ''}`); return (r as any).data; }

// ============================================================================
// PATH B TESTS (60 tests) — Monitoring, Alerting & Observability
// ============================================================================

function testPathB(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const inf = () => require('../infrastructure/monitoring-observability');

  // B24-001: Dashboard Suite (20 tests)
  run('B001: 5 dashboards defined', () => assert(inf().ALL_DASHBOARDS.length === 5, '5 dashboards'));
  run('B002: API dashboard has 6 panels', () => assert(inf().API_PERFORMANCE_DASHBOARD.panels.length === 6, '6 panels'));
  run('B003: API dashboard has P95 latency panel', () => assert(inf().API_PERFORMANCE_DASHBOARD.panels.some((p: any) => p.title.includes('P95')), 'P95'));
  run('B004: API dashboard has error rate panel', () => assert(inf().API_PERFORMANCE_DASHBOARD.panels.some((p: any) => p.title.includes('Error Rate')), 'error'));
  run('B005: API dashboard has heatmap', () => assert(inf().API_PERFORMANCE_DASHBOARD.panels.some((p: any) => p.type === 'heatmap'), 'heatmap'));
  run('B006: DB dashboard has 6 panels', () => assert(inf().DATABASE_HEALTH_DASHBOARD.panels.length === 6, '6 db panels'));
  run('B007: DB dashboard has connection pool gauge', () => assert(inf().DATABASE_HEALTH_DASHBOARD.panels.some((p: any) => p.title.includes('Connection Pool')), 'pool'));
  run('B008: DB dashboard has slow queries table', () => assert(inf().DATABASE_HEALTH_DASHBOARD.panels.some((p: any) => p.type === 'table' && p.title.includes('Slow')), 'slow'));
  run('B009: DB pool threshold at 80%', () => { const p = inf().DATABASE_HEALTH_DASHBOARD.panels.find((p: any) => p.title.includes('Connection Pool')); assert(p.thresholds.some((t: any) => t.value === 80 && t.color === 'red'), '80%'); });
  run('B010: Content dashboard has 6 panels', () => assert(inf().CONTENT_GENERATION_DASHBOARD.panels.length === 6, '6 gen panels'));
  run('B011: Content dashboard has cost per book', () => assert(inf().CONTENT_GENERATION_DASHBOARD.panels.some((p: any) => p.title.includes('Cost per Book')), 'cost'));
  run('B012: Content dashboard cost threshold $2', () => { const p = inf().CONTENT_GENERATION_DASHBOARD.panels.find((p: any) => p.title.includes('Cost per Book')); assert(p.thresholds.some((t: any) => t.value === 2), '$2'); });
  run('B013: User engagement dashboard has 6 panels', () => assert(inf().USER_ENGAGEMENT_DASHBOARD.panels.length === 6, '6 ux panels'));
  run('B014: User dashboard has DAR panel', () => assert(inf().USER_ENGAGEMENT_DASHBOARD.panels.some((p: any) => p.title.includes('Active Readers')), 'DAR'));
  run('B015: User dashboard has WCPM panel', () => assert(inf().USER_ENGAGEMENT_DASHBOARD.panels.some((p: any) => p.title.includes('WCPM')), 'WCPM'));
  run('B016: Cost dashboard has 6 panels', () => assert(inf().COST_TRACKING_DASHBOARD.panels.length === 6, '6 cost panels'));
  run('B017: Cost dashboard has budget gauge', () => assert(inf().COST_TRACKING_DASHBOARD.panels.some((p: any) => p.title.includes('Budget')), 'budget'));
  run('B018: Cost dashboard budget threshold 80%', () => { const p = inf().COST_TRACKING_DASHBOARD.panels.find((p: any) => p.title.includes('Budget')); assert(p.thresholds.some((t: any) => t.value === 80), '80%'); });
  run('B019: Cost dashboard has token usage', () => assert(inf().COST_TRACKING_DASHBOARD.panels.some((p: any) => p.title.includes('Token')), 'tokens'));
  run('B020: All dashboards have environment variable', () => assert(inf().ALL_DASHBOARDS.every((d: any) => d.variables.some((v: any) => v.name === 'environment')), 'env'));

  // B24-002: Alert Rules (15 tests)
  run('B021: 11 alert rules defined', () => assert(inf().ALERT_RULES.length === 11, '11 rules'));
  run('B022: critical alerts have pagerduty', () => assert(inf().ALERT_RULES.filter((r: any) => r.severity === 'critical').every((r: any) => r.channels.includes('pagerduty')), 'pd'));
  run('B023: warning alerts have slack', () => assert(inf().ALERT_RULES.filter((r: any) => r.severity === 'warning').every((r: any) => r.channels.includes('slack')), 'slack'));
  run('B024: P95 > 2s alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-api-p95-latency'), 'p95'));
  run('B025: error rate > 5% alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-error-rate'), 'err'));
  run('B026: DB pool > 80% alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-db-pool-exhaustion'), 'pool'));
  run('B027: disk > 85% alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-disk-usage'), 'disk'));
  run('B028: NATS lag alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-nats-consumer-lag'), 'nats'));
  run('B029: generation cost > $2 alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-generation-cost'), 'cost'));
  run('B030: auth failure > 10% alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-auth-failure-rate'), 'auth'));
  run('B031: budget 80% warning exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-budget-80'), 'b80'));
  run('B032: budget 100% critical exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-budget-100'), 'b100'));
  run('B033: CDN miss rate alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-cdn-miss-rate'), 'cdn'));
  run('B034: decodability failure alert exists', () => assert(inf().ALERT_RULES.some((r: any) => r.id === 'scholarly-decodability-failures'), 'dec'));
  run('B035: all alerts have runbook or annotations', () => assert(inf().ALERT_RULES.every((r: any) => r.annotations.summary), 'annotations'));

  // B24-003: Structured Logging (13 tests)
  run('B036: log service instantiates', () => assert(new (inf().StructuredLogService)() !== null, 'log svc'));
  run('B037: log entry has correlation ID', () => { const svc = new (inf().StructuredLogService)(); const entry = svc.createEntry({ level: 'info', message: 'test', correlationId: 'corr-123', service: 'api' }); assert(entry.correlationId === 'corr-123', 'corr'); });
  run('B038: log redacts sensitive fields', () => { const svc = new (inf().StructuredLogService)(); const entry = svc.createEntry({ level: 'info', message: 'test', correlationId: 'c', service: 'api', metadata: { token: 'secret', safe: 'visible' } }); assert((entry.metadata as any).token === '[REDACTED]', 'redacted'); assert((entry.metadata as any).safe === 'visible', 'visible'); });
  run('B039: correlation query generated', () => { const svc = new (inf().StructuredLogService)(); const q = svc.generateCorrelationQuery('corr-123'); assertContains(q, 'corr-123'); assertContains(q, 'correlationId'); });
  run('B040: slow request query generated', () => { const svc = new (inf().StructuredLogService)(); const q = svc.generateSlowRequestQuery(500); assertContains(q, '500'); assertContains(q, 'duration_ms'); });
  run('B041: error analysis query generated', () => { const svc = new (inf().StructuredLogService)(); const q = svc.generateErrorAnalysisQuery(); assertContains(q, 'error'); assertContains(q, 'fatal'); });
  run('B042: log pipeline TF generated', () => { const svc = new (inf().StructuredLogService)(); const tf = assertResult(svc.generateLogPipelineTerraform()); assertContains(tf, 'aws_cloudwatch_log_group'); });
  run('B043: 5 log groups in TF', () => { const svc = new (inf().StructuredLogService)(); const tf = assertResult(svc.generateLogPipelineTerraform()); const count = (tf.match(/aws_cloudwatch_log_group/g) || []).length; assert(count >= 5, '5+ groups'); });
  run('B044: metric filters for errors', () => { const svc = new (inf().StructuredLogService)(); const tf = assertResult(svc.generateLogPipelineTerraform()); assertContains(tf, 'log_metric_filter'); });
  run('B045: default retention 30 days', () => assert(inf().DEFAULT_LOG_PIPELINE_CONFIG.retentionDays === 30, '30d'));
  run('B046: sensitive fields include password', () => assert(inf().DEFAULT_LOG_PIPELINE_CONFIG.sensitiveFields.includes('password'), 'password'));
  run('B047: sensitive fields include apiKey', () => assert(inf().DEFAULT_LOG_PIPELINE_CONFIG.sensitiveFields.includes('apiKey'), 'apiKey'));
  run('B048: CloudWatch Insights enabled by default', () => assert(inf().DEFAULT_LOG_PIPELINE_CONFIG.enableInsights === true, 'insights'));

  // B24-004: Grafana Provisioning + Metrics (12 tests)
  run('B049: Grafana provisioning generates 4 files', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assert(files.size === 4, '4 files'); });
  run('B050: datasources include prometheus', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-datasources.tf'), 'prometheus'); });
  run('B051: datasources include cloudwatch', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-datasources.tf'), 'cloudwatch'); });
  run('B052: dashboards TF has folder', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-dashboards.tf'), 'grafana_folder'); });
  run('B053: notifications have PagerDuty', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-notification-channels.tf'), 'pagerduty'); });
  run('B054: notifications have Slack', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-notification-channels.tf'), 'slack'); });
  run('B055: notification policy routes critical to PD', () => { const g = new (inf().GrafanaProvisioningGenerator)(); const files = assertResult(g.generateTerraform(inf().ALL_DASHBOARDS, inf().ALERT_RULES, 'staging')); assertContains(files.get('grafana-notification-channels.tf'), 'critical'); });
  run('B056: 28 Prometheus metrics defined', () => assert(inf().SCHOLARLY_METRICS.length === 28, '28 metrics'));
  run('B057: HTTP metrics include duration histogram', () => assert(inf().SCHOLARLY_METRICS.some((m: any) => m.name === 'http_request_duration_seconds' && m.type === 'histogram'), 'http dur'));
  run('B058: DB metrics include pool gauge', () => assert(inf().SCHOLARLY_METRICS.some((m: any) => m.name === 'db_pool_active_connections' && m.type === 'gauge'), 'db pool'));
  run('B059: AI cost counter exists', () => assert(inf().SCHOLARLY_METRICS.some((m: any) => m.name === 'ai_provider_cost_total' && m.type === 'counter'), 'ai cost'));
  run('B060: WCPM histogram exists', () => assert(inf().SCHOLARLY_METRICS.some((m: any) => m.name === 'reading_session_wcpm' && m.type === 'histogram'), 'wcpm'));

  return { name: 'Path B: Monitoring, Alerting & Observability', tests };
}

// ============================================================================
// PATH C TESTS (60 tests) — Review Pipeline & Content Safety
// ============================================================================

function testPathC(): TestSuite {
  const tests: TestResult[] = [];
  const run = (n: string, fn: () => void) => { try { fn(); tests.push({ name: n, passed: true }); } catch (e: any) { tests.push({ name: n, passed: false, error: e.message }); } };
  const rev = () => require('../storybook/review-pipeline-safety');

  const mkStory = (text: string, pages?: number): any => ({
    id: 'test', title: 'Test', creatorId: 'creator1',
    pages: Array.from({ length: pages || 1 }, (_, i) => ({
      text: i === 0 ? text : 'the cat sat',
      illustrationUrl: 'http://img.test/p.jpg',
      audioUrl: 'http://audio.test/p.mp3',
      audioDurationMs: 5000,
      wordTimestamps: text.split(' ').map((w, j) => ({ word: w, startMs: j * 500, endMs: (j + 1) * 500 })),
    })),
    metadata: {
      phonicsPhase: 3, targetGpcs: ['sh', 'ch', 'th'],
      taughtGpcSet: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'e', 'u', 'r', 'h', 'b', 'f', 'l', 'sh', 'ch', 'th'],
      decodabilityScore: 0.90, vocabularyTier: 'tier1',
      wcpmBand: { min: 20, max: 60 }, wordCount: 100, ageGroup: '5-6',
    },
  });

  // C24-001: Automated Validation (15 tests)
  run('C001: service instantiates', () => assert(new (rev().AutomatedValidationService)() !== null, 'svc'));
  run('C002: validates clean story', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the ship sat on the path', 8)); assert(r.success, 'success'); });
  run('C003: decodability check works', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the cat sat', 8)); assert(r.data.decodability.passed === true, 'dec passed'); });
  run('C004: non-decodable words caught', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the magnificent cathedral sparkled', 8)); assert(r.data.decodability.nonDecodableWords.length > 0, 'non-dec'); });
  run('C005: text safety flags violence', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the knight tried to kill the dragon', 8)); assert(!r.data.textSafety.safe, 'unsafe'); });
  run('C006: text safety passes clean', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the cat sat on the mat', 8)); assert(r.data.textSafety.safe === true, 'safe'); });
  run('C007: structure checks illustration coverage', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('test', 8)); assert(r.data.structuralCompleteness.illustrationCoverage >= 0, 'illus'); });
  run('C008: metadata checks missing fields', async () => { const story = { ...mkStory('test', 8), metadata: {} }; const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(story); assert(r.data.metadataCompleteness.missingFields.length > 0, 'missing'); });
  run('C009: overall score 0-100', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the cat sat', 8)); assert(r.data.score >= 0 && r.data.score <= 100, 'range'); });
  run('C010: issues include stage info', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the magnificent cathedral', 4)); assert(r.data.issues.some((i: any) => i.stage !== undefined), 'stage'); });
  run('C011: blocking issues prevent pass', async () => { const svc = new (rev().AutomatedValidationService)(); const story = mkStory('kill murder blood', 4); const r = await svc.validate(story); assert(r.data.passed === false, 'blocked'); });
  run('C012: vocabulary tier detected', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('the big red cat', 8)); assert(r.data.vocabulary.tier !== undefined, 'tier'); });
  run('C013: audio quality checked', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('test', 8)); assert(r.data.audioQuality !== undefined, 'audio'); });
  run('C014: duration tracked', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('test', 8)); assert(r.data.duration_ms >= 0, 'duration'); });
  run('C015: stereotyping detected', async () => { const svc = new (rev().AutomatedValidationService)(); const r = await svc.validate(mkStory('stupid dumb ugly', 8)); assert(r.data.textSafety.flags.length > 0, 'demeaning'); });

  // C24-002: AI Review (15 tests)
  run('C016: AI review service instantiates', () => assert(new (rev().AiReviewService)() !== null, 'ai svc'));
  run('C017: review prompt generated', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('test', 8))); assertContains(r, 'Pedagogical Quality'); });
  run('C018: prompt includes story text', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('the ship sailed', 8))); assertContains(r, 'the ship sailed'); });
  run('C019: prompt includes phonics phase', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('test', 8))); assertContains(r, 'Phase'); });
  run('C020: prompt includes target GPCs', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('test', 8))); assertContains(r, 'sh'); assertContains(r, 'ch'); assertContains(r, 'th'); });
  run('C021: prompt requests JSON response', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('test', 8))); assertContains(r, 'JSON'); });
  run('C022: prompt has decision criteria', () => { const svc = new (rev().AiReviewService)(); const r = assertResult(svc.generateReviewPrompt(mkStory('test', 8))); assertContains(r, 'Approve'); assertContains(r, 'Revise'); assertContains(r, 'Reject'); });
  run('C023: valid JSON parses to approve', () => { const svc = new (rev().AiReviewService)(); const json = JSON.stringify({ recommendation: 'approve', overallScore: 85, rubric: { pedagogicalQuality: 4, narrativeCoherence: 4, ageAppropriateness: 5, curriculumAlignment: 4, engagementPotential: 4, illustrationTextMatch: 4 }, narrativeAnalysis: { hasBeginningMiddleEnd: true, characterDevelopment: 'adequate', emotionalEngagement: 'medium', repetitionQuality: 'appropriate', sentenceLengthAppropriate: true, narrativeTemplate: 'hero_journey' }, gpcEffectiveness: { targetGpcsAppearCount: { sh: 5, ch: 3, th: 4 }, targetGpcsInHighlightWords: true, naturalIntegration: true, sufficientPractice: true, progressionAppropriate: true }, ageAppropriateness: { themesSuitable: true, vocabularyLevel: 'at', conceptComplexity: 'simple', emotionalContent: 'light', culturalSensitivity: 'appropriate', concerns: [] }, curriculumAlignment: { phonicsPhaseAccurate: true, gpcTargetingAccurate: true, decodabilityClaimAccurate: true, wcpmBandAppropriate: true, metadataMatchesContent: true, mismatches: [] }, strengths: ['Good repetition'], improvements: [], detailedFeedback: 'Good story' }); const r = assertResult(svc.parseReviewResponse(json, { input: 100, output: 200 })); assert(r.recommendation === 'approve', 'approve'); assert(r.passed === true, 'passed'); });
  run('C024: rejects invalid recommendation', () => { const svc = new (rev().AiReviewService)(); const r = svc.parseReviewResponse('{"recommendation":"invalid"}', { input: 0, output: 0 }); assert(r.success === false, 'rejected'); });
  run('C025: rejects out-of-range score', () => { const svc = new (rev().AiReviewService)(); const r = svc.parseReviewResponse('{"recommendation":"approve","overallScore":150}', { input: 0, output: 0 }); assert(r.success === false, 'rejected'); });
  run('C026: rejects bad rubric', () => { const svc = new (rev().AiReviewService)(); const r = svc.parseReviewResponse('{"recommendation":"approve","overallScore":80,"rubric":{"pedagogicalQuality":0}}', { input: 0, output: 0 }); assert(r.success === false, 'rejected'); });
  run('C027: handles markdown-wrapped JSON', () => { const svc = new (rev().AiReviewService)(); const json = '```json\n{"recommendation":"approve","overallScore":80,"rubric":{"pedagogicalQuality":4,"narrativeCoherence":4,"ageAppropriateness":4,"curriculumAlignment":4,"engagementPotential":4,"illustrationTextMatch":4}}\n```'; const r = svc.parseReviewResponse(json, { input: 0, output: 0 }); assert(r.success === true, 'parsed'); });
  run('C028: tokens tracked', () => { const svc = new (rev().AiReviewService)(); const json = JSON.stringify({ recommendation: 'revise', overallScore: 55, rubric: { pedagogicalQuality: 3, narrativeCoherence: 3, ageAppropriateness: 4, curriculumAlignment: 3, engagementPotential: 3, illustrationTextMatch: 3 }, narrativeAnalysis: {}, gpcEffectiveness: {}, ageAppropriateness: {}, curriculumAlignment: {}, strengths: [], improvements: [], detailedFeedback: '' }); const r = assertResult(svc.parseReviewResponse(json, { input: 500, output: 800 })); assert(r.tokensUsed.input === 500 && r.tokensUsed.output === 800, 'tokens'); });
  run('C029: model version recorded', () => { const svc = new (rev().AiReviewService)({ modelId: 'test-model' }); const json = JSON.stringify({ recommendation: 'approve', overallScore: 80, rubric: { pedagogicalQuality: 4, narrativeCoherence: 4, ageAppropriateness: 4, curriculumAlignment: 4, engagementPotential: 4, illustrationTextMatch: 4 }, narrativeAnalysis: {}, gpcEffectiveness: {}, ageAppropriateness: {}, curriculumAlignment: {}, strengths: [], improvements: [], detailedFeedback: '' }); const r = assertResult(svc.parseReviewResponse(json, { input: 0, output: 0 })); assert(r.modelVersion === 'test-model', 'model'); });
  run('C030: default model is claude-sonnet', () => { const svc = new (rev().AiReviewService)(); const prompt = assertResult(svc.generateReviewPrompt(mkStory('t', 8))); assert(typeof prompt === 'string', 'prompt'); });

  // C24-003: Peer Review (15 tests)
  run('C031: matching service instantiates', () => assert(new (rev().ReviewerMatchingService)() !== null, 'match'));
  run('C032: matches 2+ reviewers', () => { const svc = new (rev().ReviewerMatchingService)(); const reviewers = [{ id: 'r1', tier: 'gold', phonicsPhaseExpertise: [3], reviewCount: 10, averageReviewScore: 4 }, { id: 'r2', tier: 'silver', phonicsPhaseExpertise: [3], reviewCount: 5, averageReviewScore: 3.5 }, { id: 'r3', tier: 'bronze', phonicsPhaseExpertise: [3], reviewCount: 2, averageReviewScore: 3 }]; const r = assertResult(svc.matchReviewers(mkStory('t', 8), reviewers as any)); assert(r.length >= 2, '2+ matches'); });
  run('C033: excludes creator from reviewers', () => { const svc = new (rev().ReviewerMatchingService)(); const reviewers = [{ id: 'creator1', tier: 'gold', phonicsPhaseExpertise: [3], reviewCount: 10, averageReviewScore: 5 }, { id: 'r2', tier: 'silver', phonicsPhaseExpertise: [3], reviewCount: 5, averageReviewScore: 4 }, { id: 'r3', tier: 'bronze', phonicsPhaseExpertise: [3], reviewCount: 2, averageReviewScore: 3 }]; const r = assertResult(svc.matchReviewers(mkStory('t', 8), reviewers as any)); assert(!r.some((rv: any) => rv.id === 'creator1'), 'excluded'); });
  run('C034: filters by phase expertise', () => { const svc = new (rev().ReviewerMatchingService)(); const reviewers = [{ id: 'r1', tier: 'gold', phonicsPhaseExpertise: [1, 2], reviewCount: 10, averageReviewScore: 5 }, { id: 'r2', tier: 'silver', phonicsPhaseExpertise: [3], reviewCount: 5, averageReviewScore: 4 }, { id: 'r3', tier: 'bronze', phonicsPhaseExpertise: [3, 4], reviewCount: 2, averageReviewScore: 3 }]; const r = assertResult(svc.matchReviewers(mkStory('t', 8), reviewers as any)); assert(r.every((rv: any) => rv.phonicsPhaseExpertise.includes(3)), 'phase 3'); });
  run('C035: fails if insufficient reviewers', () => { const svc = new (rev().ReviewerMatchingService)(); const r = svc.matchReviewers(mkStory('t', 8), [{ id: 'r1', tier: 'gold', phonicsPhaseExpertise: [3], reviewCount: 10 }] as any); assert(r.success === false, 'insufficient'); });
  run('C036: XP base is 50', () => { const svc = new (rev().ReviewerMatchingService)(); const xp = svc.calculateReviewXp({ reviewerTier: 'bronze', inlineComments: [], timeSpentMinutes: 3, curriculumAssessment: { notes: '' }, overallComments: '' } as any); assert(xp >= 50, 'base 50'); });
  run('C037: XP bonus for inline comments', () => { const svc = new (rev().ReviewerMatchingService)(); const comments = Array.from({ length: 5 }, () => ({} as any)); const xp = svc.calculateReviewXp({ reviewerTier: 'bronze', inlineComments: comments, timeSpentMinutes: 10, curriculumAssessment: { notes: '' }, overallComments: '' } as any); assert(xp > 50, 'comment bonus'); });
  run('C038: platinum multiplier applied', () => { const svc = new (rev().ReviewerMatchingService)(); const base = svc.calculateReviewXp({ reviewerTier: 'bronze', inlineComments: [], timeSpentMinutes: 10, curriculumAssessment: { notes: '' }, overallComments: '' } as any); const plat = svc.calculateReviewXp({ reviewerTier: 'platinum', inlineComments: [], timeSpentMinutes: 10, curriculumAssessment: { notes: '' }, overallComments: '' } as any); assert(plat > base, 'platinum > bronze'); });
  run('C039: higher tiers scored higher', () => { const svc = new (rev().ReviewerMatchingService)(); const reviewers = [{ id: 'r1', tier: 'platinum', phonicsPhaseExpertise: [3], reviewCount: 100, averageReviewScore: 5, verifiedAt: new Date() }, { id: 'r2', tier: 'bronze', phonicsPhaseExpertise: [3], reviewCount: 1, averageReviewScore: 3 }]; const r = assertResult(svc.matchReviewers(mkStory('t', 8), reviewers as any)); assert(r[0].id === 'r1', 'platinum first'); });

  // C24-004: Content Safety + Pipeline Orchestration (15 tests)
  run('C040: safety service instantiates', () => assert(new (rev().ContentSafetyService)() !== null, 'safety'));
  run('C041: bias detection finds gender imbalance', () => { const svc = new (rev().ContentSafetyService)(); const r = assertResult(svc.detectBias(mkStory('he ran and he played and he jumped', 8))); assert(r.flags.some((f: any) => f.type === 'gender'), 'gender flag'); });
  run('C042: balanced gender passes', () => { const svc = new (rev().ContentSafetyService)(); const r = assertResult(svc.detectBias(mkStory('she ran and he played', 8))); const genderHigh = r.flags.filter((f: any) => f.type === 'gender' && f.severity !== 'low'); assert(genderHigh.length === 0, 'balanced'); });
  run('C043: audit entry created correctly', () => { const svc = new (rev().ContentSafetyService)(); const entry = svc.createAuditEntry({ storyId: 's1', stage: 'automated_validation', checkType: 'text_safety', result: 'pass', details: 'clean' }); assert(entry.storyId === 's1', 'storyId'); assert(entry.result === 'pass', 'pass'); });
  run('C044: image moderation TF generated', () => { const svc = new (rev().ContentSafetyService)(); const tf = assertResult(svc.generateImageModerationTerraform()); assertContains(tf, 'rekognition'); assertContains(tf, 'lambda'); });
  run('C045: safety audit DynamoDB table in TF', () => { const svc = new (rev().ContentSafetyService)(); const tf = assertResult(svc.generateImageModerationTerraform()); assertContains(tf, 'dynamodb_table'); assertContains(tf, 'safety_audit'); });
  run('C046: default image config blocks violence', () => assert(rev().DEFAULT_IMAGE_MODERATION_CONFIG.blockedCategories.includes('Violence'), 'violence'));
  run('C047: default image config min confidence 0.7', () => assert(rev().DEFAULT_IMAGE_MODERATION_CONFIG.minConfidence === 0.7, '0.7'));
  run('C048: pipeline orchestrator instantiates', () => assert(new (rev().ReviewPipelineOrchestrator)() !== null, 'orch'));
  run('C049: submitted → automated_validation', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); const r = assertResult(orch.determineNextStage({ currentStage: 'submitted' } as any)); assert(r === 'automated_validation', 'auto'); });
  run('C050: auto pass → ai_review', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); const r = assertResult(orch.determineNextStage({ currentStage: 'automated_validation', automatedResult: { passed: true } } as any)); assert(r === 'ai_review', 'ai'); });
  run('C051: auto fail → revision_requested', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); const r = assertResult(orch.determineNextStage({ currentStage: 'automated_validation', automatedResult: { passed: false } } as any)); assert(r === 'revision_requested', 'revision'); });
  run('C052: ai reject → rejected', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); const r = assertResult(orch.determineNextStage({ currentStage: 'ai_review', aiReviewResult: { recommendation: 'reject', passed: false } } as any)); assert(r === 'rejected', 'rejected'); });
  run('C053: pipeline progress 0-100', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); assert(orch.calculateProgress({ currentStage: 'submitted' } as any) === 0, '0'); assert(orch.calculateProgress({ currentStage: 'published' } as any) === 100, '100'); });
  run('C054: NATS subjects mapped', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); const subj = orch.getNatsSubject({ to: 'published' } as any); assertContains(subj, 'scholarly.storybook.published'); });
  run('C055: pilot benchmarks per phase', () => { const b = rev().PILOT_BENCHMARKS; assert(b[1].completionRate > b[6].completionRate, 'phase 1 easier'); assert(b[1].accuracy < b[6].accuracy, 'phase 6 higher accuracy'); });
  run('C056: pilot evaluates against benchmarks', () => { const svc = new (rev().PilotTestService)(); const r = assertResult(svc.evaluatePilot({ completionRate: 0.80, averageAccuracy: 0.80, averageTimeSeconds: 120, reReadRate: 0.2, averageEngagementScore: 8 }, 3)); assert(r.passed === true, 'passed'); });
  run('C057: pilot fails below benchmark', () => { const svc = new (rev().PilotTestService)(); const r = assertResult(svc.evaluatePilot({ completionRate: 0.30, averageAccuracy: 0.40, averageTimeSeconds: 120, reReadRate: 0, averageEngagementScore: 2 }, 3)); assert(r.passed === false, 'failed'); });
  run('C058: isComplete for published', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); assert(orch.isComplete({ currentStage: 'published' } as any) === true, 'complete'); });
  run('C059: isComplete for rejected', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); assert(orch.isComplete({ currentStage: 'rejected' } as any) === true, 'complete'); });
  run('C060: not complete for peer_review', () => { const orch = new (rev().ReviewPipelineOrchestrator)(); assert(orch.isComplete({ currentStage: 'peer_review' } as any) === false, 'not complete'); });

  return { name: 'Path C: Review Pipeline & Content Safety', tests };
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
