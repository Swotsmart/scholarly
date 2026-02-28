/**
 * Scholarly UC 4.0 — Meeting Intelligence Integration
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE COURT REPORTER WHO ALSO WRITES THE CASE BRIEF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Imagine a court reporter who not only captures every word spoken during
 * a trial but also — the moment proceedings end — immediately produces a
 * structured brief: key arguments, decisions made, actions assigned, and
 * a summary of each witness's testimony. That's what this integration does
 * for every meeting on the platform.
 *
 * The system has two phases:
 *
 *   PHASE 1 — LIVE TRANSCRIPTION (during the meeting)
 *     When a meeting room starts recording, the audio stream is piped to
 *     a Speech-to-Text engine (Whisper, Azure Speech, Deepgram — via the
 *     existing STT provider abstraction). Transcript segments arrive in
 *     real time with speaker labels and timestamps. These accumulate in
 *     a TranscriptionSession, and can be displayed live to participants.
 *
 *   PHASE 2 — POST-MEETING INTELLIGENCE (after the meeting)
 *     When the meeting ends, the accumulated transcript is fed to the
 *     MeetingIntelligenceEngine (built in Chunk E). The engine runs its
 *     LLM pipeline — summary, action items, topic chapters, decisions,
 *     sentiment — in parallel. Results are stored in a MeetingRecord and
 *     distributed to participants via notifications and email.
 *
 * The integration is event-driven: it subscribes to Video plugin events
 * (room:created, room:recording-started, room:ended) and AI Transcription
 * plugin events. No modifications to existing plugins are needed.
 *
 * REST endpoints (mounted at /api/ai-transcription/meetings/):
 *
 *   ── Meeting Records ──
 *   GET    /meetings                           List meeting records
 *   GET    /meetings/:id                       Get meeting record with intelligence
 *   GET    /meetings/:id/transcript             Full transcript
 *   GET    /meetings/:id/live                   Live transcript (streaming)
 *   GET    /meetings/:id/summary               Structured summary
 *   GET    /meetings/:id/action-items          Action items
 *   GET    /meetings/:id/chapters              Topic chapters
 *   GET    /meetings/:id/decisions             Key decisions
 *   GET    /meetings/:id/sentiment             Speaker sentiment
 *   POST   /meetings/:id/regenerate            Re-run intelligence
 *
 *   ── Configuration ──
 *   GET    /meetings/config                    Get meeting intelligence settings
 *   PUT    /meetings/config                    Update settings
 *
 *   ── Distribution ──
 *   POST   /meetings/:id/distribute            Send summary to participants
 *   POST   /meetings/:id/follow-up-email       Generate follow-up email
 *
 *   ── Active Sessions ──
 *   GET    /meetings/active                    List active transcription sessions
 *   POST   /meetings/:roomId/start             Manually start transcription
 *   POST   /meetings/:roomId/stop              Manually stop transcription
 *
 * Event prefix: meeting-intel:*
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { PluginContext, PluginCapability } from '../../../core/plugin-interface';
import type {
  IntelligenceConfig, IntelligenceResult, MeetingSummary,
  ActionItem, TopicChapter, KeyDecision, SpeakerSentiment,
  TranscriptionSegment, IntelligenceModule,
} from './meeting-intelligence';
import { MeetingIntelligenceEngine } from './meeting-intelligence';

// ─── Meeting Record ─────────────────────────────────────────────────

export interface MeetingRecord {
  id: string;
  /** Video room ID this meeting is linked to */
  roomId: string;
  /** Meeting title (from room name or calendar event) */
  title: string;
  /** Participants who attended */
  participants: MeetingParticipant[];
  /** Meeting timing */
  scheduledStart?: Date;
  actualStart: Date;
  actualEnd?: Date;
  durationSeconds?: number;
  /** Recording */
  recording?: {
    url: string;
    sizeBytes?: number;
    durationSeconds?: number;
  };
  /** Transcription status */
  transcription: {
    status: 'pending' | 'live' | 'completed' | 'failed';
    segmentCount: number;
    wordCount: number;
    language?: string;
    provider?: string;
  };
  /** Intelligence results */
  intelligence?: IntelligenceResult;
  /** Distribution tracking */
  distribution: {
    distributed: boolean;
    distributedAt?: Date;
    recipients: string[];
    method: 'email' | 'notification' | 'both' | 'none';
  };
  /** Status */
  status: 'live' | 'processing' | 'completed' | 'failed';
  /** Tenant */
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipant {
  userId: string;
  displayName: string;
  email?: string;
  role: 'HOST' | 'CO_HOST' | 'PRESENTER' | 'PARTICIPANT';
  joinedAt: Date;
  leftAt?: Date;
  durationSeconds?: number;
  /** Speaking time in seconds (from speaker diarisation) */
  speakingTimeSeconds?: number;
}

