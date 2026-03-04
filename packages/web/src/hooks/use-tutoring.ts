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
      const results = await Promise.allSettled([
        tutoringApi.searchTutors(searchParams),
        tutoringApi.getUpcomingBookings(10),
        tutoringApi.getBookings({ role: 'booker' }),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      setData({
        tutors: results[0].status === 'fulfilled' ? results[0].value.tutors : [],
        upcomingBookings: results[1].status === 'fulfilled' ? results[1].value.bookings : [],
        allBookings: results[2].status === 'fulfilled' ? results[2].value.bookings : [],
      });
      setIsLoading(false);
    }
    fetchTutoringData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(searchParams)]);

  return { data, isLoading, error };
}
