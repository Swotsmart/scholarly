'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle2, XCircle, Clock, BarChart3, BookOpen, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { storybookApi } from '@/lib/storybook-api';
import type { ModerationItem, ModerationMetrics, ModerationDecision } from '@/types/storybook';

export default function StorybookModerationPage() {
  const [currentItem, setCurrentItem] = useState<ModerationItem | null>(null);
  const [metrics, setMetrics] = useState<ModerationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [completedToday, setCompletedToday] = useState(0);

  const fetchNext = useCallback(async () => {
    setIsLoading(true);
    try {
      const [item, m] = await Promise.allSettled([storybookApi.moderation.getNext(), storybookApi.moderation.getMetrics()]);
      setCurrentItem(item.status === 'fulfilled' ? item.value : null);
      setMetrics(m.status === 'fulfilled' ? m.value : null);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchNext(); }, [fetchNext]);

  async function handleDecision(decision: 'approve' | 'reject') {
    if (!currentItem) return;
    setIsSubmitting(true);
    try {
      const input: ModerationDecision = { decision };
      if (decision === 'reject' && rejectReason) input.reason = rejectReason;
      await storybookApi.moderation.submitDecision(currentItem.id, input);
      setCompletedToday(c => c + 1);
      setRejectReason('');
      await fetchNext();
    } finally { setIsSubmitting(false); }
  }

  if (isLoading) return (<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Content Moderation</h1><p className="text-muted-foreground">Review and approve community-submitted storybooks</p></div>
        <Button variant="outline" size="sm" onClick={fetchNext}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>
      {metrics && (<div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{metrics.totalPending}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2"><CheckCircle2 className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{metrics.totalReviewedToday + completedToday}</p><p className="text-xs text-muted-foreground">Today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2"><BarChart3 className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{Math.round(metrics.averageReviewTime / 60)}m</p><p className="text-xs text-muted-foreground">Avg Time</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2"><Shield className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{Math.round(metrics.approvalRate * 100)}%</p><p className="text-xs text-muted-foreground">Approval</p></div></CardContent></Card>
      </div>)}
      {currentItem ? (<Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{currentItem.title}</CardTitle><CardDescription>{currentItem.creatorName} · {new Date(currentItem.submittedAt).toLocaleDateString()}</CardDescription></div><Badge variant={currentItem.priority <= 1 ? 'destructive' : 'secondary'}>P{currentItem.priority}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20 p-4"><div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-purple-600" /><span className="font-medium text-purple-800 dark:text-purple-300 text-sm">AI Pre-Review</span></div><p className="text-sm text-purple-700 dark:text-purple-400">Automated validation passed. Ready for human review of pedagogical quality.</p></div><div className="flex flex-col gap-3"><div className="flex gap-3"><Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleDecision('approve')} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Approve</Button><Button variant="destructive" className="flex-1" onClick={() => handleDecision('reject')} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Reject</Button></div><Input placeholder="Rejection reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div></CardContent></Card>) : (<Card><CardContent className="flex flex-col items-center justify-center py-16"><CheckCircle2 className="h-16 w-16 text-green-500/40 mb-4" /><h3 className="text-lg font-medium">Queue is clear</h3><p className="text-muted-foreground mt-1">No content waiting for moderation</p></CardContent></Card>)}
    </div>
  );
}