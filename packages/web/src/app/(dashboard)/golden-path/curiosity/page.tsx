'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  ArrowLeft,
  TrendingUp,
  Lightbulb,
  Search,
  BookOpen,
  MessageCircle,
  Compass,
  Zap,
  ArrowRight,
  Eye,
  RotateCcw,
  Play,
} from 'lucide-react';

const stats = [
  { label: 'Curiosity Score', value: '85', icon: Sparkles, color: 'amber' },
  { label: 'Interest Clusters', value: '6', icon: Compass, color: 'violet' },
  { label: 'Emerging Topics', value: '3', icon: TrendingUp, color: 'emerald' },
  { label: 'Signals Today', value: '12', icon: Zap, color: 'blue' },
];

const interestClusters = [
  {
    id: 'cluster-1',
    name: 'Space Exploration',
    topics: ['Astrophysics', 'Mars Missions', 'Orbital Mechanics', 'Telescope Design'],
    strength: 92,
    emerging: false,
    signalCount: 34,
  },
  {
    id: 'cluster-2',
    name: 'Environmental Science',
    topics: ['Climate Change', 'Renewable Energy', 'Ecosystems', 'Conservation'],
    strength: 78,
    emerging: false,
    signalCount: 28,
  },
  {
    id: 'cluster-3',
    name: 'Creative Writing',
    topics: ['Poetry', 'Fiction', 'Narrative Techniques', 'World Building'],
    strength: 65,
    emerging: true,
    signalCount: 15,
  },
  {
    id: 'cluster-4',
    name: 'Robotics & AI',
    topics: ['Machine Learning', 'Arduino', 'Sensor Networks', 'Automation'],
    strength: 88,
    emerging: false,
    signalCount: 31,
  },
  {
    id: 'cluster-5',
    name: 'Ancient History',
    topics: ['Egyptian Civilization', 'Roman Empire', 'Archaeological Methods'],
    strength: 45,
    emerging: true,
    signalCount: 9,
  },
  {
    id: 'cluster-6',
    name: 'Music Theory',
    topics: ['Composition', 'Harmony', 'Rhythm Analysis'],
    strength: 52,
    emerging: true,
    signalCount: 11,
  },
];

const emergingInterests = [
  {
    id: 'ei-1',
    name: 'Creative Writing',
    description: 'Rapidly growing interest in narrative fiction and poetry composition with strong cross-curricular connections.',
    acceleration: '+42% this week',
    relatedDomains: ['English', 'Humanities'],
  },
  {
    id: 'ei-2',
    name: 'Ancient History',
    description: 'Sparked by recent lessons on trade routes. Showing deep engagement with archaeological methods.',
    acceleration: '+28% this week',
    relatedDomains: ['Humanities', 'Science'],
  },
  {
    id: 'ei-3',
    name: 'Music Theory',
    description: 'Connection between mathematics and music has triggered exploration of harmonic structures.',
    acceleration: '+35% this week',
    relatedDomains: ['Arts', 'Mathematics'],
  },
];

const contentSuggestions = [
  {
    id: 'cs-1',
    title: 'The Physics of Black Holes',
    relevance: 96,
    source: 'Space Exploration',
    type: 'Interactive Module',
    duration: '25 min',
  },
  {
    id: 'cs-2',
    title: 'Building a Neural Network from Scratch',
    relevance: 91,
    source: 'Robotics & AI',
    type: 'Hands-on Lab',
    duration: '45 min',
  },
  {
    id: 'cs-3',
    title: 'Climate Data Visualization Workshop',
    relevance: 84,
    source: 'Environmental Science',
    type: 'Workshop',
    duration: '30 min',
  },
  {
    id: 'cs-4',
    title: 'Write Your First Short Story',
    relevance: 78,
    source: 'Creative Writing',
    type: 'Creative Project',
    duration: '60 min',
  },
];

const curiositySignals = [
  { id: 'sig-1', type: 'search', topic: 'Black hole formation', timestamp: '14:30', strength: 95 },
  { id: 'sig-2', type: 'deep-read', topic: 'Photosynthesis mechanisms', timestamp: '13:15', strength: 82 },
  { id: 'sig-3', type: 'question', topic: 'Quantum computing basics', timestamp: '12:00', strength: 88 },
  { id: 'sig-4', type: 'exploration', topic: 'Medieval architecture', timestamp: '11:30', strength: 60 },
  { id: 'sig-5', type: 'revisit', topic: 'DNA replication process', timestamp: '10:45', strength: 75 },
  { id: 'sig-6', type: 'search', topic: 'Climate feedback loops', timestamp: '09:20', strength: 90 },
  { id: 'sig-7', type: 'deep-read', topic: 'Shakespeare sonnets', timestamp: 'Yesterday', strength: 55 },
  { id: 'sig-8', type: 'question', topic: 'Neural network layers', timestamp: 'Yesterday', strength: 85 },
];

const signalTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  search: Search,
  'deep-read': BookOpen,
  question: MessageCircle,
  exploration: Compass,
  revisit: RotateCcw,
};

const signalTypeBadge: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'outline'> = {
  search: 'default',
  'deep-read': 'info',
  question: 'warning',
  exploration: 'secondary',
  revisit: 'outline',
};

export default function CuriosityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/golden-path">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Curiosity Explorer</h1>
            <p className="text-muted-foreground">
              Discover and follow your natural learning interests
            </p>
          </div>
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

      {/* Interest Clusters Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Interest Clusters</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interestClusters.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cluster.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {cluster.emerging && (
                      <Badge variant="warning" className="text-xs">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Emerging
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {cluster.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Strength</span>
                    <span className="font-medium">{cluster.strength}%</span>
                  </div>
                  <Progress
                    value={cluster.strength}
                    className="h-1.5"
                    indicatorClassName={
                      cluster.strength >= 80 ? 'bg-amber-500' : cluster.strength >= 60 ? 'bg-violet-500' : 'bg-blue-500'
                    }
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  {cluster.signalCount} signals recorded
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Emerging Interests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Emerging Interests</CardTitle>
              <CardDescription>
                Rapidly growing areas of curiosity with acceleration indicators
              </CardDescription>
            </div>
            <Badge variant="outline">
              <Lightbulb className="mr-1 h-3 w-3" />
              3 Detected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {emergingInterests.map((interest) => (
              <div
                key={interest.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{interest.name}</h3>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {interest.acceleration}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{interest.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {interest.relatedDomains.map((domain) => (
                    <Badge key={domain} variant="outline" className="text-xs">
                      {domain}
                    </Badge>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  <Compass className="mr-2 h-3 w-3" />
                  Explore
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Content Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Suggestions</CardTitle>
            <CardDescription>
              Personalized recommendations based on your interests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{suggestion.source}</span>
                    <span>-</span>
                    <span>{suggestion.type}</span>
                    <span>-</span>
                    <span>{suggestion.duration}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {suggestion.relevance}% match
                  </Badge>
                  <Button size="sm">
                    <Play className="mr-1 h-3 w-3" />
                    Start
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Curiosity Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Curiosity Signals</CardTitle>
            <CardDescription>
              Tracked exploration activities and interest indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {curiositySignals.map((signal) => {
                const SignalIcon = signalTypeIcon[signal.type] || Eye;
                const badgeVariant = signalTypeBadge[signal.type] || 'outline';
                return (
                  <div
                    key={signal.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <SignalIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{signal.topic}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant} className="text-[10px]">
                          {signal.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{signal.timestamp}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Zap className={`h-3 w-3 ${signal.strength >= 80 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{signal.strength}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
