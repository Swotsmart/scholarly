/**
 * Scholarly Extensions
 * 
 * Two production-ready extensions for the Scholarly educational platform:
 * 
 * 1. Early Years Curriculum Extension
 *    - EYLF (Early Years Learning Framework) - Australia
 *    - EYFS (Early Years Foundation Stage) - England
 *    - Observation → outcome AI linking
 *    - Child progress tracking
 *    - Progress report generation
 * 
 * 2. Integrations Service
 *    - Canva (design creation)
 *    - Google Classroom (LMS sync)
 *    - Gmail (email)
 *    - Outlook 365 (email & calendar)
 *    - PayPal (payments)
 *    - PayID (Australian instant payments)
 *    - Zimbra (enterprise email)
 * 
 * @module @scholarly/extensions
 * @version 1.0.0
 */

// Early Years Curriculum
export { EarlyYearsCurriculumService } from './curriculum/early-years-curriculum.service';
export type {
  EarlyYearsFramework,
  EarlyYearsFrameworkConfig,
  LearningOutcome,
  OutcomeSubElement,
  OutcomeIndicator,
  DevelopmentalArea,
  DevelopmentalAspect,
  DevelopmentalLevel,
  DevelopmentalDomain,
  FrameworkPrinciple,
  FrameworkPractice,
  CrossFrameworkMapping,
  ObservationFrameworkLink,
  LinkedElement,
  ChildFrameworkProgress,
  OutcomeProgress,
  AreaProgress,
  ProgressReportConfig,
  GeneratedProgressReport,
  ActivitySuggestion,
  ProgressionDescriptor,
  EYFSAgeBand,
  EarlyLearningGoal
} from './types/early-years-curriculum.types';

// Integrations
export { 
  IntegrationsService,
  type IntegrationConnectionRepository,
  type SyncJobRepository,
  type WebhookRepository,
  type RateLimitRepository,
  type IntegrationsConfig
} from './integrations/integrations.service';

export type {
  IntegrationProvider,
  ConnectionStatus,
  OAuthCredentials,
  IntegrationConnection,
  IntegrationSettings,
  IntegrationResult,
  IntegrationError,
  IntegrationWebhook,
  
  // Canva
  CanvaIntegration,
  CanvaPermission,
  CanvaDesignType,
  CanvaCreateDesignRequest,
  CanvaDesign,
  CanvaTemplateSearchRequest,
  CanvaTemplate,
  
  // Google Classroom
  GoogleClassroomIntegration,
  GoogleClassroomPermission,
  GoogleClassroomCourse,
  GoogleClassroomAssignment,
  GoogleClassroomMaterial,
  GoogleClassroomSubmission,
  GoogleClassroomSyncRequest,
  GoogleClassroomSyncResult,
  
  // Email
  EmailMessage,
  EmailAddress,
  EmailAttachment,
  SendEmailRequest,
  SendEmailResult,
  GmailIntegration,
  Outlook365Integration,
  OutlookCalendarEvent,
  ZimbraIntegration,
  
  // Payments
  PayPalIntegration,
  PayPalCapability,
  PayPalPaymentRequest,
  PayPalPayment,
  PayPalSubscription,
  PayIDIntegration,
  PayIDPaymentRequest,
  PayIDPayment,
  
  // Sync
  SyncJob,
  SyncJobResult,
  WebhookConfig,
  RateLimitConfig
} from './types/integrations.types';

// Version
export const VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  earlyYearsCurriculum: {
    eylf: true,
    eyfs: true,
    teWhariki: false,  // Planned
    headStart: false,  // Planned
  },
  integrations: {
    canva: true,
    googleClassroom: true,
    gmail: true,
    outlook365: true,
    paypal: true,
    payid: true,
    zimbra: true,
  }
};
