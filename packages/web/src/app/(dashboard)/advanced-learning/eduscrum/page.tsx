'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Kanban,
  Users,
  Clock,
  Target,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Zap,
  Timer,
  RotateCcw,
  Plus,
  MoreVertical,
  ArrowRight,
  GripVertical,
  Trophy,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  PenLine,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Kanban columns
const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'slate' },
  { id: 'doing', label: 'Doing', color: 'blue' },
  { id: 'done', label: 'Done', color: 'emerald' },
];

// Mock learning tasks
const MOCK_TASKS = [
  {
    id: 'task_001',
    title: 'Research renewable energy sources',
    description: 'Investigate solar, wind, and hydro options for the project',
    estimate: 3,
    assignee: 'Emma T.',
    status: 'done',
    labels: ['Research', 'Core'],
    dueDate: '2025-03-15',
  },
  {
    id: 'task_002',
    title: 'Design prototype mockup',
    description: 'Create initial wireframes for the energy dashboard',
    estimate: 5,
    assignee: 'Liam K.',
    status: 'done',
    labels: ['Design'],
    dueDate: '2025-03-18',
  },
  {
    id: 'task_003',
    title: 'Build data collection module',
    description: 'Implement sensor data integration for energy monitoring',
    estimate: 8,
    assignee: 'Sophie M.',
    status: 'doing',
    labels: ['Development', 'Core'],
    dueDate: '2025-03-25',
  },
  {
    id: 'task_004',
    title: 'User testing session',
    description: 'Conduct usability testing with 5 community members',
    estimate: 3,
    assignee: 'Noah P.',
    status: 'doing',
    labels: ['Testing'],
    dueDate: '2025-03-22',
  },
  {
    id: 'task_005',
    title: 'Cost-benefit analysis',
    description: 'Calculate ROI and payback period for proposed solutions',
    estimate: 5,
    assignee: 'Emma T.',
    status: 'todo',
    labels: ['Analysis', 'Core'],
    dueDate: '2025-03-28',
  },
  {
    id: 'task_006',
    title: 'Final presentation slides',
    description: 'Create pitch deck following 10/20/30 rule',
    estimate: 3,
    assignee: 'Liam K.',
    status: 'todo',
    labels: ['Presentation'],
    dueDate: '2025-04-01',
  },
  {
    id: 'task_007',
    title: 'Community feedback integration',
    description: 'Incorporate stakeholder suggestions into design',
    estimate: 2,
    assignee: 'Sophie M.',
    status: 'todo',
    labels: ['Feedback'],
    dueDate: '2025-03-30',
  },
];

// Current sprint data
const CURRENT_SPRINT = {
  name: 'Sprint 3: Build Phase',
  goal: 'Complete prototype development and initial testing',
  startDate: '2025-03-11',
  endDate: '2025-03-24',
  totalPoints: 26,
  completedPoints: 11,
  daysRemaining: 6,
  velocity: 18,
  teamSize: 4,
};

// Burndown data
const BURNDOWN_DATA = [
  { day: 'Day 1', ideal: 26, actual: 26 },
  { day: 'Day 2', ideal: 24, actual: 25 },
  { day: 'Day 3', ideal: 22, actual: 23 },
  { day: 'Day 4', ideal: 20, actual: 21 },
  { day: 'Day 5', ideal: 18, actual: 20 },
  { day: 'Day 6', ideal: 16, actual: 18 },
  { day: 'Day 7', ideal: 14, actual: 15 },
  { day: 'Day 8', ideal: 12, actual: null },
  { day: 'Day 9', ideal: 10, actual: null },
  { day: 'Day 10', ideal: 8, actual: null },
  { day: 'Day 11', ideal: 6, actual: null },
  { day: 'Day 12', ideal: 4, actual: null },
  { day: 'Day 13', ideal: 2, actual: null },
  { day: 'Day 14', ideal: 0, actual: null },
];

