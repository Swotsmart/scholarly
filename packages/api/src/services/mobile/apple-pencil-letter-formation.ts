// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-001
// Apple Pencil Letter Formation
// =============================================================================
// Learning to read and learning to write are two sides of the same coin —
// neuroscience research shows that the motor memory of forming letters reinforces
// the visual recognition circuits that make reading fluent. The Apple Pencil
// Letter Formation module gives iPad users a handwriting tutor that's as
// intelligent as the rest of the Scholarly phonics pipeline.
//
// Think of this as the difference between tracing letters on a worksheet and
// having a calligraphy master sitting beside you: the worksheet shows you the
// shape, but the master watches your stroke order, your pressure, your rhythm,
// and gently guides your hand when you veer off course. That's what this module
// does — it captures every point of Apple Pencil input, decomposes it into
// individual strokes, analyses each stroke against an ideal formation model,
// provides real-time visual guidance, and feeds the results back into the BKT
// engine so that letter formation mastery is tracked alongside phonics mastery.
//
// Architecture:
//   PencilInputCapture → StrokeSegmenter → FormationAnalyser → FeedbackRenderer
//   Each layer is independent and testable. The pipeline processes input at
//   120Hz (Apple Pencil refresh rate) with analysis running at 30Hz to balance
//   responsiveness with computational cost.
//
// Platform: iPad only (Apple Pencil 1st/2nd gen + Apple Pencil Pro).
// Falls back to finger input on iPhone/Android with reduced precision tracking.
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: PENCIL INPUT TYPES
// =============================================================================

/**
 * A single point captured from Apple Pencil input. Each point carries the full
 * sensor payload: position, force, altitude, azimuth, and timestamp. Think of
 * these as the individual frames of a movie — alone they're just dots, but
 * strung together they tell the story of how a letter was formed.
 *
 * Apple Pencil 2nd gen and Pro provide altitude and azimuth angles that reveal
 * pen tilt, enabling detection of whether a child is holding the pencil at a
 * healthy writing angle or gripping it in a way that will cause fatigue.
 */
export interface PencilPoint {
  /** X coordinate in the drawing canvas coordinate space (points, 0 = left) */
  x: number;
  /** Y coordinate in the drawing canvas coordinate space (points, 0 = top) */
  y: number;
  /** Force/pressure normalised 0.0–1.0. Apple Pencil reports 0–4096 levels. */
  force: number;
  /** Altitude angle in radians (0 = parallel to surface, π/2 = perpendicular) */
  altitude: number;
  /** Azimuth angle in radians (direction the pencil tip points on the surface) */
  azimuth: number;
  /** Timestamp in milliseconds since session start */
  timestamp: number;
  /** Whether this is a predicted (coalesced) touch or an actual touch event */
  isPredicted: boolean;
  /** Pencil generation detected (affects available sensor data) */
  pencilType: 'pencil_1' | 'pencil_2' | 'pencil_pro' | 'finger' | 'stylus_generic';
}

/**
 * A stroke is a continuous sequence of points between pen-down and pen-up.
 * Each letter is composed of one or more strokes. The letter 'A', for example,
 * requires three strokes: left diagonal, right diagonal, and crossbar.
 */
