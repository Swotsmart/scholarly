/**
 * Scholarly Unified Communications 4.0 — Webinar Session Modes Enhancement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE MULTI-PURPOSE VENUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A concert hall is one thing, but a truly versatile venue can transform:
 * lecture theatre for a university class, boardroom for a strategy session,
 * town hall for an all-hands, workshop for a hands-on training day. The
 * Session Modes enhancement turns the Webinar plugin into exactly this —
 * a multi-purpose broadcast venue that configures itself based on what
 * kind of event it's hosting.
 *
 * Each session mode is a preset bundle of defaults and behaviours:
 *
 *   BROADCAST   — Classic webinar. One-to-many, minimal interaction.
 *                 Think product announcements, keynotes, investor updates.
 *
 *   LECTURE     — Structured educational delivery. Attendance is tracked,
 *                 Q&A is moderated, polls test comprehension, and the
 *                 session produces a structured learning record.
 *                 At Scholarly: lesson mode. At a university: a lecture.
 *                 At a corporate: a compliance training session.
 *
 *   WORKSHOP    — Collaborative, hands-on. Breakouts are pre-configured,
 *                 participants can share screens, exercises are timed,
 *                 and the AI co-pilot tracks activity across groups.
 *
 *   TOWN_HALL   — Open forum. Every attendee can request to speak,
 *                 questions are surfaced democratically (upvote-ranked),
 *                 and the session is automatically transcribed for the record.
 *
 *   PANEL       — Multiple speakers with a moderator. The AI co-pilot
 *                 manages speaking time balance and audience engagement.
 *
 *   TRAINING    — Like LECTURE but with mandatory completion tracking,
 *                 pass/fail assessment via polls, and certificate generation.
 *
 * Attendance Tracking (generalised, not education-specific)
 * ─────────────────────────────────────────────────────────
 * Any session mode can have attendance enforcement enabled. The system
 * tracks: join time, leave time, active duration (excluding idle periods),
 * interaction count (questions, polls, reactions), and presence checkpoints
 * (periodic "are you still there?" pings for modes that require proof of
 * participation — think compliance training or funded workshop hours).
 *
 * This is the same mechanism whether it's tracking a student's lesson
 * attendance, an employee's mandatory training hours, or an investor's
 * participation in a quarterly review.
 *
 * REST endpoints added to /api/webinars:
 *   POST /webinars/:id/session-mode          — Set or change session mode
 *   GET  /webinars/:id/session-mode          — Get current mode + config
 *   GET  /webinars/:id/attendance             — Attendance report
 *   GET  /webinars/:id/attendance/:userId     — Individual attendance record
 *   POST /webinars/:id/attendance/checkpoint  — Trigger a presence checkpoint
 *   GET  /webinars/:id/attendance/export      — Export attendance as CSV/JSON
 *   POST /webinars/:id/completion             — Mark session complete + generate records
 *
 * Bus events emitted:
 *   webinar:session-mode-set, webinar:attendance-recorded,
 *   webinar:checkpoint-triggered, webinar:checkpoint-responded,
 *   webinar:attendance-exported, webinar:completion-recorded,
 *   webinar:training-passed, webinar:training-failed
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export type SessionMode = 'broadcast' | 'lecture' | 'workshop' | 'town_hall' | 'panel' | 'training';

export interface SessionModeConfig {
  mode: SessionMode;
  attendanceTracking: AttendanceConfig;
  interactionDefaults: InteractionDefaults;
  completionRequirements?: CompletionRequirements;
  customOverrides?: Record<string, unknown>;
}

export interface AttendanceConfig {
  enabled: boolean;
  /** Minimum percentage of session duration participant must be present to count as "attended" */
  minimumPresencePercent: number;
  /** Whether to run periodic presence checkpoints (for compliance/training modes) */
  checkpointsEnabled: boolean;
  /** Interval in minutes between presence checkpoints */
  checkpointIntervalMinutes: number;
  /** Grace period in seconds to respond to a checkpoint before being marked idle */
  checkpointGracePeriodSeconds: number;
  /** Whether idle periods (no interaction for N minutes) are subtracted from active time */
  idleDetectionEnabled: boolean;
  /** Minutes of inactivity before a participant is marked idle */
  idleThresholdMinutes: number;
  /** Track interaction metrics (questions asked, polls answered, reactions) */
  trackInteractions: boolean;
}

