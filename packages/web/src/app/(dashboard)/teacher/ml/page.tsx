'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { MLModel } from '@/types/teacher';
import { Brain, Cpu, TrendingUp, Activity, Shield, Sparkles, ChevronRight } from 'lucide-react';

export default function TeacherMLPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'ml' });
  const [models, setModels] = useState<MLModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.ml.getModels()
      .then((res) => setModels(res.models))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const atRiskCount = insights.filter(i => i.source === 'ml-at-risk').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="heading-2">AI & Machine Learning</h1><p className="text-muted-foreground">LIS intelligence powering your classroom</p></div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/teacher/ml/models">Models</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/ml/predictions">Predictions</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-purple-500/10 p-2"><Brain className="h-5 w-5 text-purple-500" /></div><div><p className="text-xl font-bold">{models.length}</p><p className="text-xs text-muted-foreground">Active Models</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-orange-500/10 p-2"><Activity className="h-5 w-5 text-orange-500" /></div><div><p className="text-xl font-bold">{atRiskCount}</p><p className="text-xs text-muted-foreground">At-Risk Detections</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2"><TrendingUp className="h-5 w-5 text-blue-500" /></div><div><p className="text-xl font-bold">{insights.length}</p><p className="text-xs text-muted-foreground">Active Insights</p></div></CardContent></Card>
      </div>

      {insights.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" />Live AI Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Brain className="h-4 w-4 text-purple-500 shrink-0" />
                <div className="flex-1"><p className="text-sm">{i.title}: {i.description}</p><p className="text-xs text-muted-foreground mt-1">Source: {i.source}</p></div>
                <Badge variant="outline" className="text-xs"><Shield className="h-2.5 w-2.5 mr-1" />{Math.round(i.confidence * 100)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Deployed Models</CardTitle><CardDescription>ML models running in your environment</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />) : models.length > 0 ? models.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3"><div className="flex items-center gap-3"><Cpu className="h-5 w-5 text-primary" /><div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground">{m.type} · v{m.version}</p></div></div><Badge variant={m.status === 'deployed' ? 'default' : 'secondary'} className="capitalize">{m.status}</Badge></div>
          )) : <p className="text-sm text-muted-foreground py-4 text-center">No ML models deployed.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
