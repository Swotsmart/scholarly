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
  ArrowRight,
  MessageSquare,
  Sparkles,
  FileText,
  Image,
  Code,
  Video,
  FlaskConical,
  Heart,
  Pencil,
  Box,
  Repeat,
  Mic,
  Calendar,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  History,
} from 'lucide-react';

// Design Thinking Phases
const phases = [
  { id: 'empathize', label: 'Empathize', icon: Heart, description: 'Understand users' },
  { id: 'define', label: 'Define', icon: Target, description: 'Frame the problem' },
  { id: 'ideate', label: 'Ideate', icon: Lightbulb, description: 'Generate ideas' },
  { id: 'prototype', label: 'Prototype', icon: Box, description: 'Build solutions' },
  { id: 'test', label: 'Test', icon: FlaskConical, description: 'Validate ideas' },
  { id: 'pitch', label: 'Pitch', icon: Mic, description: 'Present solution' },
];

// Sample journeys data
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
    iterations: 3,
    peerReviewStatus: 'approved',
    peerReviewScore: 4.2,
    phaseArtifacts: {
      empathize: [
        { id: 'a1', title: 'User Interview Notes', type: 'document' },
        { id: 'a2', title: 'Empathy Map', type: 'image' },
      ],
      define: [
        { id: 'a3', title: 'Problem Statement', type: 'document' },
        { id: 'a4', title: 'User Personas', type: 'image' },
      ],
      ideate: [
        { id: 'a5', title: 'Brainstorm Session', type: 'image' },
        { id: 'a6', title: 'Solution Sketches', type: 'image' },
      ],
      prototype: [
        { id: 'a7', title: 'Low-Fi Wireframes', type: 'image' },
        { id: 'a8', title: 'Interactive Prototype', type: 'code' },
      ],
      test: [],
      pitch: [],
    },
    timeline: [
      { date: '2024-01-10', event: 'Journey started', phase: 'empathize', version: 'v1.0' },
      { date: '2024-01-15', event: 'Completed user interviews', phase: 'empathize', version: 'v1.0' },
      { date: '2024-01-20', event: 'Problem statement defined', phase: 'define', version: 'v1.0' },
      { date: '2024-01-25', event: 'Ideation session completed', phase: 'ideate', version: 'v1.0' },
      { date: '2024-02-01', event: 'First prototype created', phase: 'prototype', version: 'v1.0' },
      { date: '2024-02-05', event: 'Prototype iteration 2', phase: 'prototype', version: 'v2.0' },
      { date: '2024-02-08', event: 'Prototype iteration 3', phase: 'prototype', version: 'v3.0' },
    ],
    aiCoaching: {
      currentPhase: 'prototype',
      tips: [
        'Focus on the core user flow first before adding features',
        'Test your prototype with at least 5 users before iterating',
        'Document user feedback systematically for analysis',
      ],
      resources: [
        { title: 'Prototyping Best Practices', type: 'article' },
        { title: 'User Testing Guide', type: 'video' },
      ],
    },
    feedback: [
      { reviewer: 'Peer 1', score: 4, comment: 'Great user research!', phase: 'empathize' },
      { reviewer: 'Peer 2', score: 4.5, comment: 'Clear problem definition', phase: 'define' },
      { reviewer: 'Teacher', score: 4.2, comment: 'Strong ideation process', phase: 'ideate' },
    ],
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
    iterations: 1,
    peerReviewStatus: 'pending',
    peerReviewScore: null,
    phaseArtifacts: {
      empathize: [{ id: 'b1', title: 'Survey Results', type: 'document' }],
      define: [{ id: 'b2', title: 'POV Statement', type: 'document' }],
      ideate: [
        { id: 'b3', title: 'Mind Map', type: 'image' },
        { id: 'b4', title: 'Feature Ideas', type: 'document' },
      ],
      prototype: [],
      test: [],
      pitch: [],
    },
    timeline: [
      { date: '2024-01-15', event: 'Journey started', phase: 'empathize', version: 'v1.0' },
      { date: '2024-01-22', event: 'Survey completed', phase: 'empathize', version: 'v1.0' },
      { date: '2024-01-28', event: 'Problem defined', phase: 'define', version: 'v1.0' },
      { date: '2024-02-03', event: 'Ideation in progress', phase: 'ideate', version: 'v1.0' },
    ],
    aiCoaching: {
      currentPhase: 'ideate',
      tips: [
        'Use "How Might We" questions to reframe challenges',
        'Aim for quantity over quality in brainstorming',
        'Build on others\' ideas with "Yes, and..." thinking',
      ],
      resources: [
        { title: 'Ideation Techniques', type: 'article' },
        { title: 'Creative Thinking Workshop', type: 'video' },
      ],
    },
    feedback: [
      { reviewer: 'Peer 1', score: 3.8, comment: 'Good research depth', phase: 'empathize' },
    ],
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
    iterations: 1,
    peerReviewStatus: 'not_started',
    peerReviewScore: null,
    phaseArtifacts: {
      empathize: [{ id: 'c1', title: 'Research Plan', type: 'document' }],
      define: [],
      ideate: [],
      prototype: [],
      test: [],
      pitch: [],
    },
    timeline: [
      { date: '2024-01-20', event: 'Journey started', phase: 'empathize', version: 'v1.0' },
      { date: '2024-01-25', event: 'Research plan created', phase: 'empathize', version: 'v1.0' },
    ],
    aiCoaching: {
      currentPhase: 'empathize',
      tips: [
        'Interview users with diverse accessibility needs',
        'Shadow users in their natural environment',
        'Look for workarounds users have created',
      ],
      resources: [
        { title: 'Accessibility Research Methods', type: 'article' },
        { title: 'Inclusive Design Principles', type: 'video' },
      ],
    },
    feedback: [],
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
    iterations: 5,
    peerReviewStatus: 'approved',
    peerReviewScore: 4.8,
    phaseArtifacts: {
      empathize: [
        { id: 'd1', title: 'Interview Recordings', type: 'video' },
        { id: 'd2', title: 'Observation Notes', type: 'document' },
      ],
      define: [
        { id: 'd3', title: 'Problem Statement', type: 'document' },
        { id: 'd4', title: 'User Journey Map', type: 'image' },
      ],
      ideate: [
        { id: 'd5', title: 'Concept Sketches', type: 'image' },
        { id: 'd6', title: 'Feature Matrix', type: 'document' },
      ],
      prototype: [
        { id: 'd7', title: 'Hi-Fi Mockups', type: 'image' },
        { id: 'd8', title: 'Clickable Prototype', type: 'code' },
      ],
      test: [
        { id: 'd9', title: 'Usability Test Report', type: 'document' },
        { id: 'd10', title: 'Iteration Log', type: 'document' },
      ],
      pitch: [
        { id: 'd11', title: 'Pitch Deck', type: 'document' },
        { id: 'd12', title: 'Demo Video', type: 'video' },
      ],
    },
    timeline: [
      { date: '2023-11-15', event: 'Journey started', phase: 'empathize', version: 'v1.0' },
      { date: '2023-11-25', event: 'User research complete', phase: 'empathize', version: 'v1.0' },
      { date: '2023-12-01', event: 'Problem defined', phase: 'define', version: 'v1.0' },
      { date: '2023-12-10', event: 'Ideation complete', phase: 'ideate', version: 'v1.0' },
      { date: '2023-12-20', event: 'First prototype', phase: 'prototype', version: 'v1.0' },
      { date: '2023-12-28', event: 'User testing', phase: 'test', version: 'v2.0' },
      { date: '2024-01-03', event: 'Final pitch', phase: 'pitch', version: 'v5.0' },
    ],
    aiCoaching: {
      currentPhase: 'pitch',
      tips: [
        'Start with a compelling story about user pain',
        'Show the journey from problem to solution',
        'End with a clear call to action',
      ],
      resources: [
        { title: 'Pitch Presentation Tips', type: 'article' },
        { title: 'Storytelling for Designers', type: 'video' },
      ],
    },
    feedback: [
      { reviewer: 'Peer 1', score: 4.5, comment: 'Excellent research!', phase: 'empathize' },
      { reviewer: 'Peer 2', score: 5, comment: 'Great problem framing', phase: 'define' },
      { reviewer: 'Teacher', score: 4.8, comment: 'Outstanding pitch!', phase: 'pitch' },
    ],
  },
];

