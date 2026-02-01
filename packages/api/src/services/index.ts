/**
 * Service Exports
 *
 * Central export point for all Scholarly services
 */

// Core Services - tutor-booking first to establish TimeSlot
export {
  TutorBookingService,
  initializeTutorBookingService,
  getTutorBookingService,
  type Jurisdiction,
  type SessionType,
  type TutorSearchFilters,
  type TutorProfileWithRelations,
  type LearnerProfileWithRelations,
  type BookingWithRelations,
  type SessionWithRelations,
  type BookingPricing,
  type TutorMatchRequest,
  type TutorMatch,
  type TimeSlot,
  type ProfileBuilderSession,
  JURISDICTION_REQUIREMENTS,
} from './tutor-booking.service';
export * from './micro-school.service';

// EduScrum Orchestrator
export {
  EduScrumOrchestrator,
  initializeEduScrumOrchestrator,
  getEduScrumOrchestrator,
  type EduScrumTeamWithRelations,
  type EduScrumSprintWithRelations,
  type TeamMember as EduScrumTeamMember,
  type TeamDynamics,
  type AIObservation,
  type TeamIntervention,
  type TeamFormationType,
  type TeamMaturityLevel,
  type SprintBacklogItem,
  type Blocker,
  type StandupEntry,
  type StandupResponse,
  type BurndownPoint,
  type AIInsights,
  type AIInsight as EduScrumAIInsight,
  type CoachingMessage,
  type KanbanBoard,
  type ActionItem,
} from './eduscrum-orchestrator.service';

// Content Marketplace
export {
  ContentMarketplaceService,
  type ContentItem as MarketplaceContentItem,
  type ContentRepository,
  type ReviewRepository,
  type RequestRepository,
  type PurchaseRepository,
  type CreatorProfileRepository,
  type ContentReview,
  type CreatorProfile
} from './content-marketplace.service';

// Homeschool Hub Service
export * from './homeschool-hub.service';

// Relief Marketplace - rename TimeSlot to avoid conflict
export {
  SuperIntelligentReliefMarketplace,
  type TimeSlot as ReliefTimeSlot,
  type ReliefTeacher,
  type TeacherAIProfile,
  type TeacherAbsence,
  type AbsencePrediction,
  type IntelligentSchoolPool,
  type IntelligentBooking,
  type ReliefTeacherRepository,
  type AbsenceRepository,
  type PredictionRepository,
  type ReliefPoolRepository,
  type ReliefBookingRepository
} from './relief-marketplace.service';

// Scheduling & Planning Services
export * from './scheduling-engine.service';
export * from './capacity-planning.service';

// Curriculum Curator - rename ContentItem to avoid conflict
export {
  CurriculumCuratorService,
  type ContentItem as CurriculumContentItem,
  type CurriculumFramework,
  type LearningArea,
  type Strand,
  type ContentDescription,
  type CurriculumKnowledgeGraph,
  type ConceptNode,
  type SkillNode,
  type AIAlignment,
  type CrossCurricularDiscovery,
  type GeneratedLessonPlan,
  type CurriculumFrameworkRepository,
  type ContentDescriptionRepository,
  type KnowledgeGraphRepository,
  type ContentItemRepository,
  type LessonPlanRepository
} from './curriculum-curator.service';

// LIS Bridge Service
export * from './lis-scholarly-bridge.service';

// Authentication Service
export * from './auth.service';

// Blockchain Service
export * from './blockchain.service';

// AI Integration Services
export {
  AIIntegrationService,
  initializeAIService,
  getAIService,
  type AIConfig,
  type AIProvider,
  type ChatMessage,
  type CompletionRequest,
  type CompletionResponse,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type AIBuddyContext,
  type AIBuddyMessage,
  type LessonPlanAIInput,
  type LessonPlanAIOutput
} from './ai-integration.service';

// AI Buddy Service
export {
  AIBuddyService,
  initializeAIBuddyService,
  getAIBuddyService,
  type Conversation,
  type StoredMessage,
  type LearnerProfile,
  type BuddySettings,
  type BuddyRole,
  type SendMessageRequest,
  type SendMessageResponse
} from './ai-buddy.service';

