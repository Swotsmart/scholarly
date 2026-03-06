/**
 * useTutoring Hook
 *
 * Fetches tutor search results, booking data, completed sessions, and reviews
 * from the tutoring API. Follows the same pattern as useParent
 * (Promise.allSettled, error-safe).
 *
 * Pass `options` to fetch only the data a page actually needs — omitted or
 * `true` fields retain the default (fetch), while `false` skips the call and
 * returns an empty array for that field instead.
 *
 * Backend routes:
 *   packages/api/src/routes/tutors.ts (302L)
 *   packages/api/src/routes/bookings.ts (358L)
 */

import { useCallback, useEffect, useState } from 'react';
import { tutoringApi } from '@/lib/tutoring-api';
import type { TutorSearchResult, TutorSearchParams, Booking, TutorReview } from '@/types/tutoring';

export interface UseTutoringOptions {
  /** Fetch tutor search results (also gates the sequential review fetch). Defaults to true. */
  fetchTutors?: boolean;
  /** Fetch upcoming bookings. Defaults to true. */
  fetchUpcomingBookings?: boolean;
  /** Fetch all bookings (role: booker). Defaults to true. */
  fetchAllBookings?: boolean;
  /** Fetch completed bookings. Defaults to true. */
  fetchCompletedBookings?: boolean;
  /** Fetch pending bookings. Defaults to true. */
  fetchPendingBookings?: boolean;
  /** Fetch cancelled bookings. Defaults to true. */
  fetchCancelledBookings?: boolean;
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

const EMPTY_BOOKINGS = Promise.resolve({ bookings: [] as Booking[] });
const EMPTY_TUTORS = Promise.resolve({ tutors: [] as TutorSearchResult[] });

export function useTutoring(searchParams?: TutorSearchParams, options: UseTutoringOptions = {}) {
  const {
    fetchTutors = true,
    fetchUpcomingBookings = true,
    fetchAllBookings = true,
    fetchCompletedBookings = true,
    fetchPendingBookings = true,
    fetchCancelledBookings = true,
  } = options;

  const hasFetches = fetchTutors || fetchUpcomingBookings || fetchAllBookings ||
    fetchCompletedBookings || fetchPendingBookings || fetchCancelledBookings;

  const [data, setData] = useState<TutoringData | null>(null);
  const [isLoading, setIsLoading] = useState(hasFetches);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFetches) return;

    async function fetchTutoringData() {
      setIsLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        fetchTutors ? tutoringApi.searchTutors(searchParams) : EMPTY_TUTORS,
        fetchUpcomingBookings ? tutoringApi.getUpcomingBookings(10) : EMPTY_BOOKINGS,
        fetchAllBookings ? tutoringApi.getBookings({ role: 'booker' }) : EMPTY_BOOKINGS,
        fetchCompletedBookings ? tutoringApi.getBookings({ status: 'completed' }) : EMPTY_BOOKINGS,
        fetchPendingBookings ? tutoringApi.getBookings({ status: 'pending' }) : EMPTY_BOOKINGS,
        fetchCancelledBookings ? tutoringApi.getBookings({ status: 'cancelled' }) : EMPTY_BOOKINGS,
      ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

      // Reuse the search result from index 0 to fetch reviews for the first tutor
      const tutors = results[0].status === 'fulfilled' ? results[0].value.tutors : [];
      let reviews: TutorReview[] = [];
      if (fetchTutors && tutors[0]) {
        try {
          const reviewResult = await tutoringApi.getTutorReviews(tutors[0].tutorId);
          reviews = reviewResult.reviews;
        } catch { /* reviews are non-critical */ }
      }

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
  }, [JSON.stringify(searchParams), fetchTutors, fetchUpcomingBookings, fetchAllBookings,
    fetchCompletedBookings, fetchPendingBookings, fetchCancelledBookings]);

  return { data, isLoading, error, refetch: fetchTutoringData };
}
