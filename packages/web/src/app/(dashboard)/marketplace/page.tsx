'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';

// Categories matching spec: Learning Tools, Assessment, Communication, Analytics, VR
const CATEGORIES = [
  { id: 'learning-tools', name: 'Learning Tools', icon: Languages, count: 58, color: 'blue' },
  { id: 'assessment', name: 'Assessment', icon: ClipboardCheck, count: 42, color: 'purple' },
  { id: 'communication', name: 'Communication', icon: MessageSquareText, count: 34, color: 'green' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, count: 28, color: 'amber' },
  { id: 'vr', name: 'VR Experiences', icon: Glasses, count: 24, color: 'pink' },
  { id: 'stem', name: 'STEM', icon: FlaskConical, count: 56, color: 'emerald' },
  { id: 'accessibility', name: 'Accessibility', icon: Accessibility, count: 18, color: 'teal' },
  { id: 'integrations', name: 'Integrations', icon: Link2, count: 16, color: 'orange' },
];

const STATS = [
  { label: 'Total Apps', value: '276', icon: Store, color: 'blue' },
  { label: 'Active Installs', value: '24,518', icon: Download, color: 'green' },
  { label: 'Community Requests', value: '89', icon: MessageSquareText, color: 'purple' },
  { label: 'Active Bounties', value: '23', icon: Coins, color: 'amber' },
];

interface AppItem {
  id: string;
  name: string;
  developer: string;
  description: string;
  rating: number;
  reviewCount: number;
  installs: number;
  pricing: 'Free' | 'Premium' | 'Freemium';
  priceAmount: string | null;
  category: string;
  color: string;
  letter: string;
  screenshots: string[];
  features: string[];
  lastUpdated: string;
  version: string;
}

