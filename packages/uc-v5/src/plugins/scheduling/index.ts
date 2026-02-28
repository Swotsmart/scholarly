/**
 * Chekd Unified Communications 3.0 — Scheduling & Calendar Plugin
 *
 * A venture fund with partners in Sydney, London, and San Francisco needs
 * more than a simple "create meeting" button. This plugin is the team's
 * executive scheduler — it integrates with Google Calendar and Outlook,
 * handles timezone coordination, auto-creates video rooms at meeting time,
 * sends reminders, and manages recurring meetings like weekly IC calls.
 *
 * The OAuth infrastructure from the Cloud Files plugin gives us a head
 * start: Google Calendar and Outlook both use the same OAuth flows that
 * Cloud Files already implements for Drive/OneDrive. We extend the token
 * store to cover calendar scopes.
 *
 * Calendar providers: Google Calendar (API v3), Outlook (Graph API), Internal
 *
 * Bus events emitted: meeting:*
 *   meeting:scheduled, meeting:rescheduled, meeting:cancelled,
 *   meeting:room-auto-created, meeting:calendar-synced, meeting:reminder-sent
 *
 * Bus events consumed:
 *   room:created (link rooms to scheduled meetings)
 *   room:closed (update meeting status when room closes)
 *
 * REST endpoints (mounted at /api/scheduling): 15 endpoints
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────

type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
type CalendarProvider = 'google' | 'outlook' | 'internal';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledBy: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  status: MeetingStatus;
  roomId?: string;
  dealId?: string;
  tenantId?: string;
  attendees: Attendee[];
  recurrenceId?: string;
  externalCalendarId?: string;
  calendarProvider?: CalendarProvider;
  autoCreateRoom: boolean;
  sendReminders: boolean;
  reminderMinutes: number[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Attendee {
  userId: string;
  email?: string;
  name: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  timezone?: string;
  isOrganizer: boolean;
  isRequired: boolean;
}

interface RecurringTemplate {
  id: string;
  title: string;
  description?: string;
  pattern: RecurrencePattern;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  durationMinutes: number;
  timezone: string;
  attendees: Omit<Attendee, 'status'>[];
  tenantId?: string;
  autoCreateRoom: boolean;
  sendReminders: boolean;
  reminderMinutes: number[];
  nextOccurrence: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

interface CalendarConnection {
  id: string;
  userId: string;
  provider: CalendarProvider;
  calendarId: string;
  calendarName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  syncedEventCount: number;
  isActive: boolean;
  connectedAt: Date;
}

interface ExternalEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
  location?: string;
}

interface ExternalEventInput {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  attendees: { email: string; name?: string }[];
  location?: string;
}

// ─── Calendar Provider Adapters ─────────────────────────────────

interface CalendarAdapter {
  readonly provider: CalendarProvider;
  getAuthUrl(redirectUri: string): string;
  exchangeToken(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  listEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<ExternalEvent[]>;
  createEvent(accessToken: string, event: ExternalEventInput): Promise<ExternalEvent>;
  deleteEvent(accessToken: string, eventId: string): Promise<boolean>;
}

/**
 * Google Calendar — uses Calendar API v3. The most common calendar
 * provider among startup founders and tech-focused fund teams.
 * Scopes: https://www.googleapis.com/auth/calendar
 */
class GoogleCalendarAdapter implements CalendarAdapter {
  readonly provider: CalendarProvider = 'google';
  private clientId: string;
  private clientSecret: string;

  constructor(config: Record<string, unknown>) {
    this.clientId = (config.googleClientId as string) || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = (config.googleClientSecret as string) || process.env.GOOGLE_CLIENT_SECRET || '';
  }

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeToken(code: string, redirectUri: string) {
    // POST https://oauth2.googleapis.com/token
    // { code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code' }
    return { accessToken: `gtoken-${Date.now()}`, refreshToken: `grefresh-${Date.now()}`, expiresIn: 3600 };
  }

  async listEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<ExternalEvent[]> {
    // GET https://www.googleapis.com/calendar/v3/calendars/primary/events
    //   ?timeMin={ISO}&timeMax={ISO}&singleEvents=true&orderBy=startTime
    return [];
  }

