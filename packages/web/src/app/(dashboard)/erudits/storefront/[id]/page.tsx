'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  BookOpen,
  FileText,
  Users,
  School,
  Building2,
  Download,
  Shield,
  Tag,
  Calendar,
  Eye,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { DigitalResource, ResourceReview, LicenceScope } from '@/types/erudits';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const LICENCE_OPTIONS: { scope: LicenceScope; label: string; description: string; icon: typeof Users }[] = [
  { scope: 'individual', label: 'Individual', description: 'For personal use by one educator', icon: Users },
  { scope: 'single_school', label: 'Single School', description: 'Shared across one school', icon: School },
  { scope: 'multi_school', label: 'Multi-School', description: 'For school networks and districts', icon: Building2 },
];

export default function ResourceDetailPage() {
  const params = useParams();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<DigitalResource | null>(null);
  const [reviews, setReviews] = useState<ResourceReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLicence, setSelectedLicence] = useState<LicenceScope>('individual');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [res, revs] = await Promise.allSettled([
          eruditsApi.storefront.get(resourceId),
          eruditsApi.storefront.getReviews(resourceId),
        ]);
        if (res.status === 'fulfilled') setResource(res.value);
        else setError('Resource not found');
        if (revs.status === 'fulfilled') setReviews(revs.value);
      } catch {
        setError('Failed to load resource');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [resourceId]);

  function getPriceForLicence(): number {
    if (!resource) return 0;
    switch (selectedLicence) {
      case 'individual': return resource.priceIndividualCents;
      case 'single_school': return resource.priceSingleSchoolCents ?? resource.priceIndividualCents * 4;
      case 'multi_school': return resource.priceMultiSchoolCents ?? resource.priceIndividualCents * 10;
      default: return resource.priceIndividualCents;
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-400">{error || 'Resource not found'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/erudits/storefront">Back to storefront</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/erudits/storefront"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{resource.title}</h1>
            {resource.featured && <Badge variant="default">Featured</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">by {resource.authorName}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Area */}
          <Card>
            <CardContent className="p-6">
              <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                <div className="text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mt-2">Resource preview</p>
                  {resource.previewPageCount && (
                    <Button variant="outline" size="sm" className="mt-3">
                      <Eye className="mr-2 h-3 w-3" />
                      Preview {resource.previewPageCount} pages
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{resource.description}</p>

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Format</p>
                      <p className="font-medium">{resource.format.toUpperCase().replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p className="font-medium">{resource.subjectArea || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year Levels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {resource.yearLevels.map((yl) => (
                          <Badge key={yl} variant="secondary" className="text-xs">{yl}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Purchases</p>
                      <p className="font-medium">{resource.totalPurchases.toLocaleString()}</p>
                    </div>
                  </div>

                  {resource.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="mr-1 h-3 w-3" />{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {resource.curriculumTags.length > 0 ? (
                    <div className="space-y-4">
                      {resource.curriculumTags.map((tag) => (
                        <div key={tag.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{tag.code}</p>
                            <p className="text-sm text-muted-foreground">{tag.label}</p>
                            <Badge variant="outline" className="text-xs mt-1">{tag.framework}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No curriculum tags assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.reviewerName}</span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && <p className="font-medium text-sm">{review.title}</p>}
                          {review.body && <p className="text-sm text-muted-foreground mt-1">{review.body}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No reviews yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Purchase Sidebar */}
        <div className="space-y-4">
          {/* Rating */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < Math.round(resource.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-lg font-bold">{resource.averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({resource.ratingCount} reviews)</span>
              </div>
            </CardContent>
          </Card>

          {/* Licence Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Choose Licence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LICENCE_OPTIONS.map((option) => {
                const price = option.scope === 'individual' ? resource.priceIndividualCents
                  : option.scope === 'single_school' ? (resource.priceSingleSchoolCents ?? resource.priceIndividualCents * 4)
                  : (resource.priceMultiSchoolCents ?? resource.priceIndividualCents * 10);
                const Icon = option.icon;
                return (
                  <button
                    key={option.scope}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedLicence === option.scope ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedLicence(option.scope)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <span className="font-bold">{formatCents(price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{option.description}</p>
                  </button>
                );
              })}

              <Button className="w-full mt-4" size="lg">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase for {formatCents(getPriceForLicence())}
              </Button>

              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mt-2">
                <Shield className="h-3 w-3" />
                Secure payment via Stripe
              </div>
            </CardContent>
          </Card>

          {/* Resource Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <Badge variant="outline">{resource.format.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subject</span>
                <span>{resource.subjectArea || 'General'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Currency</span>
                <span>{resource.currency}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(resource.updatedAt).toLocaleDateString()}</span>
              </div>
              {resource.files.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Files</span>
                  <span>{resource.files.length} file{resource.files.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
