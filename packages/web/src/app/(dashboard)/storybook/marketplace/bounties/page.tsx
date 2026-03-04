'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, Clock, Users, Loader2, Plus, Calendar, Tag } from 'lucide-react';
import { storybookApi } from '@/lib/storybook-api';
import type { ContentBounty } from '@/types/storybook';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  in_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  awarded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function StorybookBountiesPage() {
  const [bounties, setBounties] = useState<ContentBounty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBounties() {
      setIsLoading(true);
      try {
        const result = await storybookApi.marketplace.listBounties({ limit: 20 });
        setBounties(result.bounties);
      } catch { /* graceful */ }
      finally { setIsLoading(false); }
    }
    fetchBounties();
  }, []);

  if (isLoading) return (<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);

  const openBounties = bounties.filter(b => b.status === 'open');
  const totalReward = openBounties.reduce((sum, b) => sum + b.rewardTokens, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Bounties</h1>
          <p className="text-muted-foreground">Create storybooks the community needs and earn tokens</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Post Bounty</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2"><Zap className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{openBounties.length}</p><p className="text-xs text-muted-foreground">Open Bounties</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2"><Award className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{totalReward.toLocaleString()}</p><p className="text-xs text-muted-foreground">Tokens Available</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2"><Users className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{bounties.reduce((sum, b) => sum + b.submissionCount, 0)}</p><p className="text-xs text-muted-foreground">Submissions</p></div></CardContent></Card>
      </div>

      {bounties.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Zap className="h-16 w-16 text-amber-500/30 mb-4" /><h3 className="text-lg font-medium">No bounties yet</h3><p className="text-muted-foreground mt-1">Be the first to post a content bounty</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {bounties.map(bounty => (
            <Card key={bounty.id}><CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{bounty.title}</h3>
                    <Badge className={STATUS_COLORS[bounty.status] || ''} variant="secondary">{bounty.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{bounty.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{bounty.category}</Badge>
                    {bounty.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
                <div className="text-right ml-6 shrink-0">
                  <div className="flex items-center gap-1 text-amber-600 font-bold text-lg"><Award className="h-5 w-5" />{bounty.rewardTokens}</div>
                  {bounty.rewardCurrency != null && <p className="text-xs text-muted-foreground">+ ${bounty.rewardCurrency}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{bounty.submissionCount} submissions</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {new Date(bounty.submissionDeadline).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Posted {new Date(bounty.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
