/**
 * Tutoring & Bookings API Client
 *
 * Backend: packages/api/src/routes/tutors.ts (302L) — 5 endpoints
 * Backend: packages/api/src/routes/bookings.ts (358L) — 6 endpoints
 */

import type {
  TutorSearchParams, TutorSearchResponse, TutorSearchResult, TutorDetail,
  TutorReviewsResponse, BookingListResponse, UpcomingBookingsResponse,
  Booking, CreateBookingInput,
} from '@/types/tutoring';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TUTORS_BASE = `${API_BASE}/api/v1/tutors`;
const BOOKINGS_BASE = `${API_BASE}/api/v1/bookings`;

// =============================================================================
// DEMO DATA — Patterson family tutoring context (Perth, WA)
// =============================================================================

const demoTutors: TutorSearchResult[] = [
  {
    tutorId: 'tutor-sarah-001', profileId: 'profile-sarah-001',
    name: 'Dr. Sarah Chen', avatarUrl: null,
    bio: 'PhD in Mathematics with 10+ years tutoring experience. Specialising in primary and secondary maths.',
    trustScore: 95,
    subjects: [{ subjectId: 'maths', subjectName: 'Mathematics' }, { subjectId: 'physics', subjectName: 'Physics' }],
    yearLevels: ['Year 3', 'Year 4', 'Year 5', 'Year 6'],
    sessionTypes: ['video', 'in_person'],
    pricing: { hourlyRate1to1: 75, currency: 'AUD' },
    metrics: { averageRating: 4.9, totalReviews: 127, totalSessions: 342, completionRate: 0.98 },
    matchScore: 95, matchReasons: ['Teaches requested subject', 'Highly rated'],
  },
  {
    tutorId: 'tutor-james-002', profileId: 'profile-james-002',
    name: 'James Wilson', avatarUrl: null,
    bio: 'Published author and former English teacher. Helping students excel in creative and academic writing.',
    trustScore: 90,
    subjects: [{ subjectId: 'english', subjectName: 'English Literature' }, { subjectId: 'writing', subjectName: 'Essay Writing' }],
    yearLevels: ['Year 4', 'Year 5', 'Year 6', 'Year 7'],
    sessionTypes: ['video'],
    pricing: { hourlyRate1to1: 65, currency: 'AUD' },
    metrics: { averageRating: 4.8, totalReviews: 89, totalSessions: 215, completionRate: 0.96 },
    matchScore: 85, matchReasons: ['Highly rated'],
  },
  {
    tutorId: 'tutor-maria-003', profileId: 'profile-maria-003',
    name: 'Maria Garcia', avatarUrl: null,
    bio: 'Native Spanish speaker with DELE certification. Making language learning fun for young learners.',
    trustScore: 88,
    subjects: [{ subjectId: 'spanish', subjectName: 'Spanish' }, { subjectId: 'french', subjectName: 'French' }],
    yearLevels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
    sessionTypes: ['video', 'in_person'],
    pricing: { hourlyRate1to1: 55, currency: 'AUD' },
    metrics: { averageRating: 5.0, totalReviews: 64, totalSessions: 180, completionRate: 0.99 },
    matchScore: 80, matchReasons: ['Perfect rating'],
  },
  {
    tutorId: 'tutor-david-004', profileId: 'profile-david-004',
    name: 'David Park', avatarUrl: null,
    bio: 'Science enthusiast based in Perth. Making complex concepts simple for primary and secondary students.',
    trustScore: 82,
    subjects: [{ subjectId: 'science', subjectName: 'Science' }, { subjectId: 'biology', subjectName: 'Biology' }],
    yearLevels: ['Year 5', 'Year 6', 'Year 7', 'Year 8'],
    sessionTypes: ['video'],
    pricing: { hourlyRate1to1: 70, currency: 'AUD' },
    metrics: { averageRating: 4.7, totalReviews: 52, totalSessions: 130, completionRate: 0.95 },
    matchScore: 75, matchReasons: ['Within budget'],
  },
];

