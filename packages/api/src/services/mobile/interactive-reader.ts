// =============================================================================
// SCHOLARLY PLATFORM — Sprint 10: MB-002
// Interactive Storybook Reader
// =============================================================================
// If the App Shell is the chassis and the Enchanted Library is the showroom,
// the Interactive Reader is the engine — the place where learning actually
// happens. Every tap, every spoken word, every pause is an opportunity to
// build reading fluency. This component orchestrates the visual presentation
// of storybook pages, synchronises narration audio with word-level highlights,
// manages the read-aloud pipeline with ASR, and feeds performance data back
// into the Bayesian Knowledge Tracing engine.
//
// Three reading modes serve different learning contexts:
//   LISTEN — passive narration for bedtime/enjoyment (no ASR)
//   READ_ALOUD — active phonics practice with ASR feedback
//   INDEPENDENT — silent reading with comprehension check-ins
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: READER STATE MACHINE
// =============================================================================

export enum ReaderState {
  LOADING = 'loading',
  COVER_PAGE = 'cover_page',
  READING = 'reading',
  PAGE_TURNING = 'page_turning',
  NARRATION_PLAYING = 'narration_playing',
  RECORDING = 'recording',
  PROCESSING_SPEECH = 'processing_speech',
  WORD_FEEDBACK = 'word_feedback',
  COMPREHENSION_CHECK = 'comprehension_check',
  PAUSED = 'paused',
  COMPLETE = 'complete',
  SUMMARY = 'summary',
  ERROR = 'error',
}

export enum ReadingMode {
  LISTEN = 'listen',
  READ_ALOUD = 'read_aloud',
  INDEPENDENT = 'independent',
}

export enum WordState {
  PENDING = 'pending',
  ACTIVE = 'active',
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  SKIPPED = 'skipped',
  HINT_GIVEN = 'hint_given',
}

export enum TextSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'xl',
}

export interface ReaderContext {
  storybookId: string;
  currentPage: number;
  totalPages: number;
  mode: ReadingMode;
  state: ReaderState;
  previousState: ReaderState | null;
  narrationPlayerId: string | null;
  narrationPosition: number;
  isNarrationLoaded: boolean;
  activeWordIndex: number | null;
  wordStates: Map<number, WordState>;
  isRecording: boolean;
  currentWordTarget: string | null;
  recordingStartTime: number | null;
  pageTransitionDirection: 'forward' | 'backward';
  pageTransitionProgress: number;
  toolbarVisible: boolean;
  settingsOpen: boolean;
  textSize: TextSize;
  brightness: number;
  nightMode: boolean;
  autoPageTurn: boolean;
}

// =============================================================================
// SECTION 2: READER CONFIGURATION
// =============================================================================

export interface ReaderConfig {
  defaultMode: ReadingMode;
  pageTurnDurationMs: number;
  autoPageTurn: boolean;
  autoTurnDelayMs: number;
  showWordHighlights: boolean;
  highlightColor: string;
  correctColor: string;
  incorrectColor: string;
  maxRecordingDurationMs: number;
  silenceTimeoutMs: number;
  attemptsBeforeHint: number;
  attemptsBeforeSkip: number;
  enablePhonemeHints: boolean;
  enableParallax: boolean;
  enableCharacterAnimations: boolean;
  comprehensionCheckInterval: number;
  minimumPagesForSummary: number;
  textSize: TextSize;
  nightModeEnabled: boolean;
  hapticFeedback: boolean;
}

export const DEFAULT_READER_CONFIG: ReaderConfig = {
  defaultMode: ReadingMode.LISTEN,
  pageTurnDurationMs: 400,
  autoPageTurn: true,
  autoTurnDelayMs: 1500,
  showWordHighlights: true,
  highlightColor: '#FFE082',
  correctColor: '#C8E6C9',
  incorrectColor: '#FFCDD2',
  maxRecordingDurationMs: 5000,
  silenceTimeoutMs: 2000,
  attemptsBeforeHint: 2,
  attemptsBeforeSkip: 4,
  enablePhonemeHints: true,
  enableParallax: true,
  enableCharacterAnimations: true,
  comprehensionCheckInterval: 4,
  minimumPagesForSummary: 3,
  textSize: TextSize.MEDIUM,
  nightModeEnabled: false,
  hapticFeedback: true,
};

