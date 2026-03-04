/**
 * Tutoring & Bookings Types
 *
 * Route: packages/api/src/routes/tutors.ts (302L)
 *   GET  /tutors/search, GET /tutors/:id, GET /tutors/:id/availability,
 *   GET  /tutors/:id/reviews, PATCH /tutors/:id
 *
 * Route: packages/api/src/routes/bookings.ts (358L)
 *   GET  /bookings, GET /bookings/upcoming, GET /bookings/:id,
 *   POST /bookings, POST /bookings/:id/confirm, POST /bookings/:id/cancel
 */

// Shared
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email?: string;
  bio?: string;
  trustScore?: number;
}

// Tutor Search
export interface TutorSearchParams {
  subject?: string;
  yearLevel?: string;
  sessionType?: string;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  pageSize?: number;
}

export interface TutorSearchResult {
  tutorId: string;
  profileId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  trustScore: number;
  subjects: TutorSubject[];
  yearLevels: string[];
  sessionTypes: string[];
  pricing: TutorPricing;
  metrics: TutorMetrics;
  matchScore: number;
  matchReasons: string[];
}

export interface TutorSubject {
  subjectId: string;
  subjectName: string;
}

export interface TutorPricing {
  hourlyRate1to1: number;
  hourlyRateGroup?: number;
  currency?: string;
}

export interface TutorMetrics {
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  completionRate: number;
  responseTime?: number;
}

export interface TutorSearchResponse {
  tutors: TutorSearchResult[];
  pagination: Pagination;
}

// Tutor Detail
export interface TutorDetail {
  id: string;
  userId: string;
  user: UserSummary;
  subjects: TutorSubject[];
  yearLevelsTeaching: string[];
  sessionTypes: string[];
  pricing: TutorPricing;
  metrics: TutorMetrics;
  verificationStatus: string;
  qualifications: string[];
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Tutor Reviews
export interface TutorReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: UserSummary;
}

export interface TutorReviewsResponse {
  reviews: TutorReview[];
  pagination: Pagination;
}

// Bookings
export interface Booking {
  id: string;
  tenantId: string;
  status: BookingStatus;
  scheduledStart: string;
  scheduledEnd: string;
  sessionType: string;
  subjectId: string;
  learnerIds: string[];
  learnerNotes: string | null;
  topicsNeedingHelp: string[];
  tutor: {
    id: string;
    userId: string;
    user: UserSummary;
    subjects?: TutorSubject[];
  };
  bookedByUser: UserSummary;
  session: { id: string; status: string } | null;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface BookingListResponse {
  bookings: Booking[];
  pagination: Pagination;
}

export interface UpcomingBookingsResponse {
  bookings: Booking[];
}

export interface CreateBookingInput {
  tutorId: string;
  learnerIds: string[];
  scheduledStart: string;
  duration: number;
  sessionType: string;
  subjectId: string;
  topicsNeedingHelp?: string[];
  curriculumCodes?: string[];
  learnerNotes?: string;
  openToOthers?: boolean;
  maxGroupSize?: number;
}
