/**
 * Little Explorers - AI Service
 *
 * Central AI service powering all AI-enabled features for the Early Years
 * Education platform (ages 3-7). Designed to reduce teacher cognitive load
 * while enhancing learning for children.
 *
 * Features:
 * - Behaviour suggestions from teacher observations
 * - Student and classroom insights
 * - Message drafts and analysis
 * - Caption generation for stories
 * - Portfolio analysis and curriculum tagging
 * - Progress narrative generation
 * - Activity feedback
 * - Safeguarding content checks
 * - Celebration content generation
 * - Learning recommendations
 *
 * @module LittleExplorers/AI
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  isFailure,
  ScholarlyBaseService,
  ServiceDependencies,
} from './base.service';
import {
  LittleExplorersAIProviderConfig,
  LittleExplorersAIContext,
  LittleExplorersAIPromptCategory,
  LittleExplorersAIInteractionLog,
  LittleExplorersAIUsageStats,
  LittleExplorersBehaviourSkill,
  LittleExplorersAIPointSuggestion,
  LittleExplorersStudentBehaviourInsights,
  LittleExplorersClassroomBehaviourInsights,
  LittleExplorersCurriculumTag,
  LittleExplorersProgressNarrative,
  LittleExplorersDevelopmentalArea,
  generateLittleExplorersId,
} from './little-explorers-types';

// ============================================================================
// AI INPUT/OUTPUT TYPES
// ============================================================================

export interface LittleExplorersAIBehaviourSuggestionInput {
  tenantId: string;
  classroomId: string;
  trigger: 'teacher_observation' | 'pattern_detection' | 'manual_request';
  context: LittleExplorersAIContext;
  observation?: {
    text: string;
    studentIds?: string[];
  };
  recentPoints?: { studentId: string; skillId: string; timestamp: Date }[];
  availableSkills: LittleExplorersBehaviourSkill[];
  maxSuggestions?: number;
}

export interface LittleExplorersAIBehaviourSuggestionOutput {
  suggestions: LittleExplorersAIPointSuggestion[];
  reasoning: string;
  patterns?: string[];
  processingTime: number;
}

export interface LittleExplorersAIStudentInsightInput {
  tenantId: string;
  studentId: string;
  context: LittleExplorersAIContext;
  behaviourHistory: { skillName: string; points: number; awardedAt: Date }[];
  classAverages?: { totalPoints: number; skillBreakdown: Record<string, number> };
  periodDays: number;
}

export interface LittleExplorersAIStudentInsightOutput {
  insights: LittleExplorersStudentBehaviourInsights;
  parentMessage: string;
  teacherRecommendations: string[];
  celebrationOpportunities: string[];
  concernFlags: string[];
  confidence: number;
  processingTime: number;
}

export interface LittleExplorersAIClassroomInsightInput {
  tenantId: string;
  classroomId: string;
  context: LittleExplorersAIContext;
  allStudentPoints: Map<string, { skillName: string; points: number; awardedAt: Date }[]>;
  groupData?: { groupId: string; groupName: string; memberIds: string[]; totalPoints: number }[];
  periodDays: number;
}

export interface LittleExplorersAIClassroomInsightOutput {
  insights: LittleExplorersClassroomBehaviourInsights;
  weeklyDigest: string;
  actionItems: string[];
  celebrations: { studentId: string; reason: string }[];
  concerns: { studentId: string; reason: string; urgency: 'low' | 'medium' | 'high' }[];
  processingTime: number;
}

export interface LittleExplorersAIMessageDraftInput {
  tenantId: string;
  teacherId: string;
  context: LittleExplorersAIContext;
  draftContext: {
    purpose: 'celebration' | 'update' | 'concern' | 'introduction' | 'reminder';
    keyPoints?: string[];
    preferredTone: string;
  };
  numberOfDrafts: number;
}

export interface LittleExplorersAIMessageDraftOutput {
  drafts: { text: string; tone: string; wordCount: number; confidence: number; reasoning: string }[];
  suggestedSubject: string;
  toneAnalysis: { professional: number; warm: number; urgent: number };
  keyPointsCovered: string[];
  processingTime: number;
}

export interface LittleExplorersAIMessageAnalysisInput {
  tenantId: string;
  conversationId: string;
  messageContent: string;
  senderRole: string;
  conversationHistory: { role: string; content: string; timestamp: Date }[];
}

export interface LittleExplorersAIMessageAnalysisOutput {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'concerning';
  sentimentScore: number;
  tone: string;
  keyTopics: string[];
  actionItemsDetected: string[];
  safeguardingFlags: string[];
  suggestedResponseTone: string;
  urgency: 'low' | 'normal' | 'high';
  processingTime: number;
}

export interface LittleExplorersAICaptionGenerationInput {
  tenantId: string;
  classroomId: string;
  contentDescription?: string;
  taggedStudentNames?: string[];
  tone: 'celebratory' | 'informative' | 'playful' | 'educational';
  includeLearningConnection?: boolean;
}

export interface LittleExplorersAICaptionGenerationOutput {
  caption: string;
  alternativeCaptions: string[];
  suggestedEmoji: string[];
  detectedActivities: string[];
  learningConnections: string[];
  processingTime: number;
}

export interface LittleExplorersAIPortfolioAnalysisInput {
  tenantId: string;
  studentId: string;
  itemType: string;
  content: {
    text?: string;
    mediaUrls?: string[];
    drawingData?: unknown;
  };
  context: LittleExplorersAIContext;
  curriculumFrameworks: string[];
  developmentalAreasToTrack: LittleExplorersDevelopmentalArea[];
  teacherObservation?: string;
}

export interface LittleExplorersAIPortfolioAnalysisOutput {
  description: string;
  detectedElements: string[];
  suggestedCurriculumTags: LittleExplorersCurriculumTag[];
  curriculumConfidence: number;
  developmentalObservations: string[];
  suggestedDevelopmentalAreas: LittleExplorersDevelopmentalArea[];
  developmentalConfidence: number;
  skillsDemonstrated: string[];
  qualityScore: number;
  qualityNotes: string;
  highlightRecommendation: boolean;
  highlightReason?: string;
  potentialMilestones: { milestoneId: string; confidence: number; evidence: string }[];
  processingTime: number;
}

export interface LittleExplorersAIProgressNarrativeInput {
  tenantId: string;
  studentId: string;
  context: LittleExplorersAIContext;
  portfolioItems: { id: string; title: string; type: string; isHighlight: boolean; capturedAt: Date }[];
  behaviourSummary: { totalPoints: number; topSkills: string[]; trend: string };
  milestones: { achieved: string[]; inProgress: string[] };
  period: string;
  dateRange: { start: Date; end: Date };
  audience: 'teacher' | 'parent' | 'formal';
  tone: 'celebratory' | 'balanced' | 'developmental';
}

export interface LittleExplorersAIProgressNarrativeOutput {
  narrative: LittleExplorersProgressNarrative;
  keyHighlights: string[];
  suggestedGoals: string[];
  parentTalkingPoints: string[];
  processingTime: number;
}

export interface LittleExplorersAIActivityFeedbackInput {
  tenantId: string;
  activityId: string;
  studentId: string;
  activity: { title: string; type: string; instructions?: string };
  response: { type: string; content: unknown };
  context: LittleExplorersAIContext;
  feedbackType: 'encouraging' | 'instructional' | 'celebratory';
  audienceAge: number;
  includeNextSteps: boolean;
}

export interface LittleExplorersAIActivityFeedbackOutput {
  feedback: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  encouragement: string;
  detectedSkills: string[];
  processingTime: number;
}

export interface LittleExplorersAISafeguardingCheckInput {
  tenantId: string;
  contentType: 'text' | 'image' | 'audio';
  content: string;
  customKeywords?: string[];
}

export interface LittleExplorersAISafeguardingCheckOutput {
  safe: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  flags: { type: string; description: string; confidence: number }[];
  recommendedAction: 'none' | 'flag_for_review' | 'block' | 'alert_admin';
  explanation: string;
  processingTime: number;
}

export interface LittleExplorersAICelebrationContentInput {
  tenantId: string;
  context: LittleExplorersAIContext;
  achievementType: 'milestone' | 'points' | 'streak' | 'improvement' | 'activity';
  achievementDetails: string;
  forDisplay: 'student' | 'parent' | 'class';
  includeEmoji: boolean;
}

export interface LittleExplorersAICelebrationContentOutput {
  title: string;
  message: string;
  emoji: string;
  encouragement: string;
  sharableText: string;
  suggestedNextChallenge: string;
  processingTime: number;
}

export interface LittleExplorersAILearningRecommendationInput {
  tenantId: string;
  studentId: string;
  learningProfile: {
    interests: string[];
    strengths: string[];
    challenges: string[];
    learningStyle?: string;
  };
  currentGoals: string[];
  recommendationType: 'activity' | 'skill_focus' | 'extension' | 'support';
  count: number;
}

export interface LittleExplorersAILearningRecommendationOutput {
  recommendations: {
    type: string;
    title: string;
    description: string;
    rationale: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
    estimatedMinutes: number;
    alignedGoals: string[];
  }[];
  personalizationNotes: string;
  processingTime: number;
}

// ============================================================================
// LITTLE EXPLORERS AI SERVICE
// ============================================================================

export class LittleExplorersAIService extends ScholarlyBaseService {
  private aiConfig: LittleExplorersAIProviderConfig;
  private readonly interactionLogs: LittleExplorersAIInteractionLog[] = [];

  constructor(deps?: ServiceDependencies, aiConfig?: Partial<LittleExplorersAIProviderConfig>) {
    super('LittleExplorersAIService', deps);
    this.aiConfig = this.createDefaultConfig(aiConfig);
  }

  private createDefaultConfig(overrides?: Partial<LittleExplorersAIProviderConfig>): LittleExplorersAIProviderConfig {
    return {
      provider: 'anthropic',
      models: {
        reasoning: 'claude-sonnet-4-20250514',
        generation: 'claude-sonnet-4-20250514',
        embedding: 'text-embedding-3-small',
        moderation: 'claude-haiku',
        vision: 'claude-sonnet-4-20250514',
      },
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
        requestsPerDay: 10000,
      },
      features: {
        behaviourSuggestions: true,
        communicationDrafts: true,
        portfolioAnalysis: true,
        progressNarratives: true,
        safeguardingMonitor: true,
        curriculumTagging: true,
        translationEnhancement: true,
        studentInsights: true,
        teacherAssistant: true,
        parentEngagement: true,
      },
      logInteractions: true,
      retainLogsForDays: 30,
      ...overrides,
    };
  }

  configure(config: Partial<LittleExplorersAIProviderConfig>): void {
    this.aiConfig = { ...this.aiConfig, ...config };
    log.info('Little Explorers AI configuration updated', { provider: this.aiConfig.provider });
  }

  getConfig(): LittleExplorersAIProviderConfig {
    return { ...this.aiConfig };
  }

  // ---------------------------------------------------------------------------
  // BEHAVIOUR SUGGESTIONS
  // ---------------------------------------------------------------------------

  async generateBehaviourSuggestions(
    input: LittleExplorersAIBehaviourSuggestionInput
  ): Promise<Result<LittleExplorersAIBehaviourSuggestionOutput>> {
    if (!this.aiConfig.features.behaviourSuggestions) {
      return success({
        suggestions: [],
        reasoning: 'Behaviour suggestions disabled',
        processingTime: 0,
      });
    }

    return this.withTiming('generateBehaviourSuggestions', async () => {
      const startTime = Date.now();

      const suggestions = await this.analyzeBehaviourForSuggestions(input);
      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'behaviour_suggestion',
        inputSummary: `Trigger: ${input.trigger}`,
        outputSummary: `${suggestions.length} suggestions`,
        processingTime,
        classroomId: input.classroomId,
      });

      return success({
        suggestions,
        reasoning: this.generateSuggestionReasoning(suggestions, input),
        patterns: this.detectBehaviourPatterns(input.recentPoints || []),
        processingTime,
      });
    });
  }

  private async analyzeBehaviourForSuggestions(
    input: LittleExplorersAIBehaviourSuggestionInput
  ): Promise<LittleExplorersAIPointSuggestion[]> {
    const suggestions: LittleExplorersAIPointSuggestion[] = [];
    const observation = input.observation?.text?.toLowerCase() || '';

    for (const skill of input.availableSkills) {
      if (!skill.isActive || !skill.isPositive) continue;

      const matchScore = this.calculateSkillMatch(observation, skill);

      if (matchScore >= skill.aiConfig.autoSuggestConfidence) {
        const mentionedStudents = input.observation?.studentIds || [];

        if (mentionedStudents.length > 0) {
          suggestions.push({
            id: generateLittleExplorersId('sug'),
            tenantId: input.tenantId,
            schoolId: input.context.school.id,
            classroomId: input.classroomId,
            observationSource: input.trigger === 'teacher_observation' ? 'teacher_note' : 'pattern_detection',
            observationText: input.observation?.text,
            suggestedStudentIds: mentionedStudents,
            suggestedSkillId: skill.id,
            suggestedSkillName: skill.name,
            suggestedPoints: skill.defaultPoints,
            reasoning: this.generateSkillReasoning(skill, observation),
            confidence: matchScore,
            detectedBehaviours: skill.aiConfig.triggerKeywords.filter((kw) =>
              observation.includes(kw.toLowerCase())
            ),
            alternatives: this.findAlternativeSkills(input.availableSkills, skill, observation),
            status: 'pending',
            suggestedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, input.maxSuggestions || 5);
  }

  private calculateSkillMatch(observation: string, skill: LittleExplorersBehaviourSkill): number {
    let score = 0;
    let maxScore = 0;

    for (const keyword of skill.aiConfig.triggerKeywords) {
      maxScore += 1;
      if (observation.includes(keyword.toLowerCase())) score += 1;
    }

    for (const phrase of skill.aiConfig.observationPhrases) {
      maxScore += 2;
      if (observation.includes(phrase.toLowerCase())) score += 2;
    }

    for (const indicator of skill.aiConfig.contextIndicators) {
      maxScore += 0.5;
      if (observation.includes(indicator.toLowerCase())) score += 0.5;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private generateSkillReasoning(skill: LittleExplorersBehaviourSkill, observation: string): string {
    const detected = skill.aiConfig.triggerKeywords.filter((kw) =>
      observation.toLowerCase().includes(kw.toLowerCase())
    );
    return `Detected "${skill.name}" based on: ${detected.slice(0, 3).join(', ') || 'contextual analysis'}`;
  }

  private findAlternativeSkills(
    skills: LittleExplorersBehaviourSkill[],
    primary: LittleExplorersBehaviourSkill,
    observation: string
  ): { skillId: string; skillName: string; confidence: number }[] {
    return skills
      .filter((s) => s.id !== primary.id && s.isActive)
      .map((s) => ({
        skillId: s.id,
        skillName: s.name,
        confidence: this.calculateSkillMatch(observation, s),
      }))
      .filter((s) => s.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private generateSuggestionReasoning(
    suggestions: LittleExplorersAIPointSuggestion[],
    _input: LittleExplorersAIBehaviourSuggestionInput
  ): string {
    if (suggestions.length === 0) return 'No clear behaviour indicators detected.';
    const topSkills = suggestions.map((s) => s.suggestedSkillName).slice(0, 3);
    return `Detected indicators for: ${topSkills.join(', ')}. Confidence: ${Math.round(
      suggestions[0].confidence * 100
    )}%`;
  }

  private detectBehaviourPatterns(
    recentPoints: { studentId: string; skillId: string; timestamp: Date }[]
  ): string[] {
    const patterns: string[] = [];
    if (recentPoints.length < 5) return patterns;

    const skillCounts = new Map<string, number>();
    for (const p of recentPoints) {
      skillCounts.set(p.skillId, (skillCounts.get(p.skillId) || 0) + 1);
    }

    const topSkill = [...skillCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topSkill && topSkill[1] >= recentPoints.length * 0.4) {
      patterns.push(`High frequency of "${topSkill[0]}" awards`);
    }

    return patterns;
  }

  // ---------------------------------------------------------------------------
  // STUDENT INSIGHTS
  // ---------------------------------------------------------------------------

  async generateStudentInsights(
    input: LittleExplorersAIStudentInsightInput
  ): Promise<Result<LittleExplorersAIStudentInsightOutput>> {
    if (!this.aiConfig.features.studentInsights) {
      return failure({
        code: 'FEATURE_DISABLED',
        message: 'Student insights feature is disabled',
      });
    }

    return this.withTiming('generateStudentInsights', async () => {
      const startTime = Date.now();
      const result = await this.analyzeStudentBehaviour(input);
      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'behaviour_insight',
        inputSummary: `Student ${input.studentId}, ${input.periodDays} days`,
        outputSummary: `Trend: ${result.insights.trend}`,
        processingTime,
        studentId: input.studentId,
      });

      return success({ ...result, processingTime });
    });
  }

  private async analyzeStudentBehaviour(
    input: LittleExplorersAIStudentInsightInput
  ): Promise<Omit<LittleExplorersAIStudentInsightOutput, 'processingTime'>> {
    const { behaviourHistory, context, classAverages, periodDays } = input;

    const totalPoints = behaviourHistory.reduce((sum, p) => sum + p.points, 0);
    const skillCounts = new Map<string, number>();
    for (const point of behaviourHistory) {
      skillCounts.set(point.skillName, (skillCounts.get(point.skillName) || 0) + 1);
    }

    const topSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Determine trend
    const recentPoints = behaviourHistory.filter(
      (p) => p.awardedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const olderPoints = behaviourHistory.filter((p) => {
      const ago = Date.now() - p.awardedAt.getTime();
      return ago > 7 * 24 * 60 * 60 * 1000 && ago <= 14 * 24 * 60 * 60 * 1000;
    });

    const recentAvg =
      recentPoints.length > 0 ? recentPoints.reduce((sum, p) => sum + p.points, 0) / 7 : 0;
    const olderAvg =
      olderPoints.length > 0 ? olderPoints.reduce((sum, p) => sum + p.points, 0) / 7 : 0;

    let trend: 'excelling' | 'improving' | 'stable' | 'needs_support';
    if (recentAvg > olderAvg * 1.2) {
      trend =
        recentAvg > ((classAverages?.totalPoints || 0) / periodDays) * 1.5 ? 'excelling' : 'improving';
    } else if (recentAvg < olderAvg * 0.8) {
      trend = 'needs_support';
    } else {
      trend = 'stable';
    }

    const studentName = context.student?.firstName || 'The student';

    const insights: LittleExplorersStudentBehaviourInsights = {
      summary: `${studentName} has earned ${totalPoints} Explorer Points. Strengths: ${
        topSkills.join(', ') || 'various areas'
      }.`,
      strengths: this.identifyStrengths(topSkills),
      growthAreas: trend === 'needs_support' ? ['Building consistent positive habits'] : [],
      patterns: recentAvg > olderAvg ? ['Strongest engagement recently'] : [],
      recommendations: this.getRecommendations(trend),
      teacherTips:
        trend === 'needs_support' ? ['Focus on specific, achievable behaviours to award'] : [],
      parentMessage: `${studentName} is ${
        trend === 'excelling'
          ? 'doing wonderfully'
          : trend === 'improving'
          ? 'making great progress'
          : 'working hard'
      } at school!`,
      celebrationSuggestions: totalPoints >= 100 ? ['100 Point Champion certificate'] : [],
      trend,
      confidenceLevel: behaviourHistory.length >= 10 ? 0.85 : 0.6,
      generatedAt: new Date(),
    };

    return {
      insights,
      parentMessage: insights.parentMessage,
      teacherRecommendations: insights.recommendations,
      celebrationOpportunities: insights.celebrationSuggestions,
      concernFlags: trend === 'needs_support' ? ['Declining engagement detected'] : [],
      confidence: insights.confidenceLevel,
    };
  }

  private identifyStrengths(topSkills: string[]): string[] {
    const strengths: string[] = [];
    if (topSkills.includes('Kind Hearts') || topSkills.includes('Helping Hands')) {
      strengths.push('Shows natural empathy and care for others');
    }
    if (topSkills.includes('Hard Worker') || topSkills.includes('Brave Learner')) {
      strengths.push('Demonstrates strong work ethic and perseverance');
    }
    if (topSkills.includes('Super Listener') || topSkills.includes('Respectful')) {
      strengths.push('Excellent self-regulation and classroom behaviour');
    }
    if (strengths.length === 0) strengths.push('Consistent effort across multiple areas');
    return strengths;
  }

  private getRecommendations(trend: string): string[] {
    const recs: Record<string, string[]> = {
      needs_support: [
        'One-on-one check-ins',
        'Catch positive behaviours early',
        'Partner with supportive peer',
      ],
      improving: ['Acknowledge improvement explicitly', 'Gradually increase challenge'],
      excelling: ['Consider peer mentoring', 'Leadership roles in activities'],
      stable: ['Continue current approach', 'Look for new growth opportunities'],
    };
    return recs[trend] || recs.stable;
  }

  // ---------------------------------------------------------------------------
  // CLASSROOM INSIGHTS
  // ---------------------------------------------------------------------------

  async generateClassroomInsights(
    input: LittleExplorersAIClassroomInsightInput
  ): Promise<Result<LittleExplorersAIClassroomInsightOutput>> {
    return this.withTiming('generateClassroomInsights', async () => {
      const startTime = Date.now();

      const allPoints: { studentId: string; skillName: string; points: number; awardedAt: Date }[] =
        [];
      for (const [studentId, points] of input.allStudentPoints) {
        for (const point of points) {
          allPoints.push({ studentId, skillName: point.skillName, points: point.points, awardedAt: point.awardedAt });
        }
      }

      const insights = this.analyzeClassroomBehaviour(allPoints, input);
      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'behaviour_insight',
        inputSummary: `Classroom ${input.classroomId}, ${input.allStudentPoints.size} students`,
        outputSummary: `Generated classroom insights`,
        processingTime,
        classroomId: input.classroomId,
      });

      return success({
        insights,
        weeklyDigest: `Weekly Digest\n${insights.overallSummary}`,
        actionItems: insights.immediateActions,
        celebrations: insights.topPerformers.map((tp) => ({ studentId: tp.studentId, reason: tp.reason })),
        concerns: insights.needingSupport.map((ns) => ({
          studentId: ns.studentId,
          reason: ns.reason,
          urgency: 'medium' as const,
        })),
        processingTime,
      });
    });
  }

  private analyzeClassroomBehaviour(
    allPoints: { studentId: string; skillName: string; points: number }[],
    _input: LittleExplorersAIClassroomInsightInput
  ): LittleExplorersClassroomBehaviourInsights {
    const studentTotals = new Map<string, number>();
    for (const point of allPoints) {
      studentTotals.set(point.studentId, (studentTotals.get(point.studentId) || 0) + point.points);
    }

    const sortedStudents = [...studentTotals.entries()].sort((a, b) => b[1] - a[1]);
    const average =
      sortedStudents.length > 0
        ? sortedStudents.reduce((sum, [, pts]) => sum + pts, 0) / sortedStudents.length
        : 0;

    const skillCounts = new Map<string, number>();
    for (const point of allPoints) {
      skillCounts.set(point.skillName, (skillCounts.get(point.skillName) || 0) + 1);
    }
    const topSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      overallSummary: `Class total: ${allPoints.reduce(
        (sum, p) => sum + p.points,
        0
      )} points. Average: ${Math.round(average)}. Top skills: ${topSkills.join(', ')}.`,
      classStrengths: [
        `Strong in ${topSkills[0] || 'various areas'}`,
        `${allPoints.length} recognitions total`,
      ],
      focusAreas:
        sortedStudents.filter(([, pts]) => pts < average * 0.5).length > 0
          ? ['Some students need support']
          : [],
      dynamicsObservations: [],
      topPerformers: sortedStudents.slice(0, 3).map(([id, pts]) => ({ studentId: id, reason: `${pts} points` })),
      needingSupport: sortedStudents
        .filter(([, pts]) => pts < average * 0.5)
        .slice(0, 3)
        .map(([id, pts]) => ({
          studentId: id,
          reason: `${pts} points (below average)`,
          suggestions: ['More frequent recognition'],
        })),
      immediateActions: ['Celebrate class achievements', 'Check in with lower-engagement students'],
      weeklyGoals: [`Aim for class average of ${Math.round(average * 1.1)} points`],
      positivePatterns: ['Consistent daily recognition'],
      concerningPatterns: [],
      predictedChallenges: [],
      generatedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // MESSAGE DRAFTS
  // ---------------------------------------------------------------------------

  async generateMessageDrafts(
    input: LittleExplorersAIMessageDraftInput
  ): Promise<Result<LittleExplorersAIMessageDraftOutput>> {
    if (!this.aiConfig.features.communicationDrafts) {
      return failure({
        code: 'FEATURE_DISABLED',
        message: 'Communication drafts feature is disabled',
      });
    }

    return this.withTiming('generateMessageDrafts', async () => {
      const startTime = Date.now();
      const drafts = this.createMessageDrafts(input);
      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'communication_draft',
        inputSummary: `Purpose: ${input.draftContext.purpose}`,
        outputSummary: `${drafts.length} drafts`,
        processingTime,
        userId: input.teacherId,
      });

      return success({
        drafts,
        suggestedSubject: this.getSubjectLine(input.draftContext.purpose),
        toneAnalysis: { professional: 0.7, warm: 0.8, urgent: 0.2 },
        keyPointsCovered: input.draftContext.keyPoints || [],
        processingTime,
      });
    });
  }

  private createMessageDrafts(
    input: LittleExplorersAIMessageDraftInput
  ): { text: string; tone: string; wordCount: number; confidence: number; reasoning: string }[] {
    const { context, draftContext } = input;
    const parentName = context.parent?.firstName || 'there';
    const studentName = context.student?.firstName || 'your child';
    const teacherName = context.teacher?.firstName || 'Teacher';

    const tones = [draftContext.preferredTone, 'warm', 'professional'].slice(0, input.numberOfDrafts);

    return tones.map((tone) => {
      const greeting = tone === 'professional' ? `Dear ${parentName},` : `Hi ${parentName}!`;
      const closing = tone === 'professional' ? `Best regards,\n${teacherName}` : `Warmly,\n${teacherName}`;

      let body = '';
      switch (draftContext.purpose) {
        case 'celebration':
          body = `I'm excited to share that ${studentName} has been doing wonderfully! They've shown great progress and we're so proud!`;
          break;
        case 'update':
          body = `I wanted to give you a quick update on ${studentName}. They've been engaged and participating well in class activities.`;
          break;
        case 'concern':
          body = `I wanted to reach out about ${studentName}. I've noticed they seem a bit quieter than usual. Is everything okay?`;
          break;
        case 'introduction':
          body = `Welcome! I'm so excited to be ${studentName}'s teacher this year. Please don't hesitate to reach out anytime.`;
          break;
        default:
          body = `I wanted to touch base about ${studentName}. Please let me know if you have any questions.`;
      }

      const text = `${greeting}\n\n${body}\n\n${closing}`;
      return {
        text,
        tone,
        wordCount: text.split(/\s+/).length,
        confidence: 0.85,
        reasoning: `${tone} tone for ${draftContext.purpose}`,
      };
    });
  }

  private getSubjectLine(purpose: string): string {
    const subjects: Record<string, string> = {
      celebration: 'Great news about your child!',
      update: 'Weekly update from class',
      concern: 'Quick check-in',
      introduction: 'Welcome to our class!',
      reminder: 'Friendly reminder',
    };
    return subjects[purpose] || 'A message from class';
  }

  // ---------------------------------------------------------------------------
  // MESSAGE ANALYSIS
  // ---------------------------------------------------------------------------

  async analyzeMessage(
    input: LittleExplorersAIMessageAnalysisInput
  ): Promise<Result<LittleExplorersAIMessageAnalysisOutput>> {
    return this.withTiming('analyzeMessage', async () => {
      const startTime = Date.now();
      const content = input.messageContent.toLowerCase();

      const positiveWords = ['thank', 'great', 'wonderful', 'happy', 'pleased', 'excellent', 'love', 'appreciate'];
      const negativeWords = ['concern', 'worried', 'upset', 'unhappy', 'problem', 'issue', 'disappointed'];
      const urgentWords = ['urgent', 'immediately', 'asap', 'emergency', 'important'];

      const positiveCount = positiveWords.filter((w) => content.includes(w)).length;
      const negativeCount = negativeWords.filter((w) => content.includes(w)).length;
      const urgentCount = urgentWords.filter((w) => content.includes(w)).length;

      const sentimentScore =
        (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);

      let sentiment: LittleExplorersAIMessageAnalysisOutput['sentiment'];
      if (sentimentScore > 0.5) sentiment = 'very_positive';
      else if (sentimentScore > 0) sentiment = 'positive';
      else if (sentimentScore > -0.5) sentiment = 'neutral';
      else sentiment = negativeCount > 2 ? 'concerning' : 'negative';

      const safeguardingFlags = this.quickSafeguardingCheck(content);
      const processingTime = Date.now() - startTime;

      return success({
        sentiment,
        sentimentScore,
        tone: positiveCount > negativeCount ? 'warm' : 'professional',
        keyTopics: this.extractTopics(content),
        actionItemsDetected: this.extractActionItems(content),
        safeguardingFlags,
        suggestedResponseTone: sentiment === 'concerning' ? 'professional' : 'warm',
        urgency: urgentCount > 0 ? 'high' : negativeCount > 1 ? 'normal' : 'low',
        processingTime,
      });
    });
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const patterns: [RegExp, string][] = [
      [/behavio?ur|point/i, 'behaviour'],
      [/sick|ill|unwell|doctor/i, 'health'],
      [/absent|attendance/i, 'attendance'],
      [/homework|assignment/i, 'homework'],
      [/friend|social|play/i, 'social'],
    ];
    for (const [pattern, topic] of patterns) {
      if (pattern.test(content)) topics.push(topic);
    }
    return topics;
  }

  private extractActionItems(content: string): string[] {
    const items: string[] = [];
    if (/call me|phone me/i.test(content)) items.push('Phone call requested');
    if (/meet|meeting/i.test(content)) items.push('Meeting requested');
    if (/question/i.test(content)) items.push('Question needs answering');
    return items;
  }

  private quickSafeguardingCheck(content: string): string[] {
    const flags: string[] = [];
    const patterns: [RegExp, string][] = [
      [/hurt|hit|abuse/i, 'Potential safety concern'],
      [/scared|afraid/i, 'Fear/anxiety mentioned'],
      [/hungry|no food/i, 'Food security concern'],
    ];
    for (const [pattern, flag] of patterns) {
      if (pattern.test(content)) flags.push(flag);
    }
    return flags;
  }

  // ---------------------------------------------------------------------------
  // CAPTION GENERATION
  // ---------------------------------------------------------------------------

  async generateCaption(
    input: LittleExplorersAICaptionGenerationInput
  ): Promise<Result<LittleExplorersAICaptionGenerationOutput>> {
    return this.withTiming('generateCaption', async () => {
      const startTime = Date.now();

      const students = input.taggedStudentNames || [];
      const studentText =
        students.length > 0
          ? students.length === 1
            ? students[0]
            : `${students.slice(0, -1).join(', ')} and ${students[students.length - 1]}`
          : 'Our little explorers';

      const description = input.contentDescription || '';

      const templates: Record<string, string[]> = {
        celebratory: [`Amazing work by ${studentText}! ${description}`, `So proud of ${studentText}!`],
        informative: [`Today ${studentText} explored ${description}`, `Learning in action: ${studentText}`],
        playful: [`Look what ${studentText} got up to! ${description}`, `Fun times with ${studentText}!`],
        educational: [`${studentText} developing skills through ${description}`, `Building foundations!`],
      };

      const selected = templates[input.tone] || templates.informative;
      const emoji = this.suggestEmoji(description);
      const activities = this.detectActivities(description);
      const learningConnections = input.includeLearningConnection
        ? this.getLearningConnections(activities)
        : [];

      return success({
        caption: selected[0],
        alternativeCaptions: selected.slice(1),
        suggestedEmoji: emoji,
        detectedActivities: activities,
        learningConnections,
        processingTime: Date.now() - startTime,
      });
    });
  }

  private suggestEmoji(description: string): string[] {
    const emoji: string[] = [];
    const desc = description.toLowerCase();
    if (desc.includes('art') || desc.includes('paint')) emoji.push('art');
    if (desc.includes('read') || desc.includes('book')) emoji.push('books');
    if (desc.includes('build') || desc.includes('block')) emoji.push('blocks');
    if (desc.includes('music') || desc.includes('sing')) emoji.push('music');
    if (desc.includes('nature') || desc.includes('garden')) emoji.push('nature');
    return emoji.slice(0, 5);
  }

  private detectActivities(description: string): string[] {
    const activities: string[] = [];
    const patterns: [RegExp, string][] = [
      [/paint|draw|art/i, 'Art & Creativity'],
      [/read|book|story/i, 'Literacy'],
      [/count|number|math/i, 'Numeracy'],
      [/build|construct/i, 'Construction Play'],
      [/music|dance/i, 'Music & Movement'],
    ];
    for (const [pattern, activity] of patterns) {
      if (pattern.test(description)) activities.push(activity);
    }
    return activities;
  }

  private getLearningConnections(activities: string[]): string[] {
    const connections: Record<string, string[]> = {
      'Art & Creativity': ['Fine motor development', 'Self-expression'],
      Literacy: ['Language development', 'Comprehension'],
      Numeracy: ['Number sense', 'Problem solving'],
      'Construction Play': ['Spatial reasoning', 'Planning'],
      'Music & Movement': ['Rhythm awareness', 'Gross motor skills'],
    };
    return activities.flatMap((a) => connections[a] || []).slice(0, 4);
  }

  // ---------------------------------------------------------------------------
  // PORTFOLIO ANALYSIS
  // ---------------------------------------------------------------------------

  async analyzePortfolioItem(
    input: LittleExplorersAIPortfolioAnalysisInput
  ): Promise<Result<LittleExplorersAIPortfolioAnalysisOutput>> {
    if (!this.aiConfig.features.portfolioAnalysis) {
      return failure({
        code: 'FEATURE_DISABLED',
        message: 'Portfolio analysis feature is disabled',
      });
    }

    return this.withTiming('analyzePortfolioItem', async () => {
      const startTime = Date.now();

      const description = input.content.text?.substring(0, 200) || `${input.itemType} portfolio item`;
      const elements = this.detectContentElements(input.content, input.itemType);
      const curriculumTags = this.generateCurriculumTags(elements, input.curriculumFrameworks);
      const developmentalAreas = this.detectDevelopmentalAreas(
        elements,
        input.developmentalAreasToTrack
      );
      const qualityScore = this.calculateQualityScore(
        input.content,
        elements,
        input.teacherObservation
      );

      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'portfolio_analysis',
        inputSummary: `Item type: ${input.itemType}`,
        outputSummary: `Quality: ${qualityScore}, Tags: ${curriculumTags.length}`,
        processingTime,
      });

      return success({
        description,
        detectedElements: elements,
        suggestedCurriculumTags: curriculumTags,
        curriculumConfidence: curriculumTags.length > 0 ? 0.75 : 0.5,
        developmentalObservations: developmentalAreas.map((a) => `Demonstrates ${a.replace(/_/g, ' ')}`),
        suggestedDevelopmentalAreas: developmentalAreas,
        developmentalConfidence: developmentalAreas.length > 0 ? 0.8 : 0.6,
        skillsDemonstrated: this.identifySkillsFromElements(elements),
        qualityScore,
        qualityNotes:
          qualityScore >= 80
            ? 'Excellent documentation'
            : qualityScore >= 60
            ? 'Good documentation'
            : 'Consider adding more context',
        highlightRecommendation: qualityScore >= 85 && curriculumTags.length >= 2,
        highlightReason:
          qualityScore >= 85 ? 'High quality with strong curriculum alignment' : undefined,
        potentialMilestones: [],
        processingTime,
      });
    });
  }

  private detectContentElements(
    content: LittleExplorersAIPortfolioAnalysisInput['content'],
    itemType: string
  ): string[] {
    const elements: string[] = [];
    if (content.text) {
      const text = content.text.toLowerCase();
      if (text.includes('letter') || text.includes('write')) elements.push('writing_practice');
      if (text.includes('count') || text.includes('number')) elements.push('numeracy');
      if (text.includes('friend') || text.includes('play')) elements.push('social_interaction');
      if (text.includes('build') || text.includes('create')) elements.push('construction');
      if (text.includes('story') || text.includes('read')) elements.push('literacy');
    }
    if (itemType === 'drawing') elements.push('visual_arts');
    if (itemType === 'writing') elements.push('emergent_writing');
    if (itemType === 'activity_response') elements.push('task_completion');
    return elements;
  }

  private generateCurriculumTags(
    elements: string[],
    frameworks: string[]
  ): LittleExplorersCurriculumTag[] {
    const tags: LittleExplorersCurriculumTag[] = [];
    if (frameworks.includes('EYLF')) {
      const mappings: Record<string, { code: string; description: string; area: string }> = {
        social_interaction: {
          code: 'EYLF-1.4',
          description: 'Children develop confident self-identities',
          area: 'Identity',
        },
        literacy: {
          code: 'EYLF-5.1',
          description: 'Children interact with others',
          area: 'Communication',
        },
        numeracy: {
          code: 'EYLF-5.4',
          description: 'Children understand symbols and patterns',
          area: 'Communication',
        },
        visual_arts: {
          code: 'EYLF-5.3',
          description: 'Children express ideas using media',
          area: 'Communication',
        },
        emergent_writing: {
          code: 'EYLF-5.2',
          description: 'Children engage with texts',
          area: 'Communication',
        },
      };
      for (const element of elements) {
        const mapping = mappings[element];
        if (mapping) {
          tags.push({
            framework: 'EYLF' as LittleExplorersCurriculumTag['framework'],
            ...mapping,
            aiConfidence: 0.8,
            manuallyAdded: false,
          });
        }
      }
    }
    return tags;
  }

  private detectDevelopmentalAreas(
    elements: string[],
    areasToTrack: LittleExplorersDevelopmentalArea[]
  ): LittleExplorersDevelopmentalArea[] {
    const mapping: Record<string, LittleExplorersDevelopmentalArea[]> = {
      writing_practice: ['physical_fine_motor', 'language_literacy'],
      numeracy: ['cognitive_problem_solving', 'numeracy'],
      social_interaction: ['social_emotional_relationships'],
      construction: ['physical_fine_motor', 'cognitive_problem_solving'],
      literacy: ['language_receptive', 'language_literacy'],
      visual_arts: ['creative_arts', 'physical_fine_motor'],
      task_completion: ['cognitive_attention', 'social_emotional_regulation'],
    };
    const areas: LittleExplorersDevelopmentalArea[] = [];
    for (const element of elements) {
      const mapped = mapping[element] || [];
      for (const area of mapped) {
        if (areasToTrack.includes(area) && !areas.includes(area)) areas.push(area);
      }
    }
    return areas;
  }

  private identifySkillsFromElements(elements: string[]): string[] {
    const mapping: Record<string, string[]> = {
      writing_practice: ['Pencil grip', 'Letter formation'],
      numeracy: ['Number recognition', 'Counting'],
      social_interaction: ['Turn-taking', 'Communication'],
      construction: ['Planning', 'Spatial awareness'],
      visual_arts: ['Creative expression', 'Fine motor control'],
      task_completion: ['Following instructions', 'Focus'],
    };
    return [...new Set(elements.flatMap((e) => mapping[e] || []))];
  }

  private calculateQualityScore(
    content: LittleExplorersAIPortfolioAnalysisInput['content'],
    elements: string[],
    teacherObs?: string
  ): number {
    let score = 50;
    if (content.text && content.text.length > 50) score += 10;
    if (content.mediaUrls && content.mediaUrls.length > 0) score += 15;
    if (content.drawingData) score += 10;
    score += Math.min(elements.length * 5, 15);
    if (teacherObs && teacherObs.length > 30) score += 10;
    return Math.min(score, 100);
  }

  // ---------------------------------------------------------------------------
  // PROGRESS NARRATIVE
  // ---------------------------------------------------------------------------

  async generateProgressNarrative(
    input: LittleExplorersAIProgressNarrativeInput
  ): Promise<Result<LittleExplorersAIProgressNarrativeOutput>> {
    if (!this.aiConfig.features.progressNarratives) {
      return failure({
        code: 'FEATURE_DISABLED',
        message: 'Progress narratives feature is disabled',
      });
    }

    return this.withTiming('generateProgressNarrative', async () => {
      const startTime = Date.now();
      const narrative = this.createProgressNarrative(input);
      const processingTime = Date.now() - startTime;

      await this.logInteraction({
        tenantId: input.tenantId,
        requestType: 'progress_narrative',
        inputSummary: `Student ${input.studentId}, ${input.portfolioItems.length} items`,
        outputSummary: `Generated ${input.audience} narrative`,
        processingTime,
        studentId: input.studentId,
      });

      return success({
        narrative,
        keyHighlights: narrative.parentHighlights,
        suggestedGoals: narrative.suggestedNextSteps,
        parentTalkingPoints: narrative.parentSuggestions,
        processingTime,
      });
    });
  }

  private createProgressNarrative(
    input: LittleExplorersAIProgressNarrativeInput
  ): LittleExplorersProgressNarrative {
    const { context, portfolioItems, behaviourSummary, milestones, tone } = input;
    const name = context.student?.firstName || 'Your child';

    const teacherSummary =
      `${name} has had a productive period with ${portfolioItems.length} portfolio items. ` +
      `Behaviour points: ${behaviourSummary.totalPoints}. Top skills: ${behaviourSummary.topSkills.join(', ')}.`;

    const parentSummary =
      tone === 'celebratory'
        ? `What an amazing time ${name} has had! With ${portfolioItems.length} learning moments captured, ${name} is growing every day!`
        : `We're pleased to share that ${name} has been making wonderful progress with ${portfolioItems.length} documented achievements.`;

    return {
      teacherSummary,
      keyObservations: [`${portfolioItems.filter((i) => i.isHighlight).length} highlighted achievements`],
      areasOfStrength: behaviourSummary.topSkills.slice(0, 2),
      areasForGrowth: milestones.inProgress.slice(0, 2),
      suggestedNextSteps: ['Continue supporting development', 'Celebrate small wins'],
      parentSummary,
      parentHighlights: portfolioItems
        .filter((i) => i.isHighlight)
        .map((i) => i.title)
        .slice(0, 3),
      parentSuggestions: ['Ask about their favourite activity', 'Look through portfolio together'],
      formalNarrative: `PROGRESS REPORT: ${name}\n\n${teacherSummary}`,
      basedOnItemCount: portfolioItems.length,
      confidenceLevel: portfolioItems.length >= 10 ? 0.85 : 0.65,
      generatedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY FEEDBACK
  // ---------------------------------------------------------------------------

  async generateActivityFeedback(
    input: LittleExplorersAIActivityFeedbackInput
  ): Promise<Result<LittleExplorersAIActivityFeedbackOutput>> {
    return this.withTiming('generateActivityFeedback', async () => {
      const startTime = Date.now();
      const name = input.context.student?.firstName || 'You';

      const feedbackTemplates: Record<string, string> = {
        encouraging: `Wow ${name}! Great job!`,
        instructional: `Good effort ${name}. Here's what I noticed...`,
        celebratory: `Amazing job ${name}! This is wonderful!`,
      };

      const responseContent = input.response.content as { text?: string };

      return success({
        feedback: feedbackTemplates[input.feedbackType] || feedbackTemplates.encouraging,
        strengths: ['Completed the activity', 'Shows effort'],
        improvements:
          responseContent?.text && responseContent.text.length < 20 ? ['Try adding more detail'] : [],
        nextSteps: input.includeNextSteps ? ['Try a similar activity', 'Share your work'] : [],
        encouragement: `Keep being amazing, ${name}!`,
        detectedSkills: ['Task completion'],
        processingTime: Date.now() - startTime,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // SAFEGUARDING CHECK
  // ---------------------------------------------------------------------------

  async checkSafeguarding(
    input: LittleExplorersAISafeguardingCheckInput
  ): Promise<Result<LittleExplorersAISafeguardingCheckOutput>> {
    if (!this.aiConfig.features.safeguardingMonitor) {
      return success({
        safe: true,
        severity: 'none',
        flags: [],
        recommendedAction: 'none',
        explanation: 'Monitoring disabled',
        processingTime: 0,
      });
    }

    return this.withTiming('checkSafeguarding', async () => {
      const startTime = Date.now();
      const flags: { type: string; description: string; confidence: number }[] = [];

      if (input.contentType === 'text') {
        const content = input.content.toLowerCase();
        const patterns: [RegExp, string, string, number][] = [
          [/\b(hurt|hit|abuse|harm)\b/i, 'physical_safety', 'Potential physical safety concern', 0.6],
          [/\b(scared|afraid|frightened)\b/i, 'emotional', 'Fear/anxiety indicators', 0.5],
          [/\b(hungry|no food)\b/i, 'neglect', 'Potential neglect indicator', 0.6],
        ];

        for (const [pattern, type, description, confidence] of patterns) {
          if (pattern.test(content)) flags.push({ type, description, confidence });
        }

        for (const keyword of input.customKeywords || []) {
          if (content.includes(keyword.toLowerCase())) {
            flags.push({ type: 'custom_keyword', description: `Custom keyword: ${keyword}`, confidence: 0.8 });
          }
        }
      }

      let severity: LittleExplorersAISafeguardingCheckOutput['severity'] = 'none';
      let recommendedAction: LittleExplorersAISafeguardingCheckOutput['recommendedAction'] = 'none';

      if (flags.length > 0) {
        const maxConfidence = Math.max(...flags.map((f) => f.confidence));
        if (maxConfidence >= 0.9) {
          severity = 'critical';
          recommendedAction = 'alert_admin';
        } else if (maxConfidence >= 0.7) {
          severity = 'high';
          recommendedAction = 'block';
        } else if (maxConfidence >= 0.5) {
          severity = 'medium';
          recommendedAction = 'flag_for_review';
        } else {
          severity = 'low';
          recommendedAction = 'flag_for_review';
        }
      }

      return success({
        safe: flags.length === 0,
        severity,
        flags,
        recommendedAction,
        explanation:
          flags.length > 0 ? `${flags.length} potential concern(s) detected` : 'No concerns detected',
        processingTime: Date.now() - startTime,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // CELEBRATION CONTENT
  // ---------------------------------------------------------------------------

  async generateCelebrationContent(
    input: LittleExplorersAICelebrationContentInput
  ): Promise<Result<LittleExplorersAICelebrationContentOutput>> {
    return this.withTiming('generateCelebrationContent', async () => {
      const startTime = Date.now();
      const name = input.context.student?.firstName || 'Explorer';

      const templates: Record<string, { title: string; message: string; emoji: string }> = {
        milestone: {
          title: 'Milestone Achieved!',
          message: `${name} reached: ${input.achievementDetails}!`,
          emoji: 'star',
        },
        points: {
          title: 'Points Champion!',
          message: `${name} earned ${input.achievementDetails} Explorer Points!`,
          emoji: 'celebration',
        },
        streak: {
          title: 'Super Streak!',
          message: `${name} has a ${input.achievementDetails} day streak!`,
          emoji: 'fire',
        },
        improvement: {
          title: 'Amazing Growth!',
          message: `${name} improved in ${input.achievementDetails}!`,
          emoji: 'chart',
        },
        activity: {
          title: 'Activity Star!',
          message: `${name} completed ${input.achievementDetails}!`,
          emoji: 'star',
        },
      };

      const template = templates[input.achievementType] || templates.milestone;
      const shareTexts: Record<string, string> = {
        student: `I did it! ${template.message}`,
        parent: `So proud! ${template.message}`,
        class: `Let's celebrate ${name}! ${template.message}`,
      };

      return success({
        title: template.title,
        message: template.message,
        emoji: input.includeEmoji ? template.emoji : '',
        encouragement: `Keep being amazing, ${name}!`,
        sharableText: shareTexts[input.forDisplay] || shareTexts.parent,
        suggestedNextChallenge: 'Keep up the great work!',
        processingTime: Date.now() - startTime,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // LEARNING RECOMMENDATIONS
  // ---------------------------------------------------------------------------

  async generateLearningRecommendations(
    input: LittleExplorersAILearningRecommendationInput
  ): Promise<Result<LittleExplorersAILearningRecommendationOutput>> {
    return this.withTiming('generateLearningRecommendations', async () => {
      const startTime = Date.now();

      const recommendations: LittleExplorersAILearningRecommendationOutput['recommendations'] = [];

      const activityLibrary: Record<
        string,
        { title: string; description: string; difficulty: 'easy' | 'moderate' | 'challenging' }[]
      > = {
        art: [{ title: 'Colour Mixing Magic', description: 'Explore colour blending', difficulty: 'easy' }],
        building: [{ title: 'Tower Challenge', description: 'Build the tallest tower', difficulty: 'moderate' }],
        reading: [{ title: 'Story Retelling', description: 'Retell a favourite story', difficulty: 'easy' }],
        numbers: [{ title: 'Counting Collection', description: 'Count and sort objects', difficulty: 'easy' }],
      };

      for (const interest of input.learningProfile.interests) {
        const activities = activityLibrary[interest.toLowerCase()] || [];
        for (const activity of activities.slice(
          0,
          Math.ceil(input.count / input.learningProfile.interests.length)
        )) {
          recommendations.push({
            type: input.recommendationType,
            title: activity.title,
            description: activity.description,
            rationale: `Based on interest in ${interest}`,
            difficulty: activity.difficulty,
            estimatedMinutes: activity.difficulty === 'easy' ? 10 : 20,
            alignedGoals: input.currentGoals.slice(0, 2),
          });
        }
      }

      return success({
        recommendations: recommendations.slice(0, input.count),
        personalizationNotes: `Based on interests: ${input.learningProfile.interests.join(', ')}`,
        processingTime: Date.now() - startTime,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // TRANSLATION ENHANCEMENT
  // ---------------------------------------------------------------------------

  async enhanceTranslation(
    text: string,
    sourceLang: string,
    targetLang: string,
    _context: string
  ): Promise<Result<string>> {
    return this.withTiming('enhanceTranslation', async () => {
      log.debug('Translation enhancement requested', { sourceLang, targetLang });
      // In production, would use AI to improve translation quality
      return success(text);
    });
  }

  // ---------------------------------------------------------------------------
  // BATCH PROCESSING
  // ---------------------------------------------------------------------------

  async batchProcess<I, O>(
    inputs: I[],
    processor: (input: I) => Promise<Result<O>>,
    concurrency: number = 5
  ): Promise<Result<O[]>> {
    return this.withTiming('batchProcess', async () => {
      const results: O[] = [];
      for (let i = 0; i < inputs.length; i += concurrency) {
        const batch = inputs.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(processor));
        for (const result of batchResults) {
          if (isFailure(result)) {
            return failure(result.error);
          }
          results.push(result.data);
        }
      }
      return success(results);
    });
  }

  // ---------------------------------------------------------------------------
  // LOGGING
  // ---------------------------------------------------------------------------

  private async logInteraction(params: {
    tenantId: string;
    requestType: LittleExplorersAIPromptCategory;
    inputSummary: string;
    outputSummary: string;
    processingTime: number;
    userId?: string;
    classroomId?: string;
    studentId?: string;
  }): Promise<void> {
    if (!this.aiConfig.logInteractions) return;

    const logEntry: LittleExplorersAIInteractionLog = {
      id: generateLittleExplorersId('ailog'),
      tenantId: params.tenantId,
      requestType: params.requestType,
      requestTimestamp: new Date(Date.now() - params.processingTime),
      inputSummary: params.inputSummary,
      inputTokens: 0,
      responseTimestamp: new Date(),
      outputSummary: params.outputSummary,
      outputTokens: 0,
      latencyMs: params.processingTime,
      success: true,
      model: this.aiConfig.models.generation,
      userId: params.userId,
      classroomId: params.classroomId,
      studentId: params.studentId,
    };

    this.interactionLogs.push(logEntry);
    if (this.interactionLogs.length > 10000) this.interactionLogs.splice(0, 5000);
  }

  getUsageStats(tenantId: string, periodDays: number = 30): LittleExplorersAIUsageStats {
    const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const logs = this.interactionLogs.filter(
      (l) => l.tenantId === tenantId && l.requestTimestamp >= cutoff
    );

    const byCategory = new Map<LittleExplorersAIPromptCategory, { count: number; tokens: number }>();
    for (const logEntry of logs) {
      const existing = byCategory.get(logEntry.requestType) || { count: 0, tokens: 0 };
      byCategory.set(logEntry.requestType, {
        count: existing.count + 1,
        tokens: existing.tokens + logEntry.inputTokens + logEntry.outputTokens,
      });
    }

    return {
      tenantId,
      period: { start: cutoff, end: new Date() },
      totalRequests: logs.length,
      totalInputTokens: logs.reduce((sum, l) => sum + l.inputTokens, 0),
      totalOutputTokens: logs.reduce((sum, l) => sum + l.outputTokens, 0),
      totalCost: 0,
      byCategory: [...byCategory.entries()].map(([category, data]) => ({
        category,
        count: data.count,
        tokens: data.tokens,
        cost: 0,
      })),
      successRate: logs.filter((l) => l.success).length / Math.max(logs.length, 1),
      averageLatencyMs: logs.reduce((sum, l) => sum + l.latencyMs, 0) / Math.max(logs.length, 1),
      feedbackPositiveRate: 0,
      limitWarnings: [],
    };
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let littleExplorersAIServiceInstance: LittleExplorersAIService | null = null;

export function initializeLittleExplorersAIService(
  deps?: ServiceDependencies,
  config?: Partial<LittleExplorersAIProviderConfig>
): LittleExplorersAIService {
  littleExplorersAIServiceInstance = new LittleExplorersAIService(deps, config);
  log.info('LittleExplorersAIService initialized');
  return littleExplorersAIServiceInstance;
}

export function getLittleExplorersAIService(): LittleExplorersAIService {
  if (!littleExplorersAIServiceInstance) {
    littleExplorersAIServiceInstance = new LittleExplorersAIService();
    log.warn('LittleExplorersAIService auto-initialized without configuration');
  }
  return littleExplorersAIServiceInstance;
}
