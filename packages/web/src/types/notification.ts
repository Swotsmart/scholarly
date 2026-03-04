/**
 * Notification Types - Scholarly Platform
 * Matches Prisma Notification + NotificationPreference models,
 * with AI intelligence types for smart triage, digests, and insights.
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export type NotificationType =
  | 'auth_verification' | 'auth_password_reset' | 'auth_login_alert'
  | 'payment_receipt' | 'payment_failed'
  | 'subscription_created' | 'subscription_cancelled' | 'subscription_renewal'
  | 'learning_progress' | 'learning_milestone' | 'learning_concern'
  | 'wellbeing_alert' | 'wellbeing_checkin_reminder'
  | 'parent_meeting_scheduled' | 'parent_report_available' | 'parent_consent_required'
  | 'storybook_published' | 'storybook_review_complete'
  | 'content_bounty_posted' | 'content_bounty_awarded' | 'creator_payout'
  | 'arena_challenge' | 'arena_result'
  | 'governance_proposal' | 'governance_vote_reminder'
  | 'system_maintenance' | 'system_announcement';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  inAppStatus: NotificationStatus;
  emailStatus: string | null;
  smsStatus: string | null;
  pushStatus: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  readAt: string | null;
  groupKey: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categoryPreferences: Record<string, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | null;
  digestTime: string | null;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number };
}

export interface NotificationCountResponse { unreadCount: number; }

export interface NotificationDigest {
  summary: string;
  sections: DigestSection[];
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface DigestSection {
  title: string;
  icon: string;
  items: DigestItem[];
  suggestedAction: string | null;
}

export interface DigestItem {
  notificationId: string;
  summary: string;
  priority: NotificationPriority;
}

export interface NotificationTriage {
  suggestedPriority: NotificationPriority;
  requiresAction: boolean;
  actionSuggestion: string | null;
  relatedNotificationIds: string[];
  confidence: number;
}

export interface NotificationInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  actionLabel: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export type NotificationCategory =
  | 'learning' | 'communication' | 'achievement'
  | 'system' | 'payment' | 'wellbeing' | 'content' | 'governance';

export function getNotificationCategory(type: string): NotificationCategory {
  if (type.startsWith('learning_') || type.startsWith('arena_')) return 'learning';
  if (type.startsWith('auth_') || type.startsWith('system_')) return 'system';
  if (type.startsWith('payment_') || type.startsWith('subscription_') || type === 'creator_payout') return 'payment';
  if (type.startsWith('wellbeing_')) return 'wellbeing';
  if (type.startsWith('parent_')) return 'communication';
  if (type.startsWith('storybook_') || type.startsWith('content_')) return 'content';
  if (type.startsWith('governance_')) return 'governance';
  return 'system';
}
