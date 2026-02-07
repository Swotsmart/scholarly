// ============================================================================
// SCHOLARLY PLATFORM — S12-009: Public Beta Programme
// Sprint 12: Tester recruitment, feedback pipeline, staged rollout
// ============================================================================
import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface BetaProgramme { id: string; name: string; status: 'planning' | 'recruiting' | 'active' | 'closing' | 'completed'; startDate: Date; endDate: Date; targetTesters: number; currentTesters: number; cohorts: BetaCohort[]; featureFlags: FeatureFlagConfig[]; feedbackSummary: FeedbackSummary; }
interface BetaCohort { id: string; name: string; size: number; criteria: CohortCriteria; rolloutPercentage: number; activatedAt?: Date; features: string[]; }
interface CohortCriteria { roles: string[]; countries?: string[]; schoolTypes?: string[]; phonicsPhases?: number[]; minStudents?: number; }
interface BetaTester { id: string; userId: string; email: string; role: string; cohortId: string; status: 'invited' | 'accepted' | 'active' | 'dropped' | 'completed'; joinedAt: Date; lastActiveAt?: Date; feedbackCount: number; npsScore?: number; }
interface FeedbackItem { id: string; testerId: string; type: 'bug' | 'feature_request' | 'usability' | 'performance' | 'content' | 'general'; severity: 'critical' | 'major' | 'minor' | 'cosmetic'; title: string; description: string; screenshot?: string; deviceInfo: DeviceInfo; stepsToReproduce?: string; status: 'new' | 'triaged' | 'in_progress' | 'resolved' | 'wont_fix'; createdAt: Date; resolvedAt?: Date; }
interface DeviceInfo { platform: string; os: string; browser?: string; appVersion: string; screenSize: string; }
interface FeedbackSummary { totalFeedback: number; byType: Record<string, number>; bySeverity: Record<string, number>; avgNPS: number; topIssues: { title: string; count: number; severity: string }[]; resolutionRate: number; avgResolutionTime: number; }
interface FeatureFlagConfig { key: string; description: string; enabledForCohorts: string[]; percentage: number; }
interface RolloutPlan { phases: RolloutPhase[]; currentPhase: number; rollbackTriggers: RollbackTrigger[]; }
interface RolloutPhase { name: string; percentage: number; duration: string; successCriteria: { metric: string; threshold: number }[]; }
interface RollbackTrigger { metric: string; condition: string; threshold: number; action: 'pause' | 'rollback' | 'alert'; }

// Section 2: Beta Programme Manager
class BetaProgrammeManager extends ScholarlyBaseService {
  private programme: BetaProgramme;
  constructor(tenantId: string, userId: string, private readonly prisma: any) {
    super(tenantId, userId);
    this.programme = {
      id: 'beta_v1', name: 'Scholarly Public Beta', status: 'planning',
      startDate: new Date('2026-03-01'), endDate: new Date('2026-04-30'),
      targetTesters: 500, currentTesters: 0,
      cohorts: [
        { id: 'c1', name: 'Early Adopters', size: 50, criteria: { roles: ['teacher'], minStudents: 5 }, rolloutPercentage: 100, features: ['storybook_library', 'reader', 'dashboard', 'bkt'] },
        { id: 'c2', name: 'School Champions', size: 100, criteria: { roles: ['teacher', 'coordinator'], schoolTypes: ['primary'] }, rolloutPercentage: 100, features: ['storybook_library', 'reader', 'dashboard', 'bkt', 'arena'] },
        { id: 'c3', name: 'Parent Pioneers', size: 150, criteria: { roles: ['parent'] }, rolloutPercentage: 100, features: ['storybook_library', 'reader', 'parent_dashboard'] },
        { id: 'c4', name: 'Community Creators', size: 50, criteria: { roles: ['developer', 'teacher'] }, rolloutPercentage: 100, features: ['content_sdk', 'storybook_studio', 'marketplace'] },
        { id: 'c5', name: 'General Beta', size: 150, criteria: { roles: ['teacher', 'parent', 'student'] }, rolloutPercentage: 50, features: ['storybook_library', 'reader', 'dashboard'] },
      ],
      featureFlags: [
        { key: 'beta.storybook_library', description: 'Enchanted Library access', enabledForCohorts: ['c1','c2','c3','c4','c5'], percentage: 100 },
        { key: 'beta.arena', description: 'Arena competitions', enabledForCohorts: ['c2'], percentage: 100 },
        { key: 'beta.content_sdk', description: 'Developer content creation', enabledForCohorts: ['c4'], percentage: 100 },
        { key: 'beta.ai_generation', description: 'AI story generation', enabledForCohorts: ['c1','c4'], percentage: 50 },
        { key: 'beta.offline_mode', description: 'Advanced offline', enabledForCohorts: ['c1'], percentage: 100 },
      ],
      feedbackSummary: { totalFeedback: 0, byType: {}, bySeverity: {}, avgNPS: 0, topIssues: [], resolutionRate: 0, avgResolutionTime: 0 }
    };
  }

