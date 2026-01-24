/**
 * Notification Service
 *
 * Handles multi-channel notifications (in-app, email, SMS, push)
 * with user preferences and delivery tracking.
 */

import { prisma, Prisma } from '@scholarly/database';
import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { log } from '../lib/logger';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
  groupKey?: string;
}

export interface SendNotificationRequest {
  tenantId: string;
  userId: string;
  notification: NotificationPayload;
}

export interface BulkNotificationRequest {
  tenantId: string;
  userIds: string[];
  notification: NotificationPayload;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categoryPreferences: Record<string, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  digestEnabled: boolean;
  digestFrequency?: 'daily' | 'weekly';
  digestTime?: string;
}

export interface NotificationFilters {
  type?: string;
  status?: NotificationStatus;
  channels?: NotificationChannel[];
  startDate?: Date;
  endDate?: Date;
  read?: boolean;
}

// ============================================================================
// Notification Service
// ============================================================================

let notificationServiceInstance: NotificationService | null = null;

export class NotificationService extends ScholarlyBaseService {
  constructor() {
    super('NotificationService');
  }

  // ============ Send Notifications ============

  /**
   * Send a notification to a single user
   */
  async send(request: SendNotificationRequest): Promise<Result<string>> {
    return this.withTiming('send', async () => {
      const { tenantId, userId, notification } = request;

      // Get user preferences
      const preferences = await this.getUserPreferences(tenantId, userId);

      // Determine which channels to use
      const channels = await this.resolveChannels(
        notification.channels || ['in_app'],
        preferences,
        notification.type
      );

      if (channels.length === 0) {
        log.info('No channels enabled for notification', { userId, type: notification.type });
        return success('no_channels');
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for after quiet hours
        notification.scheduledFor = this.getQuietHoursEnd(preferences);
      }

      // Create notification record
      const notificationRecord = await prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          channels,
          priority: notification.priority || 'normal',
          scheduledFor: notification.scheduledFor,
          groupKey: notification.groupKey,
          inAppStatus: channels.includes('in_app') ? 'unread' : undefined,
          emailStatus: channels.includes('email') ? 'pending' : undefined,
          smsStatus: channels.includes('sms') ? 'pending' : undefined,
          pushStatus: channels.includes('push') ? 'pending' : undefined,
        },
      });

      // Dispatch to channels (async, don't block)
      this.dispatchToChannels(notificationRecord.id, channels, notification);

