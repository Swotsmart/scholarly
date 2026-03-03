'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem, AIInsight } from '@/types/teacher';
import {
  CheckCircle2, Clock, FileText, AlertTriangle, Star, MessageSquare,
  Brain, Sparkles, Shield, Bot, Send, ChevronRight, Filter,
} from 'lucide-react';

export default function TeacherGradingPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'grading' });
  const [submissions, setSubmissions] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issyMessage, setIssyMessage] = useState('');
  const [issyResponse, setIssyResponse] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  useEffect(() => {
    // Fetch content items that need grading (assessments with submissions)
    teacherApi.content.list({ type: 'assessment' })
      .then((res) => setSubmissions(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const pending = submissions.filter(s => s.status === 'published');
  const overview = teacherData?.analytics?.data?.overview;

  async function handleAskIssy() {
    if (!issyMessage.trim()) return;
    setIssyThinking(true);
    try {
      const result = await teacherApi.ai.askIssy(issyMessage, {});
      setIssyResponse(result.data.message.content);
    } catch { setIssyResponse('Unable to reach AI assistant.'); }
    finally { setIssyThinking(false); setIssyMessage(''); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Grading</h1>
          <p className="text-muted-foreground">{submissions.length} items · Review and grade student work with AI assistance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/teacher/grading/pitches">Pitches</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/grading/portfolios">Portfolios</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/gradebook">Gradebook</Link></Button>
        </div>
      </div>

      {/* AI grading assistant */}
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />AI Grading Assistant</CardTitle>
          <CardDescription>Ask Issy for rubric suggestions, feedback drafts, or grading consistency checks</CardDescription>
        </CardHeader>
        <CardContent>
          {issyResponse && <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4"><p className="text-sm">{issyResponse}</p></div>}
          <div className="flex gap-2">
            <input type="text" value={issyMessage} onChange={(e) => setIssyMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder="e.g. Draft feedback for a student who scored 65% on Design Thinking quiz"
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI insight */}
      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500 shrink-0" />
              <p className="text-sm text-muted-foreground">{insights[0].description}</p>
              <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-orange-500/10 p-2"><Clock className="h-5 w-5 text-orange-500" /></div><div><p className="text-xl font-bold">{pending.length}</p><p className="text-xs text-muted-foreground">Pending Review</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-500/10 p-2"><CheckCircle2 className="h-5 w-5 text-green-500" /></div><div><p className="text-xl font-bold">{overview.averagePerformance}%</p><p className="text-xs text-muted-foreground">Class Average</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-purple-500/10 p-2"><Brain className="h-5 w-5 text-purple-500" /></div><div><p className="text-xl font-bold">{overview.engagementScore}%</p><p className="text-xs text-muted-foreground">AI Engagement</p></div></CardContent></Card>
        </div>
      )}

      {error && <Card className="border-red-200"><CardContent className="py-4"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}

      {/* Submission Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Queue</CardTitle>
          <CardDescription>Assessment items awaiting grading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : submissions.length > 0 ? (
            submissions.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.type} · {item.subject} · {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="text-xs capitalize">{item.status}</Badge>
                  <Button size="sm">Grade <ChevronRight className="ml-1 h-3 w-3" /></Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No submissions awaiting grading.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
