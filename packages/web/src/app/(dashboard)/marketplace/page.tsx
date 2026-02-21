'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Store, Code, Users, MessageSquare, Star, Download,
  TrendingUp, Coins, ArrowRight, Sparkles, BookOpen,
  Calculator, Globe, Accessibility, BarChart3, Radio,
  GraduationCap, Send, Clock, ChevronRight
} from 'lucide-react';

// --- Mock Data ---

const STATS = [
  { label: 'Total Apps', value: '276', icon: Store, color: 'blue' },
  { label: 'Active Developers', value: '48', icon: Code, color: 'purple' },
  { label: 'Total Installs', value: '12.4K', icon: Download, color: 'green' },
  { label: 'Active Bounties', value: '15', icon: Coins, color: 'amber' },
];

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: typeof Store;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Browse Apps',
    description: 'Explore 276 educational apps built for Australian schools',
    href: '/marketplace/apps',
    icon: Store,
    color: 'blue',
  },
  {
    title: 'Developer Console',
    description: 'Manage your apps, API keys, webhooks, and revenue',
    href: '/marketplace/developer',
    icon: Code,
    color: 'purple',
  },
  {
    title: 'Community Hub',
    description: 'Vote on requests, pledge tokens, and claim bounties',
    href: '/marketplace/community',
    icon: Users,
    color: 'green',
  },
  {
    title: 'Submit an App',
    description: 'Publish your educational app to the marketplace',
    href: '/marketplace/developer',
    icon: Send,
    color: 'amber',
  },
];

interface FeaturedApp {
  id: string;
  name: string;
  developer: string;
  rating: number;
  installs: number;
  pricing: 'Free' | 'Premium' | 'Freemium';
  priceAmount: string | null;
  color: string;
  letter: string;
}

const FEATURED_APPS: FeaturedApp[] = [
  {
    id: 'vocabmaster-pro',
    name: 'VocabMaster Pro',
    developer: 'LangTech Solutions',
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
    rating: 4.7,
    installs: 8934,
    pricing: 'Free',
    priceAmount: null,
    color: 'bg-purple-500',
    letter: 'Q',
  },
  {
    id: 'mathquest',
    name: 'MathQuest',
    developer: 'GameLearn AU',
    rating: 4.6,
    installs: 7890,
    pricing: 'Free',
    priceAmount: null,
    color: 'bg-orange-500',
    letter: 'M',
  },
];

interface Category {
  id: string;
  name: string;
  icon: typeof BookOpen;
  count: number;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'learning-tools', name: 'Learning Tools', icon: BookOpen, count: 58, color: 'blue' },
  { id: 'assessment', name: 'Assessment', icon: GraduationCap, count: 42, color: 'purple' },
  { id: 'classroom-management', name: 'Classroom Management', icon: Users, count: 34, color: 'green' },
  { id: 'stem', name: 'STEM', icon: Calculator, count: 56, color: 'emerald' },
  { id: 'languages', name: 'Languages', icon: Globe, count: 28, color: 'cyan' },
  { id: 'special-education', name: 'Special Education', icon: Accessibility, count: 18, color: 'teal' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, count: 24, color: 'amber' },
  { id: 'communication', name: 'Communication', icon: Radio, count: 16, color: 'pink' },
];

interface Bounty {
  id: string;
  title: string;
  sponsor: string;
  amount: number;
  deadline: string;
  progress: number;
  claimCount: number;
}

const BOUNTIES: Bounty[] = [
  {
    id: 'b-1',
    title: 'SCORM 2004 Content Import Plugin',
    sponsor: 'NSW Department of Education',
    amount: 15000,
    deadline: '15 Mar 2026',
    progress: 50,
    claimCount: 4,
  },
  {
    id: 'b-2',
    title: 'Auslan Sign Language Recognition Module',
    sponsor: 'Deaf Australia Foundation',
    amount: 25000,
    deadline: '30 Apr 2026',
    progress: 0,
    claimCount: 2,
  },
  {
    id: 'b-3',
    title: 'Aboriginal Astronomy Interactive Sky Map',
    sponsor: 'CSIRO Education',
    amount: 18000,
    deadline: '31 May 2026',
    progress: 0,
    claimCount: 1,
  },
];

interface CommunityRequest {
  id: string;
  title: string;
  requester: string;
  upvotes: number;
  currentFunding: number;
  goalFunding: number;
}

const COMMUNITY_REQUESTS: CommunityRequest[] = [
  {
    id: 'fr-1',
    title: 'Real-time Collaboration Whiteboard',
    requester: 'Emily Watson',
    upvotes: 156,
    currentFunding: 3200,
    goalFunding: 5000,
  },
  {
    id: 'fr-2',
    title: 'Indigenous Language Dictionary',
    requester: 'Aunty Rose Campbell',
    upvotes: 412,
    currentFunding: 7500,
    goalFunding: 12000,
  },
  {
    id: 'fr-3',
    title: 'Offline Mode for Rural Schools',
    requester: 'Tom Bradley',
    upvotes: 367,
    currentFunding: 6000,
    goalFunding: 6000,
  },
];

// --- Helper Components ---

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

// --- Page Component ---

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-2">App Marketplace</h1>
        <p className="text-muted-foreground">
          Discover, install, and manage educational apps for your institution
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                  <CardContent className="p-6 space-y-3">
                    <div className={`rounded-lg bg-${action.color}-500/10 p-3 w-fit`}>
                      <Icon className={`h-6 w-6 text-${action.color}-500`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                    <div className="flex items-center text-sm font-medium text-primary">
                      Go to {action.title}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Apps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Featured Apps</h2>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace/apps">
              View All Apps
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_APPS.map((app) => (
            <Link key={app.id} href={`/marketplace/apps/${app.id}`}>
              <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`${app.color} h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0`}
                    >
                      {app.letter}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {app.developer}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{app.rating}</span>
                    </div>
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
              <Link
                key={cat.id}
                href={`/marketplace/apps?category=${cat.id}`}
              >
                <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
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

      {/* Active Bounties */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Active Bounties</h2>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace/community">
              View All Bounties
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {BOUNTIES.map((bounty) => (
            <Card key={bounty.id} className="h-full">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{bounty.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Sponsored by {bounty.sponsor}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-lg font-bold text-primary">
                      {bounty.amount.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">EDU</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {bounty.deadline}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{bounty.progress}%</span>
                  </div>
                  <Progress
                    value={bounty.progress}
                    className="h-2"
                    indicatorClassName={bounty.progress >= 100 ? 'bg-green-500' : undefined}
                  />
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{bounty.claimCount} {bounty.claimCount === 1 ? 'claim' : 'claims'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Community Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recent Community Requests</h2>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplace/community">
              View All Requests
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {COMMUNITY_REQUESTS.map((request) => {
            const fundingPercentage = Math.round(
              (request.currentFunding / request.goalFunding) * 100
            );
            return (
              <Card key={request.id} className="h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{request.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Requested by {request.requester}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {request.upvotes} upvotes
                    </Badge>
                    {fundingPercentage >= 100 && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Funded
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Funding</span>
                      <span className="font-medium">
                        {request.currentFunding.toLocaleString()} / {request.goalFunding.toLocaleString()} EDU
                      </span>
                    </div>
                    <Progress
                      value={Math.min(fundingPercentage, 100)}
                      className="h-2"
                      indicatorClassName={fundingPercentage >= 100 ? 'bg-green-500' : undefined}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
