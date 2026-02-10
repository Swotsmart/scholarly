'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Target,
  Clock,
  Award,
  Tag,
  Send,
  ArrowLeft,
  Loader2,
  FileText,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { arenaApi } from '@/lib/arena-api';
import type { ContentBounty, BountySubmission } from '@/types/arena';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PUBLISHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACCEPTING: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  JUDGING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const submissionStatusColors: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RUNNER_UP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const categoryLabels: Record<string, string> = {
  PHASE_GAP: 'Phase Gap',
  THEME_GAP: 'Theme Gap',
  LANGUAGE_GAP: 'Language Gap',
  SERIES_EXTENSION: 'Series Extension',
  CULTURAL_DIVERSITY: 'Cultural Diversity',
  SEASONAL: 'Seasonal',
  COMMUNITY_REQUEST: 'Community Request',
};

function formatDeadline(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function BountyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [bounty, setBounty] = useState<ContentBounty | null>(null);
  const [submissions, setSubmissions] = useState<BountySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [storyId, setStoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [bountyRes, subsRes] = await Promise.all([
          arenaApi.getBounty(id),
          arenaApi.getBountySubmissions(id),
        ]);
        if (bountyRes.success && bountyRes.data) {
          setBounty(bountyRes.data);
        }
        if (subsRes.success && subsRes.data?.submissions) {
          setSubmissions(subsRes.data.submissions);
        }
      } catch {
        // Failed to load bounty data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSubmit() {
    if (!storyId.trim()) return;
    setSubmitting(true);
    try {
      const res = await arenaApi.submitToBounty(id, { storyId: storyId.trim() });
      if (res.success && res.data) {
        setSubmissions((prev) => [...prev, res.data]);
        setStoryId('');
      }
    } catch {
      // Submission failed
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Target className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Bounty not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/arena/bounties">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Bounties
          </Link>
        </Button>
      </div>
    );
  }

  const reward = bounty.reward as Record<string, unknown>;
  const requirements = bounty.requirements as Record<string, unknown>;
  const canSubmit = bounty.status === 'ACCEPTING' || bounty.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/arena/bounties">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Bounties
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {bounty.title}
            </h1>
          </div>
          <p className="text-muted-foreground">{bounty.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge variant="outline">
            {categoryLabels[bounty.category] || bounty.category}
          </Badge>
          <Badge className={cn('text-xs', statusColors[bounty.status] || '')}>
            {bounty.status}
          </Badge>
        </div>
      </div>

      {/* Deadline countdown */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Submission deadline: {formatDeadline(bounty.submissionDeadline)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Requirements panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(requirements).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No specific requirements listed.
              </p>
            ) : (
              <dl className="space-y-3">
                {Object.entries(requirements).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="text-sm font-medium text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="text-sm font-medium text-right">
                      {typeof value === 'boolean'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : Array.isArray(value)
                          ? value.join(', ')
                          : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Reward breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-amber-500" />
              Reward Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3">
              {Object.entries(reward).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <dt className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </dt>
                  <dd className="text-sm font-semibold">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {bounty.eligibleTiers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Eligible Tiers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bounty.eligibleTiers.map((tier) => (
                    <Badge key={tier} variant="secondary" className="text-xs">
                      {tier.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submissions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No submissions yet. Be the first to submit!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">
                      Creator
                    </th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">
                      Score
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {sub.creator?.avatarUrl ? (
                            <img
                              src={sub.creator.avatarUrl}
                              alt=""
                              className="h-6 w-6 rounded-full"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">
                            {sub.creator?.displayName || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          className={cn(
                            'text-xs',
                            submissionStatusColors[sub.status] || ''
                          )}
                        >
                          {sub.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {sub.totalScore != null ? sub.totalScore : '--'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit form */}
      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-5 w-5 text-primary" />
              Submit to Bounty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter your Story ID"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={handleSubmit} disabled={submitting || !storyId.trim()}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {bounty.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {bounty.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
