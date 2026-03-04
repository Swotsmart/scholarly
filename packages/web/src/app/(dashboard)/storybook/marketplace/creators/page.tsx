'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Users, BookOpen, Award, Loader2, CheckCircle2 } from 'lucide-react';
import { storybookApi } from '@/lib/storybook-api';
import type { CreatorProfile } from '@/types/storybook';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  silver: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function StorybookCreatorsPage() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      try {
        const result = await storybookApi.marketplace.listCreators({ limit: 20 });
        setCreators(result.creators);
      } catch { /* fallback via DEMO_MODE */ }
      finally { setIsLoading(false); }
    }
    fetch();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Creators</h1>
        <p className="text-muted-foreground">Educators and authors contributing to the storybook library</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creators.map((creator) => (
          <Card key={creator.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 text-lg">
                    {creator.displayName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{creator.displayName}</h3>
                    {creator.isVerifiedEducator && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                  </div>
                  <Badge className={`text-xs capitalize mt-1 ${TIER_COLORS[creator.tier] || ''}`}>
                    {creator.tier}
                  </Badge>
                </div>
              </div>

              {creator.bio && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{creator.bio}</p>
              )}

              <div className="flex flex-wrap gap-1 mt-3">
                {creator.subjects.slice(0, 3).map(s => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t text-center">
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-sm">{creator.totalPublished}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stories</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="font-bold text-sm">{creator.averageRating?.toFixed(1) ?? '—'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-bold text-sm">{creator.totalDownloads.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Reads</p>
                </div>
              </div>

              {creator.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {creator.badges.slice(0, 3).map(b => (
                    <Badge key={b} variant="secondary" className="text-xs">
                      <Award className="h-3 w-3 mr-0.5" />
                      {b.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