export const AGE_READER_PRESETS: Record<string, Partial<ReaderConfig>> = {
  'early_years': {
    textSize: TextSize.EXTRA_LARGE,
    pageTurnDurationMs: 600,
    autoTurnDelayMs: 2500,
    attemptsBeforeHint: 1,
    attemptsBeforeSkip: 3,
    comprehensionCheckInterval: 0,
    enableCharacterAnimations: true,
    hapticFeedback: true,
  },
  'foundation': {
    textSize: TextSize.LARGE,
    pageTurnDurationMs: 400,
    autoTurnDelayMs: 2000,
    attemptsBeforeHint: 2,
    attemptsBeforeSkip: 4,
    comprehensionCheckInterval: 6,
  },
  'developing': {
    textSize: TextSize.MEDIUM,
    pageTurnDurationMs: 350,
    autoTurnDelayMs: 1500,
    attemptsBeforeHint: 3,
    attemptsBeforeSkip: 5,
    comprehensionCheckInterval: 4,
  },
  'fluent': {
    textSize: TextSize.MEDIUM,
    pageTurnDurationMs: 300,
    autoTurnDelayMs: 1000,
    attemptsBeforeHint: 3,
    attemptsBeforeSkip: 6,
    comprehensionCheckInterval: 3,
  },
  'advanced': {
    textSize: TextSize.SMALL,
    pageTurnDurationMs: 250,
    autoTurnDelayMs: 800,
    comprehensionCheckInterval: 0,
    enableCharacterAnimations: false,
  },
};

// =============================================================================
// SECTION 3: NARRATION ENGINE
// =============================================================================

export interface NarrationConfig {
  playbackRate: number;
  highlightLeadTimeMs: number;
  crossPageFadeMs: number;
  pauseBetweenPagesMs: number;
  enableWordBounce: boolean;
  bounceAmplitude: number;
  highlightTransitionMs: number;
}

export const DEFAULT_NARRATION_CONFIG: NarrationConfig = {
  playbackRate: 1.0,
  highlightLeadTimeMs: 50,
  crossPageFadeMs: 200,
  pauseBetweenPagesMs: 800,
  enableWordBounce: true,
  bounceAmplitude: 3,
  highlightTransitionMs: 100,
};

export const PACE_ADAPTATION_TABLE: Record<string, number> = {
  'pre_reader':    0.7,
  'emergent':      0.8,
  'early':         0.85,
  'transitional':  0.95,
  'fluent':        1.0,
  'advanced':      1.05,
};

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  pageWordIndex: number;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isBuffering: boolean;
  didJustFinish: boolean;
}

export interface AudioPlaybackService {
  loadAudio(uri: string): Promise<Result<string>>;
  play(playerId: string): Promise<Result<void>>;
  pause(playerId: string): Promise<Result<void>>;
  stop(playerId: string): Promise<Result<void>>;
  seekTo(playerId: string, positionMs: number): Promise<Result<void>>;
  setPlaybackRate(playerId: string, rate: number): Promise<Result<void>>;
  getCurrentPosition(playerId: string): number;
  getDuration(playerId: string): number;
  onPlaybackStatus(playerId: string, callback: (status: PlaybackStatus) => void): () => void;
}

export class NarrationEngine {
  private config: NarrationConfig;
  private timestamps: WordTimestamp[];
  private playbackService: AudioPlaybackService | null;
  private playerId: string | null = null;
  private highlightTimers: NodeJS.Timeout[] = [];
  private onWordHighlight: (wordIndex: number | null) => void;
  private onPageComplete: () => void;
  private isActive: boolean = false;

  constructor(
    config: Partial<NarrationConfig> = {},
    onWordHighlight: (wordIndex: number | null) => void = () => {},
    onPageComplete: () => void = () => {},
  ) {
    this.config = { ...DEFAULT_NARRATION_CONFIG, ...config };
    this.timestamps = [];
    this.playbackService = null;
    this.onWordHighlight = onWordHighlight;
    this.onPageComplete = onPageComplete;
  }

  async loadPage(
    audioUri: string,
    timestamps: WordTimestamp[],
    playbackService: AudioPlaybackService,
    readingLevel: string,
  ): Promise<Result<void>> {
    this.cleanup();
    this.timestamps = timestamps;
    this.playbackService = playbackService;
    this.config.playbackRate = PACE_ADAPTATION_TABLE[readingLevel] ?? 1.0;

    const loadResult = await playbackService.loadAudio(audioUri);
    if (!loadResult.success) return { success: false, error: loadResult.error };
    this.playerId = loadResult.data;
    await playbackService.setPlaybackRate(this.playerId, this.config.playbackRate);
    return { success: true, data: undefined };
  }

  async play(): Promise<Result<void>> {
    if (!this.playbackService || !this.playerId) {
      return { success: false, error: { code: 'NOT_LOADED', message: 'No audio loaded' } };
    }
    this.isActive = true;
    this.scheduleHighlights(0);
    const playResult = await this.playbackService.play(this.playerId);
    if (!playResult.success) { this.cleanup(); return playResult; }

    const unsubscribe = this.playbackService.onPlaybackStatus(this.playerId, (status) => {
      if (status.didJustFinish) {
        this.onWordHighlight(null);
        setTimeout(() => this.onPageComplete(), this.config.pauseBetweenPagesMs);
        unsubscribe();
      }
    });
    return { success: true, data: undefined };
  }

