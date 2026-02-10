'use client';

import { useState, useEffect } from 'react';
import { Target, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { ArenaInsightPanel, BountyCard } from '@/components/arena';
import { arenaApi } from '@/lib/arena-api';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import type { ContentBounty, BountyCategory, BountyStatus } from '@/types/arena';

const CATEGORY_OPTIONS: { value: BountyCategory; label: string }[] = [
  { value: 'PHASE_GAP', label: 'Phase Gap' },
  { value: 'THEME_GAP', label: 'Theme Gap' },
  { value: 'LANGUAGE_GAP', label: 'Language Gap' },
  { value: 'SERIES_EXTENSION', label: 'Series Extension' },
  { value: 'CULTURAL_DIVERSITY', label: 'Cultural Diversity' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'COMMUNITY_REQUEST', label: 'Community Request' },
];

const STATUS_OPTIONS: { value: BountyStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ACCEPTING', label: 'Accepting' },
  { value: 'JUDGING', label: 'Judging' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function BountiesPage() {
  const [bounties, setBounties] = useState<ContentBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { insights, recommendations } = useArenaIntelligence({
    context: 'bounties',
    bounties,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await arenaApi.listBounties();
        if (res.success && res.data?.bounties) {
          setBounties(res.data.bounties);
        }
      } catch {
        // Failed to load bounties
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = bounties.filter((b) => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Bounties"
        description="Create content and earn rewards"
        actions={
          <Target className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        }
      />

      <ArenaInsightPanel insights={insights} recommendations={recommendations} />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            No bounties match your filters. Check back soon for new content
            opportunities!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}
