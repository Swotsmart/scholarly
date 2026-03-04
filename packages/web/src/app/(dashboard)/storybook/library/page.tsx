'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookOpen, Star, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { storybookApi } from '@/lib/storybook-api';
import type { StoryListItem, Pagination } from '@/types/storybook';

export default function StorybookLibraryPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchLibrary() {
      setIsLoading(true);
      try {
        const result = await storybookApi.library.list({
          search: search || undefined,
          phase: phase !== 'all' ? phase : undefined,
          page: currentPage,
          limit: 12,
        });
        setStories(result.items);
        setPagination(result.pagination);
      } catch {
        // Fallback handled by DEMO_MODE in the API client
      } finally {
        setIsLoading(false);
      }
    }
    const debounce = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(debounce);
  }, [search, phase, currentPage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Story Library</h1>
        <p className="text-muted-foreground">
          Browse curriculum-aligned, decodable storybooks by phonics phase and theme
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={phase} onValueChange={(v) => { setPhase(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Phonics Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="phase-1">Phase 1</SelectItem>
            <SelectItem value="phase-2">Phase 2</SelectItem>
            <SelectItem value="phase-3">Phase 3</SelectItem>
            <SelectItem value="phase-4">Phase 4</SelectItem>
            <SelectItem value="phase-5">Phase 5</SelectItem>
            <SelectItem value="phase-6">Phase 6</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No stories found. Try adjusting your search or filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stories.map((story) => (
              <Link key={story.id} href={`/storybook/library/${story.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <div className="aspect-[4/3] rounded-t-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-medium text-sm line-clamp-2">{story.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{story.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1 flex-wrap">
                        {story.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        {story.averageRating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {story.averageRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">by {story.creator.displayName}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
