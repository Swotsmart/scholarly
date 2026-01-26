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
