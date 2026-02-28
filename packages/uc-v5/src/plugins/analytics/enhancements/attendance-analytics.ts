/**
 * Scholarly Unified Communications 4.0 — Attendance & Participation Analytics
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE ATTENDANCE REGISTER THAT WRITES ITSELF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The base Analytics plugin tracks platform-wide metrics: room counts,
 * message volumes, call durations. But it doesn't answer the question
 * that every manager, teacher, and compliance officer cares about most:
 * "Who was there, for how long, and did they participate?"
 *
 * This enhancement adds a dedicated attendance and participation analytics
 * engine that:
 *
 *   - Listens to join/leave events across all session types (video rooms,
 *     webinars, scheduled meetings) and builds per-user attendance records
 *   - Computes engagement scores based on interaction signals (messages,
 *     reactions, screen shares, poll responses, questions asked)
 *   - Tracks trends over time: attendance rates, engagement trajectories,
 *     participation patterns by day/time/session type
 *   - Generates reports with configurable grouping (by user, by session,
 *     by team, by time period)
 *
 * The attendance register analogy is deliberate: in a school, attendance
 * is marked by the teacher at the start of each period. Here, the event
 * bus marks attendance automatically — every join is a "present", every
 * leave is a "departed", and the duration between them is the attendance
 * window. The engagement score is the modern equivalent of "actively
 * participating" vs "physically present but mentally elsewhere".
 *
 * REST endpoints added to /api/analytics:
 *   GET  /attendance/sessions              — List sessions with attendance
 *   GET  /attendance/sessions/:id          — Attendance for a specific session
 *   GET  /attendance/users/:userId         — Attendance history for a user
 *   GET  /attendance/summary               — Aggregate attendance summary
 *   GET  /attendance/trends                — Attendance trends over time
 *   GET  /engagement/users/:userId         — Engagement scores for a user
 *   GET  /engagement/leaderboard           — Top participants by engagement
 *   GET  /engagement/trends                — Engagement trends over time
 *   POST /reports/attendance               — Generate attendance report
 *   GET  /reports/:id                      — Get generated report
 *
 * Bus events emitted:
 *   analytics:attendance-recorded, analytics:engagement-scored,
 *   analytics:attendance-report-generated, analytics:low-attendance-alert,
 *   analytics:engagement-milestone
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface SessionAttendance {
  sessionId: string;
  sessionType: 'video-room' | 'webinar' | 'scheduled-meeting' | 'training' | 'custom';
  sessionTitle?: string;
  startedAt: Date;
  endedAt?: Date;
  /** Total session duration in minutes */
  durationMinutes: number;
  participants: ParticipantAttendance[];
  /** Attendance rate: participants who attended / expected participants */
  attendanceRate?: number;
  expectedParticipantCount?: number;
}

export interface ParticipantAttendance {
  userId: string;
  userName: string;
  joinedAt: Date;
  leftAt?: Date;
  /** Total time present in minutes */
  presentMinutes: number;
  /** Percentage of session duration the user was present */
  presencePercent: number;
  /** Engagement metrics during this session */
  engagement: EngagementMetrics;
  /** Computed engagement score (0-100) */
  engagementScore: number;
  /** Whether the user was present for the required minimum */
  meetsMinimumPresence: boolean;
}

export interface EngagementMetrics {
  messagesSent: number;
  reactionsGiven: number;
  questionsAsked: number;
  pollsAnswered: number;
  handRaises: number;
  screenShareMinutes: number;
  /** Number of times the user spoke (for audio-enabled sessions) */
  speakingTurns: number;
}

export interface AttendanceSummary {
  period: { from: string; to: string };
  totalSessions: number;
  totalUniqueParticipants: number;
  averageAttendanceRate: number;
  averageSessionDuration: number;
  averageEngagementScore: number;
  sessionsByType: Record<string, number>;
  /** Top attendees by session count */
  topAttendees: { userId: string; userName: string; sessionCount: number; avgEngagement: number }[];
  /** Users with attendance below threshold */
  lowAttendance: { userId: string; userName: string; sessionCount: number; missedCount: number }[];
}

export interface AttendanceTrend {
  date: string;
  sessionsHeld: number;
  averageAttendanceRate: number;
  averageEngagementScore: number;
  uniqueParticipants: number;
}

