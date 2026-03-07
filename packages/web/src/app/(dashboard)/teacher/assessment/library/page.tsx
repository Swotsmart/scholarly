'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { useRouter } from 'next/navigation';
import { Search, Library, ArrowLeft, Download, Star } from 'lucide-react';

export default function AssessmentLibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.content.list({ type: 'assessment' })
      .then((res) => setItems(res.items.filter(i => i.status === 'published')))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = items.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/assessment"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div>
          <h1 className="heading-2">Assessment Library</h1>
          <p className="text-muted-foreground">Browse published assessments from your school and community</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search library..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <Card className="border-red-200 dark:border-red-800"><CardContent className="py-4"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)
        ) : filtered.length > 0 ? (
          filtered.map((item) => (
            <Card key={item.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.type} · {item.subject}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
                </div>
                {item.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/teacher/assessment/builder?template=${item.id}`)}><Download className="mr-1 h-3.5 w-3.5" />Use</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No assessments found in the library{search ? ` matching "${search}"` : ''}.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
