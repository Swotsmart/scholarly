/**
 * Scholarly Platform — AI Wellbeing & Parent Portal Services
 * ===========================================================
 *
 * AI-007: AI Wellbeing Service — Uses the AI abstraction layer to:
 *   - Synthesise wellbeing signals across domains
 *   - Detect emerging patterns and risk indicators
 *   - Generate intervention recommendations
 *   - Produce check-in sentiment analysis
 *
 * AI-008: AI Parent Portal Service — Uses the AI abstraction layer to:
 *   - Generate plain-language learning summaries for parents
 *   - Translate communications into parent's preferred language
 *   - Prepare meeting briefs with AI context
 *   - Optimise notification delivery timing
 *
 * Both services consume the AIService facade from Sprint 1 (provider-registry.ts)
 * and route through the AI cache (AI-009) for cost efficiency. They never
 * call provider APIs directly — all AI operations flow through the
 * abstraction layer's routing engine.
 *
 * @module ai-services/wellbeing-parent-portal
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: SHARED TYPES
// ============================================================================

export type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: unknown } };
export type CostTier = 'economy' | 'standard' | 'critical';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type WellbeingDomain = 'emotional' | 'social' | 'physical' | 'cognitive' | 'spiritual' | 'safety' | 'belonging';
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh' | 'ar' | 'hi' | 'pt' | 'ja' | 'ko' | 'de';

/** AI abstraction layer facade interface (from Sprint 1 provider-registry.ts) */
export interface IAIService {
  complete(request: { prompt: string; systemPrompt?: string; maxTokens?: number; temperature?: number; costTier?: CostTier }): Promise<Result<{ text: string; usage: { costUsd: number; inputTokens: number; outputTokens: number } }>>;
  generateStructured(request: { prompt: string; systemPrompt?: string; schema: Record<string, unknown>; temperature?: number; costTier?: CostTier }): Promise<Result<{ data: unknown; usage: { costUsd: number } }>>;
}

// ============================================================================
// SECTION 2: WELLBEING AI SERVICE (AI-007)
// ============================================================================

/** Input signals that feed the wellbeing AI synthesis */
export interface WellbeingSignalBundle {
  studentId: string;
  tenantId: string;
  studentAge: number;
  studentName: string; // First name only for prompts
  timeframe: { start: Date; end: Date };

  /** Check-in responses */
  checkIns: Array<{
    date: Date;
    domain: WellbeingDomain;
    responseType: string;
    value: number | string;
    notes?: string;
  }>;

  /** Academic signals */
  academicSignals: Array<{
    subject: string;
    currentLevel: string;
    trend: 'improving' | 'stable' | 'declining';
    recentGrades: number[];
  }>;

  /** Attendance data */
  attendance: {
    presentRate: number;
    absences: number;
    lateArrivals: number;
    pattern?: string;
  };

  /** Behavioural observations */
  behaviourNotes: Array<{
    date: Date;
    observer: string;
    note: string;
    category: string;
  }>;

  /** Existing interventions */
  activeInterventions: Array<{
    type: string;
    startDate: Date;
    description: string;
    effectiveness?: string;
  }>;

  /** Previous risk assessments for trend comparison */
  previousRiskLevel?: RiskLevel;
  previousDomainScores?: Record<WellbeingDomain, number>;
}

/** AI-generated wellbeing synthesis */
export interface WellbeingSynthesis {
  overallRiskLevel: RiskLevel;
  confidenceScore: number; // 0-1

  domainAssessments: Record<WellbeingDomain, {
    score: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
    summary: string;
    keyIndicators: string[];
    concernLevel: 'none' | 'monitor' | 'concern' | 'urgent';
  }>;

  emergingPatterns: Array<{
    pattern: string;
    domains: WellbeingDomain[];
    evidence: string[];
    significance: 'low' | 'moderate' | 'high';
  }>;

  interventionRecommendations: Array<{
    tier: 1 | 2 | 3; // MTSS tier
    domain: WellbeingDomain;
    description: string;
    rationale: string;
    suggestedActions: string[];
    priority: 'routine' | 'soon' | 'urgent';
  }>;

