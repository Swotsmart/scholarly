'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared';
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
  Network,
  Clock,
  Users,
  ChevronRight,
  MousePointer2,
  History,
  Map,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Interest clusters with connections data
const interestClusters = [
  {
    id: 'cluster-1',
    name: 'Space Exploration',
    topics: ['Astrophysics', 'Mars Missions', 'Orbital Mechanics', 'Telescope Design'],
    strength: 92,
    emerging: false,
    signalCount: 34,
    connections: ['cluster-4', 'cluster-2'],
    position: { x: 30, y: 25 },
    size: 'large',
    color: 'bg-violet-500',
  },
  {
    id: 'cluster-2',
    name: 'Environmental Science',
    topics: ['Climate Change', 'Renewable Energy', 'Ecosystems', 'Conservation'],
    strength: 78,
    emerging: false,
    signalCount: 28,
    connections: ['cluster-1', 'cluster-5'],
    position: { x: 65, y: 35 },
    size: 'large',
    color: 'bg-emerald-500',
  },
  {
    id: 'cluster-3',
    name: 'Creative Writing',
    topics: ['Poetry', 'Fiction', 'Narrative Techniques', 'World Building'],
    strength: 65,
    emerging: true,
    signalCount: 15,
    connections: ['cluster-5', 'cluster-6'],
    position: { x: 20, y: 65 },
    size: 'medium',
    color: 'bg-pink-500',
  },
  {
    id: 'cluster-4',
    name: 'Robotics & AI',
    topics: ['Machine Learning', 'Arduino', 'Sensor Networks', 'Automation'],
    strength: 88,
    emerging: false,
    signalCount: 31,
    connections: ['cluster-1', 'cluster-6'],
    position: { x: 50, y: 20 },
    size: 'large',
    color: 'bg-blue-500',
  },
  {
    id: 'cluster-5',
    name: 'Ancient History',
    topics: ['Egyptian Civilization', 'Roman Empire', 'Archaeological Methods'],
    strength: 45,
    emerging: true,
    signalCount: 9,
    connections: ['cluster-2', 'cluster-3'],
    position: { x: 75, y: 60 },
    size: 'small',
    color: 'bg-amber-500',
  },
  {
    id: 'cluster-6',
    name: 'Music Theory',
    topics: ['Composition', 'Harmony', 'Rhythm Analysis'],
    strength: 52,
    emerging: true,
    signalCount: 11,
    connections: ['cluster-3', 'cluster-4'],
    position: { x: 40, y: 75 },
    size: 'medium',
    color: 'bg-indigo-500',
  },
];

// Curiosity timeline/history
const curiosityHistory = [
  {
    id: 'hist-1',
    date: 'Today',
    events: [
      { time: '14:30', topic: 'Black hole formation', type: 'deep-dive', cluster: 'Space Exploration' },
      { time: '13:15', topic: 'Photosynthesis mechanisms', type: 'search', cluster: 'Environmental Science' },
      { time: '12:00', topic: 'Quantum computing basics', type: 'question', cluster: 'Robotics & AI' },
    ],
  },
  {
    id: 'hist-2',
    date: 'Yesterday',
    events: [
      { time: '16:45', topic: 'Shakespeare sonnets analysis', type: 'deep-dive', cluster: 'Creative Writing' },
      { time: '14:20', topic: 'Neural network architecture', type: 'exploration', cluster: 'Robotics & AI' },
      { time: '10:30', topic: 'Climate feedback loops', type: 'search', cluster: 'Environmental Science' },
    ],
  },
  {
    id: 'hist-3',
    date: 'This Week',
    events: [
      { time: 'Mon', topic: 'Mars rover technology', type: 'exploration', cluster: 'Space Exploration' },
      { time: 'Tue', topic: 'Roman aqueduct engineering', type: 'question', cluster: 'Ancient History' },
      { time: 'Wed', topic: 'Musical scales mathematics', type: 'connection', cluster: 'Music Theory' },
    ],
  },
];

