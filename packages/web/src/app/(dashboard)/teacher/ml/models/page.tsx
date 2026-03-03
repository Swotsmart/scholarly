'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { MLModel } from '@/types/teacher';
import { ArrowLeft, Cpu, Play } from 'lucide-react';

export default function MLModelsPage() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [training, setTraining] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.ml.getModels().then((res) => setModels(res.models)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  async function handleTrain(id: string) {
    setTraining(id);
    try { await teacherApi.ml.trainModel(id); } catch {} finally { setTraining(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/ml"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">ML Models</h1><p className="text-muted-foreground">{models.length} models</p></div>
      </div>
      <div className="space-y-3">
        {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />) : models.length > 0 ? models.map(m => (
          <Card key={m.id}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Cpu className="h-5 w-5 text-primary" /><div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground">{m.type} · v{m.version} · {m.status}</p></div></div><Button size="sm" variant="outline" onClick={() => handleTrain(m.id)} disabled={training === m.id}>{training === m.id ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-1" /> : <Play className="mr-1 h-3.5 w-3.5" />}Retrain</Button></div></CardContent></Card>
        )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No ML models deployed.</CardContent></Card>}
      </div>
    </div>
  );
}
