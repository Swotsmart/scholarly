/**
 * Scholarly Phase 3: Advanced Learning Features
 * 
 * This module provides comprehensive advanced learning capabilities:
 * 
 * - **Video Coaching**: Edthena-style lesson recording and mentor feedback
 * - **Peer Review**: AI-enhanced peer feedback with comparative review
 * - **Industry Experience**: WBL placements, apprenticeships, teacher externships
 * - **Professional Development**: On-demand PD hub with ISTE U-style courses
 * - **Project-Based Learning**: Gold Standard PBL with pitching assessments
 * 
 * @module Phase3-AdvancedLearning
 * @version 1.0.0
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './phase3-types';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export {
  VideoCoachingService,
  VideoRecordingRepository,
  ReviewCycleRepository,
  CommentRepository,
  VideoStorageProvider,
  TranscriptionProvider,
  VideoAnalysisProvider,
  VideoCoachingConfig,
  VIDEO_COACHING_SERVICE_VERSION
} from './video-coaching-service';

export {
  PeerReviewService,
  PeerReviewSessionRepository,
  PeerSubmissionRepository,
  ReviewAssignmentRepository,
  PeerReviewRepository,
  PeerReviewAIProvider,
  PeerReviewServiceConfig,
  PEER_REVIEW_SERVICE_VERSION
} from './peer-review-service';

export {
  IndustryExperienceService,
  IndustryPartnerRepository,
  IndustryOpportunityRepository,
  ExperienceApplicationRepository,
  ExperiencePlacementRepository,
  MatchingAIProvider,
  ApplicantProfile,
  OpportunitySearchQuery,
  IEMServiceConfig,
  IEM_SERVICE_VERSION
} from './industry-experience-service';

export {
  PDHubService,
  PDCourseRepository,
  PDEnrollmentRepository,
  PDServiceConfig,
  PD_HUB_SERVICE_VERSION
} from './pd-hub-service';

export {
  PBLFrameworkService,
  PBLProjectRepository,
  PBLInstanceRepository,
  PitchSubmissionRepository,
  PitchCoachAI,
  PBLServiceConfig,
  PBL_SERVICE_VERSION
} from './pbl-framework-service';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PHASE3_VERSION = '1.0.0';
export const PHASE3_NAME = 'Advanced Learning Features';
export const PHASE3_COMPONENTS = [
  'VideoCoachingService',
  'PeerReviewService',
  'IndustryExperienceService',
  'PDHubService',
  'PBLFrameworkService'
];

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_VIDEO_COACHING_CONFIG: import('./video-coaching-service').VideoCoachingConfig = {
  maxVideoSizeMB: 500,
  maxVideoDurationMinutes: 60,
  supportedFormats: ['mp4', 'mov', 'webm', 'avi'],
  defaultVisibility: 'private',
  autoTranscribe: true,
  autoAnalyze: true,
  retentionDays: 365,
  supportedStandardsFrameworks: ['AITSL', 'ISTE', 'Danielson']
};

export const DEFAULT_PEER_REVIEW_CONFIG: import('./peer-review-service').PeerReviewServiceConfig = {
  defaultReviewsPerSubmission: 3,
  defaultSubmissionsPerReviewer: 3,
  minimumFeedbackWords: 50,
  enableAIByDefault: true,
  calibrationThreshold: 1.0,
  anonymousDefault: true
};

export const DEFAULT_IEM_CONFIG: import('./industry-experience-service').IEMServiceConfig = {
  maxApplicationsPerOpportunity: 100,
  maxActiveApplicationsPerUser: 5,
  requireSafeguardingVerification: true,
  autoMatchEnabled: true,
  credentialIssuanceEnabled: true,
  minimumPlacementHours: 20
};

export const DEFAULT_PD_CONFIG: import('./pd-hub-service').PDServiceConfig = {
  maxConcurrentEnrollments: 5,
  credentialIssuanceEnabled: true,
  passingScoreDefault: 80,
  pdCreditsPerHour: 1
};

export const DEFAULT_PBL_CONFIG: import('./pbl-framework-service').PBLServiceConfig = {
  enableAIPitchCoach: true,
  maxTeamSize: 6,
  minReflectionsRequired: 3,
  minPeerReviewRounds: 2,
  credentialIssuanceEnabled: true,
  defaultPitchDuration: 10
};
