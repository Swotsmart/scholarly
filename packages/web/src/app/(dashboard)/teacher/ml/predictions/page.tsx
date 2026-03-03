'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import { ArrowLeft, Brain, Shield, Search, TrendingUp, AlertTriangle } from 'lucide-react';

export default function MLPredictionsPage() {
  const { data: teacherData } = useTeacher({ page: 'ml-predictions' });
  const [studentId, setStudentId] = useState('');
  const [prediction, setPrediction] = useState<{ riskLevel: string; score: number; factors: string[] } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const insights = teacherData?.insights ?? [];

  async function handlePredict() {
    if (!studentId.trim()) return;
    setIsPredicting(true);
    try {
      const res = await teacherApi.ml.getStudentRisk(studentId);
      setPrediction({ riskLevel: res.riskLevel, score: res.riskScore, factors: res.riskFactors || [] });
    } catch { setPrediction(null); }
    finally { setIsPredicting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/ml"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">ML Predictions</h1><p className="text-muted-foreground">Query the prediction engine for individual student risk assessment</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Student Risk Prediction</CardTitle><CardDescription>Enter a student ID to query the ML risk model</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePredict()} placeholder="Student ID" />
            <Button onClick={handlePredict} disabled={isPredicting || !studentId.trim()}>
              {isPredicting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" /> : <Search className="mr-2 h-4 w-4" />}Predict
            </Button>
          </div>
          {prediction && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2"><Badge variant={prediction.riskLevel === 'high' ? 'destructive' : 'secondary'} className="capitalize">{prediction.riskLevel} risk</Badge><Badge variant="outline"><Shield className="mr-1 h-3 w-3" />{Math.round(prediction.score * 100)}%</Badge></div>
              {prediction.factors.length > 0 && <div className="flex flex-wrap gap-1">{prediction.factors.map(f => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Active Predictions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {insights.map(i => (
              <div key={i.id} className="flex items-center gap-3 rounded-lg border p-3"><Brain className="h-4 w-4 text-purple-500 shrink-0" /><p className="text-sm flex-1">{i.description}</p><Badge variant="outline" className="text-xs"><Shield className="h-2.5 w-2.5 mr-1" />{Math.round(i.confidence * 100)}%</Badge></div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