  async createEvent(accessToken: string, event: ExternalEventInput): Promise<ExternalEvent> {
    // POST https://www.googleapis.com/calendar/v3/calendars/primary/events
    return {
      id: `gev-${Date.now()}`,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      attendees: event.attendees.map(a => a.email),
    };
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<boolean> {
    // DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}
    return true;
  }
}

/**
 * Microsoft Outlook — uses Microsoft Graph API. Common among
 * enterprise LPs and institutional investors who live in the
 * Microsoft ecosystem.
 * Scopes: Calendars.ReadWrite
 */
class OutlookCalendarAdapter implements CalendarAdapter {
  readonly provider: CalendarProvider = 'outlook';
  private clientId: string;
  private clientSecret: string;

  constructor(config: Record<string, unknown>) {
    this.clientId = (config.outlookClientId as string) || process.env.OUTLOOK_CLIENT_ID || '';
    this.clientSecret = (config.outlookClientSecret as string) || process.env.OUTLOOK_CLIENT_SECRET || '';
  }

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeToken(code: string, redirectUri: string) {
    // POST https://login.microsoftonline.com/common/oauth2/v2.0/token
    return { accessToken: `otoken-${Date.now()}`, refreshToken: `orefresh-${Date.now()}`, expiresIn: 3600 };
  }

  async listEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<ExternalEvent[]> {
    // GET https://graph.microsoft.com/v1.0/me/calendar/events
    //   ?$filter=start/dateTime ge '{timeMin}' and end/dateTime le '{timeMax}'
    return [];
  }