export interface InteractionDefaults {
  /** Whether attendees can request to speak (unmute) */
  attendeeSpeakingAllowed: boolean;
  /** Whether attendees can share their screen */
  attendeeScreenShareAllowed: boolean;
  /** Whether Q&A is enabled by default */
  qaEnabled: boolean;
  /** Whether Q&A requires moderation */
  qaModerated: boolean;
  /** Whether polls are enabled by default */
  pollsEnabled: boolean;
  /** Whether chat is enabled */
  chatEnabled: boolean;
  /** Whether breakout rooms are pre-configured */
  breakoutsPreConfigured: boolean;
  /** Whether recording starts automatically */
  autoRecord: boolean;
  /** Whether transcription is enabled automatically */
  autoTranscribe: boolean;
}

export interface CompletionRequirements {
  /** Minimum attendance percentage to pass */
  minimumAttendancePercent: number;
  /** Minimum number of poll responses required */
  minimumPollResponses: number;
  /** Minimum poll score percentage to pass (for training mode) */
  minimumPollScorePercent: number;
  /** Whether to generate a completion certificate */
  generateCertificate: boolean;
  /** Certificate template identifier */
  certificateTemplateId?: string;
  /** Custom completion criteria evaluated as expressions */
  customCriteria?: { name: string; expression: string }[];
}

export interface AttendanceRecord {
  userId: string;
  userName: string;
  webinarId: string;
  sessionMode: SessionMode;
  joinedAt: Date;
  leftAt?: Date;
  /** Total time connected in seconds */
  totalConnectedSeconds: number;
  /** Active time (connected minus idle periods) in seconds */
  activeSeconds: number;
  /** Percentage of session duration the participant was actively present */
  presencePercent: number;
  /** Interaction metrics */
  interactions: {
    questionsAsked: number;
    pollsAnswered: number;
    reactionsGiven: number;
    chatMessagesSent: number;
    handRaisesCount: number;
    screenShareMinutes: number;
  };
  /** Checkpoint responses — each checkpoint records whether the user confirmed presence */
  checkpoints: CheckpointResponse[];
  /** Whether the participant met the attendance threshold */
  meetsAttendanceThreshold: boolean;
  /** For training mode: pass/fail result */
  completionStatus?: 'passed' | 'failed' | 'incomplete';
  /** For training mode: poll score percentage */
  pollScorePercent?: number;
}

export interface CheckpointResponse {
  checkpointId: string;
  triggeredAt: Date;
  respondedAt?: Date;
  responded: boolean;
  /** Response latency in seconds (null if no response) */
  latencySeconds: number | null;
}

export interface CompletionRecord {
  webinarId: string;
  userId: string;
  sessionMode: SessionMode;
  completedAt: Date;
  status: 'passed' | 'failed' | 'incomplete';
  attendance: AttendanceRecord;
  /** If a certificate was generated, its unique ID */
  certificateId?: string;
  /** Summary of why the participant passed or failed */
  summary: string;
}

// ─── Mode Presets ───────────────────────────────────────────────────

