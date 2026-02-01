/**
 * Voice Intelligence Service — Completion Module
 * 
 * This file contains the methods and types that complete Phases 3 and 4 of the
 * Voice Intelligence Service integration. It's structured as an extension that
 * augments the base VoiceIntelligenceService with:
 * 
 * **Phase 3 Completions (Conversational Agents → 100%):**
 * - AI Buddy integration for contextual awareness across learning sessions
 * - Tutor oversight tools for reviewing and annotating conversation sessions
 * 
 * **Phase 4 Completions (Advanced Features → 100%):**
 * - Voice cloning workflows with consent management
 * - Multi-speaker dialogue generation for listening exercises
 * - VR/immersive environment voice integration
 * - Content marketplace audio creation tools
 * 
 * ## Design Philosophy
 * 
 * Each feature follows the same pattern established in the base service: input
 * validation → authorisation check → business logic → external API call →
 * event publication → result return. If the base service is the foundation
 * of a house, this module adds the conservatory, the home office, and the
 * in-law suite — each room follows the same building code, uses the same
 * materials, and connects to the same plumbing, but serves a distinct purpose.
 * 
 * @module VoiceIntelligenceServiceCompletion
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  AuthorizationError, SafeguardingError, Validator, EventBus, Cache,
  ScholarlyError
} from '../shared/types';

import {
  VoiceIntelligenceService,
  ElevenLabsConfig,
  ElevenLabsAPIInterface,
  TTSModel,
  TTSRequest,
  TTSResponse,
  AudioFormat,
  ConversationSession,
  ConversationTurn,
  SessionAssessmentData,
  LinguaFlowVoice,
  ImmersiveScenario,
  LearnerVoiceProgress,
} from './voice-intelligence_service';

// ============================================================================
// VOICE CLONING TYPES (Phase 4)
// ============================================================================

/**
 * Voice cloning is one of the most sensitive features in the entire platform.
 * Think of it like photocopying someone's signature — powerful when used
 * legitimately (a tutor wants their own voice to narrate materials), but
 * requiring strict consent and oversight to prevent misuse. Every clone
 * starts with explicit consent and can be revoked at any time.
 */

