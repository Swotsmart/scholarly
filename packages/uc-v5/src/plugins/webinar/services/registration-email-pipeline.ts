/**
 * Chekd Unified Communications 3.2 — Registration Email Pipeline
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE MAILROOM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * When someone registers for a webinar, a cascade of communications needs
 * to fire: an immediate confirmation email, a calendar invite, and a
 * sequence of reminders leading up to the event. Think of this service as
 * the webinar's mailroom — it knows when to send what to whom, and it
 * produces beautifully formatted letters for each occasion.
 *
 * Rather than integrating directly with SendGrid or SES (which would create
 * a hard dependency), this service dispatches through the platform's existing
 * Notifications plugin via the event bus. The Notifications plugin already
 * has the delivery infrastructure — we just need to give it the right
 * content at the right time. This is like writing a letter and dropping it
 * in the building's internal mailbox rather than walking it to the post
 * office yourself.
 *
 * The .ics calendar invite generation is handled entirely in this service
 * — producing a standards-compliant iCalendar file that works with Google
 * Calendar, Outlook, Apple Calendar, and every other modern calendar app.
 */

import type { EventBus } from '../../../bus/event-bus';
import type { Logger } from '../../../utils/logger';

// ─── Email Types ─────────────────────────────────────────────────────────────

export type EmailType =
  | 'registration-confirmation'
  | 'registration-waitlisted'
  | 'registration-approved'
  | 'registration-declined'
  | 'reminder-24h'
  | 'reminder-1h'
  | 'reminder-5min'
  | 'webinar-starting'
  | 'post-event-recording'
  | 'post-event-followup'
  | 'no-show-followup';

export interface WebinarEmailContext {
  webinarId: string;
  webinarTitle: string;
  webinarDescription: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timezone: string;
  joinUrl: string;
  joinToken: string;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  hostName?: string;
  recordingUrl?: string;
}

