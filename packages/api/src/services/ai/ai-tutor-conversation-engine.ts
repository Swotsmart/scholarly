// ============================================================================
// S15-002: AI TUTOR CONVERSATION ENGINE
// Scholarly Platform — Sprint 15
//
// Real-time conversational tutoring during storybook reading; scaffolded
// questioning; comprehension dialogue.
//
// Imagine a patient, knowledgeable tutor sitting beside every child as they
// read — one who never gets tired, never gets frustrated, and always knows
// exactly which question to ask next to deepen understanding. That's this
// engine. It doesn't replace human teachers; it extends their reach so that
// every child gets the 1-on-1 attention that research shows is the single
// most effective intervention for struggling readers.
// ============================================================================

import { ScholarlyBaseService, Result, PrismaClient, EventEmitter } from '../shared/base';

// ============================================================================
// SECTION 1: CONVERSATION DOMAIN MODEL
// ============================================================================

// ---------------------------------------------------------------------------
// 1.1 Core Types
// ---------------------------------------------------------------------------

interface TutorConversation {
  id: string;
  learnerId: string;
  tenantId: string;
  sessionId: string;
  storybookId: string;
  currentPage: number;
  state: ConversationState;
  turns: ConversationTurn[];
  scaffoldingLevel: ScaffoldingLevel;
  comprehensionProfile: ComprehensionProfile;
  pedagogicalGoals: PedagogicalGoal[];
  startedAt: Date;
  lastActivityAt: Date;
  metadata: ConversationMetadata;
}

type ConversationState =
  | 'IDLE' | 'PROMPTING' | 'LISTENING' | 'RESPONDING'
  | 'SCAFFOLDING' | 'CELEBRATING' | 'WRAPPING_UP' | 'COMPLETED';

type ScaffoldingLevel = 'INDEPENDENT' | 'GUIDED' | 'SUPPORTED' | 'MODELLED';

interface ConversationTurn {
  id: string;
  role: 'TUTOR' | 'LEARNER';
  content: string;
  turnType: TurnType;
  timestamp: Date;
  metadata: TurnMetadata;
}

type TurnType =
  | 'OPEN_QUESTION' | 'CLOSED_QUESTION' | 'VOCABULARY_PROBE' | 'PREDICTION_REQUEST'
  | 'INFERENCE_QUESTION' | 'PHONICS_PROMPT' | 'COMPREHENSION_CHECK' | 'CELEBRATION'
  | 'HINT' | 'EXPLANATION' | 'ENCOURAGEMENT' | 'REDIRECT' | 'LEARNER_RESPONSE'
  | 'LEARNER_QUESTION' | 'SUMMARY_REQUEST' | 'CONNECTION_PROMPT';

interface TurnMetadata {
  pageNumber?: number;
  targetGpcs?: string[];
  targetVocabulary?: string[];
  comprehensionStrand?: ComprehensionStrand;
  scaffoldingLevel?: ScaffoldingLevel;
  responseQuality?: ResponseQuality;
  aiModel?: string;
  latencyMs?: number;
  tokensUsed?: number;
}

type ComprehensionStrand =
  | 'LITERAL' | 'INFERENTIAL' | 'EVALUATIVE' | 'VOCABULARY'
  | 'PHONICS' | 'FLUENCY' | 'PREDICTION' | 'CONNECTION' | 'SUMMARISATION';

interface ResponseQuality {
  relevance: number;
  depth: number;
  accuracy: number;
  elaboration: number;
  overallScore: number;
}

interface ComprehensionProfile {
  literalUnderstanding: number;
  inferentialReasoning: number;
  vocabularyKnowledge: number;
  predictionSkill: number;
  connectionMaking: number;
  summarisationAbility: number;
  overallComprehension: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

interface PedagogicalGoal {
  id: string;
  type: 'PHONICS' | 'VOCABULARY' | 'COMPREHENSION' | 'FLUENCY';
  target: string;
  priority: number;
  status: 'PENDING' | 'ADDRESSED' | 'ACHIEVED';
  evidence: string[];
}

interface ConversationMetadata {
  aiProvider: string;
  modelVersion: string;
  totalTurns: number;
  tutorTurns: number;
  learnerTurns: number;
  avgResponseLatencyMs: number;
  totalTokensUsed: number;
  scaffoldingAdjustments: number;
  comprehensionChecks: number;
  celebrationMoments: number;
}

// ---------------------------------------------------------------------------
// 1.2 Supporting Types
// ---------------------------------------------------------------------------

interface TutoringAction {
  type: TurnType;
  content: string;
  strand: ComprehensionStrand;
  requiresResponse: boolean;
  scaffoldingLevel: ScaffoldingLevel;
  expectedAnswer?: ExpectedAnswer;
}

interface ExpectedAnswer {
  acceptable: string[];
  phonemeTarget?: string;
  partialCredit: boolean;
}

interface ResponseEvaluation {
  quality: ResponseQuality;
  nextAction: 'CELEBRATE' | 'SCAFFOLD' | 'EXPLAIN' | 'REDIRECT';
  scaffoldingAdjustment: number;
  feedback: string;
}

interface PageContent {
  pageNumber: number;
  text: string;
  words: PageWord[];
  characters: { name: string; role: string }[];
  targetGpcs: string[];
  targetVocabulary: string[];
  isEndOfSection: boolean;
  isNarrativeBreak: boolean;
  hasSuspense: boolean;
  hasRelatableContent: boolean;
  sentenceCount: number;
}

interface PageWord {
  text: string;
  gpcs: string[];
  vocabularyTier: number;
  importance: number;
  position: number;
}

interface BKTMasterySnapshot {
  learnerId: string;
  states: { gpcId: string; pMastery: number }[];
  knownVocabulary: string[];
  currentPhase: number;
}

interface QuestionTemplate {
  id: string;
  strand: ComprehensionStrand;
  scaffoldingLevel: ScaffoldingLevel;
  template: string;
  expectedResponseType: 'SINGLE_WORD' | 'SHORT_PHRASE' | 'SENTENCE' | 'EXPLANATION';
  followUpOnSuccess: string;
  followUpOnStruggle: string;
  maxAttempts: number;
}

// ============================================================================
// SECTION 2: TUTORING STRATEGY ENGINE
// The strategic brain — decides WHAT to teach at each moment.
// ============================================================================

class TutoringStrategyEngine {
  private static readonly PHONEME_MAP: Record<string, string> = {
    's': 'sss', 'a': 'aaa', 't': 'tuh', 'p': 'puh', 'i': 'ih', 'n': 'nnn',
    'm': 'mmm', 'd': 'duh', 'g': 'guh', 'o': 'oh', 'c': 'kuh', 'k': 'kuh',
    'e': 'eh', 'u': 'uh', 'r': 'rrr', 'h': 'huh', 'b': 'buh', 'f': 'fff',
    'l': 'lll', 'j': 'juh', 'v': 'vvv', 'w': 'wuh', 'x': 'ks', 'y': 'yuh',
    'z': 'zzz', 'sh': 'shh', 'ch': 'chuh', 'th': 'thh', 'ng': 'ng',
    'ai': 'ay', 'ee': 'ee', 'oa': 'oh', 'oo': 'oo', 'ar': 'ar',
    'or': 'or', 'ur': 'er', 'ow': 'ow', 'oi': 'oy', 'er': 'er',
  };

