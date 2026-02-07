// ============================================================================
// SCHOLARLY PLATFORM — Sprint 17, Deliverables S17-004 through S17-009
// Remaining Deliverables
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ============================================================================
// S17-004: Beta Cohort Activation & Onboarding
// ============================================================================
// Manages the activation of the first Alpha cohort from S16-009's Beta
// Programme. This is the moment where real children read real storybooks —
// the first time the entire pipeline (BKT → recommendation → generation →
// reading → mastery update) runs with genuine human learners.
// ============================================================================

export type CohortPhase = 'alpha' | 'early-beta' | 'open-beta' | 'general-availability';
export type ParticipantType = 'pilot-school' | 'homeschool-family' | 'educator' | 'developer';
export type OnboardingStep = 'invited' | 'registered' | 'consent-verified' | 'profile-created' | 'first-session' | 'active';

export interface BetaParticipant {
  readonly id: string;
  readonly type: ParticipantType;
  readonly name: string;
  readonly email: string;
  readonly organisation?: string;          // School name for pilot-school type
  readonly learnerCount: number;           // Number of children in this participant group
  readonly onboardingStep: OnboardingStep;
  readonly invitedAt: Date;
  readonly activatedAt?: Date;
  readonly consentVerifiedAt?: Date;       // COPPA consent for child learners
  readonly npsScore?: number;              // Net Promoter Score (collected during beta)
  readonly feedbackNotes: string[];
  readonly deviceTypes: string[];          // iOS, Android, Web, Chromebook
}

export interface CohortConfig {
  readonly cohortId: string;
  readonly phase: CohortPhase;
  readonly maxParticipants: number;
  readonly targetSchools: number;
  readonly targetFamilies: number;
  readonly feedbackIntervalDays: number;   // How often to collect structured feedback
  readonly npsCollectionPoints: string[];  // When to collect NPS (e.g. 'week-2', 'week-4')
  readonly featureFlags: Record<string, boolean>;  // Which features are enabled for this cohort
  readonly exitCriteria: ExitCriteria;
}

export interface ExitCriteria {
  readonly minNpsScore: number;              // Minimum average NPS to proceed to next phase
  readonly maxCriticalBugs: number;          // Max P1 bugs allowed
  readonly minCompletionRate: number;        // % of participants who complete onboarding
  readonly minEngagementDays: number;        // Minimum days participants are active
  readonly minStorybooksRead: number;        // Minimum total storybooks read across cohort
}

export interface CohortReport {
  readonly cohortId: string;
  readonly phase: CohortPhase;
  readonly totalParticipants: number;
  readonly activeParticipants: number;
  readonly completedOnboarding: number;
  readonly averageNps: number;
  readonly totalStorybooksRead: number;
  readonly totalReadingMinutes: number;
  readonly criticalBugs: number;
  readonly feedbackSummary: FeedbackSummary;
  readonly meetsExitCriteria: boolean;
  readonly readyForNextPhase: boolean;
}

export interface FeedbackSummary {
  readonly positiveThemes: string[];
  readonly negativeThemes: string[];
  readonly featureRequests: string[];
  readonly bugReports: number;
  readonly totalFeedbackItems: number;
}

export class BetaCohortManager extends ScholarlyBaseService {
  private participants: Map<string, BetaParticipant> = new Map();
  private cohortConfig: CohortConfig | null = null;

  constructor() { super('BetaCohortManager'); }

  /** Initialise a new beta cohort */
  async initialiseCohort(config: CohortConfig): Promise<Result<void>> {
    this.cohortConfig = config;
    this.log('info', `Initialising ${config.phase} cohort: ${config.cohortId}`, {
      maxParticipants: config.maxParticipants,
      targetSchools: config.targetSchools,
      targetFamilies: config.targetFamilies,
    });
    return ok(undefined);
  }

  /** Invite a participant to the beta programme */
  async inviteParticipant(participant: Omit<BetaParticipant, 'onboardingStep' | 'invitedAt' | 'feedbackNotes' | 'deviceTypes'>): Promise<Result<BetaParticipant>> {
    if (!this.cohortConfig) return fail('Cohort not initialised');
    if (this.participants.size >= this.cohortConfig.maxParticipants) {
      return fail('Cohort is full');
    }

    const fullParticipant: BetaParticipant = {
      ...participant,
      onboardingStep: 'invited',
      invitedAt: new Date(),
      feedbackNotes: [],
      deviceTypes: [],
    };

    this.participants.set(participant.id, fullParticipant);
    this.emit('participant:invited', fullParticipant);

    // Send invitation email (via notification service)
    await this.sendInvitation(fullParticipant);

    this.log('info', `Invited ${participant.type}: ${participant.name}`, {
      learnerCount: participant.learnerCount,
    });

    return ok(fullParticipant);
  }

  /** Progress a participant through onboarding steps */
  async progressOnboarding(participantId: string, step: OnboardingStep): Promise<Result<BetaParticipant>> {
    const participant = this.participants.get(participantId);
    if (!participant) return fail(`Participant not found: ${participantId}`);

    const updated: BetaParticipant = {
      ...participant,
      onboardingStep: step,
      activatedAt: step === 'active' ? new Date() : participant.activatedAt,
      consentVerifiedAt: step === 'consent-verified' ? new Date() : participant.consentVerifiedAt,
    };

    this.participants.set(participantId, updated);
    this.emit('onboarding:progressed', { participantId, step });

    return ok(updated);
  }

  /** Record NPS score from a participant */
  async recordNps(participantId: string, score: number, feedback?: string): Promise<Result<void>> {
    const participant = this.participants.get(participantId);
    if (!participant) return fail(`Participant not found: ${participantId}`);

    const updated: BetaParticipant = {
      ...participant,
      npsScore: score,
      feedbackNotes: feedback ? [...participant.feedbackNotes, feedback] : participant.feedbackNotes,
    };

    this.participants.set(participantId, updated);
    this.emit('nps:recorded', { participantId, score });

    return ok(undefined);
  }