// Standup prompts
const STANDUP_PROMPTS = [
  { question: 'What did you accomplish yesterday?', icon: CheckCircle2 },
  { question: 'What will you work on today?', icon: Target },
  { question: 'Do you have any blockers or concerns?', icon: AlertCircle },
];

// Team members
const TEAM_MEMBERS = [
  { id: 'tm_001', name: 'Emma T.', role: 'Scrum Master', avatar: 'ET', tasksCompleted: 2, pointsCompleted: 8 },
  { id: 'tm_002', name: 'Liam K.', role: 'Developer', avatar: 'LK', tasksCompleted: 1, pointsCompleted: 5 },
  { id: 'tm_003', name: 'Sophie M.', role: 'Developer', avatar: 'SM', tasksCompleted: 0, pointsCompleted: 0 },
  { id: 'tm_004', name: 'Noah P.', role: 'Product Owner', avatar: 'NP', tasksCompleted: 0, pointsCompleted: 0 },
];

// AI Coach suggestions
const AI_SUGGESTIONS = [
  {
    type: 'warning',
    title: 'Sprint at Risk',
    message: 'Based on current velocity, you may not complete all tasks. Consider reducing scope or redistributing work.',
    icon: AlertCircle,
    color: 'amber',
  },
  {
    type: 'insight',
    title: 'Team Collaboration',
    message: 'Sophie and Noah have lower completion rates. Consider pair programming sessions to boost productivity.',
    icon: Users,
    color: 'blue',
  },
  {
    type: 'tip',
    title: 'Improve Estimation',
    message: 'Your team tends to underestimate by 15%. Try using planning poker for better estimates.',
    icon: Lightbulb,
    color: 'violet',
  },
];

// Retrospective items
const RETRO_ITEMS = {
  wentWell: [
    { id: 'ww_001', text: 'Great collaboration during pair programming sessions', votes: 3 },
    { id: 'ww_002', text: 'Daily standups kept everyone aligned', votes: 4 },
    { id: 'ww_003', text: 'Clear sprint goal helped prioritize work', votes: 2 },
  ],
  improve: [
    { id: 'im_001', text: 'Need better task breakdown for large stories', votes: 3 },
    { id: 'im_002', text: 'Documentation could be more thorough', votes: 2 },
    { id: 'im_003', text: 'Testing started too late in the sprint', votes: 4 },
  ],
  actions: [
    { id: 'ac_001', text: 'Schedule task refinement sessions twice weekly', owner: 'Emma T.', status: 'pending' },
    { id: 'ac_002', text: 'Create documentation template for all features', owner: 'Liam K.', status: 'in_progress' },
    { id: 'ac_003', text: 'Integrate testing earlier with TDD approach', owner: 'Sophie M.', status: 'pending' },
  ],
};

const pageStats = [
  { label: 'Sprint Progress', value: '42%', icon: TrendingUp, color: 'blue' },
  { label: 'Story Points', value: '11/26', icon: Zap, color: 'emerald' },
  { label: 'Days Remaining', value: '6', icon: Timer, color: 'amber' },
  { label: 'Team Velocity', value: '18', icon: Target, color: 'violet' },
];

function getTasksByStatus(status: string) {
  return MOCK_TASKS.filter(task => task.status === status);
}

function getLabelColor(label: string) {
  const colors: Record<string, string> = {
    Research: 'bg-purple-500/10 text-purple-600',
    Core: 'bg-red-500/10 text-red-600',
    Design: 'bg-pink-500/10 text-pink-600',
    Development: 'bg-blue-500/10 text-blue-600',
    Testing: 'bg-amber-500/10 text-amber-600',
    Analysis: 'bg-emerald-500/10 text-emerald-600',
    Presentation: 'bg-indigo-500/10 text-indigo-600',
    Feedback: 'bg-cyan-500/10 text-cyan-600',
  };
  return colors[label] || 'bg-slate-500/10 text-slate-600';
}

