'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  FileText,
  Upload,
  Eye,
  Download,
  Share2,
  Plus,
  PenLine,
  ClipboardList,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

// PBL Phases: Investigate -> Design -> Build -> Reflect -> Present
const PBL_PHASES = [
  { id: 'investigate', label: 'Investigate', icon: Microscope, color: 'blue', description: 'Research and understand the problem' },
  { id: 'design', label: 'Design', icon: PenLine, color: 'violet', description: 'Plan your solution approach' },
  { id: 'build', label: 'Build', icon: Hammer, color: 'amber', description: 'Create your prototype or product' },
  { id: 'reflect', label: 'Reflect', icon: RefreshCw, color: 'emerald', description: 'Review and improve your work' },
  { id: 'present', label: 'Present', icon: Presentation, color: 'rose', description: 'Share your findings and solution' },
];

// Current project workspace
const CURRENT_PROJECT = {
  id: 'proj_001',
  title: 'Sustainable Water Management for Murray-Darling Basin',
  drivingQuestion: 'How can we design a community-scale water management system that balances agricultural needs with environmental sustainability in the Murray-Darling Basin?',
  subject: 'Environmental Science / Geography',
  currentPhase: 'build',
  milestoneProgress: 68,
  startDate: '2025-02-10',
  endDate: '2025-04-15',
  daysRemaining: 18,
  teacher: 'Dr. Karen Mitchell',
};

// Team members with roles and contributions
const TEAM_MEMBERS = [
  {
    id: 'tm_001',
    name: 'Emma Thompson',
    role: 'Project Lead',
    avatar: 'ET',
    tasksCompleted: 8,
    totalTasks: 12,
    contributions: [
      { type: 'Research', count: 5 },
      { type: 'Presentations', count: 2 },
      { type: 'Documents', count: 3 },
    ],
    lastActive: '2 hours ago',
  },
  {
    id: 'tm_002',
    name: 'Liam Kowalski',
    role: 'Data Analyst',
    avatar: 'LK',
    tasksCompleted: 6,
    totalTasks: 10,
    contributions: [
      { type: 'Research', count: 3 },
      { type: 'Data Analysis', count: 4 },
      { type: 'Documents', count: 2 },
    ],
    lastActive: '5 hours ago',
  },
  {
    id: 'tm_003',
    name: 'Sophie Martinez',
    role: 'Designer',
    avatar: 'SM',
    tasksCompleted: 7,
    totalTasks: 9,
    contributions: [
      { type: 'Design', count: 6 },
      { type: 'Prototypes', count: 3 },
      { type: 'Documents', count: 1 },
    ],
    lastActive: '30 minutes ago',
  },
  {
    id: 'tm_004',
    name: 'Noah Patel',
    role: 'Community Liaison',
    avatar: 'NP',
    tasksCompleted: 5,
    totalTasks: 8,
    contributions: [
      { type: 'Interviews', count: 4 },
      { type: 'Surveys', count: 2 },
      { type: 'Documents', count: 2 },
    ],
    lastActive: '1 day ago',
  },
  {
    id: 'tm_005',
    name: 'Olivia Chen',
    role: 'Technical Lead',
    avatar: 'OC',
    tasksCompleted: 9,
    totalTasks: 11,
    contributions: [
      { type: 'Technical', count: 7 },
      { type: 'Code', count: 4 },
      { type: 'Documents', count: 3 },
    ],
    lastActive: '1 hour ago',
  },
];

// Milestones with deadline tracker
const MILESTONES = [
  { id: 'ms_001', name: 'Stakeholder interviews completed', dueDate: '2025-02-20', status: 'completed', phase: 'investigate' },
  { id: 'ms_002', name: 'Water usage data analysis', dueDate: '2025-02-28', status: 'completed', phase: 'investigate' },
  { id: 'ms_003', name: 'Solution design document', dueDate: '2025-03-10', status: 'completed', phase: 'design' },
  { id: 'ms_004', name: 'Prototype v1 complete', dueDate: '2025-03-20', status: 'completed', phase: 'build' },
  { id: 'ms_005', name: 'Community feedback collected', dueDate: '2025-03-28', status: 'in_progress', phase: 'build' },
  { id: 'ms_006', name: 'Final prototype complete', dueDate: '2025-04-05', status: 'pending', phase: 'build' },
  { id: 'ms_007', name: 'Reflection journal submitted', dueDate: '2025-04-10', status: 'pending', phase: 'reflect' },
  { id: 'ms_008', name: 'Final presentation prepared', dueDate: '2025-04-12', status: 'pending', phase: 'present' },
  { id: 'ms_009', name: 'Public exhibition', dueDate: '2025-04-15', status: 'pending', phase: 'present' },
];

