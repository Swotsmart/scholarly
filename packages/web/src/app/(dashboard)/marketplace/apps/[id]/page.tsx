'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Star,
  Download,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  FileText,
  BarChart3,
  Eye,
  Lock,
  Loader2,
} from 'lucide-react';
import { useAppDetail } from '@/hooks/use-marketplace';
import { marketplaceTelemetry } from '@/lib/marketplace-telemetry';
import type { AppDetail } from '@/types/marketplace';

const platformIcons: Record<string, React.ElementType> = {
  globe: Globe,
  smartphone: Smartphone,
  monitor: Monitor,
  tablet: Tablet,
};

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : i < rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-6">
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AppDetailPage() {
  const params = useParams();
  const appId = typeof params.id === 'string' ? params.id : null;
  const { app, isLoading, error, install, uninstall } = useAppDetail(appId);
  const [activeTab, setActiveTab] = useState('overview');
  const [installing, setInstalling] = useState(false);

  // Track page view
  useState(() => {
    if (appId) marketplaceTelemetry.trackAppView(appId, '');
  });

  const handleInstallToggle = useCallback(async () => {
    if (!app || installing) return;
    setInstalling(true);
    try {
      if ((app as AppDetail & { installed?: boolean }).installed) {
        await uninstall();
      } else {
        await install();
        marketplaceTelemetry.trackInstallClick(app.id, app.name);
      }
    } finally {
      setInstalling(false);
    }
  }, [app, installing, install, uninstall]);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !app) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketplace/apps">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Apps
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <p className="text-lg font-medium">{error || 'App not found'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              The app you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const installed = (app as AppDetail & { installed?: boolean }).installed ?? false;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/marketplace/apps">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
      </Button>

      {/* App Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className={`${app.color} h-24 w-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shrink-0`}>
          {app.letter}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="heading-2">{app.name}</h1>
              {app.developerVerified && (
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className="text-muted-foreground">{app.developer}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <StarRating rating={app.rating} size="lg" />
              <span className="font-semibold text-lg">{app.rating}</span>
              <span className="text-sm text-muted-foreground">({app.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              {app.installs.toLocaleString()} installs
            </div>
            <Badge variant="outline">{app.category}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant={installed ? 'outline' : 'default'}
              onClick={handleInstallToggle}
              disabled={installing}
            >
              {installing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {installed ? 'Uninstall' : 'Install'}
            </Button>
            {app.priceAmount && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-base px-3 py-1">
                {app.priceAmount}
              </Badge>
            )}
            {!app.priceAmount && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-base px-3 py-1">
                Free
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* App Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Updated:</span>
          <span className="font-medium">{app.lastUpdated}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Version:</span>
          <span className="font-medium">{app.version}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Size:</span>
          <span className="font-medium">{app.size}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Privacy:</span>
          <span className="font-medium">Verified</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {app.fullDescription.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-muted-foreground mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          {app.screenshots && app.screenshots.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Screenshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {app.screenshots.map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted min-w-[280px] h-[180px] rounded-lg flex items-center justify-center border"
                    >
                      <div className="text-center space-y-2">
                        <Monitor className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground/50 font-medium">
                          Screenshot {i + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Screenshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {['bg-blue-500/20', 'bg-emerald-500/20', 'bg-purple-500/20', 'bg-amber-500/20'].map((bg, i) => (
                    <div
                      key={i}
                      className={`${bg} min-w-[280px] h-[180px] rounded-lg flex items-center justify-center border`}
                    >
                      <div className="text-center space-y-2">
                        <Monitor className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground/50 font-medium">
                          {['Dashboard View', 'Student Interface', 'Analytics Panel', 'Assessment Builder'][i]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {app.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education Levels & Platforms */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supported Education Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.educationLevels.map((level) => (
                    <Badge key={level} variant="secondary" className="text-sm">
                      <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                      {level}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compatible Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.platforms.map((platform) => {
                    const PIcon = platformIcons[platform.icon] || Globe;
                    return (
                      <Badge key={platform.name} variant="outline" className="text-sm">
                        <PIcon className="mr-1.5 h-3.5 w-3.5" />
                        {platform.name}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Rating Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="text-center space-y-2">
                  <p className="text-5xl font-bold">{app.rating}</p>
                  <StarRating rating={app.rating} size="lg" />
                  <p className="text-sm text-muted-foreground">{app.reviewCount} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {(app.ratingBreakdown ?? []).map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{item.stars} star</span>
                      <Progress
                        value={item.percentage}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {(app.reviews ?? []).map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.role} {review.school && <>&middot; {review.school}</>}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                </CardContent>
              </Card>
            ))}
            {(!app.reviews || app.reviews.length === 0) && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <p className="text-lg font-medium">No reviews yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to review this app.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Changelog */}
        <TabsContent value="changelog" className="space-y-4">
          {(app.changelog ?? []).map((release) => (
            <Card key={release.version}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      v{release.version}
                    </Badge>
                    {release.version === app.version && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{release.date}</span>
                </div>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-1.5 shrink-0">&#8226;</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          {(!app.changelog || app.changelog.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <p className="text-lg font-medium">No changelog available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Required Permissions
              </CardTitle>
              <CardDescription>
                This app requires access to the following data and capabilities within your Scholarly instance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(app.permissions ?? []).map((perm) => (
                  <div
                    key={perm.name}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="rounded-lg bg-muted p-2.5">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{perm.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            perm.level === 'Read'
                              ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                              : perm.level === 'Write'
                              ? 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400'
                              : 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400'
                          }
                        >
                          {perm.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                    </div>
                  </div>
                ))}
                {(!app.permissions || app.permissions.length === 0) && (
                  <p className="text-sm text-muted-foreground">No permissions data available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Privacy Verified</p>
                  <p className="text-sm text-muted-foreground">
                    This app has been reviewed by the Scholarly security team. Student data is encrypted in transit and at rest.
                    The developer complies with the Australian Privacy Principles (APPs) and the Privacy Act 1988.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
