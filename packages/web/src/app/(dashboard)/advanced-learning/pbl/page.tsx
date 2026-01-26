'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FolderKanban,
  ArrowLeft,
  Users,
  Clock,
  Star,
  CheckCircle2,
  Search as SearchIcon,
  Lightbulb,
  Microscope,
  Hammer,
  Presentation,
  RefreshCw,
  Calendar,
  Target,
  MessageSquare,
  Trophy,
  Sparkles,
  GraduationCap,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const PBL_PHASES = [
  { id: 'entry', label: 'Entry Event', icon: Lightbulb, color: 'blue' },
  { id: 'research', label: 'Research', icon: SearchIcon, color: 'violet' },
  { id: 'create', label: 'Create', icon: Hammer, color: 'amber' },
  { id: 'pitch', label: 'Pitch', icon: Presentation, color: 'emerald' },
  { id: 'reflect', label: 'Reflect', icon: RefreshCw, color: 'rose' },
];

const MOCK_PROJECTS = [
  {
    id: 'proj_001',
    title: 'Sustainable Water Management for Murray-Darling Basin',
    drivingQuestion: 'How can we design a community-scale water management system that balances agricultural needs with environmental sustainability in the Murray-Darling Basin?',
    subject: 'Environmental Science / Geography',
    teamMembers: 5,
    currentPhase: 'create',
    milestoneProgress: 68,
    daysRemaining: 18,
    teacher: 'Dr. Karen Mitchell',
    milestones: [
      { name: 'Stakeholder interviews completed', done: true },
      { name: 'Water usage data analysis', done: true },
      { name: 'Solution prototype designed', done: true },
      { name: 'Community feedback collected', done: false },
      { name: 'Final presentation prepared', done: false },
    ],
  },
  {
    id: 'proj_002',
    title: 'Design a Smart City for Western Sydney',
    drivingQuestion: 'What would a smart city in Western Sydney look like if it prioritised liveability, sustainability, and cultural diversity?',
    subject: 'Design & Technology / Civics',
    teamMembers: 4,
    currentPhase: 'research',
    milestoneProgress: 35,
    daysRemaining: 32,
    teacher: 'Mr. James Wong',
    milestones: [
      { name: 'Urban planning research completed', done: true },
      { name: 'Community needs survey analysed', done: true },
      { name: 'Smart technology review', done: false },
      { name: 'City model prototype built', done: false },
      { name: 'Council pitch delivered', done: false },
      { name: 'Reflection journal submitted', done: false },
    ],
  },
  {
    id: 'proj_003',
    title: 'Indigenous Knowledge Systems in Modern Medicine',
    drivingQuestion: 'How can traditional Aboriginal and Torres Strait Islander medicinal knowledge be respectfully integrated with modern healthcare practices?',
    subject: 'Health Sciences / Aboriginal Studies',
    teamMembers: 6,
    currentPhase: 'pitch',
    milestoneProgress: 88,
    daysRemaining: 5,
    teacher: 'Aunty Patricia Williams',
    milestones: [
      { name: 'Elder consultation sessions completed', done: true },
      { name: 'Literature review of bush medicine', done: true },
      { name: 'Ethical framework developed', done: true },
      { name: 'Case study presentations prepared', done: true },
      { name: 'Community exhibition planned', done: false },
    ],
  },
  {
    id: 'proj_004',
    title: 'Renewable Energy Solution for Remote Communities',
    drivingQuestion: 'How can we design an affordable, maintainable renewable energy system for a remote Australian community currently relying on diesel generators?',
    subject: 'Physics / Engineering Studies',
    teamMembers: 4,
    currentPhase: 'entry',
    milestoneProgress: 12,
    daysRemaining: 45,
    teacher: 'Ms. Linda Osei',
    milestones: [
      { name: 'Community partner identified', done: true },
      { name: 'Energy audit data collected', done: false },
      { name: 'Renewable technology comparison', done: false },
      { name: 'System design completed', done: false },
      { name: 'Cost-benefit analysis presented', done: false },
      { name: 'Final exhibition delivered', done: false },
    ],
  },
];