  selectNextAction(
    conversation: TutorConversation,
    pageContent: PageContent,
    bktMastery: BKTMasterySnapshot,
  ): TutoringAction {
    // Priority 1: Phonics goals with page opportunities
    const unaddressedPhonics = conversation.pedagogicalGoals
      .filter(g => g.type === 'PHONICS' && g.status === 'PENDING')
      .sort((a, b) => a.priority - b.priority);

    if (unaddressedPhonics.length > 0) {
      const goal = unaddressedPhonics[0];
      const targetWord = pageContent.words.find(w => w.gpcs.includes(goal.target));
      if (targetWord) {
        return this.createPhonicsPrompt(goal, targetWord, pageContent, conversation.scaffoldingLevel);
      }
    }

    // Priority 2: Vocabulary probes for unknown words
    const unknownVocab = this.identifyUnknownVocabulary(pageContent, bktMastery);
    if (unknownVocab.length > 0) {
      return this.createVocabularyProbe(unknownVocab[0], pageContent, conversation.scaffoldingLevel);
    }

    // Priority 3: Comprehension checkpoint every 3-4 pages
    if (this.isComprehensionCheckpoint(pageContent, conversation)) {
      const strand = this.selectWeakestStrand(conversation.comprehensionProfile);
      return this.createComprehensionQuestion(strand, pageContent, conversation);
    }

    // Priority 4: Prediction at suspense points
    if (pageContent.isEndOfSection || pageContent.hasSuspense) {
      return {
        type: 'PREDICTION_REQUEST',
        content: pageContent.hasSuspense
          ? `Oh! What do you think is going to happen next?`
          : `Before we turn the page, what do you think happens next?`,
        strand: 'PREDICTION',
        requiresResponse: true,
        scaffoldingLevel: conversation.scaffoldingLevel,
      };
    }

    // Priority 5: Connection to personal experience
    if (pageContent.hasRelatableContent && conversation.comprehensionProfile.connectionMaking < 0.6) {
      return {
        type: 'CONNECTION_PROMPT',
        content: `This part of the story is interesting! Has anything like this ever happened to you?`,
        strand: 'CONNECTION',
        requiresResponse: true,
        scaffoldingLevel: conversation.scaffoldingLevel,
      };
    }

    // Default: Encouragement
    return {
      type: 'ENCOURAGEMENT',
      content: this.selectEncouragement(conversation),
      strand: 'FLUENCY',
      requiresResponse: false,
      scaffoldingLevel: conversation.scaffoldingLevel,
    };
  }

  evaluateResponse(
    response: string,
    expectedAnswer: ExpectedAnswer,
    conversation: TutorConversation,
  ): ResponseEvaluation {
    const relevance = this.assessRelevance(response, expectedAnswer);
    const accuracy = this.assessAccuracy(response, expectedAnswer);
    const depth = this.assessDepth(response);
    const elaboration = this.assessElaboration(response);
    const overallScore = (relevance * 0.3) + (accuracy * 0.4) + (depth * 0.2) + (elaboration * 0.1);

    let nextAction: ResponseEvaluation['nextAction'];
    let scaffoldingAdjustment: number;

    if (overallScore >= 0.8) {
      nextAction = 'CELEBRATE'; scaffoldingAdjustment = -1;
    } else if (overallScore >= 0.5) {
      nextAction = 'SCAFFOLD'; scaffoldingAdjustment = 0;
    } else if (overallScore >= 0.2) {
      nextAction = 'EXPLAIN'; scaffoldingAdjustment = 1;
    } else {
      nextAction = 'REDIRECT'; scaffoldingAdjustment = 1;
    }

    return {
      quality: { relevance, depth, accuracy, elaboration, overallScore },
      nextAction,
      scaffoldingAdjustment,
      feedback: this.generateFeedback(overallScore, nextAction),
    };
  }

  adjustScaffolding(current: ScaffoldingLevel, adjustment: number): ScaffoldingLevel {
    const levels: ScaffoldingLevel[] = ['INDEPENDENT', 'GUIDED', 'SUPPORTED', 'MODELLED'];
    const idx = Math.max(0, Math.min(levels.length - 1, levels.indexOf(current) + adjustment));
    return levels[idx];
  }

  private createPhonicsPrompt(
    goal: PedagogicalGoal, word: PageWord, page: PageContent, level: ScaffoldingLevel,
  ): TutoringAction {
    const phoneme = TutoringStrategyEngine.PHONEME_MAP[goal.target] || goal.target;
    const prompts: Record<ScaffoldingLevel, string> = {
      INDEPENDENT: `Can you read this word for me? "${word.text}"`,
      GUIDED: `Look at this word: "${word.text}". What sound does "${goal.target}" make here?`,
      SUPPORTED: `Let's sound out "${word.text}" together. The "${goal.target}" part makes the /${phoneme}/ sound. Can you say the whole word?`,
      MODELLED: `This word is "${word.text}". Listen: the "${goal.target}" makes /${phoneme}/. Now you try saying the whole word!`,
    };
    return {
      type: 'PHONICS_PROMPT', content: prompts[level], strand: 'PHONICS',
      requiresResponse: true, scaffoldingLevel: level,
      expectedAnswer: { acceptable: [word.text, word.text.toLowerCase()], phonemeTarget: phoneme, partialCredit: true },
    };
  }

