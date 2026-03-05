'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { LearnerMasteryProfile, LearnerFeatureVector, LearnerPredictions, WellbeingCheck, AIInsight } from '@/types/teacher';
import {
  ArrowLeft, Mail, Calendar, BookOpen, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, MessageCircle, FileText, Award, Brain, Sparkles, Shield,
  Heart, Activity, Zap, Bot, Send,
} from 'lucide-react';

interface StudentDetail {
  id: string;
  displayName: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
  trustScore: number;
  status: string;
  createdAt: string;
  learnerProfile?: {
    id: string;
    gradeLevel: string;
    subjects: { name: string }[];
  };
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [mastery, setMastery] = useState<LearnerMasteryProfile | null>(null);
  const [features, setFeatures] = useState<LearnerFeatureVector | null>(null);
  const [predictions, setPredictions] = useState<LearnerPredictions | null>(null);
  const [wellbeing, setWellbeing] = useState<WellbeingCheck | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ask Issy state
  const [issyMessage, setIssyMessage] = useState('');
  const [issyResponse, setIssyResponse] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    // Fetch student profile + all AI data in parallel
    Promise.allSettled([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/users/${id}`, { credentials: 'include' }).then(r => r.json()),
      teacherApi.ai.getLearnerMastery(id),
      teacherApi.ai.getLearnerFeatures(id),
      teacherApi.ai.getLearnerPredictions(id),
      teacherApi.ai.checkWellbeing(id),
      teacherApi.ai.generatePageInsights({ page: 'student-detail', studentIds: [id] }),
    ]).then(([studentRes, masteryRes, featuresRes, predictionsRes, wellbeingRes, insightsRes]) => {
      if (studentRes.status === 'fulfilled') setStudent(studentRes.value.user);
      else setError('Unable to load student profile');
      if (masteryRes.status === 'fulfilled' && masteryRes.value.success) setMastery(masteryRes.value.data);
      if (featuresRes.status === 'fulfilled' && featuresRes.value.success) setFeatures(featuresRes.value.data);
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value.success) setPredictions(predictionsRes.value.data);
      if (wellbeingRes.status === 'fulfilled' && wellbeingRes.value.success) setWellbeing(wellbeingRes.value.data);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value);
    }).finally(() => setIsLoading(false));
  }, [id]);

  async function handleAskIssy() {
    if (!issyMessage.trim()) return;
    setIssyThinking(true);
    setIssyResponse(null);
    try {
      const result = await teacherApi.ai.askIssy(issyMessage, { learnerId: id });
      setIssyResponse(result.data.message.content);
    } catch { setIssyResponse('Unable to reach AI assistant.'); }
    finally { setIssyThinking(false); setIssyMessage(''); }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild><Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" />Back to Students</Link></Button>
        <Card className="border-red-200 dark:border-red-800"><CardContent className="p-8 text-center text-red-600 dark:text-red-400">{error || 'Student not found'}</CardContent></Card>
      </div>
    );
  }

  const struggling = mastery?.skills.filter(s => s.pKnown < 0.6) ?? [];
  const mastered = mastery?.skills.filter(s => s.pKnown >= 0.85) ?? [];
  const inProgress = mastery?.skills.filter(s => s.pKnown >= 0.6 && s.pKnown < 0.85) ?? [];
  const overallMastery = mastery?.skills.length ? Math.round(mastery.skills.reduce((sum, s) => sum + s.pKnown, 0) / mastery.skills.length * 100) : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild><Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" />Back to Students</Link></Button>

      {/* Profile Header */}
      <div className="flex items-start gap-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={student.avatarUrl || undefined} />
          <AvatarFallback className="text-lg">{student.displayName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{student.displayName}</h1>
            <Badge variant="secondary" className="capitalize">{student.status}</Badge>
            {wellbeing && !wellbeing.needsBreak && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Heart className="mr-1 h-3 w-3" />Well</Badge>}
            {wellbeing?.needsBreak && <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"><AlertTriangle className="mr-1 h-3 w-3" />Needs Break</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{student.email}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {new Date(student.createdAt).toLocaleDateString()}</span>
            {student.learnerProfile?.gradeLevel && <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{student.learnerProfile.gradeLevel}</span>}
          </div>
        </div>
        {overallMastery !== null && (
          <div className="text-right">
            <p className="text-3xl font-bold">{overallMastery}%</p>
            <p className="text-sm text-muted-foreground">Overall Mastery</p>
          </div>
        )}
      </div>

      {/* AI Insights Banner */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map(insight => (
            <Card key={insight.id} className={`border-l-4 ${insight.severity === 'critical' ? 'border-l-red-500' : insight.severity === 'positive' ? 'border-l-green-500' : insight.severity === 'warning' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Brain className="h-4 w-4 text-purple-500 shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{insight.title}</span>
                    <span className="text-sm text-muted-foreground ml-2">{insight.description}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />{Math.round(insight.confidence * 100)}%</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="mastery">
        <TabsList>
          <TabsTrigger value="mastery"><Brain className="mr-1 h-4 w-4" />BKT Mastery</TabsTrigger>
          <TabsTrigger value="features"><Activity className="mr-1 h-4 w-4" />ML Features</TabsTrigger>
          <TabsTrigger value="predictions"><Zap className="mr-1 h-4 w-4" />Predictions</TabsTrigger>
          <TabsTrigger value="wellbeing"><Heart className="mr-1 h-4 w-4" />Wellbeing</TabsTrigger>
        </TabsList>

        {/* BKT Mastery Tab */}
        <TabsContent value="mastery" className="space-y-4">
          {mastery ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{mastered.length}</p><p className="text-sm text-muted-foreground">Mastered Skills (≥85%)</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{inProgress.length}</p><p className="text-sm text-muted-foreground">In Progress (60-84%)</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{struggling.length}</p><p className="text-sm text-muted-foreground">Struggling (&lt;60%)</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Skill Mastery Breakdown</CardTitle><CardDescription>BKT probability of knowledge (pKnown) per competency</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {mastery.skills.map(skill => (
                    <div key={skill.competencyId} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-40 truncate">{skill.competencyId}</span>
                      <Progress value={skill.pKnown * 100} className="flex-1" />
                      <span className={`text-sm font-medium w-12 text-right ${skill.pKnown >= 0.85 ? 'text-green-600' : skill.pKnown >= 0.6 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {Math.round(skill.pKnown * 100)}%
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No BKT mastery data available for this student. Mastery tracking begins once the student interacts with learning content.</CardContent></Card>
          )}
        </TabsContent>

        {/* ML Features Tab */}
        <TabsContent value="features" className="space-y-4">
          {features ? (
            <Card>
              <CardHeader><CardTitle>18-Dimensional Learner Feature Vector</CardTitle><CardDescription>ML feature extraction for personalisation engine</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(features.features).map(([key, value]) => (
                    <div key={key} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
                      <p className="text-lg font-semibold">{typeof value === 'number' ? (value > 1 ? Math.round(value) : `${Math.round(value * 100)}%`) : String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No ML feature data available. Features are extracted as the student accumulates learning interactions.</CardContent></Card>
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          {predictions ? (
            <>
              <Card>
                <CardHeader><CardTitle>BKT Predictions</CardTitle><CardDescription>Predicted mastery progression based on current learning trajectory</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {predictions.predictions.map((pred, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">{pred.competencyId}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Current: {Math.round(pred.currentPKnown * 100)}%</span>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">Predicted: {Math.round(pred.predictedPKnown * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {predictions.spacedRepetition && predictions.spacedRepetition.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Spaced Repetition Schedule</CardTitle><CardDescription>Optimal review timing for long-term retention</CardDescription></CardHeader>
                  <CardContent className="space-y-2">
                    {predictions.spacedRepetition.map((item, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{item.competencyId}</span>
                        <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Review: {new Date(item.nextReviewDate).toLocaleDateString()}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No predictions available yet. The BKT engine requires sufficient interaction data to generate accurate predictions.</CardContent></Card>
          )}
        </TabsContent>

        {/* Wellbeing Tab */}
        <TabsContent value="wellbeing" className="space-y-4">
          {wellbeing ? (
            <Card>
              <CardHeader><CardTitle>Wellbeing Check</CardTitle><CardDescription>Real-time wellbeing monitoring for this learner</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Session Duration</p>
                    <p className="text-lg font-semibold">{wellbeing.sessionDuration} minutes</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Engagement Level</p>
                    <div className="flex items-center gap-2 mt-1"><Progress value={wellbeing.engagementLevel * 100} className="flex-1" /><span className="text-sm font-medium">{Math.round(wellbeing.engagementLevel * 100)}%</span></div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Needs Break?</p>
                    <p className={`text-lg font-semibold ${wellbeing.needsBreak ? 'text-orange-600' : 'text-green-600'}`}>{wellbeing.needsBreak ? 'Yes — suggest a break' : 'No — engaged and comfortable'}</p>
                  </div>
                  {wellbeing.recommendation && (
                    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 p-4">
                      <p className="text-sm text-muted-foreground">AI Recommendation</p>
                      <p className="text-sm font-medium mt-1">{wellbeing.recommendation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No wellbeing data available. Wellbeing checks are performed during active learning sessions.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Ask Issy about this student */}
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />Ask Issy about {student.firstName || student.displayName}</CardTitle>
          <CardDescription>Get AI insights about this student's progress, mastery gaps, or next steps</CardDescription>
        </CardHeader>
        <CardContent>
          {issyResponse && (
            <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4">
              <p className="text-sm">{issyResponse}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={issyMessage} onChange={(e) => setIssyMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder={`e.g. What should ${student.firstName || 'this student'} work on next?`}
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