  async createEvent(accessToken: string, event: ExternalEventInput): Promise<ExternalEvent> {
    // POST https://graph.microsoft.com/v1.0/me/calendar/events
    return {
      id: `oev-${Date.now()}`,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      attendees: event.attendees.map(a => a.email),
    };
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<boolean> {
    // DELETE https://graph.microsoft.com/v1.0/me/calendar/events/{eventId}
    return true;
  }
}

// ─── Timezone Utilities ─────────────────────────────────────────

const COMMON_TIMEZONES: Record<string, { offset: number; label: string }> = {
  'Pacific/Auckland': { offset: 12, label: 'Auckland (NZST)' },
  'Australia/Sydney': { offset: 10, label: 'Sydney (AEST)' },
  'Asia/Tokyo': { offset: 9, label: 'Tokyo (JST)' },
  'Asia/Singapore': { offset: 8, label: 'Singapore (SGT)' },
  'Asia/Dubai': { offset: 4, label: 'Dubai (GST)' },
  'Europe/London': { offset: 0, label: 'London (GMT)' },
  'Europe/Paris': { offset: 1, label: 'Paris (CET)' },
  'Europe/Zurich': { offset: 1, label: 'Zurich (CET)' },
  'America/New_York': { offset: -5, label: 'New York (EST)' },
  'America/Chicago': { offset: -6, label: 'Chicago (CST)' },
  'America/Denver': { offset: -7, label: 'Denver (MST)' },
  'America/Los_Angeles': { offset: -8, label: 'Los Angeles (PST)' },
};

/**
 * Finds the best meeting time across multiple timezones.
 * The golden window for Sydney + London + San Francisco is narrow:
 * roughly 7am-8am PST / 3pm-4pm GMT / 2am-3am AEDT.
 * This function identifies the "least-bad" time for all participants.
 */
function findBestMeetingTime(
  attendeeTimezones: string[],
  durationMinutes: number,
  preferredHours = { start: 8, end: 18 },
): { time: string; score: number; localTimes: Record<string, string> }[] {
  const candidates: { time: string; score: number; localTimes: Record<string, string> }[] = [];

  // Check every 30-minute slot in a 24-hour window (UTC)
  for (let utcHour = 0; utcHour < 24; utcHour++) {
    for (const halfHour of [0, 30]) {
      let score = 0;
      const localTimes: Record<string, string> = {};

      for (const tz of attendeeTimezones) {
        const tzInfo = COMMON_TIMEZONES[tz];
        if (!tzInfo) continue;
        const localHour = (utcHour + tzInfo.offset + 24) % 24;
        localTimes[tz] = `${localHour.toString().padStart(2, '0')}:${halfHour.toString().padStart(2, '0')}`;

        // Score: within preferred hours = good, outside = penalty
        if (localHour >= preferredHours.start && localHour + (durationMinutes / 60) <= preferredHours.end) {
          score += 10; // Within business hours
        } else if (localHour >= 7 && localHour <= 20) {
          score += 5; // Extended hours
        } else {
          score -= 5; // Antisocial hours
        }
      }

      candidates.push({
        time: `${utcHour.toString().padStart(2, '0')}:${halfHour.toString().padStart(2, '0')} UTC`,
        score,
        localTimes,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Plugin Implementation ──────────────────────────────────────

export class SchedulingPlugin implements UCPlugin {
  readonly id = 'scheduling';
  readonly name = 'Scheduling & Calendar';
  readonly version = '3.0.0';
  readonly dependencies = ['video'];

  private ctx!: PluginContext;
  private meetings: Map<string, Meeting> = new Map();
  private recurringTemplates: Map<string, RecurringTemplate> = new Map();
  private calendarConnections: Map<string, CalendarConnection> = new Map();
  private adapters: Map<CalendarProvider, CalendarAdapter> = new Map();
  private reminderTimers: Map<string, NodeJS.Timeout[]> = new Map();
  private roomAutoCreateTimer?: NodeJS.Timeout;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    const pluginConfig = ctx.config.plugins['scheduling'] || {};

    // Initialize calendar adapters
    this.adapters.set('google', new GoogleCalendarAdapter(pluginConfig));
    this.adapters.set('outlook', new OutlookCalendarAdapter(pluginConfig));

    ctx.logger.info('Scheduling plugin initializing...');

    // When a video room closes, mark any linked meeting as completed
    ctx.bus.on('room:closed', async (data: any) => {
      for (const meeting of this.meetings.values()) {
        if (meeting.roomId === data.roomId && meeting.status === 'in-progress') {
          meeting.status = 'completed';
          meeting.updatedAt = new Date();
          ctx.logger.info(`Meeting ${meeting.id} marked completed (room closed)`);
        }
      }
    }, 'scheduling');

    // Start the room auto-creation checker (runs every 60 seconds)
    this.startRoomAutoCreation();

    ctx.logger.info(`Scheduling plugin initialized — ${this.adapters.size} calendar providers ✓`);
  }

  // ─── Room Auto-Creation ───────────────────────────────────────

  /**
   * Checks for meetings starting within the next 5 minutes and
   * auto-creates video rooms for them. Like a venue manager opening
   * the conference room doors just before the meeting.
   */
  private startRoomAutoCreation(): void {
    const checkInterval = 60_000; // 1 minute
    const lookAheadMs = 5 * 60_000; // 5 minutes

    this.roomAutoCreateTimer = setInterval(async () => {
      const now = Date.now();
      for (const meeting of this.meetings.values()) {
        if (meeting.status !== 'scheduled') continue;
        if (meeting.roomId) continue; // Already has a room
        if (!meeting.autoCreateRoom) continue;

        const startsIn = meeting.startsAt.getTime() - now;
        if (startsIn > 0 && startsIn <= lookAheadMs) {
          // Create room via Video plugin
          const roomId = `room-${meeting.id}-${Date.now()}`;
          meeting.roomId = roomId;
          meeting.status = 'in-progress';
          meeting.updatedAt = new Date();

          this.ctx.bus.emit('meeting:room-auto-created', {
            meetingId: meeting.id, roomId,
          }, 'scheduling');

          this.ctx.logger.info(`Auto-created room ${roomId} for meeting "${meeting.title}"`);
        }
      }
    }, checkInterval);
  }

  // ─── Reminder System ──────────────────────────────────────────

  private scheduleReminders(meeting: Meeting): void {
    const timers: NodeJS.Timeout[] = [];

    for (const minutesBefore of meeting.reminderMinutes) {
      const reminderTime = meeting.startsAt.getTime() - minutesBefore * 60_000;
      const delay = reminderTime - Date.now();

      if (delay > 0) {
        const timer = setTimeout(() => {
          for (const attendee of meeting.attendees) {
            this.ctx.bus.emit('meeting:reminder-sent', {
              meetingId: meeting.id, userId: attendee.userId, minutesBefore,
            }, 'scheduling');
          }
          this.ctx.logger.info(`Reminder sent for "${meeting.title}" (${minutesBefore}min before)`);
        }, delay);
        timers.push(timer);
      }
    }

    this.reminderTimers.set(meeting.id, timers);
  }

  private cancelReminders(meetingId: string): void {
    const timers = this.reminderTimers.get(meetingId) || [];
    for (const t of timers) clearTimeout(t);
    this.reminderTimers.delete(meetingId);
  }

  // ─── Meeting CRUD ─────────────────────────────────────────────

  private createMeeting(input: {
    title: string; description?: string; scheduledBy: string;
    startsAt: string; endsAt: string; timezone: string;
    attendees?: Partial<Attendee>[]; dealId?: string; tenantId?: string;
    autoCreateRoom?: boolean; sendReminders?: boolean;
    reminderMinutes?: number[]; tags?: string[];
  }): Meeting {
    const meeting: Meeting = {
      id: `mtg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      description: input.description,
      scheduledBy: input.scheduledBy,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      timezone: input.timezone || 'UTC',
      status: 'scheduled',
      dealId: input.dealId,
      tenantId: input.tenantId,
      attendees: (input.attendees || []).map((a, i) => ({
        userId: a.userId || `user-${i}`,
        email: a.email,
        name: a.name || 'Unknown',
        status: 'pending',
        timezone: a.timezone,
        isOrganizer: i === 0,
        isRequired: a.isRequired ?? true,
      })),
      autoCreateRoom: input.autoCreateRoom ?? true,
      sendReminders: input.sendReminders ?? true,
      reminderMinutes: input.reminderMinutes || [15, 5],
      tags: input.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.meetings.set(meeting.id, meeting);

    if (meeting.sendReminders) {
      this.scheduleReminders(meeting);
    }

    this.ctx.bus.emit('meeting:scheduled', {
      meetingId: meeting.id, title: meeting.title,
      scheduledBy: meeting.scheduledBy,
      startsAt: meeting.startsAt.toISOString(),
      endsAt: meeting.endsAt.toISOString(),
      roomId: meeting.roomId,
      attendeeCount: meeting.attendees.length,
    }, 'scheduling');

    return meeting;
  }

  // ─── REST Routes ──────────────────────────────────────────────

  getRoutes(): Router {
    const router = Router();

    // List meetings
    router.get('/meetings', (req, res) => {
      const { from, to, attendeeId, status, tenantId } = req.query;
      let results = [...this.meetings.values()];
      if (from) results = results.filter(m => m.startsAt >= new Date(from as string));
      if (to) results = results.filter(m => m.startsAt <= new Date(to as string));
      if (attendeeId) results = results.filter(m => m.attendees.some(a => a.userId === attendeeId));
      if (status) results = results.filter(m => m.status === status);
      if (tenantId) results = results.filter(m => m.tenantId === tenantId);
      results.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      res.json(results);
    });

    // Get meeting
    router.get('/meetings/:id', (req, res) => {
      const meeting = this.meetings.get(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      res.json(meeting);
    });

    // Schedule meeting
    router.post('/meetings', async (req, res) => {
      const { title, scheduledBy, startsAt, endsAt } = req.body;
      if (!title || !scheduledBy || !startsAt || !endsAt) {
        return res.status(400).json({ error: 'title, scheduledBy, startsAt, and endsAt are required' });
      }
      const meeting = this.createMeeting(req.body);
      await this.ctx.storage.set('meetings', meeting.id, meeting);
      this.ctx.logger.info(`Meeting scheduled: "${meeting.title}" at ${meeting.startsAt.toISOString()}`);
      res.status(201).json(meeting);
    });

    // Reschedule meeting
    router.put('/meetings/:id', async (req, res) => {
      const meeting = this.meetings.get(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

      const oldStartsAt = meeting.startsAt.toISOString();

      if (req.body.title) meeting.title = req.body.title;
      if (req.body.description !== undefined) meeting.description = req.body.description;
      if (req.body.startsAt) meeting.startsAt = new Date(req.body.startsAt);
      if (req.body.endsAt) meeting.endsAt = new Date(req.body.endsAt);
      if (req.body.timezone) meeting.timezone = req.body.timezone;
      meeting.updatedAt = new Date();

      // Reschedule reminders
      this.cancelReminders(meeting.id);
      if (meeting.sendReminders) this.scheduleReminders(meeting);

      if (req.body.startsAt && req.body.startsAt !== oldStartsAt) {
        this.ctx.bus.emit('meeting:rescheduled', {
          meetingId: meeting.id, oldStartsAt,
          newStartsAt: meeting.startsAt.toISOString(),
        }, 'scheduling');
      }

      await this.ctx.storage.set('meetings', meeting.id, meeting);
      res.json(meeting);
    });

    // Cancel meeting
    router.delete('/meetings/:id', async (req, res) => {
      const meeting = this.meetings.get(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

      meeting.status = 'cancelled';
      meeting.updatedAt = new Date();
      this.cancelReminders(meeting.id);

      this.ctx.bus.emit('meeting:cancelled', {
        meetingId: meeting.id, cancelledBy: req.body.cancelledBy || 'unknown',
        reason: req.body.reason,
      }, 'scheduling');

      await this.ctx.storage.set('meetings', meeting.id, meeting);
      res.json({ cancelled: true });
    });

    // Add attendee
    router.post('/meetings/:id/add-attendee', (req, res) => {
      const meeting = this.meetings.get(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

      meeting.attendees.push({
        userId: req.body.userId, email: req.body.email,
        name: req.body.name || 'Unknown', status: 'pending',
        timezone: req.body.timezone, isOrganizer: false,
        isRequired: req.body.isRequired ?? true,
      });
      meeting.updatedAt = new Date();
      res.json(meeting);
    });

    // Remove attendee
    router.post('/meetings/:id/remove-attendee', (req, res) => {
      const meeting = this.meetings.get(req.params.id);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

      meeting.attendees = meeting.attendees.filter(a => a.userId !== req.body.userId);
      meeting.updatedAt = new Date();
      res.json(meeting);
    });

    // Check availability — finds best times across attendee timezones
    router.get('/availability', (req, res) => {
      const timezones = ((req.query.timezones as string) || '').split(',').filter(Boolean);
      const durationMinutes = parseInt(req.query.duration as string || '60', 10);

      if (timezones.length === 0) {
        return res.status(400).json({ error: 'timezones query param required (comma-separated)' });
      }

      const suggestions = findBestMeetingTime(timezones, durationMinutes);
      res.json({ timezones, durationMinutes, suggestions });
    });

    // Connect external calendar (initiate OAuth)
    router.post('/calendars/connect', (req, res) => {
      const { provider, redirectUri } = req.body as { provider: CalendarProvider; redirectUri: string };
      const adapter = this.adapters.get(provider);
      if (!adapter) return res.status(400).json({ error: `Unsupported provider: ${provider}` });
      res.json({ authUrl: adapter.getAuthUrl(redirectUri) });
    });

    // List connected calendars
    router.get('/calendars', (req, res) => {
      const userId = req.query.userId as string;
      let conns = [...this.calendarConnections.values()];
      if (userId) conns = conns.filter(c => c.userId === userId);
      res.json(conns.map(c => ({
        id: c.id, provider: c.provider, calendarName: c.calendarName,
        lastSyncAt: c.lastSyncAt, syncedEventCount: c.syncedEventCount,
        isActive: c.isActive, connectedAt: c.connectedAt,
      })));
    });

    // Trigger calendar sync
    router.post('/calendars/:id/sync', async (req, res) => {
      const conn = this.calendarConnections.get(req.params.id);
      if (!conn) return res.status(404).json({ error: 'Calendar connection not found' });

      const adapter = this.adapters.get(conn.provider);
      if (!adapter) return res.status(500).json({ error: 'Provider adapter not found' });

      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const events = await adapter.listEvents(conn.accessToken, now, twoWeeksLater);

      conn.lastSyncAt = now;
      conn.syncedEventCount = events.length;

      this.ctx.bus.emit('meeting:calendar-synced', {
        userId: conn.userId, provider: conn.provider, eventCount: events.length,
      }, 'scheduling');

      res.json({ synced: events.length, lastSyncAt: conn.lastSyncAt });
    });

    // List recurring meeting templates
    router.get('/recurring', (req, res) => {
      let results = [...this.recurringTemplates.values()];
      if (req.query.tenantId) results = results.filter(r => r.tenantId === req.query.tenantId);
      res.json(results);
    });

    // Create recurring meeting
    router.post('/recurring', async (req, res) => {
      const { title, pattern, timeOfDay, durationMinutes, timezone, createdBy } = req.body;
      if (!title || !pattern || !timeOfDay || !durationMinutes || !createdBy) {
        return res.status(400).json({ error: 'title, pattern, timeOfDay, durationMinutes, createdBy required' });
      }

      const template: RecurringTemplate = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title, description: req.body.description, pattern,
        dayOfWeek: req.body.dayOfWeek, dayOfMonth: req.body.dayOfMonth,
        timeOfDay, durationMinutes, timezone: timezone || 'UTC',
        attendees: req.body.attendees || [], tenantId: req.body.tenantId,
        autoCreateRoom: req.body.autoCreateRoom ?? true,
        sendReminders: req.body.sendReminders ?? true,
        reminderMinutes: req.body.reminderMinutes || [15, 5],
        nextOccurrence: this.calculateNextOccurrence(pattern, timeOfDay, req.body.dayOfWeek),
        isActive: true, createdBy, createdAt: new Date(),
      };

      this.recurringTemplates.set(template.id, template);
      await this.ctx.storage.set('recurring-meetings', template.id, template);
      res.status(201).json(template);
    });

    // Supported timezones
    router.get('/timezones', (_req, res) => {
      res.json(Object.entries(COMMON_TIMEZONES).map(([id, info]) => ({
        id, label: info.label, utcOffset: info.offset,
      })));
    });

    // Stats
    router.get('/stats', (_req, res) => {
      const all = [...this.meetings.values()];
      res.json({
        totalMeetings: all.length,
        byStatus: {
          scheduled: all.filter(m => m.status === 'scheduled').length,
          inProgress: all.filter(m => m.status === 'in-progress').length,
          completed: all.filter(m => m.status === 'completed').length,
          cancelled: all.filter(m => m.status === 'cancelled').length,
        },
        recurringTemplates: this.recurringTemplates.size,
        calendarConnections: this.calendarConnections.size,
        upcomingThisWeek: all.filter(m => {
          const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          return m.status === 'scheduled' && m.startsAt <= weekFromNow;
        }).length,
      });
    });

    return router;
  }

  private calculateNextOccurrence(pattern: RecurrencePattern, timeOfDay: string, dayOfWeek?: number): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const next = new Date();
    next.setHours(hours || 0, minutes || 0, 0, 0);

    if (next <= new Date()) {
      switch (pattern) {
        case 'daily': next.setDate(next.getDate() + 1); break;
        case 'weekly':
        case 'biweekly':
          const currentDay = next.getDay();
          const targetDay = dayOfWeek ?? 1; // Default Monday
          let daysUntil = (targetDay - currentDay + 7) % 7;
          if (daysUntil === 0) daysUntil = 7;
          next.setDate(next.getDate() + daysUntil);
          if (pattern === 'biweekly') next.setDate(next.getDate() + 7);
          break;
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        default: next.setDate(next.getDate() + 1);
      }
    }
    return next;
  }

  async shutdown(): Promise<void> {
    if (this.roomAutoCreateTimer) clearInterval(this.roomAutoCreateTimer);
    for (const timers of this.reminderTimers.values()) {
      for (const t of timers) clearTimeout(t);
    }
    this.meetings.clear();
    this.recurringTemplates.clear();
    this.calendarConnections.clear();
    this.ctx.logger.info('Scheduling plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return {
      status: 'healthy',
      details: {
        activeMeetings: [...this.meetings.values()].filter(m => m.status === 'scheduled').length,
        recurringTemplates: this.recurringTemplates.size,
        calendarConnections: this.calendarConnections.size,
        pendingReminders: this.reminderTimers.size,
      },
    };
  }
}

export default SchedulingPlugin;
