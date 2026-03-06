'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Store,
  Download,
  MessageSquareText,
  Coins,
  Star,
  ArrowRight,
  Search,
  Languages,
  FlaskConical,
  ClipboardCheck,
  Glasses,
  Users,
  Accessibility,
  BarChart3,
  Link2,
  TrendingUp,
  ChevronRight,
  Filter,
  X,
  Check,
  ExternalLink,
  ChevronLeft,
  MessageCircle,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useMarketplaceApps, useMarketplaceStats, useMarketplaceCategories, useAppRecommendations } from '@/hooks/use-marketplace';
import { marketplaceApi } from '@/lib/marketplace-api';
import { marketplaceTelemetry } from '@/lib/marketplace-telemetry';
import type { MarketplaceApp } from '@/types/marketplace';

// Category icon mapping
const CATEGORY_ICONS: Record<string, { icon: typeof Languages; color: string }> = {
  'learning-tools': { icon: Languages, color: 'blue' },
  'assessment': { icon: ClipboardCheck, color: 'purple' },
  'communication': { icon: MessageSquareText, color: 'green' },
  'analytics': { icon: BarChart3, color: 'amber' },
  'vr': { icon: Glasses, color: 'pink' },
  'stem': { icon: FlaskConical, color: 'emerald' },
  'accessibility': { icon: Accessibility, color: 'teal' },
  'integrations': { icon: Link2, color: 'orange' },
};

type AppItem = MarketplaceApp;

const REVIEWS = [
  { id: 1, user: 'Sarah T.', role: 'Teacher', rating: 5, comment: 'Absolutely fantastic for my Year 5 class. Students are more engaged than ever!', date: '12 Jan 2026' },
  { id: 2, user: 'Michael R.', role: 'Admin', rating: 4, comment: 'Great integration with our existing systems. Would love more customization options.', date: '10 Jan 2026' },
  { id: 3, user: 'Emma L.', role: 'Teacher', rating: 5, comment: 'The analytics features have transformed how I track student progress.', date: '8 Jan 2026' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : i < rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}</span>
    </div>
  );
}

function PricingBadge({ pricing, amount }: { pricing: string; amount: string | null }) {
  if (pricing === 'Free') {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Free
      </Badge>
    );
  }
  if (pricing === 'Freemium') {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Freemium
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {amount || 'Premium'}
    </Badge>
  );
}