// Similar students recommendations
const similarStudentsExplored = [
  {
    id: 'rec-1',
    topic: 'Astrophotography Techniques',
    students: 847,
    matchScore: 94,
    relatedCluster: 'Space Exploration',
  },
  {
    id: 'rec-2',
    topic: 'Game Design with AI',
    students: 623,
    matchScore: 89,
    relatedCluster: 'Robotics & AI',
  },
  {
    id: 'rec-3',
    topic: 'Sustainable Architecture',
    students: 512,
    matchScore: 85,
    relatedCluster: 'Environmental Science',
  },
  {
    id: 'rec-4',
    topic: 'Science Fiction Writing',
    students: 438,
    matchScore: 82,
    relatedCluster: 'Creative Writing',
  },
];

// Content for exploration when clicking clusters
const clusterContent: Record<string, { title: string; type: string; duration: string }[]> = {
  'cluster-1': [
    { title: 'The Physics of Black Holes', type: 'Interactive Module', duration: '25 min' },
    { title: 'Mars Colony Design Challenge', type: 'Project', duration: '2 hours' },
    { title: 'Orbital Mechanics Simulation', type: 'Lab', duration: '45 min' },
  ],
  'cluster-2': [
    { title: 'Climate Data Analysis Workshop', type: 'Workshop', duration: '30 min' },
    { title: 'Design a Renewable Energy System', type: 'Project', duration: '1.5 hours' },
    { title: 'Ecosystem Modeling', type: 'Simulation', duration: '40 min' },
  ],
  'cluster-3': [
    { title: 'Write Your First Short Story', type: 'Creative Project', duration: '60 min' },
    { title: 'Poetry Analysis: Metaphor Deep Dive', type: 'Lesson', duration: '20 min' },
    { title: 'World Building Workshop', type: 'Interactive', duration: '45 min' },
  ],
  'cluster-4': [
    { title: 'Build a Neural Network from Scratch', type: 'Hands-on Lab', duration: '45 min' },
    { title: 'Arduino Robotics Starter', type: 'Project', duration: '2 hours' },
    { title: 'Machine Learning Ethics', type: 'Discussion', duration: '30 min' },
  ],
  'cluster-5': [
    { title: 'Virtual Tour: Ancient Egypt', type: 'VR Experience', duration: '25 min' },
    { title: 'Archaeological Dating Methods', type: 'Lab', duration: '35 min' },
    { title: 'Roman Engineering Marvels', type: 'Documentary', duration: '40 min' },
  ],
  'cluster-6': [
    { title: 'Music Theory Fundamentals', type: 'Course', duration: '30 min' },
    { title: 'Compose Your First Melody', type: 'Creative Project', duration: '45 min' },
    { title: 'The Math Behind Music', type: 'Cross-curricular', duration: '25 min' },
  ],
};

const signalTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  search: Search,
  'deep-dive': BookOpen,
  question: MessageCircle,
  exploration: Compass,
  revisit: RotateCcw,
  connection: Network,
};