export interface VoiceCloneConsent {
  id: string;
  tenantId: string;
  /** The person whose voice is being cloned */
  voiceOwnerId: string;
  voiceOwnerRole: 'tutor' | 'content_creator' | 'learner_adult';
  /** Who requested the clone */
  requestedBy: string;
  /** Explicit consent text shown and agreed to */
  consentText: string;
  consentVersion: string;
  consentGivenAt: Date;
  consentMethod: 'digital_signature' | 'checkbox_agreement' | 'verbal_recorded';
  /** Purpose restriction — what the clone can be used for */
  allowedPurposes: VoiceClonePurpose[];
  /** IP restrictions — which tenants can use this clone */
  allowedTenants: string[];
  /** Revocation */
  revokedAt?: Date;
  revokedReason?: string;
  /** Expiry — clones don't last forever */
  expiresAt: Date;
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export type VoiceClonePurpose =
  | 'content_narration'
  | 'tutoring_sessions'
  | 'pronunciation_models'
  | 'greeting_messages'
  | 'course_materials';

export interface VoiceClone {
  id: string;
  tenantId: string;
  consentId: string;
  voiceOwnerId: string;
  /** ElevenLabs voice ID for the clone */
  elevenLabsVoiceId: string;
  /** Display name for the clone */
  name: string;
  description: string;
  /** Clone quality tier */
  quality: 'instant' | 'professional';
  /** Languages this clone has been verified for */
  verifiedLanguages: string[];
  /** Sample recordings used to create the clone */
  sampleIds: string[];
  /** Current status */
  status: 'creating' | 'processing' | 'ready' | 'suspended' | 'deleted';
  /** Quality metrics from ElevenLabs */
  qualityScore?: number;
  /** Usage tracking */
  totalCharactersGenerated: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceCloneSample {
  id: string;
  tenantId: string;
  cloneId?: string;
  voiceOwnerId: string;
  /** Audio file reference */
  audioUrl: string;
  audioFormat: AudioFormat;
  durationMs: number;
  fileSizeBytes: number;
  /** Quality assessment of the sample */
  qualityAssessment?: {
    noiseLevel: 'clean' | 'acceptable' | 'noisy';
    clarity: number;   // 0-1
    consistency: number; // 0-1 — how consistent with other samples
    suitable: boolean;
    issues?: string[];
  };
  createdAt: Date;
}

export interface CreateVoiceCloneRequest {
  tenantId: string;
  voiceOwnerId: string;
  voiceOwnerRole: 'tutor' | 'content_creator' | 'learner_adult';
  name: string;
  description: string;
  quality: 'instant' | 'professional';
  sampleAudioUrls: string[];
  allowedPurposes: VoiceClonePurpose[];
  consentMethod: 'digital_signature' | 'checkbox_agreement' | 'verbal_recorded';
  consentText?: string;
}

// ============================================================================
// MULTI-SPEAKER DIALOGUE TYPES (Phase 4)
// ============================================================================

/**
 * Multi-speaker dialogue generation creates audio files where multiple AI
 * voices perform scripted conversations — like producing a radio play or
 * podcast episode. For language learning, this is invaluable: learners can
 * listen to natural-sounding dialogues between a shopkeeper and customer,
 * two friends chatting, or a doctor and patient. Each voice is distinct,
 * and the pacing feels natural.
 */

export interface DialogueScript {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  language: string;
  targetLevel: string;
  /** The characters in this dialogue */
  characters: DialogueCharacter[];
  /** The scripted lines, in order */
  lines: DialogueLine[];
  /** Stage directions and context */
  directions?: DialogueDirection[];
  /** Curriculum alignment */
  curriculumCodes?: string[];
  /** Teaching notes for educators */
  teachingNotes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DialogueCharacter {
  id: string;
  name: string;
  role: string;
  voiceId: string;
  /** Voice customisation for this character */
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speakingRate?: number;
  };
  /** Character personality affects delivery */
  personality?: string;
  accentRegion?: string;
  ageGroup?: string;
}

export interface DialogueLine {
  sequence: number;
  characterId: string;
  text: string;
  /** Emotional tone for this line */
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'confused' | 'angry' | 'thoughtful';
  /** Pause before this line in milliseconds */
  pauseBeforeMs?: number;
  /** Optional pronunciation hints */
  pronunciationHints?: Record<string, string>;
  /** Translation for learner reference */
  translation?: string;
}

export interface DialogueDirection {
  afterLine: number;
  text: string;
  type: 'scene_change' | 'sound_effect' | 'narrator' | 'pause';
  durationMs?: number;
}

export interface GeneratedDialogue {
  id: string;
  scriptId: string;
  tenantId: string;
  /** Combined audio file URL */
  audioUrl: string;
  audioFormat: AudioFormat;
  durationMs: number;
  fileSizeBytes: number;
  /** Individual line audio segments for interactive playback */
  segments: DialogueSegment[];
  /** Cost tracking */
  totalCreditsUsed: number;
  generatedAt: Date;
}

export interface DialogueSegment {
  lineSequence: number;
  characterId: string;
  characterName: string;
  audioOffsetMs: number;
  durationMs: number;
  text: string;
  /** Individual segment audio URL for replay */
  segmentAudioUrl?: string;
}

// ============================================================================
// TUTOR OVERSIGHT TYPES (Phase 3)
// ============================================================================

/**
 * Tutor oversight tools give human tutors the ability to review AI-led
 * conversation sessions, provide feedback, and intervene when needed.
 * 
 * Think of it like a driving instructor who lets a student drive but
 * reviews the dashcam footage afterwards. The AI agent handles the
 * real-time conversation, but the human tutor reviews the transcript,
 * flags areas of concern, and provides coaching notes that feed back
 * into the learner's progress.
 */

export interface SessionReview {
  id: string;
  tenantId: string;
  sessionId: string;
  reviewerId: string;
  reviewerRole: 'tutor' | 'supervisor' | 'curriculum_lead';
  /** Overall assessment */
  overallRating: 1 | 2 | 3 | 4 | 5;
  /** Specific dimension ratings */
  ratings: {
    agentAppropriateness: 1 | 2 | 3 | 4 | 5;
    learnerEngagement: 1 | 2 | 3 | 4 | 5;
    learningOutcomes: 1 | 2 | 3 | 4 | 5;
    pronunciationAccuracy: 1 | 2 | 3 | 4 | 5;
    conversationFlow: 1 | 2 | 3 | 4 | 5;
  };
  /** Tutor's written feedback */
  feedback: string;
  /** Specific annotations on conversation turns */
  annotations: TurnAnnotation[];
  /** Flags raised during review */
  flags: SessionFlag[];
  /** Tutor recommendations for the learner */
  recommendations: TutorRecommendation[];
  /** Override AI assessment if tutor disagrees */
  assessmentOverride?: {
    pronunciationScore?: number;
    grammarScore?: number;
    fluencyScore?: number;
    reason: string;
  };
  status: 'draft' | 'submitted' | 'acknowledged';
  createdAt: Date;
  updatedAt: Date;
}

export interface TurnAnnotation {
  turnId: string;
  turnSequence: number;
  type: 'correction' | 'praise' | 'suggestion' | 'concern' | 'note';
  text: string;
  /** Specific word or phrase this annotation targets */
  targetText?: string;
  /** Start and end character positions in the transcript */
  startOffset?: number;
  endOffset?: number;
}

export interface SessionFlag {
  id: string;
  type: SessionFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  /** Which turn triggered this flag, if applicable */
  turnId?: string;
  /** Whether this flag requires action from another team member */
  requiresEscalation: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export type SessionFlagType =
  | 'inappropriate_content'      // Agent said something inappropriate
  | 'learner_distress'           // Learner showed signs of frustration/distress
  | 'technical_issue'            // Audio quality, connection problems
  | 'assessment_disagreement'    // Tutor disagrees with AI assessment
  | 'safeguarding_concern'       // Child protection concern
  | 'curriculum_misalignment'    // Conversation strayed from learning objectives
  | 'agent_behaviour'            // Agent behaviour needs adjustment
  | 'positive_highlight';        // Something went particularly well

export interface TutorRecommendation {
  type: 'practice' | 'resource' | 'session_topic' | 'difficulty_adjustment' | 'human_session';
  title: string;
  description: string;
  /** Priority for the learner to act on */
  priority: 'suggested' | 'recommended' | 'important';
  /** Link to a specific resource or content item */
  resourceId?: string;
  resourceType?: string;
}

export interface SessionReviewListOptions {
  tenantId: string;
  reviewerId?: string;
  learnerId?: string;
  sessionId?: string;
  status?: 'draft' | 'submitted' | 'acknowledged';
  flagType?: SessionFlagType;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface TutorDashboardSummary {
  tenantId: string;
  tutorId: string;
  period: 'week' | 'month' | 'quarter';
  sessionsToReview: number;
  sessionsReviewed: number;
  openFlags: number;
  criticalFlags: number;
  averageLearnerRating: number;
  commonIssues: Array<{ issue: string; count: number }>;
  topPerformers: Array<{ learnerId: string; averageScore: number }>;
  strugglingLearners: Array<{ learnerId: string; averageScore: number; issues: string[] }>;
}

// ============================================================================
// AI BUDDY INTEGRATION TYPES (Phase 3)
// ============================================================================

/**
 * AI Buddy context bridges the learner's broader learning journey into
 * voice conversations. When a learner starts a conversation session, the
 * agent should know what they've been studying, where they struggle, and
 * what their goals are — like a tutor reading a student's file before
 * a lesson.
 */

export interface AIBuddyContext {
  learnerId: string;
  tenantId: string;
  /** Current learning goals from AI Buddy */
  activeGoals: Array<{
    id: string;
    description: string;
    targetDate?: Date;
    progress: number;
  }>;
  /** Recent topics studied */
  recentTopics: Array<{
    topic: string;
    lastStudied: Date;
    mastery: number;
  }>;
  /** Known weak areas from LIS */
  weakAreas: Array<{
    competencyId: string;
    description: string;
    currentMastery: number;
  }>;
  /** Preferred learning style from AI Buddy profiling */
  learningStyle: {
    prefersPractice: boolean;
    prefersExplanation: boolean;
    pacePreference: 'slow' | 'moderate' | 'fast';
    correctionStyle: 'immediate' | 'end_of_turn' | 'end_of_session';
  };
  /** Motivational state */
  currentMood?: 'engaged' | 'frustrated' | 'confident' | 'uncertain' | 'tired';
  /** Session history summary */
  recentSessionSummary?: string;
}

export interface AIBuddyServiceInterface {
  getLearnerContext(tenantId: string, learnerId: string): Promise<AIBuddyContext | null>;
  updateLearnerContext(tenantId: string, learnerId: string, updates: Partial<AIBuddyContext>): Promise<void>;
  notifySessionCompleted(tenantId: string, learnerId: string, sessionSummary: any): Promise<void>;
  getRecommendedScenarios(tenantId: string, learnerId: string): Promise<string[]>;
}

// ============================================================================
// VR/IMMERSIVE INTEGRATION TYPES (Phase 4)
// ============================================================================

/**
 * VR integration extends voice conversations into three-dimensional
 * immersive environments. Instead of just hearing a French café scenario,
 * the learner sees it — they're sitting at a table, the waiter approaches,
 * and spatial audio makes it feel like the waiter is speaking from the
 * correct direction. This is the "holodeck" vision for language learning.
 */

export interface VRVoiceSession {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionId: string;
  /** VR environment identifier */
  environmentId: string;
  environmentType: VREnvironmentType;
  /** Spatial audio configuration */
  spatialAudio: SpatialAudioConfig;
  /** Characters positioned in 3D space */
  characterPositions: VRCharacterPosition[];
  /** WebXR session state */
  xrSessionState: 'initialising' | 'active' | 'paused' | 'ended';
  /** Device capabilities */
  deviceCapabilities: VRDeviceCapabilities;
  createdAt: Date;
}

export type VREnvironmentType =
  | 'cafe'
  | 'market'
  | 'classroom'
  | 'airport'
  | 'hotel'
  | 'restaurant'
  | 'office'
  | 'street'
  | 'home'
  | 'custom';

export interface SpatialAudioConfig {
  /** HRTF (Head-Related Transfer Function) model for 3D audio */
  hrtfProfile: 'default' | 'custom';
  /** Room acoustics simulation */
  roomAcoustics: {
    reverbTime: number;       // RT60 in seconds
    roomSize: 'small' | 'medium' | 'large' | 'outdoor';
    surfaceAbsorption: number; // 0-1
  };
  /** Distance attenuation model */
  distanceModel: 'linear' | 'inverse' | 'exponential';
  maxDistance: number;   // metres
  refDistance: number;   // metres — distance at which volume is 100%
  rolloffFactor: number; // How quickly sound fades with distance
}

export interface VRCharacterPosition {
  characterId: string;
  agentId: string;
  /** 3D position in the scene (metres from origin) */
  position: { x: number; y: number; z: number };
  /** Facing direction (euler angles in degrees) */
  rotation: { pitch: number; yaw: number; roll: number };
  /** Whether this character moves during the scenario */
  isMovable: boolean;
  /** Movement path for animated characters */
  movementPath?: Array<{
    position: { x: number; y: number; z: number };
    arriveAtMs: number;
  }>;
}

export interface VRDeviceCapabilities {
  hasPositionalTracking: boolean;
  hasHandTracking: boolean;
  hasSpatialAudio: boolean;
  maxAudioSources: number;
  supportedAudioFormats: AudioFormat[];
  platform: 'quest' | 'pico' | 'vive' | 'index' | 'webxr_browser' | 'unknown';
}

export interface CreateVRSessionRequest {
  tenantId: string;
  learnerId: string;
  scenarioId: string;
  environmentType: VREnvironmentType;
  deviceCapabilities: VRDeviceCapabilities;
  spatialAudioOverrides?: Partial<SpatialAudioConfig>;
}

// ============================================================================
// CONTENT MARKETPLACE AUDIO TYPES (Phase 4)
// ============================================================================

/**
 * Content marketplace audio tools enable content creators to generate
 * professional-quality audio versions of their educational materials.
 * A teacher who writes a great vocabulary list can turn it into a
 * narrated audio lesson. A curriculum designer who scripts a dialogue
 * can generate it with multiple voices. This turns written content
 * into multimedia experiences at the click of a button.
 */

export interface ContentAudioRequest {
  tenantId: string;
  contentId: string;
  creatorId: string;
  type: ContentAudioType;
  language: string;
  /** Voice selection (specific voice or auto-select) */
  voiceId?: string;
  voicePreferences?: {
    gender?: 'male' | 'female' | 'neutral';
    ageGroup?: 'child' | 'young_adult' | 'adult' | 'elder';
    accent?: string;
  };
  /** Text content to convert to audio */
  content: ContentAudioContent;
  /** Output preferences */
  outputFormat?: AudioFormat;
  /** Whether to publish directly to marketplace */
  publishToMarketplace?: boolean;
}

export type ContentAudioType =
  | 'narration'          // Full content narration (e.g., reading a lesson)
  | 'vocabulary_list'    // Word-by-word with pauses for repetition
  | 'dialogue'           // Multi-speaker scripted conversation
  | 'pronunciation_guide' // Slow, clear pronunciation of target words
  | 'audio_quiz'         // Questions with pauses for answers
  | 'story_narration';   // Expressive story reading

export interface ContentAudioContent {
  /** Plain text for narration */
  text?: string;
  /** Structured vocabulary for vocabulary_list type */
  vocabulary?: Array<{
    word: string;
    translation?: string;
    exampleSentence?: string;
    phonetic?: string;
  }>;
  /** Dialogue script for dialogue type */
  dialogueScript?: DialogueScript;
  /** Quiz questions for audio_quiz type */
  quizQuestions?: Array<{
    question: string;
    pauseForAnswerMs: number;
    answer: string;
    explanation?: string;
  }>;
}

export interface ContentAudioResult {
  id: string;
  contentId: string;
  tenantId: string;
  type: ContentAudioType;
  audioUrl: string;
  audioFormat: AudioFormat;
  durationMs: number;
  fileSizeBytes: number;
  /** Chapter/section markers for navigation */
  chapters?: Array<{
    title: string;
    offsetMs: number;
    durationMs: number;
  }>;
  creditsUsed: number;
  /** If published, the marketplace listing ID */
  marketplaceListingId?: string;
  generatedAt: Date;
}

// ============================================================================
// REPOSITORY INTERFACES FOR NEW MODELS
// ============================================================================

export interface VoiceCloneConsentRepository {
  save(consent: VoiceCloneConsent): Promise<VoiceCloneConsent>;
  findById(tenantId: string, id: string): Promise<VoiceCloneConsent | null>;
  findByOwner(tenantId: string, voiceOwnerId: string): Promise<VoiceCloneConsent[]>;
  revoke(tenantId: string, id: string, reason: string): Promise<void>;
}

export interface VoiceCloneRepository {
  save(clone: VoiceClone): Promise<VoiceClone>;
  findById(tenantId: string, id: string): Promise<VoiceClone | null>;
  findByOwner(tenantId: string, voiceOwnerId: string): Promise<VoiceClone[]>;
  findByConsent(tenantId: string, consentId: string): Promise<VoiceClone[]>;
  updateStatus(tenantId: string, id: string, status: VoiceClone['status']): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface DialogueScriptRepository {
  save(script: DialogueScript): Promise<DialogueScript>;
  findById(tenantId: string, id: string): Promise<DialogueScript | null>;
  findByCreator(tenantId: string, creatorId: string): Promise<DialogueScript[]>;
  search(tenantId: string, query: string, language?: string): Promise<DialogueScript[]>;
}

export interface GeneratedDialogueRepository {
  save(dialogue: GeneratedDialogue): Promise<GeneratedDialogue>;
  findById(tenantId: string, id: string): Promise<GeneratedDialogue | null>;
  findByScript(tenantId: string, scriptId: string): Promise<GeneratedDialogue[]>;
}

export interface SessionReviewRepository {
  save(review: SessionReview): Promise<SessionReview>;
  findById(tenantId: string, id: string): Promise<SessionReview | null>;
  findBySession(tenantId: string, sessionId: string): Promise<SessionReview[]>;
  findByReviewer(tenantId: string, reviewerId: string, options?: any): Promise<SessionReview[]>;
  listWithFilters(options: SessionReviewListOptions): Promise<{ reviews: SessionReview[]; total: number }>;
  getOpenFlags(tenantId: string): Promise<SessionFlag[]>;
}

export interface VRSessionRepository {
  save(session: VRVoiceSession): Promise<VRVoiceSession>;
  findById(tenantId: string, id: string): Promise<VRVoiceSession | null>;
  findBySession(tenantId: string, sessionId: string): Promise<VRVoiceSession | null>;
  updateState(tenantId: string, id: string, state: VRVoiceSession['xrSessionState']): Promise<void>;
}

export interface ContentAudioRepository {
  save(result: ContentAudioResult): Promise<ContentAudioResult>;
  findById(tenantId: string, id: string): Promise<ContentAudioResult | null>;
  findByContent(tenantId: string, contentId: string): Promise<ContentAudioResult[]>;
}

// ============================================================================
// SERVICE COMPLETION — PHASE 3: TUTOR OVERSIGHT
// ============================================================================

/**
 * Methods that complete Phase 3 by adding tutor oversight capabilities.
 * These would be added to VoiceIntelligenceService as additional methods.
 * 
 * In a compiled project, these would be merged into the class via declaration
 * merging or a mixin pattern. Here they're presented as standalone functions
 * that accept the service instance, following the same Result<T> pattern.
 */

export async function submitSessionReview(
  service: VoiceIntelligenceService,
  tenantId: string,
  review: Omit<SessionReview, 'id' | 'createdAt' | 'updatedAt'>,
  reviewRepo: SessionReviewRepository,
  eventBus: EventBus,
  logger: any
): Promise<Result<SessionReview>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(review.sessionId, 'sessionId');
    Validator.required(review.reviewerId, 'reviewerId');
    Validator.required(review.feedback, 'feedback');