export default function EduscrumPage() {
  const [standupResponses, setStandupResponses] = useState<Record<string, string>>({});

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
            <h1 className="heading-2">EduScrum Board</h1>
            <p className="text-muted-foreground">
              Agile learning with Kanban boards, sprints, and team collaboration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Sprint Planning
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
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

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">
            <Kanban className="mr-2 h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="sprint">
            <Target className="mr-2 h-4 w-4" />
            Sprint
          </TabsTrigger>
          <TabsTrigger value="standup">
            <MessageSquare className="mr-2 h-4 w-4" />
            Standups
          </TabsTrigger>
          <TabsTrigger value="coach">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Coach
          </TabsTrigger>
          <TabsTrigger value="retro">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retro
          </TabsTrigger>
        </TabsList>

        {/* Board Tab - Kanban */}
        <TabsContent value="board" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {KANBAN_COLUMNS.map((column) => {
              const tasks = getTasksByStatus(column.id);
              const totalPoints = tasks.reduce((sum, task) => sum + task.estimate, 0);

              return (
                <div key={column.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{column.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {tasks.length}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{totalPoints} pts</span>
                  </div>

                  <div className={`rounded-lg bg-${column.color}-500/5 p-2 min-h-[400px] space-y-2`}>
                    {tasks.map((task) => (
                      <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              <span className="text-sm font-medium">{task.title}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                            {task.description}
                          </p>

                          <div className="flex flex-wrap gap-1 pl-6">
                            {task.labels.map((label) => (
                              <span
                                key={label}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${getLabelColor(label)}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 pl-6">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-[10px] font-medium">
                                  {task.assignee.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">{task.assignee}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {task.estimate} pts
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {tasks.length === 0 && (
                      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                        No tasks in this column
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Sprint Tab */}
        <TabsContent value="sprint" className="space-y-6">
          {/* Sprint Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    {CURRENT_SPRINT.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{CURRENT_SPRINT.goal}</CardDescription>
                </div>
                <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                  Active Sprint
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(CURRENT_SPRINT.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {' '}
                    {new Date(CURRENT_SPRINT.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Points</p>
                  <p className="text-sm font-medium mt-1">{CURRENT_SPRINT.totalPoints}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Team Velocity</p>
                  <p className="text-sm font-medium mt-1">{CURRENT_SPRINT.velocity} pts/sprint</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Team Size</p>
                  <p className="text-sm font-medium mt-1">{CURRENT_SPRINT.teamSize} members</p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Sprint Progress</span>
                  <span className="text-muted-foreground">
                    {CURRENT_SPRINT.completedPoints}/{CURRENT_SPRINT.totalPoints} points ({Math.round((CURRENT_SPRINT.completedPoints / CURRENT_SPRINT.totalPoints) * 100)}%)
                  </span>
                </div>
                <Progress
                  value={Math.round((CURRENT_SPRINT.completedPoints / CURRENT_SPRINT.totalPoints) * 100)}
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Burndown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Sprint Burndown Chart
              </CardTitle>
              <CardDescription>Track remaining work vs ideal progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-1">
                {BURNDOWN_DATA.map((day, index) => {
                  const maxValue = 26;
                  const idealHeight = (day.ideal / maxValue) * 100;
                  const actualHeight = day.actual !== null ? (day.actual / maxValue) * 100 : null;

                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-48 relative flex items-end justify-center gap-0.5">
                        {/* Ideal line point */}
                        <div
                          className="w-2 bg-muted rounded-t transition-all"
                          style={{ height: `${idealHeight}%` }}
                        />
                        {/* Actual line point */}
                        {actualHeight !== null && (
                          <div
                            className="w-2 bg-primary rounded-t transition-all"
                            style={{ height: `${actualHeight}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span className="text-xs text-muted-foreground">Ideal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-xs text-muted-foreground">Actual</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Team Progress
              </CardTitle>
              <CardDescription>Individual contributions this sprint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {TEAM_MEMBERS.map((member) => (
                  <div key={member.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{member.avatar}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold">{member.tasksCompleted}</p>
                        <p className="text-[10px] text-muted-foreground">Tasks Done</p>
                      </div>
                      <div className="rounded bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold">{member.pointsCompleted}</p>
                        <p className="text-[10px] text-muted-foreground">Points</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standups Tab */}
        <TabsContent value="standup" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    Daily Check-in
                  </CardTitle>
                  <CardDescription>
                    Share your progress with the team ({new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })})
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  <Clock className="mr-1 h-3 w-3" />
                  Today
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {STANDUP_PROMPTS.map((prompt, index) => {
                const Icon = prompt.icon;
                return (
                  <div key={index} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {prompt.question}
                    </label>
                    <Textarea
                      placeholder="Share your update..."
                      value={standupResponses[prompt.question] || ''}
                      onChange={(e) => setStandupResponses({
                        ...standupResponses,
                        [prompt.question]: e.target.value
                      })}
                      className="min-h-[80px]"
                    />
                  </div>
                );
              })}
              <Button className="w-full">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Check-in
              </Button>
            </CardContent>
          </Card>

          {/* Previous Standups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Check-ins</CardTitle>
              <CardDescription>Recent updates from team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TEAM_MEMBERS.slice(0, 3).map((member, index) => (
                <div key={member.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">{member.avatar}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {index === 0 ? '2 hours ago' : index === 1 ? 'Yesterday' : '2 days ago'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Completed</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Completed the user research analysis</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Working on prototype refinements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Need help with data visualization library</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Coach Tab */}
        <TabsContent value="coach" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Team Dynamics Coach
              </CardTitle>
              <CardDescription>
                Intelligent suggestions to improve your team's agile practices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {AI_SUGGESTIONS.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <div
                    key={index}
                    className={`rounded-lg border p-4 space-y-2 bg-${suggestion.color}-500/5 border-${suggestion.color}-500/20`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg bg-${suggestion.color}-500/10 p-2`}>
                          <Icon className={`h-4 w-4 text-${suggestion.color}-500`} />
                        </div>
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{suggestion.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-10">{suggestion.message}</p>
                    <div className="flex gap-2 pl-10">
                      <Button size="sm" variant="outline">
                        <ThumbsUp className="mr-1 h-3 w-3" />
                        Helpful
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ThumbsDown className="mr-1 h-3 w-3" />
                        Not useful
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Ask AI Coach */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ask the AI Coach</CardTitle>
              <CardDescription>Get personalized guidance for your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ask about team dynamics, sprint planning, estimation techniques, or anything agile..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Advice
                </Button>
                <Button variant="outline">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Suggest Topics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retro Tab */}
        <TabsContent value="retro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-500" />
                Sprint Retrospective
              </CardTitle>
              <CardDescription>
                Reflect on Sprint 2 and plan improvements for the next sprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What Went Well */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2 text-emerald-600">
                    <ThumbsUp className="h-4 w-4" />
                    What Went Well
                  </h4>
                  <Button variant="ghost" size="sm">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {RETRO_ITEMS.wentWell.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3"
                    >
                      <span className="text-sm">{item.text}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <ChevronUp className="mr-1 h-3 w-3" />
                          {item.votes}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What Could Improve */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2 text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                    What Could Improve
                  </h4>
                  <Button variant="ghost" size="sm">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {RETRO_ITEMS.improve.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/20 p-3"
                    >
                      <span className="text-sm">{item.text}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <ChevronUp className="mr-1 h-3 w-3" />
                          {item.votes}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2 text-blue-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Action Items
                  </h4>
                  <Button variant="ghost" size="sm">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Action
                  </Button>
                </div>
                <div className="space-y-2">
                  {RETRO_ITEMS.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${action.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted'}`} />
                        <div>
                          <p className="text-sm">{action.text}</p>
                          <p className="text-xs text-muted-foreground">Owner: {action.owner}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={action.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' : ''}
                      >
                        {action.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete Retro */}
          <div className="flex gap-3">
            <Button>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Retrospective
            </Button>
            <Button variant="outline">
              <PenLine className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
