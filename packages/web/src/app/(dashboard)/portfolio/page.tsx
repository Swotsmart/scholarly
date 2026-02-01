'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FolderOpen,
  Target,
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
  TrendingUp,
  Users,
  Clock,
  Star,
  Edit,
  BarChart3,
  CheckCircle2,
  Circle,
  Folder,
  Trophy,
  Sparkles,
  Calendar,
  ExternalLink,
} from 'lucide-react';

// Collections data
const collections = [
  {
    id: 'col-1',
    name: 'Science Projects',
    description: 'STEM research and experiments',
    artifactCount: 8,
    color: 'emerald',
    icon: Code,
    lastUpdated: 'Feb 10, 2024',
  },
  {
    id: 'col-2',
    name: 'Creative Writing',
    description: 'Essays, poetry, and stories',
    artifactCount: 5,
    color: 'violet',
    icon: FileText,
    lastUpdated: 'Feb 8, 2024',
  },
  {
    id: 'col-3',
    name: 'Art & Design',
    description: 'Visual art and design work',
    artifactCount: 6,
    color: 'pink',
    icon: Palette,
    lastUpdated: 'Feb 5, 2024',
  },
  {
    id: 'col-4',
    name: 'Presentations',
    description: 'Slide decks and demos',
    artifactCount: 4,
    color: 'amber',
    icon: Presentation,
    lastUpdated: 'Jan 28, 2024',
  },
];

// Recent work data
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
    status: 'published',
  },
  {
    id: 'art-2',
    title: 'Geometric Art Composition',
    type: 'image',
    date: 'Feb 5, 2024',
    description: 'Digital artwork combining mathematical patterns with artistic expression.',
    status: 'draft',
  },
  {
    id: 'art-3',
    title: 'Physics Experiment Demo',
    type: 'video',
    date: 'Feb 1, 2024',
    description: 'Recording of a pendulum wave experiment demonstrating harmonic motion.',
    status: 'published',
  },
  {
    id: 'art-4',
    title: 'Data Visualization Dashboard',
    type: 'code',
    date: 'Jan 28, 2024',
    description: 'Interactive dashboard built with Python and Plotly for performance data.',
    status: 'published',
  },
];

// SMART Goals data
const goals = [
  {
    id: 'goal-1',
    title: 'Master Calculus Fundamentals',
    targetDate: 'Apr 30, 2024',
    progress: 68,
    status: 'on-track',
    milestonesCompleted: 3,
    totalMilestones: 5,
  },
  {
    id: 'goal-2',
    title: 'Complete Extended Essay',
    targetDate: 'May 20, 2024',
    progress: 82,
    status: 'on-track',
    milestonesCompleted: 4,
    totalMilestones: 5,
  },
  {
    id: 'goal-3',
    title: 'Build Full-Stack App',
    targetDate: 'Mar 15, 2024',
    progress: 45,
    status: 'at-risk',
    milestonesCompleted: 2,
    totalMilestones: 5,
  },
];

// Achievements data
const achievements = [
  {
    id: 'ach-1',
    name: 'Research Pioneer',
    description: 'Complete 5 research-based artifacts',
    icon: Trophy,
    color: 'amber',
    earned: true,
    earnedDate: 'Feb 8, 2024',
    progress: 100,
  },
  {
    id: 'ach-2',
    name: 'Creative Writer',
    description: 'Publish 3 creative writing pieces',
    icon: Star,
    color: 'violet',
    earned: true,
    earnedDate: 'Jan 25, 2024',
    progress: 100,
  },
  {
    id: 'ach-3',
    name: 'Code Master',
    description: 'Submit 10 coding projects',
    icon: Code,
    color: 'emerald',
    earned: false,
    earnedDate: null,
    progress: 60,
  },
  {
    id: 'ach-4',
    name: 'Visual Artist',
    description: 'Create 5 art or design pieces',
    icon: Palette,
    color: 'pink',
    earned: false,
    earnedDate: null,
    progress: 80,
  },
  {
    id: 'ach-5',
    name: 'Presentation Pro',
    description: 'Deliver 3 presentations',
    icon: Presentation,
    color: 'blue',
    earned: false,
    earnedDate: null,
    progress: 33,
  },
  {
    id: 'ach-6',
    name: 'Goal Setter',
    description: 'Complete 3 SMART goals',
    icon: Target,
    color: 'red',
    earned: false,
    earnedDate: null,
    progress: 67,
  },
];

// Analytics data
const analyticsStats = {
  totalViews: 247,
  uniqueVisitors: 89,
  avgEngagementTime: '3m 42s',
  showcaseViews: 127,
  topArtifact: 'Climate Change Research Paper',
  topArtifactViews: 45,
};

