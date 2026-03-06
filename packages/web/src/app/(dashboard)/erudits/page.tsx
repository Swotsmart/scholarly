'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  FileText,
  ShoppingBag,
  Users,
  DollarSign,
  Star,
  TrendingUp,
  PenTool,
  Library,
  ArrowRight,
  Plus,
  Upload,
  Globe,
} from 'lucide-react';
import { useErudits } from '@/hooks/use-erudits';
import type { ManuscriptStatus, ResourceStatus } from '@/types/erudits';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusColor(status: ManuscriptStatus | ResourceStatus): string {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    case 'in_review': case 'pending_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'formatting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'revision_requested': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'archived': case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

export default function EruditsHubPage() {
  const { data, isLoading, error } = useErudits();

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-400">Failed to load Erudits data: {error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Erudits Publishing</h1>
          <p className="text-muted-foreground mt-1">Your publishing hub — resources, manuscripts, book clubs, and migration tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/erudits/migrate"><Upload className="mr-2 h-4 w-4" />Migrate Site</Link>
          </Button>
          <Button asChild>
            <Link href="/erudits/publish/new"><Plus className="mr-2 h-4 w-4" />New Manuscript</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resources</p>
                  <p className="text-2xl font-bold">{data?.stats?.totalResources ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Manuscripts</p>
                  <p className="text-2xl font-bold">{data?.stats?.totalManuscripts ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">{formatCents(data?.stats?.totalRevenueCents ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales</p>
                  <p className="text-2xl font-bold">{data?.stats?.totalSales ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{data?.stats?.averageRating?.toFixed(1) ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Book Clubs</p>
                  <p className="text-2xl font-bold">{data?.stats?.bookClubCount ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/erudits/storefront" className="group">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Storefront</h3>
                <p className="text-sm text-muted-foreground">Browse & sell resources</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/erudits/publish" className="group">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <PenTool className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Publishing</h3>
                <p className="text-sm text-muted-foreground">Write & publish books</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/erudits/bookclub" className="group">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <Library className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Book Clubs</h3>
                <p className="text-sm text-muted-foreground">Join reading groups</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/erudits/migrate" className="group">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Migration</h3>
                <p className="text-sm text-muted-foreground">Import from Squarespace</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Resources */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Recent Resources
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/erudits/storefront">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : data?.resources && data.resources.length > 0 ? (
            <div className="space-y-3">
              {data.resources.slice(0, 5).map((resource) => (
                <Link key={resource.id} href={`/erudits/storefront/${resource.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{resource.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{resource.authorName}</span>
                          <span>-</span>
                          <span>{resource.format.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge className={statusColor(resource.status)}>{resource.status.replace('_', ' ')}</Badge>
                      <div className="text-right">
                        <p className="font-semibold">{formatCents(resource.priceIndividualCents)}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{resource.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No resources yet</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/erudits/storefront">Browse storefront</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manuscripts & Book Clubs side-by-side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manuscripts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Manuscripts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/erudits/publish">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : data?.manuscripts && data.manuscripts.length > 0 ? (
              <div className="space-y-3">
                {data.manuscripts.slice(0, 4).map((ms) => (
                  <Link key={ms.id} href={`/erudits/publish/${ms.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ms.title}</p>
                        <p className="text-sm text-muted-foreground">{ms.wordCount.toLocaleString()} words - {ms.chapters.length} chapters</p>
                      </div>
                      <Badge className={statusColor(ms.status)}>{ms.status.replace('_', ' ')}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No manuscripts yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/erudits/publish/new">Start writing</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Book Clubs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Book Clubs
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/erudits/bookclub">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : data?.bookClubs && data.bookClubs.length > 0 ? (
              <div className="space-y-3">
                {data.bookClubs.slice(0, 4).map((club) => (
                  <Link key={club.id} href={`/erudits/bookclub/${club.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{club.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {club.memberCount} members - {club.readingCount} readings - {Math.round(club.completionRate * 100)}% complete
                        </p>
                      </div>
                      <Badge variant={club.isActive ? 'default' : 'secondary'}>
                        {club.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No book clubs yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/erudits/bookclub">Discover clubs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