  async pause(): Promise<Result<void>> {
    this.isActive = false;
    this.clearHighlightTimers();
    if (this.playbackService && this.playerId) return this.playbackService.pause(this.playerId);
    return { success: true, data: undefined };
  }

  async resume(): Promise<Result<void>> {
    this.isActive = true;
    if (this.playbackService && this.playerId) {
      const position = this.playbackService.getCurrentPosition(this.playerId);
      this.scheduleHighlights(position);
      return this.playbackService.play(this.playerId);
    }
    return { success: true, data: undefined };
  }

  async seekToWord(wordIndex: number): Promise<Result<void>> {
    if (!this.playbackService || !this.playerId) {
      return { success: false, error: { code: 'NOT_LOADED', message: 'No audio loaded' } };
    }
    const timestamp = this.timestamps[wordIndex];
    if (!timestamp) return { success: false, error: { code: 'INVALID_INDEX', message: `Word ${wordIndex} not found` } };

    this.clearHighlightTimers();
    const seekResult = await this.playbackService.seekTo(this.playerId, timestamp.startMs / this.config.playbackRate);
    if (seekResult.success) this.scheduleHighlights(timestamp.startMs);
    return seekResult;
  }

  cleanup(): void {
    this.isActive = false;
    this.clearHighlightTimers();
    if (this.playbackService && this.playerId) this.playbackService.stop(this.playerId);
    this.playerId = null;
    this.timestamps = [];
  }

  private scheduleHighlights(fromMs: number): void {
    this.clearHighlightTimers();
    const rate = this.config.playbackRate;
    const lead = this.config.highlightLeadTimeMs;

    for (const ts of this.timestamps) {
      if (ts.startMs < fromMs) continue;
      const delayMs = (ts.startMs - fromMs) / rate - lead;
      if (delayMs < 0) continue;
      const timer = setTimeout(() => {
        if (this.isActive) this.onWordHighlight(ts.pageWordIndex);
      }, delayMs);
      this.highlightTimers.push(timer);
    }
  }

  private clearHighlightTimers(): void {
    for (const timer of this.highlightTimers) clearTimeout(timer);
    this.highlightTimers = [];
  }
}

// =============================================================================
// SECTION 4: READ-ALOUD ASR PIPELINE
// =============================================================================

export interface PageWord {
  text: string;
  gpcs: string[];
  isDecodable: boolean;
  frequencyTier: 1 | 2 | 3;
  startCharIndex: number;
  endCharIndex: number;
}

export interface AudioRecordingConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  format: 'wav' | 'mp3' | 'aac';
  maxDurationMs: number;
  streamToServer: boolean;
}

export interface AudioRecordingResult {
  uri: string;
  durationMs: number;
  sizeBytes: number;
  format: string;
  averageAmplitude: number;
}

export interface AudioRecordingService {
  requestPermission(): Promise<Result<boolean>>;
  startRecording(config: AudioRecordingConfig): Promise<Result<string>>;
  stopRecording(): Promise<Result<AudioRecordingResult>>;
  pauseRecording(): Promise<Result<void>>;
  resumeRecording(): Promise<Result<void>>;
  getRecordingLevel(): number;
}

export interface ReadAloudConfig {
  minRecordingMs: number;
  maxRecordingMs: number;
  silenceThreshold: number;
  silenceDurationMs: number;
  asrConfidenceThreshold: number;
  acceptPhoneticVariants: boolean;
  enableSoundButtons: boolean;
  celebrateCorrectWords: boolean;
  enableEncouragement: boolean;
  correctAdvanceDelayMs: number;
  incorrectRetryDelayMs: number;
}

export const DEFAULT_READ_ALOUD_CONFIG: ReadAloudConfig = {
  minRecordingMs: 300,
  maxRecordingMs: 5000,
  silenceThreshold: 0.05,
  silenceDurationMs: 1500,
  asrConfidenceThreshold: 0.65,
  acceptPhoneticVariants: true,
  enableSoundButtons: true,
  celebrateCorrectWords: true,
  enableEncouragement: true,
  correctAdvanceDelayMs: 800,
  incorrectRetryDelayMs: 1200,
};

export interface AsrResult {
  transcript: string;
  confidence: number;
  alternatives: { transcript: string; confidence: number }[];
  durationMs: number;
  phonemes: string[];
}

export enum FeedbackType {
  CORRECT = 'correct',
  ALMOST = 'almost',
  INCORRECT = 'incorrect',
  HINT = 'hint',
  MODEL = 'model',
  SKIP = 'skip',
}

export interface WordAttemptResult {
  word: string;
  expected: string;
  transcript: string;
  isCorrect: boolean;
  confidence: number;
  attemptNumber: number;
  gpcs: string[];
  gpcResults: GpcAttemptResult[];
  feedbackType: FeedbackType;
  feedbackMessage: string;
}

export interface GpcAttemptResult {
  gpc: string;
  grapheme: string;
  expectedPhoneme: string;
  producedPhoneme: string | null;
  isCorrect: boolean;
}

