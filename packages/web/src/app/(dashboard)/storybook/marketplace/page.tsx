'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Award, BookOpen, Zap, ArrowRight, Loader2, Star, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useStorybook } from '@/hooks/use-storybook';

export default function StorybookMarketplacePage() {
  const { data, isLoading } = useStorybook({ page: 'marketplace' });

  if (isLoading) {
    return (<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }

  const creators = data?.creators ?? [];
  const bounties = data?.bounties ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creator Marketplace</h1>
        <p className="text-muted-foreground">Discover top creators, contribute storybooks, and earn from the community</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2"><Users className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div><div><p className="text-2xl font-bold">{creators.length}</p><p className="text-xs text-muted-foreground">Active Creators</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2"><Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div><div><p className="text-2xl font-bold">{bounties.filter(b => b.status === 'open').length}</p><p className="text-xs text-muted-foreground">Open Bounties</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2"><BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" /></div><div><p className="text-2xl font-bold">{data?.library.length ?? 0}</p><p className="text-xs text-muted-foreground">Published Stories</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Top Creators</CardTitle><CardDescription>Educators building the storybook library</CardDescription></div>
          <Button variant="outline" size="sm" asChild><Link href="/storybook/marketplace/creators">View All <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {creators.slice(0, 6).map(creator => (
              <div key={creator.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-10 w-10"><AvatarFallback>{creator.displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{creator.displayName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] capitalize">{creator.tier}</Badge>
                    {creator.isVerifiedEducator && <Badge variant="outline" className="text-[10px]">Verified</Badge>}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-500" />{creator.averageRating?.toFixed(1)}</div>
                  <span>{creator.totalPublished} books</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" />Content Bounties</CardTitle><CardDescription>Earn tokens by creating storybooks the community needs</CardDescription></div>
          <Button variant="outline" size="sm" asChild><Link href="/storybook/marketplace/bounties">View All <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent>
          {bounties.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No active bounties</p>
          ) : (
            <div className="space-y-3">
              {bounties.slice(0, 4).map(bounty => (
                <div key={bounty.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{bounty.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{bounty.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{bounty.category}</Badge>
                      {bounty.tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <div className="flex items-center gap-1 text-amber-600 font-bold text-sm"><Award className="h-4 w-4" />{bounty.rewardTokens}</div>
                    <p className="text-[10px] text-muted-foreground">{bounty.submissionCount} submissions</p>
                    <p className="text-[10px] text-muted-foreground">Due {new Date(bounty.submissionDeadline).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
