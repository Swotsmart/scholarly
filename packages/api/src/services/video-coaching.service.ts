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

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

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
  private readonly videoConfig: VideoCoachingConfig;

  constructor(deps?: any) {
    super('VideoCoachingService', deps);
    this.recordingRepo = deps?.recordingRepo;
    this.cycleRepo = deps?.cycleRepo;
    this.commentRepo = deps?.commentRepo;
    this.videoStorage = deps?.videoStorage;
    this.transcription = deps?.transcription;
    this.analysis = deps?.analysis;
    this.videoConfig = deps?.videoConfig || {
      maxVideoSizeMB: 500,
      maxVideoDurationMinutes: 90,
      supportedFormats: ['mp4', 'mov', 'avi', 'webm'],
      defaultVisibility: 'private' as VideoVisibility,
      autoTranscribe: true,
      autoAnalyze: true,
      retentionDays: 365,
      supportedStandardsFrameworks: ['AITSL', 'ISTE', 'Danielson']
    };
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
    return this.withTiming('uploadRecording', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }
      if (!metadata.title) {
        return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
      }
      if (!metadata.subjectArea) {
        return failure({ code: 'VALIDATION_ERROR', message: 'subjectArea is required' });
      }
      if (!metadata.lessonTopic) {
        return failure({ code: 'VALIDATION_ERROR', message: 'lessonTopic is required' });
      }

      // Validate file size
      const sizeMB = videoFile.length / (1024 * 1024);
      if (sizeMB > this.videoConfig.maxVideoSizeMB) {
        return failure({ code: 'VALIDATION_ERROR', message: `Video exceeds maximum size of ${this.videoConfig.maxVideoSizeMB}MB` });
      }

      // Validate format
      const extension = metadata.filename.split('.').pop()?.toLowerCase();
      if (!extension || !this.videoConfig.supportedFormats.includes(extension)) {
        return failure({ code: 'VALIDATION_ERROR', message: `Unsupported format. Supported: ${this.videoConfig.supportedFormats.join(', ')}` });
      }

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
        visibility: this.videoConfig.defaultVisibility,
        sharedWith: [],
        reviewStatus: 'pending_review',
        reviewCycles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.recordingRepo.save(tenantId, recording);

      // Trigger async processing
      if (this.videoConfig.autoTranscribe) {
        await this.publishEvent('video.uploaded.transcribe', tenantId, {
          recordingId: saved.id,
          videoUrl: url
        });
      }

      if (this.videoConfig.autoAnalyze) {
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

      log.info('Video recording uploaded', {
        tenantId,
        recordingId: saved.id,
        educatorId,
        title: metadata.title
      });

      return success(saved);
    });
  }

  /**
   * Get a recording by ID
   */
  async getRecording(
    tenantId: string,
    userId: string,
    recordingId: string
  ): Promise<Result<VideoRecording>> {
    return this.withTiming('getRecording', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || !userId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      // Check access
      const hasAccess = this.checkRecordingAccess(recording, userId);
      if (!hasAccess) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'You do not have access to this recording' });
      }

      return success(recording);
    });
  }

  /**
   * Get all recordings for an educator
   */
  async getEducatorRecordings(
    tenantId: string,
    educatorId: string
  ): Promise<Result<VideoRecording[]>> {
    return this.withTiming('getEducatorRecordings', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }

      const recordings = await this.recordingRepo.findByEducator(tenantId, educatorId);
      return success(recordings);
    });
  }

  /**
   * Get recordings shared with a user
   */
  async getSharedRecordings(
    tenantId: string,
    userId: string
  ): Promise<Result<VideoRecording[]>> {
    return this.withTiming('getSharedRecordings', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || !userId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      const recordings = await this.recordingRepo.findSharedWith(tenantId, userId);
      return success(recordings);
    });
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
    return this.withTiming('shareRecording', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }
      if (!shareWith.userId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'shareWith.userId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      if (recording.educatorId !== educatorId) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'Only the recording owner can share' });
      }

      // Check if already shared
      if (recording.sharedWith.some(s => s.userId === shareWith.userId)) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Recording already shared with this user' });
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

      return success(updated);
    });
  }

  /**
   * Update recording transcript
   */
  async updateTranscript(
    tenantId: string,
    recordingId: string,
    transcript: VideoTranscript
  ): Promise<Result<VideoRecording>> {
    return this.withTiming('updateTranscript', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      // Calculate duration from transcript
      const lastSegment = transcript.segments[transcript.segments.length - 1];
      const duration = lastSegment ? lastSegment.endTime : 0;

      const updated = await this.recordingRepo.update(tenantId, recordingId, {
        transcript,
        transcriptUrl: `transcripts/${recordingId}.json`,
        duration,
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  /**
   * Update recording AI analysis
   */
  async updateAIAnalysis(
    tenantId: string,
    recordingId: string,
    analysisData: VideoAIAnalysis
  ): Promise<Result<VideoRecording>> {
    return this.withTiming('updateAIAnalysis', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      const updated = await this.recordingRepo.update(tenantId, recordingId, {
        aiAnalysis: analysisData,
        updatedAt: new Date()
      });

      return success(updated);
    });
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
    return this.withTiming('startReviewCycle', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }
      if (!reviewerId || !reviewerId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'reviewerId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      // Verify access
      if (reviewerRole === 'self') {
        if (recording.educatorId !== reviewerId) {
          return failure({ code: 'AUTHORIZATION_ERROR', message: 'Self-review only available to recording owner' });
        }
      } else {
        const share = recording.sharedWith.find(s => s.userId === reviewerId);
        if (!share || !share.canComment) {
          return failure({ code: 'AUTHORIZATION_ERROR', message: 'You do not have review access to this recording' });
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

      return success(saved);
    });
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
    return this.withTiming('addComment', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!cycleId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'cycleId is required' });
      }
      if (!authorId || !authorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'authorId is required' });
      }
      if (!comment.content) {
        return failure({ code: 'VALIDATION_ERROR', message: 'content is required' });
      }
      if (comment.startTime < 0) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Start time cannot be negative' });
      }

      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        return failure({ code: 'NOT_FOUND', message: `ReviewCycle not found: ${cycleId}` });
      }

      if (cycle.status === 'completed' || cycle.status === 'acknowledged') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Cannot add comments to a completed review cycle' });
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

      return success(saved);
    });
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
    return this.withTiming('completeReviewCycle', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!cycleId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'cycleId is required' });
      }
      if (!reviewerId || !reviewerId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'reviewerId is required' });
      }
      if (!overallFeedback.summary) {
        return failure({ code: 'VALIDATION_ERROR', message: 'summary is required' });
      }

      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        return failure({ code: 'NOT_FOUND', message: `ReviewCycle not found: ${cycleId}` });
      }

      if (cycle.reviewerId !== reviewerId) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'Only the reviewer can complete this cycle' });
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

      return success(updated);
    });
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
    return this.withTiming('acknowledgeReview', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!cycleId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'cycleId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }

      const cycle = await this.cycleRepo.findById(tenantId, cycleId);
      if (!cycle) {
        return failure({ code: 'NOT_FOUND', message: `ReviewCycle not found: ${cycleId}` });
      }

      // Verify educator owns the video
      const recording = await this.recordingRepo.findById(tenantId, cycle.videoId);
      if (!recording || recording.educatorId !== educatorId) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'Only the recording owner can acknowledge reviews' });
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

      return success(updated);
    });
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
    return this.withTiming('getAIReviewSuggestions', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
      }

      // Get AI analysis if available
      const analysisData = recording.aiAnalysis;

      // Find key moments near this timestamp
      const nearbyMoments = analysisData?.keyMoments.filter(
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
      if (analysisData?.questionAnalysis.waitTimeAverage && analysisData.questionAnalysis.waitTimeAverage < 3) {
        suggestedComments.push({
          type: 'suggestion',
          content: 'Try extending wait time after questions to allow more students to formulate responses.'
        });
      }

      // Check talk time balance
      if (analysisData?.talkTimeAnalysis.teacherTalkPercent && analysisData.talkTimeAnalysis.teacherTalkPercent > 70) {
        suggestedComments.push({
          type: 'observation',
          content: 'Notice the balance of teacher vs. student talk time. Are there opportunities for more student voice?'
        });
      }

      // Relevant standards
      const relevantStandards = analysisData?.detectedStandards.slice(0, 3) || [];

      // Contextual prompts for the reviewer
      const contextualPrompts = [
        'What specific evidence of student learning do you observe?',
        'How does the teacher respond to student misconceptions?',
        'What questioning strategies are being used?',
        'How is the learning objective made clear to students?'
      ];

      return success({
        suggestedComments,
        relevantStandards,
        contextualPrompts
      });
    });
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
    return this.withTiming('getReviewStatistics', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!recordingId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'recordingId is required' });
      }

      const recording = await this.recordingRepo.findById(tenantId, recordingId);
      if (!recording) {
        return failure({ code: 'NOT_FOUND', message: `Recording not found: ${recordingId}` });
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

      return success({
        totalCycles: cycles.length,
        completedCycles: cycles.filter(c => c.status === 'completed' || c.status === 'acknowledged').length,
        totalComments: allComments.length,
        commentsByType,
        averageRating,
        standardsCoverage: Array.from(standardsMap.values())
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: VideoCoachingService | null = null;

export function initializeVideoCoachingService(deps?: any): VideoCoachingService {
  if (!instance) {
    instance = new VideoCoachingService(deps);
    log.info('VideoCoachingService initialized');
  }
  return instance;
}

export function getVideoCoachingService(): VideoCoachingService {
  if (!instance) {
    throw new Error('VideoCoachingService not initialized. Call initializeVideoCoachingService() first.');
  }
  return instance;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const VIDEO_COACHING_SERVICE_VERSION = '1.0.0';
