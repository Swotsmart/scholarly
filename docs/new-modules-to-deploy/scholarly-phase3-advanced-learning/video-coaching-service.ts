/**
 * Video Coaching Service
 * 
 * Phase 3: Advanced Learning Features
 * 
 * ## The Granny Explanation
 * 
 * Imagine a sports coach reviewing game footage with athletes. They pause at key
 * moments, point out what went well, suggest improvements, and help the player
 * see their own performance from a new angle. Video coaching for teachers works
 * the same way!
 * 
 * A teacher records their lesson, then shares it with a mentor or colleague.
 * The mentor watches and leaves comments at specific moments: "Great questioning
 * here at 4:32!" or "Try giving more wait time after this question at 7:15."
 * 
 * This creates a rich, evidence-based conversation about teaching practice that's
 * far more powerful than abstract advice. The teacher can also self-reflect,
 * watching themselves teach and noticing things they missed in the moment.
 * 
 * ## Architecture
 * 
 * This service provides:
 * - Video upload and secure storage
 * - Automatic transcription
 * - AI analysis of teaching practices
 * - Time-stamped commenting system
 * - Mentor/peer sharing with permissions
 * - Review cycles with acknowledgment
 * - Standards-tagged feedback
 * - Self-reflection workflows
 * 
 * ## Standards
 * 
 * Supports tagging to multiple teaching standards frameworks:
 * - AITSL (Australian Institute for Teaching and School Leadership)
 * - ISTE (International Society for Technology in Education)
 * - Danielson Framework
 * - Custom institutional frameworks
 * 
 * @module VideoCoachingService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  EventBus,
  Cache,
  ScholarlyConfig,
  Validator
} from './types';

import {
  VideoRecording,
  VideoVisibility,
  VideoShare,
  VideoTranscript,
  TranscriptSegment,
  StandardReference,
  ReviewCycle,
  TimeStampedComment,
  CommentType,
  OverallFeedback,
  ActionItem,
  SelfReflection,
  VideoAIAnalysis
} from './phase3-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface VideoRecordingRepository {
  findById(tenantId: string, id: string): Promise<VideoRecording | null>;
  findByEducator(tenantId: string, educatorId: string): Promise<VideoRecording[]>;
  findSharedWith(tenantId: string, userId: string): Promise<VideoRecording[]>;
  save(tenantId: string, recording: VideoRecording): Promise<VideoRecording>;
  update(tenantId: string, id: string, updates: Partial<VideoRecording>): Promise<VideoRecording>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ReviewCycleRepository {
  findById(tenantId: string, id: string): Promise<ReviewCycle | null>;
  findByVideo(tenantId: string, videoId: string): Promise<ReviewCycle[]>;
  findByReviewer(tenantId: string, reviewerId: string): Promise<ReviewCycle[]>;
  save(tenantId: string, cycle: ReviewCycle): Promise<ReviewCycle>;
  update(tenantId: string, id: string, updates: Partial<ReviewCycle>): Promise<ReviewCycle>;
}

export interface CommentRepository {
  findById(tenantId: string, id: string): Promise<TimeStampedComment | null>;
  findByReviewCycle(tenantId: string, cycleId: string): Promise<TimeStampedComment[]>;
  findByTimestamp(tenantId: string, videoId: string, startTime: number, endTime: number): Promise<TimeStampedComment[]>;
  save(tenantId: string, comment: TimeStampedComment): Promise<TimeStampedComment>;
  update(tenantId: string, id: string, updates: Partial<TimeStampedComment>): Promise<TimeStampedComment>;
  delete(tenantId: string, id: string): Promise<void>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

export interface VideoStorageProvider {
  uploadVideo(file: Buffer, metadata: { filename: string; contentType: string }): Promise<{ url: string; thumbnailUrl: string }>;
  deleteVideo(url: string): Promise<void>;
  getSignedUrl(url: string, expiresIn: number): Promise<string>;
}

export interface TranscriptionProvider {
  transcribe(videoUrl: string, language: string): Promise<VideoTranscript>;
  getStatus(transcriptId: string): Promise<'pending' | 'processing' | 'completed' | 'failed'>;
}

export interface VideoAnalysisProvider {
  analyzeTeachingVideo(videoUrl: string, transcriptUrl: string): Promise<VideoAIAnalysis>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface VideoCoachingConfig {
  maxVideoSizeMB: number;
  maxVideoDurationMinutes: number;
  supportedFormats: string[];
  defaultVisibility: VideoVisibility;
  autoTranscribe: boolean;
  autoAnalyze: boolean;
  retentionDays: number;
  supportedStandardsFrameworks: string[];
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class VideoCoachingService extends ScholarlyBaseService {
  private readonly recordingRepo: VideoRecordingRepository;
  private readonly cycleRepo: ReviewCycleRepository;
  private readonly commentRepo: CommentRepository;
  private readonly videoStorage: VideoStorageProvider;
  private readonly transcription: TranscriptionProvider;
  private readonly analysis: VideoAnalysisProvider;
  private readonly config: VideoCoachingConfig;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    recordingRepo: VideoRecordingRepository;
    cycleRepo: ReviewCycleRepository;
    commentRepo: CommentRepository;
    videoStorage: VideoStorageProvider;
    transcription: TranscriptionProvider;
    analysis: VideoAnalysisProvider;
    videoConfig: VideoCoachingConfig;
  }) {
    super('VideoCoachingService', deps);
    this.recordingRepo = deps.recordingRepo;
    this.cycleRepo = deps.cycleRepo;
    this.commentRepo = deps.commentRepo;
    this.videoStorage = deps.videoStorage;
    this.transcription = deps.transcription;
    this.analysis = deps.analysis;
    this.config = deps.videoConfig;
  }

  // --------------------------------------------------------------------------
  // VIDEO RECORDING MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Upload and create a new video recording
   */
  async uploadRecording(
    tenantId: string,
    educatorId: string,
    educatorName: string,
    videoFile: Buffer,
    metadata: {
      filename: string;
      contentType: string;
      title: string;
      description?: string;
      subjectArea: string;
      gradeLevel: string;
      lessonTopic: string;
      learningObjectives: string[];
      standardsAddressed?: StandardReference[];
    }
  ): Promise<Result<VideoRecording>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(educatorId);
      Validator.required(metadata.title, 'title');
      Validator.required(metadata.subjectArea, 'subjectArea');
      Validator.required(metadata.lessonTopic, 'lessonTopic');

      // Validate file size
      const sizeMB = videoFile.length / (1024 * 1024);
      if (sizeMB > this.config.maxVideoSizeMB) {
        throw new ValidationError(`Video exceeds maximum size of ${this.config.maxVideoSizeMB}MB`);
      }

      // Validate format
      const extension = metadata.filename.split('.').pop()?.toLowerCase();
      if (!extension || !this.config.supportedFormats.includes(extension)) {
        throw new ValidationError(`Unsupported format. Supported: ${this.config.supportedFormats.join(', ')}`);
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('uploadRecording', tenantId, async () => {
      // Upload to storage
      const { url, thumbnailUrl } = await this.videoStorage.uploadVideo(videoFile, {
        filename: metadata.filename,
        contentType: metadata.contentType
      });

      // Create recording record
      const recording: VideoRecording = {
        id: this.generateId('vid'),
        tenantId,
        educatorId,
        educatorName,
        title: metadata.title,
        description: metadata.description,
        recordedAt: new Date(),
        duration: 0, // Will be updated after processing
        videoUrl: url,
        thumbnailUrl,
        subjectArea: metadata.subjectArea,
        gradeLevel: metadata.gradeLevel,
        lessonTopic: metadata.lessonTopic,
        learningObjectives: metadata.learningObjectives,
        standardsAddressed: metadata.standardsAddressed || [],
        visibility: this.config.defaultVisibility,
        sharedWith: [],
        reviewStatus: 'pending_review',
        reviewCycles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.recordingRepo.save(tenantId, recording);

      // Trigger async processing
      if (this.config.autoTranscribe) {
        await this.publishEvent('video.uploaded.transcribe', tenantId, {
          recordingId: saved.id,
          videoUrl: url
        });
      }

      if (this.config.autoAnalyze) {
        await this.publishEvent('video.uploaded.analyze', tenantId, {
          recordingId: saved.id,
          videoUrl: url
        });
      }

      await this.publishEvent('scholarly.video.uploaded', tenantId, {
        recordingId: saved.id,
        educatorId,
        title: metadata.title
      });

      this.logger.info('Video recording uploaded', {
        tenantId,
        recordingId: saved.id,
        educatorId,
        title: metadata.title
      });

      return saved;
    }, { educatorId });
  }

  /**
   * Get a recording by ID
   */
  async getRecording(
    tenantId: string,
    userId: string,
    recordingId: string
  ): Promise<Result<VideoRecording>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(recordingId, 'recordingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getRecording', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      // Check access
      const hasAccess = this.checkRecordingAccess(recording, userId);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this recording');
      }

      return recording;
    }, { recordingId });
  }

  /**
   * Get all recordings for an educator
   */
  async getEducatorRecordings(
    tenantId: string,
    educatorId: string
  ): Promise<Result<VideoRecording[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(educatorId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getEducatorRecordings', tenantId, async () => {
      return this.recordingRepo.findByEducator(tenantId, educatorId);
    }, { educatorId });
  }

  /**
   * Get recordings shared with a user
   */
  async getSharedRecordings(
    tenantId: string,
    userId: string
  ): Promise<Result<VideoRecording[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getSharedRecordings', tenantId, async () => {
      return this.recordingRepo.findSharedWith(tenantId, userId);
    }, { userId });
  }

  /**
   * Share a recording with a mentor or peer
   */
  async shareRecording(
    tenantId: string,
    educatorId: string,
    recordingId: string,
    shareWith: {
      userId: string;
      userName: string;
      role: 'mentor' | 'peer' | 'supervisor' | 'viewer';
      canComment: boolean;
      canRate: boolean;
    }
  ): Promise<Result<VideoRecording>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(educatorId);
      Validator.required(recordingId, 'recordingId');
      Validator.required(shareWith.userId, 'shareWith.userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('shareRecording', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      if (recording.educatorId !== educatorId) {
        throw new AuthorizationError('Only the recording owner can share');
      }

      // Check if already shared
      if (recording.sharedWith.some(s => s.userId === shareWith.userId)) {
        throw new ValidationError('Recording already shared with this user');
      }

      const share: VideoShare = {
        userId: shareWith.userId,
        userName: shareWith.userName,
        role: shareWith.role,
        sharedAt: new Date(),
        canComment: shareWith.canComment,
        canRate: shareWith.canRate
      };

      recording.sharedWith.push(share);
      recording.updatedAt = new Date();

      const updated = await this.recordingRepo.update(tenantId, recordingId, {
        sharedWith: recording.sharedWith,
        updatedAt: recording.updatedAt
      });

      await this.publishEvent('scholarly.video.shared', tenantId, {
        recordingId,
        sharedWithUserId: shareWith.userId,
        role: shareWith.role
      });

      return updated;
    }, { recordingId, shareWithUserId: shareWith.userId });
  }

  /**
   * Update recording transcript
   */
  async updateTranscript(
    tenantId: string,
    recordingId: string,
    transcript: VideoTranscript
  ): Promise<Result<VideoRecording>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(recordingId, 'recordingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('updateTranscript', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      // Calculate duration from transcript
      const lastSegment = transcript.segments[transcript.segments.length - 1];
      const duration = lastSegment ? lastSegment.endTime : 0;

      return this.recordingRepo.update(tenantId, recordingId, {
        transcript,
        transcriptUrl: `transcripts/${recordingId}.json`,
        duration,
        updatedAt: new Date()
      });
    }, { recordingId });
  }

  /**
   * Update recording AI analysis
   */
  async updateAIAnalysis(
    tenantId: string,
    recordingId: string,
    analysis: VideoAIAnalysis
  ): Promise<Result<VideoRecording>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(recordingId, 'recordingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('updateAIAnalysis', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      return this.recordingRepo.update(tenantId, recordingId, {
        aiAnalysis: analysis,
        updatedAt: new Date()
      });
    }, { recordingId });
  }

  // --------------------------------------------------------------------------
  // REVIEW CYCLES
  // --------------------------------------------------------------------------

  /**
   * Start a new review cycle for a recording
   */
  async startReviewCycle(
    tenantId: string,
    recordingId: string,
    reviewerId: string,
    reviewerName: string,
    reviewerRole: 'mentor' | 'peer' | 'supervisor' | 'self'
  ): Promise<Result<ReviewCycle>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(recordingId, 'recordingId');
      Validator.userId(reviewerId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('startReviewCycle', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      // Verify access
      if (reviewerRole === 'self') {
        if (recording.educatorId !== reviewerId) {
          throw new AuthorizationError('Self-review only available to recording owner');
        }
      } else {
        const share = recording.sharedWith.find(s => s.userId === reviewerId);
        if (!share || !share.canComment) {
          throw new AuthorizationError('You do not have review access to this recording');
        }
      }

      const cycleNumber = recording.reviewCycles.length + 1;

      const cycle: ReviewCycle = {
        id: this.generateId('rcycle'),
        videoId: recordingId,
        cycleNumber,
        reviewerId,
        reviewerName,
        reviewerRole,
        comments: [],
        status: 'in_progress',
        startedAt: new Date()
      };

      const saved = await this.cycleRepo.save(tenantId, cycle);

      // Update recording
      recording.reviewCycles.push(saved);
      recording.reviewStatus = 'under_review';
      await this.recordingRepo.update(tenantId, recordingId, {
        reviewCycles: recording.reviewCycles,
        reviewStatus: recording.reviewStatus,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.video.review_started', tenantId, {
        recordingId,
        cycleId: saved.id,
        reviewerId,
        reviewerRole
      });

      return saved;
    }, { recordingId, reviewerId });
  }

  /**
   * Add a time-stamped comment to a review cycle
   */
  async addComment(
    tenantId: string,
    cycleId: string,
    authorId: string,
    authorName: string,
    comment: {
      startTime: number;
      endTime?: number;
      content: string;
      commentType: CommentType;
      taggedStandards?: StandardReference[];
      sentiment: 'positive' | 'constructive' | 'neutral' | 'question';
      parentCommentId?: string;
    }
  ): Promise<Result<TimeStampedComment>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(cycleId, 'cycleId');
      Validator.userId(authorId);
      Validator.required(comment.content, 'content');

      if (comment.startTime < 0) {
        throw new ValidationError('Start time cannot be negative');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addComment', tenantId, async () => {
      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        throw new NotFoundError('ReviewCycle', cycleId);
      }

      if (cycle.status === 'completed' || cycle.status === 'acknowledged') {
        throw new ValidationError('Cannot add comments to a completed review cycle');
      }

      const newComment: TimeStampedComment = {
        id: this.generateId('comment'),
        reviewCycleId: cycleId,
        startTime: comment.startTime,
        endTime: comment.endTime,
        content: comment.content,
        commentType: comment.commentType,
        taggedStandards: comment.taggedStandards,
        sentiment: comment.sentiment,
        parentCommentId: comment.parentCommentId,
        replies: [],
        authorId,
        authorName,
        authorRole: cycle.reviewerRole,
        createdAt: new Date()
      };

      const saved = await this.commentRepo.save(tenantId, newComment);

      // Update cycle
      cycle.comments.push(saved);
      await this.cycleRepo.update(tenantId, cycleId, {
        comments: cycle.comments
      });

      await this.publishEvent('scholarly.video.comment_added', tenantId, {
        cycleId,
        commentId: saved.id,
        videoId: cycle.videoId,
        timestamp: comment.startTime
      });

      return saved;
    }, { cycleId });
  }

  /**
   * Complete a review cycle with overall feedback
   */
  async completeReviewCycle(
    tenantId: string,
    cycleId: string,
    reviewerId: string,
    overallFeedback: OverallFeedback
  ): Promise<Result<ReviewCycle>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(cycleId, 'cycleId');
      Validator.userId(reviewerId);
      Validator.required(overallFeedback.summary, 'summary');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('completeReviewCycle', tenantId, async () => {
      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        throw new NotFoundError('ReviewCycle', cycleId);
      }

      if (cycle.reviewerId !== reviewerId) {
        throw new AuthorizationError('Only the reviewer can complete this cycle');
      }

      cycle.overallFeedback = overallFeedback;
      cycle.status = 'completed';
      cycle.completedAt = new Date();

      const updated = await this.cycleRepo.update(tenantId, cycleId, {
        overallFeedback: cycle.overallFeedback,
        status: cycle.status,
        completedAt: cycle.completedAt
      });

      // Update recording status
      const recording = await this.recordingRepo.findById(tenantId, cycle.videoId);
      if (recording) {
        recording.reviewStatus = 'reviewed';
        await this.recordingRepo.update(tenantId, cycle.videoId, {
          reviewStatus: recording.reviewStatus,
          updatedAt: new Date()
        });
      }

      await this.publishEvent('scholarly.video.review_completed', tenantId, {
        cycleId,
        videoId: cycle.videoId,
        reviewerId
      });

      return updated;
    }, { cycleId });
  }

  /**
   * Educator acknowledges review feedback
   */
  async acknowledgeReview(
    tenantId: string,
    cycleId: string,
    educatorId: string,
    selfReflection?: SelfReflection
  ): Promise<Result<ReviewCycle>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(cycleId, 'cycleId');
      Validator.userId(educatorId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('acknowledgeReview', tenantId, async () => {
      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        throw new NotFoundError('ReviewCycle', cycleId);
      }

      // Verify educator owns the video
      const recording = await this.recordingRepo.findById(tenantId, cycle.videoId);
      if (!recording || recording.educatorId !== educatorId) {
        throw new AuthorizationError('Only the recording owner can acknowledge reviews');
      }

      cycle.status = 'acknowledged';
      cycle.acknowledgedAt = new Date();
      if (selfReflection) {
        cycle.selfReflection = selfReflection;
      }

      const updated = await this.cycleRepo.update(tenantId, cycleId, {
        status: cycle.status,
        acknowledgedAt: cycle.acknowledgedAt,
        selfReflection: cycle.selfReflection
      });

      await this.publishEvent('scholarly.video.review_acknowledged', tenantId, {
        cycleId,
        videoId: cycle.videoId,
        educatorId
      });

      return updated;
    }, { cycleId });
  }

  // --------------------------------------------------------------------------
  // AI FEATURES
  // --------------------------------------------------------------------------

  /**
   * Generate AI suggestions for a reviewer
   */
  async getAIReviewSuggestions(
    tenantId: string,
    recordingId: string,
    timestamp: number
  ): Promise<Result<{
    suggestedComments: { type: CommentType; content: string }[];
    relevantStandards: StandardReference[];
    contextualPrompts: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(recordingId, 'recordingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getAIReviewSuggestions', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      // Get AI analysis if available
      const analysis = recording.aiAnalysis;
      
      // Find key moments near this timestamp
      const nearbyMoments = analysis?.keyMoments.filter(
        m => Math.abs(m.timestamp - timestamp) < 30 // Within 30 seconds
      ) || [];

      // Generate suggestions based on analysis
      const suggestedComments: { type: CommentType; content: string }[] = [];
      
      // If there's a highlight nearby, suggest praise
      const highlight = nearbyMoments.find(m => m.type === 'highlight');
      if (highlight) {
        suggestedComments.push({
          type: 'praise',
          content: `Great example of ${highlight.description}. This effectively engages students.`
        });
      }

      // If there's an opportunity nearby, suggest improvement
      const opportunity = nearbyMoments.find(m => m.type === 'opportunity');
      if (opportunity) {
        suggestedComments.push({
          type: 'suggestion',
          content: `Consider ${opportunity.description} to enhance student understanding.`
        });
      }

      // Check wait time
      if (analysis?.questionAnalysis.waitTimeAverage && analysis.questionAnalysis.waitTimeAverage < 3) {
        suggestedComments.push({
          type: 'suggestion',
          content: 'Try extending wait time after questions to allow more students to formulate responses.'
        });
      }

      // Check talk time balance
      if (analysis?.talkTimeAnalysis.teacherTalkPercent && analysis.talkTimeAnalysis.teacherTalkPercent > 70) {
        suggestedComments.push({
          type: 'observation',
          content: 'Notice the balance of teacher vs. student talk time. Are there opportunities for more student voice?'
        });
      }

      // Relevant standards
      const relevantStandards = analysis?.detectedStandards.slice(0, 3) || [];

      // Contextual prompts for the reviewer
      const contextualPrompts = [
        'What specific evidence of student learning do you observe?',
        'How does the teacher respond to student misconceptions?',
        'What questioning strategies are being used?',
        'How is the learning objective made clear to students?'
      ];

      return {
        suggestedComments,
        relevantStandards,
        contextualPrompts
      };
    }, { recordingId, timestamp });
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Check if a user has access to a recording
   */
  private checkRecordingAccess(recording: VideoRecording, userId: string): boolean {
    // Owner always has access
    if (recording.educatorId === userId) {
      return true;
    }

    // Check visibility
    if (recording.visibility === 'public') {
      return true;
    }

    // Check shares
    if (recording.sharedWith.some(s => s.userId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Get review statistics for a recording
   */
  async getReviewStatistics(
    tenantId: string,
    recordingId: string
  ): Promise<Result<{
    totalCycles: number;
    completedCycles: number;
    totalComments: number;
    commentsByType: Record<CommentType, number>;
    averageRating?: number;
    standardsCoverage: StandardReference[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(recordingId, 'recordingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getReviewStatistics', tenantId, async () => {
      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        throw new NotFoundError('Recording', recordingId);
      }

      const cycles = recording.reviewCycles;
      const allComments = cycles.flatMap(c => c.comments);

      // Count comments by type
      const commentsByType: Record<CommentType, number> = {
        praise: 0,
        suggestion: 0,
        question: 0,
        observation: 0,
        standard_link: 0,
        resource: 0,
        reflection_prompt: 0
      };
      allComments.forEach(c => {
        commentsByType[c.commentType]++;
      });

      // Calculate average rating
      const ratings = cycles
        .filter(c => c.overallFeedback?.overallRating)
        .map(c => c.overallFeedback!.overallRating!);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : undefined;

      // Collect all standards mentioned
      const standardsMap = new Map<string, StandardReference>();
      allComments.forEach(c => {
        c.taggedStandards?.forEach(s => {
          standardsMap.set(s.standardCode, s);
        });
      });

      return {
        totalCycles: cycles.length,
        completedCycles: cycles.filter(c => c.status === 'completed' || c.status === 'acknowledged').length,
        totalComments: allComments.length,
        commentsByType,
        averageRating,
        standardsCoverage: Array.from(standardsMap.values())
      };
    }, { recordingId });
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const VIDEO_COACHING_SERVICE_VERSION = '1.0.0';