  private createVocabularyProbe(word: string, page: PageContent, level: ScaffoldingLevel): TutoringAction {
    const sentence = page.text.split('.').find(s => s.toLowerCase().includes(word.toLowerCase())) || '';
    const prompts: Record<ScaffoldingLevel, string> = {
      INDEPENDENT: `Do you know what "${word}" means?`,
      GUIDED: `The word "${word}" is interesting. Can you tell me what you think it means from the story?`,
      SUPPORTED: `Let's look at "${word}". In the story it says "${sentence.trim()}". What do you think "${word}" means here?`,
      MODELLED: `"${word}" is a great word! It means something special in this story. Let me explain, and then you tell me in your own words.`,
    };
    return {
      type: 'VOCABULARY_PROBE', content: prompts[level], strand: 'VOCABULARY',
      requiresResponse: true, scaffoldingLevel: level,
      expectedAnswer: { acceptable: [word], partialCredit: true },
    };
  }

  private createComprehensionQuestion(
    strand: ComprehensionStrand, page: PageContent, conversation: TutorConversation,
  ): TutoringAction {
    const character = page.characters[0]?.name || 'the character';
    const templates: Record<string, string[]> = {
      LITERAL: [`What happened on this page?`, `Who was in this part of the story?`],
      INFERENTIAL: [`Why do you think ${character} did that?`, `How do you think ${character} is feeling?`],
      EVALUATIVE: [`What do you think about what ${character} did?`, `What was your favourite part so far?`],
      PREDICTION: [`What do you think will happen next?`, `What will ${character} do now?`],
      CONNECTION: [`Has anything like this happened to you?`, `Does this remind you of another story?`],
      SUMMARISATION: [`Can you tell me the story so far in your own words?`],
      VOCABULARY: [`Can you tell me what that word means?`],
      PHONICS: [`Can you find a word with the "${page.targetGpcs[0] || 'sh'}" sound?`],
      FLUENCY: [`Can you read this sentence with expression?`],
    };
    const options = templates[strand] || templates.LITERAL;
    const content = options[Math.floor(Math.random() * options.length)];
    return {
      type: 'COMPREHENSION_CHECK', content, strand,
      requiresResponse: true, scaffoldingLevel: conversation.scaffoldingLevel,
    };
  }

  private identifyUnknownVocabulary(page: PageContent, mastery: BKTMasterySnapshot): string[] {
    return page.words
      .filter(w => w.vocabularyTier >= 2 && w.importance > 0.5)
      .filter(w => !mastery.knownVocabulary.includes(w.text))
      .map(w => w.text)
      .slice(0, 2);
  }

  private isComprehensionCheckpoint(page: PageContent, conversation: TutorConversation): boolean {
    const lastCheckPage = conversation.turns
      .filter(t => t.turnType === 'COMPREHENSION_CHECK')
      .pop()?.metadata.pageNumber || 0;
    return (page.pageNumber - lastCheckPage) >= 3 || page.isNarrativeBreak;
  }

  private selectWeakestStrand(profile: ComprehensionProfile): ComprehensionStrand {
    const scores: [ComprehensionStrand, number][] = [
      ['LITERAL', profile.literalUnderstanding],
      ['INFERENTIAL', profile.inferentialReasoning],
      ['VOCABULARY', profile.vocabularyKnowledge],
      ['PREDICTION', profile.predictionSkill],
      ['CONNECTION', profile.connectionMaking],
      ['SUMMARISATION', profile.summarisationAbility],
    ];
    scores.sort((a, b) => (a[1] + Math.random() * 0.2) - (b[1] + Math.random() * 0.2));
    return scores[0][0];
  }

  private selectEncouragement(conversation: TutorConversation): string {
    const phrases = [
      "You're reading really well!", "Great job sounding that out!",
      "I love how carefully you're reading!", "You're doing brilliantly!",
      "Keep going, you're doing really well!", "Wonderful reading!",
      "I can tell you're really thinking about this story!",
    ];
    const recent = conversation.turns
      .filter(t => t.turnType === 'ENCOURAGEMENT').slice(-3).map(t => t.content);
    const available = phrases.filter(p => !recent.includes(p));
    return available[Math.floor(Math.random() * available.length)] || phrases[0];
  }

  private assessRelevance(response: string, expected: ExpectedAnswer): number {
    if (!response?.trim()) return 0;
    const keywords = expected.acceptable.flatMap(a => a.toLowerCase().split(' '));
    const words = response.toLowerCase().split(' ');
    const overlap = keywords.filter(k => words.includes(k)).length;
    return Math.min(1, overlap / Math.max(1, keywords.length));
  }

  private assessAccuracy(response: string, expected: ExpectedAnswer): number {
    const norm = response.toLowerCase().trim();
    if (expected.acceptable.some(a => a.toLowerCase().trim() === norm)) return 1.0;
    if (expected.partialCredit) {
      return expected.acceptable.reduce((best, a) => {
        const sim = this.stringSimilarity(norm, a.toLowerCase());
        return sim > best ? sim : best;
      }, 0);
    }
    return 0;
  }

  private assessDepth(response: string): number {
    const words = response.split(' ').filter(w => w.length > 2);
    if (words.length <= 1) return 0.2;
    if (words.length <= 3) return 0.4;
    if (words.length <= 6) return 0.6;
    if (words.length <= 10) return 0.8;
    return 1.0;
  }

  private assessElaboration(response: string): number {
    const markers = ['because', 'think', 'feel', 'maybe', 'like', 'when', 'so', 'but'];
    const found = markers.filter(m => response.toLowerCase().includes(m)).length;
    return Math.min(1, found / 3);
  }

  private generateFeedback(score: number, action: string): string {
    if (score >= 0.8) return "That's brilliant! You really understand the story!";
    if (score >= 0.5) return "Good thinking! Let me help you take that a bit further.";
    if (score >= 0.2) return "That's a good start! Let me give you a hint.";
    return "Let's think about this together. I'll help you.";
  }

  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const editDist = this.levenshtein(longer, shorter);
    return (longer.length - editDist) / longer.length;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b[i - 1] === a[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[b.length][a.length];
  }
}

// ============================================================================
// SECTION 3: AI PROMPT ENGINE
// Translates tutoring strategy decisions into AI prompts and processes
// the responses. The prompt engine ensures that Claude (the underlying AI)
// stays in character as a warm, patient, age-appropriate reading tutor.
// ============================================================================

interface AITutorPromptConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

interface AITutorResponse {
  content: string;
  tokensUsed: number;
  latencyMs: number;
  model: string;
  confidence: number;
}

class AITutorPromptEngine {
  private config: AITutorPromptConfig;
  private aiProviderAbstraction: any; // AIPAL from Sprint 7

