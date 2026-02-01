/**
 * Virtual Immersion Module - Type Definitions
 *
 * Language learning through immersive virtual environments across 2D, 3D, AR, VR,
 * and WebXR platforms.
 *
 * @module IntelligenceMesh/VirtualImmersion
 * @version 1.7.0
 */

import { MeshBaseEntity } from './mesh-types-v17';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'ru' | 'hi' | 'other';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type EnvironmentType = 'social' | 'travel' | 'business' | 'academic' | 'everyday' | 'cultural';
export type PlatformType = 'web_2d' | 'web_3d' | 'mobile_ar' | 'vr_standalone' | 'vr_tethered' | 'webxr';
export type SessionType = 'solo' | 'guided' | 'collaborative' | 'assessment';
export type NPCPersonality = 'friendly' | 'professional' | 'casual' | 'formal' | 'patient' | 'challenging' | 'humorous' | 'serious';

// ============================================================================
// ENVIRONMENT
// ============================================================================

export interface ImmersionEnvironment extends MeshBaseEntity {
  name: string;
  description: string;
  targetLanguage: Language;
  supportedLanguages: Language[];
  cefrLevel: CEFRLevel;
  type: EnvironmentType;
  category: string;
  culturalContext: string;

  sceneUrl: string;
  sceneFormat: 'glb' | 'gltf' | 'fbx' | 'usdz';
  thumbnailUrl: string;
  previewVideoUrl?: string;

  sceneConfig: {
    spawnPoints: { id: string; position: [number, number, number]; rotation: [number, number, number]; isDefault: boolean }[];
    lighting: { type: 'realistic' | 'stylised'; timeOfDay: string };
    audio: { ambientSounds: { url: string; volume: number }[] };
    navigation: { type: 'free' | 'waypoint' | 'guided'; teleportEnabled: boolean };
    accessibility: { subtitlesAvailable: boolean; audioDescriptionAvailable: boolean };
  };

  npcs: NPCCharacter[];
  interactables: Interactable[];
  learningContent: LearningContent;
  scenarios: ImmersionScenario[];

  platforms: { platform: PlatformType; supported: boolean; optimised: boolean }[];
  status: 'draft' | 'published' | 'archived';
  totalSessions: number;
  averageRating?: number;
}

// ============================================================================
// NPC
// ============================================================================

export interface NPCCharacter {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  position: [number, number, number];
  personality: NPCPersonality;
  voiceId: string;
  speakingSpeed: number;
  nativeLanguage: Language;
  languageProficiency: Record<Language, CEFRLevel>;
  freeConversationEnabled: boolean;

  aiConfig: {
    model: string;
    systemPrompt: string;
    maxResponseLength: number;
    difficultyAdaptation: boolean;
    correctionStyle: 'immediate' | 'gentle' | 'delayed' | 'none';
  };

  knowledgeBase: {
    topics: string[];
    facts: { key: string; value: string }[];
    canDiscuss: string[];
  };

  dialogueTree?: DialogueNode;
}

export interface DialogueNode {
  id: string;
  type: 'npc_speaks' | 'player_choice' | 'action' | 'condition';
  text?: string;
  translations?: Record<Language, string>;
  audioUrl?: string;
  emotion?: string;
  choices?: { id: string; text: string; nextNodeId: string; vocabularyUsed?: string[] }[];
  nextNodeId?: string;
  learningPoints?: { vocabulary: string[]; grammar: string[]; cultural: string[] };
}

export interface Interactable {
  id: string;
  name: string;
  position: [number, number, number];
  modelUrl?: string;
  interactionType: 'click' | 'hover' | 'grab' | 'proximity' | 'voice';
  interactionRange: number;
  onInteract: { type: string; text?: string; audioUrl?: string; scenarioId?: string }[];
  vocabulary?: { word: string; translation: string; audioUrl?: string };
}

// ============================================================================
// LEARNING CONTENT
// ============================================================================

export interface LearningContent {
  vocabulary: VocabularyItem[];
  grammarPoints: GrammarPoint[];
  culturalNotes: CulturalNote[];
  usefulPhrases: Phrase[];
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  phonetic?: string;
  partOfSpeech: string;
  audioUrl?: string;
  imageUrl?: string;
  exampleSentence?: string;
  cefrLevel: CEFRLevel;
  frequency: 'common' | 'uncommon' | 'rare';
  tags: string[];
}

export interface GrammarPoint {
  id: string;
  name: string;
  explanation: string;
  cefrLevel: CEFRLevel;
  examples: { sentence: string; translation: string }[];
}

export interface CulturalNote {
  id: string;
  title: string;
  content: string;
  relevantTo: string[];
}

export interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  context: string;
  formality: 'formal' | 'neutral' | 'informal';
  audioUrl?: string;
}

// ============================================================================
// SCENARIOS
// ============================================================================

export interface ImmersionScenario extends MeshBaseEntity {
  environmentId: string;
  name: string;
  description: string;
  difficulty: CEFRLevel;
  estimatedDuration: number;

  objectives: { id: string; description: string; type: string; required: boolean }[];
  steps: ScenarioStep[];
  involvedNpcs: string[];

  successCriteria: {
    minObjectivesCompleted: number;
    minVocabularyUsed?: number;
    maxTimeMinutes?: number;
  };

  rewards: { experiencePoints: number; tokens?: number; achievement?: string };
  completionCount: number;
  averageScore: number;
}

