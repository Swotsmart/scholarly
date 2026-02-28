/**
 * ============================================================================
 * Scholarly Platform — Book Club Service
 * ============================================================================
 *
 * Structured reading programmes with AI-powered discussion materials,
 * facilitator guides, and engagement tracking.
 *
 * @module erudits/services/bookclub
 * @version 1.1.0 — Type-aligned rewrite
 */

import {
  Result, success, failure, Errors,
  BookClub, BookClubSession, BookClubReading, BookClubMember,
  BookClubSessionType,
  EventBus, Cache, ScholarlyConfig, AIService,
  BookClubRepository, BookClubSessionRepository,
  BookClubReadingRepository, BookClubMemberRepository,
  ERUDITS_EVENTS,
StrictPartial,
} from '../types/erudits.types';

// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

interface BookClubDeps {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  ai: AIService;
  clubRepo: BookClubRepository;
  sessionRepo: BookClubSessionRepository;
  readingRepo: BookClubReadingRepository;
  memberRepo: BookClubMemberRepository;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class BookClubService {

  constructor(private readonly deps: BookClubDeps) {}

  // ──────────────────────────────────────────────────────────────────────────
  // CLUB LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────

  async createClub(
    tenantId: string,
    organiserId: string,
    organiserName: string,
    params: {
      name: string;
      description?: string | undefined;
      language: string;
      targetYearLevels: string[];
      curriculumCodes?: string[] | undefined;
      maxMembers?: number | undefined;
      isPublic?: boolean | undefined;
      startDate?: Date | undefined;
      endDate?: Date | undefined;
    },
  ): Promise<Result<BookClub>> {
    if (!params.name || params.name.trim().length < 3) {
      return failure(Errors.validation('Book club name must be at least 3 characters'));
    }

    const slug = this.generateSlug(params.name);

    const club: BookClub = {
      id: this.generateId('bc'),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      organiserId,
      organiserName,
      name: params.name,
      slug,
      description: params.description,
      language: params.language || 'fr',
      maxParticipants: params.maxMembers,
      maxMembers: params.maxMembers,
      isPublic: params.isPublic ?? false,
      requiresApproval: false,
      subscriptionRequired: false,
      yearLevels: params.targetYearLevels,
      targetYearLevels: params.targetYearLevels,
      curriculumTags: [],
      curriculumCodes: params.curriculumCodes || [],
      startDate: params.startDate,
      endDate: params.endDate,
      timezone: 'Australia/Perth',
      isActive: true,
      participantCount: 0,
      memberCount: 0,
      sessionCount: 0,
      readingCount: 0,
      completionRate: 0,
    };

    const saved = await this.deps.clubRepo.save(tenantId, club);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.BOOKCLUB_CREATED, {
      tenantId, bookClubId: saved.id, organiserId, name: saved.name,
    });

    return success(saved);
  }