  narrativeSummary: string;
  professionalNotes: string; // For teacher/counsellor use only
}

/**
 * AIWellbeingService: Synthesises multi-domain wellbeing signals into
 * actionable insights using the AI abstraction layer.
 *
 * The service is careful to:
 * - Never diagnose — only screen and flag
 * - Always recommend professional consultation for high-risk cases
 * - Maintain appropriate language about child wellbeing
 * - Include confidence scores so humans can calibrate trust
 */
export class AIWellbeingService {
  constructor(
    private aiService: IAIService,
    private logger: Logger
  ) {}

  /**
   * Generate a comprehensive wellbeing synthesis from multi-domain signals.
   *
   * This is the core AI operation — it takes raw signals from attendance,
   * grades, check-ins, and behaviour observations, and produces a
   * structured assessment that helps educators identify students who
   * need support.
   */
  async synthesiseWellbeing(signals: WellbeingSignalBundle): Promise<Result<WellbeingSynthesis>> {
    const startTime = Date.now();

    const systemPrompt = `You are an educational wellbeing analyst working within a school's student support system. Your role is to synthesise multiple data signals into a structured wellbeing assessment for a student.

CRITICAL GUIDELINES:
- You are a SCREENING tool, not a diagnostic tool. Never diagnose conditions.
- Always recommend professional consultation for moderate or higher risk levels.
- Use age-appropriate language and consider developmental context.
- Be specific about evidence — cite the data signals that support each assessment.
- Err on the side of caution — it's better to flag a false positive than miss a genuine concern.
- Consider cultural factors that may affect interpretation of signals.
- Maintain the student's dignity in all descriptions.
- Focus on strengths as well as concerns — every student has protective factors.

The student's first name is ${signals.studentName} and they are ${signals.studentAge} years old.`;

    const dataPrompt = `Analyse the following wellbeing signals for ${signals.studentName} (age ${signals.studentAge}) over the period ${signals.timeframe.start.toISOString().split('T')[0]} to ${signals.timeframe.end.toISOString().split('T')[0]}:

CHECK-IN DATA:
${signals.checkIns.length > 0
  ? signals.checkIns.map(c => `  ${c.date.toISOString().split('T')[0]} | ${c.domain} | ${c.responseType}: ${c.value}${c.notes ? ` | Notes: ${c.notes}` : ''}`).join('\n')
  : '  No check-in data available'}

ACADEMIC SIGNALS:
${signals.academicSignals.map(a => `  ${a.subject}: Level ${a.currentLevel}, Trend: ${a.trend}, Recent grades: [${a.recentGrades.join(', ')}]`).join('\n')}

ATTENDANCE:
  Present rate: ${(signals.attendance.presentRate * 100).toFixed(1)}%
  Absences: ${signals.attendance.absences}
  Late arrivals: ${signals.attendance.lateArrivals}
  ${signals.attendance.pattern ? `Pattern: ${signals.attendance.pattern}` : ''}

BEHAVIOURAL OBSERVATIONS:
${signals.behaviourNotes.length > 0
  ? signals.behaviourNotes.map(b => `  ${b.date.toISOString().split('T')[0]} | ${b.observer} | ${b.category}: ${b.note}`).join('\n')
  : '  No behavioural observations recorded'}

ACTIVE INTERVENTIONS:
${signals.activeInterventions.length > 0
  ? signals.activeInterventions.map(i => `  ${i.type} (since ${i.startDate.toISOString().split('T')[0]}): ${i.description}${i.effectiveness ? ` — Effectiveness: ${i.effectiveness}` : ''}`).join('\n')
  : '  No active interventions'}

${signals.previousRiskLevel ? `PREVIOUS RISK LEVEL: ${signals.previousRiskLevel}` : ''}
${signals.previousDomainScores ? `PREVIOUS DOMAIN SCORES: ${JSON.stringify(signals.previousDomainScores)}` : ''}

Provide a comprehensive wellbeing synthesis as structured JSON.`;

    const schema = {
      type: 'object',
      properties: {
        overallRiskLevel: { type: 'string', enum: ['low', 'moderate', 'high', 'critical'] },
        confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
        domainAssessments: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
              summary: { type: 'string' },
              keyIndicators: { type: 'array', items: { type: 'string' } },
              concernLevel: { type: 'string', enum: ['none', 'monitor', 'concern', 'urgent'] },
            },
          },
        },
        emergingPatterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              domains: { type: 'array', items: { type: 'string' } },
              evidence: { type: 'array', items: { type: 'string' } },
              significance: { type: 'string', enum: ['low', 'moderate', 'high'] },
            },
          },
        },
        interventionRecommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tier: { type: 'number', enum: [1, 2, 3] },
              domain: { type: 'string' },
              description: { type: 'string' },
              rationale: { type: 'string' },
              suggestedActions: { type: 'array', items: { type: 'string' } },
              priority: { type: 'string', enum: ['routine', 'soon', 'urgent'] },
            },
          },
        },
        narrativeSummary: { type: 'string' },
        professionalNotes: { type: 'string' },
      },
    };

    // Use critical tier for high-stakes wellbeing assessments
    const tier: CostTier = signals.previousRiskLevel === 'high' || signals.previousRiskLevel === 'critical' ? 'critical' : 'standard';

    const result = await this.aiService.generateStructured({
      prompt: dataPrompt,
      systemPrompt,
      schema,
      temperature: 0.2, // Low temperature for consistency
      costTier: tier,
    });

    if (!result.success) {
      this.logger.error({ err: result.error, studentId: signals.studentId }, 'Wellbeing synthesis failed');
      return result as Result<WellbeingSynthesis>;
    }

    const synthesis = result.data.data as WellbeingSynthesis;

    this.logger.info({
      studentId: signals.studentId,
      tenantId: signals.tenantId,
      riskLevel: synthesis.overallRiskLevel,
      confidence: synthesis.confidenceScore,
      patternCount: synthesis.emergingPatterns.length,
      recommendationCount: synthesis.interventionRecommendations.length,
      costUsd: result.data.usage.costUsd,
      latencyMs: Date.now() - startTime,
    }, 'Wellbeing synthesis complete');

    return { success: true, data: synthesis };
  }

  /**
   * Analyse check-in sentiment — lighter weight than full synthesis.
   * Used for individual check-in responses to detect immediate concerns.
   */
  async analyseCheckInSentiment(
    studentName: string,
    studentAge: number,
    domain: WellbeingDomain,
    response: string,
    recentContext?: string
  ): Promise<Result<{
    sentiment: 'positive' | 'neutral' | 'negative' | 'concerning';
    confidence: number;
    themes: string[];
    requiresFollowUp: boolean;
    followUpReason?: string;
  }>> {
    const result = await this.aiService.generateStructured({
      prompt: `Analyse this wellbeing check-in response from ${studentName} (age ${studentAge}):

Domain: ${domain}
Response: "${response}"
${recentContext ? `Recent context: ${recentContext}` : ''}

Assess the sentiment and determine if follow-up is needed.`,
      systemPrompt: 'You analyse student wellbeing check-in responses. Be cautious — flag anything that might indicate a student needs support. Never dismiss concerning language.',
      schema: {
        type: 'object',
        properties: {
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'concerning'] },
          confidence: { type: 'number' },
          themes: { type: 'array', items: { type: 'string' } },
          requiresFollowUp: { type: 'boolean' },
          followUpReason: { type: 'string' },
        },
      },
      temperature: 0.1,
      costTier: 'economy',
    });

    if (!result.success) return result as any;
    return { success: true, data: result.data.data as any };
  }
}

