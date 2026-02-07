/**
 * Scholarly Platform — AI Capability Interfaces
 * ===============================================
 *
 * AI-001: The AI enablement platform must be provider-agnostic. No single AI
 * provider should become a dependency that cannot be replaced within 30 days.
 *
 * Rather than a monolithic "AI Service", we define capability-specific interfaces.
 * Different providers can fulfill different capabilities based on their strengths
 * and pricing. Think of it like a restaurant kitchen: instead of one chef who
 * does everything, you have a pastry chef, a saucier, a grill master — each
 * specialising in what they do best, but all following the same kitchen
 * standards and plating guidelines.
 *
 * ## The Eight Capabilities
 *
 * 1. **TextCompletion**: General text generation (stories, summaries, explanations)
 * 2. **Assessment**: Rubric-based marking, feedback generation
 * 3. **ContentSafety**: Age-appropriate screening, bias detection
 * 4. **Vision**: Image understanding, diagram analysis
 * 5. **Embedding**: Semantic search, similarity scoring
 * 6. **Speech**: Transcription, pronunciation assessment, TTS
 * 7. **Translation**: Multi-language support
 * 8. **StructuredOutput**: JSON extraction, schema-constrained generation
 *
 * Each interface defines the input/output contracts that providers must
 * implement. The RoutingEngine (AI-003) decides which provider handles
 * each request based on capability, cost tier, and availability.
 *
 * @module ai-abstraction/capability-interfaces
 * @version 1.0.0
 */

// ============================================================================
// SECTION 1: SHARED TYPES
// ============================================================================

/** Cost tier determines which provider class handles the request. */
export type CostTier = 'critical' | 'standard' | 'economy';

/** Unique provider identifiers. */
export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'azure-openai'
  | 'mistral'
  | 'llama-local'
  | 'whisper-local'
  | 'embedding-local'
  | 'elevenlabs'
  | 'deepl'
  | 'google-translate';

/** Usage metadata returned with every AI response. */
export interface AIUsageMetadata {
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  cached: boolean;
  tier: CostTier;
}

/** Base request options shared across all capabilities. */
export interface AIRequestOptions {
  /** Cost tier for routing decisions. */
  tier?: CostTier;
  /** Preferred provider (override routing). */
  preferredProvider?: ProviderId;
  /** Maximum latency budget in ms. */
  maxLatencyMs?: number;
  /** Tenant ID for cost attribution. */
  tenantId: string;
  /** User ID for rate limiting. */
  userId?: string;
  /** Correlation ID for request tracing. */
  correlationId?: string;
  /** Cache key for response caching. */
  cacheKey?: string;
  /** Cache TTL in seconds (0 to skip cache). */
  cacheTtlSeconds?: number;
}

/** The standard result wrapper for all AI operations. */
export interface AIResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    provider?: ProviderId;
    retryable: boolean;
  };
  usage: AIUsageMetadata;
}

// ============================================================================
// SECTION 2: TEXT COMPLETION CAPABILITY
// ============================================================================

export interface TextCompletionRequest extends AIRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface TextCompletionResponse {
  text: string;
  finishReason: 'stop' | 'max_tokens' | 'content_filter';
}

/**
 * ITextCompletionProvider: General text generation.
 * Used for story generation, explanations, summaries, chat responses.
 */
export interface ITextCompletionProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['text-completion'];
  complete(request: TextCompletionRequest): Promise<AIResult<TextCompletionResponse>>;
}

// ============================================================================
// SECTION 3: ASSESSMENT CAPABILITY
// ============================================================================

export interface AssessmentCriterion {
  name: string;
  description: string;
  maxScore: number;
  rubricLevels: Array<{ score: number; descriptor: string }>;
}

export interface AssessmentRequest extends AIRequestOptions {
  /** The student's work to assess. */
  submission: string;
  /** The assessment criteria/rubric. */
  criteria: AssessmentCriterion[];
  /** The task description or question. */
  taskDescription: string;
  /** The year/grade level for calibration. */
  yearLevel: number;
  /** Subject area for domain-specific feedback. */
  subject: string;
  /** Whether to include suggestions for improvement. */
  includeFeedback: boolean;
  /** Whether to include exemplar responses. */
  includeExemplar: boolean;
}

