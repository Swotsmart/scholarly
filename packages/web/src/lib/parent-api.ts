/**
 * Parent Module API Client
 *
 * Namespaced client covering 3 backend route files:
 *   /api/v1/parent/*          -> parent-portal.ts (6 endpoints)
 *   /api/v1/subscriptions/*   -> subscriptions.ts (select endpoints relevant to parents)
 *   /api/v1/tutors/*          -> tutors.ts (search, detail, reviews)
 *
 * Follows the teacherApi pattern: class-free namespaced object, credentials:include,
 * DEMO_MODE fallback with Patterson family WA demo data.
 *
 * All methods call real backend endpoints mounted in packages/api/src/index.ts.
 * When DEMO_MODE is active (NEXT_PUBLIC_DEMO_MODE=true), returns coherent mock
 * data featuring the Patterson family in Perth, Western Australia.
 */

import type {
  ChildProgress,
  ActivityFeedResponse,
  HomeActivitiesResponse,
  FamilyProfile,
  FamilyChild,
  DailyDigest,
  NotificationUpdate,
  NotificationPreferences,
} from '@/types/parent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const V1 = `${API_BASE}/api/v1`;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// =============================================================================
// BASE REQUEST HELPER
// =============================================================================

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${V1}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).message || `${method} ${path} failed (${response.status})`);
  }
  const json = await response.json();
  return json.data ?? json;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// =============================================================================
// DEMO DATA — Patterson Family (Perth, WA)
// =============================================================================

const DEMO_CHILDREN: FamilyChild[] = [
  {
    id: 'child-emma-001',
    firstName: 'Emma',
    preferredName: 'Em',
    dateOfBirth: '2020-03-15',
    avatarId: 'avatar-unicorn',
    currentWorld: 'enchanted-forest',
    currentMentor: 'owl',
    totalStars: 2450,
    totalTreasures: 187,
    totalLearningMinutes: 4320,
    totalSessions: 156,
    currentStreak: 12,
    longestStreak: 28,
    lastActiveAt: new Date().toISOString(),
    phonicsProgress: {
      currentPhase: 3,
      masteredGraphemes: 24,
      blendingAccuracy: 0.82,
      segmentingAccuracy: 0.76,
      sightWordsMastered: 18,
    },
    numeracyProgress: {
      currentLevel: 2,
      subitizingAccuracy: 0.88,
      additionAccuracy: 0.72,
      subtractionAccuracy: 0.61,
      shapesKnown: 6,
    },
  },
  {
    id: 'child-jack-002',
    firstName: 'Jack',
    preferredName: null,
    dateOfBirth: '2022-07-22',
    avatarId: 'avatar-dinosaur',
    currentWorld: 'jungle-adventure',
    currentMentor: 'bear',
    totalStars: 680,
    totalTreasures: 42,
    totalLearningMinutes: 960,
    totalSessions: 48,
    currentStreak: 5,
    longestStreak: 9,
    lastActiveAt: new Date().toISOString(),
    phonicsProgress: {
      currentPhase: 1,
      masteredGraphemes: 8,
      blendingAccuracy: 0.45,
      segmentingAccuracy: 0.38,
      sightWordsMastered: 3,
    },
    numeracyProgress: {
      currentLevel: 1,
      subitizingAccuracy: 0.62,
      additionAccuracy: 0.35,
      subtractionAccuracy: 0.2,
      shapesKnown: 3,
    },
  },
];

const DEMO_FAMILY: FamilyProfile = {
  familyId: 'family-patterson-001',
  familyName: 'Patterson',
  primaryLanguage: 'en-AU',
  homeLanguages: ['en-AU'],
  timezone: 'Australia/Perth',
  subscriptionTier: 'family',
  subscriptionStatus: 'active',
  subscriptionExpiresAt: '2027-03-01T00:00:00Z',
  totalLearningMinutes: 5280,
  lastActiveAt: new Date().toISOString(),
  children: DEMO_CHILDREN,
  preferences: {
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    digestEnabled: true,
    digestFrequency: 'daily',
    quietHoursEnabled: true,
    quietHoursStart: '20:00',
    quietHoursEnd: '07:00',
    timezone: 'Australia/Perth',
  },
};

