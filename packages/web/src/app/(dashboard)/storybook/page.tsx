'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BookOpen, Plus, Star, TrendingUp, Users, Sparkles, Search,
  Loader2, ArrowRight, Award, BookMarked, Zap, Globe,
} from 'lucide-react';
import Link from 'next/link';
import { useStorybook } from '@/hooks/use-storybook';

export default function StorybookDashboardPage() {
  const { data, isLoading } = useStorybook({ page: 'dashboard' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const library = data?.library ?? [];
  const recommendations = data?.recommendations ?? [];
  const creators = data?.creators ?? [];
  const bounties = data?.bounties ?? [];
  const languages = data?.languages ?? [];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Storybook Engine</h1>
            <p className="text-white/80 max-w-2xl">
              A living library of curriculum-aligned, decodable storybooks powered by AI.
              Every story targets specific grapheme-phoneme correspondences and adapts to each learner&apos;s mastery profile.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-sm">
                <BookOpen className="h-4 w-4" />
                <span className="font-semibold">{data?.libraryPagination?.total ?? library.length}</span>
                <span className="text-white/70">stories</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{creators.length}</span>
                <span className="text-white/70">creators</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Globe className="h-4 w-4" />
                <span className="font-semibold">{languages.length}</span>
                <span className="text-white/70">languages</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/storybook/library">
                <Search className="h-4 w-4 mr-1" />
                Browse Library
              </Link>
            </Button>
            <Button size="sm" className="bg-white/20 border-0 hover:bg-white/30 text-white" asChild>
              <Link href="/storybook/create">
                <Plus className="h-4 w-4 mr-1" />
                Create Story
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Recommended for Your Learners</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.slice(0, 3).map((rec) => (
              <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">{rec.title}</CardTitle>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0 ml-2">
                      {Math.round(rec.matchScore * 100)}% match
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{rec.matchReason}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {rec.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    {rec.averageRating && (
                      <div className="flex items-center gap-1 text-sm text-yellow-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {rec.averageRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Library Additions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Latest Stories</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/storybook/library">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {library.slice(0, 4).map((story) => (
            <Card key={story.id} className="hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] rounded-t-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{story.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{story.creator.displayName}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {story.tags.slice(0, 1).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {story.averageRating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {story.averageRating.toFixed(1)}
                      </span>
                    )}
                    <span>{story.downloadCount} reads</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Creators */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Top Creators</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/storybook/marketplace/creators">View All</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {creators.slice(0, 4).map((creator, i) => (
                <div key={creator.id} className="flex items-center gap-3 p-4">
                  <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900/30">
                      {creator.displayName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{creator.displayName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs capitalize">{creator.tier}</Badge>
                      <span>{creator.totalPublished} stories</span>
                      {creator.averageRating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {creator.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  {creator.isVerifiedEducator && (
                    <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Active Bounties */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold">Content Bounties</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/storybook/marketplace/bounties">View All</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {bounties.slice(0, 3).map((bounty) => (
                <div key={bounty.id} className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-sm">{bounty.title}</h3>
                    <Badge variant={bounty.status === 'open' ? 'default' : 'secondary'} className="text-xs capitalize shrink-0 ml-2">
                      {bounty.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{bounty.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-purple-600">{bounty.rewardTokens} tokens</span>
                      {bounty.rewardCurrency && (
                        <span className="text-muted-foreground">+ ${bounty.rewardCurrency}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{bounty.submissionCount} submissions</span>
                  </div>
                </div>
              ))}
              {bounties.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active bounties yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