const ALL_APPS: AppItem[] = [
  {
    id: 'vocabmaster-pro',
    name: 'VocabMaster Pro',
    developer: 'LangTech Solutions',
    description: 'AI-powered vocabulary acquisition with spaced repetition, contextual learning, and Australian English dialect support for Years 3-12. Features adaptive difficulty, progress tracking, and classroom integration.',
    rating: 4.8,
    reviewCount: 342,
    installs: 5420,
    pricing: 'Premium',
    priceAmount: '$4.99/mo',
    category: 'learning-tools',
    color: 'bg-blue-500',
    letter: 'V',
    screenshots: ['/screenshots/vocab1.png', '/screenshots/vocab2.png', '/screenshots/vocab3.png'],
    features: ['Spaced Repetition', 'Australian English', 'Classroom Sync', 'Progress Analytics'],
    lastUpdated: '15 Jan 2026',
    version: '3.2.1',
  },
  {
    id: 'chemlab-vr',
    name: 'ChemLab VR',
    developer: 'Immersive Edu Labs',
    description: 'Virtual reality chemistry laboratory aligned with the Australian Curriculum. Conduct experiments safely with realistic simulations, detailed molecular visualizations, and interactive tutorials.',
    rating: 4.9,
    reviewCount: 287,
    installs: 3187,
    pricing: 'Premium',
    priceAmount: '$9.99/mo',
    category: 'vr',
    color: 'bg-emerald-500',
    letter: 'C',
    screenshots: ['/screenshots/chem1.png', '/screenshots/chem2.png'],
    features: ['VR Lab Simulations', 'Safety Training', 'Curriculum Aligned', 'Assessment Tools'],
    lastUpdated: '10 Jan 2026',
    version: '2.4.0',
  },
  {
    id: 'quizforge',
    name: 'QuizForge',
    developer: 'AssessTech AU',
    description: 'Intelligent assessment builder with auto-marking, NAPLAN-style question templates, and detailed analytics for educators. Create, share, and track student assessments effortlessly.',
    rating: 4.7,
    reviewCount: 521,
    installs: 8934,
    pricing: 'Free',
    priceAmount: null,
    category: 'assessment',
    color: 'bg-purple-500',
    letter: 'Q',
    screenshots: ['/screenshots/quiz1.png', '/screenshots/quiz2.png', '/screenshots/quiz3.png'],
    features: ['Auto-marking', 'NAPLAN Templates', 'Detailed Analytics', 'Question Bank'],
    lastUpdated: '18 Jan 2026',
    version: '4.1.2',
  },
  {
    id: 'classchat',
    name: 'ClassChat',
    developer: 'EduComm Pty Ltd',
    description: 'Secure classroom communication platform with parent messaging, announcement broadcasting, and emergency alerts. COPPA compliant with full audit logging.',
    rating: 4.6,
    reviewCount: 189,
    installs: 6721,
    pricing: 'Freemium',
    priceAmount: '$2.99/mo',
    category: 'communication',
    color: 'bg-green-500',
    letter: 'C',
    screenshots: ['/screenshots/chat1.png', '/screenshots/chat2.png'],
    features: ['Parent Messaging', 'Emergency Alerts', 'COPPA Compliant', 'Broadcast Tools'],
    lastUpdated: '12 Jan 2026',
    version: '5.0.3',
  },
  {
    id: 'insightiq',
    name: 'InsightIQ',
    developer: 'DataEd Analytics',
    description: 'Comprehensive learning analytics dashboard with predictive insights, cohort analysis, and intervention recommendations. Visualize student progress and identify at-risk learners early.',
    rating: 4.5,
    reviewCount: 156,
    installs: 2890,
    pricing: 'Premium',
    priceAmount: '$7.99/mo',
    category: 'analytics',
    color: 'bg-amber-500',
    letter: 'I',
    screenshots: ['/screenshots/insight1.png', '/screenshots/insight2.png'],
    features: ['Predictive Analytics', 'Cohort Analysis', 'Risk Detection', 'Custom Reports'],
    lastUpdated: '8 Jan 2026',
    version: '2.2.0',
  },
  {
    id: 'mathquest',
    name: 'MathQuest',
    developer: 'GameLearn AU',
    description: 'Gamified mathematics learning with adventure-based problem solving. Features adaptive difficulty, multiplayer challenges, and curriculum-aligned content for Years 1-10.',
    rating: 4.6,
    reviewCount: 423,
    installs: 7890,
    pricing: 'Free',
    priceAmount: null,
    category: 'learning-tools',
    color: 'bg-orange-500',
    letter: 'M',
    screenshots: ['/screenshots/math1.png', '/screenshots/math2.png', '/screenshots/math3.png'],
    features: ['Gamified Learning', 'Adaptive Difficulty', 'Multiplayer Mode', 'Progress Tracking'],
    lastUpdated: '20 Jan 2026',
    version: '6.1.0',
  },
  {
    id: 'readaloud-ai',
    name: 'ReadAloud AI',
    developer: 'AccessEd Tech',
    description: 'AI-powered text-to-speech with natural voices, reading speed control, and highlight tracking. Supports dyslexia-friendly fonts and multiple language accents.',
    rating: 4.5,
    reviewCount: 234,
    installs: 4756,
    pricing: 'Premium',
    priceAmount: '$2.99/mo',
    category: 'accessibility',
    color: 'bg-teal-500',
    letter: 'R',
    screenshots: ['/screenshots/read1.png', '/screenshots/read2.png'],
    features: ['Natural AI Voices', 'Dyslexia Support', 'Multi-language', 'Speed Control'],
    lastUpdated: '14 Jan 2026',
    version: '3.0.1',
  },
  {
    id: 'classsync',
    name: 'ClassSync',
    developer: 'EduSync Pty Ltd',
    description: 'LMS integration hub connecting Scholarly with Canvas, Moodle, and Blackboard. Automatic grade sync, roster management, and single sign-on support.',
    rating: 4.4,
    reviewCount: 167,
    installs: 4210,
    pricing: 'Free',
    priceAmount: null,
    category: 'integrations',
    color: 'bg-indigo-500',
    letter: 'C',
    screenshots: ['/screenshots/sync1.png', '/screenshots/sync2.png'],
    features: ['LMS Integration', 'Grade Sync', 'SSO Support', 'Roster Management'],
    lastUpdated: '16 Jan 2026',
    version: '2.8.0',
  },
  {
    id: 'biologyexplorer-vr',
    name: 'BiologyExplorer VR',
    developer: 'Immersive Edu Labs',
    description: 'Explore the human body in virtual reality. Navigate through organs, witness cellular processes, and dissect virtual specimens aligned with Year 7-12 Biology curriculum.',
    rating: 4.8,
    reviewCount: 198,
    installs: 2340,
    pricing: 'Premium',
    priceAmount: '$8.99/mo',
    category: 'vr',
    color: 'bg-pink-500',
    letter: 'B',
    screenshots: ['/screenshots/bio1.png', '/screenshots/bio2.png'],
    features: ['Body Navigation', 'Cell Visualization', 'Virtual Dissection', 'Curriculum Aligned'],
    lastUpdated: '11 Jan 2026',
    version: '1.9.0',
  },
  {
    id: 'stemlab',
    name: 'STEMLab Simulations',
    developer: 'ScienceFirst AU',
    description: 'Physics and engineering simulations with virtual experiments. Build circuits, test structures, and explore mechanics with real-world physics engines.',
    rating: 4.7,
    reviewCount: 312,
    installs: 5670,
    pricing: 'Freemium',
    priceAmount: '$5.99/mo',
    category: 'stem',
    color: 'bg-cyan-500',
    letter: 'S',
    screenshots: ['/screenshots/stem1.png', '/screenshots/stem2.png', '/screenshots/stem3.png'],
    features: ['Physics Engine', 'Circuit Builder', 'Engineering Labs', 'Real-world Data'],
    lastUpdated: '19 Jan 2026',
    version: '4.3.0',
  },
];

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

  const handleInstall = () => {
    setInstalling(true);
    // Simulate OAuth connection
    setTimeout(() => {
      setInstalling(false);
      setInstalled(true);
    }, 1500);
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
            {app.screenshots.map((_, idx) => (
              <div
                key={idx}
                className="w-48 h-32 rounded-lg bg-muted flex items-center justify-center shrink-0"
              >
                <span className="text-sm text-muted-foreground">Screenshot {idx + 1}</span>
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredApps = useMemo(() => {
    let apps = [...ALL_APPS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      apps = apps.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.developer.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      apps = apps.filter((app) => app.category === selectedCategory);
    }

    // Price filter
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
  }, [searchQuery, selectedCategory, priceFilter, sortBy]);

  const featuredApps = ALL_APPS.slice(0, 3);
  const trendingApps = [...ALL_APPS].sort((a, b) => b.rating - a.rating).slice(0, 5);

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
        {filteredApps.length === 0 ? (
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
