/**
 * Notification API Client - Scholarly Platform
 * Follows existing ApiClient pattern: namespaced methods, DEMO_MODE, cookie creds.
 */

import type {
  Notification, NotificationListResponse, NotificationCountResponse,
  NotificationPreferences, NotificationDigest, NotificationInsight,
} from '@/types/notification';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_API_URL;

const now = Date.now();

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_1', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'learning_milestone', title: 'Milestone Reached!',
    body: 'Emma has completed Phase 3 phonics and can now decode CVC words with digraphs!',
    data: { childName: 'Emma', phase: 3 },
    channels: ['in_app', 'push'], priority: 'normal', inAppStatus: 'unread',
    emailStatus: null, smsStatus: null, pushStatus: 'sent',
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: null, groupKey: 'learning',
    createdAt: new Date(now - 15 * 60_000).toISOString(),
  },
  {
    id: 'notif_2', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'wellbeing_alert', title: 'Wellbeing Check-in Recommended',
    body: "Liam's engagement dropped 40% this week. A check-in conversation might help.",
    data: { childName: 'Liam', metric: 'engagement', change: -40 },
    channels: ['in_app', 'email'], priority: 'high', inAppStatus: 'unread',
    emailStatus: 'sent', smsStatus: null, pushStatus: null,
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: null, groupKey: 'wellbeing',
    createdAt: new Date(now - 2 * 3_600_000).toISOString(),
  },
  {
    id: 'notif_3', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'parent_meeting_scheduled', title: 'Meeting Confirmed',
    body: 'Your meeting with Ms. Rodriguez is confirmed for Thursday at 3:30 PM AWST.',
    data: { teacherName: 'Ms. Rodriguez' },
    channels: ['in_app', 'email'], priority: 'normal', inAppStatus: 'read',
    emailStatus: 'delivered', smsStatus: null, pushStatus: null,
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: new Date(now - 30 * 60_000).toISOString(), groupKey: 'communication',
    createdAt: new Date(now - 5 * 3_600_000).toISOString(),
  },
  {
    id: 'notif_4', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'storybook_published', title: 'New Storybook Available',
    body: 'Finn the Fox Finds the Beach is ready in the library, matched to Phase 3 GPCs.',
    data: { bookTitle: 'Finn the Fox Finds the Beach', phase: 3 },
    channels: ['in_app'], priority: 'low', inAppStatus: 'read',
    emailStatus: null, smsStatus: null, pushStatus: null,
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: new Date(now - 3_600_000).toISOString(), groupKey: 'content',
    createdAt: new Date(now - 8 * 3_600_000).toISOString(),
  },
  {
    id: 'notif_5', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'system_announcement', title: 'Voice Service Alert',
    body: 'Kokoro TTS was temporarily unavailable. Children heard a browser fallback voice. Service is now restored.',
    data: { resolved: true },
    channels: ['in_app', 'push'], priority: 'high', inAppStatus: 'read',
    emailStatus: null, smsStatus: null, pushStatus: 'delivered',
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: new Date(now - 3 * 3_600_000).toISOString(), groupKey: 'system',
    createdAt: new Date(now - 12 * 3_600_000).toISOString(),
  },
  {
    id: 'notif_6', tenantId: 'demo_tenant', userId: 'demo_user',
    type: 'payment_receipt', title: 'Payment Confirmed',
    body: 'Your Scholarly Family subscription ($14.99/month) was renewed successfully.',
    data: { amount: 14.99, plan: 'family' },
    channels: ['in_app', 'email'], priority: 'low', inAppStatus: 'read',
    emailStatus: 'delivered', smsStatus: null, pushStatus: null,
    scheduledFor: null, sentAt: new Date(now).toISOString(),
    readAt: new Date(now - 24 * 3_600_000).toISOString(), groupKey: 'payment',
    createdAt: new Date(now - 24 * 3_600_000).toISOString(),
  },
];

const DEMO_DIGEST: NotificationDigest = {
  summary: 'This week: Emma hit a phonics milestone, Liam needs a check-in, meeting with Ms. Rodriguez Thursday.',
  sections: [
    { title: 'Learning Progress', icon: 'graduation-cap',
      items: [{ notificationId: 'notif_1', summary: 'Emma completed Phase 3 phonics', priority: 'normal' }],
      suggestedAction: "Review Emma's mastery report." },
    { title: 'Needs Attention', icon: 'heart',
      items: [{ notificationId: 'notif_2', summary: "Liam's engagement dropped 40%", priority: 'high' }],
      suggestedAction: 'Consider a casual chat with Liam.' },
  ],
  generatedAt: new Date().toISOString(),
  periodStart: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  periodEnd: new Date().toISOString(),
};

