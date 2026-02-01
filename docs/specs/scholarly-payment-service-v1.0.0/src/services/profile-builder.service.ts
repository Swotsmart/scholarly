/**
 * AI Tutor Profile Builder Service
 * 
 * An intelligent profile creation system that transforms basic tutor inputs
 * into compelling, parent-friendly profiles optimised for matching and discovery.
 * 
 * ## The Vision
 * 
 * Most tutors are experts in their subject but not in marketing themselves.
 * They struggle to write profiles that connect with parents. This service
 * acts as a skilled interviewer and copywriter, extracting the tutor's
 * unique strengths and crafting profiles that speak directly to parents' concerns.
 * 
 * ## How It Works
 * 
 * 1. **Conversational Q&A**: Instead of blank forms, tutors answer natural questions
 *    about their teaching style, experience, and philosophy.
 * 
 * 2. **AI Extraction**: As tutors answer, AI extracts themes, strengths, and 
 *    unique selling points from their responses.
 * 
 * 3. **Content Generation**: AI generates multiple profile options in different
 *    styles (professional, friendly, results-focused).
 * 
 * 4. **Tutor Selection**: Tutors review AI-generated content and select what
 *    resonates with them, ensuring authenticity.
 * 
 * 5. **Optimization**: Final profiles are optimized for search, parent appeal,
 *    and matching algorithms.
 * 
 * @module ScholarlyPayment/Services/ProfileBuilder
 * @version 1.0.0
 */

import {
  Result,
  success,
  failure,
  PaymentError,
  ValidationError,
  NotFoundError
} from '../types';

import {
  TutorProfile,
  ProfileBuilderSession,
  ProfileQuestion,
  QuestionCategory,
  ProfileBuildStage,
  QuestionResponse,
  ExtractedInsights,
  ProfileDrafts,
  ProfileSelections,
  ConversationMessage,
  TeachingApproach,
  ContentStyle,
  AIGeneratedContent,
  TeachingStyleProfile,
  ProfileCompleteness,
  ProfileStatus,
  StartProfileSessionInput,
  AnswerQuestionInput,
  AnswerQuestionOutput,
  GenerateDraftsInput,
  SelectDraftInput,
  PublishProfileInput
} from '../types/profile-builder';

import {
  logger,
  generateId,
  publishEvent
} from '../infrastructure';

// ============================================================================
// PROFILE QUESTIONS
// ============================================================================

/**
 * The carefully crafted questions that guide tutors through profile creation.
 * Each question is designed to elicit specific information that parents care about.
 */
