'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

const STATS = [
  { label: 'Total Apps', value: '247', icon: Store, color: 'blue' },
  { label: 'Active Installs', value: '18,432', icon: Download, color: 'green' },
  { label: 'Community Requests', value: '89', icon: MessageSquareText, color: 'purple' },
  { label: 'Active Bounties', value: '23', icon: Coins, color: 'amber' },
];

const FEATURED_APPS = [
  {
    id: 'vocabmaster-pro',
    name: 'VocabMaster Pro',
    developer: 'LangTech Solutions',
    description: 'AI-powered vocabulary acquisition with spaced repetition, contextual learning, and Australian English dialect support for Years 3-12.',
    rating: 4.8,
    installs: 5420,
    pricing: 'Premium',
    priceAmount: '$4.99/mo',
    color: 'bg-blue-500',
    letter: 'V',
  },
  {
    id: 'chemlab-vr',
    name: 'ChemLab VR',
    developer: 'Immersive Edu Labs',
    description: 'Virtual reality chemistry laboratory aligned with the Australian Curriculum. Conduct experiments safely with realistic simulations.',
    rating: 4.9,
    installs: 3187,
    pricing: 'Premium',
    priceAmount: '$9.99/mo',
    color: 'bg-emerald-500',
    letter: 'C',
  },
  {
    id: 'quizforge',
    name: 'QuizForge',
    developer: 'AssessTech AU',
    description: 'Intelligent assessment builder with auto-marking, NAPLAN-style question templates, and detailed analytics for educators.',
    rating: 4.7,
    installs: 8934,
    pricing: 'Free',
    priceAmount: null,
    color: 'bg-purple-500',
    letter: 'Q',
  },
];

const CATEGORIES = [
  { name: 'Language Learning', icon: Languages, count: 42, color: 'blue' },
  { name: 'STEM', icon: FlaskConical, count: 56, color: 'green' },
  { name: 'Assessment Tools', icon: ClipboardCheck, count: 38, color: 'purple' },
  { name: 'VR Experiences', icon: Glasses, count: 24, color: 'pink' },
  { name: 'Classroom Management', icon: Users, count: 31, color: 'amber' },
  { name: 'Accessibility', icon: Accessibility, count: 18, color: 'teal' },
  { name: 'Analytics', icon: BarChart3, count: 22, color: 'indigo' },
  { name: 'Integrations', icon: Link2, count: 16, color: 'orange' },
];

const TRENDING_APPS = [
  { id: 'mathquest', name: 'MathQuest', developer: 'GameLearn AU', rating: 4.6, installs: 2890, color: 'bg-orange-500', letter: 'M', pricing: 'Free' },
  { id: 'readaloud-ai', name: 'ReadAloud AI', developer: 'AccessEd Tech', rating: 4.5, installs: 1756, color: 'bg-teal-500', letter: 'R', pricing: '$2.99/mo' },
  { id: 'classsync', name: 'ClassSync', developer: 'EduSync Pty Ltd', rating: 4.4, installs: 4210, color: 'bg-indigo-500', letter: 'C', pricing: 'Free' },
  { id: 'portfoliogen', name: 'PortfolioGen', developer: 'FolioTech', rating: 4.3, installs: 1523, color: 'bg-rose-500', letter: 'P', pricing: '$3.49/mo' },
  { id: 'culturalbridge', name: 'CulturalBridge', developer: 'BridgeEd Global', rating: 4.7, installs: 987, color: 'bg-cyan-500', letter: 'C', pricing: 'Free' },
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
  return (
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {amount || 'Premium'}
    </Badge>
  );
}

export default function MarketplaceHubPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Developer Marketplace</h1>
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

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search apps, categories, or developers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

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

      {/* Featured Apps */}
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
          {FEATURED_APPS.map((app) => (
            <Link key={app.id} href={`/marketplace/apps/${app.id}`}>
              <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
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
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.name} href={`/marketplace/apps?category=${encodeURIComponent(cat.name)}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
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
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trending */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Trending This Week</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TRENDING_APPS.map((app) => (
            <Link key={app.id} href={`/marketplace/apps/${app.id}`} className="min-w-[240px]">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
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
                  <Badge variant="outline" className="text-xs">
                    {app.pricing}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

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
    </div>
  );
}