export interface AssessmentScore {
  criterionName: string;
  score: number;
  maxScore: number;
  justification: string;
}

export interface AssessmentResponse {
  scores: AssessmentScore[];
  totalScore: number;
  maxTotalScore: number;
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  exemplarExcerpt?: string;
  gradeDescriptor: string;
}

/**
 * IAssessmentProvider: Rubric-based marking and feedback generation.
 * Used for grading student work, generating report card narratives.
 */
export interface IAssessmentProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['assessment'];
  assess(request: AssessmentRequest): Promise<AIResult<AssessmentResponse>>;
}

// ============================================================================
// SECTION 4: CONTENT SAFETY CAPABILITY
// ============================================================================

export interface ContentSafetyRequest extends AIRequestOptions {
  content: string;
  contentType: 'text' | 'image-url' | 'audio-transcript';
  /** Target audience age range. */
  ageRange: { min: number; max: number };
  /** Additional safety context (e.g., educational setting). */
  context?: string;
}

export interface ContentSafetyCategory {
  category: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  confidence: number;
  explanation?: string;
}

export interface ContentSafetyResponse {
  safe: boolean;
  overallSeverity: 'none' | 'low' | 'medium' | 'high';
  categories: ContentSafetyCategory[];
  ageAppropriate: boolean;
  suggestedModifications?: string;
  flaggedPhrases: Array<{ phrase: string; reason: string }>;
}

/**
 * IContentSafetyProvider: Age-appropriate screening and bias detection.
 * Used for validating generated storybooks, user-submitted content, chat messages.
 */
export interface IContentSafetyProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['content-safety'];
  checkSafety(request: ContentSafetyRequest): Promise<AIResult<ContentSafetyResponse>>;
}

// ============================================================================
// SECTION 5: VISION CAPABILITY
// ============================================================================

export interface VisionRequest extends AIRequestOptions {
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  prompt: string;
  maxTokens?: number;
}

export interface VisionResponse {
  text: string;
  objects?: Array<{ label: string; confidence: number; boundingBox?: { x: number; y: number; width: number; height: number } }>;
}

/**
 * IVisionProvider: Image understanding and analysis.
 * Used for analysing student drawings, diagram comprehension, OCR.
 */
export interface IVisionProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['vision'];
  analyzeImage(request: VisionRequest): Promise<AIResult<VisionResponse>>;
}

// ============================================================================
// SECTION 6: EMBEDDING CAPABILITY
// ============================================================================

export interface EmbeddingRequest extends AIRequestOptions {
  texts: string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

export interface SimilarityRequest extends AIRequestOptions {
  queryEmbedding: number[];
  candidateEmbeddings: number[][];
  topK?: number;
}

export interface SimilarityResponse {
  scores: Array<{ index: number; score: number }>;
}

/**
 * IEmbeddingProvider: Semantic search and similarity scoring.
 * Used for content recommendation, duplicate detection, search.
 */
export interface IEmbeddingProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['embedding'];
  embed(request: EmbeddingRequest): Promise<AIResult<EmbeddingResponse>>;
  similarity(request: SimilarityRequest): Promise<AIResult<SimilarityResponse>>;
}

// ============================================================================
// SECTION 7: SPEECH CAPABILITY
// ============================================================================

export interface TranscriptionRequest extends AIRequestOptions {
  audioUrl?: string;
  audioBase64?: string;
  audioMimeType?: string;
  language?: string;
  wordTimestamps?: boolean;
}

