/**
 * Scholarly Unified Communications 4.0 — Chunk E Enhancement Registry
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE EXPANSION PACK MANIFEST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each enhancement is a composable module that attaches to an existing
 * plugin. The pattern is consistent: each enhancement exports a Manager
 * class that:
 *
 *   1. Takes a PluginContext in its constructor
 *   2. Has a subscribeToEvents() method that wires into the event bus
 *   3. Has a createRouter() method that returns an Express Router
 *   4. Has a getHealth() method for diagnostics
 *
 * The parent plugin creates the enhancement manager during its own
 * initialize() lifecycle, calls subscribeToEvents(), and mounts the
 * enhancement router as a sub-router on its existing route prefix.
 *
 * Example wiring (in WebinarPlugin.initialize):
 *
 *   this.sessionModes = new SessionModeManager(ctx);
 *   this.sessionModes.subscribeToEvents();
 *   // In registerRoutes:
 *   router.use('/', this.sessionModes.createRouter());
 *
 * This keeps enhancements backward compatible — the parent plugin's
 * existing routes, events, and behaviour are completely unchanged.
 * The enhancement just adds new routes and event subscriptions alongside
 * the existing ones.
 */

// ─── Webinar Enhancement ────────────────────────────────────────────
export { SessionModeManager } from './plugins/webinar/enhancements/session-modes';
export type {
  SessionMode, SessionModeConfig, AttendanceConfig,
  AttendanceRecord, CheckpointResponse, CompletionRecord,
} from './plugins/webinar/enhancements/session-modes';

// ─── AI Transcription Enhancement ───────────────────────────────────
export {
  SelfHostedWhisperProvider,
  MeetingIntelligenceEngine,
} from './plugins/ai-transcription/enhancements/meeting-intelligence';
export type {
  SelfHostedWhisperConfig, IntelligenceConfig, IntelligenceModule,
  MeetingSummary, ActionItem, TopicChapter, KeyDecision,
  SpeakerSentiment, IntelligenceResult, TranscriptionSegment,
} from './plugins/ai-transcription/enhancements/meeting-intelligence';

// ─── Notifications Enhancement ──────────────────────────────────────
export { AudienceSegmentationManager } from './plugins/notifications/enhancements/audience-segmentation';
export type {
  AudienceSegment, SegmentDeliveryConfig, DelegateRelationship,
  RoutingRule, DigestEntry,
} from './plugins/notifications/enhancements/audience-segmentation';

// ─── Scheduling Enhancement ─────────────────────────────────────────
export { ScheduleTemplateManager } from './plugins/scheduling/enhancements/schedule-templates';
export type {
  ScheduleTemplate, PeriodDefinition, DayOverride,
  DateRange, BellConfig, ResolvedPeriod,
} from './plugins/scheduling/enhancements/schedule-templates';

// ─── Search Archive Enhancement ─────────────────────────────────────
export { DomainMetadataManager } from './plugins/search-archive/enhancements/domain-metadata';
export type {
  Taxonomy, TaxonomyCategory, ContentTag, TaggingRule,
  FacetedSearchRequest, FacetedSearchResult, FacetCount,
} from './plugins/search-archive/enhancements/domain-metadata';

// ─── Analytics Enhancement ──────────────────────────────────────────
export { AttendanceAnalyticsManager } from './plugins/analytics/enhancements/attendance-analytics';
export type {
  SessionAttendance, ParticipantAttendance, EngagementMetrics,
  AttendanceSummary, AttendanceTrend, AttendanceReport,
} from './plugins/analytics/enhancements/attendance-analytics';

// ─── Compliance Enhancement ─────────────────────────────────────────
export { ConsentGateManager } from './plugins/compliance/enhancements/consent-gates';
export type {
  ConsentGate, GateCondition, ConsentRequirement,
  ConsentRecord, EvaluationResult, ConsentAuditEntry,
} from './plugins/compliance/enhancements/consent-gates';

// ─── Contact Centre (Telephony Enhancement) ─────────────────────────
export { ContactCentreManager } from './plugins/telephony/enhancements/contact-centre';
export { ContactCentreEventBridge } from './plugins/telephony/enhancements/contact-centre-bridge';
export type {
  Agent, AgentState, AgentSkill, AgentShiftStats,
  Queue, QueueEntry, QueueEntryStatus, QueueMetrics,
  CallerInfo, CallbackRequest, OverflowAction,
  DistributionStrategy, InteractionPriority, InteractionType,
  QueueEventPayloads, QueueEventName,
} from './plugins/telephony/enhancements/contact-centre-types';

// ─── Meeting Intelligence Integration (AI Transcription Enhancement) ──
export { MeetingIntelligenceIntegration } from './plugins/ai-transcription/enhancements/meeting-intelligence-integration';
export type {
  MeetingRecord, MeetingParticipant, MeetingIntelligenceConfig,
} from './plugins/ai-transcription/enhancements/meeting-intelligence-integration';

// ─── Real-Time Translation ──────────────────────────────────────────
export { RealTimeTranslationService } from './plugins/ai-transcription/enhancements/real-time-translation';
export type {
  TranslationConfig, TranslationResult, TranslationSession,
  LanguageDetectionResult, SpeechTranslationResult,
} from './plugins/ai-transcription/enhancements/real-time-translation';

// ─── Agentic AI Foundations ─────────────────────────────────────────
export { AgenticAIEngine } from './plugins/ai-transcription/enhancements/agentic-ai';
export type {
  AgentTool, ToolResult, ExecutionPlan, PlanStep,
  AgentConversation, AgentMessage, AgenticConfig,
} from './plugins/ai-transcription/enhancements/agentic-ai';