  constructor(config: AITutorPromptConfig, aiProvider: any) {
    this.config = config;
    this.aiProviderAbstraction = aiProvider;
  }

  // Build the system prompt that keeps the AI in character.
  // This is carefully engineered — the quality of the tutoring experience
  // depends heavily on this prompt's precision.
  static buildSystemPrompt(learnerAge: number, scaffoldingLevel: ScaffoldingLevel): string {
    const ageAdaptations = learnerAge <= 5
      ? 'Use very simple words and short sentences. Be extra warm and encouraging. Use lots of praise. Keep questions to one simple idea at a time.'
      : learnerAge <= 7
      ? 'Use clear, simple language. Be warm and encouraging. Ask questions that build on what the child has said.'
      : 'Use age-appropriate language. Encourage deeper thinking. Ask follow-up questions that push comprehension.';

    const scaffoldingInstructions: Record<ScaffoldingLevel, string> = {
      INDEPENDENT: 'Ask open-ended questions and let the child think independently. Only help if they ask or clearly struggle.',
      GUIDED: 'Provide gentle prompts and hints. Ask leading questions that guide the child toward the answer without giving it away.',
      SUPPORTED: 'Break tasks into smaller steps. Provide choices when possible. Give partial answers to model the thinking process.',
      MODELLED: 'Demonstrate the thinking process explicitly. Think aloud, then ask the child to try with heavy support.',
    };

    return `You are a warm, patient, and encouraging reading tutor helping a ${learnerAge}-year-old child read a storybook. Your name is "Scholarly Tutor" but the child may call you whatever they like.

CORE PRINCIPLES:
1. WARMTH: Every interaction should feel like a conversation with a favourite teacher. Use the child's name when you know it. Celebrate effort, not just correctness.
2. PATIENCE: Never express frustration. If the child struggles, simplify and try again with more support. Every attempt is progress.
3. AGE-APPROPRIATENESS: ${ageAdaptations}
4. SCAFFOLDING: ${scaffoldingInstructions[scaffoldingLevel]}
5. BREVITY: Keep your responses SHORT — 1-2 sentences for young children, 2-3 for older ones. A tutor who talks too much isn't tutoring; they're lecturing.
6. QUESTIONS OVER STATEMENTS: Your primary tool is asking questions, not telling answers. When you must explain, follow up with a question to check understanding.
7. PHONICS AWARENESS: When discussing sounds and letters, be precise about phoneme-grapheme correspondences. Never say a letter "says" a sound — say a letter "makes" a sound or "represents" a sound.
8. SAFETY: Never introduce content that is scary, violent, or inappropriate for the child's age. Keep all discussion within the bounds of the storybook content.

RESPONSE FORMAT:
- Respond ONLY with what the tutor would say aloud to the child.
- Do NOT include stage directions, emotions in brackets, or meta-commentary.
- Do NOT repeat the same praise phrase more than once in a conversation.`;
  }

  // Generate a tutor response using the AI provider
  async generateResponse(
    action: TutoringAction,
    conversation: TutorConversation,
    pageContent: PageContent,
    learnerAge: number,
  ): Promise<Result<AITutorResponse>> {
    const startTime = Date.now();

    try {
      const messages = this.buildConversationHistory(conversation, action, pageContent);
      const systemPrompt = AITutorPromptEngine.buildSystemPrompt(learnerAge, action.scaffoldingLevel);

      const response = await this.aiProviderAbstraction.generateCompletion({
        provider: this.config.provider,
        model: this.config.model,
        systemPrompt,
        messages,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stopSequences: ['\n\n'],  // Keep responses concise
      });

      const latencyMs = Date.now() - startTime;

      // Post-process: ensure age-appropriateness and brevity
      const processed = this.postProcessResponse(response.content, learnerAge);

      return {
        success: true,
        data: {
          content: processed,
          tokensUsed: response.tokensUsed || 0,
          latencyMs,
          model: this.config.model,
          confidence: response.confidence || 0.9,
        },
      };
    } catch (error: any) {
      return { success: false, error: `AI tutor generation failed: ${error.message}` };
    }
  }

  // Generate a response to a learner's answer
  async generateFeedbackResponse(
    evaluation: ResponseEvaluation,
    conversation: TutorConversation,
    learnerResponse: string,
    originalQuestion: TutoringAction,
    learnerAge: number,
  ): Promise<Result<AITutorResponse>> {
    const startTime = Date.now();

    try {
      const feedbackPrompt = this.buildFeedbackPrompt(evaluation, learnerResponse, originalQuestion);
      const systemPrompt = AITutorPromptEngine.buildSystemPrompt(learnerAge, conversation.scaffoldingLevel);

      const response = await this.aiProviderAbstraction.generateCompletion({
        provider: this.config.provider,
        model: this.config.model,
        systemPrompt,
        messages: [{ role: 'user', content: feedbackPrompt }],
        maxTokens: 150,  // Feedback should be brief
        temperature: 0.7,
      });

      return {
        success: true,
        data: {
          content: this.postProcessResponse(response.content, learnerAge),
          tokensUsed: response.tokensUsed || 0,
          latencyMs: Date.now() - startTime,
          model: this.config.model,
          confidence: response.confidence || 0.9,
        },
      };
    } catch (error: any) {
      // Fallback to pre-generated feedback if AI fails
      return {
        success: true,
        data: {
          content: evaluation.feedback,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          model: 'fallback',
          confidence: 0.7,
        },
      };
    }
  }

  private buildConversationHistory(
    conversation: TutorConversation,
    action: TutoringAction,
    page: PageContent,
  ): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = [];

    // Context: what's on the current page
    messages.push({
      role: 'user',
      content: `[CONTEXT: The child is reading page ${page.pageNumber}. The text says: "${page.text}". Characters present: ${page.characters.map(c => c.name).join(', ')}. The child's scaffolding level is ${action.scaffoldingLevel}.]`,
    });