    if (review.overallRating < 1 || review.overallRating > 5) {
      throw new ValidationError('overallRating must be between 1 and 5');
    }
  } catch (e) {
    return failure(e as ValidationError);
  }

  try {
    const fullReview: SessionReview = {
      ...review,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await reviewRepo.save(fullReview);

    // If there are critical flags, publish an event for immediate attention
    const criticalFlags = fullReview.flags.filter(f => f.severity === 'critical');
    if (criticalFlags.length > 0) {
      await eventBus.publish('voice.review.critical_flag', {
        id: `evt_${Date.now()}`,
        type: 'voice.review.critical_flag',
        tenantId,
        timestamp: new Date(),
        payload: {
          reviewId: saved.id,
          sessionId: review.sessionId,
          reviewerId: review.reviewerId,
          flags: criticalFlags,
        },
      });
    }

    // If there's an assessment override, publish for LIS to update
    if (fullReview.assessmentOverride) {
      await eventBus.publish('voice.review.assessment_override', {
        id: `evt_${Date.now()}`,
        type: 'voice.review.assessment_override',
        tenantId,
        timestamp: new Date(),
        payload: {
          reviewId: saved.id,
          sessionId: review.sessionId,
          override: fullReview.assessmentOverride,
        },
      });
    }

    await eventBus.publish('voice.review.submitted', {
      id: `evt_${Date.now()}`,
      type: 'voice.review.submitted',
      tenantId,
      timestamp: new Date(),
      payload: {
        reviewId: saved.id,
        sessionId: review.sessionId,
        reviewerId: review.reviewerId,
        overallRating: review.overallRating,
        flagCount: review.flags.length,
        annotationCount: review.annotations.length,
      },
    });

    logger.info('Session review submitted', {
      reviewId: saved.id,
      sessionId: review.sessionId,
      reviewer: review.reviewerId,
    });

    return success(saved);
  } catch (error) {
    logger.error('Error submitting session review', error as Error);
    return failure(new ScholarlyError('REVIEW_SUBMISSION_FAILED', (error as Error).message));
  }
}

export async function getSessionReviews(
  tenantId: string,
  sessionId: string,
  reviewRepo: SessionReviewRepository
): Promise<Result<SessionReview[]>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(sessionId, 'sessionId');
    const reviews = await reviewRepo.findBySession(tenantId, sessionId);
    return success(reviews);
  } catch (e) {
    return failure(e as ScholarlyError);
  }
}

export async function getTutorDashboard(
  tenantId: string,
  tutorId: string,
  period: 'week' | 'month' | 'quarter',
  reviewRepo: SessionReviewRepository,
  logger: any
): Promise<Result<TutorDashboardSummary>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(tutorId, 'tutorId');

