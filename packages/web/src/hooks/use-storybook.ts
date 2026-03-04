/**
 * useStorybook Hook — Production
 *
 * Fetches core storybook data in parallel using Promise.allSettled.
 * Every storybook page gets library listings, recommendations, and
 * marketplace data — the content ecosystem is always visible.
 *
 * Data fetched (from real backend endpoints):
 *   /api/v1/storybook/library              — published storybook library
 *   /api/v1/storybook/library/recommendations — personalised recommendations
 *   /api/v1/storybook/marketplace/creators  — creator leaderboard
 *   /api/v1/storybook/marketplace/bounties  — active content bounties
 *   /api/v1/storybook/moderation/metrics    — moderation dashboard (admin only)
 *   /api/v1/storybook/languages             — supported languages
 *
 * Backend route: storybook.ts (1,224L, 20 endpoints)
 */

import { useEffect, useState } from 'react';
import { storybookApi } from '@/lib/storybook-api';
import type {
  StoryListItem,
  RecommendedStory,
  CreatorProfile,
  ContentBounty,
  ModerationMetrics,
  SupportedLanguage,
  Pagination,
} from '@/types/storybook';

interface StorybookData {
  /** Published stories from the library */
  library: StoryListItem[];
  libraryPagination: Pagination | null;
  /** AI-personalised story recommendations */
  recommendations: RecommendedStory[];
  /** Top creators */
  creators: CreatorProfile[];
  /** Active content bounties */
  bounties: ContentBounty[];
  /** Moderation metrics (admin view) */
  moderationMetrics: ModerationMetrics | null;
  /** Supported languages */
  languages: SupportedLanguage[];
}

export function useStorybook(context?: {
  page?: string;
  learnerId?: string;
  includeModeration?: boolean;
}) {
  const [data, setData] = useState<StorybookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const learnerId = context?.learnerId;
  const includeModeration = context?.includeModeration ?? false;

  useEffect(() => {
    async function fetchStorybookData() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          storybookApi.library.list({ limit: 12 }),
          storybookApi.library.getRecommendations(learnerId),
          storybookApi.marketplace.listCreators({ limit: 6 }),
          storybookApi.marketplace.listBounties({ limit: 6 }),
          includeModeration ? storybookApi.moderation.getMetrics() : Promise.resolve(null),
          storybookApi.languages.list(),
        ]);

        const libraryResult = results[0].status === 'fulfilled' ? results[0].value : null;
        const recsResult = results[1].status === 'fulfilled' ? results[1].value : null;
        const creatorsResult = results[2].status === 'fulfilled' ? results[2].value : null;
        const bountiesResult = results[3].status === 'fulfilled' ? results[3].value : null;
        const modResult = results[4].status === 'fulfilled' ? results[4].value : null;
        const langResult = results[5].status === 'fulfilled' ? results[5].value : null;

        setData({
          library: libraryResult?.items ?? [],
          libraryPagination: libraryResult?.pagination ?? null,
          recommendations: recsResult?.recommendations ?? [],
          creators: creatorsResult?.creators ?? [],
          bounties: bountiesResult?.bounties ?? [],
          moderationMetrics: modResult as ModerationMetrics | null,
          languages: langResult?.languages ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load storybook data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStorybookData();
  }, [learnerId, includeModeration]);

  return { data, isLoading, error };
}
