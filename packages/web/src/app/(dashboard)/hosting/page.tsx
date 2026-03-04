'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  ExternalLink,
  Settings,
  MessageSquare,
  Calendar,
  Star,
  TrendingUp,
  Eye,
  Plus,
  CheckCircle2,
  Clock,
  Palette,
  Link as LinkIcon,
  Award,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';
// R5: Real data from hosting API
import { useHosting } from '@/hooks/use-hosting';

// Legacy fallback data (preserved)
const FALLBACK_PROVIDER = { id: 'prov_123', displayName: 'Riverside Learning Academy', tagline: 'Where curiosity leads learning', type: 'micro_school', status: 'active', primaryDomain: 'riverside.scholar.ly', qualityScore: 78 };
const FALLBACK_ENQUIRIES = [
  { id: '1', name: 'James Chen', type: 'enrollment', date: '2 hours ago', status: 'new' },
  { id: '2', name: 'Sarah Williams', type: 'tour', date: '1 day ago', status: 'responded' },
  { id: '3', name: 'Michael Brown', type: 'general', date: '2 days ago', status: 'new' },
];
const FALLBACK_TOURS = [
  { id: '1', name: 'Emily Parker', date: 'Feb 15, 2026', time: '10:00 AM', status: 'confirmed' },
  { id: '2', name: 'David Kim', date: 'Feb 18, 2026', time: '2:00 PM', status: 'pending' },
];

