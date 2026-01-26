'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  BookOpen,
  FileText,
  Video,
  Gamepad2,
  MonitorPlay,
} from 'lucide-react';
import { resources, HomeschoolResource } from '@/lib/homeschool-api';

const typeIcons: Record<string, React.ElementType> = {
  Textbook: BookOpen,
  Worksheet: FileText,
  Video: Video,
  Interactive: MonitorPlay,
  Game: Gamepad2,
};

const typeBadgeColors: Record<string, string> = {
  Textbook: 'bg-amber-500/10 text-amber-600',
  Worksheet: 'bg-blue-500/10 text-blue-600',
  Video: 'bg-red-500/10 text-red-600',
  Interactive: 'bg-purple-500/10 text-purple-600',
  Game: 'bg-green-500/10 text-green-600',
};

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>(
    Object.fromEntries(resources.map((r) => [r.id, r.bookmarked]))
  );

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      searchQuery === '' ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.provider.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      resource.type.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Resource Library</h1>
        <p className="text-muted-foreground">
          Discover curated educational resources for your homeschool curriculum
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources by title, subject, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="textbook">Textbooks</SelectItem>
            <SelectItem value="worksheet">Worksheets</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="interactive">Interactive</SelectItem>
            <SelectItem value="game">Games</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredResources.length} of {resources.length} resources
      </p>

      {/* Resource Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredResources.map((resource) => {
          const TypeIcon = typeIcons[resource.type] || BookOpen;
          return (
            <Card key={resource.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <Badge className={typeBadgeColors[resource.type]}>
                      {resource.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => toggleBookmark(resource.id)}
                  >
                    {bookmarked[resource.id] ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardTitle className="text-base leading-tight">
                  {resource.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{resource.subject}</Badge>
                  <Badge variant="secondary">{resource.yearLevel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <CardDescription className="line-clamp-2">
                  {resource.description}
                </CardDescription>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    by {resource.provider}
                  </p>
                  <Button className="w-full" size="sm">
                    Use Resource
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No resources found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