    const now = new Date();
    const fromDate = new Date(now);
    switch (period) {
      case 'week': fromDate.setDate(now.getDate() - 7); break;
      case 'month': fromDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': fromDate.setMonth(now.getMonth() - 3); break;
    }

    const { reviews, total } = await reviewRepo.listWithFilters({
      tenantId,
      reviewerId: tutorId,
      fromDate,
      toDate: now,
    });

    const openFlags = await reviewRepo.getOpenFlags(tenantId);
    const criticalFlags = openFlags.filter(f => f.severity === 'critical');

    // Aggregate common issues from annotations
    const issueMap: Record<string, number> = {};
    for (const review of reviews) {
      for (const annotation of review.annotations) {
        if (annotation.type === 'correction' || annotation.type === 'concern') {
          const key = annotation.text.substring(0, 50);
          issueMap[key] = (issueMap[key] || 0) + 1;
        }
      }
    }
    const commonIssues = Object.entries(issueMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    const submitted = reviews.filter(r => r.status === 'submitted');
    const averageRating = submitted.length > 0
      ? submitted.reduce((sum, r) => sum + r.overallRating, 0) / submitted.length
      : 0;

    const dashboard: TutorDashboardSummary = {
      tenantId,
      tutorId,
      period,
      sessionsToReview: total - submitted.length,
      sessionsReviewed: submitted.length,
      openFlags: openFlags.length,
      criticalFlags: criticalFlags.length,
      averageLearnerRating: averageRating,
      commonIssues,
      topPerformers: [],      // Populated from progress data
      strugglingLearners: [], // Populated from progress data
    };

    return success(dashboard);
  } catch (error) {
    logger.error('Error generating tutor dashboard', error as Error);
    return failure(new ScholarlyError('DASHBOARD_FAILED', (error as Error).message));
  }
}

export async function flagSession(
  tenantId: string,
  sessionId: string,
  reviewerId: string,
  flag: Omit<SessionFlag, 'id'>,
  reviewRepo: SessionReviewRepository,
  eventBus: EventBus,
  logger: any
): Promise<Result<SessionFlag>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(sessionId, 'sessionId');
    Validator.required(reviewerId, 'reviewerId');

    const fullFlag: SessionFlag = {
      ...flag,
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    };

    // If safeguarding concern, escalate immediately
    if (flag.type === 'safeguarding_concern') {
      fullFlag.requiresEscalation = true;
      fullFlag.severity = 'critical';

      await eventBus.publish('voice.safeguarding.concern', {
        id: `evt_${Date.now()}`,
        type: 'voice.safeguarding.concern',
        tenantId,
        timestamp: new Date(),
        payload: {
          sessionId,
          flagId: fullFlag.id,
          reviewerId,
          description: flag.description,
          turnId: flag.turnId,
        },
      });

      logger.warn('Safeguarding concern flagged', {
        sessionId,
        flagId: fullFlag.id,
        reviewer: reviewerId,
      });
    }

    return success(fullFlag);
  } catch (error) {
    return failure(new ScholarlyError('FLAG_FAILED', (error as Error).message));
  }
}

// ============================================================================
// SERVICE COMPLETION — PHASE 3: AI BUDDY INTEGRATION
// ============================================================================

