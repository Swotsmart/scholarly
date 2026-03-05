'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Star,
  ShoppingBag,
  Filter,
  ArrowLeft,
  BookOpen,
  FileText,
  Headphones,
  Video,
  Image,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { DigitalResource, ResourceFormat, PaginatedResult } from '@/types/erudits';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const FORMAT_ICONS: Record<ResourceFormat, typeof BookOpen> = {
  pdf: FileText,
  docx: FileText,
  pptx: Layers,
  epub: BookOpen,
  audio_mp3: Headphones,
  audio_wav: Headphones,
  video_mp4: Video,
  image_set: Image,
  interactive: Layers,
  other: FileText,
};

const SUBJECT_FILTERS = ['All Subjects', 'French', 'Spanish', 'German', 'Italian', 'Japanese', 'Mandarin', 'Mathematics', 'Science'];
const FORMAT_FILTERS: { label: string; value: ResourceFormat | '' }[] = [
  { label: 'All Formats', value: '' },
  { label: 'PDF', value: 'pdf' },
  { label: 'EPUB', value: 'epub' },
  { label: 'Audio', value: 'audio_mp3' },
  { label: 'Video', value: 'video_mp4' },
  { label: 'Interactive', value: 'interactive' },
];

export default function StorefrontPage() {
  const [resources, setResources] = useState<DigitalResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [formatFilter, setFormatFilter] = useState<ResourceFormat | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const result = await eruditsApi.storefront.list({
          search: searchQuery || undefined,
          subjectArea: subjectFilter !== 'All Subjects' ? subjectFilter : undefined,
          format: formatFilter || undefined,
        });
        setResources(result.items);
      } catch {
        setResources([]);
      } finally {
        setIsLoading(false);
      }
    }
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, subjectFilter, formatFilter]);

  const featured = useMemo(() => resources.filter(r => r.featured), [resources]);
  const regular = useMemo(() => resources.filter(r => !r.featured), [resources]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/erudits"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Resource Storefront</h1>
          <p className="text-muted-foreground mt-1">Discover and purchase educational resources from expert authors</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
            <ChevronDown className={`ml-2 h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-lg border p-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Subject</label>
              <div className="flex flex-wrap gap-1">
                {SUBJECT_FILTERS.map((subject) => (
                  <Button
                    key={subject}
                    variant={subjectFilter === subject ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSubjectFilter(subject)}
                  >
                    {subject}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Format</label>
              <div className="flex flex-wrap gap-1">
                {FORMAT_FILTERS.map((fmt) => (
                  <Button
                    key={fmt.value}
                    variant={formatFilter === fmt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormatFilter(fmt.value)}
                  >
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No resources found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Featured Resources</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} featured />
                ))}
              </div>
            </div>
          )}

          {/* All Resources */}
          <div>
            <h2 className="text-lg font-semibold mb-3">All Resources</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(featured.length > 0 ? regular : resources).map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResourceCard({ resource, featured }: { resource: DigitalResource; featured?: boolean }) {
  const Icon = FORMAT_ICONS[resource.format] || FileText;

  return (
    <Link href={`/erudits/storefront/${resource.id}`}>
      <Card className={`group transition-all hover:shadow-md ${featured ? 'ring-2 ring-primary/20' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {featured && <Badge variant="default" className="text-xs">Featured</Badge>}
          </div>
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{resource.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{resource.shortDescription || resource.description}</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {resource.yearLevels.slice(0, 3).map((yl) => (
              <Badge key={yl} variant="secondary" className="text-xs">{yl}</Badge>
            ))}
            {resource.yearLevels.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{resource.yearLevels.length - 3}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{resource.averageRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({resource.ratingCount})</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatCents(resource.priceIndividualCents)}</p>
              <p className="text-xs text-muted-foreground">{resource.totalPurchases} sold</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">by {resource.authorName}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
