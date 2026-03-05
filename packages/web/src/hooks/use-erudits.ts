/**
 * useErudits Hook
 *
 * Fetches core Erudits data in parallel: author stats, storefront items,
 * manuscripts, and book clubs. Follows the use-teacher.ts pattern.
 */

import { useEffect, useState } from 'react';
import { eruditsApi } from '@/lib/erudits-api';
import type {
  DigitalResource,
  Manuscript,
  BookClub,
  AuthorStats,
} from '@/types/erudits';

interface EruditsData {
  stats: AuthorStats | null;
  resources: DigitalResource[];
  manuscripts: Manuscript[];
  bookClubs: BookClub[];
}

export function useErudits() {
  const [data, setData] = useState<EruditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEruditsData() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          eruditsApi.stats.get(),
          eruditsApi.storefront.list({ pageSize: 6, sortBy: 'createdAt', sortOrder: 'desc' }),
          eruditsApi.publishing.list(),
          eruditsApi.bookclub.list(),
        ]);

        setData({
          stats: results[0].status === 'fulfilled' ? results[0].value : null,
          resources: results[1].status === 'fulfilled' ? results[1].value.items : [],
          manuscripts: results[2].status === 'fulfilled' ? results[2].value : [],
          bookClubs: results[3].status === 'fulfilled' ? results[3].value : [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Erudits data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchEruditsData();
  }, []);

  return { data, isLoading, error };
}