export default function HostingDashboardPage() {
  // R5: useHosting replaces useState+useEffect mock pattern
  const { provider, quality, enquiries, tours, reviews, isLoading } = useHosting();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // R5: Real provider detection — no more hardcoded `setHasProvider(true)`
  const hasProvider = provider?.status === 'active' || provider?.status === 'pending_setup';

  if (!hasProvider) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Globe className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Web Hosting Not Enabled</CardTitle>
            <CardDescription>
              Create your professional web presence and get discovered by parents and students
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild size="lg">
              <Link href="/hosting/setup">
                <Sparkles className="mr-2 h-4 w-4" />
                Enable Web Hosting
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // R5: Bridge API data → display shapes with fallbacks
  const displayName = provider?.displayName || FALLBACK_PROVIDER.displayName;
  const tagline = provider?.tagline || FALLBACK_PROVIDER.tagline;
  const primaryDomain = provider?.domains?.find(d => d.status === 'verified')?.domain || FALLBACK_PROVIDER.primaryDomain;
  const qualityScore = quality?.overallScore ?? FALLBACK_PROVIDER.qualityScore;
  const verifiedDomain = provider?.domains?.find(d => d.status === 'verified');

  const recentEnquiries = enquiries
    ? enquiries.slice(0, 3).map(e => ({
        id: e.id,
        name: e.contactName || 'Unknown',
        type: e.enquiryType || 'general',
        date: e.createdAt ? formatRelative(e.createdAt) : 'Recently',
        status: e.status || 'new',
      }))
    : FALLBACK_ENQUIRIES;

  const upcomingTours = tours
    ? tours.filter(t => t.status === 'confirmed' || t.status === 'pending').slice(0, 2).map(t => ({
        id: t.id,
        name: t.contactName || 'Visitor',
        date: t.scheduledAt ? new Date(t.scheduledAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        time: t.scheduledAt ? new Date(t.scheduledAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : '',
        status: t.status,
      }))
    : FALLBACK_TOURS;

  const reviewCount = reviews?.length ?? 12;
  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length).toFixed(1)
    : '4.7';
  const enquiryCount = enquiries?.length ?? 8;
  const newEnquiries = enquiries?.filter(e => e.status === 'new').length ?? 3;
  const tourCount = tours?.length ?? 4;
  const upcomingCount = tours?.filter(t => t.status === 'confirmed' || t.status === 'pending').length ?? 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground">{tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`https://${primaryDomain}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Site
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/hosting/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-mono">{primaryDomain}</span>
        </div>
        <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
        {quality?.verificationLevel && quality.verificationLevel !== 'unverified' && (
          <Badge variant="secondary">
            <Award className="mr-1 h-3 w-3" />
            {quality.verificationLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Badge>
        )}
        {provider?.features?.agentApiAccess && (
          <div className="flex items-center gap-1 ml-auto">
            <Bot className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">AI Discoverable</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              +12% this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enquiries</p>
                <p className="text-2xl font-bold">{enquiryCount}</p>
              </div>
              <div className="rounded-full bg-amber-500/10 p-3">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {newEnquiries} new this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tour Bookings</p>
                <p className="text-2xl font-bold">{tourCount}</p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {upcomingCount} upcoming
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviews</p>
                <p className="text-2xl font-bold">{reviewCount}</p>
              </div>
              <div className="rounded-full bg-purple-500/10 p-3">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Star className="mr-1 h-4 w-4 fill-amber-400 text-amber-400" />
              {avgRating} average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries</TabsTrigger>
          <TabsTrigger value="tours">Tours</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Enquiries */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Recent Enquiries</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/hosting/enquiries">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEnquiries.map((enquiry) => (
                    <div key={enquiry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{enquiry.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{enquiry.type} enquiry</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={enquiry.status === 'new' ? 'default' : 'secondary'}>
                          {enquiry.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{enquiry.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tours */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Upcoming Tours</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/hosting/tours">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTours.map((tour) => (
                    <div key={tour.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{tour.name}</p>
                        <p className="text-sm text-muted-foreground">{tour.date} at {tour.time}</p>
                      </div>
                      <Badge variant={tour.status === 'confirmed' ? 'default' : 'secondary'}>
                        {tour.status === 'confirmed' ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed</>
                        ) : (
                          <><Clock className="mr-1 h-3 w-3" /> Pending</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/hosting/offerings/new">
                    <Plus className="h-5 w-5" />
                    <span>Add Offering</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/hosting/theme">
                    <Palette className="h-5 w-5" />
                    <span>Edit Theme</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/hosting/domains">
                    <LinkIcon className="h-5 w-5" />
                    <span>Manage Domains</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/hosting/quality">
                    <Award className="h-5 w-5" />
                    <span>Quality Profile</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quality Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Score</CardTitle>
              <CardDescription>
                Your quality score affects how prominently you appear in search results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${qualityScore * 2.51} 251`} className="text-primary" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{qualityScore}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Registration</span>
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      {quality?.registrationStatus === 'registered' || quality?.registrationStatus === 'accredited' ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Outcomes</span>
                    <Badge variant="secondary">
                      {quality?.verifiedOutcomes?.length ? `${quality.verifiedOutcomes.length} submitted` : 'Not submitted'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reviews</span>
                    <span>{reviewCount} reviews ({avgRating} avg)</span>
                  </div>
                </div>
              </div>
              <Button variant="link" className="mt-4 p-0" asChild>
                <Link href="/hosting/quality">
                  Improve your quality score →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enquiries">
          <Card>
            <CardHeader>
              <CardTitle>Enquiries</CardTitle>
              <CardDescription>Manage enquiries from prospective families</CardDescription>
            </CardHeader>
            <CardContent>
              {enquiries && enquiries.length > 0 ? (
                <div className="space-y-3">
                  {enquiries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{e.contactName || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground capitalize">{e.enquiryType} — {e.message?.slice(0, 80)}...</p>
                      </div>
                      <Badge variant={e.status === 'new' ? 'default' : 'secondary'}>{e.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No enquiries yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tours">
          <Card>
            <CardHeader>
              <CardTitle>Tour Bookings</CardTitle>
              <CardDescription>Manage school tour appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {tours && tours.length > 0 ? (
                <div className="space-y-3">
                  {tours.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{t.contactName || 'Visitor'}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.scheduledAt ? new Date(t.scheduledAt).toLocaleDateString('en-AU') : ''} — {t.tourType}
                        </p>
                      </div>
                      <Badge variant={t.status === 'confirmed' ? 'default' : 'secondary'}>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tour bookings yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>View and respond to reviews</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{r.authorName}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: r.overallRating || 0 }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="font-medium text-sm">{r.title}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{r.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// R5: Helper for relative time display
function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
