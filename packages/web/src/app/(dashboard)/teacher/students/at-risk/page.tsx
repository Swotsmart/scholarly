'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { AtRiskLearner } from '@/types/teacher';
import {
  AlertTriangle, TrendingDown, Clock, MessageSquare, FileText,
  Brain, Shield, ArrowLeft, ArrowRight,
} from 'lucide-react';

export default function AtRiskStudentsPage() {
  const [atRiskData, setAtRiskData] = useState<{ atRiskLearners: AtRiskLearner[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.ai.getAtRiskLearners()
      .then((res) => { if (res.success) setAtRiskData(res.data); else setError('AI engine returned unsuccessful response'); })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div>
          <h1 className="heading-2 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            At-Risk Students
          </h1>
          <p className="text-muted-foreground">
            ML-detected students requiring intervention.
            {atRiskData ? ` ${atRiskData.total} student${atRiskData.total !== 1 ? 's' : ''} flagged.` : ''}
          </p>
        </div>
      </div>

      {/* AI explainer */}
      <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              At-risk detection uses ML models that analyse engagement patterns, performance trends, attendance, and session behaviour.
              Students are flagged when confidence exceeds the threshold set in your AI settings.
            </p>
            <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 dark:border-red-800"><CardContent className="py-4"><p className="text-sm text-red-600 dark:text-red-400">Unable to load at-risk data: {error}</p></CardContent></Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-64" /></div></div></CardContent></Card>
          ))
        ) : atRiskData && atRiskData.atRiskLearners.length > 0 ? (
          atRiskData.atRiskLearners.map((learner) => {
            const prediction = learner.prediction as Record<string, unknown>;
            const severity = (prediction.severity as string) || 'medium';
            const factors = (prediction.riskFactors as string[]) || [];
            const confidencePct = Math.round(learner.confidence * 100);

            return (
              <Card key={learner.learnerId} className={severity === 'high' ? 'border-red-200 dark:border-red-800/50' : 'border-orange-200 dark:border-orange-800/50'}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                        <AlertTriangle className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">Student {learner.learnerId.slice(0, 8)}...</span>
                        <Badge variant={severity === 'high' ? 'destructive' : 'outline'} className={severity !== 'high' ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : ''}>
                          {severity} risk
                        </Badge>
                        <Badge variant="outline" className="text-xs"><Shield className="h-2.5 w-2.5 mr-1" />{confidencePct}% confidence</Badge>
                      </div>

                      {factors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {factors.map((factor) => (
                            <Badge key={factor} variant="secondary" className="text-xs">{factor}</Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground mt-2">Flagged {new Date(learner.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline"><MessageSquare className="mr-1 h-3.5 w-3.5" />Contact</Button>
                      <Button size="sm" asChild><Link href={`/teacher/students/${learner.learnerId}`}>View Profile <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No at-risk students detected. All learners are progressing within expected parameters. The ML model continuously monitors and will flag students when risk indicators are detected.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
