// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-009
// Launch Readiness Checklist & Operational Runbook
// =============================================================================
// The pre-flight checklist, the emergency procedures manual, and the flight
// attendant briefing card all rolled into one. This module codifies every
// check that must pass before launch, every procedure for handling incidents,
// and every rollback step if things go sideways. No aircraft takes off
// without a completed checklist — and no platform should either.
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Launch Readiness Checklist
// =============================================================================

export enum CheckStatus { PASS = 'PASS', FAIL = 'FAIL', WARN = 'WARN', SKIP = 'SKIP', PENDING = 'PENDING' }
export enum CheckCategory { INFRASTRUCTURE = 'INFRASTRUCTURE', DATA = 'DATA', SECURITY = 'SECURITY', COMPLIANCE = 'COMPLIANCE', CONTENT = 'CONTENT', PERFORMANCE = 'PERFORMANCE', MONITORING = 'MONITORING', DEPLOYMENT = 'DEPLOYMENT' }

export interface ReadinessCheck {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  critical: boolean;
  automatable: boolean;
  status: CheckStatus;
  details: string;
  verifiedBy: string;
  verifiedAt: Date | null;
}

export const LAUNCH_CHECKLIST: ReadinessCheck[] = [
  // === Infrastructure ===
  { id: 'LC-001', category: CheckCategory.INFRASTRUCTURE, name: 'Database migrations applied', description: 'All Sprint 7 migrations run successfully on production PostgreSQL. 10 new tables, 16 enum types, all indexes created.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-002', category: CheckCategory.INFRASTRUCTURE, name: 'Redis cluster healthy', description: 'Redis available for rate limiting, caching, and session storage. Memory usage < 70%.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-003', category: CheckCategory.INFRASTRUCTURE, name: 'NATS JetStream operational', description: '3 JetStream streams (SCHOLARLY_STORYBOOK, SCHOLARLY_LIBRARY, SCHOLARLY_MARKETPLACE) created with correct retention policies. 8 durable consumers registered.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-004', category: CheckCategory.INFRASTRUCTURE, name: 'SSL certificates valid', description: 'TLS certificates for scholarly.app, api.scholarly.app, and cdn.scholarly.app valid with > 30 days remaining.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-005', category: CheckCategory.INFRASTRUCTURE, name: 'CDN configured', description: 'CloudFront or equivalent CDN for illustration assets, audio narration files, and PWA static assets.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-006', category: CheckCategory.INFRASTRUCTURE, name: 'DNS records configured', description: 'A/CNAME records for scholarly.app, api.scholarly.app, Universal Links, App Links.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Data ===
  { id: 'LC-007', category: CheckCategory.DATA, name: 'Seed library generated', description: '20 seed storybooks generated across Phases 2-5, 5 series. All pass decodability threshold >= 85%.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-008', category: CheckCategory.DATA, name: 'Phonics GPC reference seeded', description: 'Letters and Sounds GPC reference data (Phases 2, 3, 5) loaded into phonics_gpc_reference table.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-009', category: CheckCategory.DATA, name: 'Default characters seeded', description: 'Finn, Luna, Splash, Dot, and Beats character profiles created with visual descriptions.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-010', category: CheckCategory.DATA, name: 'Database backups configured', description: 'Automated daily backups with 30-day retention. Tested restore procedure within last 7 days.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Security ===
  { id: 'LC-011', category: CheckCategory.SECURITY, name: 'JWT secrets rotated', description: 'Fresh JWT signing keys generated for production. Old dev/staging keys invalidated.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-012', category: CheckCategory.SECURITY, name: 'API keys secured', description: 'AI provider API keys (Anthropic, OpenAI, ElevenLabs) stored in secrets manager, not environment files.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-013', category: CheckCategory.SECURITY, name: 'Rate limiting active', description: 'API Gateway rate limits enforced: global (1000 RPM), per-tenant (500 RPM), generation endpoints (5 RPM).', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-014', category: CheckCategory.SECURITY, name: 'Content safety pipeline active', description: 'Content safety screening enabled for all generated narratives and illustrations.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-015', category: CheckCategory.SECURITY, name: 'Parental gate implemented', description: 'Math-based parental gate tested on iOS, Android, and Web before purchases and external links.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Compliance ===
  { id: 'LC-016', category: CheckCategory.COMPLIANCE, name: 'COPPA compliance verified', description: 'Verifiable parental consent flow. No unnecessary data collection. Audio ephemeral only.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-017', category: CheckCategory.COMPLIANCE, name: 'Apple Kids Category approved', description: 'All 10 Apple compliance checks passed. No ads, no social, no external links outside parental gate.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-018', category: CheckCategory.COMPLIANCE, name: 'Google Designed for Families approved', description: 'All 7 Google compliance checks passed. IARC rating: Everyone.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-019', category: CheckCategory.COMPLIANCE, name: 'Privacy policy published', description: 'Privacy policy at scholarly.app/privacy accurate and up to date.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-020', category: CheckCategory.COMPLIANCE, name: 'WCAG 2.1 AA tested', description: 'Accessibility audit passed on all 3 platforms. VoiceOver, TalkBack, and keyboard navigation tested.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Content ===
  { id: 'LC-021', category: CheckCategory.CONTENT, name: 'All seed books educator-reviewed', description: 'At least 2 educator reviews per seed book. All reviews >= 75% overall score.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-022', category: CheckCategory.CONTENT, name: 'Cultural diversity verified', description: 'Seed library includes at least 3 cultural contexts. Illustration prompts reviewed for representation.', critical: false, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Performance ===
  { id: 'LC-023', category: CheckCategory.PERFORMANCE, name: 'App launch < 3 seconds', description: 'Cold start to interactive on iPhone 15, Galaxy S24, and Chrome desktop all under 3 seconds.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-024', category: CheckCategory.PERFORMANCE, name: 'Library load < 2 seconds', description: 'Enchanted Library view fully rendered in under 2 seconds on all critical test devices.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-025', category: CheckCategory.PERFORMANCE, name: 'Audio latency < 200ms', description: 'Read-aloud mode audio feedback latency under 200ms on native apps.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-026', category: CheckCategory.PERFORMANCE, name: 'Animation 60fps', description: 'Enchanted Library and reader animations sustain 60fps on mid-range devices.', critical: false, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Monitoring ===
  { id: 'LC-027', category: CheckCategory.MONITORING, name: 'Prometheus scraping active', description: 'All 34 metric definitions being scraped at /metrics endpoint. Grafana dashboards rendering.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-028', category: CheckCategory.MONITORING, name: 'Sentry error tracking active', description: 'Sentry DSN configured. Test error captured and visible in dashboard.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-029', category: CheckCategory.MONITORING, name: 'Alert rules configured', description: '9 alert rules active. PagerDuty and Slack channels configured. Test alert fired and received.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-030', category: CheckCategory.MONITORING, name: 'Health check endpoint live', description: '/health returns healthy with all components (database, Redis, NATS) reporting up.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },

  // === Deployment ===
  { id: 'LC-031', category: CheckCategory.DEPLOYMENT, name: 'iOS build on TestFlight', description: 'Production iOS build uploaded to TestFlight. Internal testers can install.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-032', category: CheckCategory.DEPLOYMENT, name: 'Android build on Play Internal', description: 'Production Android build uploaded to Play Store internal testing track.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-033', category: CheckCategory.DEPLOYMENT, name: 'PWA deployed', description: 'PWA served from scholarly.app with service worker, manifest, and offline support.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-034', category: CheckCategory.DEPLOYMENT, name: 'Rollback plan tested', description: 'Database rollback to pre-Sprint-7 state tested in staging. Application rollback via container tag revert verified.', critical: true, automatable: false, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
  { id: 'LC-035', category: CheckCategory.DEPLOYMENT, name: 'E2E smoke tests passing', description: 'All 9 smoke test categories passing. All 4 critical tests green.', critical: true, automatable: true, status: CheckStatus.PENDING, details: '', verifiedBy: '', verifiedAt: null },
];

// =============================================================================
// Section 2: Incident Response Procedures
// =============================================================================

export interface IncidentProcedure {
  id: string;
  trigger: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3';
  description: string;
  steps: string[];
  rollbackSteps: string[];
  escalation: string;
  expectedResolutionTime: string;
}

export const INCIDENT_PROCEDURES: IncidentProcedure[] = [
  {
    id: 'INC-001',
    trigger: 'HighErrorRate alert fires (>5% 5xx for 5 minutes)',
    severity: 'SEV1',
    description: 'Platform experiencing elevated error rates affecting user experience',
    steps: [
      '1. Check Sentry for error clustering — identify common exception type',
      '2. Check database connectivity: run health check endpoint /api/v1/health',
      '3. Check AI provider status: verify circuit breaker states in Prometheus',
      '4. Check NATS: verify consumer lag metric for message backlog',
      '5. If database: check connection pool usage, recent migration status',
      '6. If AI provider: verify circuit breaker has opened, check fallback chain',
      '7. If NATS: restart affected consumer groups, check stream retention',
      '8. If none of the above: check recent deployment, consider rollback',
    ],
    rollbackSteps: [
      '1. Revert to previous container image tag: kubectl set image deployment/scholarly-api scholarly-api=scholarly/api:PREVIOUS_TAG',
      '2. If database migration caused issue: run MigrationRunner.rollback(targetVersion)',
      '3. Clear Redis rate limit keys if stuck: redis-cli FLUSHDB (rate_limit namespace only)',
      '4. Restart NATS consumers: kubectl rollout restart deployment/scholarly-consumers',
    ],
    escalation: 'If not resolved in 15 minutes, escalate to on-call engineering lead',
    expectedResolutionTime: '30 minutes',
  },
  {
    id: 'INC-002',
    trigger: 'AIProviderAllDown alert fires (all circuit breakers open)',
    severity: 'SEV2',
    description: 'All AI providers unavailable — no generation, narration, or AI review possible',
    steps: [
      '1. Check provider status pages: status.anthropic.com, status.openai.com, elevenlabs.io/status',
      '2. Verify API key validity: test with minimal API call',
      '3. Check network egress: verify firewall rules haven\'t changed',
      '4. If provider outage: switch to degraded mode — serve cached/pre-generated content only',
      '5. Post status message to parent dashboard: "Content generation temporarily unavailable"',
      '6. Monitor provider status for recovery; circuit breakers auto-reset after 30s',
    ],
    rollbackSteps: [
      '1. No rollback needed — this is an external dependency issue',
      '2. If caused by API key rotation: restore previous keys from secrets manager',
    ],
    escalation: 'If all providers down > 1 hour, notify product lead for customer communication',
    expectedResolutionTime: '1 hour (dependent on provider recovery)',
  },
  {
    id: 'INC-003',
    trigger: 'Content safety flag on published book',
    severity: 'SEV1',
    description: 'A published storybook has been flagged for safety concerns — child exposure risk',
    steps: [
      '1. IMMEDIATELY unpublish the book: UPDATE storybooks SET status = \'SUSPENDED\' WHERE id = :bookId',
      '2. Remove from all device caches: publish scholarly.storybook.book.suspended event',
      '3. Review the flagged content: check content_flag, review safety screening logs',
      '4. If legitimate safety issue: escalate to content review team',
      '5. If false positive: re-run safety screening, get educator review, republish',
      '6. Audit: how did this pass the five-stage review pipeline?',
    ],
    rollbackSteps: [
      '1. Book already suspended in step 1',
      '2. If book was part of a bounty submission, notify bounty creator',
    ],
    escalation: 'IMMEDIATE escalation to content safety lead and legal',
    expectedResolutionTime: '1 hour for suspension, 24 hours for resolution',
  },
  {
    id: 'INC-004',
    trigger: 'HighAICost alert fires (>$50/hour)',
    severity: 'SEV2',
    description: 'Abnormal AI API spending detected — possible runaway generation loop',
    steps: [
      '1. Check scholarly_ai_cost_usd_total metric breakdown by tenant and capability',
      '2. Identify source: is one tenant generating excessively?',
      '3. Check for looping generation requests in application logs',
      '4. If tenant abuse: apply emergency rate limit to that tenant',
      '5. If system bug: halt all generation (circuit-break the orchestrator)',
      '6. Review budget alerts and set lower thresholds if needed',
    ],
    rollbackSteps: [
      '1. Disable generation endpoint: return 503 for POST /api/v1/stories/generate',
      '2. Review and restart generation with per-request cost caps',
    ],
    escalation: 'Notify finance and engineering lead if spend > $200',
    expectedResolutionTime: '30 minutes',
  },
];

// =============================================================================
// Section 3: Checklist Runner
// =============================================================================

export class LaunchReadinessRunner {
  constructor(
    private readonly healthService: { check(): Promise<{ status: string; checks: { name: string; status: string }[] }> },
    private readonly metricsCollector: { toPrometheusFormat(): string },
    private readonly complianceVerifier: { verifyAll(): { allPassed: boolean; apple: { passed: boolean }; google: { passed: boolean }; web: { passed: boolean } } },
    private readonly smokeTestRunner: { runAll(): Promise<{ allPassed: boolean; criticalsPassed: boolean }> }
  ) {}

  async runAutomatedChecks(): Promise<ReadinessReport> {
    const checklist = [...LAUNCH_CHECKLIST];
    const startTime = Date.now();

    // Run health check
    try {
      const health = await this.healthService.check();
      this.updateCheck(checklist, 'LC-030', health.status === 'healthy' ? CheckStatus.PASS : CheckStatus.FAIL, `Status: ${health.status}`);
    } catch (error) {
      this.updateCheck(checklist, 'LC-030', CheckStatus.FAIL, String(error));
    }

    // Check metrics endpoint
    try {
      const metrics = this.metricsCollector.toPrometheusFormat();
      const hasMetrics = metrics.includes('scholarly_http_requests_total');
      this.updateCheck(checklist, 'LC-027', hasMetrics ? CheckStatus.PASS : CheckStatus.FAIL, `Metrics length: ${metrics.length}`);
    } catch (error) {
      this.updateCheck(checklist, 'LC-027', CheckStatus.FAIL, String(error));
    }

    // Run compliance checks
    try {
      const compliance = this.complianceVerifier.verifyAll();
      this.updateCheck(checklist, 'LC-017', compliance.apple.passed ? CheckStatus.PASS : CheckStatus.FAIL, 'Apple compliance');
      this.updateCheck(checklist, 'LC-018', compliance.google.passed ? CheckStatus.PASS : CheckStatus.FAIL, 'Google compliance');
    } catch (error) {
      this.updateCheck(checklist, 'LC-017', CheckStatus.FAIL, String(error));
      this.updateCheck(checklist, 'LC-018', CheckStatus.FAIL, String(error));
    }

    // Run smoke tests
    try {
      const smokeResults = await this.smokeTestRunner.runAll();
      this.updateCheck(checklist, 'LC-035', smokeResults.allPassed ? CheckStatus.PASS : CheckStatus.FAIL, `All passed: ${smokeResults.allPassed}, Criticals: ${smokeResults.criticalsPassed}`);
    } catch (error) {
      this.updateCheck(checklist, 'LC-035', CheckStatus.FAIL, String(error));
    }

    const passed = checklist.filter(c => c.status === CheckStatus.PASS).length;
    const failed = checklist.filter(c => c.status === CheckStatus.FAIL).length;
    const pending = checklist.filter(c => c.status === CheckStatus.PENDING).length;
    const criticalsFailed = checklist.filter(c => c.critical && c.status === CheckStatus.FAIL).length;

    return {
      totalChecks: checklist.length,
      passed, failed, pending,
      criticalsFailed,
      readyForLaunch: criticalsFailed === 0 && failed === 0,
      checklist,
      durationMs: Date.now() - startTime,
    };
  }

  private updateCheck(checklist: ReadinessCheck[], id: string, status: CheckStatus, details: string): void {
    const check = checklist.find(c => c.id === id);
    if (check) {
      check.status = status;
      check.details = details;
      check.verifiedBy = 'automated';
      check.verifiedAt = new Date();
    }
  }
}

export interface ReadinessReport {
  totalChecks: number;
  passed: number;
  failed: number;
  pending: number;
  criticalsFailed: number;
  readyForLaunch: boolean;
  checklist: ReadinessCheck[];
  durationMs: number;
}

// Line count: ~310
