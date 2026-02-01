/**
 * AI Profile Builder Service
 *
 * Conversational AI service that helps tutors create compelling profiles
 * through guided Q&A sessions. Uses AI to extract insights and generate
 * professional profile content.
 *
 * @module ScholarlyPayment/ProfileBuilder
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import { Result, success, failure, ScholarlyBaseService } from './base.service';
import {
  ProfileBuilderSession,
  ProfileBuildStage,
  TutorProfile,
  ProfileQuestion,
  ProfileDrafts,
  ProfileCompleteness,
  ProfileSuggestion,
  ProfileConversationMessage,
  ExtractedInsight,
  ExtractedProfileData,
  StartProfileSessionInput,
  AnswerQuestionInput,
  AnswerQuestionOutput,
  GenerateDraftsInput,
  SelectDraftInput,
  PublishProfileInput,
  ContentStyle,
  TeachingApproach,
  DraftOption,
} from './profile-builder-types';

// ============================================================================
// PROFILE QUESTIONS DATABASE
// ============================================================================

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  // Background questions
  {
    id: 'bg_1',
    stage: 'background',
    sequence: 1,
    question: "Let's start with your journey. How long have you been teaching or tutoring, and what inspired you to become an educator?",
    followUpPrompt: 'That\'s wonderful! Can you tell me more about your formal qualifications?',
    targetFields: ['yearsExperience', 'inspirationToTeach'],
    required: true,
    inputType: 'multiline',
    helpText: 'Share your story - parents love knowing the person behind the qualifications.',
    examples: [
      'I\'ve been tutoring for 8 years since completing my Masters in Education. I was inspired by my own high school maths teacher who made algebra click for me.',
    ],
  },
  {
    id: 'bg_2',
    stage: 'background',
    sequence: 2,
    question: 'What qualifications or certifications do you hold? Include degrees, teaching certifications, and any specialist training.',
    followUpPrompt: null,
    targetFields: ['educationLevel', 'qualifications'],
    required: true,
    inputType: 'multiline',
  },
  // Teaching style questions
  {
    id: 'ts_1',
    stage: 'teaching_style',
    sequence: 3,
    question: 'How would you describe your teaching approach? Walk me through what a typical session with you looks like.',
    followUpPrompt: 'Interesting approach! How do you adapt when a student is struggling?',
    targetFields: ['primaryApproach', 'sessionStructure'],
    required: true,
    inputType: 'multiline',
    examples: [
      'I use a Socratic method - asking questions to guide students to discover answers themselves. Sessions start with reviewing homework, then we work through new concepts together.',
    ],
  },
  {
    id: 'ts_2',
    stage: 'teaching_style',
    sequence: 4,
    question: 'What types of learners do you work best with? (e.g., visual learners, students who need extra patience, gifted students needing extension)',
    followUpPrompt: null,
    targetFields: ['learnerTypes'],
    required: false,
    inputType: 'multiline',
  },
  // Specialization questions
  {
    id: 'sp_1',
    stage: 'specializations',
    sequence: 5,
    question: 'Which subjects and year levels do you specialize in? List your strongest areas.',
    followUpPrompt: 'Great! Within these subjects, are there specific topics you\'re particularly skilled at?',
    targetFields: ['subjects', 'yearLevels'],
    required: true,
    inputType: 'multiline',
  },
  {
    id: 'sp_2',
    stage: 'specializations',
    sequence: 6,
    question: 'Do you have experience with any exam boards or curricula? (e.g., ATAR, IB, NAPLAN, specific school programs)',
    followUpPrompt: null,
    targetFields: ['curricula', 'examBoards'],
    required: false,
    inputType: 'multiline',
  },
  // Personality questions
  {
    id: 'ps_1',
    stage: 'personality',
    sequence: 7,
    question: 'What makes you unique as a tutor? Share something that sets you apart from others.',
    followUpPrompt: null,
    targetFields: ['valueProposition', 'uniqueOfferings'],
    required: true,
    inputType: 'multiline',
    examples: [
      'I use real-world examples from my engineering career to make physics concepts come alive. Students love hearing about rocket science!',
    ],
  },
  {
    id: 'ps_2',
    stage: 'personality',
    sequence: 8,
    question: 'Outside of tutoring, what are your interests or hobbies? (This helps parents and students connect with you)',
    followUpPrompt: null,
    targetFields: ['interests', 'funFacts'],
    required: false,
    inputType: 'multiline',
  },
  // Practical questions
  {
    id: 'pr_1',
    stage: 'practical',
    sequence: 9,
    question: 'What\'s your availability like? When are you typically available for sessions?',
    followUpPrompt: null,
    targetFields: ['availability'],
    required: true,
    inputType: 'multiline',
  },
  {
    id: 'pr_2',
    stage: 'practical',
    sequence: 10,
    question: 'Do you tutor online, in-person, or both? If in-person, which areas do you cover?',
    followUpPrompt: null,
    targetFields: ['location'],
    required: true,
    inputType: 'multiline',
  },
];

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AIProfileBuilderService extends ScholarlyBaseService {
  constructor() {
    super('AIProfileBuilderService');
  }

  /**
   * Start a new profile building session
   */
  async startSession(input: StartProfileSessionInput): Promise<Result<ProfileBuilderSession>> {
    return this.withTiming('startSession', async () => {
      try {
        const now = new Date();
        const welcomeMessage: ProfileConversationMessage = {
          id: this.generateId('msg'),
          role: 'assistant',
          content: this.generateWelcomeMessage(),
          timestamp: now,
        };

        const session: ProfileBuilderSession = {
          id: this.generateId('pbs'),
          tenantId: input.tenantId,
          tutorId: input.tutorId,
          stage: 'welcome',
          conversationHistory: [welcomeMessage],
          extractedData: this.createEmptyExtractedData(),
          questionsCompleted: 0,
          totalQuestions: PROFILE_QUESTIONS.length,
          progressPercentage: 0,
          generatedDrafts: null,
          selections: {
            headline: null,
            shortBio: null,
            tagline: null,
            parentPitch: null,
            teachingPhilosophy: null,
            successStory: null,
          },
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };

        log.info('Profile builder session started', {
          sessionId: session.id,
          tutorId: input.tutorId,
        });

        return success(session);
      } catch (error) {
        log.error('Failed to start session', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to start profile builder session',
        });
      }
    });
  }

  /**
   * Process an answer to a profile question
   */
  async processAnswer(
    session: ProfileBuilderSession,
    input: AnswerQuestionInput
  ): Promise<Result<{ session: ProfileBuilderSession; output: AnswerQuestionOutput }>> {
    return this.withTiming('processAnswer', async () => {
      try {
        const question = PROFILE_QUESTIONS.find((q) => q.id === input.questionId);
        if (!question) {
          return failure({
            code: 'NOT_FOUND',
            message: `Question not found: ${input.questionId}`,
          });
        }

        // Extract insights from the answer
        const insights = this.extractInsights(question, input.answer);

        // Add user message to conversation
        const userMessage: ProfileConversationMessage = {
          id: this.generateId('msg'),
          role: 'user',
          content: input.answer,
          timestamp: new Date(),
          questionId: input.questionId,
          extractedInsights: insights,
        };

        // Update extracted data based on insights
        const updatedData = this.updateExtractedData(session.extractedData, question, insights);

        // Generate AI response
        const aiResponse = this.generateAIResponse(question, input.answer, insights);

        // Add AI response to conversation
        const aiMessage: ProfileConversationMessage = {
          id: this.generateId('msg'),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        // Determine next question
        const nextQuestionIndex = PROFILE_QUESTIONS.findIndex((q) => q.id === input.questionId) + 1;
        const nextQuestion = nextQuestionIndex < PROFILE_QUESTIONS.length
          ? PROFILE_QUESTIONS[nextQuestionIndex]
          : null;

        // Determine new stage
        const newStage = this.determineStage(nextQuestion);
        const questionsCompleted = session.questionsCompleted + 1;
        const progress = Math.round((questionsCompleted / session.totalQuestions) * 100);

        const updatedSession: ProfileBuilderSession = {
          ...session,
          stage: newStage,
          conversationHistory: [...session.conversationHistory, userMessage, aiMessage],
          extractedData: updatedData,
          questionsCompleted,
          progressPercentage: progress,
          updatedAt: new Date(),
        };

        const output: AnswerQuestionOutput = {
          aiResponse,
          nextQuestion,
          extractedInsights: insights,
          progress,
          stage: newStage,
        };

        log.info('Answer processed', {
          sessionId: session.id,
          questionId: input.questionId,
          insightsExtracted: insights.length,
        });

        return success({ session: updatedSession, output });
      } catch (error) {
        log.error('Failed to process answer', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to process answer',
        });
      }
    });
  }

  /**
   * Generate profile content drafts
   */
  async generateDrafts(
    session: ProfileBuilderSession,
    input: GenerateDraftsInput
  ): Promise<Result<{ session: ProfileBuilderSession; drafts: ProfileDrafts }>> {
    return this.withTiming('generateDrafts', async () => {
      try {
        const styles: ContentStyle[] = input.styles || ['professional', 'warm_friendly', 'energetic'];

        const drafts: ProfileDrafts = {
          headlines: this.generateHeadlines(session.extractedData, styles),
          shortBios: this.generateShortBios(session.extractedData, styles),
          taglines: this.generateTaglines(session.extractedData, styles),
          parentPitches: this.generateParentPitches(session.extractedData, styles),
          teachingPhilosophy: this.generateTeachingPhilosophy(session.extractedData, styles),
          successStories: [],
        };

        const updatedSession: ProfileBuilderSession = {
          ...session,
          stage: 'selection',
          generatedDrafts: drafts,
          updatedAt: new Date(),
        };

        log.info('Drafts generated', {
          sessionId: session.id,
          headlineCount: drafts.headlines.length,
          bioCount: drafts.shortBios.length,
        });

        return success({ session: updatedSession, drafts });
      } catch (error) {
        log.error('Failed to generate drafts', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate profile drafts',
        });
      }
    });
  }

  /**
   * Select a draft option
   */
  async selectDraft(
    session: ProfileBuilderSession,
    input: SelectDraftInput
  ): Promise<Result<ProfileBuilderSession>> {
    return this.withTiming('selectDraft', async () => {
      const updatedSession: ProfileBuilderSession = {
        ...session,
        selections: {
          ...session.selections,
          [input.field]: input.customEdit || input.selectedText,
        },
        updatedAt: new Date(),
      };

      log.info('Draft selected', {
        sessionId: session.id,
        field: input.field,
      });

      return success(updatedSession);
    });
  }

  /**
   * Publish the profile
   */
  async publishProfile(
    session: ProfileBuilderSession,
    input: PublishProfileInput
  ): Promise<Result<TutorProfile>> {
    return this.withTiming('publishProfile', async () => {
      try {
        // Validate required selections
        if (!session.selections.headline || !session.selections.shortBio) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Headline and short bio are required',
          });
        }

        const now = new Date();
        const profile: TutorProfile = {
          id: this.generateId('tp'),
          tutorId: input.tutorId,
          tenantId: session.tenantId,
          status: 'active',
          publishedAt: now,
          headline: session.selections.headline,
          shortBio: session.selections.shortBio,
          tagline: session.selections.tagline,
          parentPitch: session.selections.parentPitch,
          teachingPhilosophy: session.selections.teachingPhilosophy,
          successStory: session.selections.successStory,
          background: {
            yearsExperience: session.extractedData.background.yearsExperience || 0,
            educationLevel: session.extractedData.background.educationLevel || 'Not specified',
            qualifications: session.extractedData.background.qualifications,
            currentRole: session.extractedData.background.currentRole,
          },
          teaching: {
            primaryApproach: session.extractedData.teachingStyle.primaryApproach || 'direct_instruction',
            approaches: session.extractedData.teachingStyle.secondaryApproaches,
            learnerTypes: session.extractedData.teachingStyle.learnerTypes,
          },
          specializations: session.extractedData.specializations.subjects,
          yearLevels: session.extractedData.specializations.yearLevels,
          curricula: session.extractedData.specializations.curricula,
          specialNeeds: session.extractedData.specializations.specialNeeds,
          personality: {
            communicationStyle: session.extractedData.personality.communicationStyle || 'Friendly and encouraging',
            pacePreference: session.extractedData.personality.pacePreference || 'adaptive',
            interests: session.extractedData.personality.interests,
            funFacts: session.extractedData.personality.funFacts,
          },
          availability: session.extractedData.practical.availability,
          location: session.extractedData.practical.location,
          pricing: session.extractedData.practical.pricing,
          policies: session.extractedData.practical.policies,
          aiContent: {
            generatedAt: now,
            modelVersion: '1.0.0',
            completenessScore: this.calculateCompleteness(session).overall,
          },
          seoMetadata: {
            title: `${session.selections.headline} | Scholarly`,
            description: session.selections.shortBio.substring(0, 160),
            keywords: this.extractKeywords(session),
          },
          analytics: {
            views: 0,
            enquiries: 0,
            bookings: 0,
            conversionRate: 0,
          },
          createdAt: now,
          updatedAt: now,
        };

        log.info('Profile published', {
          profileId: profile.id,
          tutorId: input.tutorId,
          completenessScore: profile.aiContent.completenessScore,
        });

        return success(profile);
      } catch (error) {
        log.error('Failed to publish profile', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to publish profile',
        });
      }
    });
  }

  /**
   * Get profile improvement suggestions
   */
  async getSuggestions(
    profile: TutorProfile
  ): Promise<Result<{ suggestions: ProfileSuggestion[]; overallScore: number }>> {
    return this.withTiming('getSuggestions', async () => {
      const suggestions: ProfileSuggestion[] = [];

      if (profile.specializations.length === 0) {
        suggestions.push({
          type: 'missing',
          field: 'specializations',
          message: 'Add your subject specializations to attract more students',
          impact: 'high',
          action: 'List your strongest subjects and year levels',
        });
      }

      if (!profile.tagline) {
        suggestions.push({
          type: 'enhancement',
          field: 'tagline',
          message: 'Add a catchy tagline to make your profile more memorable',
          impact: 'medium',
          action: 'Create a short phrase that captures your teaching style',
        });
      }

      if (profile.personality.interests.length < 2) {
        suggestions.push({
          type: 'improvement',
          field: 'interests',
          message: 'Share more interests to help students connect with you',
          impact: 'low',
          action: 'Add 2-3 hobbies or interests outside tutoring',
        });
      }

      const overallScore = profile.aiContent.completenessScore;

      return success({ suggestions, overallScore });
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private generateWelcomeMessage(): string {
    return `👋 Welcome to the Scholarly Profile Builder!

I'm here to help you create a compelling tutor profile that will attract students and parents. Over the next few minutes, I'll ask you some questions about your background, teaching style, and what makes you unique.

Don't worry about getting everything perfect - just share naturally and I'll help craft professional content from your responses.

Ready? Let's start with your teaching journey...`;
  }

  private createEmptyExtractedData(): ExtractedProfileData {
    return {
      background: {
        yearsExperience: null,
        educationLevel: null,
        qualifications: [],
        currentRole: null,
        previousRoles: [],
        teachingJourney: null,
        inspirationToTeach: null,
      },
      teachingStyle: {
        primaryApproach: null,
        secondaryApproaches: [],
        learnerTypes: [],
        sessionStructure: null,
        feedbackStyle: null,
        homeworkPhilosophy: null,
        examPreparation: null,
        parentCommunication: null,
      },
      specializations: {
        subjects: [],
        yearLevels: [],
        curricula: [],
        specialNeeds: [],
        examBoards: [],
        uniqueOfferings: [],
      },
      personality: {
        communicationStyle: null,
        pacePreference: null,
        humorLevel: null,
        interests: [],
        funFacts: [],
        valueProposition: null,
      },
      practical: {
        availability: {
          weekdayMornings: false,
          weekdayAfternoons: false,
          weekdayEvenings: false,
          weekends: false,
          schoolHolidays: false,
          typicalHoursPerWeek: null,
        },
        location: {
          online: false,
          inPerson: false,
          travelRadius: null,
          suburbs: [],
          preferredLocations: [],
        },
        pricing: {
          hourlyRate: null,
          packageRates: [],
          freeTrialOffered: false,
          trialDuration: null,
        },
        policies: {
          cancellationPolicy: null,
          makeupPolicy: null,
          paymentTerms: null,
        },
      },
    };
  }

  private extractInsights(question: ProfileQuestion, answer: string): ExtractedInsight[] {
    const insights: ExtractedInsight[] = [];

    // Extract years of experience
    const yearsMatch = answer.match(/(\d+)\s*(years?|yrs?)/i);
    if (yearsMatch && question.targetFields.includes('yearsExperience')) {
      insights.push({
        field: 'yearsExperience',
        value: parseInt(yearsMatch[1], 10),
        confidence: 0.9,
        source: answer,
      });
    }

    // Extract qualifications
    const qualifications = this.extractQualifications(answer);
    if (qualifications.length > 0 && question.targetFields.includes('qualifications')) {
      insights.push({
        field: 'qualifications',
        value: qualifications,
        confidence: 0.8,
        source: answer,
      });
    }

    // Extract subjects
    const subjects = this.extractSubjects(answer);
    if (subjects.length > 0 && question.targetFields.includes('subjects')) {
      insights.push({
        field: 'subjects',
        value: subjects,
        confidence: 0.85,
        source: answer,
      });
    }

    return insights;
  }

  private extractQualifications(text: string): string[] {
    const qualPatterns = [
      /\b(Bachelor'?s?|Masters?|PhD|Doctorate|Diploma|Certificate|B\.?Ed|M\.?Ed|B\.?A|B\.?Sc|M\.?A|M\.?Sc)\b/gi,
    ];
    const qualifications: string[] = [];

    for (const pattern of qualPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        qualifications.push(...matches);
      }
    }

    return [...new Set(qualifications)];
  }

  private extractSubjects(text: string): string[] {
    const subjectPatterns = [
      /\b(mathematics?|maths?|english|science|physics|chemistry|biology|history|geography|economics|accounting|music|art|drama|languages?|french|spanish|german|mandarin|japanese|computing|programming)\b/gi,
    ];
    const subjects: string[] = [];

    for (const pattern of subjectPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        subjects.push(...matches.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
      }
    }

    return [...new Set(subjects)];
  }

  private updateExtractedData(
    data: ExtractedProfileData,
    question: ProfileQuestion,
    insights: ExtractedInsight[]
  ): ExtractedProfileData {
    const updated = { ...data };

    for (const insight of insights) {
      switch (insight.field) {
        case 'yearsExperience':
          updated.background.yearsExperience = insight.value as number;
          break;
        case 'qualifications':
          updated.background.qualifications = [
            ...updated.background.qualifications,
            ...(insight.value as string[]),
          ];
          break;
        case 'subjects':
          const subjectSpecs = (insight.value as string[]).map((s) => ({
            subject: s,
            topics: [],
            proficiencyLevel: 'proficient' as const,
            yearsTeaching: updated.background.yearsExperience || 1,
          }));
          updated.specializations.subjects = [
            ...updated.specializations.subjects,
            ...subjectSpecs,
          ];
          break;
      }
    }

    return updated;
  }

  private generateAIResponse(
    question: ProfileQuestion,
    answer: string,
    insights: ExtractedInsight[]
  ): string {
    const responses = [
      'Great! That gives me a good picture of your background.',
      'Wonderful! I can see you have a thoughtful approach.',
      'Excellent! Parents will appreciate knowing this about you.',
      'Perfect! This will help students connect with you.',
      'Thanks for sharing! Let\'s continue building your profile.',
    ];

    let response = responses[Math.floor(Math.random() * responses.length)];

    if (question.followUpPrompt && answer.length > 50) {
      response += ` ${question.followUpPrompt}`;
    }

    return response;
  }

  private determineStage(nextQuestion: ProfileQuestion | null): ProfileBuildStage {
    if (!nextQuestion) return 'review';
    return nextQuestion.stage;
  }

  private generateHeadlines(data: ExtractedProfileData, styles: ContentStyle[]): DraftOption[] {
    const years = data.background.yearsExperience || 5;
    const subjects = data.specializations.subjects.map((s) => s.subject).join(', ') || 'Multiple Subjects';

    return [
      {
        id: this.generateId('draft'),
        content: `Experienced ${subjects} Tutor - ${years}+ Years Helping Students Succeed`,
        style: 'professional',
        highlights: ['experience', 'subjects'],
        suitableFor: ['parents seeking credibility'],
      },
      {
        id: this.generateId('draft'),
        content: `Passionate Educator Making Learning Fun and Effective`,
        style: 'warm_friendly',
        highlights: ['passion', 'effectiveness'],
        suitableFor: ['younger students', 'parents seeking engagement'],
      },
      {
        id: this.generateId('draft'),
        content: `Your Partner in Academic Excellence - Personalised Tutoring That Works`,
        style: 'energetic',
        highlights: ['partnership', 'personalization'],
        suitableFor: ['high-achieving students'],
      },
    ];
  }

  private generateShortBios(data: ExtractedProfileData, styles: ContentStyle[]): DraftOption[] {
    const years = data.background.yearsExperience || 5;
    const quals = data.background.qualifications.join(', ') || 'qualified educator';

    return [
      {
        id: this.generateId('draft'),
        content: `With ${years} years of teaching experience and a ${quals}, I specialise in helping students build confidence and achieve their academic goals. My patient, structured approach ensures each student receives personalised attention tailored to their unique learning style.`,
        style: 'professional',
        highlights: ['experience', 'qualifications', 'personalization'],
        suitableFor: ['parents researching tutors'],
      },
      {
        id: this.generateId('draft'),
        content: `I believe every student has the potential to excel - they just need the right support. Over ${years} years, I've helped hundreds of students not just improve their grades, but discover a genuine love for learning. Let me show you what's possible!`,
        style: 'warm_friendly',
        highlights: ['belief in students', 'track record'],
        suitableFor: ['students who need encouragement'],
      },
    ];
  }

  private generateTaglines(data: ExtractedProfileData, styles: ContentStyle[]): DraftOption[] {
    return [
      {
        id: this.generateId('draft'),
        content: 'Making complex concepts simple, one lesson at a time',
        style: 'professional',
        highlights: ['simplification'],
        suitableFor: ['students struggling with difficult subjects'],
      },
      {
        id: this.generateId('draft'),
        content: 'Where understanding meets achievement',
        style: 'academic',
        highlights: ['understanding', 'results'],
        suitableFor: ['academic-focused families'],
      },
      {
        id: this.generateId('draft'),
        content: 'Building confidence, unlocking potential',
        style: 'inspiring',
        highlights: ['confidence', 'potential'],
        suitableFor: ['students needing support'],
      },
    ];
  }

  private generateParentPitches(data: ExtractedProfileData, styles: ContentStyle[]): DraftOption[] {
    return [
      {
        id: this.generateId('draft'),
        content: `As a parent myself, I understand the importance of finding the right tutor for your child. I provide regular progress updates, maintain open communication, and create a supportive learning environment where students feel comfortable asking questions and making mistakes.`,
        style: 'warm_friendly',
        highlights: ['parent perspective', 'communication'],
        suitableFor: ['parents wanting involvement'],
      },
      {
        id: this.generateId('draft'),
        content: `I offer more than just tutoring - I provide a complete learning partnership. From diagnostic assessments to customised study plans, exam preparation strategies, and regular progress reports, you'll always know exactly how your child is progressing.`,
        style: 'professional',
        highlights: ['comprehensive approach', 'transparency'],
        suitableFor: ['parents seeking structured approach'],
      },
    ];
  }

  private generateTeachingPhilosophy(data: ExtractedProfileData, styles: ContentStyle[]): DraftOption[] {
    return [
      {
        id: this.generateId('draft'),
        content: `I believe that true learning happens when students feel safe to explore, question, and even fail. My role isn't to give answers, but to guide discovery. Every student learns differently, and I adapt my approach to match their needs, pace, and goals.`,
        style: 'inspiring',
        highlights: ['student-centred', 'adaptive'],
        suitableFor: ['parents valuing pedagogy'],
      },
    ];
  }

  private calculateCompleteness(session: ProfileBuilderSession): ProfileCompleteness {
    const sections = {
      background: { score: 0, missing: [] as string[] },
      teaching: { score: 0, missing: [] as string[] },
      specializations: { score: 0, missing: [] as string[] },
      personality: { score: 0, missing: [] as string[] },
      practical: { score: 0, missing: [] as string[] },
      content: { score: 0, missing: [] as string[] },
    };

    // Calculate background score
    let bgScore = 0;
    if (session.extractedData.background.yearsExperience) bgScore += 25;
    if (session.extractedData.background.qualifications.length > 0) bgScore += 25;
    if (session.extractedData.background.educationLevel) bgScore += 25;
    if (session.extractedData.background.inspirationToTeach) bgScore += 25;
    sections.background.score = bgScore;

    // Calculate content score
    let contentScore = 0;
    if (session.selections.headline) contentScore += 30;
    if (session.selections.shortBio) contentScore += 30;
    if (session.selections.tagline) contentScore += 20;
    if (session.selections.parentPitch) contentScore += 20;
    sections.content.score = contentScore;

    const overall = Math.round(
      (sections.background.score +
        sections.teaching.score +
        sections.specializations.score +
        sections.personality.score +
        sections.practical.score +
        sections.content.score) /
        6
    );

    return {
      overall,
      sections,
      suggestions: [],
    };
  }

  private extractKeywords(session: ProfileBuilderSession): string[] {
    const keywords: string[] = [];

    // Add subjects
    for (const spec of session.extractedData.specializations.subjects) {
      keywords.push(spec.subject.toLowerCase());
      keywords.push(`${spec.subject.toLowerCase()} tutor`);
    }

    // Add year levels
    for (const level of session.extractedData.specializations.yearLevels) {
      keywords.push(level.toLowerCase());
    }

    // Add location keywords
    if (session.extractedData.practical.location.online) {
      keywords.push('online tutor', 'online tutoring');
    }

    return [...new Set(keywords)];
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let profileBuilderService: AIProfileBuilderService | null = null;

export function initializeAIProfileBuilderService(): AIProfileBuilderService {
  profileBuilderService = new AIProfileBuilderService();
  return profileBuilderService;
}

export function getAIProfileBuilderService(): AIProfileBuilderService {
  if (!profileBuilderService) {
    profileBuilderService = new AIProfileBuilderService();
  }
  return profileBuilderService;
}
