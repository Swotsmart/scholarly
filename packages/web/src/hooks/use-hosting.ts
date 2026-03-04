/**
 * useHosting Hook
 *
 * Fetches hosting platform data for the current provider:
 *   - Provider profile (identity, domains, features, theme)
 *   - Quality profile (scores, accreditations, outcomes, ratings)
 *   - Enquiries (incoming leads)
 *   - Tour bookings
 *   - Reviews
 *
 * The hosting module is provider-centric — unlike Homeschool (family) or
 * Golden Path (learner), the anchor entity here is the HostingEducationalProvider.
 * Most sub-fetches depend on having a providerId.
 *
 * Usage:
 *   const { provider, quality, enquiries, tours, reviews, isLoading } = useHosting('provider-123');
 *   // providerId is required — omitting it sets an error state:
 *   const { error } = useHosting(); // error: "No providerId supplied"
 */

import { useState, useEffect, useCallback } from 'react';
import { hostingApi } from '@/lib/hosting-api';
import type {
  HostingEducationalProvider,
  HostingEducationalQualityProfile,
  HostingEnquiry,
  HostingTourBooking,
  HostingProviderReview,
} from '@/types/hosting';

// =============================================================================
// TYPES
// =============================================================================

export interface HostingState {
  /** The full provider profile including domains, locations, features */
  provider: HostingEducationalProvider | null;
  /** Quality scores, accreditations, verified outcomes, ratings */
  quality: HostingEducationalQualityProfile | null;
  /** Incoming enquiries from parents/agents */
  enquiries: HostingEnquiry[] | null;
  /** Scheduled tour bookings */
  tours: HostingTourBooking[] | null;
  /** Published and pending reviews */
  reviews: HostingProviderReview[] | null;
  /** True while any fetch is in progress */
  isLoading: boolean;
  /** Error message if any fetch failed (partial failures are combined) */
  error: string | null;
  /** Re-fetch all data */
  refresh: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useHosting(
  providerId?: string,
  options?: {
    /** Fetch enquiries. Default true. */
    fetchEnquiries?: boolean;
    /** Fetch tour bookings. Default true. */
    fetchTours?: boolean;
    /** Fetch reviews. Default true. */
    fetchReviews?: boolean;
    /** Enquiry status filter. Default undefined (all). */
    enquiryStatus?: string;
    /** Review status filter. Default 'published'. */
    reviewStatus?: string;
  },
): HostingState {
  const [provider, setProvider] = useState<HostingEducationalProvider | null>(null);
  const [quality, setQuality] = useState<HostingEducationalQualityProfile | null>(null);
  const [enquiries, setEnquiries] = useState<HostingEnquiry[] | null>(null);
  const [tours, setTours] = useState<HostingTourBooking[] | null>(null);
  const [reviews, setReviews] = useState<HostingProviderReview[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchEnquiries = true,
    fetchTours = true,
    fetchReviews = true,
    enquiryStatus,
    reviewStatus = 'published',
  } = options ?? {};

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get the provider profile. This is the anchor — everything
      // else needs the provider ID. Think of it as unlocking the front door
      // before you can see what's inside the rooms.
      let resolvedProvider: HostingEducationalProvider | null = null;

      if (!providerId) {
        setError('No providerId supplied. Pass a providerId to useHosting().');
        setIsLoading(false);
        return;
      }

      try {
        resolvedProvider = await hostingApi.getProvider(providerId);
      } catch (e) {
        setError(`Provider: ${e instanceof Error ? e.message : 'Failed to load'}`);
        setIsLoading(false);
        return;
      }

      setProvider(resolvedProvider);

      if (!resolvedProvider) {
        setError(`Provider ${providerId} not found.`);
        setIsLoading(false);
        return;
      }

      const pid = resolvedProvider.id;

      // Step 2: Fetch everything else in parallel
      const fetches: Array<Promise<{ key: string; result: unknown }>> = [
        hostingApi.getQualityProfile(pid).then(r => ({ key: 'quality', result: r })),
      ];

      if (fetchEnquiries) {
        fetches.push(
          hostingApi.getEnquiries(pid, { status: enquiryStatus }).then(r => ({ key: 'enquiries', result: r })),
        );
      }

      if (fetchTours) {
        fetches.push(
          hostingApi.getTourBookings(pid, { upcoming: true }).then(r => ({ key: 'tours', result: r })),
        );
      }

      if (fetchReviews) {
        fetches.push(
          hostingApi.getReviews(pid, { status: reviewStatus }).then(r => ({ key: 'reviews', result: r })),
        );
      }

      const results = await Promise.allSettled(fetches);
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { key, result: data } = result.value;
          switch (key) {
            case 'quality': setQuality(data as HostingEducationalQualityProfile); break;
            case 'enquiries': setEnquiries(data as HostingEnquiry[]); break;
            case 'tours': setTours(data as HostingTourBooking[]); break;
            case 'reviews': setReviews(data as HostingProviderReview[]); break;
          }
        } else {
          errors.push(String(result.reason));
        }
      }

      if (errors.length > 0) setError(errors.join('; '));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosting data');
    } finally {
      setIsLoading(false);
    }
  }, [providerId, fetchEnquiries, fetchTours, fetchReviews, enquiryStatus, reviewStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { provider, quality, enquiries, tours, reviews, isLoading, error, refresh: fetchData };
}