export interface TranscriptionWord {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptionResponse {
  text: string;
  language: string;
  words: TranscriptionWord[];
  durationMs: number;
}

export interface PronunciationAssessmentRequest extends AIRequestOptions {
  audioBase64: string;
  audioMimeType: string;
  referenceText: string;
  language?: string;
}

export interface PronunciationAssessmentResponse {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: Array<{
    word: string;
    accuracyScore: number;
    errorType: 'none' | 'omission' | 'insertion' | 'mispronunciation';
  }>;
}

export interface TextToSpeechRequest extends AIRequestOptions {
  text: string;
  voiceId: string;
  speed?: number;
  outputFormat?: 'mp3' | 'wav' | 'ogg';
  wordTimestamps?: boolean;
}

export interface TextToSpeechResponse {
  audioBase64: string;
  audioMimeType: string;
  durationMs: number;
  wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }>;
}

/**
 * ISpeechProvider: Transcription, pronunciation assessment, and TTS.
 * Used for read-aloud assessment, storybook narration, voice intelligence.
 */
export interface ISpeechProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['speech'];
  transcribe(request: TranscriptionRequest): Promise<AIResult<TranscriptionResponse>>;
  assessPronunciation(request: PronunciationAssessmentRequest): Promise<AIResult<PronunciationAssessmentResponse>>;
  synthesize(request: TextToSpeechRequest): Promise<AIResult<TextToSpeechResponse>>;
}

// ============================================================================
// SECTION 8: TRANSLATION CAPABILITY
// ============================================================================

export interface TranslationRequest extends AIRequestOptions {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  formality?: 'formal' | 'informal' | 'auto';
  glossary?: Array<{ source: string; target: string }>;
}

export interface TranslationResponse {
  translatedText: string;
  detectedSourceLanguage?: string;
}

/**
 * ITranslationProvider: Multi-language text translation.
 * Used for LinguaFlow module, parent communications, multilingual content.
 */
export interface ITranslationProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['translation'];
  translate(request: TranslationRequest): Promise<AIResult<TranslationResponse>>;
}

// ============================================================================
// SECTION 9: STRUCTURED OUTPUT CAPABILITY
// ============================================================================

export interface StructuredOutputRequest extends AIRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  /** JSON schema that the output must conform to. */
  schema: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface StructuredOutputResponse {
  data: Record<string, unknown>;
  raw: string;
  schemaValid: boolean;
}

/**
 * IStructuredOutputProvider: Schema-constrained JSON generation.
 * Used for form filling, data extraction, structured assessments.
 */
export interface IStructuredOutputProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['structured-output'];
  generate(request: StructuredOutputRequest): Promise<AIResult<StructuredOutputResponse>>;
}

// ============================================================================
// SECTION 10: IMAGE GENERATION CAPABILITY
// ============================================================================

export interface ImageGenerationRequest extends AIRequestOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
  /** Reference image for style consistency. */
  referenceImageBase64?: string;
  /** Number of images to generate. */
  count?: number;
  /** Seed for reproducibility. */
  seed?: number;
}

export interface ImageGenerationResponse {
  images: Array<{
    base64: string;
    mimeType: string;
    revisedPrompt?: string;
    seed?: number;
  }>;
}

/**
 * IImageGenerationProvider: AI image generation.
 * Used for storybook illustrations, avatar creation, educational diagrams.
 */
export interface IImageGenerationProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['image-generation'];
  generate(request: ImageGenerationRequest): Promise<AIResult<ImageGenerationResponse>>;
}

// ============================================================================
// SECTION 11: CAPABILITY TYPE MAP
// ============================================================================

/** Maps capability names to their provider interface types. */
export type CapabilityName =
  | 'text-completion'
  | 'assessment'
  | 'content-safety'
  | 'vision'
  | 'embedding'
  | 'speech'
  | 'translation'
  | 'structured-output'
  | 'image-generation';

export interface CapabilityProviderMap {
  'text-completion': ITextCompletionProvider;
  assessment: IAssessmentProvider;
  'content-safety': IContentSafetyProvider;
  vision: IVisionProvider;
  embedding: IEmbeddingProvider;
  speech: ISpeechProvider;
  translation: ITranslationProvider;
  'structured-output': IStructuredOutputProvider;
  'image-generation': IImageGenerationProvider;
}
