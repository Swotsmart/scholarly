/**
 * Scholarly Unified Communications 4.0 — Scheduling Templates Enhancement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE METRONOME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The base Scheduling plugin handles one-off and recurring meetings with
 * calendar sync. But many organisations run on structured, repeating
 * schedules that are more complex than "every Tuesday at 2pm":
 *
 *   - A school has period-based timetables with bell schedules that shift
 *     by day of the week and term.
 *   - A hospital has 3 rotating shifts with handover meetings at each
 *     transition.
 *   - A law firm has court calendar slots that map to case preparation
 *     meetings.
 *   - A factory has production shift schedules with daily stand-ups at
 *     shift start.
 *
 * What these all share is a **schedule template** — a recurring time
 * structure that defines named periods/slots, their times, and which
 * days they apply to. When someone says "schedule a meeting for Period 3"
 * or "book the shift handover room", the system resolves the abstract
 * reference to concrete date/time using the active schedule template.
 *
 * This is the difference between a wall clock and a metronome: the clock
 * tells you what time it is, but the metronome gives you the rhythm that
 * structures time into meaningful units.
 *
 * REST endpoints added to /api/scheduling:
 *   POST /templates                       — Create a schedule template
 *   GET  /templates                       — List templates
 *   GET  /templates/:id                   — Get template details
 *   PUT  /templates/:id                   — Update template
 *   DELETE /templates/:id                 — Delete template
 *   POST /templates/:id/activate          — Set as active template for tenant
 *   GET  /templates/active                — Get currently active template
 *   POST /resolve                         — Resolve a period reference to date/time
 *   GET  /periods/current                 — Get current period based on active template
 *   GET  /periods/today                   — Get all periods for today
 *   POST /meetings/from-period            — Create meeting from a period reference
 *
 * Bus events emitted:
 *   scheduling:template-created, scheduling:template-activated,
 *   scheduling:period-started, scheduling:period-ended,
 *   scheduling:period-resolved, scheduling:bell-triggered
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  /** The type of schedule — informational only, helps UI render appropriately */
  scheduleType: 'academic' | 'shift' | 'office-hours' | 'rotation' | 'custom';
  /** Timezone for all period times */
  timezone: string;
  /** Named periods/slots that make up the schedule */
  periods: PeriodDefinition[];
  /** Which days of the week this template applies to (0=Sun, 6=Sat) */
  activeDays: number[];
  /** Optional: different period arrangements for different days */
  dayOverrides?: DayOverride[];
  /** Optional: date ranges when this template is active (e.g., term dates) */
  validRanges?: DateRange[];
  /** Optional: specific dates to skip (holidays, closures) */
  excludedDates?: string[]; // ISO date strings
  /** Bell/signal configuration — triggers at period boundaries */
  bells?: BellConfig[];
  /** Whether this template is currently the active one for its tenant */
  isActive: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodDefinition {
  /** Unique identifier within the template (e.g., 'P1', 'SHIFT_A', 'MORNING_STANDUP') */
  periodId: string;
  /** Display name (e.g., 'Period 1', 'Morning Shift', 'Office Hours') */
  name: string;
  /** Start time in HH:MM format (24h) */
  startTime: string;
  /** End time in HH:MM format (24h) */
  endTime: string;
  /** Type of period — determines behaviour and UI presentation */
  type: 'session' | 'break' | 'transition' | 'preparation' | 'custom';
  /** Optional: room or resource associated with this period */
  defaultRoomId?: string;
  /** Optional: metadata (e.g., subject for academic, department for shift) */
  metadata?: Record<string, unknown>;
}

export interface DayOverride {
  /** Day of week (0-6) */
  dayOfWeek: number;
  /** Replacement period list for this day */
  periods: PeriodDefinition[];
}

export interface DateRange {
  /** Label (e.g., 'Term 1', 'Q1 Sprint', 'Summer Rotation') */
  label: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
}

export interface BellConfig {
  /** When to trigger relative to period: 'start', 'end', or offset in minutes */
  trigger: 'period-start' | 'period-end' | 'before-start' | 'after-end';
  /** Offset in minutes (for before-start/after-end triggers) */
  offsetMinutes?: number;
  /** Which period types trigger this bell */
  periodTypes: PeriodDefinition['type'][];
  /** Action to take: emit event, play sound URL, send notification */
  action: 'event' | 'sound' | 'notification';
  /** Sound URL for 'sound' action */
  soundUrl?: string;
  /** Notification template for 'notification' action */
  notificationTemplate?: { title: string; body: string };
}