// ============================================================================
// SECTION 3: PARENT PORTAL AI SERVICE (AI-008)
// ============================================================================

/** Input data for generating a parent learning summary */
export interface ParentSummaryInput {
  tenantId: string;
  studentId: string;
  parentName: string;
  studentName: string;
  studentAge: number;
  parentLanguage: SupportedLanguage;
  period: { start: Date; end: Date };

  subjects: Array<{
    name: string;
    currentLevel: string;
    trend: 'improving' | 'stable' | 'declining';
    recentHighlights: string[];
    areasForGrowth: string[];
    teacherComments?: string;
  }>;

  attendance: {
    presentRate: number;
    absences: number;
    lateArrivals: number;
  };

  wellbeingSnapshot?: {
    overallStatus: 'thriving' | 'stable' | 'needs_support';
    summary: string;
  };

  achievements: Array<{ title: string; date: Date; description: string }>;

  upcomingEvents: Array<{
    type: string;
    title: string;
    date: Date;
    requiresAction: boolean;
  }>;
}

/** AI-generated parent-friendly learning summary */
export interface ParentLearningSummary {
  greeting: string;
  overallProgress: string;
  subjectHighlights: Array<{
    subject: string;
    summary: string;
    homeActivity?: string;
  }>;
  celebrations: string[];
  supportSuggestions: Array<{
    area: string;
    suggestion: string;
  }>;
  upcomingReminders: string[];
  closingNote: string;
  language: SupportedLanguage;
}