export default function PortfolioPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('collections');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Handle file upload logic here
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Digital Portfolio</h1>
          <p className="text-muted-foreground">
            Showcase your learning artifacts, track goals, and celebrate achievements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/portfolio/showcase">
              <Eye className="mr-2 h-4 w-4" />
              View Showcase
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

      {/* Quick Upload - Drag and Drop */}
      <Card
        className={`transition-all ${
          isDragOver
            ? 'border-primary border-2 bg-primary/5'
            : 'border-dashed border-2 border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className={`rounded-lg p-3 ${isDragOver ? 'bg-primary/10' : 'bg-muted'}`}>
            <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium">
              {isDragOver ? 'Drop files to upload' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse - supports documents, images, videos, code, and more
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-3">
            <Plus className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="recent">Recent Work</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Organize your artifacts into themed collections</p>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {collections.map((collection) => {
              const Icon = collection.icon;
              return (
                <Card key={collection.id} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg bg-${collection.color}-500/10 p-2.5`}>
                        <Icon className={`h-5 w-5 text-${collection.color}-500`} />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {collection.artifactCount} items
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{collection.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{collection.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {collection.lastUpdated}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Recent Work Tab */}
        <TabsContent value="recent" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Your latest artifacts with quick access</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio/artifacts">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {recentArtifacts.map((artifact) => {
              const TypeIcon = typeIcon[artifact.type] || FileText;
              const color = typeColor[artifact.type] || 'blue';
              return (
                <Card key={artifact.id} className="cursor-pointer transition-shadow hover:shadow-md group">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg bg-${color}-500/10 p-2`}>
                        <TypeIcon className={`h-5 w-5 text-${color}-500`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={artifact.status === 'published' ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {artifact.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          asChild
                        >
                          <Link href={`/portfolio/artifacts/${artifact.id}`}>
                            <Edit className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold line-clamp-1">{artifact.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {artifact.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{artifact.date}</p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/portfolio/artifacts/${artifact.id}`}>
                          View
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Track your SMART learning goals</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio/goals">
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold">{goal.title}</h3>
                        <Badge
                          variant={goal.status === 'on-track' ? 'default' : 'warning'}
                          className="text-xs"
                        >
                          {goal.status === 'on-track' ? 'On Track' : 'At Risk'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {goal.targetDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {goal.milestonesCompleted}/{goal.totalMilestones} milestones
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={goal.progress} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-10 text-right">{goal.progress}%</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/portfolio/goals">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/portfolio/goals">
              View All Goals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Badges earned through your learning journey</p>
            <div className="text-sm">
              <span className="font-medium">{achievements.filter((a) => a.earned).length}</span>
              <span className="text-muted-foreground">/{achievements.length} earned</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <Card
                  key={achievement.id}
                  className={`transition-all ${
                    achievement.earned ? '' : 'opacity-75'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2.5 ${
                          achievement.earned
                            ? `bg-${achievement.color}-500/10`
                            : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            achievement.earned
                              ? `text-${achievement.color}-500`
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">{achievement.name}</h3>
                          {achievement.earned && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {achievement.description}
                        </p>
                        {achievement.earned ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            Earned {achievement.earnedDate}
                          </p>
                        ) : (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{achievement.progress}%</span>
                            </div>
                            <Progress value={achievement.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Portfolio views and engagement metrics</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio/showcase">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Showcase
              </Link>
            </Button>
          </div>

          {/* Analytics Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Eye className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsStats.totalViews}</p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsStats.uniqueVisitors}</p>
                  <p className="text-sm text-muted-foreground">Unique Visitors</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-violet-500/10 p-3">
                  <Clock className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsStats.avgEngagementTime}</p>
                  <p className="text-sm text-muted-foreground">Avg. Engagement</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsStats.showcaseViews}</p>
                  <p className="text-sm text-muted-foreground">Showcase Views</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Content</CardTitle>
              <CardDescription>Your most viewed artifacts this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{analyticsStats.topArtifact}</h3>
                  <p className="text-sm text-muted-foreground">
                    {analyticsStats.topArtifactViews} views this month
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/portfolio/artifacts/art-1">
                    View
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/portfolio/artifacts">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">All Artifacts</h3>
                <p className="text-sm text-muted-foreground">Browse your complete collection</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/portfolio/goals">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-violet-500/10 p-3">
                <Target className="h-6 w-6 text-violet-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Learning Goals</h3>
                <p className="text-sm text-muted-foreground">Track and manage objectives</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/portfolio/journeys">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Learning Journeys</h3>
                <p className="text-sm text-muted-foreground">Explore your timeline</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