export interface ResolvedPeriod {
  periodId: string;
  name: string;
  type: PeriodDefinition['type'];
  date: string;       // ISO date
  startDateTime: Date;
  endDateTime: Date;
  dayOfWeek: number;
  templateId: string;
  templateName: string;
  metadata?: Record<string, unknown>;
}

// ─── Schedule Template Manager ──────────────────────────────────────

export class ScheduleTemplateManager {
  private templates: Map<string, ScheduleTemplate> = new Map();
  private activeTemplates: Map<string, string> = new Map(); // tenantId → templateId
  private bellTimers: Map<string, ReturnType<typeof setTimeout>[]> = new Map();

  constructor(private ctx: PluginContext) {}

  // ─── Template CRUD ────────────────────────────────────────────────

  createTemplate(input: Omit<ScheduleTemplate, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): ScheduleTemplate {
    const template: ScheduleTemplate = {
      ...input,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate period times
    for (const period of template.periods) {
      if (!this.isValidTime(period.startTime) || !this.isValidTime(period.endTime)) {
        throw new Error(`Invalid time format for period ${period.periodId}. Use HH:MM (24h).`);
      }
    }

    this.templates.set(template.id, template);
    this.ctx.bus.emit('scheduling:template-created', { templateId: template.id, name: template.name });
    return template;
  }

  updateTemplate(id: string, updates: Partial<ScheduleTemplate>): ScheduleTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;
    Object.assign(template, updates, { updatedAt: new Date() });
    return template;
  }

  deleteTemplate(id: string): boolean {
    // Deactivate if active
    for (const [tenant, tmplId] of this.activeTemplates) {
      if (tmplId === id) this.activeTemplates.delete(tenant);
    }
    return this.templates.delete(id);
  }

  activateTemplate(templateId: string, tenantId: string = 'default'): ScheduleTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Deactivate current active template for this tenant
    const currentActiveId = this.activeTemplates.get(tenantId);
    if (currentActiveId) {
      const current = this.templates.get(currentActiveId);
      if (current) current.isActive = false;
    }

    template.isActive = true;
    template.tenantId = tenantId;
    this.activeTemplates.set(tenantId, templateId);

    // Set up bell timers for today
    this.scheduleBellsForToday(templateId);

    this.ctx.bus.emit('scheduling:template-activated', {
      templateId, name: template.name, tenantId,
    });