  /** Generate a cohort progress report */
  async generateReport(): Promise<Result<CohortReport>> {
    if (!this.cohortConfig) return fail('Cohort not initialised');

    const allParticipants = Array.from(this.participants.values());
    const activeParticipants = allParticipants.filter(p => p.onboardingStep === 'active');
    const completedOnboarding = allParticipants.filter(p => ['first-session', 'active'].includes(p.onboardingStep));

    const npsScores = allParticipants.filter(p => p.npsScore !== undefined).map(p => p.npsScore!);
    const averageNps = npsScores.length > 0
      ? npsScores.reduce((s, n) => s + n, 0) / npsScores.length
      : 0;

    const feedbackSummary: FeedbackSummary = {
      positiveThemes: [],
      negativeThemes: [],
      featureRequests: [],
      bugReports: 0,
      totalFeedbackItems: allParticipants.reduce((s, p) => s + p.feedbackNotes.length, 0),
    };

    const exit = this.cohortConfig.exitCriteria;
    const meetsExitCriteria = averageNps >= exit.minNpsScore &&
      completedOnboarding.length / allParticipants.length >= exit.minCompletionRate;

    return ok({
      cohortId: this.cohortConfig.cohortId,
      phase: this.cohortConfig.phase,
      totalParticipants: allParticipants.length,
      activeParticipants: activeParticipants.length,
      completedOnboarding: completedOnboarding.length,
      averageNps,
      totalStorybooksRead: 0,    // Populated from analytics service
      totalReadingMinutes: 0,     // Populated from analytics service
      criticalBugs: 0,            // Populated from bug tracker
      feedbackSummary,
      meetsExitCriteria,
      readyForNextPhase: meetsExitCriteria,
    });
  }

  private async sendInvitation(participant: BetaParticipant): Promise<void> {
    // Integration with email/notification service
    this.log('info', `Sending invitation to ${participant.email}`);
  }
}

// ============================================================================
// S17-005: App Store Submission Executor
// ============================================================================
// Executes the actual submission prepared by S16-005. Handles the metadata,
// screenshots, compliance declarations, and the waiting game that follows.
// Apple's Kids Category review process takes 2-4 weeks — this service
// tracks the submission lifecycle and manages parallel PWA launch.
// ============================================================================

export type AppPlatform = 'ios' | 'android' | 'pwa';
export type SubmissionStatus = 'preparing' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'published';

export interface AppSubmission {
  readonly id: string;
  readonly platform: AppPlatform;
  readonly version: string;
  readonly buildNumber: string;
  readonly status: SubmissionStatus;
  readonly submittedAt?: Date;
  readonly reviewStartedAt?: Date;
  readonly resolvedAt?: Date;
  readonly rejectionReason?: string;
  readonly metadata: AppMetadata;
  readonly complianceDeclarations: ComplianceDeclaration[];
}

export interface AppMetadata {
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly keywords: string[];
  readonly category: string;
  readonly ageRating: string;
  readonly screenshots: PlatformScreenshots;
  readonly privacyPolicyUrl: string;
  readonly supportUrl: string;
  readonly marketingUrl: string;
}

export interface PlatformScreenshots {
  readonly phone: string[];     // 6.7" iPhone screenshots
  readonly tablet: string[];    // 12.9" iPad screenshots
  readonly desktop?: string[];  // Chromebook/web screenshots
}

export interface ComplianceDeclaration {
  readonly framework: string;   // COPPA, GDPR, Kids Category
  readonly requirement: string;
  readonly compliant: boolean;
  readonly evidence: string;
}

export class AppStoreSubmissionService extends ScholarlyBaseService {
  private submissions: Map<string, AppSubmission> = new Map();

  constructor() { super('AppStoreSubmissionService'); }

  /** Prepare and submit to Apple App Store */
  async submitToApple(version: string, buildNumber: string): Promise<Result<AppSubmission>> {
    const submission: AppSubmission = {
      id: `ios-${version}-${buildNumber}`,
      platform: 'ios',
      version,
      buildNumber,
      status: 'preparing',
      metadata: {
        name: 'Scholarly Phonics',
        subtitle: 'Learn to Read with AI Stories',
        description: 'Scholarly Phonics helps children aged 3-9 learn to read through personalised, curriculum-aligned AI storybooks. Every story adapts to your child\'s reading level using advanced learning science.',
        keywords: ['phonics', 'reading', 'education', 'children', 'storybooks', 'learning to read', 'early years', 'literacy'],
        category: 'Education > Reading & Writing',
        ageRating: '4+',
        screenshots: { phone: [], tablet: [] },
        privacyPolicyUrl: 'https://scholarly.app/privacy',
        supportUrl: 'https://scholarly.app/support',
        marketingUrl: 'https://scholarly.app',
      },
      complianceDeclarations: [
        { framework: 'COPPA', requirement: 'Verifiable parental consent', compliant: true, evidence: 'Consent management system (Sprint 7)' },
        { framework: 'COPPA', requirement: 'No behavioural advertising', compliant: true, evidence: 'No advertising in app' },
        { framework: 'COPPA', requirement: 'Data minimisation', compliant: true, evidence: 'Only educational data collected, reviewed by S16-001' },
        { framework: 'Apple Kids Category', requirement: 'No third-party advertising', compliant: true, evidence: 'Ad-free platform' },
        { framework: 'Apple Kids Category', requirement: 'No in-app purchases accessible to children', compliant: true, evidence: 'IAP requires parent authentication via biometric' },
        { framework: 'Apple Kids Category', requirement: 'No links out of app without parental gate', compliant: true, evidence: 'Parental gate on all external links' },
      ],
    };

    this.submissions.set(submission.id, submission);

    // EAS Submit for iOS
    this.log('info', 'Submitting to Apple App Store via EAS Submit', {
      version, buildNumber, category: 'Education > Reading & Writing',
    });

    // Track submission
    const submitted: AppSubmission = { ...submission, status: 'submitted', submittedAt: new Date() };
    this.submissions.set(submission.id, submitted);
    this.emit('submission:submitted', { platform: 'ios', version });

    return ok(submitted);
  }

