'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import { ArrowLeft, Users, Building, Brain, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

export default function CapacityPlanningPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'scheduling-capacity' });
  const [pools, setPools] = useState<{ id: string; name: string; teacherCount: number; capacity: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.scheduling.getPools()
      .then((res) => setPools(res.pools.map(p => ({ id: p.id, name: p.name, teacherCount: p.teachers?.length ?? 0, capacity: p.capacity ?? 30 }))))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const overview = teacherData?.analytics?.data?.overview;
  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/scheduling"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">Capacity Planning</h1><p className="text-muted-foreground">Staffing capacity and resource allocation</p></div>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      {overview && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-xl font-bold">{overview.totalStudents}</p><p className="text-xs text-muted-foreground">Total Students</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-500/10 p-2"><TrendingUp className="h-5 w-5 text-green-500" /></div><div><p className="text-xl font-bold">{overview.attendanceRate}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2"><Building className="h-5 w-5 text-blue-500" /></div><div><p className="text-xl font-bold">{pools.length}</p><p className="text-xs text-muted-foreground">Relief Pools</p></div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Relief Pools</CardTitle><CardDescription>Staffing pool capacity and utilisation</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : pools.length > 0 ? pools.map(pool => {
            const utilisation = pool.capacity > 0 ? Math.round((pool.teacherCount / pool.capacity) * 100) : 0;
            return (
              <div key={pool.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{pool.name}</p>
                  <span className="text-sm text-muted-foreground">{pool.teacherCount} / {pool.capacity}</span>
                </div>
                <Progress value={utilisation} className="h-2" />
                {utilisation < 50 && <p className="text-xs text-orange-600 mt-1"><AlertTriangle className="inline h-3 w-3 mr-1" />Below optimal capacity</p>}
              </div>
            );
          }) : <p className="text-sm text-muted-foreground py-4 text-center">No relief pools configured.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