export const ENCOURAGEMENT_MESSAGES: Record<FeedbackType, string[]> = {
  [FeedbackType.CORRECT]: [
    'Well done!', 'You got it!', 'Great reading!', 'Brilliant!',
    "That's right!", 'Super!', 'Fantastic!', "You're a star!",
  ],
  [FeedbackType.ALMOST]: [
    'So close! Listen carefully...', 'Nearly there! Let\'s try again.',
    'Good try! Listen to the sounds...',
  ],
  [FeedbackType.INCORRECT]: [
    'Let\'s try that one again.', 'Have another go!',
    'Let\'s sound it out together.', 'Look at the sounds carefully.',
  ],
  [FeedbackType.HINT]: [
    'Let\'s break it down...', 'Listen to each sound...',
    'Here are the sounds in this word:',
  ],
  [FeedbackType.MODEL]: [
    'Listen to how it sounds...', "Here's how to say it:",
  ],
  [FeedbackType.SKIP]: [
    "That's a tricky one! We'll come back to it.",
    "Don't worry — some words take practice!",
    "Let's keep going — you're doing great!",
  ],
};

export interface PhonemeHint {
  word: string;
  segments: { grapheme: string; phoneme: string; isTarget: boolean }[];
  audioSegmentUrls: string[];
}

export class ReadAloudPipeline {
  private config: ReadAloudConfig;
  private audioRecorder: AudioRecordingService | null;
  private wordAttempts: Map<number, number>;
  private sessionResults: WordAttemptResult[];

  constructor(config: Partial<ReadAloudConfig> = {}) {
    this.config = { ...DEFAULT_READ_ALOUD_CONFIG, ...config };
    this.audioRecorder = null;
    this.wordAttempts = new Map();
    this.sessionResults = [];
  }

  setAudioRecorder(recorder: AudioRecordingService): void {
    this.audioRecorder = recorder;
  }

  async attemptWord(
    wordIndex: number,
    pageWord: PageWord,
    taughtGpcs: string[],
  ): Promise<Result<WordAttemptResult>> {
    if (!this.audioRecorder) {
      return { success: false, error: { code: 'NO_RECORDER', message: 'Audio recorder not set' } };
    }

    const attemptCount = (this.wordAttempts.get(wordIndex) ?? 0) + 1;
    this.wordAttempts.set(wordIndex, attemptCount);

    if (attemptCount > this.config.attemptsBeforeSkip) {
      const skipResult = this.createFeedbackResult(pageWord, attemptCount, FeedbackType.SKIP);
      this.sessionResults.push(skipResult);
      return { success: true, data: skipResult };
    }

    if (attemptCount > this.config.attemptsBeforeHint) {
      const hintResult = this.createFeedbackResult(pageWord, attemptCount, FeedbackType.HINT);
      this.sessionResults.push(hintResult);
      return { success: true, data: hintResult };
    }

    const recordingResult = await this.recordAttempt();
    if (!recordingResult.success) return { success: false, error: recordingResult.error };

    const asrResult = await this.processAsr(recordingResult.data.uri);
    if (!asrResult.success) return { success: false, error: asrResult.error };

    const evaluation = this.evaluateAttempt(pageWord, asrResult.data, attemptCount);
    this.sessionResults.push(evaluation);
    return { success: true, data: evaluation };
  }

  getPhonemeHint(pageWord: PageWord): PhonemeHint {
    return {
      word: pageWord.text,
      segments: pageWord.gpcs.map(gpc => ({
        grapheme: gpc,
        phoneme: this.graphemeToPhoneme(gpc),
        isTarget: true,
      })),
      audioSegmentUrls: pageWord.gpcs.map(gpc => `/audio/phonemes/${gpc}.mp3`),
    };
  }

  getSessionSummary(): ReadAloudSessionSummary {
    const totalWords = this.sessionResults.length;
    const correctWords = this.sessionResults.filter(r => r.isCorrect).length;
    const totalAttempts = this.sessionResults.reduce((sum, r) => sum + r.attemptNumber, 0);

    const gpcPerformance: Record<string, { correct: number; total: number }> = {};
    for (const result of this.sessionResults) {
      for (const gpcResult of result.gpcResults) {
        if (!gpcPerformance[gpcResult.gpc]) gpcPerformance[gpcResult.gpc] = { correct: 0, total: 0 };
        gpcPerformance[gpcResult.gpc].total++;
        if (gpcResult.isCorrect) gpcPerformance[gpcResult.gpc].correct++;
      }
    }

    return {
      totalWords,
      correctWords,
      accuracy: totalWords > 0 ? correctWords / totalWords : 0,
      totalAttempts,
      averageAttemptsPerWord: totalWords > 0 ? totalAttempts / totalWords : 0,
      gpcPerformance,
      wordsNeedingPractice: this.sessionResults
        .filter(r => !r.isCorrect || r.attemptNumber > 1)
        .map(r => r.word),
    };
  }