const PROFILE_QUESTIONS: ProfileQuestion[] = [
  // Background & Experience
  {
    id: 'background',
    question: "What's your teaching background? Tell me about your journey to becoming a tutor.",
    helpText: "Include your education, any teaching roles, and what drew you to tutoring. Parents love knowing the 'why' behind your work.",
    category: 'background',
    stage: 'qualifications',
    extractionTargets: ['experience_years', 'education', 'previous_roles', 'motivation'],
    minLength: 100,
    maxLength: 1000,
    required: true,
    showIf: null,
    generateFollowUps: true,
    maxFollowUps: 2,
    order: 1
  },
  {
    id: 'subjects',
    question: "What subjects do you teach, and which year levels? Are there specific topics within those subjects where you really shine?",
    helpText: "Be specific! 'Year 11-12 Chemistry' is better than just 'Science'. Mention any curriculum expertise (VCE, HSC, IB).",
    category: 'specialization',
    stage: 'subjects',
    extractionTargets: ['subjects', 'year_levels', 'curriculum', 'specialties'],
    minLength: 50,
    maxLength: 500,
    required: true,
    showIf: null,
    generateFollowUps: true,
    maxFollowUps: 1,
    order: 2
  },
  {
    id: 'teaching_style',
    question: "How would you describe your teaching style? What happens in a typical session with you?",
    helpText: "Parents want to visualise what learning with you looks like. Are you hands-on? Do you use lots of examples? Are sessions structured or flexible?",
    category: 'approach',
    stage: 'teaching_style',
    extractionTargets: ['teaching_approaches', 'session_structure', 'methodology'],
    minLength: 100,
    maxLength: 800,
    required: true,
    showIf: null,
    generateFollowUps: true,
    maxFollowUps: 2,
    order: 3
  },
  {
    id: 'success_story',
    question: "Can you share a success story? Tell me about a student who really progressed with your help.",
    helpText: "This doesn't have to be dramatic - even helping a student go from confused to confident counts! Keep it anonymous if needed.",
    category: 'success',
    stage: 'story',
    extractionTargets: ['outcomes', 'approach_evidence', 'student_types'],
    minLength: 100,
    maxLength: 800,
    required: true,
    showIf: null,
    generateFollowUps: true,
    maxFollowUps: 1,
    order: 4
  },
  {
    id: 'challenges',
    question: "How do you help students who are struggling or have lost confidence in the subject?",
    helpText: "Parents often seek tutors because their child is struggling. This shows your patience and support strategies.",
    category: 'approach',
    stage: 'teaching_style',
    extractionTargets: ['support_strategies', 'empathy_indicators', 'patience_signals'],
    minLength: 80,
    maxLength: 600,
    required: true,
    showIf: null,
    generateFollowUps: false,
    maxFollowUps: 0,
    order: 5
  },
  {
    id: 'parent_message',
    question: "If you could tell parents one thing about how you work with students, what would it be?",
    helpText: "This often becomes the heart of your profile! What do you want parents to know and trust about you?",
    category: 'differentiation',
    stage: 'story',
    extractionTargets: ['unique_value', 'key_message', 'parent_reassurance'],
    minLength: 50,
    maxLength: 500,
    required: true,
    showIf: null,
    generateFollowUps: false,
    maxFollowUps: 0,
    order: 6
  },
  {
    id: 'goals',
    question: "What do you hope students take away from working with you - beyond just better grades?",
    helpText: "Parents love tutors who care about the whole student. Confidence? Love of learning? Problem-solving skills?",
    category: 'values',
    stage: 'story',
    extractionTargets: ['educational_philosophy', 'broader_goals', 'values'],
    minLength: 50,
    maxLength: 500,
    required: true,
    showIf: null,
    generateFollowUps: false,
    maxFollowUps: 0,
    order: 7
  },
  {
    id: 'availability',
    question: "What's your typical availability, and do you prefer online sessions, in-person, or both?",
    helpText: "Be realistic - it's better to underpromise and overdeliver!",
    category: 'logistics',
    stage: 'availability',
    extractionTargets: ['availability_pattern', 'delivery_preference', 'flexibility'],
    minLength: 30,
    maxLength: 300,
    required: true,
    showIf: null,
    generateFollowUps: false,
    maxFollowUps: 0,
    order: 8
  }
];

// ============================================================================
// AI PROMPTS
// ============================================================================