// Shared artifacts/documents
const ARTIFACTS = [
  {
    id: 'art_001',
    name: 'Stakeholder Interview Notes.docx',
    type: 'document',
    uploadedBy: 'Noah P.',
    uploadedDate: '2025-02-18',
    size: '245 KB',
    phase: 'investigate',
  },
  {
    id: 'art_002',
    name: 'Water Usage Data Analysis.xlsx',
    type: 'spreadsheet',
    uploadedBy: 'Liam K.',
    uploadedDate: '2025-02-26',
    size: '1.2 MB',
    phase: 'investigate',
  },
  {
    id: 'art_003',
    name: 'Solution Design Mockups.fig',
    type: 'design',
    uploadedBy: 'Sophie M.',
    uploadedDate: '2025-03-08',
    size: '4.5 MB',
    phase: 'design',
  },
  {
    id: 'art_004',
    name: 'Technical Architecture.pdf',
    type: 'document',
    uploadedBy: 'Olivia C.',
    uploadedDate: '2025-03-09',
    size: '890 KB',
    phase: 'design',
  },
  {
    id: 'art_005',
    name: 'Prototype Demo Video.mp4',
    type: 'video',
    uploadedBy: 'Emma T.',
    uploadedDate: '2025-03-19',
    size: '125 MB',
    phase: 'build',
  },
  {
    id: 'art_006',
    name: 'Community Survey Results.csv',
    type: 'data',
    uploadedBy: 'Noah P.',
    uploadedDate: '2025-03-25',
    size: '56 KB',
    phase: 'build',
  },
];

// Exhibition scheduling
const EXHIBITION = {
  date: '2025-04-15',
  time: '10:00 AM - 2:00 PM',
  location: 'School Assembly Hall',
  format: 'Public Showcase',
  invitees: ['Parents', 'Local Council', 'Murray-Darling Basin Authority', 'Community Members'],
  presentations: [
    { time: '10:00 AM', item: 'Opening Remarks', presenter: 'Dr. Karen Mitchell' },
    { time: '10:15 AM', item: 'Project Introduction', presenter: 'Emma Thompson' },
    { time: '10:30 AM', item: 'Data Analysis Findings', presenter: 'Liam Kowalski' },
    { time: '10:45 AM', item: 'Solution Design', presenter: 'Sophie Martinez' },
    { time: '11:00 AM', item: 'Technical Implementation', presenter: 'Olivia Chen' },
    { time: '11:15 AM', item: 'Community Impact', presenter: 'Noah Patel' },
    { time: '11:30 AM', item: 'Q&A Session', presenter: 'All Team' },
    { time: '12:00 PM', item: 'Interactive Demo', presenter: 'All Team' },
  ],
  registrations: 45,
  capacity: 60,
};