export interface AttendanceReport {
  id: string;
  title: string;
  generatedAt: Date;
  parameters: {
    dateFrom: string;
    dateTo: string;
    groupBy: 'user' | 'session' | 'day' | 'week';
    sessionTypes?: string[];
    userIds?: string[];
  };
  summary: AttendanceSummary;
  trends: AttendanceTrend[];
  status: 'generating' | 'completed' | 'failed';
}

// ─── Engagement Score Weights ───────────────────────────────────────

const ENGAGEMENT_WEIGHTS = {
  messagesSent: 2,
  reactionsGiven: 1,
  questionsAsked: 5,
  pollsAnswered: 3,
  handRaises: 2,
  screenShareMinutes: 4,
  speakingTurns: 3,
  presencePercent: 0.5, // Base weight for just being there
};

function computeEngagementScore(metrics: EngagementMetrics, presencePercent: number): number {
  const raw =
    metrics.messagesSent * ENGAGEMENT_WEIGHTS.messagesSent +
    metrics.reactionsGiven * ENGAGEMENT_WEIGHTS.reactionsGiven +
    metrics.questionsAsked * ENGAGEMENT_WEIGHTS.questionsAsked +
    metrics.pollsAnswered * ENGAGEMENT_WEIGHTS.pollsAnswered +
    metrics.handRaises * ENGAGEMENT_WEIGHTS.handRaises +
    Math.min(metrics.screenShareMinutes, 30) * ENGAGEMENT_WEIGHTS.screenShareMinutes +
    metrics.speakingTurns * ENGAGEMENT_WEIGHTS.speakingTurns +
    presencePercent * ENGAGEMENT_WEIGHTS.presencePercent;

  // Normalise to 0-100 scale (cap at 100)
  return Math.min(100, Math.round(raw));
}

// ─── Attendance Analytics Manager ───────────────────────────────────

export class AttendanceAnalyticsManager {
  private sessions: Map<string, SessionAttendance> = new Map();
  /** Per-user interaction counters for active sessions: sessionId:userId → metrics */
  private activeInteractions: Map<string, EngagementMetrics> = new Map();
  private reports: Map<string, AttendanceReport> = new Map();
  /** Low attendance threshold (percent) — configurable */
  private minimumPresencePercent: number;
  private lowAttendanceAlertThreshold: number;

  constructor(private ctx: PluginContext, options?: { minimumPresencePercent?: number; lowAttendanceAlertThreshold?: number }) {
    this.minimumPresencePercent = options?.minimumPresencePercent ?? 75;
    this.lowAttendanceAlertThreshold = options?.lowAttendanceAlertThreshold ?? 50;
  }

  // ─── Event Subscriptions ──────────────────────────────────────────

  subscribeToEvents(): void {
    // Room lifecycle
    this.ctx.bus.on('room:created', (evt: any) => {
      this.startSession(evt.roomId, 'video-room', evt.title);
    });
    this.ctx.bus.on('room:closed', (evt: any) => {
      this.endSession(evt.roomId);
    });

    // Participant joins/leaves (works for rooms, webinars, meetings)
    this.ctx.bus.on('room:participant-joined', (evt: any) => {
      this.recordJoin(evt.roomId, evt.userId, evt.userName);
    });
    this.ctx.bus.on('room:participant-left', (evt: any) => {
      this.recordLeave(evt.roomId, evt.userId);
    });

    // Webinar-specific events
    this.ctx.bus.on('webinar:broadcast-started', (evt: any) => {
      this.startSession(evt.webinarId, 'webinar', evt.title);
    });
    this.ctx.bus.on('webinar:broadcast-ended', (evt: any) => {
      this.endSession(evt.webinarId);
    });
    this.ctx.bus.on('webinar:attendee-joined', (evt: any) => {
      this.recordJoin(evt.webinarId, evt.userId, evt.userName);
    });
    this.ctx.bus.on('webinar:attendee-left', (evt: any) => {
      this.recordLeave(evt.webinarId, evt.userId);
    });

    // Meeting events
    this.ctx.bus.on('meeting:started', (evt: any) => {
      this.startSession(evt.meetingId, 'scheduled-meeting', evt.title);
    });
    this.ctx.bus.on('meeting:ended', (evt: any) => {
      this.endSession(evt.meetingId);
    });

    // Interaction events for engagement scoring
    const interactionMap: Record<string, keyof EngagementMetrics> = {
      'chat:message-sent': 'messagesSent',
      'webinar:chat-message-sent': 'messagesSent',
      'webinar:reaction-added': 'reactionsGiven',
      'webinar:question-submitted': 'questionsAsked',
      'webinar:poll-vote-cast': 'pollsAnswered',
      'webinar:hand-raised': 'handRaises',
    };

    for (const [event, metric] of Object.entries(interactionMap)) {
      this.ctx.bus.on(event, (evt: any) => {
        const sessionId = evt.roomId || evt.webinarId || evt.meetingId;
        const userId = evt.userId || evt.submittedBy;
        if (sessionId && userId) {
          this.recordInteraction(sessionId, userId, metric);
        }
      });
    }
  }

