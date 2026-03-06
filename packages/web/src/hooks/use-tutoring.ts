/**
 * useTutoring Hook
 *
 * Fetches tutor search results, booking data, completed sessions, and reviews
 * from the tutoring API. Follows the same pattern as useParent
 * (Promise.allSettled, error-safe).
 *
 * Backend routes:
 *   packages/api/src/routes/tutors.ts (302L)
 *   packages/api/src/routes/bookings.ts (358L)
 */

import { useCallback, useEffect, useState } from 'react';
import { tutoringApi } from '@/lib/tutoring-api';
import type { TutorSearchResult, TutorSearchParams, Booking, TutorReview } from '@/types/tutoring';

export interface TutoringFetchOptions {
  /** Fetch tutor search results (default: true) */
  tutors?: boolean;
  /** Fetch upcoming bookings (default: true) */
  upcomingBookings?: boolean;
  /** Fetch all bookings (default: true) */
  allBookings?: boolean;
  /** Fetch completed/pending/cancelled booking breakdowns (default: true) */
  bookingBreakdown?: boolean;
  /** Fetch reviews for first tutor result (default: true) */
  reviews?: boolean;
}

interface TutoringData {
  tutors: TutorSearchResult[];
  upcomingBookings: Booking[];
  allBookings: Booking[];
  completedBookings: Booking[];
  pendingBookings: Booking[];
  cancelledBookings: Booking[];
  reviews: TutorReview[];
}

export function useTutoring(searchParams?: TutorSearchParams, options?: TutoringFetchOptions) {
  const {
    tutors: fetchTutors = true,
    upcomingBookings: fetchUpcoming = true,
    allBookings: fetchAll = true,
    bookingBreakdown: fetchBreakdown = true,
    reviews: fetchReviews = true,
  } = options ?? {};

  const [data, setData] = useState<TutoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutoringData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const promises: Promise<unknown>[] = [];
    const indices = { tutors: -1, upcoming: -1, all: -1, completed: -1, pending: -1, cancelled: -1 };
    let idx = 0;

    if (fetchTutors) { promises.push(tutoringApi.searchTutors(searchParams)); indices.tutors = idx++; }
    if (fetchUpcoming) { promises.push(tutoringApi.getUpcomingBookings(10)); indices.upcoming = idx++; }
    if (fetchAll) { promises.push(tutoringApi.getBookings({ role: 'booker' })); indices.all = idx++; }
    if (fetchBreakdown) {
      promises.push(tutoringApi.getBookings({ status: 'completed' })); indices.completed = idx++;
      promises.push(tutoringApi.getBookings({ status: 'pending' })); indices.pending = idx++;
      promises.push(tutoringApi.getBookings({ status: 'cancelled' })); indices.cancelled = idx++;
    }

    const results = await Promise.allSettled(promises);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    const get = <T,>(i: number): T | null =>
      i >= 0 && results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : null;

    const tutorList = (get<{ tutors: TutorSearchResult[] }>(indices.tutors)?.tutors) ?? [];
    let reviews: TutorReview[] = [];
    if (fetchReviews && tutorList[0]) {
      try {
        const reviewResult = await tutoringApi.getTutorReviews(tutorList[0].tutorId);
        reviews = reviewResult.reviews;
      } catch { /* reviews are non-critical */ }
    }

    setData({
      tutors: tutorList,
      upcomingBookings: (get<{ bookings: Booking[] }>(indices.upcoming)?.bookings) ?? [],
      allBookings: (get<{ bookings: Booking[] }>(indices.all)?.bookings) ?? [],
      completedBookings: (get<{ bookings: Booking[] }>(indices.completed)?.bookings) ?? [],
      pendingBookings: (get<{ bookings: Booking[] }>(indices.pending)?.bookings) ?? [],
      cancelledBookings: (get<{ bookings: Booking[] }>(indices.cancelled)?.bookings) ?? [],
      reviews,
    });
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams), fetchTutors, fetchUpcoming, fetchAll, fetchBreakdown, fetchReviews]);

  useEffect(() => {
    fetchTutoringData();
  }, [fetchTutoringData]);

  return { data, isLoading, error, refetch: fetchTutoringData };
}