  reset(): void {
    this.wordAttempts.clear();
    this.sessionResults = [];
  }

  private async recordAttempt(): Promise<Result<{ uri: string; durationMs: number }>> {
    if (!this.audioRecorder) return { success: false, error: { code: 'NO_RECORDER', message: 'Recorder not initialised' } };

    const startResult = await this.audioRecorder.startRecording({
      sampleRate: 16000, bitDepth: 16, channels: 1,
      format: 'wav', maxDurationMs: this.config.maxRecordingMs, streamToServer: false,
    });
    if (!startResult.success) return { success: false, error: startResult.error };

    await new Promise(resolve => setTimeout(resolve, this.config.maxRecordingMs));

    const stopResult = await this.audioRecorder.stopRecording();
    if (!stopResult.success) return { success: false, error: stopResult.error };

    if (stopResult.data.durationMs < this.config.minRecordingMs) {
      return { success: false, error: { code: 'TOO_SHORT', message: 'Recording too short' } };
    }
    return { success: true, data: { uri: stopResult.data.uri, durationMs: stopResult.data.durationMs } };
  }

  private async processAsr(audioUri: string): Promise<Result<AsrResult>> {
    // POST to /api/phonics/asr — ElevenLabs or Whisper backend
    return {
      success: true,
      data: { transcript: '', confidence: 0, alternatives: [], durationMs: 0, phonemes: [] },
    };
  }

