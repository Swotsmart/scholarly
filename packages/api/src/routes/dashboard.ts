/**
 * Dashboard Routes
 */

import { Router } from 'express';
import { prisma } from '@scholarly/database';

export const dashboardRouter: Router = Router();

// Get dashboard summary for current user
dashboardRouter.get('/summary', async (req, res) => {
  try {
  const { tenantId, user } = req;

  const roles = user?.roles || [];

  const userSummary: Record<string, unknown> = {
    id: user?.id,
    roles,
    tokenBalance: 0,
    trustScore: 0,
  };

  // Get user details
  const fullUser = await prisma.user.findUnique({
    where: { id: user?.id },
    select: {
      tokenBalance: true,
      trustScore: true,
    },
  });

  if (fullUser) {
    userSummary.tokenBalance = fullUser.tokenBalance;
    userSummary.trustScore = fullUser.trustScore;
  }

  const summary: Record<string, unknown> = {
    user: userSummary,
  };

  // Role-specific data
  if (roles.includes('learner') || roles.includes('parent')) {
    // Upcoming sessions
    const upcomingSessions = await prisma.tutoringSession.findMany({
      where: {
        tenantId,
        OR: [
          { tutorUserId: user?.id },
          { participants: { some: { learnerProfile: { userId: user?.id } } } },
        ],
        scheduledStart: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] },
      },
      take: 5,
      include: {
        tutorUser: {
          select: { displayName: true, avatarUrl: true },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    summary.upcomingSessions = upcomingSessions;

    // Recent content purchases
    const recentPurchases = await prisma.contentPurchase.findMany({
      where: {
        tenantId,
        buyerId: user?.id,
      },
      take: 5,
      include: {
        content: {
          select: { id: true, title: true, type: true, thumbnailUrl: true },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    summary.recentPurchases = recentPurchases;
  }

  if (roles.includes('tutor_professional') || roles.includes('tutor_university') || roles.includes('tutor_peer')) {
    // Tutor stats
    const tutorProfile = await prisma.tutorProfile.findFirst({
      where: { userId: user?.id },
    });

    if (tutorProfile) {
      summary.tutorStats = tutorProfile.metrics;

      // Pending bookings
      const pendingBookings = await prisma.booking.count({
        where: {
          tutorId: tutorProfile.id,
          status: 'pending',
        },
      });

      summary.pendingBookings = pendingBookings;

      // This month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyEarnings = await prisma.tutoringSession.aggregate({
        where: {
          tutorProfileId: tutorProfile.id,
          status: 'completed',
          actualEnd: { gte: startOfMonth },
        },
        _sum: { tutorEarnings: true },
      });

      summary.monthlyEarnings = monthlyEarnings._sum.tutorEarnings || 0;
    }
  }

  if (roles.includes('content_creator')) {
    const creatorProfile = await prisma.creatorProfile.findFirst({
      where: { userId: user?.id },
    });

    if (creatorProfile) {
      summary.creatorStats = {
        totalContent: creatorProfile.totalContent,
        totalSales: creatorProfile.totalSales,
        totalDownloads: creatorProfile.totalDownloads,
        averageRating: creatorProfile.averageRating,
        totalEarnings: creatorProfile.totalEarnings,
        level: creatorProfile.level,
      };
    }
  }

  if (roles.includes('homeschool_parent')) {
    const family = await prisma.homeschoolFamily.findFirst({
      where: {
        tenantId,
        primaryContactUserId: user?.id,
      },
      include: {
        children: true,
        coopMemberships: {
          include: {
            coop: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (family) {
      summary.homeschool = {
        childrenCount: family.children.length,
        coopsJoined: family.coopMemberships.length,
        compliance: family.compliance,
      };
    }

    // Upcoming excursions
    const upcomingExcursions = await prisma.excursion.findMany({
      where: {
        tenantId,
        date: { gte: new Date() },
        status: { in: ['open', 'confirmed'] },
      },
      take: 3,
      orderBy: { date: 'asc' },
    });

    summary.upcomingExcursions = upcomingExcursions;
  }

  if (roles.includes('school_admin') || roles.includes('micro_school_admin')) {
    // School admin stats
    const schools = await prisma.microSchool.findMany({
      where: {
        tenantId,
        founderId: user?.id,
      },
      include: {
        _count: {
          select: { students: true, staff: true, applications: true },
        },
      },
    });

    if (schools.length > 0) {
      summary.schools = schools.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        studentCount: s._count.students,
        staffCount: s._count.staff,
        pendingApplications: s._count.applications,
      }));
    }
  }

  if (roles.includes('platform_admin')) {
    // Platform-wide stats
    const [userCount, tutorCount, contentCount, bookingCount] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.tutorProfile.count({ where: { user: { tenantId } } }),
      prisma.content.count({ where: { tenantId, status: 'published' } }),
      prisma.booking.count({ where: { tenantId } }),
    ]);

    summary.platformStats = {
      userCount,
      tutorCount,
      contentCount,
      bookingCount,
    };
  }

  res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Get activity feed
dashboardRouter.get('/activity', async (req, res) => {
  try {
  const { tenantId, user } = req;
  const { limit = '20' } = req.query;

  // Combine recent activities from different sources
  const activities: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }> = [];

  // Recent bookings
  const recentBookings = await prisma.booking.findMany({
    where: {
      tenantId,
      OR: [
        { bookedByUserId: user?.id },
        { tutor: { userId: user?.id } },
      ],
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      tutor: {
        include: {
          user: { select: { displayName: true } },
        },
      },
      subject: { select: { name: true } },
    },
  });

  for (const booking of recentBookings) {
    activities.push({
      type: 'booking',
      title: `Booking ${booking.status}`,
      description: `Session with ${booking.tutor.user.displayName} for ${booking.subject.name}`,
      timestamp: booking.createdAt,
      data: { bookingId: booking.id },
    });
  }

  // Recent content purchases
  const recentPurchases = await prisma.contentPurchase.findMany({
    where: {
      tenantId,
      buyerId: user?.id,
    },
    take: 5,
    orderBy: { purchasedAt: 'desc' },
    include: {
      content: { select: { title: true } },
    },
  });

  for (const purchase of recentPurchases) {
    activities.push({
      type: 'purchase',
      title: 'Content purchased',
      description: purchase.content.title,
      timestamp: purchase.purchasedAt,
      data: { contentId: purchase.contentId },
    });
  }

  // Sort by timestamp
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({ activities: activities.slice(0, parseInt(limit as string)) });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Get notifications
dashboardRouter.get('/notifications', async (req, res) => {
  try {
  const { user } = req;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as string | undefined; // 'unread', 'read', or undefined for all

  const where: Record<string, unknown> = { userId: user?.id };
  if (status === 'unread') {
    where.inAppStatus = 'unread';
  } else if (status === 'read') {
    where.inAppStatus = 'read';
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: user?.id, inAppStatus: 'unread' },
    }),
  ]);

  res.json({
    notifications,
    unreadCount,
    pagination: { page, limit, total },
  });
  } catch (error) {
    console.error('Dashboard notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count (lightweight polling endpoint)
dashboardRouter.get('/notifications/count', async (req, res) => {
  try {
  const { user } = req;
  const unreadCount = await prisma.notification.count({
    where: { userId: user?.id, inAppStatus: 'unread' },
  });
  res.json({ unreadCount });
  } catch (error) {
    console.error('Dashboard notification count error:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
});

// Mark single notification as read
dashboardRouter.patch('/notifications/:id/read', async (req, res) => {
  try {
  const { user } = req;
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: user?.id },
    data: { inAppStatus: 'read', readAt: new Date() },
  });
  res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
dashboardRouter.patch('/notifications/read-all', async (req, res) => {
  try {
  const { user } = req;
  const result = await prisma.notification.updateMany({
    where: { userId: user?.id, inAppStatus: 'unread' },
    data: { inAppStatus: 'read', readAt: new Date() },
  });
  res.json({ count: result.count });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete (soft-archive) a notification
dashboardRouter.delete('/notifications/:id', async (req, res) => {
  try {
  const { user } = req;
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: user?.id },
    data: { inAppStatus: 'archived' },
  });
  res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification preferences
dashboardRouter.get('/notifications/preferences', async (req, res) => {
  try {
  const { user, tenantId } = req;
  const prefs = await prisma.notificationPreference.findFirst({
    where: { userId: user?.id, tenantId },
  });
  if (!prefs) {
    res.json({
      emailEnabled: true, smsEnabled: false, pushEnabled: true, inAppEnabled: true,
      categoryPreferences: {}, quietHoursEnabled: false,
      quietHoursStart: null, quietHoursEnd: null,
      timezone: 'Australia/Perth', digestEnabled: false,
      digestFrequency: null, digestTime: null,
    });
    return;
  }
  res.json(prefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
dashboardRouter.put('/notifications/preferences', async (req, res) => {
  try {
  const { user, tenantId } = req;
  const data = req.body;
  const prefs = await prisma.notificationPreference.upsert({
    where: {
      userId_tenantId: { userId: user?.id || '', tenantId: tenantId || '' },
    },
    create: { userId: user?.id || '', tenantId: tenantId || '', ...data },
    update: data,
  });
  res.json(prefs);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// --- AI Intelligence Endpoints ---

// AI Digest: Summarise recent notifications into actionable sections
dashboardRouter.get('/notifications/ai/digest', async (req, res) => {
  try {
  const { user } = req;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const recent = await prisma.notification.findMany({
    where: { userId: user?.id, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const groups: Record<string, typeof recent> = {};
  for (const n of recent) {
    const prefix = n.type.split('_')[0] || 'other';
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(n);
  }

  const sectionNames: Record<string, string> = {
    learning: 'Learning Progress', wellbeing: 'Wellbeing',
    parent: 'Communication', storybook: 'Content',
    payment: 'Payments', system: 'System', auth: 'Security',
    subscription: 'Subscription', arena: 'Challenges',
    content: 'Content Creation', governance: 'Governance',
  };
  const sectionIcons: Record<string, string> = {
    learning: 'graduation-cap', wellbeing: 'heart',
    parent: 'message-square', storybook: 'book-open',
    payment: 'credit-card', system: 'settings', auth: 'shield',
    subscription: 'star', arena: 'trophy',
    content: 'pen-tool', governance: 'vote',
  };

  const sections = Object.entries(groups).map(([prefix, items]) => ({
    title: sectionNames[prefix] || prefix,
    icon: sectionIcons[prefix] || 'bell',
    items: items.slice(0, 5).map(n => ({
      notificationId: n.id, summary: n.title, priority: n.priority,
    })),
    suggestedAction: items.some(n => n.priority === 'high' || n.priority === 'urgent')
      ? 'Review high-priority items in this category.' : null,
  }));

  const highPriority = recent.filter(n => n.priority === 'high' || n.priority === 'urgent');
  const summary = highPriority.length > 0
    ? `${highPriority.length} item${highPriority.length > 1 ? 's' : ''} need attention this week.`
    : `${recent.length} notifications this week. Nothing urgent.`;

  res.json({ summary, sections, generatedAt: new Date().toISOString(),
    periodStart: sevenDaysAgo.toISOString(), periodEnd: new Date().toISOString() });
  } catch (error) {
    console.error('AI digest error:', error);
    res.status(500).json({ error: 'Failed to generate notification digest' });
  }
});

// AI Insights: Pattern detection from notification history
dashboardRouter.get('/notifications/ai/insights', async (req, res) => {
  try {
  const { user } = req;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const recent = await prisma.notification.findMany({
    where: { userId: user?.id, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const insights: Array<{ id: string; type: string; title: string;
    description: string; actionLabel: string | null; actionUrl: string | null; createdAt: string }> = [];

  const wellbeingAlerts = recent.filter(n => n.type === 'wellbeing_alert');
  if (wellbeingAlerts.length >= 2) {
    insights.push({
      id: 'insight_wellbeing_' + Date.now(), type: 'pattern',
      title: `${wellbeingAlerts.length} wellbeing alerts this month`,
      description: 'Multiple wellbeing alerts may indicate a pattern worth investigating.',
      actionLabel: 'View Wellbeing Dashboard', actionUrl: '/teacher/wellbeing',
      createdAt: new Date().toISOString(),
    });
  }

  const unreadCount = recent.filter(n => n.inAppStatus === 'unread').length;
  if (unreadCount > 10) {
    insights.push({
      id: 'insight_unread_' + Date.now(), type: 'recommendation',
      title: `${unreadCount} unread notifications`,
      description: 'Consider enabling daily digests to stay on top of notifications.',
      actionLabel: 'Update Preferences', actionUrl: '/notifications',
      createdAt: new Date().toISOString(),
    });
  }

  const paymentFailures = recent.filter(n => n.type === 'payment_failed');
  if (paymentFailures.length > 0) {
    insights.push({
      id: 'insight_payment_' + Date.now(), type: 'anomaly',
      title: 'Payment issue detected',
      description: 'A payment failure was recorded. Check your payment method.',
      actionLabel: 'Check Payment', actionUrl: '/settings/billing',
      createdAt: new Date().toISOString(),
    });
  }

  res.json(insights);
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ error: 'Failed to generate notification insights' });
  }
});

// AI Ask: Natural language query about notifications
dashboardRouter.post('/notifications/ai/ask', async (req, res) => {
  try {
  const { user } = req;
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  const recent = await prisma.notification.findMany({
    where: { userId: user?.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const highPriority = recent.filter(n => n.priority === 'high' || n.priority === 'urgent');
  const unread = recent.filter(n => n.inAppStatus === 'unread');
  const types = [...new Set(recent.map(n => n.type))];

  let answer = `You have ${unread.length} unread notification${unread.length !== 1 ? 's' : ''}.`;
  if (highPriority.length > 0) {
    answer += ` ${highPriority.length} need attention: `;
    answer += highPriority.slice(0, 3).map(n => n.title).join(', ') + '.';
  }
  if (types.includes('wellbeing_alert')) answer += ' There are wellbeing concerns that may need follow-up.';
  if (types.includes('learning_milestone')) answer += ' Great news: learning milestones were achieved!';

  res.json({ answer, relatedNotifications: highPriority.slice(0, 5).map(n => n.id) });
  } catch (error) {
    console.error('AI ask error:', error);
    res.status(500).json({ error: 'Failed to process notification question' });
  }
});


// Get quick stats
dashboardRouter.get('/quick-stats', async (req, res) => {
  try {
  const { tenantId } = req;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    activeTutors,
    publishedContent,
    todayBookings,
    activeFamilies,
  ] = await Promise.all([
    prisma.tutorProfile.count({
      where: {
        user: { tenantId, status: 'active' },
        verificationStatus: 'verified',
      },
    }),
    prisma.content.count({
      where: { tenantId, status: 'published' },
    }),
    prisma.booking.count({
      where: {
        tenantId,
        scheduledStart: { gte: today },
      },
    }),
    prisma.homeschoolFamily.count({
      where: { tenantId, status: 'active' },
    }),
  ]);

  res.json({
    stats: {
      activeTutors,
      publishedContent,
      todayBookings,
      activeFamilies,
    },
  });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({ error: 'Failed to fetch quick stats' });
  }
});
