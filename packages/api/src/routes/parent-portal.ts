/**
 * Parent Portal Routes
 *
 * API endpoints for parent mobile app, child progress monitoring,
 * activity feeds, home activities, and family management.
 * Sprints: 11, 13
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';

const log = logger.child({ module: 'parent-portal' });

export const parentPortalRouter: Router = Router();
parentPortalRouter.use(authMiddleware);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verify that the authenticated user owns the child (via family.primaryUserId)
 * or has platform_admin role. Returns the child with family if authorized,
 * or null if the child does not exist / user is not authorized.
 */
async function verifyChildOwnership(
  childId: string,
  userId: string,
  userRoles: string[],
) {
  const child = await prisma.earlyYearsChild.findUnique({
    where: { id: childId },
    include: {
      family: {
        select: { primaryUserId: true },
      },
    },
  });

  if (!child) {
    return { child: null, error: 'not_found' as const };
  }

  const isOwner = child.family.primaryUserId === userId;
  const isAdmin = userRoles.includes('platform_admin');

  if (!isOwner && !isAdmin) {
    return { child: null, error: 'forbidden' as const };
  }

  return { child, error: null };
}

// ============================================================================
// Child Progress
// ============================================================================

parentPortalRouter.get('/:learnerId/progress', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;
    const userId = req.user!.id;
    const userRoles = req.user!.roles;

    // Ownership check
    const ownership = await verifyChildOwnership(learnerId, userId, userRoles);
    if (ownership.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Child not found' });
    }
    if (ownership.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Not authorized to view this child' });
    }

    // Fetch child with progress data
    const child = await prisma.earlyYearsChild.findUnique({
      where: { id: learnerId },
      include: {
        phonicsProgress: true,
        numeracyProgress: true,
      },
    });

    if (!child) {
      return res.status(404).json({ success: false, error: 'Child not found' });
    }

    // Calculate reading streak: count consecutive days with sessions ending today
    const now = new Date();
    let streak = 0;
    let checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    // Check up to 365 days back for the streak
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const sessionCount = await prisma.earlyYearsSession.count({
        where: {
          childId: learnerId,
          startedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      if (sessionCount > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Weekly stats: sessions from last 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklySessions = await prisma.earlyYearsSession.findMany({
      where: {
        childId: learnerId,
        startedAt: { gte: sevenDaysAgo },
      },
      select: {
        durationMinutes: true,
        starsEarned: true,
        activitiesCompleted: true,
      },
    });

    const weeklyMinutes = weeklySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const weeklyStars = weeklySessions.reduce((sum, s) => sum + s.starsEarned, 0);
    const weeklyActivitiesCompleted = weeklySessions.reduce((sum, s) => sum + s.activitiesCompleted, 0);

    // Determine mastery level from phonics progress
    let masteryLevel = 'Emerging';
    if (child.phonicsProgress) {
      const pp = child.phonicsProgress;
      const avgAccuracy = (pp.blendingAccuracy + pp.segmentingAccuracy) / 2;
      if (avgAccuracy >= 0.85) {
        masteryLevel = 'Mastering';
      } else if (avgAccuracy >= 0.65) {
        masteryLevel = 'Developing';
      } else if (avgAccuracy >= 0.4) {
        masteryLevel = 'Emerging';
      } else {
        masteryLevel = 'Beginning';
      }
    }

    // Books completed: count from phonics progress grapheme history or sight words
    const booksCompleted = child.phonicsProgress
      ? child.phonicsProgress.sightWordsMastered.length
      : 0;

    res.json({
      success: true,
      data: {
        learnerId,
        firstName: child.firstName,
        currentWorld: child.currentWorld,
        currentPhase: child.phonicsProgress?.currentPhase ?? 1,
        masteryLevel,
        readingStreak: streak,
        totalBooksRead: booksCompleted,
        totalStars: child.totalStars,
        totalLearningMinutes: child.totalLearningMinutes,
        totalSessions: child.totalSessions,
        phonicsProgress: child.phonicsProgress
          ? {
              currentPhase: child.phonicsProgress.currentPhase,
              masteredGraphemes: child.phonicsProgress.masteredGraphemes,
              introducedGraphemes: child.phonicsProgress.introducedGraphemes,
              strugglingGraphemes: child.phonicsProgress.strugglingGraphemes,
              blendingAccuracy: child.phonicsProgress.blendingAccuracy,
              segmentingAccuracy: child.phonicsProgress.segmentingAccuracy,
              sightWordsMastered: child.phonicsProgress.sightWordsMastered,
            }
          : null,
        numeracyProgress: child.numeracyProgress
          ? {
              currentLevel: child.numeracyProgress.currentLevel,
              subitizingAccuracy: child.numeracyProgress.subitizingAccuracy,
              additionAccuracy: child.numeracyProgress.additionAccuracy,
              subtractionAccuracy: child.numeracyProgress.subtractionAccuracy,
              shapesKnown: child.numeracyProgress.shapesKnown,
              reliableCountingRange: child.numeracyProgress.reliableCountingRange,
            }
          : null,
        weeklyProgress: {
          minutesLearned: weeklyMinutes,
          starsEarned: weeklyStars,
          activitiesCompleted: weeklyActivitiesCompleted,
          sessionsCount: weeklySessions.length,
        },
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch child progress');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Activity Feed
// ============================================================================

const activityFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

parentPortalRouter.get('/:learnerId/activity-feed', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;
    const userId = req.user!.id;
    const userRoles = req.user!.roles;

    // Ownership check
    const ownership = await verifyChildOwnership(learnerId, userId, userRoles);
    if (ownership.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Child not found' });
    }
    if (ownership.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Not authorized to view this child' });
    }

    // Validate pagination params
    const parsed = activityFeedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.errors,
      });
    }
    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Count total sessions for pagination
    const total = await prisma.earlyYearsSession.count({
      where: { childId: learnerId },
    });

    // Fetch paginated sessions with activities
    const sessions = await prisma.earlyYearsSession.findMany({
      where: { childId: learnerId },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      include: {
        activities: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: {
        activities: sessions.map((session) => ({
          sessionId: session.id,
          sessionType: session.sessionType,
          world: session.world,
          mentor: session.mentor,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          durationMinutes: session.durationMinutes,
          activitiesCompleted: session.activitiesCompleted,
          totalActivities: session.totalActivities,
          graphemesPracticed: session.graphemesPracticed,
          numbersPracticed: session.numbersPracticed,
          treasuresEarned: session.treasuresEarned,
          starsEarned: session.starsEarned,
          averageFocusScore: session.averageFocusScore,
          childMoodRating: session.childMoodRating,
          parentNotes: session.parentNotes,
          activities: session.activities.map((a) => ({
            id: a.id,
            activityType: a.activityType,
            targetContent: a.targetContent,
            difficulty: a.difficulty,
            startedAt: a.startedAt,
            completedAt: a.completedAt,
            durationSeconds: a.durationSeconds,
            score: a.score,
            attempts: a.attempts,
            hintsUsed: a.hintsUsed,
            treasureAwarded: a.treasureAwarded,
          })),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch activity feed');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Home Activities
// ============================================================================

parentPortalRouter.get('/:learnerId/home-activities', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;
    const userId = req.user!.id;
    const userRoles = req.user!.roles;

    // Ownership check
    const ownership = await verifyChildOwnership(learnerId, userId, userRoles);
    if (ownership.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Child not found' });
    }
    if (ownership.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Not authorized to view this child' });
    }

    // Get phonics progress to determine weak areas
    const phonicsProgress = await prisma.earlyYearsPhonicsProgress.findUnique({
      where: { childId: learnerId },
    });

    // Get numeracy progress for additional recommendations
    const numeracyProgress = await prisma.earlyYearsNumeracyProgress.findUnique({
      where: { childId: learnerId },
    });

    const recommended: Array<{
      category: string;
      title: string;
      description: string;
      difficulty: string;
      targetSkills: string[];
    }> = [];

    // Phonics-based recommendations
    if (phonicsProgress) {
      const { strugglingGraphemes, blendingAccuracy, segmentingAccuracy, currentPhase } = phonicsProgress;

      // Recommend activities for struggling graphemes
      if (strugglingGraphemes.length > 0) {
        recommended.push({
          category: 'phonics',
          title: 'Grapheme Practice',
          description: `Practice these letter sounds together: ${strugglingGraphemes.slice(0, 5).join(', ')}. Say each sound clearly and have your child repeat it while tracing the letter shape.`,
          difficulty: 'easy',
          targetSkills: strugglingGraphemes.slice(0, 5),
        });

        recommended.push({
          category: 'phonics',
          title: 'Sound Hunt',
          description: `Go on a sound hunt around the house! Find objects that start with: ${strugglingGraphemes.slice(0, 3).join(', ')}. Collect items or draw pictures of what you find.`,
          difficulty: 'easy',
          targetSkills: strugglingGraphemes.slice(0, 3),
        });
      }

      // Blending accuracy recommendations
      if (blendingAccuracy < 0.6) {
        recommended.push({
          category: 'reading',
          title: 'Blending Practice',
          description: 'Use building blocks or magnetic letters to practice blending sounds together. Start with simple CVC words (e.g., c-a-t, s-i-t, p-i-n) and slowly push the letters together as you say the word.',
          difficulty: 'medium',
          targetSkills: ['blending', 'cvc-words'],
        });
      }

      // Segmenting accuracy recommendations
      if (segmentingAccuracy < 0.6) {
        recommended.push({
          category: 'phonics',
          title: 'Sound Segmenting Game',
          description: 'Clap out the sounds in words together. Say a word slowly and clap for each sound (e.g., "d-o-g" = 3 claps). Use everyday words during meals or walks.',
          difficulty: 'medium',
          targetSkills: ['segmenting', 'phonemic-awareness'],
        });
      }

      // Phase-appropriate reading recommendations
      if (currentPhase <= 2) {
        recommended.push({
          category: 'reading',
          title: 'Shared Story Time',
          description: 'Read a picture book together and point to simple words. Let your child spot letters they know. Ask "What sound does this make?" for familiar graphemes.',
          difficulty: 'easy',
          targetSkills: ['reading', 'letter-recognition'],
        });
      } else if (currentPhase <= 4) {
        recommended.push({
          category: 'reading',
          title: 'Decodable Book Reading',
          description: 'Choose a simple decodable book and let your child try to read simple words. Help them sound out unfamiliar words using their phonics knowledge.',
          difficulty: 'medium',
          targetSkills: ['reading', 'decoding'],
        });
      }
    } else {
      // No phonics progress yet — beginner recommendations
      recommended.push({
        category: 'phonics',
        title: 'Letter Sound Introduction',
        description: 'Start by learning the first group of letter sounds: s, a, t, p, i, n. Say each sound clearly (not the letter name) and find objects around the house that start with each sound.',
        difficulty: 'easy',
        targetSkills: ['s', 'a', 't', 'p', 'i', 'n'],
      });

      recommended.push({
        category: 'reading',
        title: 'Story Time Routine',
        description: 'Read a picture book together every day. Point to words as you read them and let your child turn the pages. Ask questions about the pictures.',
        difficulty: 'easy',
        targetSkills: ['reading', 'comprehension', 'vocabulary'],
      });
    }

    // Numeracy-based recommendations
    if (numeracyProgress) {
      if (numeracyProgress.subitizingAccuracy < 0.6) {
        recommended.push({
          category: 'numeracy',
          title: 'Dot Pattern Games',
          description: 'Practice quick-seeing (subitizing) with dice, dominoes, or dot cards. Flash a pattern briefly and ask "How many?" without counting. Start with 1-3 dots and work up.',
          difficulty: 'easy',
          targetSkills: ['subitizing', 'number-sense'],
        });
      }

      if (numeracyProgress.additionAccuracy < 0.6) {
        recommended.push({
          category: 'numeracy',
          title: 'Addition with Objects',
          description: 'Use toys, fruit, or blocks to practice adding small numbers. "I have 2 apples and you give me 1 more. How many now?" Use fingers and real objects.',
          difficulty: 'medium',
          targetSkills: ['addition', 'counting'],
        });
      }

      if (numeracyProgress.shapesKnown.length < 4) {
        recommended.push({
          category: 'numeracy',
          title: 'Shape Explorer',
          description: 'Go on a shape hunt! Find circles, squares, triangles, and rectangles around your home and neighbourhood. Talk about how many sides and corners each shape has.',
          difficulty: 'easy',
          targetSkills: ['shapes', 'geometry'],
        });
      }
    } else {
      recommended.push({
        category: 'numeracy',
        title: 'Counting Together',
        description: 'Count everyday objects together — stairs, spoons, toys. Touch each item as you count. Practice counting forwards to 10 and then try counting backwards.',
        difficulty: 'easy',
        targetSkills: ['counting', 'number-sense'],
      });
    }

    // Always include a general comprehension activity
    recommended.push({
      category: 'comprehension',
      title: 'Tell Me a Story',
      description: 'After reading a book or watching a show, ask your child to retell the story in their own words. Prompt with "What happened first? Then what? How did it end?"',
      difficulty: 'easy',
      targetSkills: ['comprehension', 'oral-language', 'sequencing'],
    });

    res.json({
      success: true,
      data: {
        learnerId,
        recommended,
        categories: [...new Set(recommended.map((r) => r.category))],
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch home activities');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Family Management
// ============================================================================

parentPortalRouter.get('/family-profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Find the family for this user
    const family = await prisma.earlyYearsFamily.findFirst({
      where: {
        primaryUserId: userId,
        tenantId,
      },
      include: {
        children: {
          where: { status: 'active' },
          include: {
            phonicsProgress: true,
            numeracyProgress: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!family) {
      return res.status(404).json({ success: false, error: 'Family profile not found' });
    }

    // Get notification preferences for this user
    const notificationPreferences = await prisma.notificationPreference.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    res.json({
      success: true,
      data: {
        familyId: family.id,
        familyName: family.familyName,
        primaryLanguage: family.primaryLanguage,
        homeLanguages: family.homeLanguages,
        timezone: family.timezone,
        subscriptionTier: family.subscriptionTier,
        subscriptionStatus: family.subscriptionStatus,
        subscriptionExpiresAt: family.subscriptionExpiresAt,
        totalLearningMinutes: family.totalLearningMinutes,
        lastActiveAt: family.lastActiveAt,
        children: family.children.map((child) => ({
          id: child.id,
          firstName: child.firstName,
          preferredName: child.preferredName,
          dateOfBirth: child.dateOfBirth,
          avatarId: child.avatarId,
          currentWorld: child.currentWorld,
          currentMentor: child.currentMentor,
          totalStars: child.totalStars,
          totalTreasures: child.totalTreasures,
          totalLearningMinutes: child.totalLearningMinutes,
          totalSessions: child.totalSessions,
          currentStreak: child.currentStreak,
          longestStreak: child.longestStreak,
          lastActiveAt: child.lastActiveAt,
          phonicsProgress: child.phonicsProgress
            ? {
                currentPhase: child.phonicsProgress.currentPhase,
                masteredGraphemes: child.phonicsProgress.masteredGraphemes.length,
                blendingAccuracy: child.phonicsProgress.blendingAccuracy,
                segmentingAccuracy: child.phonicsProgress.segmentingAccuracy,
                sightWordsMastered: child.phonicsProgress.sightWordsMastered.length,
              }
            : null,
          numeracyProgress: child.numeracyProgress
            ? {
                currentLevel: child.numeracyProgress.currentLevel,
                subitizingAccuracy: child.numeracyProgress.subitizingAccuracy,
                additionAccuracy: child.numeracyProgress.additionAccuracy,
                subtractionAccuracy: child.numeracyProgress.subtractionAccuracy,
                shapesKnown: child.numeracyProgress.shapesKnown.length,
              }
            : null,
        })),
        preferences: notificationPreferences
          ? {
              emailEnabled: notificationPreferences.emailEnabled,
              pushEnabled: notificationPreferences.pushEnabled,
              inAppEnabled: notificationPreferences.inAppEnabled,
              digestEnabled: notificationPreferences.digestEnabled,
              digestFrequency: notificationPreferences.digestFrequency,
              quietHoursEnabled: notificationPreferences.quietHoursEnabled,
              quietHoursStart: notificationPreferences.quietHoursStart,
              quietHoursEnd: notificationPreferences.quietHoursEnd,
              timezone: notificationPreferences.timezone,
            }
          : {
              emailEnabled: true,
              pushEnabled: true,
              inAppEnabled: true,
              digestEnabled: false,
              digestFrequency: null,
              quietHoursEnabled: false,
              quietHoursStart: null,
              quietHoursEnd: null,
              timezone: 'Australia/Sydney',
            },
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch family profile');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Daily Digest
// ============================================================================

parentPortalRouter.get('/daily-digest', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Find the family for this user
    const family = await prisma.earlyYearsFamily.findFirst({
      where: {
        primaryUserId: userId,
        tenantId,
      },
      include: {
        children: {
          where: { status: 'active' },
          select: {
            id: true,
            firstName: true,
            preferredName: true,
            avatarId: true,
            currentWorld: true,
            totalStars: true,
          },
        },
      },
    });

    if (!family) {
      return res.status(404).json({ success: false, error: 'Family profile not found' });
    }

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's sessions for each child
    const childDigests = await Promise.all(
      family.children.map(async (child) => {
        const sessions = await prisma.earlyYearsSession.findMany({
          where: {
            childId: child.id,
            startedAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          include: {
            activities: {
              select: {
                activityType: true,
                score: true,
                treasureAwarded: true,
              },
            },
          },
          orderBy: { startedAt: 'asc' },
        });

        const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        const totalStarsToday = sessions.reduce((sum, s) => sum + s.starsEarned, 0);
        const totalTreasuresToday = sessions.reduce((sum, s) => sum + s.treasuresEarned, 0);
        const activitiesCompleted = sessions.reduce((sum, s) => sum + s.activitiesCompleted, 0);
        const allGraphemes = sessions.flatMap((s) => s.graphemesPracticed);
        const uniqueGraphemes = [...new Set(allGraphemes)];
        const allNumbers = sessions.flatMap((s) => s.numbersPracticed);
        const uniqueNumbers = [...new Set(allNumbers)];

        // Collect activity types practiced
        const activityTypes = new Set<string>();
        sessions.forEach((s) => {
          s.activities.forEach((a) => {
            activityTypes.add(a.activityType);
          });
        });

        // Build highlights for this child
        const highlights: string[] = [];
        if (sessions.length > 0) {
          highlights.push(`Completed ${sessions.length} learning session${sessions.length !== 1 ? 's' : ''}`);
        }
        if (totalMinutes > 0) {
          highlights.push(`Learned for ${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`);
        }
        if (uniqueGraphemes.length > 0) {
          highlights.push(`Practiced ${uniqueGraphemes.length} letter sound${uniqueGraphemes.length !== 1 ? 's' : ''}`);
        }
        if (uniqueNumbers.length > 0) {
          highlights.push(`Worked with ${uniqueNumbers.length} number${uniqueNumbers.length !== 1 ? 's' : ''}`);
        }
        if (totalStarsToday > 0) {
          highlights.push(`Earned ${totalStarsToday} star${totalStarsToday !== 1 ? 's' : ''}`);
        }

        return {
          childId: child.id,
          firstName: child.firstName,
          preferredName: child.preferredName,
          avatarId: child.avatarId,
          currentWorld: child.currentWorld,
          stats: {
            sessionsCount: sessions.length,
            totalMinutes,
            starsEarned: totalStarsToday,
            treasuresEarned: totalTreasuresToday,
            activitiesCompleted,
            graphemesPracticed: uniqueGraphemes,
            numbersPracticed: uniqueNumbers,
            activityTypes: [...activityTypes],
          },
          highlights,
        };
      }),
    );

    // Global highlights across all children
    const globalHighlights: string[] = [];
    const totalFamilyMinutes = childDigests.reduce((sum, c) => sum + c.stats.totalMinutes, 0);
    const totalFamilyStars = childDigests.reduce((sum, c) => sum + c.stats.starsEarned, 0);
    const activeChildren = childDigests.filter((c) => c.stats.sessionsCount > 0);

    if (activeChildren.length > 0) {
      globalHighlights.push(
        `${activeChildren.length} of ${family.children.length} child${family.children.length !== 1 ? 'ren' : ''} learned today`,
      );
    }
    if (totalFamilyMinutes > 0) {
      globalHighlights.push(`${totalFamilyMinutes} total minutes of learning across the family`);
    }
    if (totalFamilyStars > 0) {
      globalHighlights.push(`${totalFamilyStars} stars earned today`);
    }

    // Recommendations based on activity
    const recommendations: string[] = [];
    const inactiveChildren = childDigests.filter((c) => c.stats.sessionsCount === 0);
    if (inactiveChildren.length > 0) {
      const names = inactiveChildren.map((c) => c.preferredName || c.firstName).join(', ');
      recommendations.push(`${names} hasn't had a learning session today yet. A short 5-minute session can make a big difference!`);
    }
    for (const child of activeChildren) {
      if (child.stats.totalMinutes < 5) {
        recommendations.push(
          `${child.preferredName || child.firstName} had a quick session. Try extending to 10-15 minutes for the best learning outcomes.`,
        );
      }
    }

    res.json({
      success: true,
      data: {
        date: todayStart.toISOString().split('T')[0],
        familyId: family.id,
        children: childDigests,
        highlights: globalHighlights,
        recommendations,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch daily digest');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Notification Preferences
// ============================================================================

const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly']).nullable().optional(),
  digestTime: z.string().nullable().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  timezone: z.string().optional(),
  categoryPreferences: z.record(z.boolean()).optional(),
});

parentPortalRouter.put('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Validate request body
    const parsed = notificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification preferences',
        details: parsed.error.errors,
      });
    }

    const data = parsed.data;

    // Build the update/create data object, only including fields that were provided
    const upsertData: Record<string, unknown> = {};
    if (data.emailEnabled !== undefined) upsertData.emailEnabled = data.emailEnabled;
    if (data.pushEnabled !== undefined) upsertData.pushEnabled = data.pushEnabled;
    if (data.inAppEnabled !== undefined) upsertData.inAppEnabled = data.inAppEnabled;
    if (data.digestEnabled !== undefined) upsertData.digestEnabled = data.digestEnabled;
    if (data.digestFrequency !== undefined) upsertData.digestFrequency = data.digestFrequency;
    if (data.digestTime !== undefined) upsertData.digestTime = data.digestTime;
    if (data.quietHoursEnabled !== undefined) upsertData.quietHoursEnabled = data.quietHoursEnabled;
    if (data.quietHoursStart !== undefined) upsertData.quietHoursStart = data.quietHoursStart;
    if (data.quietHoursEnd !== undefined) upsertData.quietHoursEnd = data.quietHoursEnd;
    if (data.timezone !== undefined) upsertData.timezone = data.timezone;
    if (data.categoryPreferences !== undefined) upsertData.categoryPreferences = data.categoryPreferences;

    const preference = await prisma.notificationPreference.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      update: upsertData,
      create: {
        tenantId,
        userId,
        ...upsertData,
      },
    });

    res.json({
      success: true,
      data: {
        preferences: {
          emailEnabled: preference.emailEnabled,
          pushEnabled: preference.pushEnabled,
          inAppEnabled: preference.inAppEnabled,
          digestEnabled: preference.digestEnabled,
          digestFrequency: preference.digestFrequency,
          digestTime: preference.digestTime,
          quietHoursEnabled: preference.quietHoursEnabled,
          quietHoursStart: preference.quietHoursStart,
          quietHoursEnd: preference.quietHoursEnd,
          timezone: preference.timezone,
          categoryPreferences: preference.categoryPreferences,
        },
        updatedAt: preference.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to update notification preferences');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