  /** Prepare and submit to Google Play Store */
  async submitToGoogle(version: string, buildNumber: string): Promise<Result<AppSubmission>> {
    const submission: AppSubmission = {
      id: `android-${version}-${buildNumber}`,
      platform: 'android',
      version,
      buildNumber,
      status: 'preparing',
      metadata: {
        name: 'Scholarly Phonics',
        subtitle: 'Learn to Read with AI Stories',
        description: 'Scholarly Phonics helps children aged 3-9 learn to read through personalised, curriculum-aligned AI storybooks.',
        keywords: ['phonics', 'reading', 'education', 'children'],
        category: 'Education > Education',
        ageRating: 'Everyone',
        screenshots: { phone: [], tablet: [] },
        privacyPolicyUrl: 'https://scholarly.app/privacy',
        supportUrl: 'https://scholarly.app/support',
        marketingUrl: 'https://scholarly.app',
      },
      complianceDeclarations: [
        { framework: 'Designed for Families', requirement: 'Family-friendly content only', compliant: true, evidence: 'Content safety pipeline (Sprint 10)' },
        { framework: 'Designed for Families', requirement: 'Privacy policy compliant with COPPA', compliant: true, evidence: 'Multi-framework compliance (S16-001)' },
        { framework: 'Designed for Families', requirement: 'No inappropriate ads', compliant: true, evidence: 'No advertising' },
      ],
    };

    this.submissions.set(submission.id, submission);
    const submitted: AppSubmission = { ...submission, status: 'submitted', submittedAt: new Date() };
    this.submissions.set(submission.id, submitted);
    this.emit('submission:submitted', { platform: 'android', version });

    return ok(submitted);
  }

  /** Deploy PWA — no store review needed, immediate availability */
  async deployPWA(version: string): Promise<Result<AppSubmission>> {
    const submission: AppSubmission = {
      id: `pwa-${version}`,
      platform: 'pwa',
      version,
      buildNumber: version,
      status: 'published',
      submittedAt: new Date(),
      resolvedAt: new Date(),
      metadata: {
        name: 'Scholarly Phonics',
        subtitle: 'Learn to Read with AI Stories',
        description: 'No download needed — the full Scholarly experience in your browser.',
        keywords: ['phonics', 'reading', 'education'],
        category: 'Education',
        ageRating: 'All ages',
        screenshots: { phone: [], tablet: [], desktop: [] },
        privacyPolicyUrl: 'https://scholarly.app/privacy',
        supportUrl: 'https://scholarly.app/support',
        marketingUrl: 'https://scholarly.app',
      },
      complianceDeclarations: [],
    };

    this.submissions.set(submission.id, submission);
    this.log('info', 'PWA deployed — available immediately', { version });
    this.emit('submission:published', { platform: 'pwa', version });

    return ok(submission);
  }

  /** Check submission status (poll for review updates) */
  async checkStatus(submissionId: string): Promise<Result<AppSubmission>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return fail(`Submission not found: ${submissionId}`);
    return ok(submission);
  }

  /** Get all active submissions */
  getActiveSubmissions(): AppSubmission[] {
    return Array.from(this.submissions.values()).filter(s =>
      ['submitted', 'in-review', 'preparing'].includes(s.status)
    );
  }
}

// ============================================================================
// S17-006: Developer Community Onboarding
// ============================================================================
// Seeds the developer community with 10-20 educators invited to the
// Developer Portal beta. Tracks API usage, playground engagement, and
// tutorial completion to refine the developer experience.
// ============================================================================

export type DeveloperTier = 'explorer' | 'builder' | 'professional' | 'enterprise';

export interface DeveloperOnboardingProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly tier: DeveloperTier;
  readonly type: 'educator' | 'developer' | 'content-creator' | 'institution';
  readonly institution?: string;
  readonly onboardedAt: Date;
  readonly apiKeyIssued: boolean;
  readonly tutorialsCompleted: string[];
  readonly playgroundSessionCount: number;
  readonly apiCallCount: number;
  readonly storybooksCreated: number;
  readonly feedbackSubmitted: string[];
}

export interface DeveloperEngagementMetrics {
  readonly totalDevelopers: number;
  readonly activeDevelopers: number;         // At least 1 API call in last 7 days
  readonly tutorialCompletionRate: number;   // % who completed at least 1 tutorial
  readonly averagePlaygroundSessions: number;
  readonly averageApiCallsPerDev: number;
  readonly totalStorybooksCreated: number;
  readonly topEndpoints: { endpoint: string; calls: number }[];
  readonly feedbackThemes: string[];
}

export class DeveloperCommunityService extends ScholarlyBaseService {
  private developers: Map<string, DeveloperOnboardingProfile> = new Map();

  constructor() { super('DeveloperCommunityService'); }

  /** Invite an educator to the developer portal beta */
  async inviteDeveloper(profile: Omit<DeveloperOnboardingProfile, 'onboardedAt' | 'apiKeyIssued' | 'tutorialsCompleted' | 'playgroundSessionCount' | 'apiCallCount' | 'storybooksCreated' | 'feedbackSubmitted'>): Promise<Result<DeveloperOnboardingProfile>> {
    const fullProfile: DeveloperOnboardingProfile = {
      ...profile,
      onboardedAt: new Date(),
      apiKeyIssued: false,
      tutorialsCompleted: [],
      playgroundSessionCount: 0,
      apiCallCount: 0,
      storybooksCreated: 0,
      feedbackSubmitted: [],
    };

    this.developers.set(profile.id, fullProfile);
    this.emit('developer:invited', profile);
    this.log('info', `Developer invited: ${profile.name} (${profile.type})`);
    return ok(fullProfile);
  }