// ─── Transcription Session (Live) ───────────────────────────────────

interface TranscriptionSession {
  meetingId: string;
  roomId: string;
  /** Accumulated transcript segments */
  segments: TranscriptionSegment[];
  /** Full concatenated text (rebuilt as segments arrive) */
  fullText: string;
  /** Speaker labels encountered */
  speakers: Set<string>;
  /** Whether STT is actively receiving audio */
  isActive: boolean;
  /** Audio buffer for batch processing (if not streaming) */
  audioChunks: Buffer[];
  /** Segment counter */
  segmentIndex: number;
  startedAt: Date;
}

// ─── Configuration ──────────────────────────────────────────────────

export interface MeetingIntelligenceConfig {
  /** Auto-transcribe all meetings (vs. manual opt-in) */
  autoTranscribe: boolean;
  /** Auto-run intelligence pipeline when meeting ends */
  autoAnalyse: boolean;
  /** Auto-distribute results to participants */
  autoDistribute: boolean;
  /** Distribution method */
  distributionMethod: 'email' | 'notification' | 'both' | 'none';
  /** Which intelligence modules to run */
  enabledModules: IntelligenceModule[];
  /** LLM configuration (passed to MeetingIntelligenceEngine) */
  intelligenceConfig: IntelligenceConfig;
  /** Minimum meeting duration to trigger intelligence (seconds) */
  minimumDurationSeconds: number;
  /** Minimum participant count to trigger intelligence */
  minimumParticipants: number;
  /** Language for transcription */
  language: string;
  /** STT provider preference */
  sttProvider: 'whisper' | 'azure' | 'deepgram' | 'self-hosted';
  /** Retain transcripts and intelligence results for N days (0 = forever) */
  retentionDays: number;
}

const DEFAULT_CONFIG: MeetingIntelligenceConfig = {
  autoTranscribe: true,
  autoAnalyse: true,
  autoDistribute: false,
  distributionMethod: 'notification',
  enabledModules: ['summary', 'action-items', 'chapters', 'decisions'],
  intelligenceConfig: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    enabledModules: ['summary', 'action-items', 'chapters', 'decisions'],
    autoRunAfterTranscription: true,
    maxTokens: 4096,
  },
  minimumDurationSeconds: 60,
  minimumParticipants: 2,
  language: 'en',
  sttProvider: 'self-hosted',
  retentionDays: 90,
};

// ─── Integration Manager ────────────────────────────────────────────

export class MeetingIntelligenceIntegration {
  private config: MeetingIntelligenceConfig;
  private intelligenceEngine: MeetingIntelligenceEngine;
  /** Meeting records: meetingId → MeetingRecord */
  private meetings: Map<string, MeetingRecord> = new Map();
  /** Active transcription sessions: roomId → TranscriptionSession */
  private activeSessions: Map<string, TranscriptionSession> = new Map();
  /** Room → meeting mapping: roomId → meetingId */
  private roomMeetingMap: Map<string, string> = new Map();
  /** Participant tracker: roomId → participants */
  private roomParticipants: Map<string, Map<string, MeetingParticipant>> = new Map();