const AI_PROMPTS = {
  extractInsights: `
Analyze the following tutor responses and extract key insights.

Responses:
{responses}

Extract:
1. Teaching approaches (from: patient, energetic, structured, flexible, socratic, hands_on, nurturing, challenging, creative, systematic)
2. Key strengths (specific skills and qualities)
3. Unique selling points (what makes them different)
4. Teaching philosophy summary
5. Trust indicators (things that would reassure parents)
6. Areas that could be strengthened (gaps in their profile)

Respond in JSON format:
{
  "approaches": ["approach1", "approach2"],
  "strengths": ["strength1", "strength2"],
  "uniqueSellingPoints": ["usp1", "usp2"],
  "teachingPhilosophy": "summary",
  "trustIndicators": ["indicator1", "indicator2"],
  "gapsToAddress": ["gap1", "gap2"]
}
`,

  generateHeadline: `
Based on this tutor's responses, generate 3 compelling headlines (under 60 characters each).

Responses:
{responses}

Insights:
{insights}

Requirements:
- Highlight their unique strength
- Be specific (not generic like "Experienced Maths Tutor")
- Appeal to parents seeking help
- Generate one in each style: professional, friendly, results-focused

Examples of good headlines:
- "Making Maths Click for Visual Learners"
- "VCE Chemistry Expert | 98% Student Improvement"
- "Patient Primary Teacher Turned Dedicated Tutor"
- "Building Confidence One Equation at a Time"

Respond in JSON format:
{
  "headlines": [
    {"text": "headline1", "style": "professional", "score": 0.9},
    {"text": "headline2", "style": "friendly", "score": 0.85},
    {"text": "headline3", "style": "results_focused", "score": 0.88}
  ]
}
`,

  generateShortBio: `
Create a compelling tutor bio from these Q&A responses.

Responses:
{responses}

Insights:
{insights}

Requirements:
- 150-200 words
- First person voice
- Start with their passion/why
- Include specific experience
- Address parent concerns implicitly
- End with what students gain
- Sound authentic, not salesy

Structure:
1. Opening hook (passion/approach)
2. Credibility (experience/qualifications)
3. How they help (methodology)
4. What makes them different
5. Outcome for students

Generate 3 versions in different styles: professional, friendly, story_driven.

Respond in JSON format:
{
  "bios": [
    {"text": "bio1", "style": "professional", "score": 0.9},
    {"text": "bio2", "style": "friendly", "score": 0.88},
    {"text": "bio3", "style": "story_driven", "score": 0.85}
  ]
}
`,

  generateParentPitch: `
Write a "Why choose me" section for parents based on:

Responses:
{responses}

Insights:
{insights}

Requirements:
- 80-120 words
- Address common parent concerns:
  • Is my child safe with this person?
  • Will they actually improve?
  • Will they enjoy it?
  • Is the tutor qualified?
- Be reassuring but not boastful
- Include implicit trust signals

Generate 2 versions.

Respond in JSON format:
{
  "pitches": [
    {"text": "pitch1", "style": "parent_reassuring", "score": 0.9},
    {"text": "pitch2", "style": "results_focused", "score": 0.87}
  ]
}
`,

  generateTaglines: `
Create 5 short, memorable taglines for this tutor.

Responses:
{responses}

Insights:
{insights}

Requirements:
- Maximum 10 words each
- Capture their essence
- Mix of styles: professional, friendly, results-focused
- Should work as a profile subtitle

Respond in JSON format:
{
  "taglines": [
    {"text": "tagline1", "style": "professional", "score": 0.9},
    {"text": "tagline2", "style": "friendly", "score": 0.88}
  ]
}
`,

  generateFollowUp: `
Based on the tutor's answer, generate a thoughtful follow-up question.

Question asked: {question}
Tutor's answer: {answer}
Extraction targets: {targets}

Requirements:
- Build on something specific they mentioned
- Dig deeper into an interesting point
- Keep it conversational
- Help extract more useful profile content

Also provide:
- An acknowledgment message (warm, brief)
- Key insights extracted from their answer

Respond in JSON format:
{
  "acknowledgment": "Great point about...",
  "followUpQuestion": "You mentioned X - can you tell me more about...",
  "extractedInsights": {
    "themes": ["theme1"],
    "qualities": ["quality1"],
    "keywords": ["keyword1"]
  }
}
`
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AIProfileBuilderService {
  private readonly log = logger.child({ service: 'AIProfileBuilder' });
  
  // In production, this would be Anthropic API client
  private readonly aiClient: any;

  constructor(deps?: { aiClient?: any }) {
    this.aiClient = deps?.aiClient;
  }

  /**
   * Start a new profile building session
   */
  async startSession(input: StartProfileSessionInput): Promise<Result<ProfileBuilderSession>> {
    try {
      const now = new Date();
      const sessionId = generateId('pbs');

      // Create initial session
      const session: ProfileBuilderSession = {
        id: sessionId,
        tutorId: input.tutorId,
        tenantId: input.tenantId,
        stage: 'welcome',
        stagesCompleted: [],
        questionsCompleted: 0,
        totalQuestions: PROFILE_QUESTIONS.length,
        progressPercentage: 0,
        responses: [],
        extractedInsights: {
          uniqueSellingPoints: [],
          keyStrengths: [],
          teachingPhilosophy: null,
          dominantApproaches: [],
          approachEvidence: {} as Record<TeachingApproach, string[]>,
          experienceIndicators: [],
          expertiseAreas: [],
          trustIndicators: [],
          warmthIndicators: [],
          competenceIndicators: [],
          gapsToAddress: [],
          suggestedAdditions: []
        },
        drafts: {
          headlines: [],
          shortBios: [],
          fullBios: [],
          taglines: [],
          parentPitches: [],
          studentPitches: [],
          methodologies: [],
          subjectDescriptions: {},
          generatedAt: now
        },
        selections: {
          headline: null,
          shortBio: null,
          fullBio: null,
          tagline: null,
          parentPitch: null,
          studentPitch: null,
          methodology: null,
          customEdits: {}
        },
        startedAt: now,
        lastActivityAt: now,
        completedAt: null,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        conversationHistory: [{
          role: 'assistant',
          content: this.getWelcomeMessage(),
          timestamp: now,
          metadata: { stage: 'welcome' }
        }]
      };

      this.log.info('Profile builder session started', {
        sessionId,
        tutorId: input.tutorId
      });

      return success(session);
    } catch (error) {
      this.log.error('Failed to start session', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Process an answer and return next question or follow-up
   */
  async processAnswer(
    session: ProfileBuilderSession,
    input: AnswerQuestionInput
  ): Promise<Result<{ session: ProfileBuilderSession; output: AnswerQuestionOutput }>> {
    try {
      const question = PROFILE_QUESTIONS.find(q => q.id === input.questionId);
      if (!question) {
        return failure(new NotFoundError('Question', input.questionId));
      }

      // Validate answer length
      if (question.minLength && input.answer.length < question.minLength) {
        return failure(new ValidationError(
          `Answer should be at least ${question.minLength} characters`,
          'answer'
        ));
      }

      const now = new Date();

      // Extract insights from answer (simulated AI extraction)
      const extraction = await this.extractFromAnswer(input.answer, question.extractionTargets);

      // Create response record
      const response: QuestionResponse = {
        questionId: input.questionId,
        question: question.question,
        category: question.category,
        answer: input.answer,
        answeredAt: now,
        followUps: [],
        extraction,
        quality: this.assessAnswerQuality(input.answer)
      };

      // Update session
      const updatedResponses = [...session.responses];
      const existingIndex = updatedResponses.findIndex(r => r.questionId === input.questionId);
      if (existingIndex >= 0) {
        updatedResponses[existingIndex] = response;
      } else {
        updatedResponses.push(response);
      }

      // Update insights
      const updatedInsights = this.mergeInsights(session.extractedInsights, extraction);

      // Determine next action
      let aiResponse: string;
      let nextQuestion: ProfileQuestion | null = null;
      const currentIndex = PROFILE_QUESTIONS.findIndex(q => q.id === input.questionId);
      
      // Check if we should ask a follow-up
      const shouldFollowUp = question.generateFollowUps && 
        response.followUps.length < question.maxFollowUps &&
        response.quality.specificity !== 'specific';

      if (shouldFollowUp) {
        const followUp = await this.generateFollowUp(question.question, input.answer, question.extractionTargets);
        aiResponse = followUp.acknowledgment + ' ' + followUp.question;
        // Store follow-up for tracking
      } else {
        // Move to next question
        aiResponse = this.getAcknowledgment(extraction);
        nextQuestion = PROFILE_QUESTIONS[currentIndex + 1] || null;
      }

      // Determine new stage
      let newStage = session.stage;
      if (nextQuestion && nextQuestion.stage !== question.stage) {
        newStage = nextQuestion.stage;
      } else if (!nextQuestion) {
        newStage = 'review';
      }

      // Calculate progress
      const questionsCompleted = updatedResponses.length;
      const progressPercentage = Math.round((questionsCompleted / PROFILE_QUESTIONS.length) * 100);

      // Update conversation history
      const conversationHistory: ConversationMessage[] = [
        ...session.conversationHistory,
        {
          role: 'user',
          content: input.answer,
          timestamp: now,
          metadata: { questionId: input.questionId }
        },
        {
          role: 'assistant',
          content: aiResponse + (nextQuestion ? `\n\n${nextQuestion.question}` : ''),
          timestamp: new Date(),
          metadata: { 
            questionId: nextQuestion?.id,
            stage: newStage 
          }
        }
      ];

      const updatedSession: ProfileBuilderSession = {
        ...session,
        stage: newStage,
        stagesCompleted: newStage !== session.stage 
          ? [...session.stagesCompleted, session.stage] 
          : session.stagesCompleted,
        questionsCompleted,
        progressPercentage,
        responses: updatedResponses,
        extractedInsights: updatedInsights,
        lastActivityAt: now,
        conversationHistory
      };

      const output: AnswerQuestionOutput = {
        aiResponse,
        nextQuestion,
        extractedInsights: extraction.themes,
        progress: progressPercentage,
        stage: newStage
      };

      return success({ session: updatedSession, output });
    } catch (error) {
      this.log.error('Failed to process answer', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Generate profile drafts from collected responses
   */
  async generateDrafts(
    session: ProfileBuilderSession,
    input: GenerateDraftsInput
  ): Promise<Result<{ session: ProfileBuilderSession; drafts: ProfileDrafts }>> {
    try {
      if (session.responses.length < PROFILE_QUESTIONS.filter(q => q.required).length) {
        return failure(new ValidationError('Not all required questions answered', 'responses'));
      }

      const now = new Date();
      
      // Format responses for AI
      const responsesText = session.responses
        .map(r => `Q: ${r.question}\nA: ${r.answer}`)
        .join('\n\n');

      const insightsText = JSON.stringify(session.extractedInsights, null, 2);

      // Generate headlines (simulated)
      const headlines = await this.generateContent('headline', responsesText, insightsText);
      
      // Generate short bios
      const shortBios = await this.generateContent('shortBio', responsesText, insightsText);
      
      // Generate full bios
      const fullBios = await this.generateContent('fullBio', responsesText, insightsText);
      
      // Generate taglines
      const taglines = await this.generateContent('tagline', responsesText, insightsText);
      
      // Generate parent pitches
      const parentPitches = await this.generateContent('parentPitch', responsesText, insightsText);
      
      // Generate methodologies
      const methodologies = await this.generateContent('methodology', responsesText, insightsText);

      const drafts: ProfileDrafts = {
        headlines,
        shortBios,
        fullBios,
        taglines,
        parentPitches,
        studentPitches: [], // Generate similar to parent pitches
        methodologies,
        subjectDescriptions: {},
        generatedAt: now
      };

      const updatedSession: ProfileBuilderSession = {
        ...session,
        stage: 'review',
        drafts,
        lastActivityAt: now
      };

      this.log.info('Profile drafts generated', {
        sessionId: session.id,
        headlineCount: headlines.length,
        bioCount: shortBios.length
      });

      return success({ session: updatedSession, drafts });
    } catch (error) {
      this.log.error('Failed to generate drafts', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Select a draft option for a field
   */
  async selectDraft(
    session: ProfileBuilderSession,
    input: SelectDraftInput
  ): Promise<Result<ProfileBuilderSession>> {
    try {
      const now = new Date();

      const selections: ProfileSelections = {
        ...session.selections,
        [input.field]: input.customEdit || input.selectedText
      };

      if (input.customEdit) {
        selections.customEdits = {
          ...selections.customEdits,
          [input.field]: input.customEdit
        };
      }

      const updatedSession: ProfileBuilderSession = {
        ...session,
        selections,
        lastActivityAt: now
      };

      return success(updatedSession);
    } catch (error) {
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Publish the completed profile
   */
  async publishProfile(
    session: ProfileBuilderSession,
    input: PublishProfileInput
  ): Promise<Result<TutorProfile>> {
    try {
      const now = new Date();

      // Validate all required selections are made
      if (!session.selections.headline || !session.selections.shortBio) {
        return failure(new ValidationError('Headline and short bio are required', 'selections'));
      }

      // Build the tutor profile from session data
      const profile = this.buildProfileFromSession(session);

      // Update session as complete
      session.completedAt = now;
      session.stage = 'complete';
      session.stagesCompleted.push('polish');

      await publishEvent('profile.published', session.tenantId, session.tutorId, {
        profileId: profile.id,
        completenessScore: profile.aiContent.completenessScore
      });

      this.log.info('Tutor profile published', {
        sessionId: session.id,
        profileId: profile.id,
        tutorId: session.tutorId
      });

      return success(profile);
    } catch (error) {
      this.log.error('Failed to publish profile', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Get profile optimization suggestions
   */
  async getSuggestions(profile: TutorProfile): Promise<Result<{
    suggestions: { section: string; suggestion: string; impact: 'high' | 'medium' | 'low' }[];
    overallScore: number;
  }>> {
    try {
      const suggestions: { section: string; suggestion: string; impact: 'high' | 'medium' | 'low' }[] = [];
      let score = 100;

      // Check for missing elements
      if (!profile.media.profilePhoto) {
        suggestions.push({
          section: 'photo',
          suggestion: 'Add a professional photo - profiles with photos get 40% more enquiries',
          impact: 'high'
        });
        score -= 15;
      }

      if (!profile.media.introVideo) {
        suggestions.push({
          section: 'video',
          suggestion: 'Add an introduction video to help parents get to know you',
          impact: 'medium'
        });
        score -= 10;
      }

      if (profile.trustSignals.testimonialCount < 3) {
        suggestions.push({
          section: 'testimonials',
          suggestion: 'Ask previous students or parents for testimonials',
          impact: 'high'
        });
        score -= 10;
      }

      if (profile.professional.subjects.length < 2) {
        suggestions.push({
          section: 'subjects',
          suggestion: 'Add more subjects you teach to increase discoverability',
          impact: 'medium'
        });
        score -= 5;
      }

      if (profile.professional.shortBio.length < 150) {
        suggestions.push({
          section: 'bio',
          suggestion: 'Expand your bio to at least 150 words for better parent engagement',
          impact: 'medium'
        });
        score -= 5;
      }

      return success({ suggestions, overallScore: Math.max(0, score) });
    } catch (error) {
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private getWelcomeMessage(): string {
    return `Welcome! I'm here to help you create a compelling tutor profile that will connect you with the right students and families.

Instead of filling out boring forms, we're going to have a conversation. I'll ask you some questions about your teaching experience and style, and then use your answers to craft a professional profile.

This usually takes about 10-15 minutes, and you'll be able to review and edit everything before it goes live.

Ready to get started? Let's begin with your background...

**${PROFILE_QUESTIONS[0].question}**

${PROFILE_QUESTIONS[0].helpText}`;
  }

  private async extractFromAnswer(
    answer: string,
    targets: string[]
  ): Promise<QuestionResponse['extraction']> {
    // In production, this would call Claude API
    // For now, simulate extraction
    
    const themes: string[] = [];
    const sentiments: string[] = [];
    const keywords: string[] = [];
    const qualities: TeachingApproach[] = [];
    const facts: string[] = [];

    // Simple keyword extraction (would be AI in production)
    const lowerAnswer = answer.toLowerCase();
    
    if (lowerAnswer.includes('patient') || lowerAnswer.includes('take time')) {
      qualities.push('patient');
      themes.push('patience');
    }
    if (lowerAnswer.includes('hands-on') || lowerAnswer.includes('practical')) {
      qualities.push('hands_on');
      themes.push('practical learning');
    }
    if (lowerAnswer.includes('structure') || lowerAnswer.includes('organized')) {
      qualities.push('structured');
      themes.push('structured approach');
    }
    if (lowerAnswer.includes('flexible') || lowerAnswer.includes('adapt')) {
      qualities.push('flexible');
      themes.push('adaptability');
    }
    if (lowerAnswer.includes('question') || lowerAnswer.includes('think')) {
      qualities.push('socratic');
      themes.push('inquiry-based');
    }
    if (lowerAnswer.includes('confidence') || lowerAnswer.includes('believe')) {
      sentiments.push('confidence-building');
      themes.push('building confidence');
    }
    if (lowerAnswer.includes('fun') || lowerAnswer.includes('enjoy')) {
      sentiments.push('engaging');
      themes.push('enjoyable learning');
    }

    // Extract years of experience
    const yearsMatch = answer.match(/(\d+)\s*years?/i);
    if (yearsMatch) {
      facts.push(`${yearsMatch[1]} years experience`);
    }

    return { themes, sentiments, keywords, qualities, facts };
  }

  private assessAnswerQuality(answer: string): QuestionResponse['quality'] {
    const length = answer.length;
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim()).length;
    
    return {
      length: length < 100 ? 'short' : length < 300 ? 'medium' : 'long',
      specificity: sentences < 2 ? 'vague' : sentences < 5 ? 'moderate' : 'specific',
      usefulness: Math.min(1, (length / 200) * (sentences / 3))
    };
  }

  private mergeInsights(
    existing: ExtractedInsights, 
    newExtraction: QuestionResponse['extraction']
  ): ExtractedInsights {
    return {
      ...existing,
      keyStrengths: [...new Set([...existing.keyStrengths, ...newExtraction.themes])],
      dominantApproaches: [...new Set([...existing.dominantApproaches, ...newExtraction.qualities])],
      trustIndicators: [...existing.trustIndicators, ...newExtraction.sentiments],
      experienceIndicators: [...existing.experienceIndicators, ...newExtraction.facts]
    };
  }

  private getAcknowledgment(extraction: QuestionResponse['extraction']): string {
    const responses = [
      "Great, that really helps paint a picture of your approach!",
      "Thanks for sharing that - parents will definitely appreciate knowing this.",
      "That's wonderful - it's clear you really care about your students.",
      "Perfect, this gives me a lot to work with for your profile.",
      "Excellent! Your experience really shines through."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async generateFollowUp(
    question: string, 
    answer: string, 
    targets: string[]
  ): Promise<{ acknowledgment: string; question: string }> {
    // In production, would call AI
    return {
      acknowledgment: "That's really interesting!",
      question: "Could you give me a specific example of how that works in practice?"
    };
  }

  private async generateContent(
    type: string,
    responses: string,
    insights: string
  ): Promise<{ text: string; style: ContentStyle; score: number }[]> {
    // In production, would call Claude API with appropriate prompt
    // Simulated response for now
    
    switch (type) {
      case 'headline':
        return [
          { text: "Making Maths Make Sense", style: 'friendly', score: 0.9 },
          { text: "Experienced Teacher | Student-Centred Approach", style: 'professional', score: 0.85 },
          { text: "Helping Students Build Confidence and Skills", style: 'results_focused', score: 0.88 }
        ];
      case 'shortBio':
        return [
          { 
            text: "I believe every student can succeed with the right support. With over 10 years of teaching experience, I've helped hundreds of students not just improve their grades, but develop a genuine understanding and even enjoyment of the subject. My approach is patient and adaptable - I meet each student where they are and work together to build their confidence and skills.",
            style: 'friendly',
            score: 0.92
          },
          {
            text: "As a qualified teacher with extensive tutoring experience, I specialise in helping students achieve their academic goals. My structured yet flexible approach ensures each session is tailored to the individual student's needs, learning style, and objectives.",
            style: 'professional',
            score: 0.88
          }
        ];
      case 'tagline':
        return [
          { text: "Patient teaching, lasting results", style: 'results_focused', score: 0.9 },
          { text: "Learning made enjoyable", style: 'friendly', score: 0.87 },
          { text: "Confidence through understanding", style: 'parent_reassuring', score: 0.85 }
        ];
      case 'parentPitch':
        return [
          {
            text: "I understand how stressful it can be when your child is struggling. That's why I focus on building both skills and confidence - students who believe in themselves learn faster and enjoy it more. I communicate regularly with parents about progress and am always happy to discuss how we can best support your child together.",
            style: 'parent_reassuring',
            score: 0.93
          }
        ];
      default:
        return [];
    }
  }

  private buildProfileFromSession(session: ProfileBuilderSession): TutorProfile {
    const now = new Date();
    const profileId = generateId('tpr');

    // Extract subject info from responses
    const subjectResponse = session.responses.find(r => r.questionId === 'subjects');
    
    return {
      id: profileId,
      tutorId: session.tutorId,
      tenantId: session.tenantId,
      
      basics: {
        firstName: '',  // Would be populated from user data
        lastName: '',
        displayName: '',
        pronouns: null,
        location: {
          suburb: '',
          city: '',
          state: '',
          postcode: '',
          country: 'Australia',
          coordinates: null,
          travelRadius: 10,
          serviceArea: []
        },
        languages: [{ language: 'English', proficiency: 'native', canTeachIn: true }],
        timezone: 'Australia/Sydney',
        contactPreferences: {
          email: true,
          phone: false,
          inApp: true,
          preferredMethod: 'email'
        }
      },

      professional: {
        headline: session.selections.headline || session.drafts.headlines[0]?.text || '',
        shortBio: session.selections.shortBio || session.drafts.shortBios[0]?.text || '',
        fullBio: session.selections.fullBio || session.drafts.fullBios[0]?.text || '',
        qualifications: [],
        experience: {
          totalYears: 0,
          highlights: session.extractedInsights.experienceIndicators,
          history: [],
          stats: {
            totalStudentsTaught: null,
            totalSessionsCompleted: 0,
            averageSessionsPerStudent: null
          }
        },
        subjects: []
      },

      teachingStyle: {
        approaches: session.extractedInsights.dominantApproaches,
        strengths: session.extractedInsights.keyStrengths,
        methodology: session.selections.methodology || '',
        differentiators: session.extractedInsights.uniqueSellingPoints,
        parentPitch: session.selections.parentPitch || session.drafts.parentPitches[0]?.text || '',
        studentPitch: session.selections.studentPitch || '',
        specializations: [],
        learningNeeds: []
      },

      aiContent: {
        generatedAt: session.drafts.generatedAt,
        modelVersion: '1.0.0',
        taglines: session.drafts.taglines.map(t => ({
          ...t,
          selected: t.text === session.selections.tagline
        })),
        searchKeywords: session.extractedInsights.keyStrengths,
        highlights: session.responses.slice(0, 3).map(r => ({
          question: r.question,
          answerSummary: r.answer.substring(0, 150) + '...',
          sentiment: 'positive' as const
        })),
        authenticityScore: 85,
        completenessScore: 75,
        parentAppealScore: 80,
        searchOptimizationScore: 70,
        suggestions: session.extractedInsights.gapsToAddress.map((gap, i) => ({
          section: 'profile',
          suggestion: gap,
          impact: i === 0 ? 'high' as const : 'medium' as const,
          priority: i + 1
        })),
        variations: []
      },

      media: {
        profilePhoto: null,
        introVideo: null,
        gallery: []
      },

      trustSignals: {
        identityVerified: false,
        identityVerifiedAt: null,
        qualificationsVerified: false,
        qualificationsVerifiedAt: null,
        wwccVerified: false,
        wwccNumber: null,
        wwccExpiry: null,
        wwccJurisdiction: null,
        backgroundCheckCompleted: false,
        backgroundCheckDate: null,
        backgroundCheckProvider: null,
        totalSessions: 0,
        totalStudents: 0,
        averageRating: null,
        ratingCount: 0,
        repeatBookingRate: null,
        testimonialCount: 0,
        featuredTestimonials: [],
        endorsements: [],
        averageResponseTime: null,
        responseRate: null,
        badges: []
      },

      availability: {
        status: 'available',
        statusMessage: null,
        deliveryModes: [
          { mode: 'online', available: true, notes: null },
          { mode: 'in_person', available: true, notes: null }
        ],
        weeklySchedule: [],
        sessionPreferences: {
          minDuration: 45,
          maxDuration: 120,
          preferredDuration: 60,
          breakBetweenSessions: 15
        },
        bookingSettings: {
          minAdvanceNotice: 24,
          maxAdvanceBooking: 30,
          allowInstantBooking: false,
          requireApproval: true,
          cancellationPolicy: '24 hours notice required'
        },
        capacity: {
          maxWeeklyHours: null,
          currentWeeklyHours: 0,
          maxActiveStudents: null,
          currentActiveStudents: 0,
          acceptingNewStudents: true
        },
        blackoutDates: []
      },

      pricing: {
        currency: 'AUD',
        baseRates: [
          { duration: 60, rate: 7000, deliveryMode: 'online' },
          { duration: 60, rate: 8000, deliveryMode: 'in_person' }
        ],
        packages: [],
        specialRates: [],
        trialSession: {
          available: true,
          duration: 30,
          price: 0,
          conditions: 'Free 30-minute trial session for new students'
        },
        freeConsultation: {
          available: true,
          duration: 15,
          description: 'Free phone consultation to discuss your needs'
        }
      },

      status: 'pending_review',
      publishedAt: null,
      lastUpdatedAt: now,

      analytics: {
        profileViews: 0,
        profileViewsLast30Days: 0,
        uniqueViewers: 0,
        searchAppearances: 0,
        searchAppearancesLast30Days: 0,
        averageSearchPosition: null,
        clickThroughRate: null,
        contactRequests: 0,
        contactRequestsLast30Days: 0,
        trialBookings: 0,
        bookingConversions: 0,
        conversionRate: null,
        peerComparison: [],
        topSearchTerms: []
      },

      searchOptimization: {
        primaryKeywords: session.extractedInsights.keyStrengths.slice(0, 5),
        secondaryKeywords: session.extractedInsights.experienceIndicators,
        subjectAliases: {},
        locationAliases: [],
        embeddings: null,
        structuredData: {}
      },

      createdAt: now,
      updatedAt: now,
      createdBy: session.tutorId,
      updatedBy: session.tutorId
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let service: AIProfileBuilderService | null = null;

export function getAIProfileBuilderService(): AIProfileBuilderService {
  if (!service) {
    service = new AIProfileBuilderService();
  }
  return service;
}