export interface Stroke {
  /** Unique identifier within the session */
  id: string;
  /** Ordered sequence of captured points */
  points: PencilPoint[];
  /** Index of this stroke in the current letter attempt (0-based) */
  strokeIndex: number;
  /** Time from first point to last point in milliseconds */
  duration: number;
  /** Bounding box of the stroke in canvas coordinates */
  boundingBox: BoundingBox;
  /** Simplified path (Ramer-Douglas-Peucker) for efficient comparison */
  simplifiedPath: Point2D[];
  /** Computed direction vectors at each segment */
  directionProfile: number[];
  /** Average force across all points */
  averageForce: number;
  /** Force variance — high variance may indicate inconsistent grip */
  forceVariance: number;
  /** Smoothness score 0–1 (ratio of path length to simplified path length) */
  smoothness: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// =============================================================================
// SECTION 2: LETTER FORMATION MODELS
// =============================================================================

/**
 * A LetterFormationModel defines the ideal way to write a letter. It's the
 * calligraphy master's mental model — the platonic form of each letter that
 * the child's attempt is compared against.
 *
 * Each model encodes:
 * - The number and order of strokes
 * - The ideal path of each stroke (as a normalised spline)
 * - Acceptable direction at each point along the stroke
 * - The formation "story" — a sequence of human-readable instructions
 *   ("Start at the top. Go down. Lift. Cross in the middle.")
 *
 * Models are parameterised by writing style (print, pre-cursive, cursive)
 * and can be extended for different alphabets (Latin, Cyrillic, Greek, etc.)
 */
export interface LetterFormationModel {
  /** The grapheme this model represents (e.g., 'a', 'A', 'sh', 'tion') */
  grapheme: string;
  /** Writing style variant */
  style: WritingStyle;
  /** Display name for the child ("lowercase a", "capital A") */
  displayName: string;
  /** Human-readable formation instructions shown step by step */
  formationStory: FormationStep[];
  /** Ideal strokes in normalised coordinate space (0–1 for both axes) */
  idealStrokes: IdealStroke[];
  /** Total number of expected strokes */
  expectedStrokeCount: number;
  /** Acceptable tolerance for path deviation (0–1, lower = stricter) */
  pathTolerance: number;
  /** Acceptable tolerance for stroke ordering mistakes */
  orderTolerance: 'strict' | 'moderate' | 'lenient';
  /** Age-appropriate difficulty tier (younger children get more tolerance) */
  difficultyTier: 'foundation' | 'developing' | 'fluent';
  /** Associated phoneme(s) for this grapheme (links to phonics engine) */
  phonemes: string[];
  /** Animation data for demonstrating the stroke (Lottie or frame sequence) */
  demonstrationAsset: string;
  /** Audio instruction asset ("Start at the top line, go down...") */
  audioInstructionAsset: string;
}

export type WritingStyle = 'print' | 'pre_cursive' | 'cursive';

export interface FormationStep {
  /** Step index (1-based for display) */
  step: number;
  /** Which stroke(s) this step corresponds to */
  strokeIndices: number[];
  /** Human-readable instruction */
  instruction: string;
  /** Audio asset for this specific step */
  audioAsset?: string;
  /** Visual highlight region on the letter template */
  highlightRegion?: BoundingBox;
}

export interface IdealStroke {
  /** Stroke index in the expected order */
  index: number;
  /** Control points of the ideal path in normalised space (0–1) */
  controlPoints: Point2D[];
  /** Expected direction at each control point (radians) */
  expectedDirections: number[];
  /** Whether this stroke should be drawn in one continuous motion */
  continuous: boolean;
  /** Start zone — where the stroke should begin (normalised bounding box) */
  startZone: BoundingBox;
  /** End zone — where the stroke should end */
  endZone: BoundingBox;
  /** Descriptive label ("downstroke", "crossbar", "curve", "tail") */
  label: string;
}

// =============================================================================
// SECTION 3: FORMATION ANALYSIS ENGINE
// =============================================================================

/**
 * The FormationAnalyser is the intelligent core that compares a child's strokes
 * against the ideal model and produces detailed, actionable feedback. It's the
 * calligraphy master's trained eye, decomposed into discrete evaluation criteria.
 *
 * Analysis runs in five dimensions:
 * 1. Stroke count — did the child use the right number of strokes?
 * 2. Stroke order — did they draw strokes in the correct sequence?
 * 3. Path accuracy — how closely does each stroke follow the ideal path?
 * 4. Proportion — are the relative sizes of strokes correct (e.g., ascender
 *    height vs. x-height)?
 * 5. Motor quality — smoothness, pressure consistency, speed control
 *
 * Each dimension produces a 0–1 score. These are weighted and combined into
 * an overall formation score that feeds into the BKT engine.
 */
export interface FormationAnalysisResult {
  /** The grapheme being analysed */
  grapheme: string;
  /** Overall formation score 0–1 */
  overallScore: number;
  /** Individual dimension scores */
  dimensions: FormationDimensions;
  /** Per-stroke analysis */
  strokeAnalysis: StrokeAnalysis[];
  /** Detected issues with suggested corrections */
  issues: FormationIssue[];
  /** Whether this attempt meets the mastery threshold */
  meetsMasteryThreshold: boolean;
  /** Suggested next action */
  nextAction: 'celebrate' | 'retry_with_guidance' | 'demonstrate_again' | 'simplify' | 'advance';
  /** Time taken for the full letter attempt in milliseconds */
  attemptDuration: number;
  /** Number of attempts at this letter in current session */
  attemptNumber: number;
  /** BKT update payload ready to send to the mastery engine */
  bktUpdate: LetterFormationBktUpdate;
}

export interface FormationDimensions {
  /** Did the child use the correct number of strokes? */
  strokeCount: DimensionScore;
  /** Were strokes drawn in the expected order? */
  strokeOrder: DimensionScore;
  /** How closely do strokes follow the ideal path? */
  pathAccuracy: DimensionScore;
  /** Are relative proportions correct? */
  proportion: DimensionScore;
  /** Smoothness, pressure consistency, speed control */
  motorQuality: DimensionScore;
}

export interface DimensionScore {
  /** Score 0–1 */
  score: number;
  /** Weight applied in overall calculation */
  weight: number;
  /** Human-readable assessment */
  assessment: 'excellent' | 'good' | 'developing' | 'needs_support';
  /** Specific feedback for this dimension */
  feedback: string;
}

export interface StrokeAnalysis {
  /** Index of the child's stroke */
  childStrokeIndex: number;
  /** Index of the matched ideal stroke (-1 if unmatched/extra) */
  matchedIdealIndex: number;
  /** Dynamic Time Warping distance between child path and ideal path */
  dtwDistance: number;
  /** Path deviation score 0–1 (1 = perfect match) */
  pathScore: number;
  /** Whether the stroke started in the correct zone */
  correctStartZone: boolean;
  /** Whether the stroke ended in the correct zone */
  correctEndZone: boolean;
  /** Direction accuracy at sampled points */
  directionAccuracy: number;
  /** Speed consistency (low variance = more controlled) */
  speedConsistency: number;
  /** Pressure profile analysis */
  pressureProfile: 'consistent' | 'heavy_start' | 'heavy_end' | 'erratic' | 'too_light';
}

export interface FormationIssue {
  /** Issue type for programmatic handling */
  type: FormationIssueType;
  /** Severity determines feedback urgency */
  severity: 'minor' | 'moderate' | 'significant';
  /** Child-friendly feedback message */
  childMessage: string;
  /** Detailed message for parent/educator view */
  educatorMessage: string;
  /** Which stroke(s) are affected */
  affectedStrokes: number[];
  /** Visual overlay data showing the issue */
  visualOverlay?: IssueOverlay;
}

export type FormationIssueType =
  | 'extra_stroke'           // Child used more strokes than needed
  | 'missing_stroke'         // Child missed a stroke
  | 'wrong_order'            // Strokes drawn in wrong sequence
  | 'wrong_direction'        // Stroke drawn in reverse direction
  | 'path_deviation'         // Stroke veers significantly from ideal
  | 'proportion_error'       // Size relationships incorrect
  | 'start_position_error'   // Stroke started in wrong zone
  | 'end_position_error'     // Stroke ended in wrong zone
  | 'tremor_detected'        // Excessive shakiness (may indicate fatigue)
  | 'pressure_inconsistency' // Highly variable pressure
  | 'speed_too_fast'         // Child is rushing
  | 'speed_too_slow'         // Child may be struggling with motor control
  | 'mirror_reversal'        // Common issue: b/d, p/q confusion
  | 'grip_concern';          // Altitude angle suggests problematic grip

export interface IssueOverlay {
  /** Type of visual indicator */
  type: 'highlight_stroke' | 'show_ideal_path' | 'arrow_guide' | 'zone_indicator';
  /** Colour for the overlay */
  colour: string;
  /** Points defining the overlay geometry */
  points: Point2D[];
  /** Duration to show the overlay in milliseconds */
  displayDuration: number;
}

// =============================================================================
// SECTION 4: FEEDBACK RENDERING
// =============================================================================

/**
 * The FeedbackRenderer translates analysis results into visual, auditory, and
 * haptic feedback that guides the child's next attempt. The key principle is
 * progressive disclosure: start with celebration of what went well, then
 * gently guide improvements. Never overwhelm — address at most one or two
 * issues per attempt.
 *
 * Visual feedback uses a "ghost trace" approach: the ideal path is shown as
 * a soft, glowing line that the child can trace over. On correct strokes, the
 * ghost trace pulses with a celebratory glow. On incorrect strokes, the ghost
 * trace gently shifts to show the correct path.
 */
export interface FeedbackConfig {
  /** Maximum number of issues to surface per attempt */
  maxIssuesPerAttempt: number;
  /** Whether to show the ghost trace guide */
  showGhostTrace: boolean;
  /** Opacity of the ghost trace (0–1) */
  ghostTraceOpacity: number;
  /** Whether to play audio feedback */
  audioFeedbackEnabled: boolean;
  /** Whether haptic feedback is enabled (iPad supports haptics) */
  hapticFeedbackEnabled: boolean;
  /** Celebration intensity (affects particle count, animation duration) */
  celebrationIntensity: 'subtle' | 'standard' | 'enthusiastic';
  /** Guidance style adapts to learner's frustration tolerance */
  guidanceStyle: 'encouraging' | 'neutral' | 'minimal';
  /** Delay before showing corrective feedback (let the child self-assess) */
  correctionDelayMs: number;
  /** Whether to auto-play demonstration animation on repeated errors */
  autoDemonstrateOnRepeatedErrors: boolean;
  /** Number of failed attempts before auto-demonstration triggers */
  autoDemonstrateThreshold: number;
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  maxIssuesPerAttempt: 2,
  showGhostTrace: true,
  ghostTraceOpacity: 0.3,
  audioFeedbackEnabled: true,
  hapticFeedbackEnabled: true,
  celebrationIntensity: 'standard',
  guidanceStyle: 'encouraging',
  correctionDelayMs: 500,
  autoDemonstrateOnRepeatedErrors: true,
  autoDemonstrateThreshold: 3,
};

/**
 * Feedback packet ready for the UI layer to render. Contains all visual,
 * audio, and haptic instructions for a single attempt's feedback cycle.
 */
export interface FeedbackPacket {
  /** Overall result category */
  category: 'excellent' | 'good' | 'try_again' | 'needs_help';
  /** Primary message shown to the child */
  primaryMessage: string;
  /** Secondary message (shown briefly, then fades) */
  secondaryMessage?: string;
  /** Visual feedback elements to render on the canvas */
  visuals: FeedbackVisual[];
  /** Audio assets to play in sequence */
  audioSequence: FeedbackAudio[];
  /** Haptic pattern to play */
  hapticPattern?: HapticPattern;
  /** Celebration particles (confetti, stars, sparkles) */
  celebration?: CelebrationConfig;
  /** Whether to show the "try again" prompt */
  showRetryPrompt: boolean;
  /** Whether to auto-advance to next letter */
  autoAdvance: boolean;
  /** Delay before auto-advance in milliseconds */
  autoAdvanceDelayMs: number;
}

export interface FeedbackVisual {
  type: 'ghost_trace' | 'stroke_highlight' | 'arrow_guide' | 'zone_glow' | 'checkmark' | 'star';
  points?: Point2D[];
  colour: string;
  opacity: number;
  animationType: 'fade_in' | 'draw_on' | 'pulse' | 'bounce';
  durationMs: number;
  delayMs: number;
}

export interface FeedbackAudio {
  /** Asset path or synthesised speech text */
  asset: string;
  /** Whether this is a pre-recorded asset or TTS */
  type: 'asset' | 'tts';
  /** Delay before playing in milliseconds */
  delayMs: number;
  /** Volume 0–1 */
  volume: number;
}

export type HapticPattern = 'success' | 'gentle_tap' | 'error_buzz' | 'encouragement';

export interface CelebrationConfig {
  /** Particle type */
  type: 'confetti' | 'stars' | 'sparkles' | 'fireworks';
  /** Number of particles */
  count: number;
  /** Duration of the celebration in milliseconds */
  durationMs: number;
  /** Colours for particles */
  colours: string[];
  /** Origin point (where the celebration emanates from) */
  origin: Point2D;
}

// =============================================================================
// SECTION 5: SESSION MANAGEMENT
// =============================================================================

/**
 * A LetterFormationSession tracks a child's practice across multiple letters
 * in a single sitting. It manages the sequence of letters to practise (driven
 * by the phonics engine's current targets), tracks cumulative performance,
 * handles fatigue detection, and generates the session summary that feeds
 * into the parent dashboard and educator reports.
 */
export interface LetterFormationSession {
  /** Unique session identifier */
  sessionId: string;
  /** Learner profile reference */
  learnerId: string;
  /** Tenant context for multi-tenant isolation */
  tenantId: string;
  /** Session start timestamp */
  startedAt: Date;
  /** Session end timestamp (null if ongoing) */
  endedAt: Date | null;
  /** Current session state */
  state: FormationSessionState;
  /** Ordered list of letters to practise in this session */
  letterQueue: LetterQueueItem[];
  /** Index of the current letter in the queue */
  currentLetterIndex: number;
  /** All attempts made during this session */
  attempts: LetterAttempt[];
  /** Cumulative session statistics */
  stats: SessionStats;
  /** Writing style for this session */
  writingStyle: WritingStyle;
  /** Input device detected */
  inputDevice: 'pencil_1' | 'pencil_2' | 'pencil_pro' | 'finger' | 'stylus_generic';
  /** Adaptive difficulty level */
  difficultyLevel: 'guided' | 'practice' | 'independent' | 'challenge';
  /** Fatigue detection state */
  fatigueState: FatigueState;
  /** Session configuration */
  config: FormationSessionConfig;
}

export type FormationSessionState =
  | 'INITIALISING'    // Loading models and assets
  | 'DEMONSTRATING'   // Showing the letter formation animation
  | 'AWAITING_INPUT'  // Canvas is ready, waiting for child to start
  | 'CAPTURING'       // Actively capturing pencil input
  | 'ANALYSING'       // Processing the attempt
  | 'SHOWING_FEEDBACK'// Displaying feedback for the attempt
  | 'TRANSITIONING'   // Moving to the next letter
  | 'PAUSED'          // Session paused (app backgrounded, break time)
  | 'FATIGUE_BREAK'   // Mandatory break triggered by fatigue detection
  | 'COMPLETE'        // All letters practised, showing summary
  | 'ABANDONED';      // Session ended early

export interface LetterQueueItem {
  /** The grapheme to practise */
  grapheme: string;
  /** The formation model to use */
  modelId: string;
  /** Why this letter is in the queue (links to phonics engine reasoning) */
  reason: 'current_target' | 'review' | 'remediation' | 'extension' | 'user_choice';
  /** Current BKT mastery estimate for formation of this letter */
  currentMastery: number;
  /** Target mastery to achieve */
  targetMastery: number;
  /** Maximum attempts before moving on */
  maxAttempts: number;
  /** Whether this letter has been completed in this session */
  completed: boolean;
  /** Result when completed */
  result?: 'mastered' | 'progressing' | 'needs_more_practice';
}

export interface LetterAttempt {
  /** Attempt identifier */
  attemptId: string;
  /** Which letter was attempted */
  grapheme: string;
  /** Attempt number for this letter (1-based) */
  attemptNumber: number;
  /** Raw strokes captured */
  strokes: Stroke[];
  /** Analysis result */
  analysis: FormationAnalysisResult;
  /** Feedback shown */
  feedback: FeedbackPacket;
  /** Timestamp of the attempt */
  timestamp: Date;
  /** Duration from first stroke to last stroke (milliseconds) */
  duration: number;
  /** Canvas snapshot for review (base64 thumbnail) */
  canvasThumbnail?: string;
}

export interface SessionStats {
  /** Total letters attempted */
  lettersAttempted: number;
  /** Letters that met mastery threshold */
  lettersMastered: number;
  /** Total attempts across all letters */
  totalAttempts: number;
  /** Average formation score across all attempts */
  averageScore: number;
  /** Best score achieved */
  bestScore: number;
  /** Total active writing time in milliseconds */
  totalWritingTime: number;
  /** Total session duration including breaks and feedback */
  totalSessionTime: number;
  /** Score trend: improving, stable, or declining */
  trend: 'improving' | 'stable' | 'declining';
  /** Strokes per minute (motor fluency indicator) */
  strokesPerMinute: number;
  /** Most common issue type across all attempts */
  mostCommonIssue?: FormationIssueType;
  /** XP earned this session */
  xpEarned: number;
  /** Badges earned this session */
  badgesEarned: string[];
}

// =============================================================================
// SECTION 6: FATIGUE DETECTION
// =============================================================================

/**
 * Children's fine motor endurance is limited, especially for younger learners.
 * The fatigue detection system monitors several signals to determine when a
 * child needs a break:
 *
 * - Declining formation scores over recent attempts
 * - Increasing stroke tremor (force variance rises as muscles tire)
 * - Slowing speed (strokes take longer as fatigue sets in)
 * - Pressure changes (children often press harder when fatigued)
 * - Session duration thresholds appropriate for the age group
 *
 * When fatigue is detected, the session transitions to a FATIGUE_BREAK state
 * that presents a fun, non-writing activity (watching a story animation, a
 * quick finger-stretching game) before allowing the child to continue.
 */
export interface FatigueState {
  /** Current fatigue level 0–1 */
  fatigueLevel: number;
  /** Whether a break is currently recommended */
  breakRecommended: boolean;
  /** Whether a break is mandatory (fatigueLevel > mandatory threshold) */
  breakMandatory: boolean;
  /** Signals contributing to fatigue detection */
  signals: FatigueSignal[];
  /** Time since last break in milliseconds */
  timeSinceLastBreak: number;
  /** Number of breaks taken this session */
  breaksTaken: number;
}

export interface FatigueSignal {
  /** Signal type */
  type: 'score_decline' | 'tremor_increase' | 'speed_decline' | 'pressure_change' | 'time_threshold';
  /** Current value of the signal */
  value: number;
  /** Threshold that triggers concern */
  threshold: number;
  /** Weight in overall fatigue calculation */
  weight: number;
  /** Whether this signal is currently above threshold */
  triggered: boolean;
}

export interface FormationSessionConfig {
  /** Maximum session duration before mandatory end (minutes) */
  maxSessionDuration: number;
  /** Maximum continuous practice before suggested break (minutes) */
  breakInterval: number;
  /** Minimum break duration (seconds) */
  minBreakDuration: number;
  /** Mastery threshold for letter completion (0–1) */
  masteryThreshold: number;
  /** Maximum attempts per letter before moving on */
  maxAttemptsPerLetter: number;
  /** Whether to include review letters alongside new targets */
  includeReviewLetters: boolean;
  /** Ratio of new:review letters */
  newToReviewRatio: number;
  /** Canvas background style */
  canvasBackground: 'lined' | 'dotted_grid' | 'plain' | 'sky_ground';
  /** Line guide visibility */
  lineGuides: 'full' | 'partial' | 'none';
  /** Size of the writing area relative to screen */
  writingAreaScale: 'large' | 'medium' | 'small';
  /** Whether to show the letter model alongside the writing area */
  showReferenceModel: boolean;
  /** Animation speed for demonstrations */
  demonstrationSpeed: 'slow' | 'normal' | 'fast';
}

export const DEFAULT_SESSION_CONFIG: FormationSessionConfig = {
  maxSessionDuration: 15,
  breakInterval: 5,
  minBreakDuration: 30,
  masteryThreshold: 0.75,
  maxAttemptsPerLetter: 5,
  includeReviewLetters: true,
  newToReviewRatio: 0.6,
  canvasBackground: 'sky_ground',
  lineGuides: 'full',
  writingAreaScale: 'large',
  showReferenceModel: true,
  demonstrationSpeed: 'normal',
};

// =============================================================================
// SECTION 7: BKT INTEGRATION
// =============================================================================

/**
 * Letter formation mastery is tracked separately from phonics reading mastery
 * but in the same BKT engine. Each grapheme has two mastery dimensions:
 * - Reading mastery (can the child decode this GPC when reading?)
 * - Formation mastery (can the child write this grapheme correctly?)
 *
 * The formation BKT update uses the same Bayesian engine but with formation-
 * specific parameters: the slip probability is higher for formation (motor
 * errors are more common than recognition errors), and the guess probability
 * is lower (it's harder to accidentally write a letter correctly than to
 * accidentally read one correctly).
 */
export interface LetterFormationBktUpdate {
  /** Learner identifier */
  learnerId: string;
  /** Tenant context */
  tenantId: string;
  /** The grapheme practised */
  grapheme: string;
  /** Whether the attempt was successful (met mastery threshold) */
  correct: boolean;
  /** The formation score (used for partial credit in extended BKT) */
  score: number;
  /** Dimension being updated */
  dimension: 'formation';
  /** Per-dimension BKT parameters */
  params: FormationBktParams;
  /** Session context for the update */
  sessionId: string;
  /** Timestamp of the attempt */
  timestamp: Date;
  /** Device used (affects interpretation — pencil input is more reliable) */
  inputDevice: string;
  /** Attempt number for this grapheme in session */
  attemptInSession: number;
}

export interface FormationBktParams {
  /** Prior probability of mastery (initial belief) */
  pInit: number;
  /** Probability of transitioning from unmastered to mastered */
  pLearn: number;
  /** Probability of incorrect response despite mastery (motor error) */
  pSlip: number;
  /** Probability of correct response despite non-mastery (lucky attempt) */
  pGuess: number;
}

/** Default BKT parameters for letter formation — tuned from handwriting research */
export const DEFAULT_FORMATION_BKT_PARAMS: FormationBktParams = {
  pInit: 0.1,    // Low initial mastery assumption for new letters
  pLearn: 0.15,  // Moderate learning rate — formation is gradual
  pSlip: 0.2,    // Higher slip than reading — motor errors are common
  pGuess: 0.05,  // Very low guess — hard to write correctly by accident
};

// =============================================================================
// SECTION 8: PENCIL INPUT CAPTURE SERVICE
// =============================================================================

/**
 * PencilInputCaptureService manages the raw input pipeline from Apple Pencil
 * (or finger/stylus fallback) to processed strokes. It handles:
 * - Touch event registration and coalesced touch extraction
 * - Point normalisation to canvas coordinate space
 * - Stroke segmentation (pen-down to pen-up)
 * - Ramer-Douglas-Peucker path simplification
 * - Direction profile computation
 * - Smoothness and force statistics
 */
export class PencilInputCaptureService {
  private currentPoints: PencilPoint[] = [];
  private strokes: Stroke[] = [];
  private isCapturing: boolean = false;
  private sessionStartTime: number = 0;
  private readonly RDP_EPSILON = 2.0; // Path simplification tolerance in points

