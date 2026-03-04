'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '@/lib/notification-api';
import type {
  Notification,
  NotificationPreferences,
  NotificationDigest,
  NotificationInsight,
} from '@/types/notification';

const POLL_INTERVAL_MS = 30_000;

interface UseNotificationsOptions {
  autoFetch?: boolean;
  pollUnread?: boolean;
  fetchDigest?: boolean;
  fetchInsights?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true, pollUnread = true, fetchDigest = false, fetchInsights = false } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [digest, setDigest] = useState<NotificationDigest | null>(null);
  const [insights, setInsights] = useState<NotificationInsight[]>([]);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [issyAnswer, setIssyAnswer] = useState<string | null>(null);
  const [isAskingIssy, setIsAskingIssy] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listResult, prefsResult] = await Promise.allSettled([
        notificationApi.list(1, 20),
        notificationApi.getPreferences(),
      ]);
      if (mountedRef.current) {
        if (listResult.status === 'fulfilled') {
          setNotifications(listResult.value.notifications);
          setUnreadCount(listResult.value.unreadCount);
          setTotal(listResult.value.pagination.total);
          setPage(1);
        } else {
          setError('Failed to load notifications');
        }
        if (prefsResult.status === 'fulfilled') {
          setPreferences(prefsResult.value);
        }
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    try {
      const result = await notificationApi.list(nextPage, 20);
      if (mountedRef.current) {
        setNotifications(prev => [...prev, ...result.notifications]);
        setPage(nextPage);
        setTotal(result.pagination.total);
      }
    } catch {
      /* silent */
    }
  }, [page]);

  const hasMore = notifications.length < total;

  const markAsRead = useCallback(async (id: string) => {
    await notificationApi.markAsRead(id);
    if (mountedRef.current) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, inAppStatus: 'read' as const, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationApi.markAllAsRead();
    if (mountedRef.current) {
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          inAppStatus: 'read' as const,
          readAt: n.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      const was = notifications.find(n => n.id === id);
      await notificationApi.delete(id);
      if (mountedRef.current) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setTotal(prev => prev - 1);
        if (was && was.inAppStatus === 'unread') {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    },
    [notifications],
  );

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    const updated = await notificationApi.updatePreferences(prefs);
    if (mountedRef.current) setPreferences(updated);
  }, []);

  const askIssy = useCallback(async (question: string): Promise<string> => {
    setIsAskingIssy(true);
    try {
      const result = await notificationApi.askAbout(question);
      if (mountedRef.current) setIssyAnswer(result.answer);
      return result.answer;
    } finally {
      if (mountedRef.current) setIsAskingIssy(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch) refresh();
    return () => { mountedRef.current = false; };
  }, [autoFetch, refresh]);

  useEffect(() => {
    if (!pollUnread) return;
    const interval = setInterval(async () => {
      try {
        const result = await notificationApi.unreadCount();
        if (mountedRef.current) setUnreadCount(result.unreadCount);
      } catch { /* silent */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollUnread]);

  useEffect(() => {
    if (!fetchDigest && !fetchInsights) return;
    setIsDigestLoading(true);
    const tasks: Promise<unknown>[] = [];
    if (fetchDigest) {
      tasks.push(notificationApi.getDigest().then(d => { if (mountedRef.current) setDigest(d); }));
    }
    if (fetchInsights) {
      tasks.push(notificationApi.getInsights().then(i => { if (mountedRef.current) setInsights(i); }));
    }
    Promise.allSettled(tasks).finally(() => { if (mountedRef.current) setIsDigestLoading(false); });
  }, [fetchDigest, fetchInsights]);

  return {
    notifications, unreadCount, isLoading, error,
    refresh, markAsRead, markAllAsRead, deleteNotification, loadMore, hasMore,
    preferences, updatePreferences,
    digest, insights, isDigestLoading, askIssy, issyAnswer, isAskingIssy,
  };
}