// Assessment rubric
const ASSESSMENT_RUBRIC = {
  criteria: [
    {
      id: 'crit_001',
      name: 'Research & Investigation',
      description: 'Quality and depth of research conducted',
      weight: 20,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
    {
      id: 'crit_002',
      name: 'Problem Definition',
      description: 'Clarity and insight of the driving question',
      weight: 15,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
    {
      id: 'crit_003',
      name: 'Solution Design',
      description: 'Creativity and feasibility of proposed solution',
      weight: 20,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
    {
      id: 'crit_004',
      name: 'Collaboration',
      description: 'Teamwork and contribution tracking',
      weight: 15,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
    {
      id: 'crit_005',
      name: 'Presentation Skills',
      description: 'Communication and exhibition quality',
      weight: 15,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
    {
      id: 'crit_006',
      name: 'Reflection & Growth',
      description: 'Self-awareness and learning documentation',
      weight: 15,
      selfScore: null,
      teacherScore: null,
      maxScore: 4,
      levels: ['Beginning', 'Developing', 'Proficient', 'Exemplary'],
    },
  ],
  feedback: [],
};

const pageStats = [
  { label: 'Team Members', value: '5', icon: Users, color: 'blue' },
  { label: 'Milestones', value: '4/9', icon: Target, color: 'emerald' },
  { label: 'Artifacts', value: '6', icon: FileText, color: 'violet' },
  { label: 'Days Left', value: '18', icon: Calendar, color: 'amber' },
];

function getMilestoneStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-500/10 text-blue-600"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
    case 'pending':
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getArtifactIcon(type: string) {
  switch (type) {
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'spreadsheet':
      return <BarChart3 className="h-4 w-4" />;
    case 'design':
      return <PenLine className="h-4 w-4" />;
    case 'video':
      return <Presentation className="h-4 w-4" />;
    case 'data':
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function PBLPage() {
  const currentPhaseIndex = PBL_PHASES.findIndex((p) => p.id === CURRENT_PROJECT.currentPhase);
  const [selfAssessment, setSelfAssessment] = useState<Record<string, number>>({});

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
            <h1 className="heading-2">PBL Project Workspace</h1>
            <p className="text-muted-foreground">
              Gold Standard Project-Based Learning with team collaboration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share Project
          </Button>
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Coach
          </Button>
        </div>
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

      {/* Project Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-500" />
                {CURRENT_PROJECT.title}
              </CardTitle>
              <CardDescription className="mt-1">{CURRENT_PROJECT.subject} | {CURRENT_PROJECT.teacher}</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {CURRENT_PROJECT.daysRemaining} days remaining
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Driving Question */}
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Driving Question</span>
            </div>
            <p className="text-sm text-muted-foreground italic">{CURRENT_PROJECT.drivingQuestion}</p>
          </div>

          {/* Phase Progress Stepper */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Current Phase: {PBL_PHASES[currentPhaseIndex]?.label}
              </span>
              <span className="text-muted-foreground">{CURRENT_PROJECT.milestoneProgress}% complete</span>
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
                      className={`text-xs text-center ${
                        isCompleted || isCurrent ? 'font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Progress value={CURRENT_PROJECT.milestoneProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="phases">
        <TabsList>
          <TabsTrigger value="phases">
            <Target className="mr-2 h-4 w-4" />
            Phases
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="milestones">
            <Calendar className="mr-2 h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="artifacts">
            <FileText className="mr-2 h-4 w-4" />
            Artifacts
          </TabsTrigger>
          <TabsTrigger value="exhibition">
            <Presentation className="mr-2 h-4 w-4" />
            Exhibition
          </TabsTrigger>
          <TabsTrigger value="assessment">
            <ClipboardList className="mr-2 h-4 w-4" />
            Assessment
          </TabsTrigger>
        </TabsList>

        {/* Phases Tab */}
        <TabsContent value="phases" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PBL_PHASES.map((phase, index) => {
              const Icon = phase.icon;
              const isCompleted = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              const phaseMilestones = MILESTONES.filter(m => m.phase === phase.id);
              const completedMilestones = phaseMilestones.filter(m => m.status === 'completed').length;

              return (
                <Card
                  key={phase.id}
                  className={`${isCurrent ? `ring-2 ring-${phase.color}-500/30` : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg bg-${phase.color}-500/10 p-3`}>
                        <Icon className={`h-6 w-6 text-${phase.color}-500`} />
                      </div>
                      {isCompleted ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : isCurrent ? (
                        <Badge className={`bg-${phase.color}-500/10 text-${phase.color}-600`}>
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="outline">Upcoming</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3">{phase.label}</CardTitle>
                    <CardDescription>{phase.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Milestones</span>
                        <span className="font-medium">{completedMilestones}/{phaseMilestones.length}</span>
                      </div>
                      <Progress
                        value={phaseMilestones.length > 0 ? (completedMilestones / phaseMilestones.length) * 100 : 0}
                        className="h-1.5"
                      />
                    </div>

                    <div className="space-y-1">
                      {phaseMilestones.slice(0, 3).map((milestone) => (
                        <div key={milestone.id} className="flex items-center gap-2 text-sm">
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : milestone.status === 'in_progress' ? (
                            <Clock className="h-3 w-3 text-blue-500" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border" />
                          )}
                          <span className={milestone.status === 'completed' ? 'text-muted-foreground line-through' : ''}>
                            {milestone.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isCurrent && (
                      <Button className="w-full mt-2" size="sm">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Continue Phase
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEAM_MEMBERS.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium">{member.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {member.lastActive}
                    </Badge>
                  </div>

                  {/* Task Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tasks Completed</span>
                      <span className="font-medium">{member.tasksCompleted}/{member.totalTasks}</span>
                    </div>
                    <Progress
                      value={(member.tasksCompleted / member.totalTasks) * 100}
                      className="h-1.5"
                    />
                  </div>

                  {/* Contributions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contributions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.contributions.map((contrib) => (
                        <Badge key={contrib.type} variant="secondary" className="text-xs">
                          {contrib.type}: {contrib.count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contribution Tracking</CardTitle>
              <CardDescription>Team member activity over the project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEAM_MEMBERS.map((member) => {
                  const totalContribs = member.contributions.reduce((sum, c) => sum + c.count, 0);
                  const maxContribs = Math.max(...TEAM_MEMBERS.flatMap(m => m.contributions.map(c => c.count))) * 3;
                  return (
                    <div key={member.id} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium truncate">{member.name}</div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(totalContribs / maxContribs) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-muted-foreground text-right">{totalContribs}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Deadline Tracker</h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {MILESTONES.map((milestone) => {
                  const phase = PBL_PHASES.find(p => p.id === milestone.phase);
                  const isOverdue = milestone.status !== 'completed' && new Date(milestone.dueDate) < new Date();

                  return (
                    <div
                      key={milestone.id}
                      className={`flex items-center justify-between p-4 ${isOverdue ? 'bg-red-500/5' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg bg-${phase?.color}-500/10 p-2`}>
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className={`h-4 w-4 text-emerald-500`} />
                          ) : phase?.icon ? (
                            <phase.icon className={`h-4 w-4 text-${phase.color}-500`} />
                          ) : (
                            <Target className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${milestone.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                            {milestone.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Phase: {phase?.label} | Due: {new Date(milestone.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && milestone.status !== 'completed' && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                        {getMilestoneStatusBadge(milestone.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Shared Document Repository</h3>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {ARTIFACTS.map((artifact) => {
                  const phase = PBL_PHASES.find(p => p.id === artifact.phase);

                  return (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-muted p-2">
                          {getArtifactIcon(artifact.type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{artifact.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {artifact.uploadedBy} | {artifact.size} | {new Date(artifact.uploadedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs bg-${phase?.color}-500/10`}>
                          {phase?.label}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exhibition Tab */}
        <TabsContent value="exhibition" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Presentation className="h-5 w-5 text-rose-500" />
                    Public Showcase
                  </CardTitle>
                  <CardDescription>Schedule and plan your project exhibition</CardDescription>
                </div>
                <Badge className="bg-rose-500/10 text-rose-600">
                  <Calendar className="h-3 w-3 mr-1" />
                  Scheduled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exhibition Details */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(EXHIBITION.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium mt-1">{EXHIBITION.time}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium mt-1">{EXHIBITION.location}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Registrations</p>
                  <p className="text-sm font-medium mt-1">{EXHIBITION.registrations}/{EXHIBITION.capacity}</p>
                </div>
              </div>

              {/* Invitees */}
              <div>
                <p className="text-sm font-medium mb-2">Invited Audiences</p>
                <div className="flex flex-wrap gap-2">
                  {EXHIBITION.invitees.map((invitee) => (
                    <Badge key={invitee} variant="secondary">{invitee}</Badge>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <p className="text-sm font-medium mb-3">Presentation Schedule</p>
                <div className="space-y-2">
                  {EXHIBITION.presentations.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="w-24 text-sm font-medium text-muted-foreground">
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.item}</p>
                        <p className="text-xs text-muted-foreground">{item.presenter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Invitation Link
                </Button>
                <Button variant="outline">
                  <PenLine className="mr-2 h-4 w-4" />
                  Edit Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment Tab */}
        <TabsContent value="assessment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Assessment Rubric
              </CardTitle>
              <CardDescription>Self-assess your work against the rubric criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ASSESSMENT_RUBRIC.criteria.map((criterion) => (
                <div key={criterion.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{criterion.name}</p>
                      <p className="text-sm text-muted-foreground">{criterion.description}</p>
                    </div>
                    <Badge variant="outline">{criterion.weight}%</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {criterion.levels.map((level, index) => (
                      <button
                        key={level}
                        onClick={() => setSelfAssessment({ ...selfAssessment, [criterion.id]: index + 1 })}
                        className={`p-2 rounded-lg border text-center text-xs transition-all ${
                          selfAssessment[criterion.id] === index + 1
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <p className="font-medium">{index + 1}</p>
                        <p className="text-[10px] mt-0.5">{level}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Self-Assessment
                </Button>
                <Button variant="outline">
                  <PenLine className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                Feedback & Comments
              </CardTitle>
              <CardDescription>Teacher and peer feedback on your project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-2" />
                <p>No feedback yet</p>
                <p className="text-sm">Feedback will appear here after teacher review</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