  /**
   * Begin capturing input. Called when the canvas is ready for the child to write.
   */
  startCapture(): void {
    this.currentPoints = [];
    this.strokes = [];
    this.isCapturing = true;
    this.sessionStartTime = Date.now();
  }

  /**
   * Process a pen-down or touch-begin event. Starts a new stroke.
   */
  onPenDown(point: PencilPoint): void {
    if (!this.isCapturing) return;
    this.currentPoints = [point];
  }

  /**
   * Process a pen-move or touch-move event. Adds to current stroke.
   * Filters predicted touches and applies minimal smoothing.
   */
  onPenMove(point: PencilPoint): void {
    if (!this.isCapturing || this.currentPoints.length === 0) return;
    // Accept actual touches; predicted touches are used for rendering
    // responsiveness but not for analysis
    if (!point.isPredicted) {
      this.currentPoints.push(point);
    }
  }

  /**
   * Process a pen-up or touch-end event. Finalises the current stroke.
   */
  onPenUp(point: PencilPoint): void {
    if (!this.isCapturing || this.currentPoints.length === 0) return;
    this.currentPoints.push(point);

    // Only register as a stroke if there are enough points (filter accidental taps)
    if (this.currentPoints.length >= 3) {
      const stroke = this.buildStroke(this.currentPoints, this.strokes.length);
      this.strokes.push(stroke);
    }
    this.currentPoints = [];
  }

