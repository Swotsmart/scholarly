/**
 * useTutoring Hook
 *
 * Fetches tutor search results, booking data, completed sessions, and reviews
 * from the tutoring API. Follows the same pattern as useParent
 * (Promise.allSettled, error-safe).
 *
 * Accepts an optional `sections` config to avoid over-fetching on pages that
 * only need a subset of the data (e.g. materials/shared only need isLoading).
 *
 * Backend routes:
 *   packages/api/src/routes/tutors.ts (302L)
 *   packages/api/src/routes/bookings.ts (358L)
 */

import { useEffect, useState } from 'react';
import { tutoringApi } from '@/lib/tutoring-api';
import type { TutorSearchResult, TutorSearchParams, Booking, TutorReview } from '@/types/tutoring';

interface TutoringData {
  tutors: TutorSearchResult[];
  upcomingBookings: Booking[];
  allBookings: Booking[];
  completedBookings: Booking[];
  pendingBookings: Booking[];
  cancelledBookings: Booking[];
  reviews: TutorReview[];
}

export type TutoringSection = 'search' | 'bookings' | 'reviews';

/**
 * @param searchParams - tutor search parameters
 * @param sections - which data sections to fetch. Defaults to all.
 *   - 'search': fetches tutor search results
 *   - 'bookings': fetches upcoming + all + completed + pending + cancelled bookings
 *   - 'reviews': fetches tutor reviews (requires search results)
 */
export function useTutoring(searchParams?: TutorSearchParams, sections?: TutoringSection[]) {
  const [data, setData] = useState<TutoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const need = (s: TutoringSection) => !sections || sections.includes(s);

    async function fetchTutoringData() {
      setIsLoading(true);
      setError(null);

      const promises: Promise<unknown>[] = [
        // 0: search tutors (always lightweight)
        need('search') ? tutoringApi.searchTutors(searchParams) : Promise.resolve({ tutors: [] }),
        // 1-5: bookings
        need('bookings') ? tutoringApi.getUpcomingBookings(10) : Promise.resolve({ bookings: [] }),
        need('bookings') ? tutoringApi.getBookings({ role: 'booker' }) : Promise.resolve({ bookings: [] }),
        need('bookings') ? tutoringApi.getBookings({ status: 'completed' }) : Promise.resolve({ bookings: [] }),
        need('bookings') ? tutoringApi.getBookings({ status: 'pending' }) : Promise.resolve({ bookings: [] }),
        need('bookings') ? tutoringApi.getBookings({ status: 'cancelled' }) : Promise.resolve({ bookings: [] }),
      ];

      const results = await Promise.allSettled(promises);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      type SearchRes = { tutors: TutorSearchResult[] };
      type BookingRes = { bookings: Booking[] };

      const tutors = results[0].status === 'fulfilled' ? (results[0].value as SearchRes).tutors : [];

      // Fetch reviews using the first tutor from search results
      let reviews: TutorReview[] = [];
      if (need('reviews') && tutors[0]) {
        try {
          const reviewResult = await tutoringApi.getTutorReviews(tutors[0].tutorId);
          reviews = reviewResult.reviews;
        } catch { /* reviews are non-critical */ }
      }

      setData({
        tutors,
        upcomingBookings: results[1].status === 'fulfilled' ? (results[1].value as BookingRes).bookings : [],
        allBookings: results[2].status === 'fulfilled' ? (results[2].value as BookingRes).bookings : [],
        completedBookings: results[3].status === 'fulfilled' ? (results[3].value as BookingRes).bookings : [],
        pendingBookings: results[4].status === 'fulfilled' ? (results[4].value as BookingRes).bookings : [],
        cancelledBookings: results[5].status === 'fulfilled' ? (results[5].value as BookingRes).bookings : [],
        reviews,
      });
      setIsLoading(false);
    }
    fetchTutoringData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams), sections?.sort().join(',')]);

  return { data, isLoading, error };
}