const DEMO_DIGEST: DailyDigest = {
  date: new Date().toISOString().split('T')[0],
  familyId: 'family-patterson-001',
  children: [
    {
      childId: 'child-emma-001',
      firstName: 'Emma',
      preferredName: 'Em',
      avatarId: 'avatar-unicorn',
      currentWorld: 'enchanted-forest',
      stats: {
        sessionsCount: 2,
        totalMinutes: 28,
        starsEarned: 45,
        treasuresEarned: 3,
        activitiesCompleted: 12,
        graphemesPracticed: ['sh', 'ch', 'th', 'ck'],
        numbersPracticed: [7, 8, 9],
        activityTypes: ['blending', 'segmenting', 'sight-word-flash'],
      },
      highlights: [
        'Completed 2 learning sessions',
        'Learned for 28 minutes',
        'Practiced 4 letter sounds',
        'Earned 45 stars',
      ],
    },
    {
      childId: 'child-jack-002',
      firstName: 'Jack',
      preferredName: null,
      avatarId: 'avatar-dinosaur',
      currentWorld: 'jungle-adventure',
      stats: {
        sessionsCount: 1,
        totalMinutes: 12,
        starsEarned: 18,
        treasuresEarned: 1,
        activitiesCompleted: 5,
        graphemesPracticed: ['s', 'a', 't'],
        numbersPracticed: [1, 2, 3],
        activityTypes: ['letter-sound', 'counting'],
      },
      highlights: [
        'Completed 1 learning session',
        'Learned for 12 minutes',
        'Practiced 3 letter sounds',
      ],
    },
  ],
  highlights: [
    '2 of 2 children learned today',
    '40 total minutes of learning across the family',
    '63 stars earned today',
  ],
  recommendations: [],
};

// =============================================================================
// NAMESPACED API CLIENT
// =============================================================================