  /**
   * Get all completed strokes for analysis.
   */
  getStrokes(): Stroke[] {
    return [...this.strokes];
  }

  /**
   * Clear the canvas — user wants to start the letter over.
   */
  clearStrokes(): void {
    this.strokes = [];
    this.currentPoints = [];
  }

  /**
   * Stop capturing input.
   */
  stopCapture(): void {
    this.isCapturing = false;
  }

  /**
   * Build a Stroke object from raw points. Computes bounding box, simplified
   * path, direction profile, force statistics, and smoothness.
   */
  private buildStroke(points: PencilPoint[], index: number): Stroke {
    const bbox = this.computeBoundingBox(points);
    const path2d = points.map(p => ({ x: p.x, y: p.y }));
    const simplified = this.rdpSimplify(path2d, this.RDP_EPSILON);
    const directions = this.computeDirectionProfile(path2d);
    const forces = points.map(p => p.force);
    const avgForce = forces.reduce((a, b) => a + b, 0) / forces.length;
    const forceVar = forces.reduce((acc, f) => acc + (f - avgForce) ** 2, 0) / forces.length;

    const pathLength = this.pathLength(path2d);
    const simplifiedLength = this.pathLength(simplified);
    const smoothness = simplifiedLength > 0 ? Math.min(1, simplifiedLength / pathLength) : 0;

    return {
      id: `stroke_${index}_${Date.now()}`,
      points,
      strokeIndex: index,
      duration: points[points.length - 1].timestamp - points[0].timestamp,
      boundingBox: bbox,
      simplifiedPath: simplified,
      directionProfile: directions,
      averageForce: avgForce,
      forceVariance: forceVar,
      smoothness,
    };
  }