const DEMO_INSIGHTS: NotificationInsight[] = [
  { id: 'insight_1', type: 'pattern', title: 'Emma reads most at 4-5 PM',
    description: 'Scheduling reading in this window could maximise engagement.',
    actionLabel: 'Adjust Schedule', actionUrl: '/parent/children',
    createdAt: new Date().toISOString() },
  { id: 'insight_2', type: 'anomaly', title: 'Liam skipped 3 sessions this week',
    description: 'Combined with the engagement drop, this may indicate difficulty frustration.',
    actionLabel: 'View Progress', actionUrl: '/parent/progress/learning',
    createdAt: new Date().toISOString() },
];

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error('Notification API ' + method + ' ' + path + ': ' + res.status);
  return res.json();
}

export const notificationApi = {

  list: async (page = 1, limit = 20, status?: 'unread' | 'read'): Promise<NotificationListResponse> => {
    if (DEMO_MODE) {
      const filtered = status ? DEMO_NOTIFICATIONS.filter(n => n.inAppStatus === status) : DEMO_NOTIFICATIONS;
      return { notifications: filtered.slice((page - 1) * limit, page * limit),
        unreadCount: DEMO_NOTIFICATIONS.filter(n => n.inAppStatus === 'unread').length,
        pagination: { page, limit, total: filtered.length } };
    }
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return request('GET', '/api/v1/dashboard/notifications?' + params);
  },

  unreadCount: async (): Promise<NotificationCountResponse> => {
    if (DEMO_MODE) return { unreadCount: DEMO_NOTIFICATIONS.filter(n => n.inAppStatus === 'unread').length };
    return request('GET', '/api/v1/dashboard/notifications/count');
  },

  markAsRead: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      const n = DEMO_NOTIFICATIONS.find(x => x.id === id);
      if (n) { n.inAppStatus = 'read'; n.readAt = new Date().toISOString(); }
      return;
    }
    await request('PATCH', '/api/v1/dashboard/notifications/' + id + '/read');
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    if (DEMO_MODE) {
      let c = 0;
      DEMO_NOTIFICATIONS.forEach(n => {
        if (n.inAppStatus === 'unread') { n.inAppStatus = 'read'; n.readAt = new Date().toISOString(); c++; }
      });
      return { count: c };
    }
    return request('PATCH', '/api/v1/dashboard/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      const idx = DEMO_NOTIFICATIONS.findIndex(x => x.id === id);
      if (idx >= 0) DEMO_NOTIFICATIONS.splice(idx, 1);
      return;
    }
    await request('DELETE', '/api/v1/dashboard/notifications/' + id);
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    if (DEMO_MODE) return {
      emailEnabled: true, smsEnabled: false, pushEnabled: true, inAppEnabled: true,
      categoryPreferences: {}, quietHoursEnabled: true,
      quietHoursStart: '21:00', quietHoursEnd: '07:00',
      timezone: 'Australia/Perth', digestEnabled: true,
      digestFrequency: 'weekly', digestTime: '08:00',
    };
    return request('GET', '/api/v1/dashboard/notifications/preferences');
  },

  updatePreferences: async (prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    if (DEMO_MODE) return { ...await notificationApi.getPreferences(), ...prefs };
    return request('PUT', '/api/v1/dashboard/notifications/preferences', prefs);
  },

  getDigest: async (): Promise<NotificationDigest> => {
    if (DEMO_MODE) return DEMO_DIGEST;
    return request('GET', '/api/v1/dashboard/notifications/ai/digest');
  },

  getInsights: async (): Promise<NotificationInsight[]> => {
    if (DEMO_MODE) return DEMO_INSIGHTS;
    return request('GET', '/api/v1/dashboard/notifications/ai/insights');
  },

  askAbout: async (question: string): Promise<{ answer: string; relatedNotifications: string[] }> => {
    if (DEMO_MODE) return {
      answer: 'Emma is progressing well through Phase 3. Liam needs a check-in due to engagement drop.',
      relatedNotifications: ['notif_1', 'notif_2'],
    };
    return request('POST', '/api/v1/dashboard/notifications/ai/ask', { question });
  },
};
