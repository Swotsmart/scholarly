/**
 * useTutoring Hook
 *
 * Fetches tutor search results and booking data from the tutoring API.
 * Follows the same pattern as useParent (Promise.allSettled, error-safe).
 *
 * Backend routes:
 *   packages/api/src/routes/tutors.ts (302L)
 *   packages/api/src/routes/bookings.ts (358L)
 */

import { useEffect, useState } from 'react';
import { tutoringApi } from '@/lib/tutoring-api';
import type { TutorSearchResult, TutorSearchParams, Booking } from '@/types/tutoring';

interface TutoringData {
  tutors: TutorSearchResult[];
  upcomingBookings: Booking[];
  allBookings: Booking[];
}

export function useTutoring(searchParams?: TutorSearchParams) {
  const [data, setData] = useState<TutoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTutoringData() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          tutoringApi.searchTutors(searchParams),
          tutoringApi.getUpcomingBookings(10),
          tutoringApi.getBookings({ role: 'booker' }),
        ]);
        setData({
          tutors: results[0].status === 'fulfilled' ? results[0].value.tutors : [],
          upcomingBookings: results[1].status === 'fulfilled' ? results[1].value.bookings : [],
          allBookings: results[2].status === 'fulfilled' ? results[2].value.bookings : [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tutoring data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTutoringData();
  }, [searchParams?.subject, searchParams?.minRating, searchParams?.yearLevel]);

  return { data, isLoading, error };
}