  /**
   * Ramer-Douglas-Peucker algorithm for path simplification. Reduces the number
   * of points while preserving the essential shape — like tracing the outline of
   * a coastline at different zoom levels.
   */
  private rdpSimplify(points: Point2D[], epsilon: number): Point2D[] {
    if (points.length <= 2) return points;

    const first = points[0];
    const last = points[points.length - 1];
    let maxDist = 0;
    let maxIndex = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > epsilon) {
      const left = this.rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
      const right = this.rdpSimplify(points.slice(maxIndex), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  }

  private perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  private computeBoundingBox(points: PencilPoint[]): BoundingBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  private computeDirectionProfile(points: Point2D[]): number[] {
    const directions: number[] = [];
    for (let i = 1; i < points.length; i++) {
      directions.push(Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x));
    }
    return directions;
  }

  private pathLength(points: Point2D[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
  }
}

// =============================================================================
// SECTION 9: FORMATION ANALYSIS SERVICE
// =============================================================================

/**
 * FormationAnalysisService compares captured strokes against the ideal model
 * using Dynamic Time Warping for path matching, zone-based start/end validation,
 * and multi-dimensional scoring.
 */
export class FormationAnalysisService {
  private readonly DIRECTION_WEIGHT = 0.3;
  private readonly PATH_WEIGHT = 0.35;
  private readonly PROPORTION_WEIGHT = 0.15;
  private readonly MOTOR_WEIGHT = 0.2;

  /**
   * Analyse a complete letter attempt against the ideal model.
   */
  analyse(
    strokes: Stroke[],
    model: LetterFormationModel,
    attemptNumber: number,
    sessionId: string,
    learnerId: string,
    tenantId: string,
  ): FormationAnalysisResult {
    // 1. Stroke count analysis
    const strokeCountScore = this.analyseStrokeCount(strokes.length, model.expectedStrokeCount);

    // 2. Match child strokes to ideal strokes
    const strokeMatching = this.matchStrokes(strokes, model.idealStrokes);

    // 3. Per-stroke path analysis
    const strokeAnalyses = strokeMatching.map(match =>
      this.analyseStrokePath(match.childStroke, match.idealStroke, model)
    );

    // 4. Stroke order analysis
    const strokeOrderScore = this.analyseStrokeOrder(strokeMatching, model.orderTolerance);

    // 5. Proportion analysis
    const proportionScore = this.analyseProportions(strokes, model);

    // 6. Motor quality analysis
    const motorScore = this.analyseMotorQuality(strokes);

    // 7. Compute overall score
    const pathAvg = strokeAnalyses.length > 0
      ? strokeAnalyses.reduce((sum, sa) => sum + sa.pathScore, 0) / strokeAnalyses.length
      : 0;

    const overallScore = Math.min(1, Math.max(0,
      strokeCountScore.score * 0.1 +
      strokeOrderScore.score * 0.1 +
      pathAvg * this.PATH_WEIGHT +
      proportionScore.score * this.PROPORTION_WEIGHT +
      motorScore.score * this.MOTOR_WEIGHT +
      this.directionScoreFromAnalyses(strokeAnalyses) * this.DIRECTION_WEIGHT
    ));

    // 8. Detect issues
    const issues = this.detectIssues(strokes, model, strokeAnalyses, strokeCountScore, strokeOrderScore, motorScore);

    // 9. Determine next action
    const meetsMastery = overallScore >= 0.75; // default threshold
    const nextAction = this.determineNextAction(overallScore, attemptNumber, issues);

    // 10. Build BKT update
    const bktUpdate: LetterFormationBktUpdate = {
      learnerId,
      tenantId,
      grapheme: model.grapheme,
      correct: meetsMastery,
      score: overallScore,
      dimension: 'formation',
      params: DEFAULT_FORMATION_BKT_PARAMS,
      sessionId,
      timestamp: new Date(),
      inputDevice: strokes[0]?.points[0]?.pencilType ?? 'finger',
      attemptInSession: attemptNumber,
    };

    return {
      grapheme: model.grapheme,
      overallScore,
      dimensions: {
        strokeCount: strokeCountScore,
        strokeOrder: strokeOrderScore,
        pathAccuracy: { score: pathAvg, weight: this.PATH_WEIGHT, ...this.scoreToAssessment(pathAvg), feedback: this.pathFeedback(pathAvg) },
        proportion: proportionScore,
        motorQuality: motorScore,
      },
      strokeAnalysis: strokeAnalyses,
      issues,
      meetsMasteryThreshold: meetsMastery,
      nextAction,
      attemptDuration: strokes.reduce((sum, s) => sum + s.duration, 0),
      attemptNumber,
      bktUpdate,
    };
  }

