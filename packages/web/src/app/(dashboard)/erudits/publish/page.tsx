'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Plus,
  PenTool,
  FileText,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowRight,
  Clock,
  BookOpen,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { Manuscript, ManuscriptStatus } from '@/types/erudits';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusColor(status: ManuscriptStatus): string {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    case 'in_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'formatting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'revision_requested': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

function statusLabel(status: ManuscriptStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function PublishDashboardPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [analytics, setAnalytics] = useState<{ totalSales: number; totalRevenueCents: number; salesByChannel: Record<string, number> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [ms, an] = await Promise.allSettled([
          eruditsApi.publishing.list(),
          eruditsApi.publishing.getAnalytics(),
        ]);
        if (ms.status === 'fulfilled') setManuscripts(ms.value);
        if (an.status === 'fulfilled') setAnalytics(an.value);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const totalWords = manuscripts.reduce((sum, m) => sum + m.wordCount, 0);
  const totalChapters = manuscripts.reduce((sum, m) => sum + m.chapters.length, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/erudits"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Publishing Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your manuscripts, track sales, and publish to multiple channels</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/erudits/publish/new"><Plus className="mr-2 h-4 w-4" />New Manuscript</Link>
        </Button>
      </div>

      {/* Sales Metrics */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCents(analytics?.totalRevenueCents ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{analytics?.totalSales ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <PenTool className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Words</p>
                  <p className="text-2xl font-bold">{totalWords.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chapters</p>
                  <p className="text-2xl font-bold">{totalChapters}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales by Channel */}
      {analytics && Object.keys(analytics.salesByChannel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Sales by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.salesByChannel).map(([channel, count]) => {
                const percent = analytics.totalSales > 0 ? (count / analytics.totalSales) * 100 : 0;
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{channel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span className="text-muted-foreground">{count} sales ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manuscripts List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manuscripts
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/erudits/publish/new"><Plus className="mr-1 h-3 w-3" />New</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : manuscripts.length > 0 ? (
            <div className="space-y-3">
              {manuscripts.map((ms) => (
                <Link key={ms.id} href={`/erudits/publish/${ms.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{ms.title}</p>
                        {ms.subtitle && <p className="text-sm text-muted-foreground truncate">{ms.subtitle}</p>}
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{ms.wordCount.toLocaleString()} words</span>
                          <span>{ms.chapters.length} chapters</span>
                          <span>{ms.pageCountEstimate} pages (est.)</span>
                          {ms.language && <span className="uppercase">{ms.language}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge className={statusColor(ms.status)}>{statusLabel(ms.status)}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(ms.updatedAt).toLocaleDateString()}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">No manuscripts yet</p>
              <p className="text-sm mt-1">Start your first manuscript to begin publishing</p>
              <Button className="mt-4" asChild>
                <Link href="/erudits/publish/new"><Plus className="mr-2 h-4 w-4" />Create Manuscript</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
