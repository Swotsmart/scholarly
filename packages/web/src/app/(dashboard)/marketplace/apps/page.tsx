'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Star,
  Download,
  SlidersHorizontal,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { useMarketplaceApps } from '@/hooks/use-marketplace';
import { marketplaceApi } from '@/lib/marketplace-api';
import { marketplaceTelemetry } from '@/lib/marketplace-telemetry';
import type { MarketplaceApp } from '@/types/marketplace';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price Low-High' },
];

const CATEGORY_TABS = ['All', 'Language Learning', 'STEM', 'Assessment', 'VR/AR', 'Management'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium">{rating}/5</span>
    </div>
  );
}

export default function AppListingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch from API
  const { apps: apiApps, total, isLoading } = useMarketplaceApps(debouncedQuery || undefined);

  const filteredApps = useMemo(() => {
    let apps = [...apiApps];

    // Filter by category (client-side)
    if (activeCategory !== 'All') {
      apps = apps.filter((app) => app.category === activeCategory);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        apps.sort((a, b) => b.installs - a.installs);
        break;
      case 'newest':
        apps.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'rating':
        apps.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        apps.sort((a, b) => {
          if (a.pricing === 'Free') return -1;
          if (b.pricing === 'Free') return 1;
          return 0;
        });
        break;
    }

    return apps;
  }, [apiApps, activeCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="heading-2">Browse Apps</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Explore {total} educational apps built for Australian schools
          </p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortMenu(!showSortMenu)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-md border bg-popover p-1 shadow-md">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted ${
                    sortBy === option.value ? 'bg-muted font-medium' : ''
                  }`}
                  onClick={() => {
                    setSortBy(option.value);
                    setShowSortMenu(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          {CATEGORY_TABS.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* App Grid - shared across all tabs */}
        <div className="mt-6">
          {filteredApps.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">No apps found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or category filter
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => (
                <Link key={app.id} href={`/marketplace/apps/${app.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`${app.color} h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0`}
                        >
                          {app.letter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold">{app.name}</h3>
                              <p className="text-sm text-muted-foreground">{app.developer}</p>
                            </div>
                            {app.pricing === 'Free' ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                                Free
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                                {app.priceAmount || 'Premium'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {app.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <StarRating rating={app.rating} />
                          <span className="text-xs text-muted-foreground">
                            ({app.reviewCount})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Download className="h-3 w-3" />
                          {app.installs.toLocaleString()}
                        </div>
                      </div>

                      <Button className="w-full" size="sm">
                        Install
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