export default function CuriosityPage() {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('map');

  const selectedClusterData = useMemo(() => {
    return interestClusters.find((c) => c.id === selectedCluster);
  }, [selectedCluster]);

  // Calculate connection lines between clusters
  const connectionLines = useMemo(() => {
    const lines: { from: typeof interestClusters[0]; to: typeof interestClusters[0] }[] = [];
    const added = new Set<string>();

    interestClusters.forEach((cluster) => {
      cluster.connections.forEach((connId) => {
        const key = [cluster.id, connId].sort().join('-');
        if (!added.has(key)) {
          const connectedCluster = interestClusters.find((c) => c.id === connId);
          if (connectedCluster) {
            lines.push({ from: cluster, to: connectedCluster });
            added.add(key);
          }
        }
      });
    });

    return lines;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curiosity Map"
        description="Discover and follow your natural learning interests"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/golden-path">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Golden Path
            </Link>
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">85</p>
              <p className="text-xs text-muted-foreground">Curiosity Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-violet-500/10 p-2.5">
              <Network className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{interestClusters.length}</p>
              <p className="text-xs text-muted-foreground">Interest Clusters</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{interestClusters.filter((c) => c.emerging).length}</p>
              <p className="text-xs text-muted-foreground">Emerging Topics</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Signals Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="map">
            <Map className="mr-2 h-4 w-4" />
            Interactive Map
          </TabsTrigger>
          <TabsTrigger value="clusters">
            <Network className="mr-2 h-4 w-4" />
            Clusters
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Users className="mr-2 h-4 w-4" />
            Similar Students
          </TabsTrigger>
        </TabsList>

        {/* Interactive Cluster Diagram */}
        <TabsContent value="map" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Interest Cluster Diagram</CardTitle>
                      <CardDescription>
                        Click a cluster to explore related content
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MousePointer2 className="h-3 w-3" />
                      Interactive
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative h-[400px] w-full rounded-lg border bg-muted/20">
                    {/* SVG for connection lines */}
                    <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
                      {connectionLines.map((line, idx) => {
                        const isHighlighted =
                          hoveredCluster === line.from.id ||
                          hoveredCluster === line.to.id ||
                          selectedCluster === line.from.id ||
                          selectedCluster === line.to.id;
                        return (
                          <line
                            key={idx}
                            x1={`${line.from.position.x}%`}
                            y1={`${line.from.position.y}%`}
                            x2={`${line.to.position.x}%`}
                            y2={`${line.to.position.y}%`}
                            stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.2)'}
                            strokeWidth={isHighlighted ? 2 : 1}
                            strokeDasharray={isHighlighted ? 'none' : '4 4'}
                            className="transition-all"
                          />
                        );
                      })}
                    </svg>

                    {/* Cluster nodes */}
                    {interestClusters.map((cluster) => {
                      const sizeClasses = {
                        small: 'h-16 w-16',
                        medium: 'h-20 w-20',
                        large: 'h-24 w-24',
                      };
                      const isSelected = selectedCluster === cluster.id;
                      const isHovered = hoveredCluster === cluster.id;
                      const isConnected =
                        hoveredCluster &&
                        (cluster.connections.includes(hoveredCluster) ||
                          interestClusters.find((c) => c.id === hoveredCluster)?.connections.includes(cluster.id));

                      return (
                        <button
                          key={cluster.id}
                          className={cn(
                            'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 transition-all',
                            sizeClasses[cluster.size as keyof typeof sizeClasses],
                            cluster.color,
                            'text-white',
                            isSelected && 'ring-4 ring-primary/30 scale-110',
                            isHovered && 'scale-105',
                            isConnected && 'ring-2 ring-primary/20',
                            cluster.emerging && 'animate-pulse'
                          )}
                          style={{
                            left: `${cluster.position.x}%`,
                            top: `${cluster.position.y}%`,
                          }}
                          onClick={() => setSelectedCluster(isSelected ? null : cluster.id)}
                          onMouseEnter={() => setHoveredCluster(cluster.id)}
                          onMouseLeave={() => setHoveredCluster(null)}
                        >
                          <span className="text-[10px] font-semibold text-center px-1 leading-tight">
                            {cluster.name}
                          </span>
                          <span className="text-[9px] opacity-80">{cluster.strength}%</span>
                        </button>
                      );
                    })}

                    {/* Legend */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-4 rounded-lg bg-background/80 p-2 text-xs backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-violet-500" />
                        <span>Strong</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        <span>Emerging</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-px w-4 border-t border-dashed border-muted-foreground" />
                        <span>Connected</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cluster Details Panel */}
            <div>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {selectedClusterData ? selectedClusterData.name : 'Select a Cluster'}
                  </CardTitle>
                  {selectedClusterData && (
                    <CardDescription>
                      {selectedClusterData.signalCount} signals recorded
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedClusterData ? (
                    <div className="space-y-4">
                      {/* Strength indicator */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Interest Strength</span>
                          <span className="font-medium">{selectedClusterData.strength}%</span>
                        </div>
                        <Progress
                          value={selectedClusterData.strength}
                          className="h-2"
                          indicatorClassName={selectedClusterData.color}
                        />
                      </div>

                      {/* Topics */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Topics</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedClusterData.topics.map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Connections */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Connected To</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedClusterData.connections.map((connId) => {
                            const conn = interestClusters.find((c) => c.id === connId);
                            return conn ? (
                              <Badge
                                key={connId}
                                variant="outline"
                                className="cursor-pointer text-xs hover:bg-muted"
                                onClick={() => setSelectedCluster(connId)}
                              >
                                {conn.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Related Content */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Explore Content</p>
                        <div className="space-y-2">
                          {clusterContent[selectedClusterData.id]?.map((content, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{content.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {content.type} - {content.duration}
                                </p>
                              </div>
                              <Button size="icon-sm" variant="ghost">
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                      <MousePointer2 className="h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click on a cluster in the diagram to see details and explore related content
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Clusters Grid View */}
        <TabsContent value="clusters" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interestClusters.map((cluster) => (
              <Card key={cluster.id} hover className="cursor-pointer" onClick={() => {
                setSelectedCluster(cluster.id);
                setActiveTab('map');
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-3 w-3 rounded-full', cluster.color)} />
                      <CardTitle className="text-base">{cluster.name}</CardTitle>
                    </div>
                    {cluster.emerging && (
                      <Badge variant="warning" className="text-xs">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Emerging
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.topics.slice(0, 3).map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {cluster.topics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{cluster.topics.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Strength</span>
                      <span className="font-medium">{cluster.strength}%</span>
                    </div>
                    <Progress
                      value={cluster.strength}
                      className="h-1.5"
                      indicatorClassName={cluster.color}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {cluster.signalCount} signals
                    </span>
                    <span className="flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      {cluster.connections.length} connections
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Timeline */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Curiosity Timeline</CardTitle>
                  <CardDescription>Your exploration history and interest signals</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-3 w-3" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {curiosityHistory.map((day) => (
                  <div key={day.id} className="relative">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        {day.date}
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="ml-4 space-y-3 border-l-2 border-muted pl-6">
                      {day.events.map((event, idx) => {
                        const Icon = signalTypeIcon[event.type] || Eye;
                        return (
                          <div
                            key={idx}
                            className="relative flex items-start gap-3"
                          >
                            <div className="absolute -left-[31px] rounded-full border-2 border-background bg-muted p-1">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{event.topic}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {event.time}
                                <span className="text-muted">-</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {event.cluster}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {event.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar Students Recommendations */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Students Like You Explored
                  </CardTitle>
                  <CardDescription>
                    Personalized recommendations based on similar learning profiles
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI-Powered
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {similarStudentsExplored.map((rec) => (
                  <div
                    key={rec.id}
                    className="group rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h4 className="font-medium">{rec.topic}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {rec.relatedCluster}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {rec.matchScore}% match
                          </Badge>
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {rec.students.toLocaleString()} students explored this
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exploration Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suggested Explorations</CardTitle>
              <CardDescription>
                Based on your curiosity patterns and emerging interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {interestClusters
                  .filter((c) => c.emerging)
                  .map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-center gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
                    >
                      <div className={cn('rounded-lg p-2', cluster.color.replace('bg-', 'bg-') + '/10')}>
                        <Lightbulb className={cn('h-5 w-5', cluster.color.replace('bg-', 'text-'))} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{cluster.name}</p>
                          <Badge variant="warning" className="text-xs">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Growing interest
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cluster.topics.slice(0, 2).join(', ')} and more
                        </p>
                      </div>
                      <Button size="sm">
                        Explore
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