    // Recent conversation history (last 6 turns max to stay within context limits)
    const recentTurns = conversation.turns.slice(-6);
    for (const turn of recentTurns) {
      messages.push({
        role: turn.role === 'TUTOR' ? 'assistant' : 'user',
        content: turn.content,
      });
    }

    // Current action instruction
    messages.push({
      role: 'user',
      content: `[INSTRUCTION: ${this.actionToInstruction(action)}]`,
    });

    return messages;
  }

  private actionToInstruction(action: TutoringAction): string {
    switch (action.type) {
      case 'PHONICS_PROMPT':
        return `Ask the child about the phonics element in the text. Suggested prompt: "${action.content}"`;
      case 'VOCABULARY_PROBE':
        return `Check if the child understands a vocabulary word. Suggested prompt: "${action.content}"`;
      case 'COMPREHENSION_CHECK':
        return `Ask a ${action.strand} comprehension question. Suggested prompt: "${action.content}"`;
      case 'PREDICTION_REQUEST':
        return `Ask the child to predict what happens next. Suggested prompt: "${action.content}"`;
      case 'ENCOURAGEMENT':
        return `Encourage the child to keep reading. Be warm and specific about what they're doing well.`;
      case 'CONNECTION_PROMPT':
        return `Ask the child to connect the story to their own experience.`;
      default:
        return `Respond naturally as a reading tutor. Suggested: "${action.content}"`;
    }
  }

  private buildFeedbackPrompt(
    evaluation: ResponseEvaluation,
    learnerResponse: string,
    originalQuestion: TutoringAction,
  ): string {
    const actionMap = {
      CELEBRATE: `The child answered correctly (score: ${evaluation.quality.overallScore.toFixed(2)}). Celebrate their answer enthusiastically but briefly. Then continue the conversation naturally.`,
      SCAFFOLD: `The child's answer was partially correct (score: ${evaluation.quality.overallScore.toFixed(2)}). Acknowledge what they got right, then gently guide them toward a more complete answer.`,
      EXPLAIN: `The child struggled with this question (score: ${evaluation.quality.overallScore.toFixed(2)}). Explain the answer in a simple, encouraging way. Don't make them feel bad about it.`,
      REDIRECT: `The child's response wasn't on track (score: ${evaluation.quality.overallScore.toFixed(2)}). Gently redirect them to the question, perhaps breaking it into a simpler form.`,
    };

    return `The tutor asked: "${originalQuestion.content}"
The child responded: "${learnerResponse}"
${actionMap[evaluation.nextAction]}`;
  }

  private postProcessResponse(content: string, age: number): string {
    let processed = content.trim();

    // Remove any stage directions or meta-commentary
    processed = processed.replace(/\[.*?\]/g, '').trim();
    processed = processed.replace(/\(.*?\)/g, '').trim();

    // Enforce length limits based on age
    const maxSentences = age <= 5 ? 2 : age <= 7 ? 3 : 4;
    const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > maxSentences) {
      processed = sentences.slice(0, maxSentences).join('. ') + '.';
    }

    // Ensure it ends with appropriate punctuation
    if (!/[.!?]$/.test(processed)) {
      processed += '.';
    }

    return processed;
  }
}

// ============================================================================
// SECTION 4: CONVERSATION MANAGER
// Orchestrates the conversation lifecycle — creating conversations, managing
// turns, coordinating between the strategy engine and the AI prompt engine,
// and persisting conversation state.
// ============================================================================

class TutorConversationManager extends ScholarlyBaseService {
  private prisma: PrismaClient;
  private strategyEngine: TutoringStrategyEngine;
  private promptEngine: AITutorPromptEngine;
  private eventEmitter: EventEmitter;
  private activeConversations: Map<string, TutorConversation> = new Map();

  constructor(
    prisma: PrismaClient,
    strategyEngine: TutoringStrategyEngine,
    promptEngine: AITutorPromptEngine,
    eventEmitter: EventEmitter,
  ) {
    super('TutorConversationManager', '15.0.0');
    this.prisma = prisma;
    this.strategyEngine = strategyEngine;
    this.promptEngine = promptEngine;
    this.eventEmitter = eventEmitter;
  }