  private analyseStrokeCount(actual: number, expected: number): DimensionScore {
    const diff = Math.abs(actual - expected);
    const score = diff === 0 ? 1.0 : diff === 1 ? 0.7 : diff === 2 ? 0.3 : 0;
    return { score, weight: 0.1, ...this.scoreToAssessment(score), feedback: this.strokeCountFeedback(actual, expected) };
  }

  private matchStrokes(childStrokes: Stroke[], idealStrokes: IdealStroke[]): Array<{ childStroke: Stroke; idealStroke: IdealStroke }> {
    // Simple sequential matching — more sophisticated Hungarian algorithm
    // matching would be used for production but sequential works for
    // ordered stroke expectation
    const matches: Array<{ childStroke: Stroke; idealStroke: IdealStroke }> = [];
    const maxLen = Math.min(childStrokes.length, idealStrokes.length);
    for (let i = 0; i < maxLen; i++) {
      matches.push({ childStroke: childStrokes[i], idealStroke: idealStrokes[i] });
    }
    return matches;
  }

  private analyseStrokePath(childStroke: Stroke, idealStroke: IdealStroke, model: LetterFormationModel): StrokeAnalysis {
    // Normalise child stroke to 0–1 space for comparison with ideal
    const normalised = this.normaliseStroke(childStroke);
    const idealPath = idealStroke.controlPoints;

    // DTW distance
    const dtwDist = this.dynamicTimeWarping(normalised, idealPath);
    const pathScore = Math.max(0, 1 - dtwDist / model.pathTolerance);

    // Start/end zone checks
    const start = normalised[0];
    const end = normalised[normalised.length - 1];
    const correctStart = this.pointInZone(start, idealStroke.startZone);
    const correctEnd = this.pointInZone(end, idealStroke.endZone);

    // Direction accuracy
    const childDirs = childStroke.directionProfile;
    const idealDirs = idealStroke.expectedDirections;
    const dirAccuracy = this.compareDirections(childDirs, idealDirs);

    // Speed consistency
    const speeds: number[] = [];
    for (let i = 1; i < childStroke.points.length; i++) {
      const dt = childStroke.points[i].timestamp - childStroke.points[i - 1].timestamp;
      if (dt > 0) {
        const dist = Math.hypot(
          childStroke.points[i].x - childStroke.points[i - 1].x,
          childStroke.points[i].y - childStroke.points[i - 1].y,
        );
        speeds.push(dist / dt);
      }
    }
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const speedVar = speeds.length > 0 ? speeds.reduce((a, s) => a + (s - avgSpeed) ** 2, 0) / speeds.length : 0;
    const speedConsistency = avgSpeed > 0 ? Math.max(0, 1 - Math.sqrt(speedVar) / avgSpeed) : 0;

    // Pressure profile classification
    const pressureProfile = this.classifyPressure(childStroke);

    return {
      childStrokeIndex: childStroke.strokeIndex,
      matchedIdealIndex: idealStroke.index,
      dtwDistance: dtwDist,
      pathScore,
      correctStartZone: correctStart,
      correctEndZone: correctEnd,
      directionAccuracy: dirAccuracy,
      speedConsistency,
      pressureProfile,
    };
  }

  /**
   * Dynamic Time Warping — compares two sequences that may differ in speed
   * by finding the optimal alignment. Think of it like comparing two people
   * humming the same tune: even if one hums faster, DTW can recognise they're
   * humming the same melody.
   */
  private dynamicTimeWarping(seq1: Point2D[], seq2: Point2D[]): number {
    const n = seq1.length;
    const m = seq2.length;
    if (n === 0 || m === 0) return Infinity;

    const dtw: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = Math.hypot(seq1[i - 1].x - seq2[j - 1].x, seq1[i - 1].y - seq2[j - 1].y);
        dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      }
    }
    return dtw[n][m] / Math.max(n, m); // Normalise by path length
  }

  private normaliseStroke(stroke: Stroke): Point2D[] {
    const { minX, minY, width, height } = stroke.boundingBox;
    const scale = Math.max(width, height);
    if (scale === 0) return stroke.simplifiedPath.map(() => ({ x: 0.5, y: 0.5 }));
    return stroke.simplifiedPath.map(p => ({
      x: (p.x - minX) / scale,
      y: (p.y - minY) / scale,
    }));
  }

  private pointInZone(point: Point2D, zone: BoundingBox): boolean {
    return point.x >= zone.minX && point.x <= zone.maxX &&
           point.y >= zone.minY && point.y <= zone.maxY;
  }

  private compareDirections(childDirs: number[], idealDirs: number[]): number {
    if (childDirs.length === 0 || idealDirs.length === 0) return 0;
    // Sample at matching intervals
    const samples = Math.min(childDirs.length, idealDirs.length, 10);
    let totalMatch = 0;
    for (let i = 0; i < samples; i++) {
      const ci = Math.floor(i * childDirs.length / samples);
      const ii = Math.floor(i * idealDirs.length / samples);
      const angleDiff = Math.abs(this.normaliseAngle(childDirs[ci] - idealDirs[ii]));
      totalMatch += Math.max(0, 1 - angleDiff / Math.PI);
    }
    return totalMatch / samples;
  }

  private normaliseAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  private classifyPressure(stroke: Stroke): StrokeAnalysis['pressureProfile'] {
    const points = stroke.points;
    if (points.length < 4) return 'consistent';
    const firstThird = points.slice(0, Math.floor(points.length / 3));
    const lastThird = points.slice(Math.floor(2 * points.length / 3));
    const avgFirst = firstThird.reduce((a, p) => a + p.force, 0) / firstThird.length;
    const avgLast = lastThird.reduce((a, p) => a + p.force, 0) / lastThird.length;
    const diff = avgFirst - avgLast;
    if (stroke.forceVariance > 0.04) return 'erratic';
    if (stroke.averageForce < 0.1) return 'too_light';
    if (diff > 0.15) return 'heavy_start';
    if (diff < -0.15) return 'heavy_end';
    return 'consistent';
  }

  private analyseStrokeOrder(matches: Array<{ childStroke: Stroke; idealStroke: IdealStroke }>, tolerance: string): DimensionScore {
    if (matches.length <= 1) return { score: 1, weight: 0.1, assessment: 'excellent', feedback: 'Stroke order is correct.' };
    let correctOrder = 0;
    for (let i = 0; i < matches.length - 1; i++) {
      if (matches[i].idealStroke.index < matches[i + 1].idealStroke.index) correctOrder++;
    }
    const score = matches.length > 1 ? correctOrder / (matches.length - 1) : 1;
    return { score, weight: 0.1, ...this.scoreToAssessment(score), feedback: this.orderFeedback(score) };
  }