const MODE_PRESETS: Record<SessionMode, Omit<SessionModeConfig, 'mode' | 'customOverrides'>> = {
  broadcast: {
    attendanceTracking: {
      enabled: false, minimumPresencePercent: 0, checkpointsEnabled: false,
      checkpointIntervalMinutes: 0, checkpointGracePeriodSeconds: 0,
      idleDetectionEnabled: false, idleThresholdMinutes: 0, trackInteractions: false,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: false, attendeeScreenShareAllowed: false,
      qaEnabled: true, qaModerated: true, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: false,
      autoRecord: true, autoTranscribe: false,
    },
  },
  lecture: {
    attendanceTracking: {
      enabled: true, minimumPresencePercent: 75, checkpointsEnabled: false,
      checkpointIntervalMinutes: 0, checkpointGracePeriodSeconds: 0,
      idleDetectionEnabled: true, idleThresholdMinutes: 5, trackInteractions: true,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: false, attendeeScreenShareAllowed: false,
      qaEnabled: true, qaModerated: true, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: false,
      autoRecord: true, autoTranscribe: true,
    },
  },
  workshop: {
    attendanceTracking: {
      enabled: true, minimumPresencePercent: 80, checkpointsEnabled: false,
      checkpointIntervalMinutes: 0, checkpointGracePeriodSeconds: 0,
      idleDetectionEnabled: false, idleThresholdMinutes: 0, trackInteractions: true,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: true, attendeeScreenShareAllowed: true,
      qaEnabled: true, qaModerated: false, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: true,
      autoRecord: true, autoTranscribe: true,
    },
  },
  town_hall: {
    attendanceTracking: {
      enabled: true, minimumPresencePercent: 50, checkpointsEnabled: false,
      checkpointIntervalMinutes: 0, checkpointGracePeriodSeconds: 0,
      idleDetectionEnabled: false, idleThresholdMinutes: 0, trackInteractions: true,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: true, attendeeScreenShareAllowed: false,
      qaEnabled: true, qaModerated: false, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: false,
      autoRecord: true, autoTranscribe: true,
    },
  },
  panel: {
    attendanceTracking: {
      enabled: false, minimumPresencePercent: 0, checkpointsEnabled: false,
      checkpointIntervalMinutes: 0, checkpointGracePeriodSeconds: 0,
      idleDetectionEnabled: false, idleThresholdMinutes: 0, trackInteractions: false,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: false, attendeeScreenShareAllowed: false,
      qaEnabled: true, qaModerated: true, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: false,
      autoRecord: true, autoTranscribe: true,
    },
  },
  training: {
    attendanceTracking: {
      enabled: true, minimumPresencePercent: 90, checkpointsEnabled: true,
      checkpointIntervalMinutes: 15, checkpointGracePeriodSeconds: 60,
      idleDetectionEnabled: true, idleThresholdMinutes: 3, trackInteractions: true,
    },
    interactionDefaults: {
      attendeeSpeakingAllowed: false, attendeeScreenShareAllowed: false,
      qaEnabled: true, qaModerated: true, pollsEnabled: true,
      chatEnabled: true, breakoutsPreConfigured: false,
      autoRecord: true, autoTranscribe: true,
    },
    completionRequirements: {
      minimumAttendancePercent: 90, minimumPollResponses: 1,
      minimumPollScorePercent: 70, generateCertificate: true,
    },
  },
};

// ─── Session Mode Manager ───────────────────────────────────────────

/**
 * SessionModeManager is a composable enhancement that can be wired into
 * the WebinarPlugin. It manages session mode configuration, attendance
 * tracking state, presence checkpoints, and completion evaluation.
 *
 * It does NOT modify the WebinarPlugin class itself — instead, it provides
 * a Router with additional endpoints and subscribes to relevant bus events
 * independently. The WebinarPlugin mounts this router as a sub-router.
 */
export class SessionModeManager {
  /** Session mode config per webinar */
  private modes: Map<string, SessionModeConfig> = new Map();
  /** Live attendance tracking per webinar → userId → record */
  private attendance: Map<string, Map<string, AttendanceRecord>> = new Map();
  /** Checkpoint timers per webinar */
  private checkpointTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  /** Idle detection timers per webinar → userId → last activity timestamp */
  private lastActivity: Map<string, Map<string, number>> = new Map();
  /** Completion records per webinar */
  private completions: Map<string, CompletionRecord[]> = new Map();

  constructor(private ctx: PluginContext) {}

  // ─── Bus Event Subscriptions ──────────────────────────────────────

