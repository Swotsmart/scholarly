'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Map,
  Trophy,
  FileText,
  ClipboardCheck,
  BookOpen,
  Clock,
  Milestone,
  FolderOpen,
  Calendar,
} from 'lucide-react';

const journeys = [
  {
    id: 'journey-1',
    title: 'STEM Research & Innovation',
    startDate: 'Jan 8, 2024',
    status: 'active',
    duration: '5 weeks',
    milestonesReached: 8,
    artifactsCreated: 3,
    milestones: [
      {
        id: 'jm-1',
        title: 'Started STEM Research Program',
        date: 'Feb 10, 2024',
        description: 'Enrolled in the advanced STEM research track focusing on environmental data analysis.',
        type: 'achievement',
      },
      {
        id: 'jm-2',
        title: 'Completed Data Visualization Project',
        date: 'Feb 7, 2024',
        description: 'Built an interactive dashboard using Python and Plotly to visualize climate data trends.',
        type: 'artifact',
        artifactId: 'art-4',
      },
      {
        id: 'jm-3',
        title: 'Mid-term Assessment: Data Science',
        date: 'Feb 3, 2024',
        description: 'Scored 88% on the data science mid-term covering statistical methods and data wrangling.',
        type: 'assessment',
      },
      {
        id: 'jm-4',
        title: 'Research Methodology Reflection',
        date: 'Jan 28, 2024',
        description: 'Reflected on the challenges of designing reproducible experiments and data collection strategies.',
        type: 'reflection',
      },
      {
        id: 'jm-5',
        title: 'Physics Experiment Recording',
        date: 'Jan 22, 2024',
        description: 'Recorded and analyzed a pendulum wave experiment demonstrating harmonic motion.',
        type: 'artifact',
        artifactId: 'art-3',
      },
      {
        id: 'jm-6',
        title: 'Completed Introductory Statistics Module',
        date: 'Jan 18, 2024',
        description: 'Mastered core statistical concepts including hypothesis testing and confidence intervals.',
        type: 'achievement',
      },
      {
        id: 'jm-7',
        title: 'Baseline Assessment',
        date: 'Jan 12, 2024',
        description: 'Completed initial skills assessment to establish a baseline for the research program.',
        type: 'assessment',
      },
      {
        id: 'jm-8',
        title: 'Journey Kickoff Reflection',
        date: 'Jan 8, 2024',
        description: 'Set goals and expectations for the STEM research journey. Identified key areas of interest.',
        type: 'reflection',
      },
    ],
  },
  {
    id: 'journey-2',
    title: 'Creative Writing & Literature',
    startDate: 'Jan 15, 2024',
    status: 'active',
    duration: '4 weeks',
    milestonesReached: 4,
    artifactsCreated: 1,
    milestones: [
      {
        id: 'jm-9',
        title: 'Poetry Workshop Achievement',
        date: 'Feb 5, 2024',
        description: 'Received commendation for original poetry submission in the creative writing workshop.',
        type: 'achievement',
      },
      {
        id: 'jm-10',
        title: 'Creative Writing Assessment',
        date: 'Jan 30, 2024',
        description: 'Submitted narrative fiction piece for assessment, exploring themes of identity.',
        type: 'assessment',
      },
      {
        id: 'jm-11',
        title: 'Sonnet Analysis Published',
        date: 'Jan 19, 2024',
        description: 'Completed and published literary analysis of Shakespeare Sonnet 18.',
        type: 'artifact',
        artifactId: 'art-7',
      },
      {
        id: 'jm-12',
        title: 'Reading Journey Reflection',
        date: 'Jan 15, 2024',
        description: 'Reflected on reading influences and established a personal literary canon for the term.',
        type: 'reflection',
      },
    ],
  },
];

const milestoneTypeConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'info' | 'warning' | 'outline' | 'success';
}> = {
  achievement: { icon: Trophy, color: 'amber', label: 'Achievement', badgeVariant: 'warning' },
  artifact: { icon: FileText, color: 'blue', label: 'Artifact', badgeVariant: 'info' },
  assessment: { icon: ClipboardCheck, color: 'violet', label: 'Assessment', badgeVariant: 'default' },
  reflection: { icon: BookOpen, color: 'emerald', label: 'Reflection', badgeVariant: 'secondary' },
};

export default function JourneysPage() {
  const [selectedJourneyId, setSelectedJourneyId] = useState(journeys[0].id);
  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId) || journeys[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portfolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Learning Journeys</h1>
            <p className="text-muted-foreground">
              Explore your complete learning timeline and milestones
            </p>
          </div>
        </div>
      </div>

      {/* Journey Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Active Journey:</span>
        <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {journeys.map((journey) => (
              <SelectItem key={journey.id} value={journey.id}>
                {journey.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{selectedJourney.status}</Badge>
      </div>

      {/* Journey Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedJourney.duration}</p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Milestone className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedJourney.milestonesReached}</p>
              <p className="text-sm text-muted-foreground">Milestones Reached</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-violet-500/10 p-3">
              <FolderOpen className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{selectedJourney.artifactsCreated}</p>
              <p className="text-sm text-muted-foreground">Artifacts Created</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{selectedJourney.title}</CardTitle>
              <CardDescription>
                Started {selectedJourney.startDate} - {selectedJourney.milestones.length} milestones
              </CardDescription>
            </div>
            <Badge variant="outline">
              <Map className="mr-1 h-3 w-3" />
              Active Journey
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {selectedJourney.milestones.map((milestone, index) => {
              const config = milestoneTypeConfig[milestone.type];
              const MilestoneIcon = config.icon;
              const isLast = index === selectedJourney.milestones.length - 1;

              return (
                <div key={milestone.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-5 top-12 h-[calc(100%-2rem)] w-0.5 bg-border" />
                  )}

                  {/* Icon */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background border-${config.color}-500`}>
                    <MilestoneIcon className={`h-4 w-4 text-${config.color}-500`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-lg border p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{milestone.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={config.badgeVariant} className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {milestone.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    {milestone.artifactId && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/portfolio/artifacts`}>
                          <FileText className="mr-1 h-3 w-3" />
                          View Artifact
                        </Link>
                      </Button>
                    )}
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