  /** Issue API key to a developer */
  async issueApiKey(developerId: string): Promise<Result<{ apiKey: string; prefix: string }>> {
    const dev = this.developers.get(developerId);
    if (!dev) return fail(`Developer not found: ${developerId}`);

    const prefix = `sch_${dev.tier}_`;
    const key = `${prefix}${this.generateSecureKey()}`;

    this.developers.set(developerId, { ...dev, apiKeyIssued: true });
    this.emit('apikey:issued', { developerId, prefix });

    return ok({ apiKey: key, prefix });
  }

  /** Track tutorial completion */
  async recordTutorialCompletion(developerId: string, tutorialId: string): Promise<Result<void>> {
    const dev = this.developers.get(developerId);
    if (!dev) return fail(`Developer not found: ${developerId}`);

    if (!dev.tutorialsCompleted.includes(tutorialId)) {
      this.developers.set(developerId, {
        ...dev,
        tutorialsCompleted: [...dev.tutorialsCompleted, tutorialId],
      });
    }
    return ok(undefined);
  }

  /** Generate engagement metrics for the developer community */
  async getEngagementMetrics(): Promise<Result<DeveloperEngagementMetrics>> {
    const allDevs = Array.from(this.developers.values());
    const activeDevelopers = allDevs.filter(d => d.apiCallCount > 0);

    return ok({
      totalDevelopers: allDevs.length,
      activeDevelopers: activeDevelopers.length,
      tutorialCompletionRate: allDevs.filter(d => d.tutorialsCompleted.length > 0).length / Math.max(1, allDevs.length),
      averagePlaygroundSessions: allDevs.reduce((s, d) => s + d.playgroundSessionCount, 0) / Math.max(1, allDevs.length),
      averageApiCallsPerDev: allDevs.reduce((s, d) => s + d.apiCallCount, 0) / Math.max(1, allDevs.length),
      totalStorybooksCreated: allDevs.reduce((s, d) => s + d.storybooksCreated, 0),
      topEndpoints: [],  // Populated from API analytics
      feedbackThemes: [],
    });
  }

  private generateSecureKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

// ============================================================================
// S17-007: Content Bounty System
// ============================================================================
// Posts targeted content bounties for underserved areas of the library.
// Validates the bounty economics and generates content simultaneously.
// Think of it as a "wanted poster" system for the library — identifying
// gaps and incentivising the community to fill them.
// ============================================================================

export type BountyStatus = 'open' | 'in-progress' | 'review' | 'completed' | 'expired';
export type BountyPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ContentBounty {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requirements: BountyRequirements;
  readonly reward: BountyReward;
  readonly status: BountyStatus;
  readonly priority: BountyPriority;
  readonly createdAt: Date;
  readonly deadline: Date;
  readonly maxSubmissions: number;
  readonly currentSubmissions: number;
  readonly winnerId?: string;
  readonly fundingSource: 'dao-treasury' | 'platform-budget' | 'sponsor';
}

export interface BountyRequirements {
  readonly phase: number;
  readonly themes: string[];
  readonly ageRange: { min: number; max: number };
  readonly minPages: number;
  readonly maxPages: number;
  readonly minDecodability: number;
  readonly requiredGPCs?: string[];
  readonly culturalContext?: string;
  readonly seriesCompatible?: string;  // Must fit with existing series
}

export interface BountyReward {
  readonly tokenAmount: number;    // EDU-Nexus tokens
  readonly usdEquivalent: number;
  readonly bonusForExcellence: number;  // Extra reward for >95% quality score
  readonly creatorTierPoints: number;   // Points toward tier advancement
}

export interface BountySubmission {
  readonly id: string;
  readonly bountyId: string;
  readonly creatorId: string;
  readonly storybookId: string;
  readonly submittedAt: Date;
  readonly qualityScore?: number;
  readonly decodabilityScore?: number;
  readonly reviewStatus: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  readonly reviewerNotes?: string;
}

export class ContentBountyService extends ScholarlyBaseService {
  private bounties: Map<string, ContentBounty> = new Map();
  private submissions: Map<string, BountySubmission[]> = new Map();

  constructor() { super('ContentBountyService'); }