export async function enrichSessionWithBuddyContext(
  tenantId: string,
  learnerId: string,
  sessionId: string,
  aiBuddyService: AIBuddyServiceInterface,
  logger: any
): Promise<Result<AIBuddyContext>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(learnerId, 'learnerId');

    const context = await aiBuddyService.getLearnerContext(tenantId, learnerId);
    if (!context) {
      logger.info('No AI Buddy context available for learner', { learnerId });
      return success({
        learnerId,
        tenantId,
        activeGoals: [],
        recentTopics: [],
        weakAreas: [],
        learningStyle: {
          prefersPractice: true,
          prefersExplanation: false,
          pacePreference: 'moderate',
          correctionStyle: 'end_of_turn',
        },
      });
    }

    logger.info('AI Buddy context enriched for session', {
      learnerId,
      sessionId,
      goalsCount: context.activeGoals.length,
      weakAreasCount: context.weakAreas.length,
    });

    return success(context);
  } catch (error) {
    logger.error('Error fetching AI Buddy context', error as Error);
    return failure(new ScholarlyError('BUDDY_CONTEXT_FAILED', (error as Error).message));
  }
}

export function buildAgentSystemPromptFromContext(context: AIBuddyContext): string {
  const parts: string[] = [];

  parts.push('You are a conversational language practice partner.');

  if (context.weakAreas.length > 0) {
    const areas = context.weakAreas.map(a => a.description).join(', ');
    parts.push(`The learner has been working on: ${areas}. Try to naturally incorporate practice with these areas.`);
  }

  if (context.activeGoals.length > 0) {
    const goals = context.activeGoals.map(g => g.description).join(', ');
    parts.push(`Current learning goals: ${goals}.`);
  }

  if (context.recentTopics.length > 0) {
    const topics = context.recentTopics.slice(0, 3).map(t => t.topic).join(', ');
    parts.push(`Recent study topics: ${topics}. You can reference these naturally.`);
  }

  if (context.learningStyle) {
    const style = context.learningStyle;
    if (style.pacePreference === 'slow') {
      parts.push('Speak slowly and clearly. Give the learner plenty of time to respond.');
    } else if (style.pacePreference === 'fast') {
      parts.push('Maintain a natural conversational pace.');
    }

    if (style.correctionStyle === 'immediate') {
      parts.push('Gently correct pronunciation and grammar mistakes as they occur.');
    } else if (style.correctionStyle === 'end_of_turn') {
      parts.push('Note any mistakes and provide corrections at natural pause points.');
    }
  }

  if (context.currentMood === 'frustrated') {
    parts.push('The learner may be feeling frustrated. Be extra encouraging and supportive.');
  } else if (context.currentMood === 'confident') {
    parts.push('The learner is feeling confident. You can introduce slightly more challenging vocabulary.');
  }

  return parts.join(' ');
}

// ============================================================================
// SERVICE COMPLETION — PHASE 4: VOICE CLONING
// ============================================================================