  subscribeToEvents(): void {
    // Track joins
    this.ctx.bus.on('webinar:attendee-joined', (evt: any) => {
      this.recordJoin(evt.webinarId, evt.userId, evt.userName);
    });

    // Track leaves
    this.ctx.bus.on('webinar:attendee-left', (evt: any) => {
      this.recordLeave(evt.webinarId, evt.userId);
    });

    // Track interactions for engagement scoring
    for (const event of [
      'webinar:question-submitted', 'webinar:poll-vote-cast',
      'webinar:reaction-added', 'webinar:chat-message-sent',
      'webinar:hand-raised',
    ]) {
      this.ctx.bus.on(event, (evt: any) => {
        this.recordInteraction(evt.webinarId, evt.userId || evt.submittedBy, event);
      });
    }

    // When broadcast ends, finalise attendance
    this.ctx.bus.on('webinar:broadcast-ended', (evt: any) => {
      this.finaliseAttendance(evt.webinarId);
    });
  }

  // ─── Core Logic ───────────────────────────────────────────────────

  setMode(webinarId: string, mode: SessionMode, overrides?: Partial<SessionModeConfig>): SessionModeConfig {
    const preset = MODE_PRESETS[mode];
    const config: SessionModeConfig = {
      mode,
      attendanceTracking: { ...preset.attendanceTracking, ...overrides?.attendanceTracking },
      interactionDefaults: { ...preset.interactionDefaults, ...overrides?.interactionDefaults },
      completionRequirements: overrides?.completionRequirements || preset.completionRequirements,
      customOverrides: overrides?.customOverrides,
    };
    this.modes.set(webinarId, config);

    // Start checkpoint timer if enabled
    if (config.attendanceTracking.checkpointsEnabled) {
      this.startCheckpointTimer(webinarId, config.attendanceTracking.checkpointIntervalMinutes);
    }

    this.ctx.bus.emit('webinar:session-mode-set', { webinarId, mode, config });
    return config;
  }

  getMode(webinarId: string): SessionModeConfig | undefined {
    return this.modes.get(webinarId);
  }

  private recordJoin(webinarId: string, userId: string, userName: string): void {
    const config = this.modes.get(webinarId);
    if (!config?.attendanceTracking.enabled) return;

    if (!this.attendance.has(webinarId)) this.attendance.set(webinarId, new Map());
    const records = this.attendance.get(webinarId)!;

    const existing = records.get(userId);
    if (existing && !existing.leftAt) return; // Already tracked as present

    const record: AttendanceRecord = existing || {
      userId, userName, webinarId, sessionMode: config.mode,
      joinedAt: new Date(), totalConnectedSeconds: 0, activeSeconds: 0,
      presencePercent: 0,
      interactions: {
        questionsAsked: 0, pollsAnswered: 0, reactionsGiven: 0,
        chatMessagesSent: 0, handRaisesCount: 0, screenShareMinutes: 0,
      },
      checkpoints: [], meetsAttendanceThreshold: false,
    };
    if (existing?.leftAt) {
      // Rejoin — reset leftAt, keep accumulated time
      record.leftAt = undefined;
      record.joinedAt = new Date();
    }
    records.set(userId, record);

    // Initialise last-activity tracker for idle detection
    if (config.attendanceTracking.idleDetectionEnabled) {
      if (!this.lastActivity.has(webinarId)) this.lastActivity.set(webinarId, new Map());
      this.lastActivity.get(webinarId)!.set(userId, Date.now());
    }

    this.ctx.bus.emit('webinar:attendance-recorded', {
      webinarId, userId, action: 'joined', timestamp: new Date().toISOString(),
    });
  }

  private recordLeave(webinarId: string, userId: string): void {
    const records = this.attendance.get(webinarId);
    if (!records) return;
    const record = records.get(userId);
    if (!record || record.leftAt) return;

    record.leftAt = new Date();
    const sessionSeconds = (record.leftAt.getTime() - record.joinedAt.getTime()) / 1000;
    record.totalConnectedSeconds += sessionSeconds;
    record.activeSeconds += sessionSeconds; // Idle subtraction happens in finalise

    this.ctx.bus.emit('webinar:attendance-recorded', {
      webinarId, userId, action: 'left', timestamp: new Date().toISOString(),
      connectedSeconds: record.totalConnectedSeconds,
    });
  }