// Digital Portfolio Service
export {
  DigitalPortfolioService,
  initializeDigitalPortfolioService,
  getDigitalPortfolioService,
  type Portfolio,
  type Artifact,
  type ArtifactType,
  type LearningGoal,
  type Achievement,
  type LearningJourney,
  type JourneyNode
} from './digital-portfolio.service';

// Standards Compliance Service (Australian Education Standards)
export {
  StandardsComplianceService,
  initializeStandardsComplianceService,
  getStandardsComplianceService,
  type ComplianceFramework,
  type ComplianceRule,
  type ComplianceCheck,
  type ComplianceReport,
  type ComplianceSummary,
  type ACARACurriculumCode,
  type ACARACurriculumAlignment,
  type ACARAAchievementMapping,
  type GeneralCapability,
  type CrossCurriculumPriority,
  type ST4SDataClassification,
  type ST4SPrivacyAssessment,
  type ST4SSecurityControl,
  type AITSLTeacherStandard,
  type AITSLTeacherAssessment,
  type AITSLCredentialVerification,
  type AIEthicsAssessment,
  type AIEthicsPrinciple,
  type AIInSchoolsCompliance,
  type AIContentSafetyCheck,
  type HESStandard,
  type HESAssessment
} from './standards-compliance.service';

// AI Content Studio Service
export {
  AIContentStudioService,
  initializeAIContentStudioService,
  getAIContentStudioService,
  type LessonPlanRequest,
  type LessonPlan,
  type LessonPhase,
  type LessonActivity,
  type LearningObjective,
  type DifferentiationStrategy,
  type LessonAssessment,
  type AssessmentRequest,
  type Assessment,
  type AssessmentSection,
  type AssessmentQuestion,
  type QuestionType,
  type AssessmentRubric,
  type ResourceRequest,
  type ResourceType,
  type LearningResource,
  type ScaffoldRequest,
  type ScaffoldedPathway,
  type LearningStage,
  type LearningCheckpoint,
  type PedagogicalApproach
} from './ai-content-studio.service';

// Project-Based Learning Service
export {
  ProjectBasedLearningService,
  initializeProjectBasedLearningService,
  getProjectBasedLearningService,
  type ProjectTemplate,
  type ProjectCategory,
  type ProjectPhase,
  type MilestoneTemplate,
  type DeliverableTemplate,
  type DeliverableType,
  type AssessmentCriteria,
  type ProjectResource,
  type ProjectScaffold,
  type TeacherGuidance,
  type Project,
  type ProjectStatus,
  type ProjectTeam,
  type TeamMember,
  type TeamRole,
  type ActivePhase,
  type ActiveMilestone,
  type ActiveDeliverable,
  type ProjectReflection,
  type ProjectFeedback,
  type ProjectMetrics,
  type TeamFormationRequest,
  type TeamFormationResult,
  type CollaborationActivity,
  type TeamMeeting
} from './project-based-learning.service';

// Data Lake Service (ETL & Data Catalog)
export {
  DataLakeService,
  initializeDataLakeService,
  getDataLakeService,
  type DataSource,
  type DataSourceType,
  type ConnectionConfig,
  type DataSchema,
  type SchemaField,
  type IngestionSchedule,
  type ETLPipeline,
  type ETLStage,
  type ETLStageType,
  type ETLStageConfig,
  type ETLDestination,
  type PipelineMetrics,
  type PipelineRunResult,
  type StageResult,
  type DataCatalogEntry,
  type DataLineage,
  type DataQualityMetrics,
  type DataQualityIssue,
  type StreamingPipeline,
  type StreamSource,
  type StreamProcessor,
  type StreamSink,
  type DataLakeTable,
  type TableStatistics,
  type DataAnomaly
} from './data-lake.service';

// ML Pipeline Service (Machine Learning)
export {
  MLPipelineService,
  initializeMLPipelineService,
  getMLPipelineService,
  type MLModel,
  type MLModelType,
  type MLFramework,
  type ModelStatus,
  type FeatureConfig,
  type FeatureDefinition,
  type TargetConfig,
  type TrainingConfig,
  type TrainingMetrics,
  type ModelMetrics,
  type FeatureImportance,
  type DeploymentConfig,
  type InferenceStats,
  type FeatureStore,
  type StoredFeature,
  type TrainingJob,
  type AutoMLConfig,
  type AutoMLResult,
  type StudentRiskPrediction,
  type RiskFactor,
  type Intervention,
  type PerformancePrediction,
  type ForecastPoint,
  type PerformanceDriver,
  type EngagementPrediction,
  type LearningPathRecommendation,
  type PathStep,
  type PredictionResult
} from './ml-pipeline.service';