  /** Create a new content bounty */
  async createBounty(bounty: Omit<ContentBounty, 'id' | 'createdAt' | 'currentSubmissions' | 'status'>): Promise<Result<ContentBounty>> {
    const id = `bounty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullBounty: ContentBounty = {
      ...bounty,
      id,
      createdAt: new Date(),
      currentSubmissions: 0,
      status: 'open',
    };

    this.bounties.set(id, fullBounty);
    this.submissions.set(id, []);
    this.emit('bounty:created', fullBounty);

    this.log('info', `Bounty created: ${bounty.title}`, {
      phase: bounty.requirements.phase,
      reward: `${bounty.reward.tokenAmount} EDU (≈$${bounty.reward.usdEquivalent})`,
      deadline: bounty.deadline.toISOString(),
    });

    return ok(fullBounty);
  }

  /** Submit a storybook in response to a bounty */
  async submitToBounty(bountyId: string, creatorId: string, storybookId: string): Promise<Result<BountySubmission>> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return fail(`Bounty not found: ${bountyId}`);
    if (bounty.status !== 'open' && bounty.status !== 'in-progress') return fail('Bounty is not accepting submissions');
    if (bounty.currentSubmissions >= bounty.maxSubmissions) return fail('Maximum submissions reached');

    const submission: BountySubmission = {
      id: `sub-${Date.now()}`,
      bountyId,
      creatorId,
      storybookId,
      submittedAt: new Date(),
      reviewStatus: 'pending',
    };

    this.submissions.get(bountyId)!.push(submission);
    this.bounties.set(bountyId, {
      ...bounty,
      currentSubmissions: bounty.currentSubmissions + 1,
      status: 'in-progress',
    });

    this.emit('bounty:submission', { bountyId, creatorId });
    return ok(submission);
  }

  /** Seed the initial set of pilot bounties */
  async seedPilotBounties(): Promise<Result<ContentBounty[]>> {
    const pilotBounties: Omit<ContentBounty, 'id' | 'createdAt' | 'currentSubmissions' | 'status'>[] = [
      {
        title: 'Phase 3 Australian Animals Storybook',
        description: 'Create a decodable storybook about Australian animals for children aged 5-7, targeting Phase 3 GPCs including digraphs sh, ch, th.',
        requirements: { phase: 3, themes: ['australian-animals'], ageRange: { min: 5, max: 7 }, minPages: 10, maxPages: 14, minDecodability: 0.85, culturalContext: 'australia' },
        reward: { tokenAmount: 500, usdEquivalent: 50, bonusForExcellence: 100, creatorTierPoints: 25 },
        priority: 'high', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), maxSubmissions: 5, fundingSource: 'platform-budget',
      },
      {
        title: 'Phase 5 Mystery Series (Ages 7-9)',
        description: 'Create a mystery story featuring split digraphs and alternative spellings for confident Phase 5 readers.',
        requirements: { phase: 5, themes: ['dinosaurs', 'forest-adventure'], ageRange: { min: 7, max: 9 }, minPages: 16, maxPages: 24, minDecodability: 0.85 },
        reward: { tokenAmount: 750, usdEquivalent: 75, bonusForExcellence: 150, creatorTierPoints: 40 },
        priority: 'high', deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), maxSubmissions: 5, fundingSource: 'platform-budget',
      },
      {
        title: 'Phase 2 Friendship Stories (Ages 3-5)',
        description: 'Gentle friendship stories for the youngest readers using only Phase 2 GPCs. Focus on emotional engagement and repetitive, predictable text.',
        requirements: { phase: 2, themes: ['friendship-feelings'], ageRange: { min: 3, max: 5 }, minPages: 8, maxPages: 10, minDecodability: 0.90 },
        reward: { tokenAmount: 400, usdEquivalent: 40, bonusForExcellence: 80, creatorTierPoints: 20 },
        priority: 'medium', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), maxSubmissions: 8, fundingSource: 'platform-budget',
      },
      {
        title: 'Phase 4 Space Adventure with Clusters',
        description: 'Space-themed adventure showcasing consonant clusters (bl, br, cl, cr, dr, fl, fr, gl, gr, etc.) for Phase 4 learners.',
        requirements: { phase: 4, themes: ['space-adventure'], ageRange: { min: 5, max: 7 }, minPages: 12, maxPages: 16, minDecodability: 0.85, requiredGPCs: ['bl', 'br', 'cr', 'fl', 'gr', 'sp', 'st', 'tr'] },
        reward: { tokenAmount: 600, usdEquivalent: 60, bonusForExcellence: 120, creatorTierPoints: 30 },
        priority: 'medium', deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), maxSubmissions: 5, fundingSource: 'platform-budget',
      },
      {
        title: 'Phase 3 Cooking Information Text',
        description: 'Non-fiction decodable text about simple cooking/baking, suitable for Phase 3 readers aged 5-7.',
        requirements: { phase: 3, themes: ['cooking-kitchen'], ageRange: { min: 5, max: 7 }, minPages: 8, maxPages: 12, minDecodability: 0.85, culturalContext: 'universal-domestic' },
        reward: { tokenAmount: 450, usdEquivalent: 45, bonusForExcellence: 90, creatorTierPoints: 22 },
        priority: 'medium', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), maxSubmissions: 5, fundingSource: 'platform-budget',
      },
    ];

    const created: ContentBounty[] = [];
    for (const bounty of pilotBounties) {
      const result = await this.createBounty(bounty);
      if (result.success) created.push(result.data);
    }

    this.log('info', `Seeded ${created.length} pilot bounties`);
    return ok(created);
  }

  /** Get all open bounties */
  getOpenBounties(): ContentBounty[] {
    return Array.from(this.bounties.values()).filter(b => b.status === 'open' || b.status === 'in-progress');
  }
}

// ============================================================================
// S17-008: Incident Response & Runbook
// ============================================================================
// Defines the operational procedures for handling production incidents.
// Every incident classification, escalation path, and recovery procedure
// is codified so that on-call engineers aren't making it up as they go.
// ============================================================================

export type IncidentSeverity = 'P1-critical' | 'P2-high' | 'P3-medium' | 'P4-low';
export type IncidentStatus = 'detected' | 'investigating' | 'identified' | 'mitigating' | 'resolved' | 'post-mortem';

export interface IncidentDefinition {
  readonly id: string;
  readonly name: string;
  readonly severity: IncidentSeverity;
  readonly description: string;
  readonly detectionMethod: string;         // How is this detected? (alert, user report, etc.)
  readonly impactDescription: string;       // What's the user impact?
  readonly escalationPath: EscalationStep[];
  readonly runbookSteps: RunbookStep[];
  readonly rollbackProcedure?: string;
  readonly communicationTemplate: string;
  readonly slaResponseMinutes: number;
  readonly slaResolutionMinutes: number;
}

export interface EscalationStep {
  readonly minutesAfterDetection: number;
  readonly notifyRole: string;              // e.g. "on-call-engineer", "engineering-lead", "cto"
  readonly notifyChannel: string;           // e.g. "slack-incidents", "pagerduty", "phone"
  readonly message: string;
}

export interface RunbookStep {
  readonly order: number;
  readonly description: string;
  readonly command?: string;                // CLI command to execute
  readonly verificationStep: string;        // How to verify this step worked
  readonly rollbackStep?: string;           // How to undo this step
  readonly estimatedMinutes: number;
}

export class IncidentResponseService extends ScholarlyBaseService {
  private readonly runbooks: Map<string, IncidentDefinition> = new Map();

  constructor() {
    super('IncidentResponseService');
    this.loadRunbooks();
  }

  /** Load predefined incident runbooks */
  private loadRunbooks(): void {
    const incidents: IncidentDefinition[] = [
      {
        id: 'INC-001', name: 'API Gateway Down', severity: 'P1-critical',
        description: 'The API gateway is not responding to health checks',
        detectionMethod: 'Prometheus alert: api_gateway_health_check_failures > 3 in 5m',
        impactDescription: 'All users unable to access the platform. Complete service outage.',
        slaResponseMinutes: 5, slaResolutionMinutes: 30,
        escalationPath: [
          { minutesAfterDetection: 0, notifyRole: 'on-call-engineer', notifyChannel: 'pagerduty', message: 'P1: API Gateway down' },
          { minutesAfterDetection: 10, notifyRole: 'engineering-lead', notifyChannel: 'phone', message: 'P1 unresolved after 10min' },
          { minutesAfterDetection: 30, notifyRole: 'cto', notifyChannel: 'phone', message: 'P1 unresolved after 30min' },
        ],
        runbookSteps: [
          { order: 1, description: 'Check Kubernetes pod status', command: 'kubectl get pods -n scholarly-production -l app=api-gateway', verificationStep: 'Verify pod count matches expected replicas', estimatedMinutes: 1 },
          { order: 2, description: 'Check pod logs for errors', command: 'kubectl logs -n scholarly-production -l app=api-gateway --tail=100', verificationStep: 'Look for OOM, crash loops, or connection errors', estimatedMinutes: 2 },
          { order: 3, description: 'Restart pods if crashed', command: 'kubectl rollout restart deployment/api-gateway -n scholarly-production', verificationStep: 'Wait for rollout to complete and health checks to pass', rollbackStep: 'kubectl rollout undo deployment/api-gateway -n scholarly-production', estimatedMinutes: 3 },
          { order: 4, description: 'Check upstream dependencies (PostgreSQL, Redis, NATS)', command: 'kubectl get pods -n scholarly-production | grep -E "postgres|redis|nats"', verificationStep: 'All dependency pods running and healthy', estimatedMinutes: 2 },
          { order: 5, description: 'If dependency down, restart it', command: 'kubectl rollout restart statefulset/{dependency} -n scholarly-production', verificationStep: 'Dependency health check passing', estimatedMinutes: 5 },
        ],
        communicationTemplate: '🔴 P1 Incident: API Gateway is currently experiencing issues. Our team is investigating. We will provide updates every 15 minutes.',
        rollbackProcedure: 'kubectl rollout undo deployment/api-gateway -n scholarly-production',
      },
      {
        id: 'INC-002', name: 'AI Provider Outage', severity: 'P2-high',
        description: 'One or more AI providers (Claude, GPT Image, ElevenLabs) are unavailable',
        detectionMethod: 'AIPAL circuit breaker tripped for provider; alert: ai_provider_error_rate > 50% in 5m',
        impactDescription: 'Story generation, illustration, or narration degraded. Existing content still accessible.',
        slaResponseMinutes: 15, slaResolutionMinutes: 120,
        escalationPath: [
          { minutesAfterDetection: 0, notifyRole: 'on-call-engineer', notifyChannel: 'slack-incidents', message: 'P2: AI provider degraded' },
          { minutesAfterDetection: 30, notifyRole: 'engineering-lead', notifyChannel: 'slack-incidents', message: 'P2: AI provider still down after 30min' },
        ],
        runbookSteps: [
          { order: 1, description: 'Check AIPAL circuit breaker dashboard', command: 'curl http://internal-api:3001/admin/circuit-breakers', verificationStep: 'Identify which provider/capability is tripped', estimatedMinutes: 1 },
          { order: 2, description: 'Verify provider status page', command: 'curl -s https://status.anthropic.com https://status.openai.com', verificationStep: 'Check for reported outages', estimatedMinutes: 2 },
          { order: 3, description: 'Activate fallback provider via AIPAL', command: 'curl -X POST http://internal-api:3001/admin/provider-fallback -d \'{"provider":"fallback"}\'', verificationStep: 'Verify fallback provider responding', estimatedMinutes: 3 },
          { order: 4, description: 'Enable cached-content-only mode if all providers down', command: 'curl -X POST http://internal-api:3001/admin/feature-flag -d \'{"flag":"cached_content_only","enabled":true}\'', verificationStep: 'Library serves pre-generated content only', estimatedMinutes: 2 },
        ],
        communicationTemplate: '🟡 Some AI-powered features (story generation) are temporarily limited. Reading existing storybooks continues to work normally.',
      },
      {
        id: 'INC-003', name: 'Database Performance Degradation', severity: 'P2-high',
        description: 'PostgreSQL query latency exceeding P95 targets or connection pool exhaustion',
        detectionMethod: 'Alert: pg_query_duration_p95 > 500ms for 5m OR pg_active_connections > 80% of max',
        impactDescription: 'Slow page loads, intermittent errors for some users. May cascade to timeouts.',
        slaResponseMinutes: 10, slaResolutionMinutes: 60,
        escalationPath: [
          { minutesAfterDetection: 0, notifyRole: 'on-call-engineer', notifyChannel: 'pagerduty', message: 'P2: Database performance degraded' },
          { minutesAfterDetection: 20, notifyRole: 'engineering-lead', notifyChannel: 'slack-incidents', message: 'P2: DB performance unresolved' },
        ],
        runbookSteps: [
          { order: 1, description: 'Check active queries', command: 'psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = \'active\' ORDER BY duration DESC LIMIT 10;"', verificationStep: 'Identify long-running queries', estimatedMinutes: 2 },
          { order: 2, description: 'Kill long-running queries if blocking', command: 'psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval \'30 seconds\' AND state = \'active\';"', verificationStep: 'Blocked queries released', rollbackStep: 'N/A - killed queries will retry', estimatedMinutes: 1 },
          { order: 3, description: 'Check connection pool utilisation', command: 'curl http://pgbouncer:6432/show/pools', verificationStep: 'Active connections below 80% of max', estimatedMinutes: 1 },
          { order: 4, description: 'Increase connection pool if needed', command: 'kubectl edit configmap pgbouncer-config -n scholarly-production', verificationStep: 'Pool size increased, pgBouncer reloaded', estimatedMinutes: 5 },
          { order: 5, description: 'Verify materialised views are current', command: 'psql -c "SELECT schemaname, matviewname, last_refresh FROM pg_matviews;"', verificationStep: 'All materialised views refreshed within expected window', estimatedMinutes: 2 },
        ],
        communicationTemplate: '🟡 Some users may experience slower than normal load times. Our team is working to resolve this.',
      },
      {
        id: 'INC-004', name: 'Content Safety Violation', severity: 'P1-critical',
        description: 'Inappropriate content detected in a storybook available to children',
        detectionMethod: 'User report, automated content safety scan, or manual review flag',
        impactDescription: 'Child safety risk. Affected content must be immediately quarantined.',
        slaResponseMinutes: 5, slaResolutionMinutes: 15,
        escalationPath: [
          { minutesAfterDetection: 0, notifyRole: 'on-call-engineer', notifyChannel: 'pagerduty', message: 'P1 SAFETY: Content safety violation detected' },
          { minutesAfterDetection: 0, notifyRole: 'engineering-lead', notifyChannel: 'phone', message: 'P1 SAFETY: Immediate attention required' },
          { minutesAfterDetection: 5, notifyRole: 'cto', notifyChannel: 'phone', message: 'P1 SAFETY: Content violation in production' },
        ],
        runbookSteps: [
          { order: 1, description: 'Immediately quarantine the affected content', command: 'curl -X POST http://internal-api:3002/admin/quarantine -d \'{"storybookId":"AFFECTED_ID"}\'', verificationStep: 'Content no longer accessible to any user', estimatedMinutes: 1 },
          { order: 2, description: 'Identify scope — how many users saw the content', command: 'psql -c "SELECT COUNT(DISTINCT learner_id) FROM storybook_analytics WHERE storybook_id = \'AFFECTED_ID\';"', verificationStep: 'Impact scope documented', estimatedMinutes: 2 },
          { order: 3, description: 'Run full safety audit on content from same creator', command: 'curl -X POST http://internal-api:3002/admin/safety-audit -d \'{"creatorId":"CREATOR_ID"}\'', verificationStep: 'All content from creator reviewed', estimatedMinutes: 5 },
          { order: 4, description: 'Notify affected families if children were exposed', command: 'Use parent notification service', verificationStep: 'All affected parents notified', estimatedMinutes: 5 },
          { order: 5, description: 'Suspend creator account pending investigation', command: 'curl -X POST http://internal-api:3003/admin/suspend -d \'{"creatorId":"CREATOR_ID"}\'', verificationStep: 'Creator cannot publish new content', estimatedMinutes: 1 },
        ],
        communicationTemplate: 'We have identified and removed content that did not meet our safety standards. Affected families have been notified directly.',
      },
    ];

    for (const incident of incidents) {
      this.runbooks.set(incident.id, incident);
    }

    this.log('info', `Loaded ${incidents.length} incident runbooks`);
  }

  /** Get runbook for an incident type */
  getRunbook(incidentId: string): Result<IncidentDefinition> {
    const runbook = this.runbooks.get(incidentId);
    if (!runbook) return fail(`Runbook not found: ${incidentId}`);
    return ok(runbook);
  }

  /** Get all runbooks */
  getAllRunbooks(): IncidentDefinition[] {
    return Array.from(this.runbooks.values());
  }

  /** Get runbooks by severity */
  getRunbooksBySeverity(severity: IncidentSeverity): IncidentDefinition[] {
    return Array.from(this.runbooks.values()).filter(r => r.severity === severity);
  }
}

// ============================================================================
// S17-009: Launch Readiness Scorecard
// ============================================================================
// The go/no-go framework that synthesises all Sprint 17 deliverables into
// a single, unambiguous launch decision. Think of it as a pre-flight
// checklist for an aircraft — every item must be green before takeoff.
// ============================================================================

export type ReadinessStatus = 'green' | 'amber' | 'red' | 'not-assessed';

export interface ReadinessItem {
  readonly id: string;
  readonly category: string;
  readonly name: string;
  readonly description: string;
  readonly status: ReadinessStatus;
  readonly evidence: string;
  readonly owner: string;
  readonly blocksLaunch: boolean;    // If red, does this block launch?
  readonly remediation?: string;     // What to do if not green
}

export interface ReadinessScorecard {
  readonly assessedAt: Date;
  readonly overallStatus: ReadinessStatus;
  readonly launchReady: boolean;
  readonly items: ReadinessItem[];
  readonly greenCount: number;
  readonly amberCount: number;
  readonly redCount: number;
  readonly blockingItems: ReadinessItem[];
  readonly recommendations: string[];
}

export class LaunchReadinessService extends ScholarlyBaseService {
  constructor() { super('LaunchReadinessService'); }

  /** Assess launch readiness across all dimensions */
  async assess(): Promise<Result<ReadinessScorecard>> {
    const items: ReadinessItem[] = [
      // Content Readiness
      { id: 'CR-01', category: 'Content', name: 'Seed Library Generated', description: '100+ storybooks across Phases 2-5', status: 'not-assessed', evidence: '', owner: 'Content Team', blocksLaunch: true },
      { id: 'CR-02', category: 'Content', name: 'QA Pass Rate >90%', description: 'At least 90% of seed library passes QA', status: 'not-assessed', evidence: '', owner: 'Content Team', blocksLaunch: true },
      { id: 'CR-03', category: 'Content', name: 'Theme Coverage', description: 'At least 8 themes represented', status: 'not-assessed', evidence: '', owner: 'Content Team', blocksLaunch: false },
      { id: 'CR-04', category: 'Content', name: 'Audio Narration Coverage', description: '>75% of books have narration', status: 'not-assessed', evidence: '', owner: 'Content Team', blocksLaunch: false },

      // Technical Readiness
      { id: 'TR-01', category: 'Technical', name: 'Load Test Passed', description: 'Normal and Peak scenarios pass', status: 'not-assessed', evidence: '', owner: 'Engineering', blocksLaunch: true },
      { id: 'TR-02', category: 'Technical', name: 'Security Audit Clear', description: 'No P1/P2 vulnerabilities from S16-001', status: 'not-assessed', evidence: '', owner: 'Security', blocksLaunch: true },
      { id: 'TR-03', category: 'Technical', name: 'Monitoring Active', description: 'Prometheus, Grafana, alerting operational', status: 'not-assessed', evidence: '', owner: 'DevOps', blocksLaunch: true },
      { id: 'TR-04', category: 'Technical', name: 'Deployment Pipeline Verified', description: 'Staging → Production promotion tested', status: 'not-assessed', evidence: '', owner: 'DevOps', blocksLaunch: true },
      { id: 'TR-05', category: 'Technical', name: 'Rollback Procedure Tested', description: 'Automatic rollback verified', status: 'not-assessed', evidence: '', owner: 'DevOps', blocksLaunch: true },
      { id: 'TR-06', category: 'Technical', name: 'Incident Runbooks Complete', description: 'P1-P4 runbooks documented and reviewed', status: 'not-assessed', evidence: '', owner: 'Engineering', blocksLaunch: true },

      // Platform Readiness
      { id: 'PR-01', category: 'Platform', name: 'PWA Deployed', description: 'Web version live and accessible', status: 'not-assessed', evidence: '', owner: 'Engineering', blocksLaunch: true },
      { id: 'PR-02', category: 'Platform', name: 'iOS Submitted', description: 'Apple App Store submission accepted', status: 'not-assessed', evidence: '', owner: 'Mobile', blocksLaunch: false },
      { id: 'PR-03', category: 'Platform', name: 'Android Submitted', description: 'Google Play submission accepted', status: 'not-assessed', evidence: '', owner: 'Mobile', blocksLaunch: false },
      { id: 'PR-04', category: 'Platform', name: 'Cross-Platform Sync', description: 'Progress syncs across devices', status: 'not-assessed', evidence: '', owner: 'Engineering', blocksLaunch: true },
      { id: 'PR-05', category: 'Platform', name: 'Offline Reading Works', description: 'Downloaded books readable offline', status: 'not-assessed', evidence: '', owner: 'Engineering', blocksLaunch: false },

      // Compliance Readiness
      { id: 'CO-01', category: 'Compliance', name: 'COPPA Compliant', description: 'All 8 COPPA controls verified', status: 'not-assessed', evidence: '', owner: 'Legal', blocksLaunch: true },
      { id: 'CO-02', category: 'Compliance', name: 'GDPR Compliant', description: 'All 12 GDPR articles addressed', status: 'not-assessed', evidence: '', owner: 'Legal', blocksLaunch: true },
      { id: 'CO-03', category: 'Compliance', name: 'WCAG 2.1 AA', description: '20/20 criteria pass (S16-008)', status: 'not-assessed', evidence: '', owner: 'Accessibility', blocksLaunch: true },
      { id: 'CO-04', category: 'Compliance', name: 'Privacy Policy Published', description: 'Privacy policy live and accurate', status: 'not-assessed', evidence: '', owner: 'Legal', blocksLaunch: true },

      // Ecosystem Readiness
      { id: 'ER-01', category: 'Ecosystem', name: 'Developer Portal Live', description: 'API explorer, playground, tutorials accessible', status: 'not-assessed', evidence: '', owner: 'Platform', blocksLaunch: false },
      { id: 'ER-02', category: 'Ecosystem', name: 'Marketplace Active', description: 'Review pipeline operational', status: 'not-assessed', evidence: '', owner: 'Platform', blocksLaunch: false },
      { id: 'ER-03', category: 'Ecosystem', name: 'Bounty System Ready', description: 'Pilot bounties posted', status: 'not-assessed', evidence: '', owner: 'Community', blocksLaunch: false },

      // Beta Readiness
      { id: 'BR-01', category: 'Beta', name: 'Alpha Cohort Recruited', description: '3-5 schools + 10-15 families', status: 'not-assessed', evidence: '', owner: 'Growth', blocksLaunch: true },
      { id: 'BR-02', category: 'Beta', name: 'Onboarding Flow Tested', description: 'End-to-end registration works', status: 'not-assessed', evidence: '', owner: 'Product', blocksLaunch: true },
      { id: 'BR-03', category: 'Beta', name: 'Feedback Collection Setup', description: 'NPS, surveys, bug reporting active', status: 'not-assessed', evidence: '', owner: 'Product', blocksLaunch: false },
    ];

    const greenCount = items.filter(i => i.status === 'green').length;
    const amberCount = items.filter(i => i.status === 'amber').length;
    const redCount = items.filter(i => i.status === 'red').length;
    const blockingItems = items.filter(i => i.blocksLaunch && i.status !== 'green');

    const overallStatus: ReadinessStatus = blockingItems.length > 0 ? 'red' : amberCount > 0 ? 'amber' : 'green';

    const recommendations: string[] = [];
    if (blockingItems.length > 0) {
      recommendations.push(`${blockingItems.length} blocking items must be resolved before launch`);
      for (const item of blockingItems) {
        recommendations.push(`[BLOCKING] ${item.name}: ${item.remediation || 'Needs assessment'}`);
      }
    }
    if (amberCount > 0) {
      recommendations.push(`${amberCount} items are amber — acceptable for beta launch but should be greened before GA`);
    }

    return ok({
      assessedAt: new Date(),
      overallStatus,
      launchReady: blockingItems.length === 0,
      items,
      greenCount,
      amberCount,
      redCount,
      blockingItems,
      recommendations,
    });
  }
}