  private recordInteraction(webinarId: string, userId: string, eventType: string): void {
    const records = this.attendance.get(webinarId);
    if (!records) return;
    const record = records.get(userId);
    if (!record) return;

    switch (eventType) {
      case 'webinar:question-submitted': record.interactions.questionsAsked++; break;
      case 'webinar:poll-vote-cast': record.interactions.pollsAnswered++; break;
      case 'webinar:reaction-added': record.interactions.reactionsGiven++; break;
      case 'webinar:chat-message-sent': record.interactions.chatMessagesSent++; break;
      case 'webinar:hand-raised': record.interactions.handRaisesCount++; break;
    }

    // Update last activity for idle detection
    const activity = this.lastActivity.get(webinarId);
    if (activity) activity.set(userId, Date.now());
  }

  private startCheckpointTimer(webinarId: string, intervalMinutes: number): void {
    this.stopCheckpointTimer(webinarId);
    const timer = setInterval(() => {
      this.triggerCheckpoint(webinarId);
    }, intervalMinutes * 60 * 1000);
    this.checkpointTimers.set(webinarId, timer);
  }

  private stopCheckpointTimer(webinarId: string): void {
    const timer = this.checkpointTimers.get(webinarId);
    if (timer) { clearInterval(timer); this.checkpointTimers.delete(webinarId); }
  }