// Analytics & Reporting Service
export {
  AnalyticsReportingService,
  initializeAnalyticsReportingService,
  getAnalyticsReportingService,
  type PersonaType,
  type Dashboard,
  type DashboardLayout,
  type Widget,
  type WidgetType,
  type DataSourceConfig,
  type VisualizationConfig,
  type DashboardFilter,
  type Report,
  type ReportType,
  type ReportTemplate,
  type ReportSchedule,
  type GeneratedReport,
  type ReportData,
  type ReportSummary,
  type AIInsight,
  type InsightType,
  type Recommendation,
  type Metric,
  type MetricCategory,
  type TeacherDashboardData,
  type AdminDashboardData,
  type StudentDashboardData,
  type ParentDashboardData,
  type ClassPerformance,
  type AtRiskStudent,
  type SchoolPerformance,
  type ComplianceStatus,
  type BudgetSummary
} from './analytics-reporting.service';

// Design & Pitch AI Service (Design Thinking + Entrepreneurial Pitching)
export {
  DesignPitchAIService,
  initializeDesignPitchAIService,
  getDesignPitchAIService,
  type DesignChallenge,
  type ChallengeConstraints,
  type ChallengeRubric,
  type RubricCriterion,
  type LearnerJourney,
  type JourneyPhase,
  type LearningGoal as DesignPitchLearningGoal,
  type ProblemStatement,
  type ValidationStatus,
  type AIValidation,
  type EvidenceItem,
  type UserPersona,
  type VersionedArtifact,
  type ArtifactType as DesignPitchArtifactType,
  type ArtifactVersion,
  type PeerReview,
  type FeedbackPin,
  type ReviewStatus,
  type ReviewAISynthesis,
  type GrowthArea,
  type PitchDeck,
  type PitchSlide,
  type SlideType,
  type SlideContent,
  type PitchTheme,
  type PresentationMode,
  type PitchScore,
  type RubricScore,
  type LTIConfiguration
} from './design-pitch-ai.service';

// Base Service
export * from './base.service';

// Early Years Core Service (Little Explorers - ages 3-7)
export { earlyYearsCoreService } from './early-years-core.service';

// LinguaFlow Language Learning Service
export { linguaFlowService } from './linguaflow.service';

// Notification Service
export {
  NotificationService,
  initializeNotificationService,
  getNotificationService,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationStatus,
  type NotificationPayload,
  type SendNotificationRequest,
  type BulkNotificationRequest,
  type NotificationPreferences,
  type NotificationFilters,
} from './notification.service';

// Feature Flag Service
export {
  FeatureFlagService,
  initializeFeatureFlagService,
  getFeatureFlagService,
  type FeatureFlag,
  type FeatureFlagRule,
  type EvaluationContext,
  type TenantConfiguration,
  type BrandingConfig,
  type TenantLimits,
  type IntegrationConfig,
} from './feature-flag.service';

// Showcase Portfolio Service (Terminal Phase of Design & Pitch Journey)
export {
  ShowcasePortfolioService,
  initializeShowcasePortfolioService,
  getShowcasePortfolioService,
  type ShowcasePortfolio,
  type PortfolioStatus,
  type SEOSettings,
  type ShowcaseTheme,
  type ShowcaseLayout,
  type ShowcaseItem,
  type ItemReflection,
  type ItemDisplayConfig,
  type PitchDeckEmbed,
  type SkillTag,
  type SkillCategory,
  type SkillEvidence,
  type GuestbookEntry,
  type GuestbookStatus,
  type ViewerLocation,
  type PortfolioAnalytics,
  type ViewsByDate,
  type ViewByLocation,
  type ViewBySource,
  type ItemViewStats,
  type PortfolioViewEvent,
  type AccessLink,
  type CurationSuggestion,
  type GrowthAnalysis,
  type GrowthAreaAnalysis,
  type JourneyHighlight,
  type CreateShowcaseInput,
  type UpdateShowcaseInput,
  type PublishSettings,
  type AddItemInput,
  type ReflectionInput,
  type PitchDeckEmbedConfig,
  type AccessLinkConfig,
  type GuestbookEntryInput,
  type ViewerContext,
  type SEOMetadata
} from './showcase-portfolio.service';