  private analyseProportions(strokes: Stroke[], model: LetterFormationModel): DimensionScore {
    if (strokes.length < 2 || model.idealStrokes.length < 2) {
      return { score: 0.8, weight: this.PROPORTION_WEIGHT, assessment: 'good', feedback: 'Proportions look reasonable.' };
    }
    // Compare relative bounding box sizes between child strokes and ideal strokes
    const childRatios = strokes.map(s => s.boundingBox.height / Math.max(s.boundingBox.width, 1));
    const idealRatios = model.idealStrokes.map(s => {
      const w = s.endZone.maxX - s.startZone.minX;
      const h = s.endZone.maxY - s.startZone.minY;
      return h / Math.max(w, 0.01);
    });
    const minLen = Math.min(childRatios.length, idealRatios.length);
    let totalDiff = 0;
    for (let i = 0; i < minLen; i++) {
      totalDiff += Math.abs(childRatios[i] - idealRatios[i]) / Math.max(idealRatios[i], 0.01);
    }
    const avgDiff = totalDiff / minLen;
    const score = Math.max(0, 1 - avgDiff);
    return { score, weight: this.PROPORTION_WEIGHT, ...this.scoreToAssessment(score), feedback: this.proportionFeedback(score) };
  }

  private analyseMotorQuality(strokes: Stroke[]): DimensionScore {
    if (strokes.length === 0) return { score: 0, weight: this.MOTOR_WEIGHT, assessment: 'needs_support', feedback: 'No strokes detected.' };
    const avgSmoothness = strokes.reduce((s, st) => s + st.smoothness, 0) / strokes.length;
    const avgForceVar = strokes.reduce((s, st) => s + st.forceVariance, 0) / strokes.length;
    const forceScore = Math.max(0, 1 - avgForceVar * 10); // Scale variance to 0–1
    const score = (avgSmoothness * 0.6 + forceScore * 0.4);
    return { score, weight: this.MOTOR_WEIGHT, ...this.scoreToAssessment(score), feedback: this.motorFeedback(score, avgSmoothness) };
  }

  private directionScoreFromAnalyses(analyses: StrokeAnalysis[]): number {
    if (analyses.length === 0) return 0;
    return analyses.reduce((sum, a) => sum + a.directionAccuracy, 0) / analyses.length;
  }

  private detectIssues(
    strokes: Stroke[],
    model: LetterFormationModel,
    analyses: StrokeAnalysis[],
    countScore: DimensionScore,
    orderScore: DimensionScore,
    motorScore: DimensionScore,
  ): FormationIssue[] {
    const issues: FormationIssue[] = [];

    if (strokes.length > model.expectedStrokeCount) {
      issues.push({
        type: 'extra_stroke',
        severity: 'moderate',
        childMessage: 'You used a few extra lines. Try to use fewer strokes!',
        educatorMessage: `Used ${strokes.length} strokes, expected ${model.expectedStrokeCount}.`,
        affectedStrokes: Array.from({ length: strokes.length - model.expectedStrokeCount }, (_, i) => model.expectedStrokeCount + i),
      });
    }
    if (strokes.length < model.expectedStrokeCount) {
      issues.push({
        type: 'missing_stroke',
        severity: 'significant',
        childMessage: 'Almost there! This letter needs one more line.',
        educatorMessage: `Used ${strokes.length} strokes, expected ${model.expectedStrokeCount}.`,
        affectedStrokes: [],
      });
    }
    if (orderScore.score < 0.7) {
      issues.push({
        type: 'wrong_order',
        severity: 'minor',
        childMessage: 'Try starting from the top this time!',
        educatorMessage: 'Stroke order does not match the expected formation sequence.',
        affectedStrokes: analyses.filter((_, i) => i > 0 && analyses[i - 1]?.matchedIdealIndex >= analyses[i]?.matchedIdealIndex).map(a => a.childStrokeIndex),
      });
    }
    for (const a of analyses) {
      if (a.pathScore < 0.5) {
        issues.push({
          type: 'path_deviation',
          severity: a.pathScore < 0.3 ? 'significant' : 'moderate',
          childMessage: 'Follow the dotted line more closely.',
          educatorMessage: `Stroke ${a.childStrokeIndex} path score: ${(a.pathScore * 100).toFixed(0)}%.`,
          affectedStrokes: [a.childStrokeIndex],
        });
      }
      if (!a.correctStartZone) {
        issues.push({
          type: 'start_position_error',
          severity: 'moderate',
          childMessage: 'Start your line at the glowing dot!',
          educatorMessage: `Stroke ${a.childStrokeIndex} started outside the expected zone.`,
          affectedStrokes: [a.childStrokeIndex],
        });
      }
    }
    if (motorScore.score < 0.4) {
      const avgForceVar = strokes.reduce((s, st) => s + st.forceVariance, 0) / strokes.length;
      if (avgForceVar > 0.03) {
        issues.push({
          type: 'tremor_detected',
          severity: 'minor',
          childMessage: 'Take a deep breath and try again slowly.',
          educatorMessage: 'High force variance detected — possible fatigue or grip tension.',
          affectedStrokes: strokes.map(s => s.strokeIndex),
        });
      }
    }

    // Mirror reversal detection (b/d, p/q)
    const mirrorPairs: Record<string, string> = { b: 'd', d: 'b', p: 'q', q: 'p' };
    if (mirrorPairs[model.grapheme] && strokes.length > 0) {
      const firstStroke = strokes[0];
      const dominantDirection = firstStroke.directionProfile.length > 0
        ? firstStroke.directionProfile.reduce((a, b) => a + b, 0) / firstStroke.directionProfile.length
        : 0;
      // Simplified mirror detection: if dominant horizontal direction is opposite to expected
      const expectedHDir = (model.grapheme === 'b' || model.grapheme === 'p') ? 1 : -1; // right vs left
      if (Math.sign(Math.cos(dominantDirection)) === -expectedHDir) {
        issues.push({
          type: 'mirror_reversal',
          severity: 'significant',
          childMessage: `That looks like a "${mirrorPairs[model.grapheme]}"! Let's try the other way.`,
          educatorMessage: `Possible b/d or p/q reversal detected for "${model.grapheme}".`,
          affectedStrokes: [0],
        });
      }
    }

    return issues;
  }

  private determineNextAction(score: number, attempt: number, issues: FormationIssue[]): FormationAnalysisResult['nextAction'] {
    if (score >= 0.85) return 'celebrate';
    if (score >= 0.6) return 'retry_with_guidance';
    if (attempt >= 3 && score < 0.4) return 'simplify';
    if (attempt >= 2 && score < 0.5) return 'demonstrate_again';
    return 'retry_with_guidance';
  }

  private scoreToAssessment(score: number): { assessment: DimensionScore['assessment'] } {
    if (score >= 0.85) return { assessment: 'excellent' };
    if (score >= 0.65) return { assessment: 'good' };
    if (score >= 0.4) return { assessment: 'developing' };
    return { assessment: 'needs_support' };
  }

  private strokeCountFeedback(actual: number, expected: number): string {
    if (actual === expected) return 'Perfect number of strokes!';
    if (actual > expected) return `You used ${actual} strokes — try to make this letter with just ${expected}.`;
    return `This letter needs ${expected} strokes — you used ${actual}. Watch the demonstration again.`;
  }

