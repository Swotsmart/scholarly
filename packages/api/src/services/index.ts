/**
 * Service Exports
 *
 * Central export point for all Scholarly services
 */

// Core Services - tutor-booking first to establish TimeSlot
export * from './tutor-booking.service';
export * from './micro-school.service';
export * from './eduscrum-orchestrator.service';

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
  type ChallengePhase,
  type ChallengeConstraints,
  type PitchConstraints,
  type GradingRubric,
  type RubricCriterion,
  type LearnerJourney,
  type JourneyPhase,
  type LearningGoalDP as DesignPitchLearningGoal,
  type ProblemStatement,
  type AIValidationStatus,
  type AIValidation,
  type ValidationIssue,
  type EvidenceItem,
  type EvidenceType,
  type UserPersona,
  type PersonaDetail,
  type VersionedArtifact,
  type ArtifactTypeDP as DesignPitchArtifactType,
  type ArtifactVersion,
  type PeerReview,
  type FeedbackPin,
  type ReviewStatus,
  type ReviewAISynthesis,
  type GrowthArea,
  type PitchDeck,
  type PitchSlide,
  type SlideType,
  type SlideElement,
  type PitchTimer,
  type PresentationSession,
  type PitchScore,
  type CriterionScore,
  type LMSGradeSync,
  type LTIConfig
} from './design-pitch-ai.service';

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