  private evaluateAttempt(
    pageWord: PageWord,
    asrResult: AsrResult,
    attemptNumber: number,
  ): WordAttemptResult {
    const expected = pageWord.text.toLowerCase().trim();
    const transcript = asrResult.transcript.toLowerCase().trim();
    const isExactMatch = transcript === expected;
    const isPhoneticMatch = this.config.acceptPhoneticVariants && this.isPhoneticVariant(expected, transcript);
    const isCorrect = isExactMatch || isPhoneticMatch;

    const gpcResults: GpcAttemptResult[] = pageWord.gpcs.map(gpc => ({
      gpc, grapheme: gpc, expectedPhoneme: this.graphemeToPhoneme(gpc),
      producedPhoneme: null, isCorrect,
    }));

    let feedbackType: FeedbackType;
    if (isCorrect) feedbackType = FeedbackType.CORRECT;
    else if (isPhoneticMatch) feedbackType = FeedbackType.ALMOST;
    else feedbackType = FeedbackType.INCORRECT;

    const messages = ENCOURAGEMENT_MESSAGES[feedbackType];
    return {
      word: pageWord.text, expected, transcript, isCorrect,
      confidence: asrResult.confidence, attemptNumber,
      gpcs: pageWord.gpcs, gpcResults, feedbackType,
      feedbackMessage: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  private createFeedbackResult(pageWord: PageWord, attemptNumber: number, type: FeedbackType): WordAttemptResult {
    const messages = ENCOURAGEMENT_MESSAGES[type];
    return {
      word: pageWord.text, expected: pageWord.text.toLowerCase(), transcript: '',
      isCorrect: false, confidence: 0, attemptNumber,
      gpcs: pageWord.gpcs,
      gpcResults: pageWord.gpcs.map(gpc => ({
        gpc, grapheme: gpc, expectedPhoneme: this.graphemeToPhoneme(gpc),
        producedPhoneme: null, isCorrect: false,
      })),
      feedbackType: type,
      feedbackMessage: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  private isPhoneticVariant(expected: string, transcript: string): boolean {
    const normalise = (s: string) => s.replace(/[^a-z]/g, '');
    const a = normalise(expected);
    const b = normalise(transcript);
    if (a === b) return true;
    if (a.length <= 4 && this.editDistance(a, b) <= 1) return true;
    if (a.length > 4 && this.editDistance(a, b) <= 2) return true;
    return false;
  }

  private editDistance(a: string, b: string): number {
    const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    return dp[a.length][b.length];
  }

  private graphemeToPhoneme(grapheme: string): string {
    const GPC_MAP: Record<string, string> = {
      's': '/s/', 'a': '/æ/', 't': '/t/', 'p': '/p/', 'i': '/ɪ/', 'n': '/n/',
      'sh': '/ʃ/', 'ch': '/tʃ/', 'th': '/θ/', 'ai': '/eɪ/', 'ee': '/iː/',
      'igh': '/aɪ/', 'oa': '/əʊ/', 'oo': '/uː/', 'ar': '/ɑː/', 'or': '/ɔː/',
      'ur': '/ɜː/', 'ow': '/aʊ/', 'oi': '/ɔɪ/', 'ear': '/ɪə/', 'air': '/eə/',
      'ure': '/ʊə/', 'er': '/ə/', 'tion': '/ʃən/', 'sion': '/ʒən/',
    };
    return GPC_MAP[grapheme.toLowerCase()] ?? `/${grapheme}/`;
  }
}

export interface ReadAloudSessionSummary {
  totalWords: number;
  correctWords: number;
  accuracy: number;
  totalAttempts: number;
  averageAttemptsPerWord: number;
  gpcPerformance: Record<string, { correct: number; total: number }>;
  wordsNeedingPractice: string[];
}

// =============================================================================
// SECTION 5: CLIENT-SIDE BKT ENGINE (Offline Mastery Updates)
// =============================================================================

export interface BktObservation {
  gpc: string;
  correct: boolean;
  context: 'initial' | 'medial' | 'final';
  wordDifficulty: number;
  attemptNumber: number;
  responseTimeMs: number;
}

export interface BktMasteryUpdate {
  learnerId: string;
  sessionId: string;
  storybookId: string;
  observations: BktObservation[];
  timestamp: number;
  isOffline: boolean;
}

export class ClientBktEngine {
  private mastery: Map<string, number>;
  private readonly pLearn: number = 0.1;
  private readonly pGuess: number = 0.25;
  private readonly pSlip: number = 0.1;

  constructor(initialMastery: Record<string, number> = {}) {
    this.mastery = new Map(Object.entries(initialMastery));
  }

  update(observation: BktObservation): number {
    const prior = this.mastery.get(observation.gpc) ?? 0.05;
    let posterior: number;

    if (observation.correct) {
      const numerator = prior * (1 - this.pSlip);
      const denominator = numerator + (1 - prior) * this.pGuess;
      posterior = denominator > 0 ? numerator / denominator : prior;
    } else {
      const numerator = prior * this.pSlip;
      const denominator = numerator + (1 - prior) * (1 - this.pGuess);
      posterior = denominator > 0 ? numerator / denominator : prior;
    }

    const updated = posterior + (1 - posterior) * this.pLearn;
    this.mastery.set(observation.gpc, Math.min(0.99, Math.max(0.01, updated)));
    return this.mastery.get(observation.gpc)!;
  }

  batchUpdate(observations: BktObservation[]): Record<string, number> {
    for (const obs of observations) this.update(obs);
    return this.getSnapshot();
  }

  getSnapshot(): Record<string, number> {
    return Object.fromEntries(this.mastery);
  }

  getUnmastered(threshold: number = 0.8): string[] {
    return Array.from(this.mastery.entries())
      .filter(([_, p]) => p < threshold)
      .sort((a, b) => a[1] - b[1])
      .map(([gpc]) => gpc);
  }

  getMastered(threshold: number = 0.8): string[] {
    return Array.from(this.mastery.entries())
      .filter(([_, p]) => p >= threshold)
      .map(([gpc]) => gpc);
  }

  mergeWithServer(
    serverMastery: Record<string, number>,
    serverTimestamp: number,
    localTimestamp: number,
  ): Record<string, number> {
    const CLOSE_THRESHOLD_MS = 5 * 60 * 1000;
    const merged: Record<string, number> = {};
    const allGpcs = new Set([...Object.keys(serverMastery), ...Array.from(this.mastery.keys())]);

    for (const gpc of allGpcs) {
      const serverVal = serverMastery[gpc];
      const localVal = this.mastery.get(gpc);
      if (serverVal !== undefined && localVal !== undefined) {
        if (Math.abs(serverTimestamp - localTimestamp) < CLOSE_THRESHOLD_MS) {
          merged[gpc] = Math.max(serverVal, localVal);
        } else if (localTimestamp > serverTimestamp) {
          merged[gpc] = localVal;
        } else {
          merged[gpc] = serverVal;
        }
      } else {
        merged[gpc] = serverVal ?? localVal ?? 0.05;
      }
    }

    this.mastery = new Map(Object.entries(merged));
    return merged;
  }
}

// =============================================================================
// SECTION 6: COMPREHENSION CHECK SYSTEM
// =============================================================================

export enum ComprehensionStrand {
  VOCABULARY = 'vocabulary',
  INFERENCE = 'inference',
  PRIOR_KNOWLEDGE = 'prior_knowledge',
  TEXT_STRUCTURE = 'text_structure',
  PREDICTION = 'prediction',
  MAIN_IDEA = 'main_idea',
}

export interface ComprehensionQuestion {
  id: string;
  strand: ComprehensionStrand;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'open_ended' | 'picture_select';
  options?: { id: string; text: string; imageUrl?: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
  pageRange: [number, number];
}

export interface ComprehensionResult {
  questionId: string;
  strand: ComprehensionStrand;
  selectedAnswer: string;
  isCorrect: boolean;
  timeToAnswerMs: number;
  pageRange: [number, number];
}

export interface ComprehensionSummary {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTimeMs: number;
  strandPerformance: Record<string, { correct: number; total: number }>;
  strongestStrand: ComprehensionStrand | null;
  weakestStrand: ComprehensionStrand | null;
}

export class ComprehensionEngine {
  private questions: ComprehensionQuestion[];
  private results: ComprehensionResult[];
  private questionsAsked: Set<string>;

  constructor(questions: ComprehensionQuestion[] = []) {
    this.questions = questions;
    this.results = [];
    this.questionsAsked = new Set();
  }

  getNextQuestion(currentPage: number): ComprehensionQuestion | null {
    const candidates = this.questions.filter(q =>
      !this.questionsAsked.has(q.id) && q.pageRange[1] <= currentPage,
    );
    if (candidates.length === 0) return null;

    const testedStrands = new Set(this.results.map(r => r.strand));
    const untestedCandidates = candidates.filter(q => !testedStrands.has(q.strand));
    const pool = untestedCandidates.length > 0 ? untestedCandidates : candidates;

    const targetDifficulty = this.getTargetDifficulty();
    pool.sort((a, b) =>
      Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty),
    );

    const selected = pool[0];
    this.questionsAsked.add(selected.id);
    return selected;
  }

  recordResult(result: ComprehensionResult): void {
    this.results.push(result);
  }

  getSummary(): ComprehensionSummary {
    const total = this.results.length;
    const correct = this.results.filter(r => r.isCorrect).length;
    const byStrand: Record<string, { correct: number; total: number }> = {};

    for (const result of this.results) {
      if (!byStrand[result.strand]) byStrand[result.strand] = { correct: 0, total: 0 };
      byStrand[result.strand].total++;
      if (result.isCorrect) byStrand[result.strand].correct++;
    }

    return {
      totalQuestions: total,
      correctAnswers: correct,
      accuracy: total > 0 ? correct / total : 0,
      averageResponseTimeMs: total > 0
        ? this.results.reduce((sum, r) => sum + r.timeToAnswerMs, 0) / total : 0,
      strandPerformance: byStrand,
      strongestStrand: this.getBestStrand(byStrand, 'max'),
      weakestStrand: this.getBestStrand(byStrand, 'min'),
    };
  }

  private getTargetDifficulty(): number {
    if (this.results.length === 0) return 0.5;
    const recentAccuracy = this.results.slice(-3)
      .filter(r => r.isCorrect).length / Math.min(3, this.results.length);
    return Math.max(0.2, Math.min(0.9, recentAccuracy));
  }

  private getBestStrand(
    byStrand: Record<string, { correct: number; total: number }>,
    mode: 'max' | 'min',
  ): ComprehensionStrand | null {
    let result: { strand: string; accuracy: number } | null = null;
    for (const [strand, data] of Object.entries(byStrand)) {
      const accuracy = data.total > 0 ? data.correct / data.total : 0;
      if (!result || (mode === 'max' ? accuracy > result.accuracy : accuracy < result.accuracy)) {
        result = { strand, accuracy };
      }
    }
    return result ? result.strand as ComprehensionStrand : null;
  }
}

// =============================================================================
// SECTION 7: PAGE LAYOUT & ANIMATION ENGINE
// =============================================================================

export type PageLayoutType =
  | 'full_illustration'
  | 'illustration_top'
  | 'illustration_bottom'
  | 'illustration_left'
  | 'illustration_right'
  | 'text_only';

export interface PageLayout {
  type: PageLayoutType;
  illustrationRegion: { x: number; y: number; width: number; height: number } | null;
  textRegion: { x: number; y: number; width: number; height: number };
  parallaxLayers: ParallaxLayer[];
  interactiveZones: InteractiveZone[];
}

export interface ParallaxLayer {
  imageUrl: string;
  depth: number;        // 0 = background, 1 = foreground
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface InteractiveZone {
  id: string;
  type: 'character' | 'object' | 'word' | 'hotspot';
  bounds: { x: number; y: number; width: number; height: number };
  onTapAction: 'animate' | 'speak' | 'highlight' | 'expand';
  animationName: string | null;
  audioUrl: string | null;
}

export interface PageTurnAnimation {
  type: 'curl' | 'slide' | 'fade' | 'flip';
  direction: 'forward' | 'backward';
  durationMs: number;
  easing: 'ease-in-out' | 'spring' | 'linear';
  curlDepth: number;           // 0-1, how much the page curls
  shadowOpacity: number;       // shadow cast during turn
}

export const PAGE_TURN_PRESETS: Record<string, PageTurnAnimation> = {
  'curl_forward': {
    type: 'curl', direction: 'forward', durationMs: 400,
    easing: 'ease-in-out', curlDepth: 0.3, shadowOpacity: 0.15,
  },
  'curl_backward': {
    type: 'curl', direction: 'backward', durationMs: 400,
    easing: 'ease-in-out', curlDepth: 0.3, shadowOpacity: 0.15,
  },
  'slide_forward': {
    type: 'slide', direction: 'forward', durationMs: 300,
    easing: 'spring', curlDepth: 0, shadowOpacity: 0.1,
  },
  'fade': {
    type: 'fade', direction: 'forward', durationMs: 250,
    easing: 'ease-in-out', curlDepth: 0, shadowOpacity: 0,
  },
};

// =============================================================================
// SECTION 8: SESSION SUMMARY & ANALYTICS
// =============================================================================

export interface ReadingSessionSummary {
  sessionId: string;
  storybookId: string;
  storybookTitle: string;
  durationMs: number;
  pagesRead: number;
  totalPages: number;
  completionRate: number;
  mode: ReadingMode;

  // Decoding performance (READ_ALOUD mode)
  wordsRead: number;
  wordsCorrect: number;
  accuracy: number;
  wcpm: number;

  // GPC mastery updates
  gpcMasteryUpdates: Record<string, { before: number; after: number; delta: number }>;
  newlyMasteredGpcs: string[];
  gpcsNeedingPractice: string[];

  // Comprehension
  comprehensionAccuracy: number;
  strongestStrand: ComprehensionStrand | null;
  weakestStrand: ComprehensionStrand | null;

  // Rewards
  xpEarned: number;
  sparksEarned: number;
  badgesEarned: string[];
  streakMaintained: boolean;
  streakDays: number;

  // Engagement metrics (for analytics)
  pauseCount: number;
  totalPauseTimeMs: number;
  averageTimePerPageMs: number;
  reReadPages: number[];
  hintsUsed: number;
  wordsSkipped: number;
}

/**
 * Celebration milestones — these trigger special animations and
 * encouragement messages in the session summary screen.
 */
export interface CelebrationMilestone {
  type: 'first_book' | 'series_complete' | 'phase_complete' |
        'perfect_accuracy' | 'streak_milestone' | 'xp_level_up' |
        'new_badge' | 'speed_record' | 'word_count_milestone';
  title: string;
  description: string;
  animationType: 'confetti' | 'fireworks' | 'stars' | 'rainbow' | 'trophy';
  soundEffect: string;
}

export const CELEBRATION_MILESTONES: Record<string, CelebrationMilestone> = {
  'first_book': {
    type: 'first_book',
    title: 'First Book Complete! 📖',
    description: "You read your very first book! You're officially a reader!",
    animationType: 'confetti',
    soundEffect: '/audio/celebrations/first-book.mp3',
  },
  'series_complete': {
    type: 'series_complete',
    title: 'Series Complete! 🏆',
    description: "You've finished the whole series! What an achievement!",
    animationType: 'trophy',
    soundEffect: '/audio/celebrations/series-complete.mp3',
  },
  'phase_complete': {
    type: 'phase_complete',
    title: 'Phase Mastered! ⭐',
    description: "You've mastered all the sounds in this phase! Ready for the next adventure!",
    animationType: 'fireworks',
    soundEffect: '/audio/celebrations/phase-complete.mp3',
  },
  'perfect_accuracy': {
    type: 'perfect_accuracy',
    title: 'Perfect Score! 🌟',
    description: 'Every single word — perfect! Your reading is incredible!',
    animationType: 'stars',
    soundEffect: '/audio/celebrations/perfect.mp3',
  },
  'streak_7': {
    type: 'streak_milestone',
    title: '7-Day Streak! 🔥',
    description: "A whole week of reading every day! You're on fire!",
    animationType: 'rainbow',
    soundEffect: '/audio/celebrations/streak.mp3',
  },
  'streak_30': {
    type: 'streak_milestone',
    title: '30-Day Streak! 🌈',
    description: 'A whole MONTH of daily reading! That is absolutely incredible!',
    animationType: 'fireworks',
    soundEffect: '/audio/celebrations/streak-30.mp3',
  },
};

// =============================================================================
// SECTION 9: NATS EVENTS
// =============================================================================

export const READER_EVENTS = {
  BOOK_OPENED: 'scholarly.reader.book_opened',
  PAGE_READ: 'scholarly.reader.page_read',
  WORD_ATTEMPTED: 'scholarly.reader.word_attempted',
  SESSION_COMPLETED: 'scholarly.reader.session_completed',
  COMPREHENSION_ANSWERED: 'scholarly.reader.comprehension_answered',
  BKT_UPDATED: 'scholarly.reader.bkt_updated',
  MILESTONE_REACHED: 'scholarly.reader.milestone_reached',
  HINT_USED: 'scholarly.reader.hint_used',
  AUDIO_NARRATION_PLAYED: 'scholarly.reader.narration_played',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DEFAULT_READER_CONFIG,
  DEFAULT_NARRATION_CONFIG,
  DEFAULT_READ_ALOUD_CONFIG,
  PACE_ADAPTATION_TABLE,
  AGE_READER_PRESETS,
  ENCOURAGEMENT_MESSAGES,
  CELEBRATION_MILESTONES,
  PAGE_TURN_PRESETS,
  READER_EVENTS,
};