      return success(notificationRecord.id);
    });
  }

  /**
   * Send notification to multiple users
   */
  async sendBulk(request: BulkNotificationRequest): Promise<Result<{ sent: number; failed: number }>> {
    return this.withTiming('sendBulk', async () => {
      const { tenantId, userIds, notification } = request;

      let sent = 0;
      let failed = 0;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((userId) =>
            this.send({ tenantId, userId, notification })
          )
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            sent++;
          } else {
            failed++;
          }
        }
      }

      return success({ sent, failed });
    });
  }

  /**
   * Send notification to users by role
   */
  async sendByRole(
    tenantId: string,
    role: string,
    notification: NotificationPayload
  ): Promise<Result<{ sent: number; failed: number }>> {
    return this.withTiming('sendByRole', async () => {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          roles: { has: role },
          status: 'active',
        },
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      return this.sendBulk({ tenantId, userIds, notification });
    });
  }

  // ============ Notification Management ============

  /**
   * Get user notifications
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    filters?: NotificationFilters,
    page = 1,
    pageSize = 20
  ): Promise<Result<{ notifications: Prisma.NotificationGetPayload<{}>[]; total: number }>> {
    return this.withTiming('getUserNotifications', async () => {
      const where: Prisma.NotificationWhereInput = {
        tenantId,
        userId,
      };

      if (filters?.type) where.type = filters.type;
      if (filters?.read !== undefined) {
        where.inAppStatus = filters.read ? 'read' : 'unread';
      }
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.notification.count({ where }),
      ]);

      return success({ notifications, total });
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Result<void>> {
    return this.withTiming('markAsRead', async () => {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          inAppStatus: 'read',
          readAt: new Date(),
        },
      });

      return success(undefined);
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<Result<number>> {
    return this.withTiming('markAllAsRead', async () => {
      const result = await prisma.notification.updateMany({
        where: {
          tenantId,
          userId,
          inAppStatus: 'unread',
        },
        data: {
          inAppStatus: 'read',
          readAt: new Date(),
        },
      });

      return success(result.count);
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<Result<number>> {
    return this.withTiming('getUnreadCount', async () => {
      const count = await prisma.notification.count({
        where: {
          tenantId,
          userId,
          inAppStatus: 'unread',
        },
      });

      return success(count);
    });
  }

  // ============ Preferences ============

  /**
   * Get user notification preferences
   */
  async getUserPreferences(
    tenantId: string,
    userId: string
  ): Promise<NotificationPreferences> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!prefs) {
      // Return defaults
      return {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        categoryPreferences: {},
        quietHoursEnabled: false,
        timezone: 'Australia/Sydney',
        digestEnabled: false,
      };
    }

    return {
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      pushEnabled: prefs.pushEnabled,
      inAppEnabled: prefs.inAppEnabled,
      categoryPreferences: prefs.categoryPreferences as Record<string, boolean>,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
      timezone: prefs.timezone,
      digestEnabled: prefs.digestEnabled,
      digestFrequency: prefs.digestFrequency as 'daily' | 'weekly' | undefined,
      digestTime: prefs.digestTime || undefined,
    };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<Result<NotificationPreferences>> {
    return this.withTiming('updatePreferences', async () => {
      const prefs = await prisma.notificationPreference.upsert({
        where: {
          tenantId_userId: { tenantId, userId },
        },
        create: {
          tenantId,
          userId,
          ...updates,
          categoryPreferences: updates.categoryPreferences || {},
        },
        update: {
          ...updates,
          categoryPreferences: updates.categoryPreferences,
        },
      });

      return success({
        emailEnabled: prefs.emailEnabled,
        smsEnabled: prefs.smsEnabled,
        pushEnabled: prefs.pushEnabled,
        inAppEnabled: prefs.inAppEnabled,
        categoryPreferences: prefs.categoryPreferences as Record<string, boolean>,
        quietHoursEnabled: prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart || undefined,
        quietHoursEnd: prefs.quietHoursEnd || undefined,
        timezone: prefs.timezone,
        digestEnabled: prefs.digestEnabled,
        digestFrequency: prefs.digestFrequency as 'daily' | 'weekly' | undefined,
        digestTime: prefs.digestTime || undefined,
      });
    });
  }

  // ============ Helper Methods ============

  /**
   * Resolve which channels to use based on preferences
   */
  private async resolveChannels(
    requested: NotificationChannel[],
    preferences: NotificationPreferences,
    notificationType: string
  ): Promise<NotificationChannel[]> {
    const channels: NotificationChannel[] = [];

    // Check category preferences
    const categoryEnabled = preferences.categoryPreferences[notificationType];
    if (categoryEnabled === false) {
      return []; // User disabled this notification type
    }

    for (const channel of requested) {
      switch (channel) {
        case 'in_app':
          if (preferences.inAppEnabled) channels.push('in_app');
          break;
        case 'email':
          if (preferences.emailEnabled) channels.push('email');
          break;
        case 'sms':
          if (preferences.smsEnabled) channels.push('sms');
          break;
        case 'push':
          if (preferences.pushEnabled) channels.push('push');
          break;
      }
    }

    return channels;
  }

  /**
   * Check if currently in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: preferences.timezone,
    });
    const currentTime = formatter.format(now);

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Get the end of quiet hours as a Date
   */
  private getQuietHoursEnd(preferences: NotificationPreferences): Date {
    if (!preferences.quietHoursEnd) {
      return new Date();
    }

    const now = new Date();
    const [hours, minutes] = preferences.quietHoursEnd.split(':').map(Number);

    const end = new Date(now);
    end.setHours(hours, minutes, 0, 0);

    // If end time has passed today, schedule for tomorrow
    if (end <= now) {
      end.setDate(end.getDate() + 1);
    }

    return end;
  }

  /**
   * Dispatch notification to channels (async)
   */
  private async dispatchToChannels(
    notificationId: string,
    channels: NotificationChannel[],
    payload: NotificationPayload
  ): Promise<void> {
    // Process each channel asynchronously
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(notificationId, payload);
            break;
          case 'sms':
            await this.sendSms(notificationId, payload);
            break;
          case 'push':
            await this.sendPush(notificationId, payload);
            break;
          // in_app is handled by the record creation
        }
      } catch (error) {
        log.error(`Failed to send ${channel} notification`, error as Error, {
          notificationId,
          channel,
        });

        // Update status to failed
        const statusField = `${channel}Status` as const;
        await prisma.notification.update({
          where: { id: notificationId },
          data: { [statusField]: 'failed' },
        });
      }
    }
  }

  /**
   * Send email notification (placeholder - integrate with email provider)
   */
  private async sendEmail(notificationId: string, payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with email service (SendGrid, SES, etc.)
    log.info('Email notification queued', { notificationId, title: payload.title });

    await prisma.notification.update({
      where: { id: notificationId },
      data: { emailStatus: 'sent', sentAt: new Date() },
    });
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS provider)
   */
  private async sendSms(notificationId: string, payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    log.info('SMS notification queued', { notificationId, title: payload.title });

    await prisma.notification.update({
      where: { id: notificationId },
      data: { smsStatus: 'sent', sentAt: new Date() },
    });
  }

  /**
   * Send push notification (placeholder - integrate with push provider)
   */
  private async sendPush(notificationId: string, payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with push service (FCM, APNS, etc.)
    log.info('Push notification queued', { notificationId, title: payload.title });

    await prisma.notification.update({
      where: { id: notificationId },
      data: { pushStatus: 'sent', sentAt: new Date() },
    });
  }
}

// ============================================================================
// Service Initialization
// ============================================================================

export function initializeNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    throw new Error('NotificationService not initialized. Call initializeNotificationService() first.');
  }
  return notificationServiceInstance;
}