export interface RecipientInfo {
  email: string;
  name: string;
  registrationId: string;
  userId?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface EmailPipelineConfig {
  /** Base URL for webinar join links (default: https://app.chekd.com.au/webinar) */
  joinBaseUrl: string;

  /** From name for emails (default: 'Chekd Webinar') */
  fromName: string;

  /** From email address (default: 'webinars@chekd.com.au') */
  fromEmail: string;

  /** Whether to send reminder emails (default: true) */
  remindersEnabled: boolean;

  /** Whether to attach .ics calendar invites (default: true) */
  calendarInviteEnabled: boolean;

  /** Whether to include unsubscribe link (default: true) */
  includeUnsubscribe: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailPipelineConfig = {
  joinBaseUrl: 'https://app.chekd.com.au/webinar',
  fromName: 'Chekd Webinar',
  fromEmail: 'webinars@chekd.com.au',
  remindersEnabled: true,
  calendarInviteEnabled: true,
  includeUnsubscribe: true,
};

// ─── Scheduled Reminder State ────────────────────────────────────────────────

interface ScheduledReminder {
  webinarId: string;
  email: string;
  emailType: EmailType;
  scheduledFor: Date;
  timer: ReturnType<typeof setTimeout>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THE EMAIL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export class RegistrationEmailPipeline {
  private bus: EventBus;
  private logger: Logger;
  private config: EmailPipelineConfig;

  /** Active reminder timers keyed by `${webinarId}:${email}:${type}` */
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();

  constructor(bus: EventBus, logger: Logger, config?: Partial<EmailPipelineConfig>) {
    this.bus = bus;
    this.logger = logger;
    this.config = { ...DEFAULT_EMAIL_CONFIG, ...config };
  }

  // ─── Registration Emails ───────────────────────────────────────────────

  /**
   * Send a registration confirmation email with .ics calendar invite.
   * This is the first touchpoint — make it count.
   */
  async sendRegistrationConfirmation(
    recipient: RecipientInfo,
    context: WebinarEmailContext,
  ): Promise<void> {
    const joinUrl = `${this.config.joinBaseUrl}/${context.webinarId}/join?token=${context.joinToken}`;
    const icsContent = this.config.calendarInviteEnabled
      ? this.generateICSInvite(context, joinUrl)
      : undefined;

    const html = this.renderTemplate('registration-confirmation', {
      recipientName: recipient.name,
      webinarTitle: context.webinarTitle,
      webinarDescription: context.webinarDescription,
      startDate: this.formatDate(context.scheduledStartAt, context.timezone),
      startTime: this.formatTime(context.scheduledStartAt, context.timezone),
      endTime: this.formatTime(context.scheduledEndAt, context.timezone),
      timezone: context.timezone,
      joinUrl,
      logoUrl: context.branding.logoUrl,
      primaryColor: context.branding.primaryColor,
      accentColor: context.branding.accentColor,
      fontFamily: context.branding.fontFamily,
      hostName: context.hostName,
    });

    await this.dispatchEmail({
      to: recipient.email,
      toName: recipient.name,
      subject: `You're registered: ${context.webinarTitle}`,
      html,
      icsAttachment: icsContent,
      emailType: 'registration-confirmation',
      webinarId: context.webinarId,
      registrationId: recipient.registrationId,
    });

    // Schedule reminder sequence
    if (this.config.remindersEnabled) {
      this.scheduleReminders(recipient, context, joinUrl);
    }
  }

  /**
   * Send a waitlist notification.
   */
  async sendWaitlistNotification(
    recipient: RecipientInfo,
    context: WebinarEmailContext,
  ): Promise<void> {
    const html = this.renderTemplate('registration-waitlisted', {
      recipientName: recipient.name,
      webinarTitle: context.webinarTitle,
      startDate: this.formatDate(context.scheduledStartAt, context.timezone),
      primaryColor: context.branding.primaryColor,
      fontFamily: context.branding.fontFamily,
      logoUrl: context.branding.logoUrl,
    });

    await this.dispatchEmail({
      to: recipient.email,
      toName: recipient.name,
      subject: `Waitlisted: ${context.webinarTitle}`,
      html,
      emailType: 'registration-waitlisted',
      webinarId: context.webinarId,
      registrationId: recipient.registrationId,
    });
  }

  /**
   * Send approval notification (when moved from waitlist/pending to approved).
   */
  async sendApprovalNotification(
    recipient: RecipientInfo,
    context: WebinarEmailContext,
  ): Promise<void> {
    const joinUrl = `${this.config.joinBaseUrl}/${context.webinarId}/join?token=${context.joinToken}`;
    const icsContent = this.config.calendarInviteEnabled
      ? this.generateICSInvite(context, joinUrl)
      : undefined;

    const html = this.renderTemplate('registration-approved', {
      recipientName: recipient.name,
      webinarTitle: context.webinarTitle,
      startDate: this.formatDate(context.scheduledStartAt, context.timezone),
      startTime: this.formatTime(context.scheduledStartAt, context.timezone),
      joinUrl,
      primaryColor: context.branding.primaryColor,
      accentColor: context.branding.accentColor,
      fontFamily: context.branding.fontFamily,
      logoUrl: context.branding.logoUrl,
    });

    await this.dispatchEmail({
      to: recipient.email,
      toName: recipient.name,
      subject: `You're in! ${context.webinarTitle}`,
      html,
      icsAttachment: icsContent,
      emailType: 'registration-approved',
      webinarId: context.webinarId,
      registrationId: recipient.registrationId,
    });

    if (this.config.remindersEnabled) {
      this.scheduleReminders(recipient, context, joinUrl);
    }
  }

  // ─── Reminder Scheduling ───────────────────────────────────────────────
  //
  // Like setting three alarm clocks: one the day before, one an hour before,
  // and one five minutes before. Each fires at the right moment and delivers
  // the right message for that stage of anticipation.

  private scheduleReminders(
    recipient: RecipientInfo,
    context: WebinarEmailContext,
    joinUrl: string,
  ): void {
    const now = Date.now();
    const startMs = context.scheduledStartAt.getTime();

    const reminders: { type: EmailType; offsetMs: number; subject: string }[] = [
      { type: 'reminder-24h', offsetMs: 24 * 60 * 60 * 1000, subject: `Tomorrow: ${context.webinarTitle}` },
      { type: 'reminder-1h', offsetMs: 60 * 60 * 1000, subject: `Starting in 1 hour: ${context.webinarTitle}` },
      { type: 'reminder-5min', offsetMs: 5 * 60 * 1000, subject: `Starting now: ${context.webinarTitle}` },
    ];

    for (const reminder of reminders) {
      const fireAt = startMs - reminder.offsetMs;
      const delayMs = fireAt - now;

      if (delayMs <= 0) continue; // Already passed

      const key = `${context.webinarId}:${recipient.email}:${reminder.type}`;
      // Cancel any existing reminder for this key
      this.cancelReminder(key);

      const timer = setTimeout(async () => {
        try {
          const html = this.renderTemplate(reminder.type, {
            recipientName: recipient.name,
            webinarTitle: context.webinarTitle,
            startTime: this.formatTime(context.scheduledStartAt, context.timezone),
            joinUrl,
            primaryColor: context.branding.primaryColor,
            accentColor: context.branding.accentColor,
            fontFamily: context.branding.fontFamily,
            logoUrl: context.branding.logoUrl,
          });

          await this.dispatchEmail({
            to: recipient.email,
            toName: recipient.name,
            subject: reminder.subject,
            html,
            emailType: reminder.type,
            webinarId: context.webinarId,
            registrationId: recipient.registrationId,
          });

          this.scheduledReminders.delete(key);
        } catch (err) {
          this.logger.error(`Reminder ${reminder.type} failed for ${recipient.email}: ${err}`);
        }
      }, delayMs);

      this.scheduledReminders.set(key, {
        webinarId: context.webinarId,
        email: recipient.email,
        emailType: reminder.type,
        scheduledFor: new Date(fireAt),
        timer,
      });
    }
  }

  /**
   * Cancel all scheduled reminders for a webinar (e.g., when cancelled).
   */
  cancelAllReminders(webinarId: string): void {
    for (const [key, reminder] of this.scheduledReminders) {
      if (reminder.webinarId === webinarId) {
        clearTimeout(reminder.timer);
        this.scheduledReminders.delete(key);
      }
    }
    this.logger.info(`Cancelled all reminders for webinar ${webinarId}`);
  }

  /**
   * Cancel a specific reminder.
   */
  cancelReminder(key: string): void {
    const reminder = this.scheduledReminders.get(key);
    if (reminder) {
      clearTimeout(reminder.timer);
      this.scheduledReminders.delete(key);
    }
  }

  // ─── ICS Calendar Invite Generation ────────────────────────────────────
  //
  // The .ics format is a universal calendar interchange standard (RFC 5545).
  // This method produces a compliant VCALENDAR/VEVENT that works with Google
  // Calendar, Outlook, Apple Calendar, and every other modern calendar app.

  generateICSInvite(context: WebinarEmailContext, joinUrl: string): string {
    const uid = `${context.webinarId}@chekd.com.au`;
    const now = this.formatICSDate(new Date());
    const start = this.formatICSDate(context.scheduledStartAt);
    const end = this.formatICSDate(context.scheduledEndAt);

    // Escape special characters in iCalendar text fields
    const title = this.escapeICSText(context.webinarTitle);
    const description = this.escapeICSText(
      `${context.webinarDescription}\n\nJoin the webinar: ${joinUrl}`
    );

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chekd Pty Ltd//Unified Communications 3.2//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `URL:${joinUrl}`,
      `ORGANIZER;CN=${this.config.fromName}:MAILTO:${this.config.fromEmail}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      `BEGIN:VALARM`,
      `TRIGGER:-PT1H`,
      `ACTION:DISPLAY`,
      `DESCRIPTION:${title} starts in 1 hour`,
      `END:VALARM`,
      `BEGIN:VALARM`,
      `TRIGGER:-PT5M`,
      `ACTION:DISPLAY`,
      `DESCRIPTION:${title} starts in 5 minutes`,
      `END:VALARM`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // ─── Email Template Rendering ──────────────────────────────────────────
  //
  // Rather than importing a template engine dependency, we render clean
  // HTML directly. The templates are responsive, accessible, and respect
  // the webinar's branding configuration.

  private renderTemplate(
    type: EmailType,
    vars: Record<string, string | undefined>,
  ): string {
    const { primaryColor = '#6366f1', accentColor = '#f59e0b', fontFamily = 'Inter, system-ui, sans-serif' } = vars;
    const logoHtml = vars.logoUrl ? `<img src="${vars.logoUrl}" alt="Logo" style="max-height:48px;margin-bottom:16px;" />` : '';

    const baseStyle = `
      font-family: ${fontFamily};
      max-width: 600px;
      margin: 0 auto;
      padding: 32px;
      background: #ffffff;
      border-radius: 8px;
    `;

    const buttonStyle = `
      display: inline-block;
      padding: 14px 32px;
      background-color: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    `;

    const wrap = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${this.escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f4f4f5;">
<div style="${baseStyle}">
  ${logoHtml}
  ${body}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:12px;color:#9ca3af;">This email was sent because you registered for a webinar on Chekd.</p>
</div>
</body>
</html>`;

    switch (type) {
      case 'registration-confirmation':
        return wrap(`Registration Confirmed`, `
  <h1 style="color:${primaryColor};margin:0 0 8px;">You're registered!</h1>
  <p style="color:#374151;font-size:16px;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;">You've successfully registered for <strong>${this.escapeHtml(vars.webinarTitle || '')}</strong>.</p>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0;color:#6b7280;">📅 <strong>${vars.startDate}</strong></p>
    <p style="margin:4px 0 0;color:#6b7280;">🕐 ${vars.startTime} – ${vars.endTime} (${vars.timezone})</p>
    ${vars.hostName ? `<p style="margin:4px 0 0;color:#6b7280;">🎤 Hosted by ${this.escapeHtml(vars.hostName)}</p>` : ''}
  </div>
  <p style="color:#374151;">A calendar invite is attached. Join from this link when the webinar starts:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${vars.joinUrl}" style="${buttonStyle}">Join Webinar</a>
  </p>`);

      case 'registration-waitlisted':
        return wrap(`Waitlisted`, `
  <h1 style="color:${primaryColor};margin:0 0 8px;">You're on the waitlist</h1>
  <p style="color:#374151;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;"><strong>${this.escapeHtml(vars.webinarTitle || '')}</strong> is currently at capacity. You've been added to the waitlist and we'll notify you immediately if a spot opens up.</p>
  <p style="color:#6b7280;">📅 ${vars.startDate}</p>`);

      case 'registration-approved':
        return wrap(`You're In!`, `
  <h1 style="color:${primaryColor};margin:0 0 8px;">Great news — you're in!</h1>
  <p style="color:#374151;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;">A spot has opened up for <strong>${this.escapeHtml(vars.webinarTitle || '')}</strong> and you're now confirmed.</p>
  <p style="color:#6b7280;">📅 ${vars.startDate} at ${vars.startTime}</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${vars.joinUrl}" style="${buttonStyle}">Join Webinar</a>
  </p>`);

      case 'reminder-24h':
        return wrap(`Tomorrow: ${vars.webinarTitle}`, `
  <h1 style="color:${primaryColor};margin:0 0 8px;">Reminder: Tomorrow!</h1>
  <p style="color:#374151;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;"><strong>${this.escapeHtml(vars.webinarTitle || '')}</strong> is tomorrow at ${vars.startTime}. Make sure you're ready!</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${vars.joinUrl}" style="${buttonStyle}">Add to Calendar</a>
  </p>`);

      case 'reminder-1h':
        return wrap(`Starting in 1 hour`, `
  <h1 style="color:${accentColor};margin:0 0 8px;">Starting in 1 hour!</h1>
  <p style="color:#374151;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;"><strong>${this.escapeHtml(vars.webinarTitle || '')}</strong> begins at ${vars.startTime}. Click below to join.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${vars.joinUrl}" style="${buttonStyle}">Join Now</a>
  </p>`);

      case 'reminder-5min':
        return wrap(`Starting now!`, `
  <h1 style="color:${accentColor};margin:0 0 8px;">We're starting!</h1>
  <p style="color:#374151;"><strong>${this.escapeHtml(vars.webinarTitle || '')}</strong> is starting right now. Click to join:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${vars.joinUrl}" style="${buttonStyle}">Join Live</a>
  </p>`);

      default:
        return wrap(vars.webinarTitle || 'Webinar', `
  <p style="color:#374151;">Hi ${this.escapeHtml(vars.recipientName || 'there')},</p>
  <p style="color:#374151;">This is a notification about <strong>${this.escapeHtml(vars.webinarTitle || 'your webinar')}</strong>.</p>`);
    }
  }

  // ─── Dispatch via Notifications Plugin ─────────────────────────────────

  private async dispatchEmail(params: {
    to: string;
    toName: string;
    subject: string;
    html: string;
    icsAttachment?: string;
    emailType: EmailType;
    webinarId: string;
    registrationId: string;
  }): Promise<void> {
    const notificationId = `webinar-email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Dispatch through the event bus to the Notifications plugin
    this.bus.emit('notification:queued', {
      notificationId,
      userId: params.registrationId,
      channel: 'email',
      type: params.emailType,
      priority: params.emailType.startsWith('reminder-5min') ? 'high' : 'normal',
    });

    // Also emit a more detailed internal event for the email delivery system
    this.bus.emit('webinar:email-dispatch', {
      notificationId,
      to: params.to,
      toName: params.toName,
      from: this.config.fromEmail,
      fromName: this.config.fromName,
      subject: params.subject,
      html: params.html,
      icsAttachment: params.icsAttachment,
      emailType: params.emailType,
      webinarId: params.webinarId,
      registrationId: params.registrationId,
      dispatchedAt: new Date(),
    });

    this.logger.info(`Email dispatched: ${params.emailType} to ${params.to} for webinar ${params.webinarId}`);
  }

  // ─── Utility Methods ───────────────────────────────────────────────────

  private formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeICSText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private formatDate(date: Date, _timezone: string): string {
    return date.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  private formatTime(date: Date, _timezone: string): string {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  /**
   * Get count of active scheduled reminders.
   */
  getActiveReminderCount(): number {
    return this.scheduledReminders.size;
  }

  /**
   * Destroy all timers.
   */
  destroy(): void {
    for (const [, reminder] of this.scheduledReminders) {
      clearTimeout(reminder.timer);
    }
    this.scheduledReminders.clear();
  }
}

export default RegistrationEmailPipeline;