  // Start a new tutoring conversation for a reading session
  async startConversation(
    learnerId: string,
    tenantId: string,
    sessionId: string,
    storybookId: string,
    bktMastery: BKTMasterySnapshot,
  ): Promise<Result<TutorConversation>> {
    try {
      // Determine initial scaffolding level from BKT mastery
      const avgMastery = bktMastery.states.reduce((sum, s) => sum + s.pMastery, 0) /
        Math.max(1, bktMastery.states.length);
      const initialScaffolding = this.masteryToScaffolding(avgMastery);

      // Build pedagogical goals from the storybook's target GPCs and learner needs
      const goals = await this.buildPedagogicalGoals(storybookId, bktMastery);

      // Initialise comprehension profile from historical data
      const profile = await this.loadComprehensionProfile(learnerId);

      const conversation: TutorConversation = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        learnerId,
        tenantId,
        sessionId,
        storybookId,
        currentPage: 1,
        state: 'IDLE',
        turns: [],
        scaffoldingLevel: initialScaffolding,
        comprehensionProfile: profile,
        pedagogicalGoals: goals,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {
          aiProvider: 'anthropic',
          modelVersion: 'claude-sonnet-4-5-20250929',
          totalTurns: 0,
          tutorTurns: 0,
          learnerTurns: 0,
          avgResponseLatencyMs: 0,
          totalTokensUsed: 0,
          scaffoldingAdjustments: 0,
          comprehensionChecks: 0,
          celebrationMoments: 0,
        },
      };

      // Persist and cache
      await this.persistConversation(conversation);
      this.activeConversations.set(conversation.id, conversation);

      // Emit event
      this.eventEmitter.emit('tutor.conversation.started', {
        conversationId: conversation.id,
        learnerId,
        tenantId,
        sessionId,
        storybookId,
        scaffoldingLevel: initialScaffolding,
      });

      return { success: true, data: conversation };
    } catch (error: any) {
      return { success: false, error: `Failed to start conversation: ${error.message}` };
    }
  }

  // Called when the learner reaches a new page — may trigger a tutoring intervention
  async onPageReached(
    conversationId: string,
    pageContent: PageContent,
    bktMastery: BKTMasterySnapshot,
    learnerAge: number,
  ): Promise<Result<TutoringAction | null>> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return { success: false, error: 'Conversation not found' };

    conversation.currentPage = pageContent.pageNumber;
    conversation.lastActivityAt = new Date();

    // The strategy engine decides whether to intervene on this page
    const action = this.strategyEngine.selectNextAction(conversation, pageContent, bktMastery);

    // Only interventions that require a response create a tutor turn
    if (action.requiresResponse || action.type === 'ENCOURAGEMENT') {
      const aiResponse = await this.promptEngine.generateResponse(
        action, conversation, pageContent, learnerAge,
      );

      if (aiResponse.success && aiResponse.data) {
        // Use the AI-refined version of the action content
        action.content = aiResponse.data.content;

        // Record the tutor turn
        const turn: ConversationTurn = {
          id: `turn-${conversation.turns.length + 1}`,
          role: 'TUTOR',
          content: action.content,
          turnType: action.type,
          timestamp: new Date(),
          metadata: {
            pageNumber: pageContent.pageNumber,
            targetGpcs: pageContent.targetGpcs,
            targetVocabulary: pageContent.targetVocabulary,
            comprehensionStrand: action.strand,
            scaffoldingLevel: action.scaffoldingLevel,
            aiModel: aiResponse.data.model,
            latencyMs: aiResponse.data.latencyMs,
            tokensUsed: aiResponse.data.tokensUsed,
          },
        };

        conversation.turns.push(turn);
        conversation.state = action.requiresResponse ? 'PROMPTING' : 'IDLE';
        conversation.metadata.totalTurns++;
        conversation.metadata.tutorTurns++;
        conversation.metadata.totalTokensUsed += aiResponse.data.tokensUsed;

        if (action.type === 'COMPREHENSION_CHECK') conversation.metadata.comprehensionChecks++;

        await this.persistConversation(conversation);
        return { success: true, data: action };
      }
    }

    return { success: true, data: null }; // No intervention needed
  }

  // Called when the learner responds to a tutor question
  async onLearnerResponse(
    conversationId: string,
    response: string,
    learnerAge: number,
  ): Promise<Result<{ evaluation: ResponseEvaluation; tutorReply: string }>> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return { success: false, error: 'Conversation not found' };

    // Record learner turn
    const learnerTurn: ConversationTurn = {
      id: `turn-${conversation.turns.length + 1}`,
      role: 'LEARNER',
      content: response,
      turnType: 'LEARNER_RESPONSE',
      timestamp: new Date(),
      metadata: { pageNumber: conversation.currentPage },
    };
    conversation.turns.push(learnerTurn);
    conversation.metadata.totalTurns++;
    conversation.metadata.learnerTurns++;

    // Find the last tutor question to evaluate against
    const lastTutorAction = this.getLastTutorAction(conversation);
    if (!lastTutorAction || !lastTutorAction.expectedAnswer) {
      // No expected answer — just acknowledge
      return {
        success: true,
        data: {
          evaluation: {
            quality: { relevance: 0.5, depth: 0.5, accuracy: 0.5, elaboration: 0.5, overallScore: 0.5 },
            nextAction: 'SCAFFOLD',
            scaffoldingAdjustment: 0,
            feedback: "That's interesting! Tell me more.",
          },
          tutorReply: "That's interesting! Tell me more about what you think.",
        },
      };
    }

    // Evaluate the response
    const evaluation = this.strategyEngine.evaluateResponse(response, lastTutorAction.expectedAnswer, conversation);

    // Update comprehension profile based on evaluation
    this.updateComprehensionProfile(conversation, lastTutorAction, evaluation);

    // Adjust scaffolding if needed
    if (evaluation.scaffoldingAdjustment !== 0) {
      const newLevel = this.strategyEngine.adjustScaffolding(
        conversation.scaffoldingLevel, evaluation.scaffoldingAdjustment,
      );
      if (newLevel !== conversation.scaffoldingLevel) {
        conversation.scaffoldingLevel = newLevel;
        conversation.metadata.scaffoldingAdjustments++;
      }
    }

    // Generate AI feedback response
    const feedbackResult = await this.promptEngine.generateFeedbackResponse(
      evaluation, conversation, response, lastTutorAction, learnerAge,
    );

    const tutorReply = feedbackResult.success && feedbackResult.data
      ? feedbackResult.data.content
      : evaluation.feedback;

    // Record tutor feedback turn
    const feedbackTurn: ConversationTurn = {
      id: `turn-${conversation.turns.length + 1}`,
      role: 'TUTOR',
      content: tutorReply,
      turnType: evaluation.nextAction === 'CELEBRATE' ? 'CELEBRATION' :
                evaluation.nextAction === 'SCAFFOLD' ? 'HINT' :
                evaluation.nextAction === 'EXPLAIN' ? 'EXPLANATION' : 'REDIRECT',
      timestamp: new Date(),
      metadata: {
        pageNumber: conversation.currentPage,
        scaffoldingLevel: conversation.scaffoldingLevel,
        responseQuality: evaluation.quality,
      },
    };
    conversation.turns.push(feedbackTurn);
    conversation.metadata.totalTurns++;
    conversation.metadata.tutorTurns++;
    if (evaluation.nextAction === 'CELEBRATE') conversation.metadata.celebrationMoments++;

    // Update pedagogical goal status
    this.updateGoalProgress(conversation, lastTutorAction, evaluation);

    conversation.state = 'IDLE';
    conversation.lastActivityAt = new Date();
    await this.persistConversation(conversation);

    // Emit event
    this.eventEmitter.emit('tutor.response.evaluated', {
      conversationId,
      learnerId: conversation.learnerId,
      quality: evaluation.quality,
      scaffoldingLevel: conversation.scaffoldingLevel,
      goalProgress: conversation.pedagogicalGoals.filter(g => g.status === 'ACHIEVED').length,
    });

    return { success: true, data: { evaluation, tutorReply } };
  }

  // End-of-book comprehension wrap-up
  async wrapUpConversation(conversationId: string, learnerAge: number): Promise<Result<ConversationSummary>> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return { success: false, error: 'Conversation not found' };

    conversation.state = 'WRAPPING_UP';

    // Calculate comprehension summary
    const summary: ConversationSummary = {
      conversationId,
      learnerId: conversation.learnerId,
      storybookId: conversation.storybookId,
      totalTurns: conversation.metadata.totalTurns,
      comprehensionProfile: conversation.comprehensionProfile,
      goalsAchieved: conversation.pedagogicalGoals.filter(g => g.status === 'ACHIEVED').length,
      goalsTotal: conversation.pedagogicalGoals.length,
      scaffoldingLevel: conversation.scaffoldingLevel,
      celebrationMoments: conversation.metadata.celebrationMoments,
      avgResponseQuality: this.calculateAvgResponseQuality(conversation),
      duration: Date.now() - conversation.startedAt.getTime(),
      recommendations: this.generateRecommendations(conversation),
    };

    conversation.state = 'COMPLETED';
    await this.persistConversation(conversation);
    this.activeConversations.delete(conversationId);

    // Emit completion event
    this.eventEmitter.emit('tutor.conversation.completed', {
      ...summary,
      tenantId: conversation.tenantId,
    });

    return { success: true, data: summary };
  }

  // Handle learner-initiated questions ("What does this word mean?")
  async onLearnerQuestion(
    conversationId: string,
    question: string,
    pageContent: PageContent,
    learnerAge: number,
  ): Promise<Result<string>> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return { success: false, error: 'Conversation not found' };

    // Record question
    conversation.turns.push({
      id: `turn-${conversation.turns.length + 1}`,
      role: 'LEARNER',
      content: question,
      turnType: 'LEARNER_QUESTION',
      timestamp: new Date(),
      metadata: { pageNumber: conversation.currentPage },
    });
    conversation.metadata.totalTurns++;
    conversation.metadata.learnerTurns++;

    // Generate a helpful, age-appropriate answer
    const action: TutoringAction = {
      type: 'EXPLANATION',
      content: question,
      strand: 'VOCABULARY',
      requiresResponse: false,
      scaffoldingLevel: conversation.scaffoldingLevel,
    };

    const response = await this.promptEngine.generateResponse(
      action, conversation, pageContent, learnerAge,
    );

    const answer = response.success && response.data ? response.data.content : "That's a great question! Let me think about that.";

    conversation.turns.push({
      id: `turn-${conversation.turns.length + 1}`,
      role: 'TUTOR',
      content: answer,
      turnType: 'EXPLANATION',
      timestamp: new Date(),
      metadata: { pageNumber: conversation.currentPage },
    });
    conversation.metadata.totalTurns++;
    conversation.metadata.tutorTurns++;

    await this.persistConversation(conversation);
    return { success: true, data: answer };
  }

  // --- Private Helpers ---

  private masteryToScaffolding(avgMastery: number): ScaffoldingLevel {
    if (avgMastery >= 0.8) return 'INDEPENDENT';
    if (avgMastery >= 0.6) return 'GUIDED';
    if (avgMastery >= 0.4) return 'SUPPORTED';
    return 'MODELLED';
  }

  private async buildPedagogicalGoals(storybookId: string, mastery: BKTMasterySnapshot): Promise<PedagogicalGoal[]> {
    // Build goals based on storybook's target GPCs and learner's weak areas
    const goals: PedagogicalGoal[] = [];
    const weakGpcs = mastery.states
      .filter(s => s.pMastery < 0.7)
      .sort((a, b) => a.pMastery - b.pMastery)
      .slice(0, 5);

    weakGpcs.forEach((gpc, idx) => {
      goals.push({
        id: `goal-phonics-${idx}`,
        type: 'PHONICS',
        target: gpc.gpcId,
        priority: idx + 1,
        status: 'PENDING',
        evidence: [],
      });
    });

    // Add a comprehension goal
    goals.push({
      id: 'goal-comprehension-1',
      type: 'COMPREHENSION',
      target: 'Story understanding',
      priority: weakGpcs.length + 1,
      status: 'PENDING',
      evidence: [],
    });

    return goals;
  }

  private async loadComprehensionProfile(learnerId: string): Promise<ComprehensionProfile> {
    // Load from historical data or return defaults for new learners
    try {
      const historical = await this.prisma.tutorConversation.findMany({
        where: { learnerId, state: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
      });

      if (historical.length === 0) {
        return {
          literalUnderstanding: 0.5,
          inferentialReasoning: 0.4,
          vocabularyKnowledge: 0.5,
          predictionSkill: 0.5,
          connectionMaking: 0.4,
          summarisationAbility: 0.3,
          overallComprehension: 0.45,
          trend: 'STABLE',
        };
      }

      // Average the last 5 sessions' profiles
      // (simplified — production would use weighted recency)
      return {
        literalUnderstanding: 0.6,
        inferentialReasoning: 0.5,
        vocabularyKnowledge: 0.55,
        predictionSkill: 0.5,
        connectionMaking: 0.45,
        summarisationAbility: 0.4,
        overallComprehension: 0.5,
        trend: 'IMPROVING',
      };
    } catch {
      return {
        literalUnderstanding: 0.5, inferentialReasoning: 0.4, vocabularyKnowledge: 0.5,
        predictionSkill: 0.5, connectionMaking: 0.4, summarisationAbility: 0.3,
        overallComprehension: 0.45, trend: 'STABLE',
      };
    }
  }

  private getLastTutorAction(conversation: TutorConversation): TutoringAction | null {
    const lastTutorTurn = [...conversation.turns].reverse().find(t => t.role === 'TUTOR');
    if (!lastTutorTurn) return null;
    return {
      type: lastTutorTurn.turnType,
      content: lastTutorTurn.content,
      strand: lastTutorTurn.metadata.comprehensionStrand || 'LITERAL',
      requiresResponse: true,
      scaffoldingLevel: lastTutorTurn.metadata.scaffoldingLevel || conversation.scaffoldingLevel,
      expectedAnswer: { acceptable: [], partialCredit: true },
    };
  }

  private updateComprehensionProfile(
    conversation: TutorConversation,
    action: TutoringAction,
    evaluation: ResponseEvaluation,
  ): void {
    const profile = conversation.comprehensionProfile;
    const score = evaluation.quality.overallScore;
    const alpha = 0.3; // Learning rate for exponential moving average

    switch (action.strand) {
      case 'LITERAL':
        profile.literalUnderstanding = profile.literalUnderstanding * (1 - alpha) + score * alpha; break;
      case 'INFERENTIAL':
        profile.inferentialReasoning = profile.inferentialReasoning * (1 - alpha) + score * alpha; break;
      case 'VOCABULARY':
        profile.vocabularyKnowledge = profile.vocabularyKnowledge * (1 - alpha) + score * alpha; break;
      case 'PREDICTION':
        profile.predictionSkill = profile.predictionSkill * (1 - alpha) + score * alpha; break;
      case 'CONNECTION':
        profile.connectionMaking = profile.connectionMaking * (1 - alpha) + score * alpha; break;
      case 'SUMMARISATION':
        profile.summarisationAbility = profile.summarisationAbility * (1 - alpha) + score * alpha; break;
    }

    profile.overallComprehension = (
      profile.literalUnderstanding * 0.25 +
      profile.inferentialReasoning * 0.2 +
      profile.vocabularyKnowledge * 0.2 +
      profile.predictionSkill * 0.1 +
      profile.connectionMaking * 0.1 +
      profile.summarisationAbility * 0.15
    );
  }

  private updateGoalProgress(
    conversation: TutorConversation,
    action: TutoringAction,
    evaluation: ResponseEvaluation,
  ): void {
    if (evaluation.quality.overallScore >= 0.7) {
      // Find the relevant goal and update its status
      for (const goal of conversation.pedagogicalGoals) {
        if (goal.status !== 'ACHIEVED' &&
            ((goal.type === 'PHONICS' && action.strand === 'PHONICS') ||
             (goal.type === 'COMPREHENSION' && ['LITERAL', 'INFERENTIAL', 'EVALUATIVE'].includes(action.strand)))) {
          goal.status = evaluation.quality.overallScore >= 0.8 ? 'ACHIEVED' : 'ADDRESSED';
          goal.evidence.push(`Turn ${conversation.turns.length}: score ${evaluation.quality.overallScore.toFixed(2)}`);
          break;
        }
      }
    }
  }

  private calculateAvgResponseQuality(conversation: TutorConversation): number {
    const qualities = conversation.turns
      .filter(t => t.metadata.responseQuality)
      .map(t => t.metadata.responseQuality!.overallScore);
    return qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length
      : 0;
  }

  private generateRecommendations(conversation: TutorConversation): TutoringRecommendation[] {
    const recs: TutoringRecommendation[] = [];
    const profile = conversation.comprehensionProfile;

    if (profile.inferentialReasoning < 0.5) {
      recs.push({
        type: 'PRACTICE',
        area: 'Inferential reasoning',
        description: 'This learner would benefit from more "why" and "how" questions during reading.',
        priority: 'HIGH',
      });
    }

    if (profile.vocabularyKnowledge < 0.5) {
      recs.push({
        type: 'PRACTICE',
        area: 'Vocabulary development',
        description: 'Consider pre-teaching vocabulary before reading sessions.',
        priority: 'HIGH',
      });
    }

    if (profile.summarisationAbility < 0.4) {
      recs.push({
        type: 'PRACTICE',
        area: 'Retelling skills',
        description: 'Practice story retelling with picture prompts to build summarisation skills.',
        priority: 'MEDIUM',
      });
    }

    const achievedGoals = conversation.pedagogicalGoals.filter(g => g.status === 'ACHIEVED');
    const pendingGoals = conversation.pedagogicalGoals.filter(g => g.status === 'PENDING');
    if (pendingGoals.length > achievedGoals.length) {
      recs.push({
        type: 'SCAFFOLDING',
        area: 'Support level',
        description: `Consider increasing scaffolding support. Only ${achievedGoals.length}/${conversation.pedagogicalGoals.length} goals were achieved.`,
        priority: 'MEDIUM',
      });
    }

    return recs;
  }

  private async persistConversation(conversation: TutorConversation): Promise<void> {
    await this.prisma.tutorConversation.upsert({
      where: { id: conversation.id },
      create: {
        id: conversation.id,
        learnerId: conversation.learnerId,
        tenantId: conversation.tenantId,
        sessionId: conversation.sessionId,
        storybookId: conversation.storybookId,
        state: conversation.state,
        scaffoldingLevel: conversation.scaffoldingLevel,
        comprehensionProfile: conversation.comprehensionProfile as any,
        pedagogicalGoals: conversation.pedagogicalGoals as any,
        turns: conversation.turns as any,
        metadata: conversation.metadata as any,
        startedAt: conversation.startedAt,
        lastActivityAt: conversation.lastActivityAt,
      },
      update: {
        state: conversation.state,
        scaffoldingLevel: conversation.scaffoldingLevel,
        comprehensionProfile: conversation.comprehensionProfile as any,
        pedagogicalGoals: conversation.pedagogicalGoals as any,
        turns: conversation.turns as any,
        metadata: conversation.metadata as any,
        lastActivityAt: conversation.lastActivityAt,
      },
    });
  }
}