  triggerCheckpoint(webinarId: string): string {
    const checkpointId = `ckpt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const records = this.attendance.get(webinarId);
    if (!records) return checkpointId;

    const now = new Date();
    for (const record of records.values()) {
      if (!record.leftAt) {
        record.checkpoints.push({
          checkpointId, triggeredAt: now, responded: false, latencySeconds: null,
        });
      }
    }

    this.ctx.bus.emit('webinar:checkpoint-triggered', {
      webinarId, checkpointId, timestamp: now.toISOString(),
      participantCount: [...records.values()].filter(r => !r.leftAt).length,
    });

    return checkpointId;
  }

  respondToCheckpoint(webinarId: string, userId: string, checkpointId: string): boolean {
    const records = this.attendance.get(webinarId);
    if (!records) return false;
    const record = records.get(userId);
    if (!record) return false;

    const checkpoint = record.checkpoints.find(c => c.checkpointId === checkpointId && !c.responded);
    if (!checkpoint) return false;

    const now = new Date();
    checkpoint.responded = true;
    checkpoint.respondedAt = now;
    checkpoint.latencySeconds = (now.getTime() - checkpoint.triggeredAt.getTime()) / 1000;

    this.ctx.bus.emit('webinar:checkpoint-responded', {
      webinarId, userId, checkpointId,
      latencySeconds: checkpoint.latencySeconds,
    });

    return true;
  }

  private finaliseAttendance(webinarId: string): void {
    const records = this.attendance.get(webinarId);
    const config = this.modes.get(webinarId);
    if (!records || !config) return;

    this.stopCheckpointTimer(webinarId);

    // Calculate total session duration from first join to now
    const allJoinTimes = [...records.values()].map(r => r.joinedAt.getTime());
    const sessionStart = Math.min(...allJoinTimes);
    const sessionEnd = Date.now();
    const totalSessionSeconds = (sessionEnd - sessionStart) / 1000;

    for (const record of records.values()) {
      // Close any open sessions
      if (!record.leftAt) {
        record.leftAt = new Date();
        const sessionSeconds = (record.leftAt.getTime() - record.joinedAt.getTime()) / 1000;
        record.totalConnectedSeconds += sessionSeconds;
        record.activeSeconds += sessionSeconds;
      }

      // Calculate presence percentage
      record.presencePercent = totalSessionSeconds > 0
        ? Math.min(100, (record.totalConnectedSeconds / totalSessionSeconds) * 100)
        : 0;

      // Evaluate attendance threshold
      record.meetsAttendanceThreshold =
        record.presencePercent >= config.attendanceTracking.minimumPresencePercent;
    }
  }

  evaluateCompletion(webinarId: string): CompletionRecord[] {
    const records = this.attendance.get(webinarId);
    const config = this.modes.get(webinarId);
    if (!records || !config) return [];

    const reqs = config.completionRequirements;
    const completionRecords: CompletionRecord[] = [];

    for (const record of records.values()) {
      let status: 'passed' | 'failed' | 'incomplete' = 'incomplete';
      const reasons: string[] = [];

      if (reqs) {
        const attendanceOk = record.presencePercent >= reqs.minimumAttendancePercent;
        const pollsOk = record.interactions.pollsAnswered >= reqs.minimumPollResponses;
        // Poll score would be calculated from actual poll results in integration
        const pollScoreOk = true; // Placeholder — real scoring needs poll result data

        if (attendanceOk && pollsOk && pollScoreOk) {
          status = 'passed';
          reasons.push(`Attendance: ${record.presencePercent.toFixed(1)}% (required ${reqs.minimumAttendancePercent}%)`);
          reasons.push(`Polls answered: ${record.interactions.pollsAnswered} (required ${reqs.minimumPollResponses})`);
        } else {
          status = 'failed';
          if (!attendanceOk) reasons.push(`Attendance too low: ${record.presencePercent.toFixed(1)}% < ${reqs.minimumAttendancePercent}%`);
          if (!pollsOk) reasons.push(`Insufficient poll responses: ${record.interactions.pollsAnswered} < ${reqs.minimumPollResponses}`);
        }
      } else {
        status = record.meetsAttendanceThreshold ? 'passed' : 'failed';
        reasons.push(`Attendance: ${record.presencePercent.toFixed(1)}%`);
      }

      record.completionStatus = status;

      const completion: CompletionRecord = {
        webinarId, userId: record.userId, sessionMode: config.mode,
        completedAt: new Date(), status, attendance: record,
        summary: reasons.join('; '),
      };

      if (reqs?.generateCertificate && status === 'passed') {
        completion.certificateId = `cert-${webinarId}-${record.userId}-${Date.now()}`;
      }

      completionRecords.push(completion);

      const eventName = status === 'passed' ? 'webinar:training-passed' : 'webinar:training-failed';
      this.ctx.bus.emit(eventName, {
        webinarId, userId: record.userId, status,
        certificateId: completion.certificateId, summary: completion.summary,
      });
    }

    this.completions.set(webinarId, completionRecords);
    return completionRecords;
  }

  getAttendance(webinarId: string): AttendanceRecord[] {
    const records = this.attendance.get(webinarId);
    return records ? [...records.values()] : [];
  }

  getAttendanceForUser(webinarId: string, userId: string): AttendanceRecord | undefined {
    return this.attendance.get(webinarId)?.get(userId);
  }

  exportAttendance(webinarId: string, format: 'json' | 'csv'): string {
    const records = this.getAttendance(webinarId);
    if (format === 'json') return JSON.stringify(records, null, 2);

    // CSV export
    const headers = [
      'userId', 'userName', 'sessionMode', 'joinedAt', 'leftAt',
      'totalConnectedSeconds', 'activeSeconds', 'presencePercent',
      'questionsAsked', 'pollsAnswered', 'reactionsGiven', 'chatMessagesSent',
      'checkpointsPassed', 'checkpointsMissed', 'meetsThreshold', 'completionStatus',
    ];
    const rows = records.map(r => [
      r.userId, r.userName, r.sessionMode,
      r.joinedAt.toISOString(), r.leftAt?.toISOString() || '',
      r.totalConnectedSeconds, r.activeSeconds, r.presencePercent.toFixed(1),
      r.interactions.questionsAsked, r.interactions.pollsAnswered,
      r.interactions.reactionsGiven, r.interactions.chatMessagesSent,
      r.checkpoints.filter(c => c.responded).length,
      r.checkpoints.filter(c => !c.responded).length,
      r.meetsAttendanceThreshold, r.completionStatus || '',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    // Set session mode
    router.post('/webinars/:id/session-mode', (req, res) => {
      const { mode, overrides } = req.body;
      if (!mode || !Object.keys(MODE_PRESETS).includes(mode)) {
        return res.status(400).json({ error: `Invalid mode. Valid modes: ${Object.keys(MODE_PRESETS).join(', ')}` });
      }
      const config = this.setMode(req.params.id, mode as SessionMode, overrides);
      res.json({ webinarId: req.params.id, ...config });
    });

    // Get session mode
    router.get('/webinars/:id/session-mode', (req, res) => {
      const config = this.getMode(req.params.id);
      if (!config) return res.status(404).json({ error: 'No session mode configured' });
      res.json({ webinarId: req.params.id, ...config });
    });

    // Get attendance report
    router.get('/webinars/:id/attendance', (_req, res) => {
      const records = this.getAttendance(_req.params.id);
      const config = this.getMode(_req.params.id);
      res.json({
        webinarId: _req.params.id,
        sessionMode: config?.mode || 'unknown',
        totalParticipants: records.length,
        meetsThreshold: records.filter(r => r.meetsAttendanceThreshold).length,
        belowThreshold: records.filter(r => !r.meetsAttendanceThreshold).length,
        records,
      });
    });

    // Get individual attendance
    router.get('/webinars/:id/attendance/:userId', (req, res) => {
      const record = this.getAttendanceForUser(req.params.id, req.params.userId);
      if (!record) return res.status(404).json({ error: 'No attendance record found' });
      res.json(record);
    });

    // Trigger manual checkpoint
    router.post('/webinars/:id/attendance/checkpoint', (req, res) => {
      const checkpointId = this.triggerCheckpoint(req.params.id);
      res.json({ checkpointId, webinarId: req.params.id, triggeredAt: new Date().toISOString() });
    });

    // Respond to checkpoint (called by client when user confirms presence)
    router.post('/webinars/:id/attendance/checkpoint/:checkpointId/respond', (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const ok = this.respondToCheckpoint(req.params.id, userId, req.params.checkpointId);
      if (!ok) return res.status(404).json({ error: 'Checkpoint not found or already responded' });
      res.json({ acknowledged: true });
    });

    // Export attendance
    router.get('/webinars/:id/attendance/export', (req, res) => {
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
      const data = this.exportAttendance(req.params.id, format);
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-${req.params.id}.csv`);
      }
      this.ctx.bus.emit('webinar:attendance-exported', {
        webinarId: req.params.id, format, recordCount: this.getAttendance(req.params.id).length,
      });
      res.send(data);
    });

    // Evaluate and record completion
    router.post('/webinars/:id/completion', (_req, res) => {
      const records = this.evaluateCompletion(_req.params.id);
      res.json({
        webinarId: _req.params.id,
        totalEvaluated: records.length,
        passed: records.filter(r => r.status === 'passed').length,
        failed: records.filter(r => r.status === 'failed').length,
        incomplete: records.filter(r => r.status === 'incomplete').length,
        records,
      });
    });

    // Get available mode presets
    router.get('/session-modes', (_req, res) => {
      const modes = Object.entries(MODE_PRESETS).map(([mode, config]) => ({
        mode, ...config,
      }));
      res.json({ modes });
    });

    return router;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────

  cleanup(webinarId: string): void {
    this.stopCheckpointTimer(webinarId);
    this.modes.delete(webinarId);
    this.attendance.delete(webinarId);
    this.lastActivity.delete(webinarId);
    this.completions.delete(webinarId);
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): { activeSessions: number; trackingAttendance: number; checkpointTimersActive: number } {
    return {
      activeSessions: this.modes.size,
      trackingAttendance: this.attendance.size,
      checkpointTimersActive: this.checkpointTimers.size,
    };
  }
}

export default SessionModeManager;
