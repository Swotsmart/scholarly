'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { LessonPlan, CollaborativeLessonPlan, AIInsight } from '@/types/teacher';
import {
  BookOpen, Calendar, Clock, Plus, Search, Users, Brain, Sparkles,
  Shield, Bot, Send, ChevronRight, FileText, Share2, Lightbulb,
} from 'lucide-react';

export default function LessonPlannerPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'lesson-planner' });
  const [myPlans, setMyPlans] = useState<LessonPlan[]>([]);
  const [sharedPlans, setSharedPlans] = useState<CollaborativeLessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issyMessage, setIssyMessage] = useState('');
  const [issyResponse, setIssyResponse] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      teacherApi.curriculum.getLessonPlans(),
      teacherApi.collab.getLessonPlans(),
    ]).then(([myRes, sharedRes]) => {
      if (myRes.status === 'fulfilled') setMyPlans(myRes.value.lessonPlans);
      if (sharedRes.status === 'fulfilled') setSharedPlans(sharedRes.value.lessonPlans);
    }).catch((err) => setError(err.message)).finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const filteredMy = myPlans.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));
  const filteredShared = sharedPlans.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="heading-2">Lesson Planner</h1>
          <p className="text-muted-foreground">{myPlans.length} lesson plans · AI-assisted planning and curriculum alignment</p>
        </div>
        <Button asChild><Link href="/teacher/lessons/new"><Plus className="mr-2 h-4 w-4" />New Lesson Plan</Link></Button>
      </div>

      {/* AI Lesson Assistant */}
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />AI Lesson Planning</CardTitle>
          <CardDescription>Ask Issy to generate lesson plans, suggest activities, or align content to curriculum standards</CardDescription>
        </CardHeader>
        <CardContent>
          {issyResponse && <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4"><p className="text-sm">{issyResponse}</p></div>}
          <div className="flex gap-2">
            <input type="text" value={issyMessage} onChange={(e) => setIssyMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder="e.g. Create a Year 5 maths lesson on fractions aligned to ACARA"
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {['Plan a phonics lesson for Phase 3', 'Suggest group activities for Year 6 science', 'Differentiation strategies for mixed ability'].map(s => (
              <button key={s} onClick={() => setIssyMessage(s)} className="text-xs rounded-full border px-3 py-1 text-muted-foreground hover:border-purple-300 hover:text-purple-600 transition-colors">{s}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30"><CardContent className="py-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent></Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search lesson plans..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <Card className="border-red-200"><CardContent className="py-4"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}

      <Tabs defaultValue="my-plans">
        <TabsList>
          <TabsTrigger value="my-plans"><FileText className="mr-1 h-4 w-4" />My Plans ({filteredMy.length})</TabsTrigger>
          <TabsTrigger value="shared"><Share2 className="mr-1 h-4 w-4" />Shared ({filteredShared.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-plans" className="space-y-3 mt-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : filteredMy.length > 0 ? (
            filteredMy.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-sm text-muted-foreground">{plan.subject} · {plan.yearLevel} · {new Date(plan.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.status === 'published' ? 'default' : 'secondary'} className="text-xs capitalize">{plan.status}</Badge>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No lesson plans found{search ? ` matching "${search}"` : '. Create your first plan or ask Issy to generate one.'}.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-3 mt-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : filteredShared.length > 0 ? (
            filteredShared.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2"><Users className="h-5 w-5 text-blue-500" /></div>
                      <div>
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-sm text-muted-foreground">Shared · {new Date(plan.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Fork</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No shared lesson plans available.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