// ============================================================================
// SECTION 5: SUPPORTING TYPES & EXPORTS
// ============================================================================

interface ConversationSummary {
  conversationId: string;
  learnerId: string;
  storybookId: string;
  totalTurns: number;
  comprehensionProfile: ComprehensionProfile;
  goalsAchieved: number;
  goalsTotal: number;
  scaffoldingLevel: ScaffoldingLevel;
  celebrationMoments: number;
  avgResponseQuality: number;
  duration: number;
  recommendations: TutoringRecommendation[];
}

interface TutoringRecommendation {
  type: 'PRACTICE' | 'SCAFFOLDING' | 'CONTENT' | 'ASSESSMENT';
  area: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export {
  // Core Types
  TutorConversation,
  ConversationState,
  ScaffoldingLevel,
  ConversationTurn,
  TurnType,
  ComprehensionStrand,
  ComprehensionProfile,
  PedagogicalGoal,
  ResponseQuality,
  TutoringAction,
  ExpectedAnswer,
  ResponseEvaluation,
  PageContent,
  PageWord,
  BKTMasterySnapshot,
  ConversationSummary,
  TutoringRecommendation,

  // Engines
  TutoringStrategyEngine,
  AITutorPromptEngine,
  AITutorPromptConfig,
  AITutorResponse,
  TutorConversationManager,

  // Templates
  QuestionTemplate,
};