// Early Years Extension Service (AI-integrated Little Explorers)
export * from './early-years.service';

// Language Learning Extension Service (AI-integrated LinguaFlow)
export {
  LanguageLearningService,
  initializeLanguageLearningService,
  getLanguageLearningService,
} from './language-learning.service';

// Language Learning Types
export * from './language-learning-types';

// Language Learning Personas
export {
  CONVERSATION_PERSONAS,
  getPersonasForLanguage,
  getPersonaById,
  getPersonasForLevel,
  getHeritagePersonas,
} from './language-learning-personas';

// 1EdTech Types
export * from './one-edtech-types';

// Golden Path Types
export * from './golden-path-types';

// LTI Advantage Service (LTI 1.3)
export {
  LTIAdvantageService,
  initializeLTIAdvantageService,
  getLTIAdvantageService,
} from './lti-advantage.service';

// OneRoster 1.2 Service
export {
  OneRosterService,
  initializeOneRosterService,
  getOneRosterService,
} from './oneroster.service';

// CASE Network Service (Competency & Academic Standards Exchange)
export {
  CASENetworkService,
  initializeCASENetworkService,
  getCASENetworkService,
} from './case-network.service';

// CLR 2.0 / Open Badges 3.0 Service
export {
  CLROpenBadgesService,
  initializeCLROpenBadgesService,
  getCLROpenBadgesService,
} from './clr-openbadges.service';

// Ed-Fi Integration Service (ODS/API v7)
export {
  EdFiIntegrationService,
  initializeEdFiIntegrationService,
  getEdFiIntegrationService,
} from './edfi-integration.service';

// Adaptation Engine Service (BKT, ZPD, Fatigue Detection)
export {
  AdaptationEngineService,
  initializeAdaptationEngineService,
  getAdaptationEngineService,
} from './adaptation-engine.service';

// Curiosity Engine Service (Interest Clusters, Emerging Interests)
export {
  CuriosityEngineService,
  initializeCuriosityEngineService,
  getCuriosityEngineService,
} from './curiosity-engine.service';

// Multi-Objective Optimizer Service (Pareto, Tchebycheff)
export {
  MultiObjectiveOptimizerService,
  initializeMultiObjectiveOptimizerService,
  getMultiObjectiveOptimizerService,
} from './multi-objective-optimizer.service';

// ============================================================================
// Phase 1: SSI/VC (Self-Sovereign Identity & Verifiable Credentials)
// ============================================================================

// SSI/VC Types
export * from './ssi-vc-types';

// DID Service (Decentralized Identifiers)
export {
  DIDService,
  initializeDIDService,
  getDIDService,
} from './did.service';

// Verifiable Credentials Service
export {
  VerifiableCredentialsService,
  initializeVCService,
  getVCService,
} from './verifiable-credentials.service';

// Digital Wallet Service
export {
  DigitalWalletService,
  initializeDigitalWalletService,
  getDigitalWalletService,
} from './digital-wallet.service';

// ============================================================================
// Phase 3: Advanced Learning Features
// ============================================================================

// Phase 3 Types
export * from './phase3-types';

// Video Coaching Service (Edthena-style lesson recording)
export {
  VideoCoachingService,
  initializeVideoCoachingService,
  getVideoCoachingService,
} from './video-coaching.service';

// Peer Review Service (AI-enhanced peer feedback)
export {
  PeerReviewService,
  initializePeerReviewService,
  getPeerReviewService,
} from './peer-review.service';

// Industry Experience Service (WBL placements)
export {
  IndustryExperienceService,
  initializeIndustryExperienceService,
  getIndustryExperienceService,
} from './industry-experience.service';

// PD Hub Service (Professional Development)
export {
  PDHubService,
  initializePDHubService,
  getPDHubService,
} from './pd-hub.service';

// PBL Framework Service (Gold Standard Project-Based Learning)
export {
  PBLFrameworkService,
  initializePBLFrameworkService,
  getPBLFrameworkService,
} from './pbl-framework.service';

// ============================================================================
// Phase 4: Governance & Immersion
// ============================================================================

// Phase 4 Types
export * from './phase4-types';

