'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Star,
  Download,
  ShoppingCart,
  Play,
  FileText,
  Video,
  Headphones,
  Image,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api, Content, PaginatedResponse } from '@/lib/api';
import { formatCurrency, getInitials } from '@/lib/utils';

const contentTypes = [
  { value: 'all', label: 'All Types', icon: Package },
  { value: 'document', label: 'Documents', icon: FileText },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'audio', label: 'Audio', icon: Headphones },
  { value: 'interactive', label: 'Interactive', icon: Play },
  { value: 'image', label: 'Images', icon: Image },
];

const subjects = [
  'All Subjects',
  'Mathematics',
  'English',
  'Science',
  'History',
  'Geography',
  'Languages',
  'Arts',
];

const yearLevels = [
  'All Year Levels',
  'Foundation',
  'Year 1-2',
  'Year 3-4',
  'Year 5-6',
  'Year 7-8',
  'Year 9-10',
  'Year 11-12',
];

const priceFilters = [
  { value: 'all', label: 'All Prices' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'freemium', label: 'Freemium' },
];

export default function ContentPage() {
  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState('all');
  const [subject, setSubject] = useState('All Subjects');
  const [yearLevel, setYearLevel] = useState('All Year Levels');
  const [priceFilter, setPriceFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['content', search, contentType, subject, yearLevel, priceFilter],
    queryFn: () =>
      api.get<PaginatedResponse<Content>>('/content', {
        search: search || undefined,
        type: contentType !== 'all' ? contentType : undefined,
        subject: subject !== 'All Subjects' ? subject : undefined,
        yearLevel: yearLevel !== 'All Year Levels' ? yearLevel : undefined,
        pricingType: priceFilter !== 'all' ? priceFilter : undefined,
      }),
  });

  const contents = data?.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Content Marketplace</h1>
          <p className="text-muted-foreground">
            Discover curriculum-aligned educational resources
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for worksheets, videos, lesson plans..."
            className="pl-10 h-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Content Type Tabs */}
        <Tabs value={contentType} onValueChange={setContentType}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {contentTypes.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="gap-2">
                <type.icon className="h-4 w-4" />
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearLevel} onValueChange={setYearLevel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent>
              {yearLevels.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              {priceFilters.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ContentCardSkeleton key={i} />
            ))}
          </div>
        ) : contents.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {contents.length} resources
              {data?.pagination?.total && ` of ${data.pagination.total}`}
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {contents.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function ContentCard({ content }: { content: Content }) {
  const typeIcon = getContentTypeIcon(content.type);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative aspect-video bg-gray-100">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {typeIcon}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant={content.pricing.type === 'free' ? 'success' : 'secondary'}
            className="text-xs"
          >
            {content.pricing.type === 'free'
              ? 'Free'
              : content.pricing.price
              ? formatCurrency(content.pricing.price, content.pricing.currency)
              : 'Premium'}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary">
            Preview
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {content.type}
          </Badge>
          {content.subjects[0] && (
            <Badge variant="outline" className="text-xs">
              {content.subjects[0]}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold line-clamp-2 mb-2">{content.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {content.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={content.creator.avatarUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(content.creator.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {content.creator.displayName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>{content.averageRating.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {content.downloadCount}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            {content.purchaseCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-4">
        <div className="flex gap-2 mb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-10 w-full mb-3" />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function getContentTypeIcon(type: string) {
  switch (type) {
    case 'video':
      return <Video className="h-12 w-12 text-muted-foreground" />;
    case 'audio':
      return <Headphones className="h-12 w-12 text-muted-foreground" />;
    case 'interactive':
      return <Play className="h-12 w-12 text-muted-foreground" />;
    case 'image':
      return <Image className="h-12 w-12 text-muted-foreground" />;
    default:
      return <FileText className="h-12 w-12 text-muted-foreground" />;
  }
}