export interface ScenarioStep {
  id: string;
  type: 'narration' | 'npc_action' | 'player_action' | 'checkpoint';
  narration?: string;
  npcId?: string;
  expectedPlayerAction?: { type: string; acceptableResponses?: string[] };
  hints?: string[];
  nextStepId?: string;
}

// ============================================================================
// SESSIONS
// ============================================================================

export interface ImmersionSession extends MeshBaseEntity {
  environmentId: string;
  environmentName: string;
  userId: string;
  type: SessionType;
  platform: PlatformType;

  startedAt: Date;
  endedAt?: Date;
  duration?: number;

  currentScenarioId?: string;
  scenariosAttempted: string[];
  scenariosCompleted: string[];

  vocabularyPracticed: { vocabularyId: string; word: string; producedCorrectly: boolean; timestamp: Date }[];
  grammarPracticed: { grammarPointId: string; demonstrated: boolean; timestamp: Date }[];
  conversationLog: ConversationTurn[];
  pronunciationAttempts: PronunciationAttempt[];

  overallScore?: number;
  feedback?: SessionFeedback;
  performanceMetrics?: { averageFrameRate: number; averageLatency: number };
}

export interface ConversationTurn {
  timestamp: Date;
  speaker: 'user' | 'npc';
  npcId?: string;
  text: string;
  audioUrl?: string;
  analysis?: {
    vocabulary: string[];
    grammar: string[];
    errors: { type: string; text: string; correction: string }[];
    fluencyScore: number;
  };
}

export interface PronunciationAttempt {
  timestamp: Date;
  word: string;
  expectedPhonetic: string;
  audioUrl?: string;
  score: number;
  phonemeScores?: { phoneme: string; score: number }[];
  feedback: string;
}

export interface SessionFeedback {
  generatedAt: Date;
  overallSummary: string;
  strengthsHighlighted: string[];
  areasForImprovement: string[];

  vocabularyFeedback: { wordsLearned: number; challengingWords: string[]; recommendations: string[] };
  grammarFeedback: { pointsDemonstrated: number; errorPatterns: string[]; recommendations: string[] };
  pronunciationFeedback: { averageScore: number; challengingSounds: string[]; recommendations: string[] };

  recommendedNextEnvironments: string[];
  recommendedPractice: string[];
}

// ============================================================================
// PROGRESS
// ============================================================================

export interface ImmersionProgress extends MeshBaseEntity {
  userId: string;
  language: Language;

  currentCefrLevel: CEFRLevel;
  experiencePoints: number;
  experienceToNextLevel: number;

  skills: {
    listening: { score: number; level: CEFRLevel };
    speaking: { score: number; level: CEFRLevel };
    vocabulary: { score: number; level: CEFRLevel };
    grammar: { score: number; level: CEFRLevel };
    pronunciation: { score: number; level: CEFRLevel };
  };

  vocabularyMastered: number;
  vocabularyLearning: number;
  grammarPointsMastered: number;

  environmentsCompleted: string[];
  scenariosCompleted: number;

  totalSessions: number;
  totalDuration: number;

  currentStreak: number;
  longestStreak: number;
  lastSessionDate?: Date;

  achievements: string[];
}

export interface VocabularyMastery extends MeshBaseEntity {
  userId: string;
  language: Language;
  vocabularyId: string;
  word: string;

  masteryLevel: number;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';

  easeFactor: number;
  interval: number;
  nextReviewDate: Date;

  timesReviewed: number;
  timesCorrect: number;
  lastReviewDate?: Date;
}

// ============================================================================
// AI SERVICE
// ============================================================================

export interface AIImmersionService {
  generateNPCResponse(npc: NPCCharacter, userInput: string, context: { conversationHistory: ConversationTurn[]; userLevel: CEFRLevel }): Promise<{
    response: string;
    emotion: string;
    vocabulary: string[];
    corrections?: { error: string; correction: string; explanation: string }[];
  }>;

  assessPronunciation(audioData: ArrayBuffer, expectedText: string, language: Language): Promise<{
    overallScore: number;
    phonemeScores: { phoneme: string; score: number }[];
    feedback: string;
  }>;

  adjustDifficulty(userProgress: ImmersionProgress, recentPerformance: { score: number }[]): Promise<{
    recommendedLevel: CEFRLevel;
    npcSpeechSpeed: number;
    reasoning: string;
  }>;

  generateSessionFeedback(session: ImmersionSession, userProgress: ImmersionProgress): Promise<SessionFeedback>;

  correctUserSpeech(userText: string, context: string): Promise<{
    correctedText: string;
    errors: { type: string; original: string; corrected: string; explanation: string }[];
  }>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface ImmersionAnalytics {
  tenantId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };

  usage: {
    totalSessions: number;
    uniqueUsers: number;
    totalDuration: number;
    averageSessionDuration: number;
    sessionsByPlatform: { platform: PlatformType; count: number }[];
  };

  learningOutcomes: {
    averageVocabularyPerSession: number;
    scenarioCompletionRate: number;
    averageScore: number;
    levelProgressions: number;
  };

  engagement: {
    returnRate: number;
    averageStreakLength: number;
    peakUsageTimes: { hour: number; count: number }[];
  };

  aiInsights: {
    trends: string[];
    recommendations: string[];
    contentGaps: string[];
  };
}