export const parentApi = {

  // ── Family (2 endpoints) ── mount: /api/v1/parent ──
  family: {
    async getProfile(): Promise<FamilyProfile> {
      if (DEMO_MODE) return DEMO_FAMILY;
      return request('GET', '/parent/family-profile');
    },
    async getDailyDigest(): Promise<DailyDigest> {
      if (DEMO_MODE) return DEMO_DIGEST;
      return request('GET', '/parent/daily-digest');
    },
  },

  // ── Child Progress (3 endpoints) ── mount: /api/v1/parent/:learnerId/* ──
  child: {
    async getProgress(learnerId: string): Promise<ChildProgress> {
      if (DEMO_MODE) {
        const child = DEMO_CHILDREN.find(c => c.id === learnerId) || DEMO_CHILDREN[0];
        return {
          learnerId: child.id,
          firstName: child.firstName,
          currentWorld: child.currentWorld,
          currentPhase: child.phonicsProgress?.currentPhase ?? 1,
          masteryLevel: child.phonicsProgress
            ? child.phonicsProgress.blendingAccuracy >= 0.85 ? 'Mastering'
            : child.phonicsProgress.blendingAccuracy >= 0.65 ? 'Developing'
            : child.phonicsProgress.blendingAccuracy >= 0.4 ? 'Emerging'
            : 'Beginning'
            : 'Beginning',
          readingStreak: child.currentStreak,
          totalBooksRead: child.phonicsProgress?.sightWordsMastered ?? 0,
          totalStars: child.totalStars,
          totalLearningMinutes: child.totalLearningMinutes,
          totalSessions: child.totalSessions,
          phonicsProgress: child.phonicsProgress ? {
            currentPhase: child.phonicsProgress.currentPhase,
            masteredGraphemes: Array(child.phonicsProgress.masteredGraphemes).fill('').map((_, i) => `g${i}`),
            introducedGraphemes: [],
            strugglingGraphemes: [],
            blendingAccuracy: child.phonicsProgress.blendingAccuracy,
            segmentingAccuracy: child.phonicsProgress.segmentingAccuracy,
            sightWordsMastered: Array(child.phonicsProgress.sightWordsMastered).fill('').map((_, i) => `sw${i}`),
          } : null,
          numeracyProgress: child.numeracyProgress ? {
            currentLevel: child.numeracyProgress.currentLevel,
            subitizingAccuracy: child.numeracyProgress.subitizingAccuracy,
            additionAccuracy: child.numeracyProgress.additionAccuracy,
            subtractionAccuracy: child.numeracyProgress.subtractionAccuracy,
            shapesKnown: Array(child.numeracyProgress.shapesKnown).fill('').map((_, i) => `shape${i}`),
            reliableCountingRange: child.numeracyProgress.currentLevel * 10,
          } : null,
          weeklyProgress: {
            minutesLearned: Math.round(child.totalLearningMinutes / 52),
            starsEarned: Math.round(child.totalStars / 52),
            activitiesCompleted: Math.round(child.totalSessions / 4),
            sessionsCount: Math.min(child.currentStreak, 7),
          },
        };
      }
      return request('GET', `/parent/${learnerId}/progress`);
    },
    async getActivityFeed(learnerId: string, page = 1, limit = 20): Promise<ActivityFeedResponse> {
      if (DEMO_MODE) {
        return { activities: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      return request('GET', `/parent/${learnerId}/activity-feed${qs({ page, limit })}`);
    },
    async getHomeActivities(learnerId: string): Promise<HomeActivitiesResponse> {
      if (DEMO_MODE) {
        return {
          learnerId,
          recommended: [
            { category: 'phonics', title: 'Sound Hunt', description: 'Find objects starting with "sh" and "ch" sounds around your home.', difficulty: 'easy', targetSkills: ['sh', 'ch'] },
            { category: 'reading', title: 'Shared Story Time', description: 'Read a picture book together and spot familiar letter sounds.', difficulty: 'easy', targetSkills: ['reading', 'letter-recognition'] },
            { category: 'numeracy', title: 'Shape Explorer', description: 'Go on a shape hunt! Find circles, squares, and triangles.', difficulty: 'easy', targetSkills: ['shapes', 'geometry'] },
          ],
          categories: ['phonics', 'reading', 'numeracy'],
        };
      }
      return request('GET', `/parent/${learnerId}/home-activities`);
    },
  },

  // ── Notifications (1 endpoint) ── mount: /api/v1/parent ──
  notifications: {
    async update(prefs: NotificationUpdate): Promise<{ preferences: NotificationPreferences; updatedAt: string }> {
      if (DEMO_MODE) {
        return {
          preferences: { ...DEMO_FAMILY.preferences, ...prefs } as NotificationPreferences,
          updatedAt: new Date().toISOString(),
        };
      }
      return request('PUT', '/parent/notifications', prefs);
    },
  },

  // ── Subscriptions (select endpoints) ── mount: /api/v1/subscriptions ──
  subscriptions: {
    async getMySubscriptions(): Promise<{ subscriptions: unknown[] }> {
      if (DEMO_MODE) {
        return { subscriptions: [{
          id: 'sub-001',
          planName: 'Family Plan',
          status: 'active',
          currentPeriodEnd: '2027-03-01T00:00:00Z',
          amount: 14.99,
          currency: 'AUD',
          interval: 'monthly',
        }] };
      }
      return request('GET', '/subscriptions/my-subscriptions');
    },
    async getInvoices(subscriptionId: string): Promise<{ invoices: unknown[] }> {
      if (DEMO_MODE) {
        return { invoices: [
          { id: 'inv-001', amount: 14.99, currency: 'AUD', status: 'paid', paidAt: '2026-02-01', description: 'Family Plan - February 2026' },
          { id: 'inv-002', amount: 14.99, currency: 'AUD', status: 'paid', paidAt: '2026-01-01', description: 'Family Plan - January 2026' },
        ] };
      }
      return request('GET', `/subscriptions/${subscriptionId}/invoices`);
    },
  },

  // ── Tutors (for parent tutoring pages) ── mount: /api/v1/tutors ──
  tutors: {
    async search(params?: { subject?: string; page?: number }): Promise<{ tutors: unknown[]; pagination: unknown }> {
      if (DEMO_MODE) {
        return {
          tutors: [
            { id: 'tutor-001', name: 'Sarah Chen', subjects: ['Mathematics', 'Science'], rating: 4.9, reviewCount: 47, hourlyRate: 65, currency: 'AUD', location: 'Fremantle, WA', available: true },
            { id: 'tutor-002', name: 'James Wilson', subjects: ['English', 'Reading'], rating: 4.8, reviewCount: 32, hourlyRate: 55, currency: 'AUD', location: 'South Perth, WA', available: true },
            { id: 'tutor-003', name: 'Maria Garcia', subjects: ['French', 'Spanish'], rating: 4.7, reviewCount: 21, hourlyRate: 60, currency: 'AUD', location: 'Cottesloe, WA', available: false },
          ],
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        };
      }
      return request('GET', `/tutors/search${qs({ subject: params?.subject, page: params?.page })}`);
    },
    async getDetail(id: string): Promise<unknown> {
      if (DEMO_MODE) {
        return { id, name: 'Sarah Chen', subjects: ['Mathematics', 'Science'], rating: 4.9, bio: 'Experienced educator specialising in early numeracy.', location: 'Fremantle, WA' };
      }
      return request('GET', `/tutors/${id}`);
    },
    async getReviews(id: string): Promise<{ reviews: unknown[] }> {
      if (DEMO_MODE) return { reviews: [] };
      return request('GET', `/tutors/${id}/reviews`);
    },
  },
};