  constructor(
    private ctx: PluginContext,
    config?: Partial<MeetingIntelligenceConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.intelligenceConfig.enabledModules = this.config.enabledModules;
    this.intelligenceEngine = new MeetingIntelligenceEngine(
      this.config.intelligenceConfig,
      ctx,
    );
  }

  // ─── Lifecycle ────────────────────────────────────────────────────

  subscribeToEvents(): void {
    // ── Room Created → Prepare Meeting Record ───────────────────
    this.ctx.bus.on('room:created', (evt: any) => {
      const meetingId = uuidv4();
      const meeting: MeetingRecord = {
        id: meetingId,
        roomId: evt.roomId,
        title: evt.roomName || evt.title || 'Untitled Meeting',
        participants: [],
        actualStart: new Date(),
        transcription: { status: 'pending', segmentCount: 0, wordCount: 0 },
        distribution: { distributed: false, recipients: [], method: this.config.distributionMethod },
        status: 'live',
        tenantId: evt.tenantId || '__default__',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.meetings.set(meetingId, meeting);
      this.roomMeetingMap.set(evt.roomId, meetingId);
      this.roomParticipants.set(evt.roomId, new Map());

      this.ctx.bus.emit('meeting-intel:meeting-created', {
        meetingId, roomId: evt.roomId, title: meeting.title,
        tenantId: meeting.tenantId,
      } as any);

      this.ctx.logger.info(`[MeetingIntel] Meeting record created: ${meetingId} for room ${evt.roomId}`);
    });

    // ── Participant Joined → Track Attendance ───────────────────
    this.ctx.bus.on('room:participant-joined', (evt: any) => {
      const participants = this.roomParticipants.get(evt.roomId);
      if (!participants) return;

      const participant: MeetingParticipant = {
        userId: evt.userId,
        displayName: evt.displayName || evt.userId,
        email: evt.email,
        role: evt.role || 'PARTICIPANT',
        joinedAt: new Date(),
      };
      participants.set(evt.userId, participant);

      // Update meeting record
      const meetingId = this.roomMeetingMap.get(evt.roomId);
      if (meetingId) {
        const meeting = this.meetings.get(meetingId);
        if (meeting) {
          meeting.participants = [...participants.values()];
          meeting.updatedAt = new Date();
        }
      }
    });

    // ── Participant Left → Update Duration ──────────────────────
    this.ctx.bus.on('room:participant-left', (evt: any) => {
      const participants = this.roomParticipants.get(evt.roomId);
      if (!participants) return;

      const participant = participants.get(evt.userId);
      if (participant) {
        participant.leftAt = new Date();
        participant.durationSeconds = (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000;
      }
    });

    // ── Recording Started → Begin Live Transcription ────────────
    this.ctx.bus.on('room:recording-started', (evt: any) => {
      if (!this.config.autoTranscribe) return;
      this.startTranscriptionSession(evt.roomId);
    });

    // ── Recording Stopped → Stop Live Transcription ─────────────
    this.ctx.bus.on('room:recording-stopped', (evt: any) => {
      const session = this.activeSessions.get(evt.roomId);
      if (session) {
        session.isActive = false;
        this.ctx.logger.info(`[MeetingIntel] Transcription paused for room ${evt.roomId}`);
      }

      // Store recording reference
      const meetingId = this.roomMeetingMap.get(evt.roomId);
      if (meetingId) {
        const meeting = this.meetings.get(meetingId);
        if (meeting) {
          meeting.recording = {
            url: evt.recordingUrl || '',
            sizeBytes: evt.recordingSize,
            durationSeconds: evt.recordingDuration,
          };
        }
      }
    });

    // ── Room Ended → Finalise and Run Intelligence ──────────────
    this.ctx.bus.on('room:ended', async (evt: any) => {
      const meetingId = this.roomMeetingMap.get(evt.roomId);
      if (!meetingId) return;

      const meeting = this.meetings.get(meetingId);
      if (!meeting) return;

      // Finalise timing
      meeting.actualEnd = new Date();
      meeting.durationSeconds = (meeting.actualEnd.getTime() - meeting.actualStart.getTime()) / 1000;

      // Finalise participants
      const participants = this.roomParticipants.get(evt.roomId);
      if (participants) {
        for (const p of participants.values()) {
          if (!p.leftAt) {
            p.leftAt = meeting.actualEnd;
            p.durationSeconds = (p.leftAt.getTime() - p.joinedAt.getTime()) / 1000;
          }
        }
        meeting.participants = [...participants.values()];
      }

      // Stop transcription session
      const session = this.activeSessions.get(evt.roomId);
      if (session) {
        session.isActive = false;
        meeting.transcription.status = 'completed';
        meeting.transcription.segmentCount = session.segments.length;
        meeting.transcription.wordCount = session.fullText.split(/\s+/).length;
      }

      meeting.updatedAt = new Date();

      this.ctx.bus.emit('meeting-intel:meeting-ended', {
        meetingId, roomId: evt.roomId, durationSeconds: meeting.durationSeconds,
        participantCount: meeting.participants.length,
        segmentCount: meeting.transcription.segmentCount,
        tenantId: meeting.tenantId,
      } as any);

      this.ctx.logger.info(`[MeetingIntel] Meeting ended: ${meetingId} — ${meeting.durationSeconds}s, ${meeting.participants.length} participants, ${meeting.transcription.segmentCount} segments`);

      // Run intelligence pipeline if configured and thresholds met
      if (this.config.autoAnalyse && session && session.fullText.length > 0) {
        if (meeting.durationSeconds >= this.config.minimumDurationSeconds &&
            meeting.participants.length >= this.config.minimumParticipants) {
          await this.runIntelligencePipeline(meetingId);
        } else {
          this.ctx.logger.info(`[MeetingIntel] Skipping intelligence for ${meetingId}: below thresholds (${meeting.durationSeconds}s / ${meeting.participants.length} participants)`);
          meeting.status = 'completed';
        }
      } else {
        meeting.status = 'completed';
      }

      // Cleanup
      this.activeSessions.delete(evt.roomId);
      this.roomParticipants.delete(evt.roomId);
    });

    // ── Transcription Segment Arrived (from STT provider) ───────
    this.ctx.bus.on('transcription:segment', (evt: any) => {
      const session = this.activeSessions.get(evt.roomId);
      if (!session || !session.isActive) return;

      const segment: TranscriptionSegment = {
        id: `seg-${session.segmentIndex++}`,
        speakerName: evt.speaker || 'Unknown',
        text: evt.text,
        startTime: evt.startTime,
        endTime: evt.endTime,
        confidence: evt.confidence || 0.9,
        language: evt.language || this.config.language,
      };

      session.segments.push(segment);
      session.speakers.add(segment.speakerName || "Unknown");
      session.fullText += (session.fullText.length > 0 ? '\n' : '') + `[${segment.speakerName}]: ${segment.text}`;

      this.ctx.bus.emit('meeting-intel:segment-added', {
        meetingId: session.meetingId,
        roomId: session.roomId,
        segment,
        totalSegments: session.segments.length,
      } as any);
    });

    this.ctx.logger.info('[MeetingIntel] Event subscriptions active — room lifecycle ↔ intelligence pipeline bridged');
  }

  // ─── Transcription Session ────────────────────────────────────────

  startTranscriptionSession(roomId: string): boolean {
    if (this.activeSessions.has(roomId)) return false;

    const meetingId = this.roomMeetingMap.get(roomId);
    if (!meetingId) return false;

    const session: TranscriptionSession = {
      meetingId,
      roomId,
      segments: [],
      fullText: '',
      speakers: new Set(),
      isActive: true,
      audioChunks: [],
      segmentIndex: 0,
      startedAt: new Date(),
    };

    this.activeSessions.set(roomId, session);

    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      meeting.transcription.status = 'live';
      meeting.transcription.provider = this.config.sttProvider;
      meeting.updatedAt = new Date();
    }

    this.ctx.bus.emit('meeting-intel:transcription-started', {
      meetingId, roomId, provider: this.config.sttProvider,
    } as any);

    this.ctx.logger.info(`[MeetingIntel] Live transcription started for room ${roomId} (${this.config.sttProvider})`);
    return true;
  }

  stopTranscriptionSession(roomId: string): boolean {
    const session = this.activeSessions.get(roomId);
    if (!session) return false;

    session.isActive = false;

    this.ctx.bus.emit('meeting-intel:transcription-stopped', {
      meetingId: session.meetingId, roomId,
      segmentCount: session.segments.length,
      wordCount: session.fullText.split(/\s+/).length,
    } as any);

    this.ctx.logger.info(`[MeetingIntel] Transcription stopped for room ${roomId}: ${session.segments.length} segments`);
    return true;
  }

  /**
   * Ingest an audio chunk from the live recording stream.
   * In production, this feeds into the STT provider's streaming API.
   * The STT provider emits 'transcription:segment' events as it
   * recognises speech, which are captured by the event handler above.
   */
  ingestAudioChunk(roomId: string, chunk: Buffer, metadata?: {
    sampleRate?: number; channels?: number; encoding?: string;
  }): boolean {
    const session = this.activeSessions.get(roomId);
    if (!session || !session.isActive) return false;

    session.audioChunks.push(chunk);

    // In production: forward to STT provider's streaming endpoint
    // The STT provider will emit 'transcription:segment' events
    // as it processes the audio
    this.ctx.bus.emit('meeting-intel:audio-chunk-received', {
      meetingId: session.meetingId,
      roomId,
      chunkSize: chunk.length,
      totalChunks: session.audioChunks.length,
      sampleRate: metadata?.sampleRate || 16000,
    } as any);

    return true;
  }

  // ─── Intelligence Pipeline ────────────────────────────────────────

  async runIntelligencePipeline(meetingId: string): Promise<IntelligenceResult | null> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    // Find the transcript — either from active session or stored
    let fullTranscript = '';
    let speakers: string[] = [];

    // Check active sessions first (meeting may still have session data in memory)
    for (const session of this.activeSessions.values()) {
      if (session.meetingId === meetingId) {
        fullTranscript = session.fullText;
        speakers = [...session.speakers];
        break;
      }
    }

    // If no active session, try to reconstruct from stored segments
    if (!fullTranscript) {
      // In production: load from database
      this.ctx.logger.warn(`[MeetingIntel] No transcript found for meeting ${meetingId}`);
      return null;
    }

    meeting.status = 'processing';
    meeting.updatedAt = new Date();

    this.ctx.bus.emit('meeting-intel:intelligence-started', {
      meetingId, modules: this.config.enabledModules,
      transcriptLength: fullTranscript.length,
      tenantId: meeting.tenantId,
    } as any);

    this.ctx.logger.info(`[MeetingIntel] Running intelligence pipeline for ${meetingId}: ${this.config.enabledModules.join(', ')}`);

    try {
      const result = await this.intelligenceEngine.processTranscript(
        meetingId,
        fullTranscript,
        speakers,
        {
          title: meeting.title,
          duration: meeting.durationSeconds ? `${Math.round(meeting.durationSeconds / 60)} minutes` : undefined,
          participantCount: meeting.participants.length,
        },
      );

      meeting.intelligence = result;
      meeting.status = result.status === 'completed' ? 'completed' : 'failed';
      meeting.updatedAt = new Date();

      // Assign action items to participants where possible
      if (result.actionItems?.length && meeting.participants.length > 0) {
        this.matchActionItemsToParticipants(result.actionItems, meeting.participants);
      }

      // Calculate speaking time from transcript segments
      this.calculateSpeakingTime(meetingId, meeting);

      this.ctx.bus.emit('meeting-intel:intelligence-completed', {
        meetingId,
        summaryLength: result.summary?.executiveBrief?.length || 0,
        actionItemCount: result.actionItems?.length || 0,
        chapterCount: result.chapters?.length || 0,
        decisionCount: result.decisions?.length || 0,
        processingTimeMs: result.processingTimeMs,
        tenantId: meeting.tenantId,
      } as any);

      // Auto-distribute if configured
      if (this.config.autoDistribute && result.status === 'completed') {
        await this.distributeResults(meetingId);
      }

      return result;
    } catch (err: any) {
      meeting.status = 'failed';
      meeting.updatedAt = new Date();

      this.ctx.bus.emit('meeting-intel:intelligence-failed', {
        meetingId, error: err.message, tenantId: meeting.tenantId,
      } as any);

      this.ctx.logger.error(`[MeetingIntel] Intelligence failed for ${meetingId}: ${err.message}`);
      return null;
    }
  }

