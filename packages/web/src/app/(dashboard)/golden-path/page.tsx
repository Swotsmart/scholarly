'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Sparkles,
  Target,
  ArrowRight,
  TrendingUp,
  Compass,
  Zap,
} from 'lucide-react';

const stats = [
  { label: 'Overall Mastery', value: '72%', icon: Brain, color: 'violet' },
  { label: 'Curiosity Score', value: '85/100', icon: Sparkles, color: 'amber' },
  { label: 'Paths Optimized', value: '12', icon: Target, color: 'emerald' },
  { label: 'Active Domains', value: '4', icon: Compass, color: 'blue' },
];

const features = [
  {
    title: 'Adaptation Engine',
    description: 'Bayesian Knowledge Tracing monitors your mastery across competencies, adjusts difficulty to your Zone of Proximal Development, and tracks cognitive fatigue to optimize session timing.',
    icon: Brain,
    color: 'violet',
    href: '/golden-path/adaptation',
    stat: '24 competencies tracked',
    badge: 'BKT + ZPD',
  },
  {
    title: 'Curiosity Explorer',
    description: 'Discover emerging interest clusters, follow curiosity signals, and explore personalized content suggestions driven by your natural learning interests.',
    icon: Sparkles,
    color: 'amber',
    href: '/golden-path/curiosity',
    stat: '6 interest clusters',
    badge: 'AI-Powered',
  },
  {
    title: 'Path Optimizer',
    description: 'Multi-objective optimization balances mastery, engagement, efficiency, and well-being to recommend the ideal learning path tailored to your goals.',
    icon: Target,
    color: 'emerald',
    href: '/golden-path/optimizer',
    stat: '7 objectives balanced',
    badge: 'Pareto Optimal',
  },
];

const recentActivity = [
  { label: 'Mastery gained in Algebraic Expressions', time: '2 hours ago', icon: TrendingUp },
  { label: 'New curiosity signal: Black hole formation', time: '4 hours ago', icon: Zap },
  { label: 'Path re-optimized based on fatigue assessment', time: '1 day ago', icon: Target },
];

export default function GoldenPathPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Golden Path</h1>
          <p className="text-muted-foreground">
            Your adaptive learning journey powered by AI
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="mr-1 h-3 w-3" />
          Personalized
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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

      {/* Mastery Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Mastery Overview</CardTitle>
          <CardDescription>Your progress across key learning domains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { domain: 'Mathematics', mastery: 82, color: 'bg-violet-500' },
            { domain: 'Science', mastery: 64, color: 'bg-emerald-500' },
            { domain: 'English', mastery: 68, color: 'bg-blue-500' },
            { domain: 'Humanities', mastery: 62, color: 'bg-amber-500' },
          ].map((item) => (
            <div key={item.domain} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.domain}</span>
                <span className="text-muted-foreground">{item.mastery}%</span>
              </div>
              <Progress value={item.mastery} indicatorClassName={item.color} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg bg-${feature.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${feature.color}-500`} />
                  </div>
                  <Badge variant="outline">{feature.badge}</Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <p className="text-sm font-medium text-muted-foreground">{feature.stat}</p>
                <Button className="w-full" asChild>
                  <Link href={feature.href}>
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest updates from your learning path</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="rounded-lg bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.label}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