  // ─── Core Tracking ────────────────────────────────────────────────

  private startSession(sessionId: string, type: SessionAttendance['sessionType'], title?: string): void {
    if (this.sessions.has(sessionId)) return;
    this.sessions.set(sessionId, {
      sessionId, sessionType: type, sessionTitle: title,
      startedAt: new Date(), durationMinutes: 0, participants: [],
    });
  }

  private endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endedAt = new Date();
    session.durationMinutes = (session.endedAt.getTime() - session.startedAt.getTime()) / 60000;

    // Finalise all participants who haven't left
    for (const participant of session.participants) {
      if (!participant.leftAt) {
        participant.leftAt = session.endedAt;
        participant.presentMinutes = (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 60000;
      }
      if (session.durationMinutes > 0) {
        participant.presencePercent = Math.min(100, (participant.presentMinutes / session.durationMinutes) * 100);
      }
      // Merge interaction data
      const key = `${sessionId}:${participant.userId}`;
      const interactions = this.activeInteractions.get(key);
      if (interactions) {
        participant.engagement = { ...interactions };
        this.activeInteractions.delete(key);
      }
      participant.engagementScore = computeEngagementScore(participant.engagement, participant.presencePercent);
      participant.meetsMinimumPresence = participant.presencePercent >= this.minimumPresencePercent;
    }

    // Compute attendance rate
    if (session.expectedParticipantCount && session.expectedParticipantCount > 0) {
      session.attendanceRate = session.participants.length / session.expectedParticipantCount;
    }

    // Check for low attendance alert
    if (session.attendanceRate !== undefined && session.attendanceRate * 100 < this.lowAttendanceAlertThreshold) {
      this.ctx.bus.emit('analytics:low-attendance-alert', {
        sessionId, sessionType: session.sessionType,
        attendanceRate: session.attendanceRate,
        participantCount: session.participants.length,
        expected: session.expectedParticipantCount,
      });
    }

    this.ctx.bus.emit('analytics:attendance-recorded', {
      sessionId, sessionType: session.sessionType,
      participantCount: session.participants.length,
      durationMinutes: session.durationMinutes,
    });
  }

  private recordJoin(sessionId: string, userId: string, userName: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check if already tracking this participant (rejoin)
    const existing = session.participants.find(p => p.userId === userId);
    if (existing && !existing.leftAt) return;

    const participant: ParticipantAttendance = {
      userId, userName, joinedAt: new Date(), presentMinutes: 0, presencePercent: 0,
      engagement: {
        messagesSent: 0, reactionsGiven: 0, questionsAsked: 0,
        pollsAnswered: 0, handRaises: 0, screenShareMinutes: 0, speakingTurns: 0,
      },
      engagementScore: 0, meetsMinimumPresence: false,
    };

    session.participants.push(participant);

    // Initialise interaction tracker
    const key = `${sessionId}:${userId}`;
    if (!this.activeInteractions.has(key)) {
      this.activeInteractions.set(key, { ...participant.engagement });
    }
  }

  private recordLeave(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId && !p.leftAt);
    if (!participant) return;

    participant.leftAt = new Date();
    participant.presentMinutes = (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 60000;

    if (session.durationMinutes > 0) {
      participant.presencePercent = Math.min(100, (participant.presentMinutes / session.durationMinutes) * 100);
    }
  }