const tomorrow = new Date(Date.now() + 86400000).toISOString();
const tomorrowEnd = new Date(Date.now() + 86400000 + 3600000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
const nextWeekEnd = new Date(Date.now() + 7 * 86400000 + 3600000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const lastWeekEnd = new Date(Date.now() - 7 * 86400000 + 3600000).toISOString();
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
const twoWeeksAgoEnd = new Date(Date.now() - 14 * 86400000 + 3600000).toISOString();
const pat = { id: 'parent-001', displayName: 'Patterson Family', avatarUrl: null };

const demoBookings: Booking[] = [
  {
    id: 'booking-001', tenantId: 'demo', status: 'confirmed',
    scheduledStart: tomorrow, scheduledEnd: tomorrowEnd,
    sessionType: 'video', subjectId: 'maths',
    learnerIds: ['child-amelia-001'], learnerNotes: 'Working on long division',
    topicsNeedingHelp: ['division', 'fractions'],
    tutor: { id: 'profile-sarah-001', userId: 'tutor-sarah-001', user: { id: 'tutor-sarah-001', displayName: 'Dr. Sarah Chen', avatarUrl: null } },
    bookedByUser: pat, session: null,
  },
  {
    id: 'booking-002', tenantId: 'demo', status: 'pending',
    scheduledStart: nextWeek, scheduledEnd: nextWeekEnd,
    sessionType: 'video', subjectId: 'english',
    learnerIds: ['child-amelia-001'], learnerNotes: null,
    topicsNeedingHelp: ['creative writing'],
    tutor: { id: 'profile-james-002', userId: 'tutor-james-002', user: { id: 'tutor-james-002', displayName: 'James Wilson', avatarUrl: null } },
    bookedByUser: pat, session: null,
  },
  {
    id: 'booking-003', tenantId: 'demo', status: 'completed',
    scheduledStart: lastWeek, scheduledEnd: lastWeekEnd,
    sessionType: 'video', subjectId: 'maths',
    learnerIds: ['child-amelia-001'], learnerNotes: 'Algebra basics',
    topicsNeedingHelp: ['algebra'],
    tutor: { id: 'profile-sarah-001', userId: 'tutor-sarah-001', user: { id: 'tutor-sarah-001', displayName: 'Dr. Sarah Chen', avatarUrl: null } },
    bookedByUser: pat, session: { id: 'session-003', status: 'completed' },
  },
  {
    id: 'booking-004', tenantId: 'demo', status: 'cancelled',
    scheduledStart: twoWeeksAgo, scheduledEnd: twoWeeksAgoEnd,
    sessionType: 'video', subjectId: 'spanish',
    learnerIds: ['child-liam-002'], learnerNotes: null,
    topicsNeedingHelp: ['greetings'],
    tutor: { id: 'profile-maria-003', userId: 'tutor-maria-003', user: { id: 'tutor-maria-003', displayName: 'Maria Garcia', avatarUrl: null } },
    bookedByUser: pat, session: null,
  },
];

// =============================================================================
// API CLIENT
// =============================================================================

class TutoringApiClient {
  private async request<T>(method: string, base: string, path: string, body?: unknown): Promise<T> {
    const url = `${base}${path}`;
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
    return response.json();
  }

  async searchTutors(params?: TutorSearchParams): Promise<TutorSearchResponse> {
    if (DEMO_MODE) {
      let filtered = [...demoTutors];
      if (params?.subject) filtered = filtered.filter(t => t.subjects.some(s => s.subjectName.toLowerCase().includes(params.subject!.toLowerCase())));
      if (params?.minRating) filtered = filtered.filter(t => t.metrics.averageRating >= params.minRating!);
      return { tutors: filtered, pagination: { page: 1, pageSize: 20, total: filtered.length } };
    }
    const qs = new URLSearchParams();
    if (params?.subject) qs.set('subject', params.subject);
    if (params?.yearLevel) qs.set('yearLevel', params.yearLevel);
    if (params?.maxPrice) qs.set('maxPrice', String(params.maxPrice));
    if (params?.minRating) qs.set('minRating', String(params.minRating));
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request('GET', TUTORS_BASE, `/search${query}`);
  }

  async getTutor(tutorId: string): Promise<{ tutor: TutorDetail }> {
    if (DEMO_MODE) {
      const m = demoTutors.find(t => t.tutorId === tutorId) || demoTutors[0];
      return { tutor: { id: m.profileId, userId: m.tutorId, user: { id: m.tutorId, displayName: m.name, avatarUrl: m.avatarUrl, bio: m.bio || undefined }, subjects: m.subjects, yearLevelsTeaching: m.yearLevels, sessionTypes: m.sessionTypes, pricing: m.pricing, metrics: m.metrics, verificationStatus: 'verified', qualifications: [], availability: [] } };
    }
    return this.request('GET', TUTORS_BASE, `/${tutorId}`);
  }

  async getTutorReviews(tutorId: string, page = 1): Promise<TutorReviewsResponse> {
    if (DEMO_MODE) return { reviews: [], pagination: { page: 1, pageSize: 20, total: 0 } };
    return this.request('GET', TUTORS_BASE, `/${tutorId}/reviews?page=${page}`);
  }

  async getBookings(params?: { status?: string; role?: string; page?: number }): Promise<BookingListResponse> {
    if (DEMO_MODE) {
      let filtered = [...demoBookings];
      if (params?.status) filtered = filtered.filter(b => b.status === params.status);
      return { bookings: filtered, pagination: { page: 1, pageSize: 20, total: filtered.length, totalPages: 1 } };
    }
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.role) qs.set('role', params.role);
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request('GET', BOOKINGS_BASE, `/${query}`);
  }

  async getUpcomingBookings(limit = 5): Promise<UpcomingBookingsResponse> {
    if (DEMO_MODE) {
      const upcoming = demoBookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
      return { bookings: upcoming.slice(0, limit) };
    }
    return this.request('GET', BOOKINGS_BASE, `/upcoming?limit=${limit}`);
  }

  async getBooking(id: string): Promise<{ booking: Booking }> {
    if (DEMO_MODE) { return { booking: demoBookings.find(b => b.id === id) || demoBookings[0] }; }
    return this.request('GET', BOOKINGS_BASE, `/${id}`);
  }

  async createBooking(input: CreateBookingInput): Promise<{ booking: Booking }> {
    return this.request('POST', BOOKINGS_BASE, '/', input);
  }

  async confirmBooking(id: string): Promise<{ booking: Booking }> {
    return this.request('POST', BOOKINGS_BASE, `/${id}/confirm`);
  }

  async cancelBooking(id: string): Promise<{ booking: Booking }> {
    return this.request('POST', BOOKINGS_BASE, `/${id}/cancel`);
  }
}

export const tutoringApi = new TutoringApiClient();