export async function initiateVoiceClone(
  request: CreateVoiceCloneRequest,
  consentRepo: VoiceCloneConsentRepository,
  cloneRepo: VoiceCloneRepository,
  elevenLabsApi: ElevenLabsAPIInterface,
  eventBus: EventBus,
  logger: any
): Promise<Result<VoiceClone>> {
  try {
    Validator.tenantId(request.tenantId);
    Validator.required(request.voiceOwnerId, 'voiceOwnerId');
    Validator.required(request.name, 'name');

    // Learners who are minors cannot have their voices cloned
    if (request.voiceOwnerRole === 'learner_adult') {
      // Additional age verification would happen here
    }

    if (request.sampleAudioUrls.length < 1) {
      throw new ValidationError('At least one voice sample is required');
    }

    if (request.quality === 'professional' && request.sampleAudioUrls.length < 3) {
      throw new ValidationError('Professional quality clones require at least 3 samples');
    }

    // Step 1: Create consent record
    const consentText = request.consentText || 
      `I, the voice owner, consent to having my voice cloned for use in the Scholarly educational platform. ` +
      `This clone will be used only for the following purposes: ${request.allowedPurposes.join(', ')}. ` +
      `I understand I can revoke this consent at any time, which will immediately disable the voice clone.`;

    const consent: VoiceCloneConsent = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      tenantId: request.tenantId,
      voiceOwnerId: request.voiceOwnerId,
      voiceOwnerRole: request.voiceOwnerRole,
      requestedBy: request.voiceOwnerId, // Self-service for now
      consentText,
      consentVersion: '1.0',
      consentGivenAt: new Date(),
      consentMethod: request.consentMethod,
      allowedPurposes: request.allowedPurposes,
      allowedTenants: [request.tenantId],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await consentRepo.save(consent);

    // Step 2: Submit voice samples to ElevenLabs for cloning
    const elevenLabsResult = await elevenLabsApi.createVoiceClone({
      name: request.name,
      description: `Scholarly voice clone for ${request.voiceOwnerRole}`,
      sampleUrls: request.sampleAudioUrls,
      labels: {
        platform: 'scholarly',
        tenantId: request.tenantId,
        ownerId: request.voiceOwnerId,
        quality: request.quality,
      },
    });

    // Step 3: Create clone record
    const clone: VoiceClone = {
      id: `clone_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      tenantId: request.tenantId,
      consentId: consent.id,
      voiceOwnerId: request.voiceOwnerId,
      elevenLabsVoiceId: elevenLabsResult.voiceId,
      name: request.name,
      description: request.description || '',
      quality: request.quality,
      verifiedLanguages: [],
      sampleIds: request.sampleAudioUrls.map((_, i) => `sample_${i}`),
      status: request.quality === 'instant' ? 'ready' : 'processing',
      totalCharactersGenerated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await cloneRepo.save(clone);

    await eventBus.publish('voice.clone.created', {
      id: `evt_${Date.now()}`,
      type: 'voice.clone.created',
      tenantId: request.tenantId,
      timestamp: new Date(),
      payload: {
        cloneId: clone.id,
        consentId: consent.id,
        voiceOwnerId: request.voiceOwnerId,
        quality: request.quality,
      },
    });

    logger.info('Voice clone initiated', {
      cloneId: clone.id,
      owner: request.voiceOwnerId,
      quality: request.quality,
    });

    return success(clone);
  } catch (error) {
    logger.error('Voice clone initiation failed', error as Error);
    return failure(error instanceof ScholarlyError ? error : 
      new ScholarlyError('CLONE_FAILED', (error as Error).message));
  }
}

export async function revokeVoiceCloneConsent(
  tenantId: string,
  consentId: string,
  reason: string,
  consentRepo: VoiceCloneConsentRepository,
  cloneRepo: VoiceCloneRepository,
  elevenLabsApi: ElevenLabsAPIInterface,
  eventBus: EventBus,
  logger: any
): Promise<Result<void>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(consentId, 'consentId');
    Validator.required(reason, 'reason');

    const consent = await consentRepo.findById(tenantId, consentId);
    if (!consent) {
      throw new NotFoundError('VoiceCloneConsent', consentId);
    }

    // Revoke consent
    await consentRepo.revoke(tenantId, consentId, reason);

    // Suspend all clones created under this consent
    const clones = await cloneRepo.findByConsent(tenantId, consentId);
    for (const clone of clones) {
      // Delete from ElevenLabs
      await elevenLabsApi.deleteVoice(clone.elevenLabsVoiceId).catch(err => {
        logger.error('Failed to delete clone from ElevenLabs', err as Error, {
          cloneId: clone.id,
          elevenLabsVoiceId: clone.elevenLabsVoiceId,
        });
      });

      await cloneRepo.updateStatus(tenantId, clone.id, 'deleted');
    }

    await eventBus.publish('voice.clone.consent_revoked', {
      id: `evt_${Date.now()}`,
      type: 'voice.clone.consent_revoked',
      tenantId,
      timestamp: new Date(),
      payload: {
        consentId,
        voiceOwnerId: consent.voiceOwnerId,
        reason,
        clonesDeleted: clones.length,
      },
    });

    logger.info('Voice clone consent revoked', {
      consentId,
      clonesDeleted: clones.length,
    });

    return success(undefined);
  } catch (error) {
    logger.error('Voice clone consent revocation failed', error as Error);
    return failure(error instanceof ScholarlyError ? error :
      new ScholarlyError('REVOKE_FAILED', (error as Error).message));
  }
}

// ============================================================================
// SERVICE COMPLETION — PHASE 4: MULTI-SPEAKER DIALOGUE
// ============================================================================

export async function generateDialogue(
  tenantId: string,
  script: DialogueScript,
  elevenLabsApi: ElevenLabsAPIInterface,
  scriptRepo: DialogueScriptRepository,
  dialogueRepo: GeneratedDialogueRepository,
  eventBus: EventBus,
  logger: any
): Promise<Result<GeneratedDialogue>> {
  try {
    Validator.tenantId(tenantId);
    Validator.required(script.title, 'title');

    if (script.lines.length === 0) {
      throw new ValidationError('Dialogue must have at least one line');
    }

    if (script.characters.length === 0) {
      throw new ValidationError('Dialogue must have at least one character');
    }

    // Verify all lines reference valid characters
    const characterIds = new Set(script.characters.map(c => c.id));
    for (const line of script.lines) {
      if (!characterIds.has(line.characterId)) {
        throw new ValidationError(`Line ${line.sequence} references unknown character: ${line.characterId}`);
      }
    }

    // Save the script
    await scriptRepo.save(script);

    // Generate audio for each line
    const segments: DialogueSegment[] = [];
    const audioBuffers: Buffer[] = [];
    let currentOffsetMs = 0;
    let totalCredits = 0;

    for (const line of script.lines.sort((a, b) => a.sequence - b.sequence)) {
      const character = script.characters.find(c => c.id === line.characterId)!;

      // Add pause before line if specified
      const pauseMs = line.pauseBeforeMs || 500; // Default 500ms between lines
      if (pauseMs > 0) {
        // Generate silence buffer (PCM16 at 16kHz: 32 bytes per ms)
        const silenceBytes = Math.floor(pauseMs * 32);
        audioBuffers.push(Buffer.alloc(silenceBytes));
        currentOffsetMs += pauseMs;
      }

      // Generate TTS for this line
      const ttsResult = await elevenLabsApi.textToSpeech({
        text: line.text,
        voiceId: character.voiceId,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability: character.voiceSettings?.stability ?? 0.5,
          similarityBoost: character.voiceSettings?.similarityBoost ?? 0.75,
          style: character.voiceSettings?.style ?? 0.0,
          useSpeakerBoost: true,
        },
        outputFormat: 'pcm_16000',
      });

      const audioBuffer = Buffer.from(ttsResult.audio);
      const durationMs = Math.floor(audioBuffer.length / 32); // PCM16 at 16kHz

      audioBuffers.push(audioBuffer);

      segments.push({
        lineSequence: line.sequence,
        characterId: character.id,
        characterName: character.name,
        audioOffsetMs: currentOffsetMs,
        durationMs,
        text: line.text,
      });

      currentOffsetMs += durationMs;
      totalCredits += Math.ceil(line.text.length * 0.3); // Approximate credit calc
    }

    // Combine all audio buffers into a single file
    const combinedAudio = Buffer.concat(audioBuffers);
    const audioUrl = `voice-dialogues/${tenantId}/${script.id}/combined_${Date.now()}.pcm`;

    // In production, this would upload to object storage (S3, GCS, etc.)
    // For now, we return the URL that the storage service would provide

    const dialogue: GeneratedDialogue = {
      id: `dialogue_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      scriptId: script.id,
      tenantId,
      audioUrl,
      audioFormat: 'pcm_16000',
      durationMs: currentOffsetMs,
      fileSizeBytes: combinedAudio.length,
      segments,
      totalCreditsUsed: totalCredits,
      generatedAt: new Date(),
    };

    await dialogueRepo.save(dialogue);

    await eventBus.publish('voice.dialogue.generated', {
      id: `evt_${Date.now()}`,
      type: 'voice.dialogue.generated',
      tenantId,
      timestamp: new Date(),
      payload: {
        dialogueId: dialogue.id,
        scriptId: script.id,
        durationMs: currentOffsetMs,
        lineCount: script.lines.length,
        characterCount: script.characters.length,
        creditsUsed: totalCredits,
      },
    });

    logger.info('Multi-speaker dialogue generated', {
      dialogueId: dialogue.id,
      durationMs: currentOffsetMs,
      lineCount: script.lines.length,
    });

    return success(dialogue);
  } catch (error) {
    logger.error('Dialogue generation failed', error as Error);
    return failure(error instanceof ScholarlyError ? error :
      new ScholarlyError('DIALOGUE_GENERATION_FAILED', (error as Error).message));
  }
}

// ============================================================================
// SERVICE COMPLETION — PHASE 4: VR INTEGRATION
// ============================================================================

