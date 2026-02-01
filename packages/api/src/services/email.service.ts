/**
 * Scholarly Email Service
 *
 * SendGrid-powered email service for transactional emails.
 * Handles welcome emails, password resets, booking confirmations, and session reminders.
 *
 * @module EmailService
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  ScholarlyBaseService,
} from './base.service';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailConfig {
  sendgridApiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  templateIds?: {
    welcome?: string;
    passwordReset?: string;
    bookingConfirmation?: string;
    sessionReminder?: string;
    invoiceSent?: string;
    paymentReceived?: string;
  };
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  content: string; // Base64 encoded
  filename: string;
  type: string; // MIME type
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: EmailAttachment[];
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: Date;
  replyTo?: EmailRecipient;
}

export interface EmailResult {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  recipientCount: number;
}

// Template-specific input types
export interface WelcomeEmailInput {
  recipient: EmailRecipient;
  firstName: string;
  verificationLink?: string;
  loginUrl: string;
}

export interface PasswordResetEmailInput {
  recipient: EmailRecipient;
  firstName: string;
  resetLink: string;
  expiresInMinutes: number;
}

export interface BookingConfirmationEmailInput {
  recipient: EmailRecipient;
  bookingId: string;
  tutorName: string;
  tutorPhoto?: string;
  subject: string;
  sessionDate: Date;
  sessionTime: string;
  duration: number;
  price: number;
  currency: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  cancellationUrl: string;
  rescheduleUrl: string;
}

export interface SessionReminderEmailInput {
  recipient: EmailRecipient;
  firstName: string;
  tutorName: string;
  subject: string;
  sessionDate: Date;
  sessionTime: string;
  duration: number;
  meetingLink?: string;
  location?: string;
  reminderType: '24h' | '1h' | '15m';
}

export interface InvoiceEmailInput {
  recipient: EmailRecipient;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  lineItems: { description: string; amount: number }[];
  paymentUrl: string;
  pdfAttachment?: string; // Base64 encoded PDF
}

export interface PaymentReceivedEmailInput {
  recipient: EmailRecipient;
  invoiceNumber: string;
  paymentDate: Date;
  amount: number;
  currency: string;
  paymentMethod: string;
  receiptUrl?: string;
}

// ============================================================================
// EMAIL TEMPLATES (HTML)
// ============================================================================

const TEMPLATES = {
  welcome: (data: WelcomeEmailInput) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Scholarly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #2563eb; margin: 0;">Welcome to Scholarly!</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.firstName},</p>

    <p>Thank you for joining Scholarly! We're excited to have you as part of our learning community.</p>

    ${data.verificationLink ? `
    <p>Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email Address</a>
    </div>
    <p style="font-size: 14px; color: #666;">This link will expire in 24 hours.</p>
    ` : ''}

    <p>With Scholarly, you can:</p>
    <ul style="padding-left: 20px;">
      <li>Find and book expert tutors</li>
      <li>Access personalized learning paths</li>
      <li>Track your progress with detailed analytics</li>
      <li>Earn achievements and build your portfolio</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Get Started</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>Need help? Reply to this email or contact our support team.</p>
    <p style="margin-bottom: 0;">&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`,

  passwordReset: (data: PasswordResetEmailInput) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #2563eb; margin: 0;">Password Reset Request</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.firstName},</p>

    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
    </div>

    <p style="font-size: 14px; color: #666;">This link will expire in ${data.expiresInMinutes} minutes.</p>

    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <div style="background: #fef3c7; border-radius: 6px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Security tip:</strong> Never share your password or this reset link with anyone. Scholarly will never ask for your password via email.
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`,

  bookingConfirmation: (data: BookingConfirmationEmailInput) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #10b981; margin: 0;">Booking Confirmed!</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.recipient.name || 'there'},</p>

    <p>Your tutoring session has been confirmed. Here are the details:</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        ${data.tutorPhoto ? `<img src="${data.tutorPhoto}" alt="${data.tutorName}" style="width: 60px; height: 60px; border-radius: 50%; margin-right: 16px;">` : ''}
        <div>
          <h3 style="margin: 0; color: #111;">${data.tutorName}</h3>
          <p style="margin: 4px 0 0; color: #666;">${data.subject}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.sessionDate.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Time</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.sessionTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Duration</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.duration} minutes</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Price</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.currency} $${(data.price / 100).toFixed(2)}</td>
        </tr>
        ${data.location ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Location</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.location}</td>
        </tr>
        ` : ''}
      </table>

      ${data.meetingLink ? `
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <a href="${data.meetingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Meeting</a>
      </div>
      ` : ''}
    </div>

    <p style="font-size: 14px; color: #666;">Booking reference: <strong>${data.bookingId}</strong></p>

    ${data.notes ? `
    <div style="background: #fef3c7; border-radius: 6px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Notes:</strong> ${data.notes}</p>
    </div>
    ` : ''}

    <div style="display: flex; gap: 16px; margin-top: 30px;">
      <a href="${data.rescheduleUrl}" style="flex: 1; text-align: center; padding: 12px; border: 1px solid #2563eb; color: #2563eb; text-decoration: none; border-radius: 6px;">Reschedule</a>
      <a href="${data.cancellationUrl}" style="flex: 1; text-align: center; padding: 12px; border: 1px solid #dc2626; color: #dc2626; text-decoration: none; border-radius: 6px;">Cancel</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>Add this session to your calendar for a reminder.</p>
    <p>&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`,

  sessionReminder: (data: SessionReminderEmailInput) => {
    const reminderText = {
      '24h': "You have a tutoring session tomorrow",
      '1h': "Your tutoring session starts in 1 hour",
      '15m': "Your tutoring session starts in 15 minutes"
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #f59e0b; margin: 0;">Session Reminder</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.firstName},</p>

    <p style="font-size: 16px; font-weight: 600; color: #f59e0b;">${reminderText[data.reminderType]}!</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin: 0 0 16px; color: #111;">${data.subject} with ${data.tutorName}</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.sessionDate.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Time</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.sessionTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Duration</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.duration} minutes</td>
        </tr>
        ${data.location ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Location</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.location}</td>
        </tr>
        ` : ''}
      </table>

      ${data.meetingLink ? `
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <a href="${data.meetingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Meeting Now</a>
      </div>
      ` : ''}
    </div>

    <p style="font-size: 14px; color: #666;">Make sure you're in a quiet space with a stable internet connection for the best learning experience.</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`;
  }
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EmailService extends ScholarlyBaseService {
  private config: EmailConfig;
  private sendgridBaseUrl = 'https://api.sendgrid.com/v3';

  constructor(config: EmailConfig) {
    super('EmailService');
    this.config = config;
  }

  // ==========================================================================
  // CORE EMAIL METHODS
  // ==========================================================================

  /**
   * Send a generic email
   */
  async sendEmail(input: SendEmailInput): Promise<Result<EmailResult>> {
    return this.withTiming('sendEmail', async () => {
      try {
        const recipients = Array.isArray(input.to) ? input.to : [input.to];

        // Build the SendGrid payload
        const payload: Record<string, unknown> = {
          personalizations: [{
            to: recipients.map(r => ({ email: r.email, name: r.name })),
            ...(input.cc && { cc: input.cc.map(r => ({ email: r.email, name: r.name })) }),
            ...(input.bcc && { bcc: input.bcc.map(r => ({ email: r.email, name: r.name })) }),
            ...(input.dynamicTemplateData && { dynamic_template_data: input.dynamicTemplateData }),
            ...(input.customArgs && { custom_args: input.customArgs }),
          }],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName,
          },
          ...(input.replyTo || this.config.replyToEmail) && {
            reply_to: {
              email: input.replyTo?.email || this.config.replyToEmail,
              name: input.replyTo?.name,
            }
          },
          subject: input.subject,
          ...(input.templateId ? {
            template_id: input.templateId,
          } : {
            content: [
              ...(input.textContent ? [{ type: 'text/plain', value: input.textContent }] : []),
              ...(input.htmlContent ? [{ type: 'text/html', value: input.htmlContent }] : []),
            ],
          }),
          ...(input.attachments && {
            attachments: input.attachments.map(a => ({
              content: a.content,
              filename: a.filename,
              type: a.type,
              disposition: a.disposition || 'attachment',
              content_id: a.contentId,
            })),
          }),
          ...(input.categories && { categories: input.categories }),
          ...(input.sendAt && { send_at: Math.floor(input.sendAt.getTime() / 1000) }),
        };

        const response = await fetch(`${this.sendgridBaseUrl}/mail/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          log.error('SendGrid API error', { status: response.status, body: errorBody });
          return failure({
            code: 'EMAIL_SEND_FAILED',
            message: `Failed to send email: ${response.statusText}`,
            details: { status: response.status, body: errorBody },
          });
        }

        // SendGrid returns 202 for successful queuing
        const messageId = response.headers.get('X-Message-Id') || this.generateId('msg');

        log.info('Email sent successfully', {
          messageId,
          recipientCount: recipients.length,
          templateId: input.templateId,
        });

        await this.publishEvent('email.sent', 'system', {
          messageId,
          recipientCount: recipients.length,
          subject: input.subject,
          templateId: input.templateId,
        });

        return success({
          messageId,
          status: 'queued',
          recipientCount: recipients.length,
        });
      } catch (error) {
        log.error('Failed to send email', error as Error);
        return failure({
          code: 'EMAIL_ERROR',
          message: `Email sending failed: ${(error as Error).message}`,
        });
      }
    });
  }

  // ==========================================================================
  // TEMPLATE-BASED EMAIL METHODS
  // ==========================================================================

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(input: WelcomeEmailInput): Promise<Result<EmailResult>> {
    const htmlContent = TEMPLATES.welcome(input);

    return this.sendEmail({
      to: input.recipient,
      subject: `Welcome to Scholarly, ${input.firstName}!`,
      htmlContent,
      categories: ['welcome', 'transactional'],
      customArgs: {
        email_type: 'welcome',
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<Result<EmailResult>> {
    const htmlContent = TEMPLATES.passwordReset(input);

    return this.sendEmail({
      to: input.recipient,
      subject: 'Reset Your Scholarly Password',
      htmlContent,
      categories: ['password-reset', 'transactional'],
      customArgs: {
        email_type: 'password_reset',
      },
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(input: BookingConfirmationEmailInput): Promise<Result<EmailResult>> {
    const htmlContent = TEMPLATES.bookingConfirmation(input);

    return this.sendEmail({
      to: input.recipient,
      subject: `Booking Confirmed: ${input.subject} with ${input.tutorName}`,
      htmlContent,
      categories: ['booking', 'transactional'],
      customArgs: {
        email_type: 'booking_confirmation',
        booking_id: input.bookingId,
      },
    });
  }

  /**
   * Send session reminder email
   */
  async sendSessionReminder(input: SessionReminderEmailInput): Promise<Result<EmailResult>> {
    const htmlContent = TEMPLATES.sessionReminder(input);

    const subjectPrefixes = {
      '24h': 'Reminder: Tomorrow',
      '1h': 'Starting Soon',
      '15m': 'Starting in 15 minutes',
    };

    return this.sendEmail({
      to: input.recipient,
      subject: `${subjectPrefixes[input.reminderType]}: ${input.subject} with ${input.tutorName}`,
      htmlContent,
      categories: ['reminder', 'transactional'],
      customArgs: {
        email_type: 'session_reminder',
        reminder_type: input.reminderType,
      },
    });
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(input: InvoiceEmailInput): Promise<Result<EmailResult>> {
    const attachments: EmailAttachment[] = [];

    if (input.pdfAttachment) {
      attachments.push({
        content: input.pdfAttachment,
        filename: `invoice-${input.invoiceNumber}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      });
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${input.invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #2563eb; margin: 0;">Invoice</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${input.recipient.name || 'there'},</p>

    <p>Please find your invoice details below:</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${input.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Issue Date</td>
          <td style="padding: 8px 0; text-align: right;">${input.invoiceDate.toLocaleDateString('en-AU')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">${input.dueDate.toLocaleDateString('en-AU')}</td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">

      ${input.lineItems.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>${item.description}</span>
          <span>${input.currency} $${(item.amount / 100).toFixed(2)}</span>
        </div>
      `).join('')}

      <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 16px 0;">

      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; font-weight: 700;">
        <span>Total</span>
        <span>${input.currency} $${(input.amount / 100).toFixed(2)}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${input.paymentUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Pay Now</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: input.recipient,
      subject: `Invoice ${input.invoiceNumber} - ${input.currency} $${(input.amount / 100).toFixed(2)} due ${input.dueDate.toLocaleDateString('en-AU')}`,
      htmlContent,
      attachments,
      categories: ['invoice', 'transactional'],
      customArgs: {
        email_type: 'invoice',
        invoice_number: input.invoiceNumber,
      },
    });
  }

  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedEmail(input: PaymentReceivedEmailInput): Promise<Result<EmailResult>> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #10b981; margin: 0;">Payment Received</h1>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 20px 0;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${input.recipient.name || 'there'},</p>

    <p>Thank you for your payment! Here are the details:</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${input.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Payment Date</td>
          <td style="padding: 8px 0; text-align: right;">${input.paymentDate.toLocaleDateString('en-AU')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Payment Method</td>
          <td style="padding: 8px 0; text-align: right;">${input.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #666; font-size: 18px; font-weight: 700;">Amount Paid</td>
          <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: 700; color: #10b981;">${input.currency} $${(input.amount / 100).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${input.receiptUrl ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="${input.receiptUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Receipt</a>
    </div>
    ` : ''}
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
    <p>&copy; ${new Date().getFullYear()} Scholarly. All rights reserved.</p>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: input.recipient,
      subject: `Payment Received - ${input.currency} $${(input.amount / 100).toFixed(2)} for Invoice ${input.invoiceNumber}`,
      htmlContent,
      categories: ['payment', 'transactional'],
      customArgs: {
        email_type: 'payment_received',
        invoice_number: input.invoiceNumber,
      },
    });
  }

  // ==========================================================================
  // BULK EMAIL METHODS
  // ==========================================================================

  /**
   * Send bulk emails (for marketing or notifications)
   */
  async sendBulkEmails(
    recipients: EmailRecipient[],
    subject: string,
    htmlContent: string,
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
      categories?: string[];
    }
  ): Promise<Result<{ sent: number; failed: number }>> {
    const batchSize = options?.batchSize || 1000;
    const delayMs = options?.delayBetweenBatches || 1000;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const result = await this.sendEmail({
        to: batch,
        subject,
        htmlContent,
        categories: options?.categories,
      });

      if (result.success) {
        sent += batch.length;
      } else {
        failed += batch.length;
        log.error('Bulk email batch failed', { batchIndex: i / batchSize, error: result.error });
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return success({ sent, failed });
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let emailService: EmailService | null = null;

export function initializeEmailService(config?: Partial<EmailConfig>): EmailService {
  const defaultConfig: EmailConfig = {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@scholarly.edu.au',
    fromName: process.env.EMAIL_FROM_NAME || 'Scholarly',
    replyToEmail: process.env.EMAIL_REPLY_TO || 'support@scholarly.edu.au',
  };

  emailService = new EmailService({ ...defaultConfig, ...config });
  return emailService;
}

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = initializeEmailService();
  }
  return emailService;
}