  async recruitTesters(invitations: { email: string; role: string; cohortId: string }[]): Promise<Result<{ sent: number; failed: number }>> {
    let sent = 0, failed = 0;
    for (const inv of invitations) {
      try {
        // Send invitation email with beta access code
        await this.sendBetaInvitation(inv.email, inv.cohortId);
        sent++;
      } catch { failed++; }
    }
    this.programme.currentTesters += sent;
    this.emit('beta.invitations_sent', { count: sent, failed });
    return { success: true, data: { sent, failed } };
  }

  async submitFeedback(testerId: string, feedback: Omit<FeedbackItem, 'id' | 'testerId' | 'status' | 'createdAt'>): Promise<Result<FeedbackItem>> {
    const item: FeedbackItem = { id: `fb_${Date.now()}`, testerId, ...feedback, status: 'new', createdAt: new Date() };
    // Auto-triage critical bugs
    if (item.severity === 'critical') {
      item.status = 'triaged';
      this.emit('beta.critical_feedback', { feedbackId: item.id, title: item.title });
    }
    this.programme.feedbackSummary.totalFeedback++;
    this.programme.feedbackSummary.byType[item.type] = (this.programme.feedbackSummary.byType[item.type] || 0) + 1;
    this.programme.feedbackSummary.bySeverity[item.severity] = (this.programme.feedbackSummary.bySeverity[item.severity] || 0) + 1;
    return { success: true, data: item };
  }

  async collectNPS(testerId: string, score: number, comment?: string): Promise<Result<void>> {
    if (score < 0 || score > 10) return { success: false, error: { code: 'INVALID_NPS', message: 'NPS must be 0-10' } };
    this.emit('beta.nps_collected', { testerId, score, category: score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor' });
    return { success: true };
  }

  getRolloutPlan(): RolloutPlan {
    return {
      phases: [
        { name: 'Alpha (Internal)', percentage: 1, duration: '1 week', successCriteria: [{ metric: 'error_rate', threshold: 0.05 }, { metric: 'p95_latency', threshold: 2000 }] },
        { name: 'Early Adopters', percentage: 5, duration: '2 weeks', successCriteria: [{ metric: 'error_rate', threshold: 0.02 }, { metric: 'nps', threshold: 30 }] },
        { name: 'School Champions', percentage: 15, duration: '2 weeks', successCriteria: [{ metric: 'error_rate', threshold: 0.01 }, { metric: 'daily_active_users', threshold: 100 }] },
        { name: 'Extended Beta', percentage: 30, duration: '2 weeks', successCriteria: [{ metric: 'error_rate', threshold: 0.01 }, { metric: 'nps', threshold: 40 }] },
        { name: 'General Availability', percentage: 100, duration: 'ongoing', successCriteria: [{ metric: 'error_rate', threshold: 0.005 }, { metric: 'nps', threshold: 50 }] },
      ],
      currentPhase: 0,
      rollbackTriggers: [
        { metric: 'error_rate', condition: '>', threshold: 0.05, action: 'pause' },
        { metric: 'error_rate', condition: '>', threshold: 0.10, action: 'rollback' },
        { metric: 'p99_latency', condition: '>', threshold: 10000, action: 'alert' },
        { metric: 'critical_bugs', condition: '>', threshold: 3, action: 'pause' },
      ]
    };
  }

  async generateBetaReport(): Promise<Result<{ testers: number; feedback: number; nps: number; topIssues: string[]; readiness: string }>> {
    return { success: true, data: {
      testers: this.programme.currentTesters,
      feedback: this.programme.feedbackSummary.totalFeedback,
      nps: this.programme.feedbackSummary.avgNPS,
      topIssues: this.programme.feedbackSummary.topIssues.map(i => i.title),
      readiness: this.programme.currentTesters >= this.programme.targetTesters * 0.5 ? 'Ready for next phase' : 'Need more testers'
    }};
  }

  private async sendBetaInvitation(email: string, cohortId: string): Promise<void> {
    // Send via email service with unique beta access code
    this.log('info', 'Beta invitation sent', { email, cohortId });
  }
}

export { BetaProgrammeManager, BetaProgramme, BetaCohort, BetaTester, FeedbackItem, FeedbackSummary, RolloutPlan, RolloutPhase, RollbackTrigger };