const MOCK_CHALLENGES = [
  {
    id: 'chal_001',
    title: 'Great Barrier Reef Conservation Tech',
    description: 'Design a technology-based solution to monitor and protect coral reef ecosystems along the Great Barrier Reef.',
    teacher: 'Dr. Marina Santos',
    difficulty: 'Advanced',
    teamSize: '4-6 students',
    subject: 'Marine Biology / Digital Technologies',
    duration: '8 weeks',
    enrolledTeams: 3,
    maxTeams: 8,
  },
  {
    id: 'chal_002',
    title: 'Food Security in a Changing Climate',
    description: 'Develop a scalable agricultural innovation that addresses food security challenges faced by Australian farming communities under climate change.',
    teacher: 'Mr. Robert Nguyen',
    difficulty: 'Intermediate',
    teamSize: '3-5 students',
    subject: 'Agricultural Science / Economics',
    duration: '6 weeks',
    enrolledTeams: 5,
    maxTeams: 10,
  },
  {
    id: 'chal_003',
    title: 'Mental Health App for Rural Youth',
    description: 'Create a culturally sensitive digital wellbeing tool that addresses the unique mental health challenges facing young people in rural and remote Australia.',
    teacher: 'Ms. Sarah Patel',
    difficulty: 'Intermediate',
    teamSize: '3-4 students',
    subject: 'Health & PE / Digital Technologies',
    duration: '7 weeks',
    enrolledTeams: 6,
    maxTeams: 8,
  },
  {
    id: 'chal_004',
    title: 'Accessible Transport for Disability Inclusion',
    description: 'Propose improvements to public transport infrastructure in your local area that would make it fully accessible for people with diverse disabilities.',
    teacher: 'Dr. Alex Kim',
    difficulty: 'Beginner',
    teamSize: '3-5 students',
    subject: 'Civics & Citizenship / Design',
    duration: '5 weeks',
    enrolledTeams: 4,
    maxTeams: 12,
  },
];

const MOCK_COMPLETED = [
  {
    id: 'comp_001',
    title: 'Bushfire Early Warning System',
    subject: 'Engineering / Environmental Science',
    completedDate: '2024-12-15',
    grade: 'A',
    peerRating: 4.7,
    teacherFeedback: 'Exceptional project demonstrating strong interdisciplinary thinking. The sensor network prototype was innovative and the community presentation was deeply impactful. Well-considered ethical implications of data collection in remote areas.',
    teamMembers: 5,
    drivingQuestion: 'How can IoT technology improve bushfire detection and response times for at-risk communities?',
  },
  {
    id: 'comp_002',
    title: 'Reducing Food Waste in School Canteens',
    subject: 'Mathematics / Sustainability',
    completedDate: '2024-10-20',
    grade: 'A-',
    peerRating: 4.3,
    teacherFeedback: 'Strong data analysis component with practical recommendations. The waste audit methodology was rigorous and the proposed app solution showed creative problem-solving. Consider deeper engagement with supply chain stakeholders in future work.',
    teamMembers: 4,
    drivingQuestion: 'What data-driven strategies can reduce food waste in our school canteen by 50%?',
  },
  {
    id: 'comp_003',
    title: 'Multicultural Community Garden Design',
    subject: 'Geography / The Arts',
    completedDate: '2024-08-30',
    grade: 'B+',
    peerRating: 4.5,
    teacherFeedback: 'Beautiful integration of cultural perspectives in the garden design. The community consultation process was exemplary. The final installation in the school grounds is a lasting contribution. Technical drawings could have been more detailed.',
    teamMembers: 6,
    drivingQuestion: 'How can a community garden celebrate cultural diversity while promoting sustainable food production?',
  },
];

const pageStats = [
  { label: 'Active Projects', value: '4', icon: FolderKanban, color: 'blue' },
  { label: 'Open Challenges', value: '4', icon: Target, color: 'emerald' },
  { label: 'Completed', value: '6', icon: Trophy, color: 'violet' },
  { label: 'Team Members', value: '19', icon: Users, color: 'amber' },
];

function getDifficultyBadge(difficulty: string) {
  switch (difficulty) {
    case 'Beginner':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Beginner</Badge>;
    case 'Intermediate':
      return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Intermediate</Badge>;
    case 'Advanced':
      return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">Advanced</Badge>;
    default:
      return <Badge variant="secondary">{difficulty}</Badge>;
  }
}

