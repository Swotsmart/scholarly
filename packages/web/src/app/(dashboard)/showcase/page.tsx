'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  TrendingUp,
  Eye,
  MessageSquare,
  Sparkles,
  ArrowRight,
  BarChart3,
  Globe,
  Lock,
} from 'lucide-react';

const stats = [
  { label: 'Total Portfolios', value: '2', icon: FolderOpen },
  { label: 'Total Views', value: '127', icon: Eye },
  { label: 'Guestbook Entries', value: '5', icon: MessageSquare },
  { label: 'Skills Identified', value: '8', icon: Sparkles },
];

const recentPortfolio = {
  id: 'showcase_emma_ecosip',
  title: 'EcoSip: Sustainable Campus Innovation',
  headline: 'My journey designing eco-friendly solutions for student water consumption',
  status: 'published',
  isPublic: true,
  views: 47,
  uniqueViews: 32,
  guestbookCount: 3,
  skillTags: ['User Research', 'Rapid Prototyping', 'Design Thinking', 'Sustainability'],
  customSlug: 'emma-ecosip-2024',
};

export default function ShowcasePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Showcase</h1>
          <p className="text-muted-foreground">
            Transform your design journeys into professional portfolios
          </p>
        </div>
        <Button asChild>
          <Link href="/showcase/portfolios">
            View All Portfolios
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
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

      {/* Featured Portfolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Featured Portfolio
              </CardTitle>
              <CardDescription>Your most viewed showcase</CardDescription>
            </div>
            <Badge variant="success" className="gap-1">
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{recentPortfolio.title}</h3>
            <p className="text-muted-foreground">{recentPortfolio.headline}</p>
          </div>

          {/* Skill Tags */}
          <div className="flex flex-wrap gap-2">
            {recentPortfolio.skillTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          {/* Analytics Summary */}
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp className="h-5 w-5 text-primary" />
                {recentPortfolio.views}
              </div>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{recentPortfolio.uniqueViews}</div>
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                <MessageSquare className="h-5 w-5 text-primary" />
                {recentPortfolio.guestbookCount}
              </div>
              <p className="text-sm text-muted-foreground">Guestbook</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button asChild>
              <Link href={`/showcase/portfolios/${recentPortfolio.id}`}>
                View Portfolio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/showcase/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <FolderOpen className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Create New Portfolio</h3>
              <p className="text-sm text-muted-foreground">
                Turn a completed journey into a showcase
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">View Analytics</h3>
              <p className="text-sm text-muted-foreground">
                See who's viewing your portfolios
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