  private recordInteraction(sessionId: string, userId: string, metric: keyof EngagementMetrics): void {
    const key = `${sessionId}:${userId}`;
    const metrics = this.activeInteractions.get(key);
    if (!metrics) return;
    (metrics[metric] as number)++;
  }

  // ─── Query Methods ────────────────────────────────────────────────

  getSessionAttendance(sessionId: string): SessionAttendance | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(options?: {
    sessionType?: string; dateFrom?: string; dateTo?: string;
    offset?: number; limit?: number;
  }): { total: number; sessions: SessionAttendance[] } {
    let sessions = [...this.sessions.values()];

    if (options?.sessionType) {
      sessions = sessions.filter(s => s.sessionType === options.sessionType);
    }
    if (options?.dateFrom) {
      const from = new Date(options.dateFrom);
      sessions = sessions.filter(s => s.startedAt >= from);
    }
    if (options?.dateTo) {
      const to = new Date(options.dateTo);
      sessions = sessions.filter(s => s.startedAt <= to);
    }

    sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return { total: sessions.length, sessions: sessions.slice(offset, offset + limit) };
  }

  getUserAttendance(userId: string): {
    totalSessions: number;
    averagePresencePercent: number;
    averageEngagementScore: number;
    sessions: { sessionId: string; sessionType: string; title?: string; date: string; presencePercent: number; engagementScore: number }[];
  } {
    const userSessions: any[] = [];
    let totalPresence = 0;
    let totalEngagement = 0;

    for (const session of this.sessions.values()) {
      for (const p of session.participants) {
        if (p.userId === userId) {
          userSessions.push({
            sessionId: session.sessionId,
            sessionType: session.sessionType,
            title: session.sessionTitle,
            date: session.startedAt.toISOString().split('T')[0],
            presencePercent: Math.round(p.presencePercent * 10) / 10,
            engagementScore: p.engagementScore,
          });
          totalPresence += p.presencePercent;
          totalEngagement += p.engagementScore;
        }
      }
    }

    return {
      totalSessions: userSessions.length,
      averagePresencePercent: userSessions.length > 0 ? Math.round((totalPresence / userSessions.length) * 10) / 10 : 0,
      averageEngagementScore: userSessions.length > 0 ? Math.round(totalEngagement / userSessions.length) : 0,
      sessions: userSessions.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  getEngagementLeaderboard(limit: number = 10): { userId: string; userName: string; sessionCount: number; avgEngagement: number }[] {
    const userScores: Map<string, { userName: string; scores: number[]; count: number }> = new Map();

    for (const session of this.sessions.values()) {
      for (const p of session.participants) {
        if (!userScores.has(p.userId)) {
          userScores.set(p.userId, { userName: p.userName, scores: [], count: 0 });
        }
        const entry = userScores.get(p.userId)!;
        entry.scores.push(p.engagementScore);
        entry.count++;
      }
    }

    return [...userScores.entries()]
      .map(([userId, data]) => ({
        userId, userName: data.userName,
        sessionCount: data.count,
        avgEngagement: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, limit);
  }

  getAttendanceTrends(dateFrom: string, dateTo: string): AttendanceTrend[] {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const dayMap: Map<string, { sessions: number; totalAttendance: number; totalEngagement: number; participants: Set<string>; count: number }> = new Map();

    for (const session of this.sessions.values()) {
      if (session.startedAt < from || session.startedAt > to) continue;
      const dateKey = session.startedAt.toISOString().split('T')[0];

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { sessions: 0, totalAttendance: 0, totalEngagement: 0, participants: new Set(), count: 0 });
      }
      const day = dayMap.get(dateKey)!;
      day.sessions++;

      for (const p of session.participants) {
        day.totalAttendance += p.presencePercent;
        day.totalEngagement += p.engagementScore;
        day.participants.add(p.userId);
        day.count++;
      }
    }

    return [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        sessionsHeld: data.sessions,
        averageAttendanceRate: data.count > 0 ? Math.round((data.totalAttendance / data.count) * 10) / 10 : 0,
        averageEngagementScore: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
        uniqueParticipants: data.participants.size,
      }));
  }