export default function PBLPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/advanced-learning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Project-Based Learning</h1>
            <p className="text-muted-foreground">
              Gold Standard PBL with driving questions, milestones, and real-world exhibitions
            </p>
          </div>
        </div>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pageStats.map((stat) => {
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

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
          <TabsTrigger value="challenges">Browse Challenges</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {/* My Projects */}
        <TabsContent value="projects" className="space-y-6">
          {MOCK_PROJECTS.map((project) => {
            const currentPhaseIndex = PBL_PHASES.findIndex((p) => p.id === project.currentPhase);
            return (
              <Card key={project.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription className="mt-1">{project.subject} | {project.teacher}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {project.daysRemaining} days left
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {project.teamMembers}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Driving Question */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Driving Question</span>
                    </div>
                    <p className="text-sm text-muted-foreground italic">{project.drivingQuestion}</p>
                  </div>

                  {/* Phase Progress Stepper */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Current Phase: {PBL_PHASES[currentPhaseIndex]?.label}
                      </span>
                      <span className="text-muted-foreground">{project.milestoneProgress}% complete</span>
                    </div>

                    <div className="flex items-center justify-between">
                      {PBL_PHASES.map((phase, index) => {
                        const Icon = phase.icon;
                        const isCompleted = index < currentPhaseIndex;
                        const isCurrent = index === currentPhaseIndex;
                        return (
                          <div key={phase.id} className="flex flex-col items-center gap-2 flex-1">
                            <div className="flex items-center w-full">
                              {index > 0 && (
                                <div className={`h-0.5 flex-1 ${index <= currentPhaseIndex ? 'bg-emerald-500' : 'bg-muted'}`} />
                              )}
                              <div
                                className={`rounded-full p-2 flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-500/10'
                                    : isCurrent
                                    ? `bg-${phase.color}-500/10 ring-2 ring-${phase.color}-500/30`
                                    : 'bg-muted'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Icon
                                    className={`h-4 w-4 ${
                                      isCurrent ? `text-${phase.color}-500` : 'text-muted-foreground'
                                    }`}
                                  />
                                )}
                              </div>
                              {index < PBL_PHASES.length - 1 && (
                                <div className={`h-0.5 flex-1 ${index < currentPhaseIndex ? 'bg-emerald-500' : 'bg-muted'}`} />
                              )}
                            </div>
                            <span
                              className={`text-xs ${
                                isCompleted || isCurrent ? 'font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              {phase.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <Progress value={project.milestoneProgress} className="h-2" />
                  </div>

                  {/* Milestones */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Milestones</h4>
                    <div className="grid gap-1.5 md:grid-cols-2">
                      {project.milestones.map((milestone, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          {milestone.done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                          )}
                          <span className={milestone.done ? 'text-muted-foreground line-through' : ''}>
                            {milestone.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue Project
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Team Discussion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Browse Challenges */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_CHALLENGES.map((challenge) => (
              <Card key={challenge.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <Target className="h-6 w-6 text-blue-500" />
                    </div>
                    {getDifficultyBadge(challenge.difficulty)}
                  </div>
                  <CardTitle className="text-lg mt-3">{challenge.title}</CardTitle>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Teacher</span>
                      <span className="font-medium">{challenge.teacher}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subject</span>
                      <span className="font-medium">{challenge.subject}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Team Size</span>
                      <span className="font-medium">{challenge.teamSize}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{challenge.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Teams Enrolled</span>
                      <span className="font-medium">{challenge.enrolledTeams}/{challenge.maxTeams}</span>
                    </div>
                  </div>

                  <Progress
                    value={Math.round((challenge.enrolledTeams / challenge.maxTeams) * 100)}
                    className="h-1.5"
                  />

                  <Button className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Join Challenge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Completed */}
        <TabsContent value="completed" className="space-y-4">
          {MOCK_COMPLETED.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <CardDescription className="mt-1">{project.subject}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-lg px-3">
                      {project.grade}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Driving Question</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{project.drivingQuestion}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="text-lg font-bold">{project.peerRating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Peer Rating</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-lg font-bold">{project.teamMembers}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Team Members</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(project.completedDate).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Teacher Feedback</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{project.teacherFeedback}</p>
                </div>

                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Full Project
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