/** Meeting brief prepared for a teacher before a parent meeting */
export interface MeetingBrief {
  studentOverview: string;
  recentProgress: string;
  suggestedTopics: string[];
  parentEngagementContext: string;
  conversationStarters: string[];
  sensitiveTopics: string[];
  positiveHighlights: string[];
  actionItemSuggestions: string[];
}

/**
 * AIParentPortalService: AI-powered communication with parents.
 *
 * The service generates warm, accessible, jargon-free communications
 * that help parents understand their child's learning journey and
 * feel empowered to support them at home.
 *
 * Key principles:
 * - Lead with positives — every child has strengths
 * - Use plain language — avoid educational jargon
 * - Be culturally sensitive — respect diverse family contexts
 * - Provide actionable suggestions — parents want to help
 * - Translate accurately — maintain meaning, not just words
 */
export class AIParentPortalService {
  constructor(
    private aiService: IAIService,
    private logger: Logger
  ) {}

  /**
   * Generate a plain-language learning summary for a parent.
   * This is the primary communication that parents receive
   * about their child's progress.
   */
  async generateLearningSummary(input: ParentSummaryInput): Promise<Result<ParentLearningSummary>> {
    const startTime = Date.now();
    const isEnglish = input.parentLanguage === 'en';

    const languageInstruction = isEnglish
      ? ''
      : `\n\nIMPORTANT: Generate the ENTIRE response in ${getLanguageName(input.parentLanguage)}. Do not use English except for proper nouns. Ensure the translation is natural and culturally appropriate, not a literal translation.`;

    const systemPrompt = `You are a warm, supportive school communication specialist writing to parents about their child's learning progress.

GUIDELINES:
- Use a warm, encouraging tone — parents are partners, not audiences
- Lead with positives before areas for growth
- Avoid educational jargon — "your child is getting better at understanding stories" not "reading comprehension is improving"
- Suggest specific, practical home activities (5-10 minutes, using everyday materials)
- Be honest but constructive about challenges
- Respect the parent's time — be concise but complete
- Age-appropriate framing for a ${input.studentAge}-year-old${languageInstruction}`;

    const prompt = `Generate a learning summary for parent ${input.parentName} about their child ${input.studentName} (age ${input.studentAge}).

Period: ${input.period.start.toISOString().split('T')[0]} to ${input.period.end.toISOString().split('T')[0]}

SUBJECTS:
${input.subjects.map(s => `  ${s.name}: Level ${s.currentLevel}, Trend: ${s.trend}
    Highlights: ${s.recentHighlights.join('; ')}
    Growth areas: ${s.areasForGrowth.join('; ')}
    ${s.teacherComments ? `Teacher says: ${s.teacherComments}` : ''}`).join('\n')}

ATTENDANCE: ${(input.attendance.presentRate * 100).toFixed(0)}% present, ${input.attendance.absences} absences, ${input.attendance.lateArrivals} late

${input.wellbeingSnapshot ? `WELLBEING: ${input.wellbeingSnapshot.overallStatus} — ${input.wellbeingSnapshot.summary}` : ''}

ACHIEVEMENTS:
${input.achievements.map(a => `  ${a.title} (${a.date.toISOString().split('T')[0]}): ${a.description}`).join('\n')}

UPCOMING:
${input.upcomingEvents.map(e => `  ${e.date.toISOString().split('T')[0]}: ${e.title} (${e.type})${e.requiresAction ? ' [ACTION REQUIRED]' : ''}`).join('\n')}`;

    const schema = {
      type: 'object',
      properties: {
        greeting: { type: 'string' },
        overallProgress: { type: 'string' },
        subjectHighlights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              summary: { type: 'string' },
              homeActivity: { type: 'string' },
            },
          },
        },
        celebrations: { type: 'array', items: { type: 'string' } },
        supportSuggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: { area: { type: 'string' }, suggestion: { type: 'string' } },
          },
        },
        upcomingReminders: { type: 'array', items: { type: 'string' } },
        closingNote: { type: 'string' },
      },
    };

    const result = await this.aiService.generateStructured({
      prompt,
      systemPrompt,
      schema,
      temperature: 0.5, // Slightly creative for warmth
      costTier: 'standard',
    });

    if (!result.success) {
      this.logger.error({ err: result.error, studentId: input.studentId }, 'Learning summary generation failed');
      return result as Result<ParentLearningSummary>;
    }

    const summary = result.data.data as ParentLearningSummary;
    summary.language = input.parentLanguage;

    this.logger.info({
      studentId: input.studentId,
      language: input.parentLanguage,
      subjectCount: summary.subjectHighlights?.length || 0,
      costUsd: result.data.usage.costUsd,
      latencyMs: Date.now() - startTime,
    }, 'Parent learning summary generated');

    return { success: true, data: summary };
  }

  /**
   * Prepare an AI-generated meeting brief for a teacher.
   * Gives the teacher context and conversation starters before
   * a parent-teacher meeting.
   */
  async prepareMeetingBrief(
    studentName: string,
    studentAge: number,
    subjects: Array<{ name: string; level: string; trend: string; notes?: string }>,
    parentHistory: { meetingCount: number; lastMeeting?: Date; engagementLevel: string; concerns?: string[] },
    meetingType: string
  ): Promise<Result<MeetingBrief>> {
    const result = await this.aiService.generateStructured({
      prompt: `Prepare a meeting brief for a teacher ahead of a ${meetingType} meeting about ${studentName} (age ${studentAge}).

ACADEMIC DATA:
${subjects.map(s => `  ${s.name}: Level ${s.level}, Trend: ${s.trend}${s.notes ? `, Notes: ${s.notes}` : ''}`).join('\n')}

PARENT ENGAGEMENT HISTORY:
  Previous meetings: ${parentHistory.meetingCount}
  Last meeting: ${parentHistory.lastMeeting?.toISOString().split('T')[0] || 'None'}
  Engagement level: ${parentHistory.engagementLevel}
  ${parentHistory.concerns ? `Known concerns: ${parentHistory.concerns.join(', ')}` : ''}

Generate a structured meeting brief with conversation starters, sensitive topics to handle carefully, and suggested action items.`,
      systemPrompt: `You prepare meeting briefs for teachers before parent meetings. Focus on being helpful, empathetic, and practical. Suggest conversation starters that build rapport. Flag any sensitive topics that need careful handling. Always lead with positives.`,
      schema: {
        type: 'object',
        properties: {
          studentOverview: { type: 'string' },
          recentProgress: { type: 'string' },
          suggestedTopics: { type: 'array', items: { type: 'string' } },
          parentEngagementContext: { type: 'string' },
          conversationStarters: { type: 'array', items: { type: 'string' } },
          sensitiveTopics: { type: 'array', items: { type: 'string' } },
          positiveHighlights: { type: 'array', items: { type: 'string' } },
          actionItemSuggestions: { type: 'array', items: { type: 'string' } },
        },
      },
      temperature: 0.3,
      costTier: 'standard',
    });

    if (!result.success) return result as Result<MeetingBrief>;
    return { success: true, data: result.data.data as MeetingBrief };
  }

  /**
   * Translate a message into the parent's preferred language.
   * Uses the AI layer rather than a dedicated translation API for
   * contextual accuracy — educational terms need careful translation.
   */
  async translateMessage(
    message: string,
    targetLanguage: SupportedLanguage,
    context: string = 'school communication to a parent'
  ): Promise<Result<{ translated: string; language: SupportedLanguage }>> {
    if (targetLanguage === 'en') {
      return { success: true, data: { translated: message, language: 'en' } };
    }

    const result = await this.aiService.complete({
      prompt: `Translate the following ${context} into ${getLanguageName(targetLanguage)}. Maintain the tone and meaning, using natural phrasing rather than literal translation. If there are educational terms, use the most common equivalent in the target language.

Text to translate:
${message}

Translated text (${getLanguageName(targetLanguage)} only, no preamble):`,
      systemPrompt: `You are a professional translator specialising in educational communications. Translate accurately while maintaining the warm, supportive tone appropriate for parent-school communication.`,
      maxTokens: 2000,
      temperature: 0.3,
      costTier: 'economy',
    });

    if (!result.success) return result as Result<{ translated: string; language: SupportedLanguage }>;
    return { success: true, data: { translated: result.data.text.trim(), language: targetLanguage } };
  }

  /**
   * Determine optimal notification delivery time based on parent engagement patterns.
   */
  async suggestDeliveryTime(
    parentTimezone: string,
    engagementHistory: Array<{ hour: number; dayOfWeek: number; opened: boolean }>,
    notificationType: string
  ): Promise<Result<{ suggestedHour: number; suggestedDay: number; confidence: number; reasoning: string }>> {
    if (engagementHistory.length < 5) {
      // Not enough data — use sensible defaults
      return {
        success: true,
        data: {
          suggestedHour: 18, // 6 PM — after work, before dinner
          suggestedDay: 2,   // Tuesday — settled into the week
          confidence: 0.3,
          reasoning: 'Default timing used — insufficient engagement history for personalisation',
        },
      };
    }

    // Calculate engagement rates by hour and day
    const hourCounts: Record<number, { total: number; opened: number }> = {};
    const dayCounts: Record<number, { total: number; opened: number }> = {};

    for (const entry of engagementHistory) {
      if (!hourCounts[entry.hour]) hourCounts[entry.hour] = { total: 0, opened: 0 };
      hourCounts[entry.hour].total++;
      if (entry.opened) hourCounts[entry.hour].opened++;

      if (!dayCounts[entry.dayOfWeek]) dayCounts[entry.dayOfWeek] = { total: 0, opened: 0 };
      dayCounts[entry.dayOfWeek].total++;
      if (entry.opened) dayCounts[entry.dayOfWeek].opened++;
    }

    // Find best hour and day by open rate
    let bestHour = 18;
    let bestHourRate = 0;
    for (const [hour, counts] of Object.entries(hourCounts)) {
      const rate = counts.total > 0 ? counts.opened / counts.total : 0;
      if (rate > bestHourRate) { bestHour = parseInt(hour); bestHourRate = rate; }
    }

    let bestDay = 2;
    let bestDayRate = 0;
    for (const [day, counts] of Object.entries(dayCounts)) {
      const rate = counts.total > 0 ? counts.opened / counts.total : 0;
      if (rate > bestDayRate) { bestDay = parseInt(day); bestDayRate = rate; }
    }

    const confidence = Math.min(0.9, (bestHourRate + bestDayRate) / 2 + engagementHistory.length * 0.01);

    return {
      success: true,
      data: {
        suggestedHour: bestHour,
        suggestedDay: bestDay,
        confidence,
        reasoning: `Based on ${engagementHistory.length} past interactions. Best open rate: ${(bestHourRate * 100).toFixed(0)}% at hour ${bestHour}, ${(bestDayRate * 100).toFixed(0)}% on day ${bestDay}.`,
      },
    };
  }
}

// ============================================================================
// SECTION 4: UTILITIES
// ============================================================================

function getLanguageName(code: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: 'English', es: 'Spanish', fr: 'French', zh: 'Chinese (Simplified)',
    ar: 'Arabic', hi: 'Hindi', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', de: 'German',
  };
  return names[code] || code;
}