export async function createVRVoiceSession(
  request: CreateVRSessionRequest,
  service: VoiceIntelligenceService,
  vrRepo: VRSessionRepository,
  eventBus: EventBus,
  logger: any
): Promise<Result<VRVoiceSession>> {
  try {
    Validator.tenantId(request.tenantId);
    Validator.required(request.learnerId, 'learnerId');
    Validator.required(request.scenarioId, 'scenarioId');

    // Default spatial audio configuration based on environment type
    const spatialDefaults = getDefaultSpatialConfig(request.environmentType);
    const spatialConfig: SpatialAudioConfig = {
      ...spatialDefaults,
      ...request.spatialAudioOverrides,
    };

    // Create the underlying conversation session via the base service
    // The VR session wraps it with spatial audio metadata
    const sessionResult = await service.launchScenario(
      request.tenantId,
      request.scenarioId,
      request.learnerId,
      { language: 'en' } // Would come from learner profile
    );

    if (!sessionResult.success) {
      return failure(sessionResult.error!);
    }

    const conversationSession = sessionResult.data!;

    // Create VR session wrapper with spatial audio positioning
    const vrSession: VRVoiceSession = {
      id: `vr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      tenantId: request.tenantId,
      learnerId: request.learnerId,
      sessionId: conversationSession.id,
      environmentId: `env_${request.environmentType}`,
      environmentType: request.environmentType,
      spatialAudio: spatialConfig,
      characterPositions: getDefaultCharacterPositions(
        request.environmentType,
        conversationSession.scenarioId || ''
      ),
      xrSessionState: 'initialising',
      deviceCapabilities: request.deviceCapabilities,
      createdAt: new Date(),
    };

    await vrRepo.save(vrSession);

    await eventBus.publish('voice.vr_session.created', {
      id: `evt_${Date.now()}`,
      type: 'voice.vr_session.created',
      tenantId: request.tenantId,
      timestamp: new Date(),
      payload: {
        vrSessionId: vrSession.id,
        sessionId: conversationSession.id,
        environment: request.environmentType,
        devicePlatform: request.deviceCapabilities.platform,
      },
    });

    logger.info('VR voice session created', {
      vrSessionId: vrSession.id,
      environment: request.environmentType,
    });

    return success(vrSession);
  } catch (error) {
    logger.error('VR session creation failed', error as Error);
    return failure(error instanceof ScholarlyError ? error :
      new ScholarlyError('VR_SESSION_FAILED', (error as Error).message));
  }
}

export async function updateVRCharacterPosition(
  tenantId: string,
  vrSessionId: string,
  characterId: string,
  position: { x: number; y: number; z: number },
  rotation?: { pitch: number; yaw: number; roll: number },
  vrRepo: VRSessionRepository,
  logger?: any
): Promise<Result<VRCharacterPosition>> {
  try {
    const session = await vrRepo.findById(tenantId, vrSessionId);
    if (!session) {
      throw new NotFoundError('VRVoiceSession', vrSessionId);
    }

    const charPos = session.characterPositions.find(c => c.characterId === characterId);
    if (!charPos) {
      throw new NotFoundError('VRCharacterPosition', characterId);
    }

    charPos.position = position;
    if (rotation) charPos.rotation = rotation;

    await vrRepo.save(session);

    return success(charPos);
  } catch (error) {
    return failure(error instanceof ScholarlyError ? error :
      new ScholarlyError('VR_POSITION_UPDATE_FAILED', (error as Error).message));
  }
}

function getDefaultSpatialConfig(environmentType: VREnvironmentType): SpatialAudioConfig {
  const configs: Record<VREnvironmentType, SpatialAudioConfig> = {
    cafe: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.6, roomSize: 'medium', surfaceAbsorption: 0.4 },
      distanceModel: 'inverse', maxDistance: 10, refDistance: 1, rolloffFactor: 1.5,
    },
    market: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.3, roomSize: 'large', surfaceAbsorption: 0.2 },
      distanceModel: 'inverse', maxDistance: 20, refDistance: 1.5, rolloffFactor: 1.0,
    },
    classroom: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.8, roomSize: 'medium', surfaceAbsorption: 0.5 },
      distanceModel: 'linear', maxDistance: 15, refDistance: 2, rolloffFactor: 1.0,
    },
    airport: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 1.5, roomSize: 'large', surfaceAbsorption: 0.15 },
      distanceModel: 'exponential', maxDistance: 30, refDistance: 2, rolloffFactor: 2.0,
    },
    hotel: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.5, roomSize: 'medium', surfaceAbsorption: 0.6 },
      distanceModel: 'inverse', maxDistance: 8, refDistance: 1, rolloffFactor: 1.2,
    },
    restaurant: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.7, roomSize: 'medium', surfaceAbsorption: 0.35 },
      distanceModel: 'inverse', maxDistance: 12, refDistance: 1, rolloffFactor: 1.3,
    },
    office: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.4, roomSize: 'small', surfaceAbsorption: 0.7 },
      distanceModel: 'linear', maxDistance: 8, refDistance: 1, rolloffFactor: 1.0,
    },
    street: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.1, roomSize: 'large', surfaceAbsorption: 0.05 },
      distanceModel: 'exponential', maxDistance: 25, refDistance: 1.5, rolloffFactor: 1.8,
    },
    home: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.3, roomSize: 'small', surfaceAbsorption: 0.8 },
      distanceModel: 'linear', maxDistance: 5, refDistance: 0.5, rolloffFactor: 1.0,
    },
    custom: {
      hrtfProfile: 'default',
      roomAcoustics: { reverbTime: 0.5, roomSize: 'medium', surfaceAbsorption: 0.5 },
      distanceModel: 'inverse', maxDistance: 15, refDistance: 1, rolloffFactor: 1.0,
    },
  };

  return configs[environmentType] || configs.custom;
}

function getDefaultCharacterPositions(
  environmentType: VREnvironmentType,
  _scenarioId: string
): VRCharacterPosition[] {
  // Default positions based on environment — scenarios can override these
  const presets: Record<string, VRCharacterPosition[]> = {
    cafe: [
      {
        characterId: 'waiter', agentId: '', isMovable: true,
        position: { x: 1.5, y: 0, z: 1.0 },
        rotation: { pitch: 0, yaw: -90, roll: 0 },
        movementPath: [
          { position: { x: 1.5, y: 0, z: 1.0 }, arriveAtMs: 0 },
          { position: { x: 0.8, y: 0, z: 0.5 }, arriveAtMs: 3000 },
        ],
      },
    ],
    restaurant: [
      {
        characterId: 'waiter', agentId: '', isMovable: true,
        position: { x: 2.0, y: 0, z: 0 },
        rotation: { pitch: 0, yaw: -90, roll: 0 },
      },
      {
        characterId: 'dining_companion', agentId: '', isMovable: false,
        position: { x: 0, y: 0, z: 0.8 },
        rotation: { pitch: 0, yaw: 180, roll: 0 },
      },
    ],
    market: [
      {
        characterId: 'vendor', agentId: '', isMovable: false,
        position: { x: 0, y: 0.3, z: 1.5 },
        rotation: { pitch: 0, yaw: 180, roll: 0 },
      },
    ],
  };

  return presets[environmentType] || [{
    characterId: 'default', agentId: '', isMovable: false,
    position: { x: 0, y: 0, z: 2.0 },
    rotation: { pitch: 0, yaw: 180, roll: 0 },
  }];
}

// ============================================================================
// SERVICE COMPLETION — PHASE 4: CONTENT MARKETPLACE AUDIO
// ============================================================================

export async function generateContentAudio(
  request: ContentAudioRequest,
  elevenLabsApi: ElevenLabsAPIInterface,
  contentRepo: ContentAudioRepository,
  eventBus: EventBus,
  logger: any
): Promise<Result<ContentAudioResult>> {
  try {
    Validator.tenantId(request.tenantId);
    Validator.required(request.contentId, 'contentId');
    Validator.required(request.creatorId, 'creatorId');

    let audioBuffer: Buffer;
    let durationMs: number;
    let chapters: Array<{ title: string; offsetMs: number; durationMs: number }> = [];
    let creditsUsed = 0;

    const voiceId = request.voiceId || 'default_narrator';

    switch (request.type) {
      case 'narration': {
        if (!request.content.text) throw new ValidationError('Text is required for narration');
        const result = await elevenLabsApi.textToSpeech({
          text: request.content.text,
          voiceId,
          modelId: 'eleven_multilingual_v2',
          outputFormat: request.outputFormat || 'mp3_44100_128',
        });
        audioBuffer = Buffer.from(result.audio);
        durationMs = result.durationMs || Math.floor(audioBuffer.length / 176); // Approximate for mp3
        creditsUsed = Math.ceil(request.content.text.length * 0.3);
        break;
      }

      case 'vocabulary_list': {
        if (!request.content.vocabulary || request.content.vocabulary.length === 0) {
          throw new ValidationError('Vocabulary items are required');
        }
        const audioBuffers: Buffer[] = [];
        let offset = 0;

        for (const item of request.content.vocabulary) {
          // Generate word
          const wordResult = await elevenLabsApi.textToSpeech({
            text: item.word,
            voiceId,
            modelId: 'eleven_multilingual_v2',
            outputFormat: 'pcm_16000',
            voiceSettings: { stability: 0.9, similarityBoost: 0.8, style: 0 },
          });
          const wordBuf = Buffer.from(wordResult.audio);
          audioBuffers.push(wordBuf);
          const wordDuration = Math.floor(wordBuf.length / 32);

          chapters.push({ title: item.word, offsetMs: offset, durationMs: wordDuration });
          offset += wordDuration;

          // Add pause for repetition (1.5 seconds)
          const pauseBuf = Buffer.alloc(48000); // 1.5s of silence
          audioBuffers.push(pauseBuf);
          offset += 1500;

          // Generate example sentence if provided
          if (item.exampleSentence) {
            const sentResult = await elevenLabsApi.textToSpeech({
              text: item.exampleSentence,
              voiceId,
              modelId: 'eleven_multilingual_v2',
              outputFormat: 'pcm_16000',
            });
            const sentBuf = Buffer.from(sentResult.audio);
            audioBuffers.push(sentBuf);
            offset += Math.floor(sentBuf.length / 32);

            // Pause after sentence
            audioBuffers.push(Buffer.alloc(32000)); // 1s
            offset += 1000;
          }

          creditsUsed += Math.ceil((item.word.length + (item.exampleSentence?.length || 0)) * 0.3);
        }

        audioBuffer = Buffer.concat(audioBuffers);
        durationMs = offset;
        break;
      }

      case 'pronunciation_guide': {
        if (!request.content.vocabulary || request.content.vocabulary.length === 0) {
          throw new ValidationError('Vocabulary items are required for pronunciation guide');
        }
        const audioBuffers: Buffer[] = [];
        let offset = 0;

        for (const item of request.content.vocabulary) {
          // Generate slow, clear pronunciation
          const slowResult = await elevenLabsApi.textToSpeech({
            text: item.word,
            voiceId,
            modelId: 'eleven_multilingual_v2',
            outputFormat: 'pcm_16000',
            voiceSettings: { stability: 0.95, similarityBoost: 0.9, style: 0 },
          });
          const slowBuf = Buffer.from(slowResult.audio);
          audioBuffers.push(slowBuf);
          offset += Math.floor(slowBuf.length / 32);

          // Pause
          audioBuffers.push(Buffer.alloc(64000)); // 2s for learner to repeat
          offset += 2000;

          // Generate at normal speed
          const normalResult = await elevenLabsApi.textToSpeech({
            text: item.word,
            voiceId,
            modelId: 'eleven_multilingual_v2',
            outputFormat: 'pcm_16000',
          });
          audioBuffers.push(Buffer.from(normalResult.audio));
          offset += Math.floor(Buffer.from(normalResult.audio).length / 32);

          // Longer pause between words
          audioBuffers.push(Buffer.alloc(96000)); // 3s
          offset += 3000;

          creditsUsed += Math.ceil(item.word.length * 0.6); // Double for two generations
        }

        audioBuffer = Buffer.concat(audioBuffers);
        durationMs = offset;
        break;
      }

      case 'audio_quiz': {
        if (!request.content.quizQuestions || request.content.quizQuestions.length === 0) {
          throw new ValidationError('Quiz questions are required');
        }
        const audioBuffers: Buffer[] = [];
        let offset = 0;

        for (let i = 0; i < request.content.quizQuestions.length; i++) {
          const q = request.content.quizQuestions[i];

          chapters.push({ title: `Question ${i + 1}`, offsetMs: offset, durationMs: 0 });

          // Generate question
          const qResult = await elevenLabsApi.textToSpeech({
            text: q.question,
            voiceId,
            modelId: 'eleven_multilingual_v2',
            outputFormat: 'pcm_16000',
          });
          const qBuf = Buffer.from(qResult.audio);
          audioBuffers.push(qBuf);
          offset += Math.floor(qBuf.length / 32);

          // Pause for answer
          const pauseBytes = Math.floor(q.pauseForAnswerMs * 32);
          audioBuffers.push(Buffer.alloc(pauseBytes));
          offset += q.pauseForAnswerMs;

          // Generate answer
          const aResult = await elevenLabsApi.textToSpeech({
            text: `The answer is: ${q.answer}`,
            voiceId,
            modelId: 'eleven_multilingual_v2',
            outputFormat: 'pcm_16000',
          });
          audioBuffers.push(Buffer.from(aResult.audio));
          offset += Math.floor(Buffer.from(aResult.audio).length / 32);

          // Pause between questions
          audioBuffers.push(Buffer.alloc(64000)); // 2s
          offset += 2000;

          creditsUsed += Math.ceil((q.question.length + q.answer.length) * 0.3);
        }

        audioBuffer = Buffer.concat(audioBuffers);
        durationMs = offset;
        break;
      }

      default:
        throw new ValidationError(`Unsupported content audio type: ${request.type}`);
    }

    const audioUrl = `voice-content/${request.tenantId}/${request.contentId}/${request.type}_${Date.now()}`;

    const result: ContentAudioResult = {
      id: `caudio_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      contentId: request.contentId,
      tenantId: request.tenantId,
      type: request.type,
      audioUrl,
      audioFormat: request.outputFormat || 'pcm_16000',
      durationMs,
      fileSizeBytes: audioBuffer.length,
      chapters: chapters.length > 0 ? chapters : undefined,
      creditsUsed,
      generatedAt: new Date(),
    };

    await contentRepo.save(result);

    await eventBus.publish('voice.content_audio.generated', {
      id: `evt_${Date.now()}`,
      type: 'voice.content_audio.generated',
      tenantId: request.tenantId,
      timestamp: new Date(),
      payload: {
        audioId: result.id,
        contentId: request.contentId,
        type: request.type,
        durationMs,
        creditsUsed,
      },
    });

    logger.info('Content audio generated', {
      audioId: result.id,
      type: request.type,
      durationMs,
    });

    return success(result);
  } catch (error) {
    logger.error('Content audio generation failed', error as Error);
    return failure(error instanceof ScholarlyError ? error :
      new ScholarlyError('CONTENT_AUDIO_FAILED', (error as Error).message));
  }
}
