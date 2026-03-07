'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { TeacherAbsence, ReliefPrediction } from '@/types/teacher';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Users, AlertTriangle, TrendingUp, Brain, Shield, Plus } from 'lucide-react';

export default function ReliefSchedulingPage() {
  const { data: teacherData } = useTeacher({ page: 'scheduling-relief' });
  const [absences, setAbsences] = useState<TeacherAbsence[]>([]);
  const [predictions, setPredictions] = useState<ReliefPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    Promise.allSettled([
      teacherApi.scheduling.getAbsences({}),
      teacherApi.scheduling.getPredictions(startDate, endDate),
    ]).then(([absRes, predRes]) => {
      if (absRes.status === 'fulfilled') setAbsences(absRes.value.absences);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value.predictions);
    }).finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild><Link href="/teacher/scheduling"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
          <div><h1 className="heading-2">Relief Teaching</h1><p className="text-muted-foreground">Manage absences and relief coverage</p></div>
        </div>
        <Button onClick={() => toast({ title: 'Log Absence', description: 'Absence logging form will be available soon.' })}><Plus className="mr-2 h-4 w-4" />Log Absence</Button>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <Tabs defaultValue="absences">
        <TabsList><TabsTrigger value="absences">Absences ({absences.length})</TabsTrigger><TabsTrigger value="predictions"><Brain className="mr-1 h-3.5 w-3.5" />AI Predictions ({predictions.length})</TabsTrigger></TabsList>

        <TabsContent value="absences" className="space-y-3 mt-4">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : absences.length > 0 ? absences.map(a => (
            <Card key={a.id}><CardContent className="p-4"><div className="flex items-center justify-between">
              <div><p className="font-medium">{a.reason}</p><p className="text-sm text-muted-foreground">{new Date(a.startDate).toLocaleDateString()} — {new Date(a.endDate).toLocaleDateString()}</p></div>
              <Badge variant={a.status === 'covered' ? 'default' : a.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">{a.status}</Badge>
            </div></CardContent></Card>
          )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No absences recorded.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-3 mt-4">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : predictions.length > 0 ? predictions.map((p, i) => (
            <Card key={i}><CardContent className="p-4"><div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-purple-500" /><div><p className="font-medium">{p.date}</p><p className="text-sm text-muted-foreground">Predicted coverage need: {p.predictedAbsences} teachers</p></div></div>
              <Badge variant="outline"><Shield className="mr-1 h-3 w-3" />{Math.round(p.confidence * 100)}%</Badge>
            </div></CardContent></Card>
          )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No predictions available. The ML model needs historical absence data to generate forecasts.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
