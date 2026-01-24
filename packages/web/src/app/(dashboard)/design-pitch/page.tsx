'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lightbulb,
  Target,
  Users,
  Edit,
  Presentation,
  ArrowRight,
  Sparkles,
  BookOpen,
  Trophy,
  TrendingUp,
} from 'lucide-react';

// Design Thinking Phases
const phases = [
  {
    id: 'empathize',
    title: 'Empathize',
    description: 'Understand your users through research and observation',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'define',
    title: 'Define',
    description: 'Synthesize insights into a clear problem statement',
    icon: Target,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'ideate',
    title: 'Ideate',
    description: 'Generate creative solutions through brainstorming',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'prototype',
    title: 'Prototype',
    description: 'Build quick, testable versions of your ideas',
    icon: Edit,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'iterate',
    title: 'Iterate',
    description: 'Refine based on feedback and testing',
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'pitch',
    title: 'Pitch',
    description: 'Present your solution using the 10/20/30 rule',
    icon: Presentation,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
];

// Sample stats
const stats = [
  { label: 'Active Journeys', value: '3', icon: Lightbulb },
  { label: 'Artifacts Created', value: '24', icon: Edit },
  { label: 'Peer Reviews', value: '18', icon: Users },
  { label: 'Challenges Completed', value: '2', icon: Trophy },
];

// Sample active journey
const activeJourney = {
  id: 'journey_emma_sustainability',
  title: 'EcoSip: Sustainable Campus Innovation',
  challenge: 'Sustainable Campus Life',
  currentPhase: 'prototype',
  progress: 62,
  problemStatement: 'Students throw away 200+ plastic bottles daily, contributing to landfill waste.',
};

export default function DesignPitchPage() {
  const currentPhaseIndex = phases.findIndex(p => p.id === activeJourney.currentPhase);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Design & Pitch AI</h1>
          <p className="text-muted-foreground">
            Transform ideas into impactful solutions through design thinking
          </p>
        </div>
        <Button asChild>
          <Link href="/design-pitch/journeys">
            View All Journeys
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

      {/* Active Journey */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Continue Your Journey
              </CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </div>
            <Badge>In Progress</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{activeJourney.title}</h3>
            <p className="text-sm text-muted-foreground">{activeJourney.challenge}</p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Problem Statement</p>
            <p className="mt-1 text-muted-foreground">{activeJourney.problemStatement}</p>
          </div>

          {/* Phase Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Current Phase: {phases[currentPhaseIndex]?.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {activeJourney.progress}% complete
              </span>
            </div>
            <Progress value={activeJourney.progress} className="h-2" />
            <div className="flex justify-between">
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                const isCompleted = index < currentPhaseIndex;
                const isCurrent = index === currentPhaseIndex;
                return (
                  <div
                    key={phase.id}
                    className={`flex flex-col items-center gap-2 ${
                      isCompleted || isCurrent ? phase.color : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`rounded-full p-2 ${isCompleted || isCurrent ? phase.bgColor : 'bg-muted'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{phase.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <Button asChild>
              <Link href={`/design-pitch/journeys/${activeJourney.id}`}>
                Continue Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/design-pitch/journeys/new">
                Start New Journey
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Design Thinking Process */}
      <div>
        <h2 className="heading-3 mb-4">The Design Thinking Process</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <Card key={phase.id} className="group cursor-pointer transition-shadow hover:shadow-lg">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`rounded-lg p-3 ${phase.bgColor}`}>
                    <Icon className={`h-6 w-6 ${phase.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{phase.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 10/20/30 Rule */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="rounded-lg bg-primary/10 p-4">
            <Presentation className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Master the 10/20/30 Rule</h3>
            <p className="text-muted-foreground">
              Create professional pitches: 10 slides max, 20 minutes max, 30pt minimum font size
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/design-pitch/pitch-guide">
              <BookOpen className="mr-2 h-4 w-4" />
              Learn More
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
