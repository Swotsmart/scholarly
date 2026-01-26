'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Target,
  Map,
  Award,
  ArrowRight,
  Upload,
  Plus,
  Eye,
  FileText,
  Image,
  Video,
  Code,
  Presentation,
  Palette,
} from 'lucide-react';

const stats = [
  { label: 'Total Artifacts', value: '23', icon: FolderOpen, color: 'blue' },
  { label: 'Learning Goals', value: '5', icon: Target, color: 'violet' },
  { label: 'Active Journeys', value: '2', icon: Map, color: 'emerald' },
  { label: 'Skills Tracked', value: '18', icon: Award, color: 'amber' },
];

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  code: Code,
  presentation: Presentation,
  design: Palette,
};

const typeColor: Record<string, string> = {
  document: 'blue',
  image: 'pink',
  video: 'red',
  code: 'emerald',
  presentation: 'amber',
  design: 'violet',
};

const recentArtifacts = [
  {
    id: 'art-1',
    title: 'Climate Change Research Paper',
    type: 'document',
    date: 'Feb 10, 2024',
    description: 'A comprehensive analysis of climate change impacts on coastal ecosystems.',
  },
  {
    id: 'art-2',
    title: 'Geometric Art Composition',
    type: 'image',
    date: 'Feb 5, 2024',
    description: 'Digital artwork combining mathematical patterns with artistic expression.',
  },
  {
    id: 'art-3',
    title: 'Physics Experiment Demo',
    type: 'video',
    date: 'Feb 1, 2024',
    description: 'Recording of a pendulum wave experiment demonstrating harmonic motion.',
  },
  {
    id: 'art-4',
    title: 'Data Visualization Dashboard',
    type: 'code',
    date: 'Jan 28, 2024',
    description: 'Interactive dashboard built with Python and Plotly for performance data.',
  },
];

const quickLinks = [
  {
    title: 'Artifacts',
    description: 'Browse and manage all learning artifacts',
    icon: FolderOpen,
    href: '/portfolio/artifacts',
    color: 'blue',
  },
  {
    title: 'Learning Goals',
    description: 'Track progress toward your objectives',
    icon: Target,
    href: '/portfolio/goals',
    color: 'violet',
  },
  {
    title: 'Learning Journeys',
    description: 'View your complete learning timeline',
    icon: Map,
    href: '/portfolio/journeys',
    color: 'emerald',
  },
];

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Digital Portfolio</h1>
          <p className="text-muted-foreground">
            Showcase your learning artifacts, goals, and journeys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/portfolio/goals">
              <Plus className="mr-2 h-4 w-4" />
              Set New Goal
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portfolio/artifacts">
              <Upload className="mr-2 h-4 w-4" />
              Upload Artifact
            </Link>
          </Button>
        </div>
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

      {/* Recent Artifacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Artifacts</CardTitle>
              <CardDescription>Your latest learning artifacts and submissions</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio/artifacts">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {recentArtifacts.map((artifact) => {
              const TypeIcon = typeIcon[artifact.type] || FileText;
              const color = typeColor[artifact.type] || 'blue';
              return (
                <Card key={artifact.id} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg bg-${color}-500/10 p-2`}>
                        <TypeIcon className={`h-5 w-5 text-${color}-500`} />
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {artifact.type}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold line-clamp-1">{artifact.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {artifact.description}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{artifact.date}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-3 p-6"
            asChild
          >
            <Link href="/portfolio/artifacts">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Upload Artifact</p>
                <p className="text-xs text-muted-foreground">Add new work to your portfolio</p>
              </div>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-3 p-6"
            asChild
          >
            <Link href="/portfolio/goals">
              <div className="rounded-lg bg-violet-500/10 p-3">
                <Plus className="h-6 w-6 text-violet-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Set New Goal</p>
                <p className="text-xs text-muted-foreground">Define your next learning target</p>
              </div>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-3 p-6"
            asChild
          >
            <Link href="/portfolio/journeys">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <Eye className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">View Journey</p>
                <p className="text-xs text-muted-foreground">Explore your learning timeline</p>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.title} href={link.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-lg bg-${link.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${link.color}-500`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{link.title}</h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