  generateReport(params: AttendanceReport['parameters']): AttendanceReport {
    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trends = this.getAttendanceTrends(params.dateFrom, params.dateTo);

    // Build summary
    const { sessions } = this.listSessions({ dateFrom: params.dateFrom, dateTo: params.dateTo, limit: 10000 });
    const allParticipants = new Set<string>();
    let totalEngagement = 0;
    let totalPresence = 0;
    let participantCount = 0;
    const sessionsByType: Record<string, number> = {};

    for (const session of sessions) {
      sessionsByType[session.sessionType] = (sessionsByType[session.sessionType] || 0) + 1;
      for (const p of session.participants) {
        allParticipants.add(p.userId);
        totalEngagement += p.engagementScore;
        totalPresence += p.presencePercent;
        participantCount++;
      }
    }

    const report: AttendanceReport = {
      id,
      title: `Attendance Report: ${params.dateFrom} to ${params.dateTo}`,
      generatedAt: new Date(),
      parameters: params,
      summary: {
        period: { from: params.dateFrom, to: params.dateTo },
        totalSessions: sessions.length,
        totalUniqueParticipants: allParticipants.size,
        averageAttendanceRate: participantCount > 0 ? Math.round((totalPresence / participantCount) * 10) / 10 : 0,
        averageSessionDuration: sessions.length > 0 ? Math.round(sessions.reduce((s, ses) => s + ses.durationMinutes, 0) / sessions.length) : 0,
        averageEngagementScore: participantCount > 0 ? Math.round(totalEngagement / participantCount) : 0,
        sessionsByType,
        topAttendees: this.getEngagementLeaderboard(5),
        lowAttendance: [],
      },
      trends,
      status: 'completed',
    };

    this.reports.set(id, report);

    this.ctx.bus.emit('analytics:attendance-report-generated', {
      reportId: id, sessionCount: sessions.length, participantCount: allParticipants.size,
    });

    return report;
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    router.get('/attendance/sessions', (req, res) => {
      const result = this.listSessions({
        sessionType: req.query.type as string,
        dateFrom: req.query.from as string,
        dateTo: req.query.to as string,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });
      res.json(result);
    });

    router.get('/attendance/sessions/:id', (req, res) => {
      const session = this.getSessionAttendance(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(session);
    });

    router.get('/attendance/users/:userId', (req, res) => {
      res.json(this.getUserAttendance(req.params.userId));
    });

    router.get('/attendance/summary', (req, res) => {
      const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
      const report = this.generateReport({ dateFrom: from, dateTo: to, groupBy: 'day' });
      res.json(report.summary);
    });

    router.get('/attendance/trends', (req, res) => {
      const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
      res.json({ trends: this.getAttendanceTrends(from, to) });
    });

    router.get('/engagement/users/:userId', (req, res) => {
      const data = this.getUserAttendance(req.params.userId);
      res.json({
        userId: req.params.userId,
        averageEngagement: data.averageEngagementScore,
        sessionCount: data.totalSessions,
        sessions: data.sessions.map(s => ({ ...s, engagement: s.engagementScore })),
      });
    });

    router.get('/engagement/leaderboard', (req, res) => {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      res.json({ leaderboard: this.getEngagementLeaderboard(limit) });
    });

    router.get('/engagement/trends', (req, res) => {
      const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
      const trends = this.getAttendanceTrends(from, to);
      res.json({ trends: trends.map(t => ({ date: t.date, avgEngagement: t.averageEngagementScore, uniqueParticipants: t.uniqueParticipants })) });
    });

    router.post('/reports/attendance', (req, res) => {
      const { dateFrom, dateTo, groupBy, sessionTypes, userIds } = req.body;
      if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' });
      const report = this.generateReport({ dateFrom, dateTo, groupBy: groupBy || 'day', sessionTypes, userIds });
      res.status(201).json(report);
    });

    router.get('/reports/:id', (req, res) => {
      const report = this.reports.get(req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json(report);
    });

    return router;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): { trackedSessions: number; activeInteractions: number; reportsGenerated: number } {
    return {
      trackedSessions: this.sessions.size,
      activeInteractions: this.activeInteractions.size,
      reportsGenerated: this.reports.size,
    };
  }
}

export default AttendanceAnalyticsManager;