// Type icon mapping
const artifactTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  code: Code,
};

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

function getPeerReviewBadge(status: string, score: number | null) {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="success" className="gap-1">
          <ThumbsUp className="h-3 w-3" />
          {score?.toFixed(1)}
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="gap-1">
          <ThumbsDown className="h-3 w-3" />
          Needs Revision
        </Badge>
      );
    default:
      return null;
  }
}

export default function JourneysPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedJourney, setSelectedJourney] = useState<typeof journeys[0] | null>(null);

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
            Track your design thinking projects through all phases
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
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredJourneys.map((journey) => {
          const currentPhaseIndex = getPhaseIndex(journey.currentPhase);

          return (
            <Card key={journey.id} hover className="overflow-hidden">
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

                {/* Phase Stepper */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      {(() => {
                        const PhaseIcon = phases[currentPhaseIndex]?.icon || Target;
                        return <PhaseIcon className="h-4 w-4 text-primary" />;
                      })()}
                      Current: {phases[currentPhaseIndex]?.label}
                    </span>
                    <span className="text-muted-foreground">
                      {journey.progress}% complete
                    </span>
                  </div>
                  <Progress value={journey.progress} className="h-2" />

                  {/* Phase Indicators */}
                  <div className="flex justify-between pt-2">
                    {phases.map((phase, index) => {
                      const PhaseIcon = phase.icon;
                      const isCompleted = index < currentPhaseIndex;
                      const isCurrent = index === currentPhaseIndex;
                      const hasArtifacts = journey.phaseArtifacts[phase.id as keyof typeof journey.phaseArtifacts]?.length > 0;

                      return (
                        <div
                          key={phase.id}
                          className={`flex flex-col items-center gap-1 ${
                            isCompleted
                              ? 'text-primary'
                              : isCurrent
                              ? 'text-primary'
                              : 'text-muted-foreground/50'
                          }`}
                        >
                          <div
                            className={`relative rounded-full p-1.5 ${
                              isCompleted
                                ? 'bg-primary text-primary-foreground'
                                : isCurrent
                                ? 'bg-primary/20 ring-2 ring-primary'
                                : 'bg-muted'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <PhaseIcon className="h-4 w-4" />
                            )}
                            {hasArtifacts && !isCompleted && (
                              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium">{phase.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats Row */}
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
                    <FileText className="h-4 w-4" />
                    {journey.artifactCount} artifacts
                  </div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    v{journey.iterations}.0
                  </div>
                </div>

                {/* Peer Review Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{journey.reviewCount} reviews</span>
                    {getPeerReviewBadge(journey.peerReviewStatus, journey.peerReviewScore)}
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
                      {journey.status === 'completed' ? 'View' : 'Continue'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Journey Details Panel */}
      {selectedJourney && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedJourney.title} - Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedJourney(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="artifacts">
              <TabsList>
                <TabsTrigger value="artifacts">Phase Artifacts</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="coaching">AI Coaching</TabsTrigger>
                <TabsTrigger value="feedback">Peer Feedback</TabsTrigger>
              </TabsList>

              <TabsContent value="artifacts" className="space-y-4">
                {phases.map((phase) => {
                  const artifacts = selectedJourney.phaseArtifacts[phase.id as keyof typeof selectedJourney.phaseArtifacts] || [];
                  const PhaseIcon = phase.icon;
                  return (
                    <div key={phase.id} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <PhaseIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{phase.label}</span>
                        <Badge variant="secondary" className="text-xs">{artifacts.length} items</Badge>
                      </div>
                      {artifacts.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {artifacts.map((artifact) => {
                            const ArtifactIcon = artifactTypeIcon[artifact.type] || FileText;
                            return (
                              <div key={artifact.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                <ArtifactIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{artifact.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No artifacts yet</p>
                      )}
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <div className="relative">
                  {selectedJourney.timeline.map((event, index) => {
                    const isLast = index === selectedJourney.timeline.length - 1;
                    const phase = phases.find((p) => p.id === event.phase);
                    const PhaseIcon = phase?.icon || Target;
                    return (
                      <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
                        {!isLast && (
                          <div className="absolute left-4 top-8 h-[calc(100%-1rem)] w-0.5 bg-border" />
                        )}
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <PhaseIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{event.event}</span>
                            <Badge variant="outline" className="text-xs">{event.version}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                            <span className="capitalize">({event.phase})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="coaching" className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Coaching for {phases.find((p) => p.id === selectedJourney.aiCoaching.currentPhase)?.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tips for this phase:</p>
                      <ul className="space-y-2">
                        {selectedJourney.aiCoaching.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recommended Resources:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedJourney.aiCoaching.resources.map((resource, index) => (
                          <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                            {resource.type === 'video' ? <Video className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                            {resource.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-4">
                {selectedJourney.feedback.length > 0 ? (
                  selectedJourney.feedback.map((fb, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{fb.reviewer}</span>
                          <Badge variant="outline" className="text-xs capitalize">{fb.phase}</Badge>
                        </div>
                        <Badge variant="success" className="gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {fb.score.toFixed(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{fb.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
                    <p className="mt-2">No feedback yet</p>
                    <p className="text-sm">Submit your work for peer review to get feedback</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
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

      {/* Quick View Panel for Details */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJourneys.slice(0, 3).map((journey) => (
            <Button
              key={journey.id}
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => setSelectedJourney(journey)}
            >
              <div className="text-left">
                <p className="font-medium">{journey.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to view artifacts, timeline & coaching
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
