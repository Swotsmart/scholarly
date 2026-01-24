/**
 * Dashboard Routes
 */

import { Router } from 'express';
import { prisma } from '@scholarly/database';

export const dashboardRouter: Router = Router();

// Get dashboard summary for current user
dashboardRouter.get('/summary', async (req, res) => {
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
});

// Get activity feed
dashboardRouter.get('/activity', async (req, res) => {
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
    },
  });

  for (const booking of recentBookings) {
    activities.push({
      type: 'booking',
      title: `Booking ${booking.status}`,
      description: `Session with ${booking.tutor.user.displayName} for ${booking.subjectName}`,
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
});

// Get notifications
dashboardRouter.get('/notifications', async (req, res) => {
  // In a real app, this would come from a notifications table
  res.json({
    notifications: [],
    unreadCount: 0,
  });
});

// Get quick stats
dashboardRouter.get('/quick-stats', async (req, res) => {
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
});
