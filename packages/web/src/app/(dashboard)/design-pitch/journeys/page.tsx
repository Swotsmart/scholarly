'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Clock,
  Target,
  Lightbulb,
  Users,
  Presentation,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const journeys = [
  {
    id: '1',
    title: 'Sustainable Campus App',
    description: 'A mobile app to help students reduce their carbon footprint on campus',
    challenge: 'EcoTech Innovation Challenge 2024',
    currentPhase: 'prototype',
    progress: 65,
    status: 'active',
    problemValidated: true,
    artifactCount: 8,
    reviewCount: 12,
    deadline: '2024-02-15',
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    title: 'Student Wellness Platform',
    description: 'Mental health support platform for university students',
    challenge: 'Health & Wellbeing Design Sprint',
    currentPhase: 'ideate',
    progress: 40,
    status: 'active',
    problemValidated: true,
    artifactCount: 5,
    reviewCount: 6,
    deadline: '2024-02-28',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    title: 'Accessibility in Education',
    description: 'Tools to make learning materials more accessible',
    challenge: 'Inclusive Design Challenge',
    currentPhase: 'empathize',
    progress: 15,
    status: 'active',
    problemValidated: false,
    artifactCount: 2,
    reviewCount: 0,
    deadline: '2024-03-10',
    createdAt: '2024-01-20',
  },
  {
    id: '4',
    title: 'Community Food Sharing',
    description: 'Platform to reduce food waste by connecting neighbors',
    challenge: 'Social Impact Innovation',
    currentPhase: 'pitch',
    progress: 100,
    status: 'completed',
    problemValidated: true,
    artifactCount: 15,
    reviewCount: 24,
    deadline: '2024-01-05',
    createdAt: '2023-11-15',
  },
];

const phases = [
  { id: 'empathize', label: 'Empathize', icon: Users },
  { id: 'define', label: 'Define', icon: Target },
  { id: 'ideate', label: 'Ideate', icon: Lightbulb },
  { id: 'prototype', label: 'Prototype', icon: Edit },
  { id: 'iterate', label: 'Iterate', icon: Users },
  { id: 'pitch', label: 'Pitch', icon: Presentation },
];

function getPhaseIndex(phase: string): number {
  return phases.findIndex((p) => p.id === phase);
}

function getStatusColor(status: string): 'default' | 'success' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'active':
      return 'default';
    default:
      return 'secondary';
  }
}

export default function JourneysPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredJourneys = journeys.filter((journey) => {
    const matchesSearch =
      journey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journey.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && journey.status === 'active') ||
      (activeTab === 'completed' && journey.status === 'completed');
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Design Journeys</h1>
          <p className="text-muted-foreground">
            Track your design thinking projects from problem to pitch
          </p>
        </div>
        <Button asChild>
          <Link href="/design-pitch/journeys/new">
            <Plus className="mr-2 h-4 w-4" />
            Start New Journey
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search journeys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Journey Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredJourneys.map((journey) => {
          const currentPhaseIndex = getPhaseIndex(journey.currentPhase);

          return (
            <Card key={journey.id} hover>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Link
                        href={`/design-pitch/journeys/${journey.id}`}
                        className="hover:underline"
                      >
                        {journey.title}
                      </Link>
                      <Badge variant={getStatusColor(journey.status)}>
                        {journey.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{journey.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/design-pitch/journeys/${journey.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/design-pitch/journeys/${journey.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Challenge Badge */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  {journey.challenge}
                </div>

                {/* Phase Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      Phase: {phases[currentPhaseIndex]?.label}
                    </span>
                    <span className="text-muted-foreground">
                      {journey.progress}% complete
                    </span>
                  </div>
                  <Progress value={journey.progress} className="h-2" />
                  <div className="flex justify-between">
                    {phases.map((phase, index) => {
                      const Icon = phase.icon;
                      const isCompleted = index < currentPhaseIndex;
                      const isCurrent = index === currentPhaseIndex;
                      return (
                        <div
                          key={phase.id}
                          className={`flex flex-col items-center gap-1 ${
                            isCompleted
                              ? 'text-primary'
                              : isCurrent
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[10px]">{phase.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {journey.problemValidated ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                    Problem {journey.problemValidated ? 'Validated' : 'Pending'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    {journey.artifactCount} artifacts
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {journey.reviewCount} reviews
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Due: {new Date(journey.deadline).toLocaleDateString()}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/design-pitch/journeys/${journey.id}`}>
                      Continue
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredJourneys.length === 0 && (
        <Card className="p-12 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No journeys found</h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Start your first design thinking journey'}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/design-pitch/journeys/new">
              <Plus className="mr-2 h-4 w-4" />
              Start New Journey
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