function AppDetailDialog({
  app,
  open,
  onOpenChange,
}: {
  app: AppItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  if (!app) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await marketplaceApi.apps.install(app.id);
      setInstalled(true);
      marketplaceTelemetry.trackInstallClick(app.id, app.name);
    } catch {
      // Failed silently — toast could be added
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`${app.color} h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0`}>
              {app.letter}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{app.name}</DialogTitle>
              <DialogDescription className="mt-1">
                by {app.developer}
              </DialogDescription>
              <div className="flex items-center gap-4 mt-2">
                <StarRating rating={app.rating} />
                <span className="text-sm text-muted-foreground">({app.reviewCount} reviews)</span>
                <PricingBadge pricing={app.pricing} amount={app.priceAmount} />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Screenshots */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Screenshots</h4>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="w-48 h-32 rounded-lg bg-muted flex items-center justify-center shrink-0"
              >
                <span className="text-sm text-muted-foreground">Screenshot {idx}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">About</h4>
          <p className="text-sm text-muted-foreground">{app.description}</p>
        </div>

        {/* Features */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Features</h4>
          <div className="flex flex-wrap gap-2">
            {app.features.map((feature) => (
              <Badge key={feature} variant="outline">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{app.installs.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Installs</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{app.version}</p>
            <p className="text-xs text-muted-foreground">Version</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{app.lastUpdated}</p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Reviews</h4>
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-3">
            {REVIEWS.slice(0, 2).map((review) => (
              <div key={review.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{review.user}</span>
                    <Badge variant="outline" className="text-xs">{review.role}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Install Button */}
        <div className="mt-6 flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">
              {app.pricing === 'Free' ? 'Free to install' : app.priceAmount}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secure OAuth connection
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleInstall}
            disabled={installing || installed}
          >
            {installed ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Installed
              </>
            ) : installing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Install App
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplaceHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Track search
  useEffect(() => {
    if (debouncedQuery) {
      marketplaceTelemetry.trackSearch(debouncedQuery, selectedCategory === 'all' ? undefined : selectedCategory);
    }
  }, [debouncedQuery, selectedCategory]);

  // Fetch data from API
  const { apps: apiApps, isLoading: appsLoading } = useMarketplaceApps(
    debouncedQuery || undefined,
    selectedCategory !== 'all' ? selectedCategory : undefined,
  );
  const { data: stats, isLoading: statsLoading } = useMarketplaceStats();
  const { data: categories } = useMarketplaceCategories();
  const { recommendations } = useAppRecommendations();

  const CATEGORIES = useMemo(() => {
    return (categories ?? []).map(cat => ({
      ...cat,
      icon: CATEGORY_ICONS[cat.id]?.icon ?? Store,
      color: CATEGORY_ICONS[cat.id]?.color ?? 'gray',
    }));
  }, [categories]);

  const STATS = useMemo(() => [
    { label: 'Total Apps', value: stats?.totalApps?.toLocaleString() ?? '...', icon: Store, color: 'blue' },
    { label: 'Active Installs', value: stats?.activeInstalls?.toLocaleString() ?? '...', icon: Download, color: 'green' },
    { label: 'Community Requests', value: stats?.communityRequests?.toLocaleString() ?? '...', icon: MessageSquareText, color: 'purple' },
    { label: 'Active Bounties', value: stats?.activeBounties?.toLocaleString() ?? '...', icon: Coins, color: 'amber' },
  ], [stats]);

  const filteredApps = useMemo(() => {
    let apps = [...apiApps];

    // Price filter (client-side since API doesn't support it)
    if (priceFilter !== 'all') {
      apps = apps.filter((app) => app.pricing.toLowerCase() === priceFilter);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        apps.sort((a, b) => b.installs - a.installs);
        break;
      case 'rating':
        apps.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        apps.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'name':
        apps.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return apps;
  }, [apiApps, priceFilter, sortBy]);

  const featuredApps = useMemo(() => apiApps.filter(a => a.isFeatured).slice(0, 3), [apiApps]);
  const trendingApps = useMemo(() => [...apiApps].sort((a, b) => b.rating - a.rating).slice(0, 5), [apiApps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">App Marketplace</h1>
          <p className="text-muted-foreground">
            Discover, install, and manage educational apps for your institution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/marketplace/community">
              <MessageSquareText className="mr-2 h-4 w-4" />
              Community
            </Link>
          </Button>
          <Button asChild>
            <Link href="/marketplace/developer">
              <Store className="mr-2 h-4 w-4" />
              Developer Portal
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search apps, categories, or developers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {(selectedCategory !== 'all' || priceFilter !== 'all') && (
              <Badge className="ml-2 bg-primary text-primary-foreground">
                {(selectedCategory !== 'all' ? 1 : 0) + (priceFilter !== 'all' ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Prices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(selectedCategory !== 'all' || priceFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceFilter('all');
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className="transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-lg bg-${cat.color}-500/10 p-2.5`}>
                    <Icon className={`h-5 w-5 text-${cat.color}-500`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} apps</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recommended For You */}
      {recommendations.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recommended for You</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <Card
                key={rec.app.id}
                className="transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setSelectedApp(rec.app as AppItem)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`${rec.app.color || 'bg-primary'} h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0`}>
                      {rec.app.letter || rec.app.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{rec.app.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{rec.app.rating}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(rec.score * 100)}% match
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Featured Apps */}
      {!searchQuery && selectedCategory === 'all' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Featured Apps</h2>
              <p className="text-sm text-muted-foreground">Hand-picked by the Scholarly team</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/marketplace/apps">
                View All Apps
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredApps.map((app) => (
              <Card
                key={app.id}
                className="h-full transition-shadow hover:shadow-lg cursor-pointer"
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`${app.color} h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0`}>
                      {app.letter}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.developer}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between">
                    <StarRating rating={app.rating} />
                    <PricingBadge pricing={app.pricing} amount={app.priceAmount} />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                    <span>{app.installs.toLocaleString()} installs</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Apps / Search Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {searchQuery
              ? `Search Results (${filteredApps.length})`
              : selectedCategory !== 'all'
              ? `${CATEGORIES.find((c) => c.id === selectedCategory)?.name} (${filteredApps.length})`
              : 'All Apps'}
          </h2>
        </div>
        {appsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No apps found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceFilter('all');
                }}
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredApps.map((app) => (
              <Card
                key={app.id}
                className="transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`${app.color} h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0`}>
                      {app.letter}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{app.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.developer}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{app.rating}</span>
                      <span className="text-xs text-muted-foreground">({app.reviewCount})</span>
                    </div>
                    <PricingBadge pricing={app.pricing} amount={app.priceAmount} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORIES.find((c) => c.id === app.category)?.name}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Trending */}
      {!searchQuery && selectedCategory === 'all' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Trending This Week</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {trendingApps.map((app) => (
              <Card
                key={app.id}
                className="min-w-[240px] transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setSelectedApp(app)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`${app.color} h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0`}>
                      {app.letter}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{app.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.developer}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{app.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {app.installs.toLocaleString()} installs
                    </span>
                  </div>
                  <PricingBadge pricing={app.pricing} amount={app.priceAmount} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Community Requests CTA */}
      <Card className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10">
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Community Requests &amp; Bounties</h3>
            <p className="text-sm text-muted-foreground">
              Vote on feature requests, pledge EDU tokens, and claim bounties to build the apps your school needs.
            </p>
          </div>
          <Button asChild>
            <Link href="/marketplace/community">
              Explore Requests
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* App Detail Dialog */}
      <AppDetailDialog
        app={selectedApp}
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
      />
    </div>
  );
}
