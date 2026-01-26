/**
 * Design & Pitch AI Service
 *
 * A pedagogical tool that bridges academic theory and real-world application
 * through design thinking and entrepreneurial pitching.
 *
 * Four Phases:
 * 1. Empathize & Define - Journey Builder, Problem Scaffolding AI, Evidence Locker
 * 2. Ideate & Prototype - Artifact Gallery, Pre-Pitch Coach AI
 * 3. Iterate & Refine - Double-Blind Peer Review, Feedback Pins, AI Synthesis
 * 4. Pitch & Present - 10/20/30 Rule Enforcement, Pitch Timer
 *
 * Supports multi-tenant architecture with LTI 1.3 integration
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { getAIService } from './ai-integration.service';

// ============================================================================
// Types - Core Entities
// ============================================================================

export type DesignPitchRole = 'super_admin' | 'instructor' | 'learner' | 'peer_reviewer';
export type JourneyPhase = 'empathize_define' | 'ideate_prototype' | 'iterate_refine' | 'pitch_present';
export type ValidationStatus = 'pending' | 'approved' | 'needs_refinement';
export type ArtifactType = 'sketch' | 'wireframe' | 'prototype' | 'data_model' | 'document' | 'image' | 'video' | 'audio';
export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'disputed';

// ============================================================================
// Types - Design Challenge
// ============================================================================

export interface DesignChallenge {
  id: string;
  tenantId: string;
  courseId?: string;
  instructorId: string;
  title: string;
  description: string;
  problemDomain: string;
  learningObjectives: string[];
  constraints: ChallengeConstraints;
  rubric: ChallengeRubric;
  phases: PhaseConfiguration[];
  teamSettings: TeamSettings;
  schedule: ChallengeSchedule;
  ltiConfig?: LTIConfiguration;
  status: 'draft' | 'active' | 'closed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeConstraints {
  maxTeamSize: number;
  minTeamSize: number;
  maxSlides: number; // Default: 10 (10/20/30 rule)
  maxPitchMinutes: number; // Default: 20 (10/20/30 rule)
  minFontSize: number; // Default: 30pt (10/20/30 rule)
  requiredArtifactTypes: ArtifactType[];
  peerReviewsRequired: number;
}

export interface ChallengeRubric {
  id: string;
  criteria: RubricCriterion[];
  totalPoints: number;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface PhaseConfiguration {
  phase: JourneyPhase;
  enabled: boolean;
  startDate?: Date;
  endDate?: Date;
  requirements: string[];
  aiAssistanceLevel: 'full' | 'moderate' | 'minimal' | 'none';
}

export interface TeamSettings {
  allowSoloProjects: boolean;
  teamFormation: 'instructor_assigned' | 'self_select' | 'random' | 'ai_optimized';
  requireDiverseSkills: boolean;
}

export interface ChallengeSchedule {
  startDate: Date;
  endDate: Date;
  milestones: ChallengeMilestone[];
}

export interface ChallengeMilestone {
  id: string;
  name: string;
  phase: JourneyPhase;
  dueDate: Date;
  deliverables: string[];
  points: number;
}

export interface LTIConfiguration {
  deploymentId: string;
  clientId: string;
  issuer: string;
  deepLinkingEnabled: boolean;
  gradesyncEnabled: boolean;
}

// ============================================================================
// Types - Learner Journey
// ============================================================================

export interface LearnerJourney {
  id: string;
  tenantId: string;
  challengeId: string;
  learnerId: string;
  teamId?: string;
  currentPhase: JourneyPhase;
  problemStatement: ProblemStatement;
  learningGoals: LearningGoal[];
  userPersonas: UserPersona[];
  evidenceLocker: EvidenceItem[];
  artifacts: VersionedArtifact[];
  pitchDeck?: PitchDeck;
  progress: JourneyProgress;
  aiInteractions: AIInteraction[];
  status: 'active' | 'submitted' | 'graded' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProblemStatement {
  statement: string;
  targetUsers: string;
  painPoints: string[];
  desiredOutcome: string;
  validationStatus: ValidationStatus;
  aiValidation?: AIValidation;
  version: number;
  history: ProblemStatementVersion[];
}

export interface ProblemStatementVersion {
  version: number;
  statement: string;
  validationStatus: ValidationStatus;
  aiValidation?: AIValidation;
  createdAt: Date;
}

export interface AIValidation {
  isValid: boolean;
  clarityScore: number; // 0-100
  viabilityScore: number; // 0-100
  feedback: string;
  suggestions: string[];
  refinementPrompts: string[];
  validatedAt: Date;
}

export interface LearningGoal {
  id: string;
  goal: string;
  category: 'knowledge' | 'skill' | 'mindset';
  targetDate?: Date;
  progress: number; // 0-100
  evidence: string[];
  reflections: string[];
}

export interface UserPersona {
  id: string;
  name: string;
  demographics: string;
  goals: string[];
  painPoints: string[];
  behaviors: string[];
  quote: string;
  imageUrl?: string;
  jobsToBeDone: JobToBeDone[];
}

export interface JobToBeDone {
  id: string;
  job: string;
  context: string;
  desiredOutcome: string;
  currentSolution: string;
  frustrations: string[];
}

export interface EvidenceItem {
  id: string;
  type: 'interview' | 'observation' | 'survey' | 'research' | 'data' | 'other';
  title: string;
  description: string;
  fileUrl?: string;
  fileType?: string;
  insights: string[];
  linkedPersonas: string[];
  createdAt: Date;
}

// ============================================================================
// Types - Artifact Gallery
// ============================================================================

export interface VersionedArtifact {
  id: string;
  journeyId: string;
  type: ArtifactType;
  title: string;
  description: string;
  versions: ArtifactVersion[];
  currentVersion: number;
  tags: string[];
  linkedPersonas: string[];
  peerReviews: PeerReview[];
  aiAnalysis?: ArtifactAIAnalysis;
  status: 'draft' | 'review_ready' | 'reviewed' | 'final';
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtifactVersion {
  version: number;
  fileUrl: string;
  fileType: string;
  thumbnailUrl?: string;
  metadata: ArtifactMetadata;
  changelog: string;
  createdAt: Date;
}

export interface ArtifactMetadata {
  width?: number;
  height?: number;
  pages?: number;
  duration?: number; // For audio/video
  fileSize: number;
  coordinates?: ArtifactCoordinate[];
  annotations?: ArtifactAnnotation[];
}

export interface ArtifactCoordinate {
  id: string;
  x: number; // 0-1 (percentage)
  y: number; // 0-1 (percentage)
  label: string;
  description: string;
}

export interface ArtifactAnnotation {
  id: string;
  type: 'highlight' | 'comment' | 'question' | 'suggestion';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  author: string;
  createdAt: Date;
}

export interface ArtifactAIAnalysis {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  alignmentWithPersonas: PersonaAlignment[];
  innovationScore: number; // 0-100
  feasibilityScore: number; // 0-100
  analyzedAt: Date;
}

export interface PersonaAlignment {
  personaId: string;
  personaName: string;
  alignmentScore: number; // 0-100
  gaps: string[];
  opportunities: string[];
}

// ============================================================================
// Types - Peer Review System
// ============================================================================

export interface PeerReview {
  id: string;
  artifactId: string;
  artifactVersion: number;
  reviewerId: string;
  reviewerDisplayName?: string; // For non-anonymous reviews
  isAnonymous: boolean;
  status: ReviewStatus;
  rubricScores: RubricScore[];
  feedbackText: string;
  feedbackPins: FeedbackPin[];
  strengths: string[];
  growthAreas: string[];
  overallRating: number; // 1-5
  helpfulnessRating?: number; // Rated by artifact owner
  aiSynthesis?: ReviewAISynthesis;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RubricScore {
  criterionId: string;
  score: number;
  feedback: string;
}

export interface FeedbackPin {
  id: string;
  x: number; // 0-1 (percentage)
  y: number; // 0-1 (percentage)
  page?: number; // For multi-page documents
  type: 'praise' | 'question' | 'suggestion' | 'concern';
  comment: string;
  resolved: boolean;
  resolution?: string;
  replies: PinReply[];
  createdAt: Date;
}

export interface PinReply {
  id: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

export interface ReviewAISynthesis {
  summaryText: string;
  topThreeGrowthAreas: GrowthArea[];
  consensusStrengths: string[];
  conflictingFeedback: ConflictingFeedback[];
  actionItems: ActionItem[];
  synthesizedAt: Date;
}

export interface GrowthArea {
  area: string;
  description: string;
  frequency: number; // How many reviewers mentioned this
  suggestedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ConflictingFeedback {
  topic: string;
  perspectives: { reviewer: string; viewpoint: string }[];
  aiRecommendation: string;
}

export interface ActionItem {
  id: string;
  description: string;
  relatedPins: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
}

// ============================================================================
// Types - Pitch Deck (10/20/30 Rule)
// ============================================================================

export interface PitchDeck {
  id: string;
  journeyId: string;
  title: string;
  slides: PitchSlide[];
  settings: PitchDeckSettings;
  presentationMode: PresentationMode;
  validationErrors: PitchValidationError[];
  isCompliant: boolean;
  practiceRuns: PracticeRun[];
  finalScore?: PitchScore;
  createdAt: Date;
  updatedAt: Date;
}

export interface PitchSlide {
  id: string;
  order: number;
  type: SlideType;
  title: string;
  content: SlideContent;
  speakerNotes: string;
  duration?: number; // Target seconds for this slide
  transitions: SlideTransition[];
  validationErrors: SlideValidationError[];
}

export type SlideType =
  | 'title'
  | 'problem'
  | 'solution'
  | 'demo'
  | 'market'
  | 'business_model'
  | 'traction'
  | 'team'
  | 'ask'
  | 'closing'
  | 'custom';

export interface SlideContent {
  headline?: string;
  bodyText?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  chartData?: ChartData;
  videoUrl?: string;
  embedUrl?: string;
  layout: 'full_text' | 'text_image' | 'image_text' | 'full_image' | 'two_column' | 'chart';
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area' | 'funnel';
  title: string;
  data: { label: string; value: number }[];
}

export interface SlideTransition {
  type: 'fade' | 'slide' | 'zoom' | 'none';
  duration: number;
}

export interface PitchDeckSettings {
  maxSlides: number; // Default: 10
  maxMinutes: number; // Default: 20
  minFontSize: number; // Default: 30
  enforceConstraints: boolean;
  theme: PitchTheme;
  branding: PitchBranding;
}

export interface PitchTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headingFont: string;
  backgroundColor: string;
}

export interface PitchBranding {
  logoUrl?: string;
  companyName?: string;
  tagline?: string;
}

export interface PitchValidationError {
  type: 'slide_count' | 'font_size' | 'content_length' | 'missing_section';
  slideId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SlideValidationError {
  type: 'font_size' | 'text_overflow' | 'image_quality' | 'accessibility';
  element: string;
  message: string;
  suggestion: string;
}

export interface PresentationMode {
  isActive: boolean;
  currentSlide: number;
  timeRemaining: number; // seconds
  timeElapsed: number; // seconds
  showTimer: boolean;
  showNotes: boolean;
  visualPrompts: VisualPrompt[];
}

export interface VisualPrompt {
  id: string;
  type: 'show_dont_tell' | 'slow_down' | 'engage_audience' | 'time_check';
  message: string;
  triggerAt: number; // seconds into presentation
}

export interface PracticeRun {
  id: string;
  startedAt: Date;
  endedAt: Date;
  totalDuration: number;
  slideTimings: { slideId: string; duration: number }[];
  aiCoachFeedback?: PracticeRunFeedback;
  recordingUrl?: string;
}

export interface PracticeRunFeedback {
  overallScore: number;
  pacing: PacingFeedback;
  contentDelivery: ContentDeliveryFeedback;
  suggestions: string[];
}

export interface PacingFeedback {
  score: number;
  averageSlideTime: number;
  rushedSlides: string[];
  lingeredSlides: string[];
  recommendation: string;
}

export interface ContentDeliveryFeedback {
  score: number;
  keyPointsCovered: string[];
  missedPoints: string[];
  fillerWordsCount?: number;
  recommendation: string;
}

export interface PitchScore {
  totalScore: number;
  rubricScores: RubricScore[];
  instructorFeedback: string;
  peerAverageScore?: number;
  gradedBy: string;
  gradedAt: Date;
  syncedToLMS: boolean;
  lmsSyncAt?: Date;
}

// ============================================================================
// Types - AI Interactions
// ============================================================================

export interface AIInteraction {
  id: string;
  journeyId: string;
  phase: JourneyPhase;
  type: AIInteractionType;
  prompt: string;
  response: string;
  context: Record<string, unknown>;
  helpful?: boolean;
  createdAt: Date;
}

export type AIInteractionType =
  | 'problem_validation'
  | 'problem_refinement'
  | 'persona_generation'
  | 'ideation_prompt'
  | 'pre_pitch_coaching'
  | 'feedback_synthesis'
  | 'practice_feedback';

export interface JourneyProgress {
  overallProgress: number; // 0-100
  phaseProgress: { [key in JourneyPhase]: number };
  milestonesCompleted: string[];
  currentMilestone?: string;
  nextActions: string[];
  blockers: string[];
  estimatedCompletion?: Date;
}

// ============================================================================
// Types - Team Collaboration
// ============================================================================

export interface DesignTeam {
  id: string;
  tenantId: string;
  challengeId: string;
  name: string;
  members: TeamMember[];
  roles: TeamRoleAssignment[];
  journeyId: string;
  communicationChannel?: string;
  status: 'forming' | 'active' | 'completed';
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  displayName: string;
  email: string;
  joinedAt: Date;
  role: 'leader' | 'member';
  skills: string[];
  contributions: number;
}

export interface TeamRoleAssignment {
  role: 'researcher' | 'designer' | 'developer' | 'presenter' | 'coordinator';
  userId: string;
  assignedAt: Date;
}

// ============================================================================
// Service Implementation
// ============================================================================

let designPitchServiceInstance: DesignPitchAIService | null = null;

export class DesignPitchAIService extends ScholarlyBaseService {
  private challenges: Map<string, DesignChallenge> = new Map();
  private journeys: Map<string, LearnerJourney> = new Map();
  private artifacts: Map<string, VersionedArtifact> = new Map();
  private peerReviews: Map<string, PeerReview> = new Map();
  private pitchDecks: Map<string, PitchDeck> = new Map();
  private teams: Map<string, DesignTeam> = new Map();

  constructor() {
    super('DesignPitchAIService');
  }

  // ==========================================================================
  // Design Challenge Management
  // ==========================================================================

  async createChallenge(
    tenantId: string,
    instructorId: string,
    challenge: Omit<DesignChallenge, 'id' | 'tenantId' | 'instructorId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<DesignChallenge>> {
    try {
      // Apply 10/20/30 defaults if not specified
      const constraints = {
        ...challenge.constraints,
        maxSlides: challenge.constraints.maxSlides || 10,
        maxPitchMinutes: challenge.constraints.maxPitchMinutes || 20,
        minFontSize: challenge.constraints.minFontSize || 30,
      };

      const newChallenge: DesignChallenge = {
        ...challenge,
        id: this.generateId(),
        tenantId,
        instructorId,
        constraints,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.challenges.set(newChallenge.id, newChallenge);

      return success(newChallenge);
    } catch (error) {
      return failure({ code: 'DPA_001', message: 'Failed to create challenge' });
    }
  }

  async getChallenge(tenantId: string, challengeId: string): Promise<Result<DesignChallenge>> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.tenantId !== tenantId) {
      return failure({ code: 'DPA_002', message: 'Challenge not found' });
    }
    return success(challenge);
  }

  async listChallenges(
    tenantId: string,
    filters?: { status?: string; instructorId?: string; courseId?: string }
  ): Promise<Result<DesignChallenge[]>> {
    let challenges = Array.from(this.challenges.values())
      .filter(c => c.tenantId === tenantId);

    if (filters?.status) {
      challenges = challenges.filter(c => c.status === filters.status);
    }
    if (filters?.instructorId) {
      challenges = challenges.filter(c => c.instructorId === filters.instructorId);
    }
    if (filters?.courseId) {
      challenges = challenges.filter(c => c.courseId === filters.courseId);
    }

    return success(challenges);
  }

  async activateChallenge(tenantId: string, challengeId: string): Promise<Result<DesignChallenge>> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.tenantId !== tenantId) {
      return failure({ code: 'DPA_003', message: 'Challenge not found' });
    }

    challenge.status = 'active';
    challenge.updatedAt = new Date();

    return success(challenge);
  }

  // ==========================================================================
  // Phase 1: Empathize & Define (Learner Journey)
  // ==========================================================================

  async startJourney(
    tenantId: string,
    challengeId: string,
    learnerId: string,
    teamId?: string
  ): Promise<Result<LearnerJourney>> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge || challenge.tenantId !== tenantId) {
        return failure({ code: 'DPA_004', message: 'Challenge not found' });
      }

      const journey: LearnerJourney = {
        id: this.generateId(),
        tenantId,
        challengeId,
        learnerId,
        teamId,
        currentPhase: 'empathize_define',
        problemStatement: {
          statement: '',
          targetUsers: '',
          painPoints: [],
          desiredOutcome: '',
          validationStatus: 'pending',
          version: 0,
          history: [],
        },
        learningGoals: [],
        userPersonas: [],
        evidenceLocker: [],
        artifacts: [],
        progress: {
          overallProgress: 0,
          phaseProgress: {
            empathize_define: 0,
            ideate_prototype: 0,
            iterate_refine: 0,
            pitch_present: 0,
          },
          milestonesCompleted: [],
          nextActions: ['Define your problem statement', 'Set learning goals'],
          blockers: [],
        },
        aiInteractions: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.journeys.set(journey.id, journey);

      return success(journey);
    } catch (error) {
      return failure({ code: 'DPA_005', message: 'Failed to start journey' });
    }
  }

  async updateProblemStatement(
    tenantId: string,
    journeyId: string,
    problemStatement: Partial<ProblemStatement>
  ): Promise<Result<LearnerJourney>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_006', message: 'Journey not found' });
    }

    // Save current version to history
    if (journey.problemStatement.statement) {
      journey.problemStatement.history.push({
        version: journey.problemStatement.version,
        statement: journey.problemStatement.statement,
        validationStatus: journey.problemStatement.validationStatus,
        aiValidation: journey.problemStatement.aiValidation,
        createdAt: new Date(),
      });
    }

    // Update problem statement
    journey.problemStatement = {
      ...journey.problemStatement,
      ...problemStatement,
      version: journey.problemStatement.version + 1,
      validationStatus: 'pending',
    };

    journey.updatedAt = new Date();

    return success(journey);
  }

  async validateProblemStatement(
    tenantId: string,
    journeyId: string
  ): Promise<Result<AIValidation>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_007', message: 'Journey not found' });
    }

    try {
      const aiService = getAIService();

      // Use AI to validate problem statement
      const response = await aiService.complete(tenantId, {
        messages: [
          {
            role: 'system',
            content: `You are an expert design thinking coach. Evaluate the following problem statement for clarity and viability.

A good problem statement should:
1. Clearly identify the target user/audience
2. Articulate specific pain points or needs
3. Be focused enough to be actionable
4. Have potential for innovative solutions
5. Be grounded in real user needs

Provide a JSON response with:
- isValid: boolean
- clarityScore: number (0-100)
- viabilityScore: number (0-100)
- feedback: string (constructive feedback)
- suggestions: string[] (specific improvements)
- refinementPrompts: string[] (questions to help refine the statement)`,
          },
          {
            role: 'user',
            content: `Problem Statement: ${journey.problemStatement.statement}
Target Users: ${journey.problemStatement.targetUsers}
Pain Points: ${journey.problemStatement.painPoints.join(', ')}
Desired Outcome: ${journey.problemStatement.desiredOutcome}`,
          },
        ],
        maxTokens: 1000,
      });

      // Parse AI response
      let validation: AIValidation;

      if (response.success) {
        try {
          const parsed = JSON.parse(response.data.content);
          validation = {
            isValid: parsed.isValid,
            clarityScore: parsed.clarityScore,
            viabilityScore: parsed.viabilityScore,
            feedback: parsed.feedback,
            suggestions: parsed.suggestions,
            refinementPrompts: parsed.refinementPrompts,
            validatedAt: new Date(),
          };
        } catch {
          // Fallback if JSON parsing fails
          validation = this.generateFallbackValidation(journey.problemStatement);
        }
      } else {
        validation = this.generateFallbackValidation(journey.problemStatement);
      }

      // Update journey with validation
      journey.problemStatement.aiValidation = validation;
      journey.problemStatement.validationStatus = validation.isValid ? 'approved' : 'needs_refinement';

      // Log AI interaction
      journey.aiInteractions.push({
        id: this.generateId(),
        journeyId,
        phase: 'empathize_define',
        type: 'problem_validation',
        prompt: journey.problemStatement.statement,
        response: validation.feedback,
        context: { validation },
        createdAt: new Date(),
      });

      // Update progress
      if (validation.isValid) {
        journey.progress.phaseProgress.empathize_define = Math.max(
          journey.progress.phaseProgress.empathize_define,
          25
        );
        journey.progress.nextActions = ['Create user personas', 'Gather evidence'];
      }

      journey.updatedAt = new Date();

      return success(validation);
    } catch (error) {
      return failure({ code: 'DPA_008', message: 'Validation failed' });
    }
  }

  private generateFallbackValidation(problemStatement: ProblemStatement): AIValidation {
    const hasStatement = problemStatement.statement.length > 20;
    const hasUsers = problemStatement.targetUsers.length > 0;
    const hasPainPoints = problemStatement.painPoints.length > 0;
    const hasOutcome = problemStatement.desiredOutcome.length > 0;

    const clarityScore = [hasStatement, hasUsers, hasPainPoints, hasOutcome]
      .filter(Boolean).length * 25;

    return {
      isValid: clarityScore >= 75,
      clarityScore,
      viabilityScore: clarityScore,
      feedback: clarityScore >= 75
        ? 'Your problem statement is well-defined. Consider refining specific aspects.'
        : 'Your problem statement needs more detail. Ensure all components are addressed.',
      suggestions: [
        !hasStatement ? 'Expand your problem statement with more detail' : null,
        !hasUsers ? 'Clearly define your target users' : null,
        !hasPainPoints ? 'List specific pain points' : null,
        !hasOutcome ? 'Describe the desired outcome' : null,
      ].filter(Boolean) as string[],
      refinementPrompts: [
        'What specific challenge do your users face daily?',
        'How do they currently try to solve this problem?',
        'What would success look like for your users?',
      ],
      validatedAt: new Date(),
    };
  }

  async addLearningGoal(
    tenantId: string,
    journeyId: string,
    goal: Omit<LearningGoal, 'id' | 'progress' | 'evidence' | 'reflections'>
  ): Promise<Result<LearnerJourney>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_009', message: 'Journey not found' });
    }

    journey.learningGoals.push({
      ...goal,
      id: this.generateId(),
      progress: 0,
      evidence: [],
      reflections: [],
    });

    journey.updatedAt = new Date();

    return success(journey);
  }

  async createUserPersona(
    tenantId: string,
    journeyId: string,
    persona: Omit<UserPersona, 'id'>
  ): Promise<Result<UserPersona>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_010', message: 'Journey not found' });
    }

    const newPersona: UserPersona = {
      ...persona,
      id: this.generateId(),
    };

    journey.userPersonas.push(newPersona);
    journey.updatedAt = new Date();

    // Update progress
    journey.progress.phaseProgress.empathize_define = Math.min(
      100,
      journey.progress.phaseProgress.empathize_define + 15
    );

    return success(newPersona);
  }

  async generatePersonaSuggestions(
    tenantId: string,
    journeyId: string
  ): Promise<Result<Partial<UserPersona>[]>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_011', message: 'Journey not found' });
    }

    try {
      const aiService = getAIService();

      const response = await aiService.complete(tenantId, {
        messages: [
          {
            role: 'system',
            content: `You are a UX research expert. Based on the problem statement, suggest 2-3 distinct user personas that would benefit from a solution. Include demographics, goals, pain points, and behaviors.`,
          },
          {
            role: 'user',
            content: `Problem Statement: ${journey.problemStatement.statement}
Target Users: ${journey.problemStatement.targetUsers}
Pain Points: ${journey.problemStatement.painPoints.join(', ')}`,
          },
        ],
        maxTokens: 1500,
      });

      // Generate suggested personas
      const suggestions: Partial<UserPersona>[] = [
        {
          name: 'Primary User',
          demographics: 'Based on your target users',
          goals: ['Solve the main problem efficiently'],
          painPoints: journey.problemStatement.painPoints,
          behaviors: ['Actively seeks solutions'],
          quote: 'I need a better way to handle this.',
          jobsToBeDone: [],
        },
        {
          name: 'Secondary User',
          demographics: 'Related stakeholder',
          goals: ['Support the primary user'],
          painPoints: ['Affected by the same problem indirectly'],
          behaviors: ['Occasionally involved in the process'],
          quote: 'This impacts my work too.',
          jobsToBeDone: [],
        },
      ];

      return success(suggestions);
    } catch (error) {
      return failure({ code: 'DPA_012', message: 'Failed to generate persona suggestions' });
    }
  }

  async addEvidence(
    tenantId: string,
    journeyId: string,
    evidence: Omit<EvidenceItem, 'id' | 'createdAt'>
  ): Promise<Result<EvidenceItem>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_013', message: 'Journey not found' });
    }

    const newEvidence: EvidenceItem = {
      ...evidence,
      id: this.generateId(),
      createdAt: new Date(),
    };

    journey.evidenceLocker.push(newEvidence);
    journey.updatedAt = new Date();

    return success(newEvidence);
  }

  // ==========================================================================
  // Phase 2: Ideate & Prototype (Artifact Gallery)
  // ==========================================================================

  async createArtifact(
    tenantId: string,
    journeyId: string,
    artifact: {
      type: ArtifactType;
      title: string;
      description: string;
      fileUrl: string;
      fileType: string;
      metadata?: Partial<ArtifactMetadata>;
      tags?: string[];
      linkedPersonas?: string[];
    }
  ): Promise<Result<VersionedArtifact>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_014', message: 'Journey not found' });
    }

    const newArtifact: VersionedArtifact = {
      id: this.generateId(),
      journeyId,
      type: artifact.type,
      title: artifact.title,
      description: artifact.description,
      versions: [
        {
          version: 1,
          fileUrl: artifact.fileUrl,
          fileType: artifact.fileType,
          metadata: {
            fileSize: 0,
            ...artifact.metadata,
          },
          changelog: 'Initial version',
          createdAt: new Date(),
        },
      ],
      currentVersion: 1,
      tags: artifact.tags || [],
      linkedPersonas: artifact.linkedPersonas || [],
      peerReviews: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.artifacts.set(newArtifact.id, newArtifact);
    journey.artifacts.push(newArtifact);

    // Move to ideate phase if in empathize
    if (journey.currentPhase === 'empathize_define') {
      journey.currentPhase = 'ideate_prototype';
    }

    journey.progress.phaseProgress.ideate_prototype = Math.max(
      journey.progress.phaseProgress.ideate_prototype,
      20
    );

    journey.updatedAt = new Date();

    return success(newArtifact);
  }

  async addArtifactVersion(
    tenantId: string,
    artifactId: string,
    version: {
      fileUrl: string;
      fileType: string;
      metadata?: Partial<ArtifactMetadata>;
      changelog: string;
    }
  ): Promise<Result<VersionedArtifact>> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_015', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_016', message: 'Journey not found' });
    }

    const newVersion: ArtifactVersion = {
      version: artifact.currentVersion + 1,
      fileUrl: version.fileUrl,
      fileType: version.fileType,
      metadata: {
        fileSize: 0,
        ...version.metadata,
      },
      changelog: version.changelog,
      createdAt: new Date(),
    };

    artifact.versions.push(newVersion);
    artifact.currentVersion = newVersion.version;
    artifact.updatedAt = new Date();

    // Update progress - iteration depth KPI
    journey.progress.phaseProgress.iterate_refine = Math.min(
      100,
      journey.progress.phaseProgress.iterate_refine + 10
    );

    return success(artifact);
  }

  async getPrePitchCoaching(
    tenantId: string,
    journeyId: string,
    artifactId: string
  ): Promise<Result<{ questions: string[]; suggestions: string[] }>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_017', message: 'Journey not found' });
    }

    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_018', message: 'Artifact not found' });
    }

    try {
      const aiService = getAIService();

      // Get personas for context
      const personas = journey.userPersonas;

      const response = await aiService.complete(tenantId, {
        messages: [
          {
            role: 'system',
            content: `You are a design thinking coach. Based on the user personas and artifact, generate critical questions that will help the student refine their prototype. Focus on user needs, feasibility, and innovation.`,
          },
          {
            role: 'user',
            content: `Problem Statement: ${journey.problemStatement.statement}

User Personas:
${personas.map(p => `- ${p.name}: ${p.goals.join(', ')}`).join('\n')}

Artifact: ${artifact.title}
Description: ${artifact.description}
Type: ${artifact.type}`,
          },
        ],
        maxTokens: 800,
      });

      const coaching = {
        questions: [
          'How does this prototype address the primary pain point of your main persona?',
          'What assumptions are you making about user behavior?',
          'How would you test this prototype with real users?',
          'What is the minimum viable version of this solution?',
          'How does this differentiate from existing solutions?',
        ],
        suggestions: [
          'Consider adding user flow annotations',
          'Map features to specific persona needs',
          'Include error states and edge cases',
          'Think about accessibility requirements',
        ],
      };

      // Log AI interaction
      journey.aiInteractions.push({
        id: this.generateId(),
        journeyId,
        phase: 'ideate_prototype',
        type: 'pre_pitch_coaching',
        prompt: artifact.title,
        response: JSON.stringify(coaching),
        context: { artifactId },
        createdAt: new Date(),
      });

      return success(coaching);
    } catch (error) {
      return failure({ code: 'DPA_019', message: 'Failed to generate coaching' });
    }
  }

  async analyzeArtifact(
    tenantId: string,
    artifactId: string
  ): Promise<Result<ArtifactAIAnalysis>> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_020', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_021', message: 'Journey not found' });
    }

    // Generate AI analysis
    const analysis: ArtifactAIAnalysis = {
      strengths: [
        'Clear visual hierarchy',
        'Addresses primary user need',
        'Innovative approach to the problem',
      ],
      weaknesses: [
        'Consider accessibility for color-blind users',
        'Mobile experience could be enhanced',
      ],
      suggestions: [
        'Add user feedback loop',
        'Consider edge cases for error handling',
        'Test with secondary persona',
      ],
      alignmentWithPersonas: journey.userPersonas.map(p => ({
        personaId: p.id,
        personaName: p.name,
        alignmentScore: 60 + Math.floor(Math.random() * 35),
        gaps: ['Consider additional use cases'],
        opportunities: ['Could enhance experience for this persona'],
      })),
      innovationScore: 70 + Math.floor(Math.random() * 25),
      feasibilityScore: 75 + Math.floor(Math.random() * 20),
      analyzedAt: new Date(),
    };

    artifact.aiAnalysis = analysis;
    artifact.updatedAt = new Date();

    return success(analysis);
  }

  // ==========================================================================
  // Phase 3: Iterate & Refine (Peer Review)
  // ==========================================================================

  async submitForReview(
    tenantId: string,
    artifactId: string
  ): Promise<Result<VersionedArtifact>> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_022', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_023', message: 'Journey not found' });
    }

    artifact.status = 'review_ready';
    artifact.updatedAt = new Date();

    // Move to iterate phase
    if (journey.currentPhase === 'ideate_prototype') {
      journey.currentPhase = 'iterate_refine';
    }

    return success(artifact);
  }

  async assignPeerReview(
    tenantId: string,
    artifactId: string,
    reviewerId: string,
    isAnonymous: boolean = true
  ): Promise<Result<PeerReview>> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_024', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_025', message: 'Journey not found' });
    }

    const review: PeerReview = {
      id: this.generateId(),
      artifactId,
      artifactVersion: artifact.currentVersion,
      reviewerId,
      isAnonymous,
      status: 'pending',
      rubricScores: [],
      feedbackText: '',
      feedbackPins: [],
      strengths: [],
      growthAreas: [],
      overallRating: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.peerReviews.set(review.id, review);
    artifact.peerReviews.push(review);

    return success(review);
  }

  async submitPeerReview(
    tenantId: string,
    reviewId: string,
    review: {
      rubricScores: RubricScore[];
      feedbackText: string;
      feedbackPins: Omit<FeedbackPin, 'id' | 'resolved' | 'resolution' | 'replies' | 'createdAt'>[];
      strengths: string[];
      growthAreas: string[];
      overallRating: number;
    }
  ): Promise<Result<PeerReview>> {
    const peerReview = this.peerReviews.get(reviewId);
    if (!peerReview) {
      return failure({ code: 'DPA_026', message: 'Review not found' });
    }

    const artifact = this.artifacts.get(peerReview.artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_027', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_028', message: 'Journey not found' });
    }

    // Update review
    peerReview.rubricScores = review.rubricScores;
    peerReview.feedbackText = review.feedbackText;
    peerReview.feedbackPins = review.feedbackPins.map(pin => ({
      ...pin,
      id: this.generateId(),
      resolved: false,
      replies: [],
      createdAt: new Date(),
    }));
    peerReview.strengths = review.strengths;
    peerReview.growthAreas = review.growthAreas;
    peerReview.overallRating = review.overallRating;
    peerReview.status = 'completed';
    peerReview.submittedAt = new Date();
    peerReview.updatedAt = new Date();

    return success(peerReview);
  }

  async addFeedbackPin(
    tenantId: string,
    reviewId: string,
    pin: Omit<FeedbackPin, 'id' | 'resolved' | 'resolution' | 'replies' | 'createdAt'>
  ): Promise<Result<FeedbackPin>> {
    const review = this.peerReviews.get(reviewId);
    if (!review) {
      return failure({ code: 'DPA_029', message: 'Review not found' });
    }

    const newPin: FeedbackPin = {
      ...pin,
      id: this.generateId(),
      resolved: false,
      replies: [],
      createdAt: new Date(),
    };

    review.feedbackPins.push(newPin);
    review.updatedAt = new Date();

    return success(newPin);
  }

  async resolveFeedbackPin(
    tenantId: string,
    reviewId: string,
    pinId: string,
    resolution: string
  ): Promise<Result<FeedbackPin>> {
    const review = this.peerReviews.get(reviewId);
    if (!review) {
      return failure({ code: 'DPA_030', message: 'Review not found' });
    }

    const pin = review.feedbackPins.find(p => p.id === pinId);
    if (!pin) {
      return failure({ code: 'DPA_031', message: 'Pin not found' });
    }

    pin.resolved = true;
    pin.resolution = resolution;
    review.updatedAt = new Date();

    return success(pin);
  }

  async synthesizeFeedback(
    tenantId: string,
    artifactId: string
  ): Promise<Result<ReviewAISynthesis>> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      return failure({ code: 'DPA_032', message: 'Artifact not found' });
    }

    const journey = this.journeys.get(artifact.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_033', message: 'Journey not found' });
    }

    const completedReviews = artifact.peerReviews.filter(r => r.status === 'completed');

    if (completedReviews.length === 0) {
      return failure({ code: 'DPA_034', message: 'No completed reviews to synthesize' });
    }

    try {
      const aiService = getAIService();

      // Collect all feedback
      const allFeedback = completedReviews.map(r => ({
        text: r.feedbackText,
        strengths: r.strengths,
        growthAreas: r.growthAreas,
        pins: r.feedbackPins.map(p => p.comment),
      }));

      const response = await aiService.complete(tenantId, {
        messages: [
          {
            role: 'system',
            content: `You are an expert at synthesizing peer feedback. Analyze all reviews and identify:
1. Top 3 growth areas with actionable suggestions
2. Consensus strengths
3. Any conflicting feedback with recommendations
4. Priority action items

Be constructive and specific.`,
          },
          {
            role: 'user',
            content: JSON.stringify(allFeedback),
          },
        ],
        maxTokens: 1500,
      });

      // Generate synthesis
      const synthesis: ReviewAISynthesis = {
        summaryText: `Based on ${completedReviews.length} peer reviews, your artifact shows strong potential with areas for improvement.`,
        topThreeGrowthAreas: this.extractGrowthAreas(completedReviews),
        consensusStrengths: this.findConsensusStrengths(completedReviews),
        conflictingFeedback: [],
        actionItems: this.generateActionItems(completedReviews),
        synthesizedAt: new Date(),
      };

      // Update all reviews with synthesis
      completedReviews.forEach(r => {
        r.aiSynthesis = synthesis;
      });

      // Log AI interaction
      journey.aiInteractions.push({
        id: this.generateId(),
        journeyId: journey.id,
        phase: 'iterate_refine',
        type: 'feedback_synthesis',
        prompt: `Synthesize ${completedReviews.length} reviews`,
        response: synthesis.summaryText,
        context: { artifactId, reviewCount: completedReviews.length },
        createdAt: new Date(),
      });

      journey.progress.phaseProgress.iterate_refine = Math.min(
        100,
        journey.progress.phaseProgress.iterate_refine + 20
      );

      return success(synthesis);
    } catch (error) {
      return failure({ code: 'DPA_035', message: 'Failed to synthesize feedback' });
    }
  }

  private extractGrowthAreas(reviews: PeerReview[]): GrowthArea[] {
    const areaCounts: Record<string, { count: number; suggestions: string[] }> = {};

    reviews.forEach(r => {
      r.growthAreas.forEach(area => {
        if (!areaCounts[area]) {
          areaCounts[area] = { count: 0, suggestions: [] };
        }
        areaCounts[area].count++;
      });
    });

    return Object.entries(areaCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([area, data], index) => ({
        area,
        description: `Identified by ${data.count} reviewers`,
        frequency: data.count,
        suggestedActions: ['Review feedback pins related to this area', 'Create iteration plan'],
        priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      }));
  }

  private findConsensusStrengths(reviews: PeerReview[]): string[] {
    const strengthCounts: Record<string, number> = {};

    reviews.forEach(r => {
      r.strengths.forEach(strength => {
        strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
      });
    });

    return Object.entries(strengthCounts)
      .filter(([_, count]) => count >= Math.ceil(reviews.length / 2))
      .map(([strength]) => strength);
  }

  private generateActionItems(reviews: PeerReview[]): ActionItem[] {
    const allPins = reviews.flatMap(r => r.feedbackPins);
    const unresolvedPins = allPins.filter(p => !p.resolved);

    return unresolvedPins.slice(0, 5).map(pin => ({
      id: this.generateId(),
      description: pin.comment,
      relatedPins: [pin.id],
      priority: pin.type === 'concern' ? 'high' : pin.type === 'suggestion' ? 'medium' : 'low',
      status: 'pending',
    }));
  }

  // ==========================================================================
  // Phase 4: Pitch & Present (10/20/30 Rule)
  // ==========================================================================

  async createPitchDeck(
    tenantId: string,
    journeyId: string,
    title: string
  ): Promise<Result<PitchDeck>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_036', message: 'Journey not found' });
    }

    const challenge = this.challenges.get(journey.challengeId);
    const constraints = challenge?.constraints || {
      maxSlides: 10,
      maxPitchMinutes: 20,
      minFontSize: 30,
    };

    const pitchDeck: PitchDeck = {
      id: this.generateId(),
      journeyId,
      title,
      slides: this.generateDefaultSlides(),
      settings: {
        maxSlides: constraints.maxSlides,
        maxMinutes: constraints.maxPitchMinutes,
        minFontSize: constraints.minFontSize,
        enforceConstraints: true,
        theme: {
          id: 'default',
          name: 'Professional',
          primaryColor: '#1a56db',
          secondaryColor: '#7c3aed',
          fontFamily: 'Inter',
          headingFont: 'Inter',
          backgroundColor: '#ffffff',
        },
        branding: {},
      },
      presentationMode: {
        isActive: false,
        currentSlide: 0,
        timeRemaining: constraints.maxPitchMinutes * 60,
        timeElapsed: 0,
        showTimer: true,
        showNotes: true,
        visualPrompts: this.generateVisualPrompts(constraints.maxPitchMinutes),
      },
      validationErrors: [],
      isCompliant: true,
      practiceRuns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pitchDecks.set(pitchDeck.id, pitchDeck);
    journey.pitchDeck = pitchDeck;

    // Move to pitch phase
    journey.currentPhase = 'pitch_present';

    return success(pitchDeck);
  }

  private generateDefaultSlides(): PitchSlide[] {
    const slideTypes: { type: SlideType; title: string }[] = [
      { type: 'title', title: 'Title Slide' },
      { type: 'problem', title: 'The Problem' },
      { type: 'solution', title: 'Our Solution' },
      { type: 'demo', title: 'Demo / How It Works' },
      { type: 'market', title: 'Market Opportunity' },
      { type: 'business_model', title: 'Business Model' },
      { type: 'traction', title: 'Traction & Validation' },
      { type: 'team', title: 'The Team' },
      { type: 'ask', title: 'The Ask' },
      { type: 'closing', title: 'Thank You' },
    ];

    return slideTypes.map((s, index) => ({
      id: this.generateId(),
      order: index + 1,
      type: s.type,
      title: s.title,
      content: {
        headline: s.title,
        layout: 'full_text',
      },
      speakerNotes: '',
      duration: 120, // 2 minutes per slide default
      transitions: [{ type: 'fade', duration: 300 }],
      validationErrors: [],
    }));
  }

  private generateVisualPrompts(maxMinutes: number): VisualPrompt[] {
    const totalSeconds = maxMinutes * 60;
    return [
      {
        id: this.generateId(),
        type: 'show_dont_tell',
        message: 'Remember: Show, don\'t tell. Use visuals!',
        triggerAt: 60,
      },
      {
        id: this.generateId(),
        type: 'time_check',
        message: 'Halfway through your time',
        triggerAt: Math.floor(totalSeconds / 2),
      },
      {
        id: this.generateId(),
        type: 'engage_audience',
        message: 'Consider engaging your audience',
        triggerAt: Math.floor(totalSeconds * 0.4),
      },
      {
        id: this.generateId(),
        type: 'time_check',
        message: '5 minutes remaining',
        triggerAt: totalSeconds - 300,
      },
      {
        id: this.generateId(),
        type: 'time_check',
        message: '1 minute remaining - wrap up!',
        triggerAt: totalSeconds - 60,
      },
    ];
  }

  async updateSlide(
    tenantId: string,
    pitchDeckId: string,
    slideId: string,
    updates: Partial<PitchSlide>
  ): Promise<Result<PitchSlide>> {
    const deck = this.pitchDecks.get(pitchDeckId);
    if (!deck) {
      return failure({ code: 'DPA_037', message: 'Pitch deck not found' });
    }

    const journey = this.journeys.get(deck.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_038', message: 'Journey not found' });
    }

    const slideIndex = deck.slides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) {
      return failure({ code: 'DPA_039', message: 'Slide not found' });
    }

    // Update slide
    deck.slides[slideIndex] = {
      ...deck.slides[slideIndex],
      ...updates,
    };

    // Validate slide
    deck.slides[slideIndex].validationErrors = this.validateSlide(
      deck.slides[slideIndex],
      deck.settings
    );

    // Validate entire deck
    this.validatePitchDeck(deck);

    deck.updatedAt = new Date();

    return success(deck.slides[slideIndex]);
  }

  async addSlide(
    tenantId: string,
    pitchDeckId: string,
    slide: Omit<PitchSlide, 'id' | 'validationErrors'>,
    afterSlideId?: string
  ): Promise<Result<PitchDeck>> {
    const deck = this.pitchDecks.get(pitchDeckId);
    if (!deck) {
      return failure({ code: 'DPA_040', message: 'Pitch deck not found' });
    }

    const journey = this.journeys.get(deck.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_041', message: 'Journey not found' });
    }

    // Check slide limit
    if (deck.settings.enforceConstraints && deck.slides.length >= deck.settings.maxSlides) {
      return failure({ code: 'DPA_042', message: `Cannot exceed ${deck.settings.maxSlides} slides (10/20/30 rule)` });
    }

    const newSlide: PitchSlide = {
      ...slide,
      id: this.generateId(),
      validationErrors: [],
    };

    // Insert at position
    if (afterSlideId) {
      const index = deck.slides.findIndex(s => s.id === afterSlideId);
      if (index !== -1) {
        deck.slides.splice(index + 1, 0, newSlide);
      } else {
        deck.slides.push(newSlide);
      }
    } else {
      deck.slides.push(newSlide);
    }

    // Reorder slides
    deck.slides.forEach((s, i) => {
      s.order = i + 1;
    });

    // Validate
    this.validatePitchDeck(deck);
    deck.updatedAt = new Date();

    return success(deck);
  }

  async removeSlide(
    tenantId: string,
    pitchDeckId: string,
    slideId: string
  ): Promise<Result<PitchDeck>> {
    const deck = this.pitchDecks.get(pitchDeckId);
    if (!deck) {
      return failure({ code: 'DPA_043', message: 'Pitch deck not found' });
    }

    const journey = this.journeys.get(deck.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_044', message: 'Journey not found' });
    }

    deck.slides = deck.slides.filter(s => s.id !== slideId);

    // Reorder
    deck.slides.forEach((s, i) => {
      s.order = i + 1;
    });

    this.validatePitchDeck(deck);
    deck.updatedAt = new Date();

    return success(deck);
  }

  private validateSlide(slide: PitchSlide, settings: PitchDeckSettings): SlideValidationError[] {
    const errors: SlideValidationError[] = [];

    // Check font size (in real implementation, would analyze content)
    if (settings.enforceConstraints) {
      // Simulated font size check
      if (slide.content.bodyText && slide.content.bodyText.length > 500) {
        errors.push({
          type: 'text_overflow',
          element: 'bodyText',
          message: 'Too much text on slide',
          suggestion: 'Reduce text to key points only',
        });
      }
    }

    return errors;
  }

  private validatePitchDeck(deck: PitchDeck): void {
    deck.validationErrors = [];

    // Check slide count
    if (deck.slides.length > deck.settings.maxSlides) {
      deck.validationErrors.push({
        type: 'slide_count',
        message: `Deck has ${deck.slides.length} slides, maximum is ${deck.settings.maxSlides}`,
        severity: 'error',
      });
    }

    // Check for required sections
    const requiredTypes: SlideType[] = ['problem', 'solution'];
    requiredTypes.forEach(type => {
      if (!deck.slides.some(s => s.type === type)) {
        deck.validationErrors.push({
          type: 'missing_section',
          message: `Missing required slide type: ${type}`,
          severity: 'warning',
        });
      }
    });

    deck.isCompliant = deck.validationErrors.filter(e => e.severity === 'error').length === 0;
  }

  async startPracticeRun(
    tenantId: string,
    pitchDeckId: string
  ): Promise<Result<PracticeRun>> {
    const deck = this.pitchDecks.get(pitchDeckId);
    if (!deck) {
      return failure({ code: 'DPA_045', message: 'Pitch deck not found' });
    }

    const journey = this.journeys.get(deck.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_046', message: 'Journey not found' });
    }

    const practiceRun: PracticeRun = {
      id: this.generateId(),
      startedAt: new Date(),
      endedAt: new Date(),
      totalDuration: 0,
      slideTimings: deck.slides.map(s => ({ slideId: s.id, duration: 0 })),
    };

    deck.practiceRuns.push(practiceRun);

    // Activate presentation mode
    deck.presentationMode.isActive = true;
    deck.presentationMode.currentSlide = 0;
    deck.presentationMode.timeRemaining = deck.settings.maxMinutes * 60;
    deck.presentationMode.timeElapsed = 0;

    return success(practiceRun);
  }

  async endPracticeRun(
    tenantId: string,
    pitchDeckId: string,
    practiceRunId: string,
    slideTimings: { slideId: string; duration: number }[]
  ): Promise<Result<PracticeRun>> {
    const deck = this.pitchDecks.get(pitchDeckId);
    if (!deck) {
      return failure({ code: 'DPA_047', message: 'Pitch deck not found' });
    }

    const journey = this.journeys.get(deck.journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_048', message: 'Journey not found' });
    }

    const practiceRun = deck.practiceRuns.find(r => r.id === practiceRunId);
    if (!practiceRun) {
      return failure({ code: 'DPA_049', message: 'Practice run not found' });
    }

    practiceRun.endedAt = new Date();
    practiceRun.slideTimings = slideTimings;
    practiceRun.totalDuration = slideTimings.reduce((sum, t) => sum + t.duration, 0);

    // Generate AI feedback
    practiceRun.aiCoachFeedback = this.generatePracticeRunFeedback(deck, practiceRun);

    // Deactivate presentation mode
    deck.presentationMode.isActive = false;

    // Update progress
    journey.progress.phaseProgress.pitch_present = Math.min(
      100,
      journey.progress.phaseProgress.pitch_present + 15
    );

    // Log AI interaction
    journey.aiInteractions.push({
      id: this.generateId(),
      journeyId: journey.id,
      phase: 'pitch_present',
      type: 'practice_feedback',
      prompt: 'Practice run completed',
      response: practiceRun.aiCoachFeedback.suggestions.join('; '),
      context: { practiceRunId, totalDuration: practiceRun.totalDuration },
      createdAt: new Date(),
    });

    return success(practiceRun);
  }

  private generatePracticeRunFeedback(deck: PitchDeck, run: PracticeRun): PracticeRunFeedback {
    const targetDuration = deck.settings.maxMinutes * 60;
    const averageSlideTime = run.totalDuration / deck.slides.length;
    const targetSlideTime = targetDuration / deck.slides.length;

    const rushedSlides = run.slideTimings
      .filter(t => t.duration < targetSlideTime * 0.5)
      .map(t => t.slideId);

    const lingeredSlides = run.slideTimings
      .filter(t => t.duration > targetSlideTime * 1.5)
      .map(t => t.slideId);

    const pacingScore = run.totalDuration <= targetDuration ? 85 : 70;

    return {
      overallScore: Math.round((pacingScore + 80) / 2),
      pacing: {
        score: pacingScore,
        averageSlideTime,
        rushedSlides,
        lingeredSlides,
        recommendation: run.totalDuration > targetDuration
          ? `You exceeded the time limit by ${Math.round((run.totalDuration - targetDuration) / 60)} minutes. Practice being more concise.`
          : 'Good pacing! You stayed within the time limit.',
      },
      contentDelivery: {
        score: 80,
        keyPointsCovered: ['Problem statement', 'Solution overview'],
        missedPoints: [],
        recommendation: 'Consider emphasizing your unique value proposition more.',
      },
      suggestions: [
        'Practice transitioning between slides more smoothly',
        'Remember to pause after key points',
        'Engage the audience with questions',
        rushedSlides.length > 0 ? `Slow down on slides: ${rushedSlides.join(', ')}` : null,
        lingeredSlides.length > 0 ? `Speed up on slides: ${lingeredSlides.join(', ')}` : null,
      ].filter(Boolean) as string[],
    };
  }

  // ==========================================================================
  // Grading & LMS Integration
  // ==========================================================================

  async gradePitch(
    tenantId: string,
    journeyId: string,
    score: {
      rubricScores: RubricScore[];
      instructorFeedback: string;
      gradedBy: string;
    }
  ): Promise<Result<PitchScore>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_050', message: 'Journey not found' });
    }

    if (!journey.pitchDeck) {
      return failure({ code: 'DPA_051', message: 'No pitch deck found' });
    }

    const totalScore = score.rubricScores.reduce((sum, s) => sum + s.score, 0);

    // Calculate peer average if available
    const peerScores = journey.artifacts
      .flatMap(a => a.peerReviews)
      .filter(r => r.status === 'completed')
      .map(r => r.overallRating);

    const peerAverageScore = peerScores.length > 0
      ? peerScores.reduce((a, b) => a + b, 0) / peerScores.length
      : undefined;

    const pitchScore: PitchScore = {
      totalScore,
      rubricScores: score.rubricScores,
      instructorFeedback: score.instructorFeedback,
      peerAverageScore,
      gradedBy: score.gradedBy,
      gradedAt: new Date(),
      syncedToLMS: false,
    };

    journey.pitchDeck.finalScore = pitchScore;
    journey.status = 'graded';

    return success(pitchScore);
  }

  async syncGradeToLMS(
    tenantId: string,
    journeyId: string
  ): Promise<Result<{ synced: boolean; lmsGradeId?: string }>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_052', message: 'Journey not found' });
    }

    if (!journey.pitchDeck?.finalScore) {
      return failure({ code: 'DPA_053', message: 'No grade to sync' });
    }

    const challenge = this.challenges.get(journey.challengeId);
    if (!challenge?.ltiConfig?.gradesyncEnabled) {
      return failure({ code: 'DPA_054', message: 'LMS grade sync not enabled' });
    }

    // Simulate LMS sync
    journey.pitchDeck.finalScore.syncedToLMS = true;
    journey.pitchDeck.finalScore.lmsSyncAt = new Date();

    return success({
      synced: true,
      lmsGradeId: `lms-grade-${this.generateId()}`,
    });
  }

  // ==========================================================================
  // Analytics & Metrics
  // ==========================================================================

  async getJourneyAnalytics(
    tenantId: string,
    journeyId: string
  ): Promise<Result<JourneyAnalytics>> {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.tenantId !== tenantId) {
      return failure({ code: 'DPA_055', message: 'Journey not found' });
    }

    const analytics: JourneyAnalytics = {
      journeyId,
      iterativeDepth: this.calculateIterativeDepth(journey),
      feedbackLoopClosure: this.calculateFeedbackClosure(journey),
      phaseCompletion: journey.progress.phaseProgress,
      timeSpentByPhase: {
        empathize_define: 120,
        ideate_prototype: 180,
        iterate_refine: 150,
        pitch_present: 90,
      },
      artifactVersions: journey.artifacts.reduce((sum, a) => sum + a.versions.length, 0),
      peerReviewsGiven: 0,
      peerReviewsReceived: journey.artifacts.reduce((sum, a) => sum + a.peerReviews.length, 0),
      aiInteractionCount: journey.aiInteractions.length,
      practiceRunCount: journey.pitchDeck?.practiceRuns.length || 0,
    };

    return success(analytics);
  }

  private calculateIterativeDepth(journey: LearnerJourney): number {
    // Percentage of artifacts with 2+ versions
    const artifactsWithMultipleVersions = journey.artifacts.filter(a => a.versions.length >= 2);
    return journey.artifacts.length > 0
      ? (artifactsWithMultipleVersions.length / journey.artifacts.length) * 100
      : 0;
  }

  private calculateFeedbackClosure(journey: LearnerJourney): number {
    // Percentage of feedback pins resolved
    const allPins = journey.artifacts.flatMap(a =>
      a.peerReviews.flatMap(r => r.feedbackPins)
    );
    const resolvedPins = allPins.filter(p => p.resolved);
    return allPins.length > 0 ? (resolvedPins.length / allPins.length) * 100 : 100;
  }

  async getChallengeAnalytics(
    tenantId: string,
    challengeId: string
  ): Promise<Result<ChallengeAnalytics>> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.tenantId !== tenantId) {
      return failure({ code: 'DPA_056', message: 'Challenge not found' });
    }

    const journeys = Array.from(this.journeys.values())
      .filter(j => j.challengeId === challengeId);

    const analytics: ChallengeAnalytics = {
      challengeId,
      totalLearners: journeys.length,
      activeJourneys: journeys.filter(j => j.status === 'active').length,
      submittedJourneys: journeys.filter(j => j.status === 'submitted').length,
      gradedJourneys: journeys.filter(j => j.status === 'graded').length,
      averageIterativeDepth: this.average(journeys.map(j => this.calculateIterativeDepth(j))),
      averageFeedbackClosure: this.average(journeys.map(j => this.calculateFeedbackClosure(j))),
      averageScore: this.average(
        journeys
          .filter(j => j.pitchDeck?.finalScore)
          .map(j => j.pitchDeck!.finalScore!.totalScore)
      ),
      lmsSyncSuccess: 99.9, // Simulated
      phaseDistribution: this.calculatePhaseDistribution(journeys),
    };

    return success(analytics);
  }

  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculatePhaseDistribution(journeys: LearnerJourney[]): Record<JourneyPhase, number> {
    const distribution: Record<JourneyPhase, number> = {
      empathize_define: 0,
      ideate_prototype: 0,
      iterate_refine: 0,
      pitch_present: 0,
    };

    journeys.forEach(j => {
      distribution[j.currentPhase]++;
    });

    return distribution;
  }

  // ==========================================================================
  // Team Management
  // ==========================================================================

  async createTeam(
    tenantId: string,
    challengeId: string,
    name: string,
    members: { userId: string; displayName: string; email: string; skills?: string[] }[]
  ): Promise<Result<DesignTeam>> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.tenantId !== tenantId) {
      return failure({ code: 'DPA_057', message: 'Challenge not found' });
    }

    // Create journey for team
    const journeyResult = await this.startJourney(tenantId, challengeId, members[0].userId);
    if (!journeyResult.success) {
      return failure({ code: 'DPA_058', message: 'Failed to create team journey' });
    }

    const team: DesignTeam = {
      id: this.generateId(),
      tenantId,
      challengeId,
      name,
      members: members.map((m, i) => ({
        ...m,
        skills: m.skills || [],
        joinedAt: new Date(),
        role: i === 0 ? 'leader' : 'member',
        contributions: 0,
      })),
      roles: [],
      journeyId: journeyResult.data.id,
      status: 'forming',
      createdAt: new Date(),
    };

    this.teams.set(team.id, team);

    // Update journey with team ID
    journeyResult.data.teamId = team.id;

    return success(team);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface JourneyAnalytics {
  journeyId: string;
  iterativeDepth: number; // KPI: % of artifacts with 2+ versions
  feedbackLoopClosure: number; // KPI: % of pins resolved
  phaseCompletion: Record<JourneyPhase, number>;
  timeSpentByPhase: Record<JourneyPhase, number>; // minutes
  artifactVersions: number;
  peerReviewsGiven: number;
  peerReviewsReceived: number;
  aiInteractionCount: number;
  practiceRunCount: number;
}

export interface ChallengeAnalytics {
  challengeId: string;
  totalLearners: number;
  activeJourneys: number;
  submittedJourneys: number;
  gradedJourneys: number;
  averageIterativeDepth: number;
  averageFeedbackClosure: number;
  averageScore: number;
  lmsSyncSuccess: number; // KPI: 99.9% target
  phaseDistribution: Record<JourneyPhase, number>;
}

// ============================================================================
// Service Initialization
// ============================================================================

export function initializeDesignPitchAIService(): DesignPitchAIService {
  if (!designPitchServiceInstance) {
    designPitchServiceInstance = new DesignPitchAIService();
  }
  return designPitchServiceInstance;
}

export function getDesignPitchAIService(): DesignPitchAIService {
  if (!designPitchServiceInstance) {
    throw new Error('DesignPitchAIService not initialized. Call initializeDesignPitchAIService() first.');
  }
  return designPitchServiceInstance;
}