  private matchActionItemsToParticipants(items: ActionItem[], participants: MeetingParticipant[]): void {
    for (const item of items) {
      if (item.assignee) {
        const match = participants.find(p =>
          p.displayName.toLowerCase().includes(item.assignee!.toLowerCase()) ||
          item.assignee!.toLowerCase().includes(p.displayName.toLowerCase())
        );
        if (match) {
          item.assignee = match.displayName;
          (item as any).assigneeUserId = match.userId;
          (item as any).assigneeEmail = match.email;
        }
      }
    }
  }

  private calculateSpeakingTime(meetingId: string, meeting: MeetingRecord): void {
    // Find segments for this meeting
    for (const session of this.activeSessions.values()) {
      if (session.meetingId !== meetingId) continue;

      const speakerTime: Map<string, number> = new Map();
      for (const seg of session.segments) {
        const duration = seg.endTime - seg.startTime;
        const speaker = seg.speakerName || 'Unknown';
        speakerTime.set(speaker, (speakerTime.get(speaker) || 0) + duration);
      }

      // Match speakers to participants
      for (const participant of meeting.participants) {
        const time = speakerTime.get(participant.displayName) || speakerTime.get(participant.userId);
        if (time) participant.speakingTimeSeconds = Math.round(time);
      }
      break;
    }
  }