// DAO Governance Service
export {
  DAOGovernanceService,
  initializeDAOGovernanceService,
  getDAOGovernanceService,
} from './dao-governance.service';

// Token Economy Service
export {
  TokenEconomyService,
  initializeTokenEconomyService,
  getTokenEconomyService,
} from './token-economy.service';

// Developer Marketplace Service
export {
  DeveloperMarketplaceService,
  initializeDeveloperMarketplaceService,
  getDeveloperMarketplaceService,
} from './developer-marketplace.service';

// Virtual Language Immersion Service
export {
  VirtualLanguageImmersionService,
  initializeLanguageImmersionService,
  getLanguageImmersionService,
} from './language-immersion.service';

// ============================================================================
// Phase 5: Subscription Engine & Identity/Trust Services
// ============================================================================

// Subscription Engine Types
// Note: Import directly from './subscription-engine-types' to avoid
// naming conflicts (CredentialStatus, CredentialType, KycLevel overlap
// with ssi-vc-types and identity-engine-types)

// Universal Subscription Service
export {
  UniversalSubscriptionService,
  initializeSubscriptionService,
  getSubscriptionService,
} from './subscription-engine.service';

// Identity Engine Types
// Note: Import directly from './identity-engine-types' to avoid
// naming conflicts (CredentialStatus overlaps with ssi-vc-types)

// Identity Service
export {
  IdentityService,
  initializeIdentityService,
  getIdentityService,
} from './identity-engine.service';

// KYC Engine Service (Verification Providers)
export {
  KycService,
  ProviderRegistry,
  initializeKycService,
  getKycService,
} from './kyc-engine.service';

// KYB Engine Service (Business Verification)
export {
  KybService,
  initializeKybService,
  getKybService,
} from './kyb-engine.service';

// Trust Engine Service (Reputation & Risk)
export {
  TrustService,
  initializeTrustService,
  getTrustService,
} from './trust-engine.service';

// ============================================================================
// Phase 6: Scholarly Hosting (Educational Web Hosting Platform)
// ============================================================================

// Hosting Types
export * from './hosting-types';

// Hosting Provider Service (core provider management)
export {
  HostingProviderService,
  initializeHostingProviderService,
  getHostingProviderService,
  type HostingProviderRepository,
  type HostingProviderFilters,
  type CreateHostingProviderInput,
  type UpdateHostingProviderInput,
} from './hosting-provider.service';

// Hosting Quality Service (quality scores, outcomes, verification)
export {
  HostingQualityService,
  initializeHostingQualityService,
  getHostingQualityService,
  type HostingQualityProfileRepository,
  type HostingOutcomeSubmission,
  type HostingAccreditationSubmission,
  type HostingStaffQualificationsUpdate,
  type HostingRegistrationSubmission,
} from './hosting-quality.service';

// Hosting Agent API Service (AI agent discovery & comparison)
export {
  HostingAgentApiService,
  initializeHostingAgentApiService,
  getHostingAgentApiService,
  type HostingAgentAuthResult,
  type HostingRateLimitStatus,
  type HostingOfferingSearchRequest,
  type HostingOfferingSearchResult,
  type HostingOfferingSummary,
  type HostingAvailabilityCheckRequest,
  type HostingAvailabilityCheckResult,
  type HostingEnquirySubmission,
  type HostingAgentProviderRepository,
  type HostingAgentQualityRepository,
  type HostingAgentOfferingRepository,
} from './hosting-agent-api.service';

// Hosting Structured Data Service (Schema.org JSON-LD generation)
export {
  HostingStructuredDataService,
  initializeHostingStructuredDataService,
  getHostingStructuredDataService,
  type HostingJsonLdDocument,
  type HostingPostalAddressJsonLd,
  type HostingAggregateRatingJsonLd,
  type HostingPropertyValueJsonLd,
} from './hosting-structured-data.service';

// Hosting Engagement Service (enquiries, tours, reviews)
export {
  HostingEngagementService,
  initializeHostingEngagementService,
  getHostingEngagementService,
  type HostingEnquiryRepository,
  type HostingTourBookingRepository,
  type HostingReviewRepository,
  type HostingCreateEnquiryInput,
  type HostingCreateTourBookingInput,
  type HostingCreateReviewInput,
} from './hosting-engagement.service';