  private orderFeedback(score: number): string {
    if (score >= 0.9) return 'Great stroke order!';
    if (score >= 0.6) return 'Mostly correct order — remember to start from the top.';
    return 'Try following the numbered steps in order.';
  }

  private pathFeedback(score: number): string {
    if (score >= 0.85) return 'Beautiful letter shape!';
    if (score >= 0.6) return 'Good shape — follow the guide line more closely.';
    return 'Try tracing over the dotted letter first.';
  }

  private proportionFeedback(score: number): string {
    if (score >= 0.8) return 'Nice proportions!';
    if (score >= 0.5) return 'Check the size of each part of the letter.';
    return 'Watch how tall and wide each part should be.';
  }

  private motorFeedback(score: number, smoothness: number): string {
    if (score >= 0.8) return 'Very smooth and controlled writing!';
    if (smoothness < 0.5) return 'Try to make your lines smoother — slow down a little.';
    return 'Good effort — keep practising for smoother strokes.';
  }
}

// =============================================================================
// SECTION 10: NATS EVENTS
// =============================================================================

export const LETTER_FORMATION_EVENTS = {
  SESSION_STARTED: 'scholarly.formation.session_started',
  LETTER_ATTEMPTED: 'scholarly.formation.letter_attempted',
  LETTER_MASTERED: 'scholarly.formation.letter_mastered',
  SESSION_COMPLETED: 'scholarly.formation.session_completed',
  FATIGUE_DETECTED: 'scholarly.formation.fatigue_detected',
  MIRROR_REVERSAL: 'scholarly.formation.mirror_reversal',
  GRIP_CONCERN: 'scholarly.formation.grip_concern',
  BKT_UPDATED: 'scholarly.formation.bkt_updated',
} as const;

// =============================================================================
// SECTION 11: LETTER FORMATION MODEL LIBRARY
// =============================================================================

/**
 * Pre-built formation models for Letters and Sounds Phase 1–6 graphemes.
 * Each entry defines the ideal strokes in normalised coordinate space.
 * In production, these are loaded from a CDN with locale-specific variants.
 */
export const FORMATION_MODEL_CATALOGUE: Record<string, Partial<LetterFormationModel>> = {
  // Phase 2 — single letter graphemes (first taught)
  's': {
    grapheme: 's', style: 'print', displayName: 'lowercase s',
    expectedStrokeCount: 1, pathTolerance: 1.5, orderTolerance: 'lenient',
    difficultyTier: 'foundation', phonemes: ['/s/'],
    idealStrokes: [{
      index: 0, continuous: true, label: 'curve',
      controlPoints: [{ x: 0.7, y: 0.15 }, { x: 0.3, y: 0.15 }, { x: 0.2, y: 0.35 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.65 }, { x: 0.7, y: 0.85 }, { x: 0.3, y: 0.85 }],
      expectedDirections: [-Math.PI, -Math.PI / 2, 0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI],
      startZone: { minX: 0.5, minY: 0, maxX: 1, maxY: 0.3, width: 0.5, height: 0.3 },
      endZone: { minX: 0, minY: 0.7, maxX: 0.5, maxY: 1, width: 0.5, height: 0.3 },
    }],
    formationStory: [{ step: 1, strokeIndices: [0], instruction: 'Start near the top. Curve left, then swoop down and curve right — like a snake!' }],
  },
  'a': {
    grapheme: 'a', style: 'print', displayName: 'lowercase a',
    expectedStrokeCount: 2, pathTolerance: 1.5, orderTolerance: 'moderate',
    difficultyTier: 'foundation', phonemes: ['/æ/'],
    idealStrokes: [
      {
        index: 0, continuous: true, label: 'circle',
        controlPoints: [{ x: 0.7, y: 0.3 }, { x: 0.5, y: 0.15 }, { x: 0.3, y: 0.3 }, { x: 0.3, y: 0.7 }, { x: 0.5, y: 0.85 }, { x: 0.7, y: 0.7 }],
        expectedDirections: [-Math.PI / 2, -Math.PI, -Math.PI / 2, 0, Math.PI / 2, 0],
        startZone: { minX: 0.5, minY: 0.1, maxX: 1, maxY: 0.5, width: 0.5, height: 0.4 },
        endZone: { minX: 0.5, minY: 0.5, maxX: 1, maxY: 0.9, width: 0.5, height: 0.4 },
      },
      {
        index: 1, continuous: true, label: 'downstroke',
        controlPoints: [{ x: 0.7, y: 0.15 }, { x: 0.7, y: 0.85 }],
        expectedDirections: [Math.PI / 2],
        startZone: { minX: 0.5, minY: 0, maxX: 1, maxY: 0.3, width: 0.5, height: 0.3 },
        endZone: { minX: 0.5, minY: 0.7, maxX: 1, maxY: 1, width: 0.5, height: 0.3 },
      },
    ],
    formationStory: [
      { step: 1, strokeIndices: [0], instruction: 'Start near the right side and draw a circle going left — around and back!' },
      { step: 2, strokeIndices: [1], instruction: 'Now add a line going straight down on the right side.' },
    ],
  },
  't': {
    grapheme: 't', style: 'print', displayName: 'lowercase t',
    expectedStrokeCount: 2, pathTolerance: 1.2, orderTolerance: 'strict',
    difficultyTier: 'foundation', phonemes: ['/t/'],
    idealStrokes: [
      {
        index: 0, continuous: true, label: 'downstroke',
        controlPoints: [{ x: 0.5, y: 0.05 }, { x: 0.5, y: 0.9 }],
        expectedDirections: [Math.PI / 2],
        startZone: { minX: 0.3, minY: 0, maxX: 0.7, maxY: 0.2, width: 0.4, height: 0.2 },
        endZone: { minX: 0.3, minY: 0.75, maxX: 0.7, maxY: 1, width: 0.4, height: 0.25 },
      },
      {
        index: 1, continuous: true, label: 'crossbar',
        controlPoints: [{ x: 0.2, y: 0.35 }, { x: 0.8, y: 0.35 }],
        expectedDirections: [0],
        startZone: { minX: 0, minY: 0.2, maxX: 0.4, maxY: 0.5, width: 0.4, height: 0.3 },
        endZone: { minX: 0.6, minY: 0.2, maxX: 1, maxY: 0.5, width: 0.4, height: 0.3 },
      },
    ],
    formationStory: [
      { step: 1, strokeIndices: [0], instruction: 'Start at the top and draw a tall line straight down.' },
      { step: 2, strokeIndices: [1], instruction: 'Now cross it in the middle — left to right!' },
    ],
  },
};

// =============================================================================
// EXPORTS
// =============================================================================
export {
  PencilInputCaptureService,
  FormationAnalysisService,
  DEFAULT_FEEDBACK_CONFIG,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_FORMATION_BKT_PARAMS,
  LETTER_FORMATION_EVENTS,
  FORMATION_MODEL_CATALOGUE,
};