  async updateClub(
    tenantId: string,
    clubId: string,
    userId: string,
    updates: StrictPartial<Pick<BookClub, 'name' | 'description' | 'maxMembers' | 'isPublic' | 'isActive' | 'startDate' | 'endDate'>>,
  ): Promise<Result<BookClub>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can edit it'));
    }

    const updated = await this.deps.clubRepo.update(tenantId, clubId, {
      ...updates,
      updatedAt: new Date(),
    });

    return success(updated);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READING LIST
  // ──────────────────────────────────────────────────────────────────────────

  async addReading(
    tenantId: string,
    clubId: string,
    userId: string,
    reading: {
      title: string;
      author?: string | undefined;
      storybookId?: string | undefined;
      publicationId?: string | undefined;
      externalUrl?: string | undefined;
      curriculumCode?: string | undefined;
      learningObjectives?: string[] | undefined;
      readByDate?: Date | undefined;
      sortOrder?: number | undefined;
    },
  ): Promise<Result<BookClubReading>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can manage the reading list'));
    }

    const existingReadings = await this.deps.readingRepo.findByClub(tenantId, clubId);

    const bookClubReading: BookClubReading = {
      id: this.generateId('bcr'),
      tenantId,
      createdAt: new Date(),
      bookClubId: clubId,
      title: reading.title,
      author: reading.author,
      storybookId: reading.storybookId,
      publicationId: reading.publicationId,
      externalUrl: reading.externalUrl,
      curriculumCode: reading.curriculumCode,
      learningObjectives: reading.learningObjectives || [],
      readByDate: reading.readByDate,
      sortOrder: reading.sortOrder ?? existingReadings.length,
      isComplete: false,
      completionRate: 0,
    };

    const saved = await this.deps.readingRepo.save(tenantId, bookClubReading);

    await this.deps.clubRepo.update(tenantId, clubId, {
      readingCount: existingReadings.length + 1,
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.BOOKCLUB_READING_ASSIGNED, {
      tenantId, bookClubId: clubId, readingId: saved.id, title: saved.title,
    });

    return success(saved);
  }

  async getReadingList(
    tenantId: string,
    clubId: string,
  ): Promise<Result<BookClubReading[]>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));

    const readings = await this.deps.readingRepo.findByClub(tenantId, clubId);
    return success(readings.sort((a: BookClubReading, b: BookClubReading) => a.sortOrder - b.sortOrder));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION SCHEDULING
  // ──────────────────────────────────────────────────────────────────────────

  async scheduleSession(
    tenantId: string,
    clubId: string,
    userId: string,
    session: {
      title: string;
      sessionType: BookClubSessionType;
      scheduledAt: Date;
      durationMinutes?: number | undefined;
      readingId?: string | undefined;
      description?: string | undefined;
      facilitatorNotes?: string | undefined;
      meetingUrl?: string | undefined;
    },
  ): Promise<Result<BookClubSession>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can schedule sessions'));
    }

    if (session.readingId) {
      const reading = await this.deps.readingRepo.findById(tenantId, session.readingId);
      if (!reading || reading.bookClubId !== clubId) {
        return failure(Errors.notFound('Reading', session.readingId));
      }
    }

    const existingSessions = await this.deps.sessionRepo.findByClub(tenantId, clubId);

    const bookClubSession: BookClubSession = {
      id: this.generateId('bcs'),
      tenantId,
      createdAt: new Date(),
      bookClubId: clubId,
      title: session.title,
      sessionType: session.sessionType,
      scheduledAt: session.scheduledAt,
      durationMinutes: session.durationMinutes || 60,
      sortOrder: existingSessions.length,
      readingId: session.readingId,
      description: session.description,
      facilitatorNotes: session.facilitatorNotes,
      meetingUrl: session.meetingUrl,
      status: 'scheduled',
      isCompleted: false,
      attendeeCount: 0,
    };

    const saved = await this.deps.sessionRepo.save(tenantId, bookClubSession);

    await this.deps.clubRepo.update(tenantId, clubId, {
      sessionCount: existingSessions.length + 1,
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.BOOKCLUB_SESSION_SCHEDULED, {
      tenantId, bookClubId: clubId, sessionId: saved.id,
      sessionType: saved.sessionType, scheduledAt: saved.scheduledAt.toISOString(),
    });

    return success(saved);
  }

  async completeSession(
    tenantId: string,
    sessionId: string,
    userId: string,
    attendeeIds: string[],
    notes?: string,
  ): Promise<Result<BookClubSession>> {
    const session = await this.deps.sessionRepo.findById(tenantId, sessionId);
    if (!session) return failure(Errors.notFound('Session', sessionId));

    const club = await this.deps.clubRepo.findById(tenantId, session.bookClubId);
    if (!club || club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can complete sessions'));
    }

    const updated = await this.deps.sessionRepo.update(tenantId, sessionId, {
      isCompleted: true,
      attendeeCount: attendeeIds.length,
      facilitatorNotes: notes || session.facilitatorNotes,
      status: 'completed',
    });

    for (const attendeeId of attendeeIds) {
      await this.deps.memberRepo.recordAttendance(tenantId, session.bookClubId, attendeeId, sessionId);
    }

    await this.deps.eventBus.publish(ERUDITS_EVENTS.BOOKCLUB_SESSION_COMPLETED, {
      tenantId, bookClubId: session.bookClubId, sessionId,
      attendeeCount: attendeeIds.length,
    });

    return success(updated);
  }

  async getUpcomingSessions(
    tenantId: string,
    clubId: string,
    limit: number = 10,
  ): Promise<Result<BookClubSession[]>> {
    const sessions = await this.deps.sessionRepo.findUpcoming(tenantId, clubId, limit);
    return success(sessions);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MEMBERSHIP
  // ──────────────────────────────────────────────────────────────────────────

  async joinClub(
    tenantId: string,
    clubId: string,
    userId: string,
    userName: string,
    role: 'member' | 'moderator' | 'organiser' | 'student' | 'facilitator' = 'member',
  ): Promise<Result<BookClubMember>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (!club.isActive) return failure(Errors.validation('This book club is no longer active'));

    if (club.maxMembers && club.memberCount >= club.maxMembers) {
      return failure(Errors.validation('This book club is full'));
    }

    const existing = await this.deps.memberRepo.findByUserAndClub(tenantId, userId, clubId);
    if (existing) {
      return failure(Errors.conflict('You are already a member of this book club'));
    }

    const member: BookClubMember = {
      id: this.generateId('bcm'),
      tenantId,
      createdAt: new Date(),
      bookClubId: clubId,
      userId,
      displayName: userName,
      userName,
      role,
      isActive: true,
      readingsCompleted: 0,
      sessionsAttended: 0,
      engagementScore: 0,
    };

    const saved = await this.deps.memberRepo.save(tenantId, member);

    await this.deps.clubRepo.update(tenantId, clubId, {
      memberCount: club.memberCount + 1,
      participantCount: club.participantCount + 1,
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.BOOKCLUB_MEMBER_JOINED, {
      tenantId, bookClubId: clubId, userId, role,
    });

    return success(saved);
  }

  async leaveClub(
    tenantId: string,
    clubId: string,
    userId: string,
  ): Promise<Result<void>> {
    const member = await this.deps.memberRepo.findByUserAndClub(tenantId, userId, clubId);
    if (!member) return failure(Errors.notFound('Membership', `${userId}@${clubId}`));

    await this.deps.memberRepo.deactivate(tenantId, member.id);

    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (club) {
      await this.deps.clubRepo.update(tenantId, clubId, {
        memberCount: Math.max(0, club.memberCount - 1),
        updatedAt: new Date(),
      });
    }

    return success(undefined);
  }

  async getMembers(
    tenantId: string,
    clubId: string,
  ): Promise<Result<BookClubMember[]>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));

    const members = await this.deps.memberRepo.findByClub(tenantId, clubId);
    return success(members);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI-POWERED DISCUSSION MATERIALS
  // ──────────────────────────────────────────────────────────────────────────

  async generateDiscussionQuestions(
    tenantId: string,
    clubId: string,
    readingId: string,
    userId: string,
    options?: {
      questionCount?: number | undefined;
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | undefined;
      focusAreas?: string[] | undefined;
      targetLanguage?: string | undefined;
      includeAnswerKey?: boolean | undefined;
    },
  ): Promise<Result<GeneratedDiscussionMaterials>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can generate materials'));
    }

    const reading = await this.deps.readingRepo.findById(tenantId, readingId);
    if (!reading || reading.bookClubId !== clubId) {
      return failure(Errors.notFound('Reading', readingId));
    }

    const questionCount = options?.questionCount || 8;
    const difficulty = options?.difficultyLevel || 'intermediate';
    const language = options?.targetLanguage || club.language;
    const focusAreas = options?.focusAreas || ['comprehension', 'vocabulary', 'cultural context'];

    const systemPrompt = [
      `You are an expert ${club.language === 'fr' ? 'French' : club.language} language educator designing discussion questions.`,
      `Book Club: "${club.name}"`,
      `Target students: Year levels ${club.targetYearLevels.join(', ')}`,
      `Difficulty: ${difficulty}`,
      `Curriculum: ${reading.curriculumCode || club.curriculumCodes.join(', ') || 'General'}`,
      `Learning objectives: ${reading.learningObjectives.join('; ') || 'General comprehension and vocabulary'}`,
      `Focus areas: ${focusAreas.join(', ')}`,
      ``,
      `Generate questions in ${language === 'fr' ? 'French' : language}.`,
      `Questions should span Bloom's taxonomy levels.`,
    ].join('\n');

    const result = await this.deps.ai.complete({
      systemPrompt,
      userPrompt: `Generate ${questionCount} discussion questions for "${reading.title}" by ${reading.author || 'unknown'}. ${
        options?.includeAnswerKey
          ? 'Include suggested answers for each question.'
          : 'Do not include answers.'
      }
Return JSON: { "questions": [{ "question": "...", "bloomsLevel": "remember|understand|apply|analyse|evaluate|create", "focusArea": "...", "suggestedAnswer": "..." }], "icebreaker": "...", "closingReflection": "..." }`,
      maxTokens: this.deps.config.aiMaxTokens,
      temperature: 0.8,
      responseFormat: 'json',
    });

    try {
      const parsed = JSON.parse(result.text) as GeneratedDiscussionMaterials;
      parsed.readingId = readingId;
      parsed.readingTitle = reading.title;
      parsed.generatedAt = new Date();
      return success(parsed);
    } catch {
      return failure(Errors.internal('Failed to parse AI-generated discussion materials'));
    }
  }

  async generateFacilitatorGuide(
    tenantId: string,
    sessionId: string,
    userId: string,
  ): Promise<Result<FacilitatorGuide>> {
    const session = await this.deps.sessionRepo.findById(tenantId, sessionId);
    if (!session) return failure(Errors.notFound('Session', sessionId));

    const club = await this.deps.clubRepo.findById(tenantId, session.bookClubId);
    if (!club || club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can generate guides'));
    }

    let reading: BookClubReading | null = null;
    if (session.readingId) {
      reading = await this.deps.readingRepo.findById(tenantId, session.readingId);
    }

    const systemPrompt = [
      `You are an expert facilitator for a ${club.language === 'fr' ? 'French' : club.language} language book club.`,
      `Club: "${club.name}"`,
      `Target year levels: ${club.targetYearLevels.join(', ')}`,
      `Curriculum: ${club.curriculumCodes.join(', ') || 'General'}`,
      `Session type: ${session.sessionType}`,
      `Duration: ${session.durationMinutes} minutes`,
      reading ? `Reading: "${reading.title}" by ${reading.author || 'unknown'}` : '',
      reading?.curriculumCode ? `Aligned to: ${reading.curriculumCode}` : '',
    ].filter(Boolean).join('\n');

    const result = await this.deps.ai.complete({
      systemPrompt,
      userPrompt: `Generate a complete facilitator guide. Return JSON: { "overview": "...", "preSessionChecklist": ["..."], "agenda": [{ "time": "...", "activity": "...", "notes": "..." }], "keyVocabulary": [{ "term": "...", "translation": "...", "context": "..." }], "discussionPrompts": ["..."], "differentiation": { "support": ["..."], "extension": ["..."] }, "assessmentCheckpoints": ["..."] }`,
      maxTokens: this.deps.config.aiMaxTokens,
      temperature: 0.7,
      responseFormat: 'json',
    });

    try {
      const guide = JSON.parse(result.text) as FacilitatorGuide;
      guide.sessionId = sessionId;
      guide.sessionTitle = session.title;
      guide.generatedAt = new Date();
      return success(guide);
    } catch {
      return failure(Errors.internal('Failed to parse AI-generated facilitator guide'));
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FRENCH LANGUAGE ENHANCEMENT — VOCABULARY & SCHEDULING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a structured vocabulary list from a reading assignment.
   *
   * This is particularly valuable for French reading groups: the AI extracts
   * key vocabulary from the reading text, categorises by difficulty and type
   * (noun, verb, expression), provides translations, example sentences, and
   * optional pronunciation guidance — essentially a study sheet that a
   * teacher would normally spend an hour preparing manually.
   */
  async generateVocabularyList(
    tenantId: string,
    clubId: string,
    readingId: string,
    userId: string,
    options?: {
      maxTerms?: number | undefined;
      includePhonetics?: boolean | undefined;
      groupBy?: 'difficulty' | 'type' | 'theme' | undefined;
      nativeLanguage?: string | undefined;
    },
  ): Promise<Result<GeneratedVocabularyList>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can generate vocabulary lists'));
    }

    const reading = await this.deps.readingRepo.findById(tenantId, readingId);
    if (!reading || reading.bookClubId !== clubId) {
      return failure(Errors.notFound('Reading', readingId));
    }

    const maxTerms = options?.maxTerms ?? 25;
    const nativeLang = options?.nativeLanguage ?? 'en';
    const groupBy = options?.groupBy ?? 'difficulty';
    const includePhonetics = options?.includePhonetics !== false;

    const targetLang = club.language === 'fr' ? 'French' : club.language;

    const result = await this.deps.ai.complete({
      systemPrompt: [
        `You are a ${targetLang} language educator extracting vocabulary from a reading assignment.`,
        `Target students: Year levels ${club.targetYearLevels.join(', ')}`,
        `Native language: ${nativeLang === 'en' ? 'English' : nativeLang}`,
        `Group vocabulary by: ${groupBy}`,
      ].join('\n'),
      userPrompt: `Extract up to ${maxTerms} key vocabulary items from "${reading.title}" by ${reading.author || 'unknown'}.
For each term, provide:
- The word/expression in ${targetLang}
- ${nativeLang === 'en' ? 'English' : nativeLang} translation
- Part of speech (noun, verb, adjective, adverb, expression)
- Difficulty: A1, A2, B1, B2, C1 (CEFR levels)
- An example sentence in ${targetLang}
- The example sentence translated to ${nativeLang === 'en' ? 'English' : nativeLang}
${includePhonetics ? '- IPA phonetic transcription' : ''}
- A thematic category (e.g., emotions, nature, daily life, literature)

Return JSON: { "terms": [{ "term": "...", "translation": "...", "partOfSpeech": "...", "cefrLevel": "...", "exampleSentence": "...", "exampleTranslation": "...", ${includePhonetics ? '"phonetic": "...",' : ''} "theme": "..." }], "readingSummary": "...", "recommendedStudyOrder": ["..."] }`,
      maxTokens: this.deps.config.aiMaxTokens,
      temperature: 0.6,
      responseFormat: 'json',
    });

    try {
      const parsed = JSON.parse(result.text) as GeneratedVocabularyList;
      parsed.readingId = readingId;
      parsed.readingTitle = reading.title;
      parsed.generatedAt = new Date();
      return success(parsed);
    } catch {
      return failure(Errors.internal('Failed to parse AI-generated vocabulary list'));
    }
  }

  /**
   * Generate a reading schedule aligned to Australian school terms.
   *
   * Takes the club's readings and distributes them across a term or
   * semester, spacing discussion sessions appropriately and avoiding
   * school holidays. Each reading gets a start date, a discussion
   * session date, and suggested weekly milestones (e.g., "read chapters
   * 1-3 this week").
   */
  async generateTermSchedule(
    tenantId: string,
    clubId: string,
    userId: string,
    params: {
      termStartDate: Date;
      termEndDate: Date;
      sessionsPerWeek?: number | undefined;
      preferredDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | undefined;
      excludeDates?: Date[] | undefined;
    },
  ): Promise<Result<GeneratedTermSchedule>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));
    if (club.organiserId !== userId) {
      return failure(Errors.forbidden('Only the club organiser can generate schedules'));
    }

    const readings = await this.deps.readingRepo.findByClub(tenantId, clubId);
    const uncompletedReadings = readings.filter((r: BookClubReading) => !r.isComplete);

    if (uncompletedReadings.length === 0) {
      return failure(Errors.validation('No uncompleted readings to schedule'));
    }

    const sessionsPerWeek = params.sessionsPerWeek ?? 1;
    const preferredDay = params.preferredDay ?? 'wednesday';
    const excludeDateStrs = (params.excludeDates ?? []).map(d => d.toISOString().split('T')[0]!);

    // Calculate available weeks
    const termMs = params.termEndDate.getTime() - params.termStartDate.getTime();
    const totalWeeks = Math.floor(termMs / (7 * 24 * 60 * 60 * 1000));
    const totalSlots = totalWeeks * sessionsPerWeek;

    // Distribute readings evenly across the term
    const weeksPerReading = Math.max(1, Math.floor(totalSlots / uncompletedReadings.length));

    const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(preferredDay);
    const schedule: GeneratedTermSchedule = {
      clubId,
      clubName: club.name,
      termStart: params.termStartDate,
      termEnd: params.termEndDate,
      totalWeeks,
      entries: [],
      generatedAt: new Date(),
    };

    let currentDate = new Date(params.termStartDate);
    // Advance to first preferred day
    while (currentDate.getDay() !== (dayIndex + 1)) { // getDay: 0=Sun, 1=Mon...
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const reading of uncompletedReadings) {
      const readingStart = new Date(currentDate);
      const milestones: string[] = [];

      for (let w = 0; w < weeksPerReading; w++) {
        const weekDate = new Date(currentDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        const dateStr = weekDate.toISOString().split('T')[0]!;

        if (!excludeDateStrs.includes(dateStr)) {
          milestones.push(`Week ${w + 1}: ${dateStr}`);
        }
      }

      const discussionDate = new Date(
        currentDate.getTime() + (weeksPerReading - 1) * 7 * 24 * 60 * 60 * 1000,
      );

      schedule.entries.push({
        readingId: reading.id,
        readingTitle: reading.title,
        author: reading.author ?? undefined,
        startDate: readingStart,
        discussionDate,
        weeklyMilestones: milestones,
        weeksAllocated: weeksPerReading,
      });

      // Advance to next reading slot
      currentDate = new Date(
        currentDate.getTime() + weeksPerReading * 7 * 24 * 60 * 60 * 1000,
      );
    }

    return success(schedule);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ENGAGEMENT & ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────

  async markReadingComplete(
    tenantId: string,
    clubId: string,
    readingId: string,
    userId: string,
  ): Promise<Result<void>> {
    const member = await this.deps.memberRepo.findByUserAndClub(tenantId, userId, clubId);
    if (!member) return failure(Errors.forbidden('You are not a member of this book club'));

    const reading = await this.deps.readingRepo.findById(tenantId, readingId);
    if (!reading || reading.bookClubId !== clubId) {
      return failure(Errors.notFound('Reading', readingId));
    }

    await this.deps.memberRepo.update(tenantId, member.id, {
      readingsCompleted: member.readingsCompleted + 1,
    });

    // Recalculate engagement score
    const updatedMember = await this.deps.memberRepo.findById(tenantId, member.id);
    if (updatedMember) {
      const club = await this.deps.clubRepo.findById(tenantId, clubId);
      const totalReadings = club?.readingCount || 1;
      const totalSessions = club?.sessionCount || 1;

      const readingScore = Math.min(100, (updatedMember.readingsCompleted / totalReadings) * 100);
      const attendanceScore = Math.min(100, (updatedMember.sessionsAttended / totalSessions) * 100);
      const engagementScore = Math.round((readingScore * 0.6) + (attendanceScore * 0.4));

      await this.deps.memberRepo.update(tenantId, member.id, { engagementScore });
    }

    return success(undefined);
  }

  async getClubAnalytics(
    tenantId: string,
    clubId: string,
  ): Promise<Result<BookClubAnalytics>> {
    const club = await this.deps.clubRepo.findById(tenantId, clubId);
    if (!club) return failure(Errors.notFound('Book Club', clubId));

    const members = await this.deps.memberRepo.findByClub(tenantId, clubId);
    const sessions = await this.deps.sessionRepo.findByClub(tenantId, clubId);
    const readings = await this.deps.readingRepo.findByClub(tenantId, clubId);

    const activeMembers = members.filter((m: BookClubMember) => m.isActive);
    const completedSessions = sessions.filter((s: BookClubSession) => s.isCompleted);

    const avgEngagement = activeMembers.length > 0
      ? Math.round(activeMembers.reduce((sum: number, m: BookClubMember) => sum + m.engagementScore, 0) / activeMembers.length)
      : 0;

    const avgAttendance = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum: number, s: BookClubSession) => sum + s.attendeeCount, 0) / completedSessions.length)
      : 0;

    return success({
      clubId,
      clubName: club.name,
      totalMembers: club.memberCount,
      activeMembers: activeMembers.length,
      totalReadings: readings.length,
      completedReadings: readings.filter((r: BookClubReading) => r.isComplete).length,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      averageAttendance: avgAttendance,
      averageEngagementScore: avgEngagement,
      topMembers: activeMembers
        .sort((a: BookClubMember, b: BookClubMember) => b.engagementScore - a.engagementScore)
        .slice(0, 5)
        .map((m: BookClubMember) => ({ userName: m.userName, engagementScore: m.engagementScore })),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private generateSlug(title: string): string {
    return title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}${random}`;
  }
}

// ============================================================================
// AI-GENERATED MATERIAL TYPES
// ============================================================================

export interface GeneratedDiscussionMaterials {
  readingId?: string | undefined;
  readingTitle?: string | undefined;
  generatedAt?: Date | undefined;
  questions: Array<{
    question: string;
    bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyse' | 'evaluate' | 'create';
    focusArea: string;
    suggestedAnswer?: string | undefined;
  }>;
  icebreaker: string;
  closingReflection: string;
}

export interface FacilitatorGuide {
  sessionId?: string | undefined;
  sessionTitle?: string | undefined;
  generatedAt?: Date | undefined;
  overview: string;
  preSessionChecklist: string[];
  agenda: Array<{ time: string; activity: string; notes: string }>;
  keyVocabulary: Array<{ term: string; translation: string; context: string }>;
  discussionPrompts: string[];
  differentiation: { support: string[]; extension: string[] };
  assessmentCheckpoints: string[];
}

export interface BookClubAnalytics {
  clubId: string;
  clubName: string;
  totalMembers: number;
  activeMembers: number;
  totalReadings: number;
  completedReadings: number;
  totalSessions: number;
  completedSessions: number;
  averageAttendance: number;
  averageEngagementScore: number;
  topMembers: Array<{ userName: string; engagementScore: number }>;
}

export interface GeneratedVocabularyList {
  readingId?: string | undefined;
  readingTitle?: string | undefined;
  generatedAt?: Date | undefined;
  terms: Array<{
    term: string;
    translation: string;
    partOfSpeech: string;
    cefrLevel: string;
    exampleSentence: string;
    exampleTranslation: string;
    phonetic?: string | undefined;
    theme: string;
  }>;
  readingSummary: string;
  recommendedStudyOrder: string[];
}

export interface GeneratedTermSchedule {
  clubId: string;
  clubName: string;
  termStart: Date;
  termEnd: Date;
  totalWeeks: number;
  generatedAt?: Date | undefined;
  entries: Array<{
    readingId: string;
    readingTitle: string;
    author?: string | undefined;
    startDate: Date;
    discussionDate: Date;
    weeklyMilestones: string[];
    weeksAllocated: number;
  }>;
}