// ============================================================================
// Phase 7: Intelligence Mesh (Unified Learning Platform)
// ============================================================================

// Intelligence Mesh v1.4-v1.5 Types
// Note: Import directly from specific files to avoid naming conflicts with existing types
// Example: import { MeshStudent, MeshGuardian } from './mesh-types';
// export * from './mesh-types';
// export * from './mesh-events';
export * from './form-builder-types';
// export * from './classroom-excursion-types'; // Contains conflicting: Excursion, SessionFeedback, ConsentStatus
// export * from './assessment-mesh-types'; // Contains conflicting: AssessmentDefinition, AssessmentAttempt
// export * from './gradebook-mesh-types'; // Contains conflicting: ReportCard, WhatIfScenario

// Intelligence Mesh v1.6-v1.7 Types (Wellbeing, Parent Portal, Governance, etc.)
// Note: These types have naming conflicts with existing modules. Import directly from:
// - './mesh-types-v17' for MeshBaseEntity, Result, PaginationParams
// - './mesh-events-v17' for WELLBEING_EVENTS, PARENT_EVENTS, GOVERNANCE_EVENTS, etc.
// - './wellbeing-mesh-types' for StudentWellbeingProfile, WellbeingSignal, etc.
// - './parent-portal-types' for ParentPortalGuardian, ParentMessage, etc.
// - './governance-types' for DAO, DAOProposal, DAOVote, etc.
// - './token-economy-types' for TokenAccount, TokenStake, etc.
// - './marketplace-types' for MarketplaceApp, AppInstallation, etc.
// - './immersion-types' for ImmersionEnvironment, ImmersionSession, etc.

// Enrollment Mesh Service (Application lifecycle, prior learning assessment)
export {
  EnrollmentMeshService,
  initializeEnrollmentMeshService,
  getEnrollmentMeshService,
} from './enrollment-mesh.service';

// Form Builder Service (Configurable enrollment forms)
export {
  FormBuilderService,
  initializeFormBuilderService,
  getFormBuilderService,
} from './form-builder.service';

// Attendance Mesh Service (Multi-input attendance, pattern detection)
export {
  AttendanceMeshService,
  initializeAttendanceMeshService,
  getAttendanceMeshService,
} from './attendance-mesh.service';

// Assessment Mesh Service (Dual-mode engine, AI marking, peer review)
export {
  AssessmentMeshService,
  initializeAssessmentMeshService,
  getAssessmentMeshService,
} from './assessment-mesh.service';

// Gradebook Mesh Service (Standards-based grading, AI narratives, report cards)
export {
  GradebookMeshService,
  initializeGradebookMeshService,
  getGradebookMeshService,
} from './gradebook-mesh.service';

// ============================================================================
// Phase 8: Payment Service (Financial Infrastructure)
// ============================================================================

// Payment Types
export * from './payment-types';

// Profile Builder Types
export * from './profile-builder-types';

// Payment Service (Accounts, Invoices, Payments, Payouts, Refunds)
export {
  PaymentService,
  initializePaymentService,
  getPaymentService,
} from './payment.service';

// AI Profile Builder Service (Tutor Profile Creation)
export {
  AIProfileBuilderService,
  initializeAIProfileBuilderService,
  getAIProfileBuilderService,
} from './profile-builder.service';

// ============================================================================
// Phase 9: Scholarly Extensions (Early Years Curriculum & Integrations)
// ============================================================================

// Early Years Curriculum Types (EYLF, EYFS, Te Whariki, Head Start)
export * from './early-years-curriculum-types';

// Early Years Curriculum Service
export {
  EarlyYearsCurriculumService,
  initializeEarlyYearsCurriculumService,
  getEarlyYearsCurriculumService,
  type EarlyYearsFrameworkRepository,
  type LearningOutcomeRepository,
  type DevelopmentalAreaRepository,
  type CrossFrameworkMappingRepository,
  type ChildProgressRepository,
  type ObservationLinkRepository,
  type ProgressReportRepository,
} from './early-years-curriculum.service';

// Integrations Types (Canva, Google Classroom, PayPal, PayID, Outlook, Gmail, Zimbra)
export * from './integrations-types';

// Integrations Service
export {
  IntegrationsService,
  initializeIntegrationsService,
  getIntegrationsService,
  type IntegrationConnectionRepository,
  type SyncJobRepository,
} from './integrations.service';