  // ─── Distribution ─────────────────────────────────────────────────

  async distributeResults(meetingId: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting || !meeting.intelligence || meeting.intelligence.status !== 'completed') return false;

    const recipients = meeting.participants
      .filter(p => p.email)
      .map(p => p.email!);

    if (recipients.length === 0) return false;

    meeting.distribution = {
      distributed: true,
      distributedAt: new Date(),
      recipients,
      method: this.config.distributionMethod,
    };

    this.ctx.bus.emit('meeting-intel:results-distributed', {
      meetingId,
      recipientCount: recipients.length,
      method: this.config.distributionMethod,
      tenantId: meeting.tenantId,
    } as any);

    // Emit notification events for each participant
    for (const participant of meeting.participants) {
      this.ctx.bus.emit('notification:send', {
        userId: participant.userId,
        type: 'meeting-intelligence-ready',
        title: `Meeting Summary: ${meeting.title}`,
        body: meeting.intelligence.summary?.executiveBrief?.slice(0, 200) || 'Your meeting summary is ready.',
        data: { meetingId, roomId: meeting.roomId },
        tenantId: meeting.tenantId,
      } as any);
    }

    this.ctx.logger.info(`[MeetingIntel] Results distributed for ${meetingId} to ${recipients.length} recipients`);
    return true;
  }

  async generateFollowUpEmail(meetingId: string): Promise<string | null> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting || !meeting.intelligence) return null;

    const intel = meeting.intelligence;
    let email = `Subject: Follow-up: ${meeting.title}\n\n`;
    email += `Hi everyone,\n\n`;
    email += `Thank you for attending "${meeting.title}" on ${meeting.actualStart.toLocaleDateString()}.\n\n`;

    if (intel.summary?.executiveBrief) {
      email += `## Summary\n${intel.summary.executiveBrief}\n\n`;
    }

    if (intel.actionItems?.length) {
      email += `## Action Items\n`;
      for (const item of intel.actionItems) {
        email += `- ${item.description}`;
        if (item.assignee) email += ` (${item.assignee})`;
        if (item.dueDate) email += ` — due ${item.dueDate}`;
        email += `\n`;
      }
      email += `\n`;
    }

    if (intel.decisions?.length) {
      email += `## Key Decisions\n`;
      for (const d of intel.decisions) {
        email += `- ${d.decision}\n`;
      }
      email += `\n`;
    }

    email += `Best regards,\nMeeting Intelligence System`;
    return email;
  }

  // ─── Query Methods ────────────────────────────────────────────────

  getMeeting(id: string): MeetingRecord | undefined { return this.meetings.get(id); }

  getMeetingByRoom(roomId: string): MeetingRecord | undefined {
    const meetingId = this.roomMeetingMap.get(roomId);
    return meetingId ? this.meetings.get(meetingId) : undefined;
  }

  listMeetings(options?: {
    status?: string; tenantId?: string; offset?: number; limit?: number;
  }): { total: number; meetings: MeetingRecord[] } {
    let meetings = [...this.meetings.values()];
    if (options?.status) meetings = meetings.filter(m => m.status === options.status);
    if (options?.tenantId) meetings = meetings.filter(m => m.tenantId === options.tenantId);
    meetings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return { total: meetings.length, meetings: meetings.slice(offset, offset + limit) };
  }

  getActiveSessions(): { roomId: string; meetingId: string; segmentCount: number; isActive: boolean }[] {
    return [...this.activeSessions.entries()].map(([roomId, s]) => ({
      roomId, meetingId: s.meetingId,
      segmentCount: s.segments.length, isActive: s.isActive,
    }));
  }

  getLiveTranscript(meetingId: string): TranscriptionSegment[] | null {
    for (const session of this.activeSessions.values()) {
      if (session.meetingId === meetingId) return session.segments;
    }
    return null;
  }

  getConfig(): MeetingIntelligenceConfig {
    return { ...this.config, intelligenceConfig: { ...this.config.intelligenceConfig, apiKey: '***' } };
  }

  updateConfig(updates: Partial<MeetingIntelligenceConfig>): void {
    Object.assign(this.config, updates);
    if (updates.enabledModules) {
      this.config.intelligenceConfig.enabledModules = updates.enabledModules;
    }
  }

  // ─── Capabilities ─────────────────────────────────────────────────

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'meeting-intel.records', label: 'Meeting Intelligence', description: 'AI-powered meeting summaries and action items', icon: 'Brain', routePath: '/meetings', requiredRoles: [] },
      { key: 'meeting-intel.live', label: 'Live Transcription', description: 'Real-time meeting transcription', icon: 'Mic', routePath: '/meetings/active', requiredRoles: [] },
      { key: 'meeting-intel.config', label: 'Intelligence Settings', description: 'Configure meeting intelligence', icon: 'Settings', routePath: '/meetings/config', requiredRoles: ['admin'] },
    ];
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const r = Router();

    // ── Meeting Records ────────────────────────────────────────────
    r.get('/meetings', (req: Request, res: Response) => {
      const result = this.listMeetings({
        status: req.query.status as string,
        tenantId: req.query.tenantId as string,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });
      res.json(result);
    });

    r.get('/meetings/active', (_req: Request, res: Response) => {
      res.json({ sessions: this.getActiveSessions() });
    });

    r.get('/meetings/config', (_req: Request, res: Response) => {
      res.json(this.getConfig());
    });

    r.put('/meetings/config', (req: Request, res: Response) => {
      this.updateConfig(req.body);
      res.json(this.getConfig());
    });

    r.get('/meetings/:id', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      res.json(meeting);
    });

    r.get('/meetings/:id/transcript', (req: Request, res: Response) => {
      const segments = this.getLiveTranscript(req.params.id);
      if (!segments) return res.status(404).json({ error: 'Transcript not found' });
      res.json({ meetingId: req.params.id, segments, total: segments.length });
    });

    r.get('/meetings/:id/live', (req: Request, res: Response) => {
      const segments = this.getLiveTranscript(req.params.id);
      if (!segments) return res.status(404).json({ error: 'No active session' });
      // Return only recent segments for live view
      const since = req.query.since ? parseInt(req.query.since as string) : 0;
      const recent = segments.filter(s => parseInt(s.id.replace("seg-","")) > since);
      res.json({ meetingId: req.params.id, segments: recent, nextSince: segments.length > 0 ? parseInt(segments[segments.length - 1].id.replace("seg-","")) : 0 });
    });

    r.get('/meetings/:id/summary', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting?.intelligence?.summary) return res.status(404).json({ error: 'Summary not available' });
      res.json(meeting.intelligence.summary);
    });

    r.get('/meetings/:id/action-items', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting?.intelligence?.actionItems) return res.status(404).json({ error: 'Action items not available' });
      res.json({ items: meeting.intelligence.actionItems });
    });

    r.get('/meetings/:id/chapters', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting?.intelligence?.chapters) return res.status(404).json({ error: 'Chapters not available' });
      res.json({ chapters: meeting.intelligence.chapters });
    });

    r.get('/meetings/:id/decisions', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting?.intelligence?.decisions) return res.status(404).json({ error: 'Decisions not available' });
      res.json({ decisions: meeting.intelligence.decisions });
    });

    r.get('/meetings/:id/sentiment', (req: Request, res: Response) => {
      const meeting = this.getMeeting(req.params.id);
      if (!meeting?.intelligence?.speakerSentiment) return res.status(404).json({ error: 'Sentiment not available' });
      res.json({ sentiment: meeting.intelligence.speakerSentiment });
    });

    r.post('/meetings/:id/regenerate', async (req: Request, res: Response) => {
      const result = await this.runIntelligencePipeline(req.params.id);
      if (!result) return res.status(400).json({ error: 'Failed to run intelligence — meeting or transcript not found' });
      res.json(result);
    });

    // ── Distribution ───────────────────────────────────────────────
    r.post('/meetings/:id/distribute', async (req: Request, res: Response) => {
      const ok = await this.distributeResults(req.params.id);
      if (!ok) return res.status(400).json({ error: 'Cannot distribute — intelligence not ready or no recipients' });
      res.json({ distributed: true });
    });

    r.post('/meetings/:id/follow-up-email', async (req: Request, res: Response) => {
      const email = await this.generateFollowUpEmail(req.params.id);
      if (!email) return res.status(404).json({ error: 'Meeting intelligence not available' });
      res.json({ email });
    });

    // ── Manual Session Control ─────────────────────────────────────
    r.post('/meetings/:roomId/start', (req: Request, res: Response) => {
      if (!this.startTranscriptionSession(req.params.roomId)) {
        return res.status(400).json({ error: 'Cannot start — session already active or room not found' });
      }
      res.json({ started: true });
    });

    r.post('/meetings/:roomId/stop', (req: Request, res: Response) => {
      if (!this.stopTranscriptionSession(req.params.roomId)) {
        return res.status(404).json({ error: 'No active session for this room' });
      }
      res.json({ stopped: true });
    });

    return r;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): {
    totalMeetings: number; activeSessions: number; completedWithIntelligence: number;
    config: { autoTranscribe: boolean; autoAnalyse: boolean; sttProvider: string };
  } {
    const completed = [...this.meetings.values()].filter(m => m.intelligence?.status === 'completed').length;
    return {
      totalMeetings: this.meetings.size,
      activeSessions: this.activeSessions.size,
      completedWithIntelligence: completed,
      config: {
        autoTranscribe: this.config.autoTranscribe,
        autoAnalyse: this.config.autoAnalyse,
        sttProvider: this.config.sttProvider,
      },
    };
  }
}

export default MeetingIntelligenceIntegration;