    return template;
  }

  getActiveTemplate(tenantId: string = 'default'): ScheduleTemplate | null {
    const id = this.activeTemplates.get(tenantId);
    return id ? this.templates.get(id) || null : null;
  }

  // ─── Period Resolution ────────────────────────────────────────────

  /**
   * Resolve a period reference to concrete date/time.
   * Handles: "Period 3", "P3", "Morning Shift", or a periodId.
   * If no date provided, resolves against today.
   */
  resolvePeriod(
    periodRef: string,
    date?: string,
    tenantId: string = 'default',
  ): ResolvedPeriod | null {
    const template = this.getActiveTemplate(tenantId);
    if (!template) return null;

    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();

    // Check if this day is active
    if (!template.activeDays.includes(dayOfWeek)) return null;

    // Check excluded dates
    const dateStr = targetDate.toISOString().split('T')[0];
    if (template.excludedDates?.includes(dateStr)) return null;

    // Check valid ranges
    if (template.validRanges?.length) {
      const inRange = template.validRanges.some(
        r => dateStr >= r.startDate && dateStr <= r.endDate,
      );
      if (!inRange) return null;
    }

    // Get periods for this day (check day overrides first)
    const dayOverride = template.dayOverrides?.find(d => d.dayOfWeek === dayOfWeek);
    const periods = dayOverride?.periods || template.periods;

    // Find the matching period
    const normalised = periodRef.toLowerCase().trim();
    const period = periods.find(p =>
      p.periodId.toLowerCase() === normalised ||
      p.name.toLowerCase() === normalised ||
      p.name.toLowerCase().replace(/\s+/g, '') === normalised.replace(/\s+/g, ''),
    );

    if (!period) return null;

    // Build concrete datetime
    const [startH, startM] = period.startTime.split(':').map(Number);
    const [endH, endM] = period.endTime.split(':').map(Number);

    const startDateTime = new Date(targetDate);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(targetDate);
    endDateTime.setHours(endH, endM, 0, 0);

    const resolved: ResolvedPeriod = {
      periodId: period.periodId,
      name: period.name,
      type: period.type,
      date: dateStr,
      startDateTime,
      endDateTime,
      dayOfWeek,
      templateId: template.id,
      templateName: template.name,
      metadata: period.metadata,
    };

    this.ctx.bus.emit('scheduling:period-resolved', {
      periodRef, resolved: { ...resolved, startDateTime: resolved.startDateTime.toISOString(), endDateTime: resolved.endDateTime.toISOString() },
    });

    return resolved;
  }

  /**
   * Get the current period based on the active template and current time.
   */
  getCurrentPeriod(tenantId: string = 'default'): ResolvedPeriod | null {
    const template = this.getActiveTemplate(tenantId);
    if (!template) return null;

    const now = new Date();
    const dayOfWeek = now.getDay();
    if (!template.activeDays.includes(dayOfWeek)) return null;

    const dateStr = now.toISOString().split('T')[0];
    if (template.excludedDates?.includes(dateStr)) return null;

    const dayOverride = template.dayOverrides?.find(d => d.dayOfWeek === dayOfWeek);
    const periods = dayOverride?.periods || template.periods;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const period of periods) {
      const [startH, startM] = period.startTime.split(':').map(Number);
      const [endH, endM] = period.endTime.split(':').map(Number);
      const periodStart = startH * 60 + startM;
      const periodEnd = endH * 60 + endM;

      if (currentMinutes >= periodStart && currentMinutes < periodEnd) {
        const startDateTime = new Date(now);
        startDateTime.setHours(startH, startM, 0, 0);
        const endDateTime = new Date(now);
        endDateTime.setHours(endH, endM, 0, 0);

        return {
          periodId: period.periodId,
          name: period.name,
          type: period.type,
          date: dateStr,
          startDateTime,
          endDateTime,
          dayOfWeek,
          templateId: template.id,
          templateName: template.name,
          metadata: period.metadata,
        };
      }
    }

    return null; // Not currently in any period
  }

  /**
   * Get all periods for a given date.
   */
  getPeriodsForDate(date?: string, tenantId: string = 'default'): ResolvedPeriod[] {
    const template = this.getActiveTemplate(tenantId);
    if (!template) return [];

    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();
    if (!template.activeDays.includes(dayOfWeek)) return [];

    const dateStr = targetDate.toISOString().split('T')[0];
    if (template.excludedDates?.includes(dateStr)) return [];

    const dayOverride = template.dayOverrides?.find(d => d.dayOfWeek === dayOfWeek);
    const periods = dayOverride?.periods || template.periods;

    return periods.map(period => {
      const [startH, startM] = period.startTime.split(':').map(Number);
      const [endH, endM] = period.endTime.split(':').map(Number);
      const startDateTime = new Date(targetDate);
      startDateTime.setHours(startH, startM, 0, 0);
      const endDateTime = new Date(targetDate);
      endDateTime.setHours(endH, endM, 0, 0);

      return {
        periodId: period.periodId,
        name: period.name,
        type: period.type,
        date: dateStr,
        startDateTime,
        endDateTime,
        dayOfWeek,
        templateId: template.id,
        templateName: template.name,
        metadata: period.metadata,
      };
    });
  }

  // ─── Bell Scheduling ──────────────────────────────────────────────

  private scheduleBellsForToday(templateId: string): void {
    // Clear existing bell timers
    const existing = this.bellTimers.get(templateId);
    if (existing) existing.forEach(t => clearTimeout(t));

    const template = this.templates.get(templateId);
    if (!template?.bells?.length) return;

    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const periods = this.getPeriodsForDate(undefined, template.tenantId);

    for (const bell of template.bells) {
      for (const period of periods) {
        if (!bell.periodTypes.includes(period.type)) continue;

        let triggerTime: Date;
        switch (bell.trigger) {
          case 'period-start':
            triggerTime = period.startDateTime;
            break;
          case 'period-end':
            triggerTime = period.endDateTime;
            break;
          case 'before-start':
            triggerTime = new Date(period.startDateTime.getTime() - (bell.offsetMinutes || 0) * 60000);
            break;
          case 'after-end':
            triggerTime = new Date(period.endDateTime.getTime() + (bell.offsetMinutes || 0) * 60000);
            break;
          default:
            continue;
        }

        const delay = triggerTime.getTime() - now.getTime();
        if (delay <= 0) continue; // Already passed

        const timer = setTimeout(() => {
          this.ctx.bus.emit('scheduling:bell-triggered', {
            templateId, periodId: period.periodId, periodName: period.name,
            trigger: bell.trigger, action: bell.action,
            soundUrl: bell.soundUrl, timestamp: new Date().toISOString(),
          });

          if (bell.trigger === 'period-start') {
            this.ctx.bus.emit('scheduling:period-started', {
              periodId: period.periodId, name: period.name,
              startTime: period.startDateTime.toISOString(),
            });
          } else if (bell.trigger === 'period-end') {
            this.ctx.bus.emit('scheduling:period-ended', {
              periodId: period.periodId, name: period.name,
              endTime: period.endDateTime.toISOString(),
            });
          }
        }, delay);

        timers.push(timer);
      }
    }

    this.bellTimers.set(templateId, timers);
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private isValidTime(time: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    router.post('/templates', (req, res) => {
      try {
        const template = this.createTemplate(req.body);
        res.status(201).json(template);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    router.get('/templates', (_req, res) => {
      res.json({ templates: [...this.templates.values()] });
    });

    router.get('/templates/:id', (req, res) => {
      const template = this.templates.get(req.params.id);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    });

    router.put('/templates/:id', (req, res) => {
      const template = this.updateTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json(template);
    });

    router.delete('/templates/:id', (req, res) => {
      if (!this.deleteTemplate(req.params.id)) return res.status(404).json({ error: 'Template not found' });
      res.json({ deleted: true });
    });

    router.post('/templates/:id/activate', (req, res) => {
      const tenantId = req.body.tenantId || 'default';
      const template = this.activateTemplate(req.params.id, tenantId);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      res.json({ activated: true, template });
    });

    router.get('/templates/active', (req, res) => {
      const tenantId = (req.query.tenantId as string) || 'default';
      const template = this.getActiveTemplate(tenantId);
      if (!template) return res.status(404).json({ error: 'No active template' });
      res.json(template);
    });

    router.post('/resolve', (req, res) => {
      const { periodRef, date, tenantId } = req.body;
      if (!periodRef) return res.status(400).json({ error: 'periodRef required' });
      const resolved = this.resolvePeriod(periodRef, date, tenantId);
      if (!resolved) return res.status(404).json({ error: 'Period not found or not active on that date' });
      res.json(resolved);
    });

    router.get('/periods/current', (req, res) => {
      const tenantId = (req.query.tenantId as string) || 'default';
      const current = this.getCurrentPeriod(tenantId);
      if (!current) return res.json({ current: null, message: 'Not currently in any scheduled period' });
      res.json({ current });
    });

    router.get('/periods/today', (req, res) => {
      const tenantId = (req.query.tenantId as string) || 'default';
      const periods = this.getPeriodsForDate(undefined, tenantId);
      res.json({ date: new Date().toISOString().split('T')[0], periods });
    });

    router.post('/meetings/from-period', (req, res) => {
      const { periodRef, date, title, tenantId } = req.body;
      if (!periodRef) return res.status(400).json({ error: 'periodRef required' });
      const resolved = this.resolvePeriod(periodRef, date, tenantId);
      if (!resolved) return res.status(404).json({ error: 'Period not found' });

      // Emit event for the base Scheduling plugin to create the meeting
      this.ctx.bus.emit('meeting:scheduled', {
        title: title || `${resolved.name} - ${resolved.date}`,
        scheduledStartAt: resolved.startDateTime.toISOString(),
        scheduledEndAt: resolved.endDateTime.toISOString(),
        periodRef: resolved.periodId,
        templateId: resolved.templateId,
        metadata: resolved.metadata,
      });

      res.status(201).json({
        message: 'Meeting creation requested',
        period: resolved,
      });
    });

    return router;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): { templateCount: number; activeTemplates: number; bellTimersActive: number } {
    return {
      templateCount: this.templates.size,
      activeTemplates: this.activeTemplates.size,
      bellTimersActive: [...this.bellTimers.values()].reduce((s, t) => s + t.length, 0),
    };
  }
}

export default ScheduleTemplateManager;