// ============================================================================
// Phase 10: Little Explorers (Early Years Education Platform ages 3-7)
// ============================================================================

// Little Explorers Types (Core types, Behaviour, Communication, Portfolio, AI)
export * from './little-explorers-types';

// Little Explorers AI Service
export {
  LittleExplorersAIService,
  initializeLittleExplorersAIService,
  getLittleExplorersAIService,
  type LittleExplorersAIBehaviourSuggestionInput,
  type LittleExplorersAIBehaviourSuggestionOutput,
  type LittleExplorersAIStudentInsightInput,
  type LittleExplorersAIStudentInsightOutput,
  type LittleExplorersAIClassroomInsightInput,
  type LittleExplorersAIClassroomInsightOutput,
  type LittleExplorersAIMessageDraftInput,
  type LittleExplorersAIMessageDraftOutput,
  type LittleExplorersAIMessageAnalysisInput,
  type LittleExplorersAIMessageAnalysisOutput,
  type LittleExplorersAICaptionGenerationInput,
  type LittleExplorersAICaptionGenerationOutput,
  type LittleExplorersAIPortfolioAnalysisInput,
  type LittleExplorersAIPortfolioAnalysisOutput,
  type LittleExplorersAIProgressNarrativeInput,
  type LittleExplorersAIProgressNarrativeOutput,
  type LittleExplorersAIActivityFeedbackInput,
  type LittleExplorersAIActivityFeedbackOutput,
  type LittleExplorersAISafeguardingCheckInput,
  type LittleExplorersAISafeguardingCheckOutput,
  type LittleExplorersAICelebrationContentInput,
  type LittleExplorersAICelebrationContentOutput,
  type LittleExplorersAILearningRecommendationInput,
  type LittleExplorersAILearningRecommendationOutput,
} from './little-explorers-ai.service';

// Little Explorers Behaviour Service (Explorer Points System)
export {
  LittleExplorersBehaviourService,
  initializeLittleExplorersBehaviourService,
  getLittleExplorersBehaviourService,
  type LittleExplorersExplorerPointRepository,
  type LittleExplorersBehaviourSkillRepository,
  type LittleExplorersAIPointSuggestionRepository,
  type LittleExplorersCelebrationRepository,
  type LittleExplorersBehaviourStreakRepository,
  type LittleExplorersBehaviourServiceDependencies,
  type LittleExplorersParentNotification,
  type LittleExplorersAwardPointInput,
  type LittleExplorersAwardPointOutput,
  type LittleExplorersGenerateAISuggestionsInput,
} from './little-explorers-behaviour.service';

// Little Explorers Communication Service (Class Story, Messaging, Events)
export {
  LittleExplorersCommunicationService,
  initializeLittleExplorersCommunicationService,
  getLittleExplorersCommunicationService,
  type LittleExplorersStoryPostRepository,
  type LittleExplorersConversationRepository,
  type LittleExplorersMessageRepository,
  type LittleExplorersCalendarEventRepository,
  type LittleExplorersEmergencyAlertRepository,
  type LittleExplorersNotificationRepository,
  type LittleExplorersCommunicationServiceDependencies,
  type LittleExplorersCreateStoryPostInput,
  type LittleExplorersSendMessageInput,
  type LittleExplorersCreateEventInput,
  type LittleExplorersSendAlertInput,
} from './little-explorers-communication.service';

// Little Explorers Portfolio Service (Digital Portfolios, Activities, Milestones)
export {
  LittleExplorersPortfolioService,
  initializeLittleExplorersPortfolioService,
  getLittleExplorersPortfolioService,
  type LittleExplorersPortfolioItemRepository,
  type LittleExplorersActivityRepository,
  type LittleExplorersActivityResponseRepository,
  type LittleExplorersObservationRepository,
  type LittleExplorersMilestoneRepository,
  type LittleExplorersStudentMilestoneRepository,
  type LittleExplorersProgressReportRepository,
  type LittleExplorersStudentAccessRepository,
  type LittleExplorersPortfolioServiceDependencies,
  type LittleExplorersCreatePortfolioItemInput,
  type LittleExplorersCreateActivityInput,
  type LittleExplorersCreateObservationInput,
  type LittleExplorersGenerateReportInput,
} from './little-explorers-portfolio.service';
