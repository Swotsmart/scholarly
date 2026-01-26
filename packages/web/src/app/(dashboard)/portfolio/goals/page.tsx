'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Circle,
  Trophy,
  TrendingUp,
} from 'lucide-react';

const stats = [
  { label: 'Active Goals', value: '3', icon: Target, color: 'violet' },
  { label: 'Completed', value: '7', icon: Trophy, color: 'emerald' },
  { label: 'On Track', value: '2', icon: TrendingUp, color: 'blue' },
  { label: 'At Risk', value: '1', icon: AlertTriangle, color: 'amber' },
];

const goals = [
  {
    id: 'goal-1',
    title: 'Master Calculus Fundamentals',
    description: 'Complete all core calculus topics including limits, derivatives, and integrals with 85%+ mastery.',
    targetDate: 'Apr 30, 2024',
    progress: 68,
    status: 'on-track',
    milestones: [
      { name: 'Complete limits unit', completed: true },
      { name: 'Master derivative rules', completed: true },
      { name: 'Apply chain rule fluently', completed: true },
      { name: 'Integration techniques', completed: false },
      { name: 'Applications of integrals', completed: false },
    ],
  },
  {
    id: 'goal-2',
    title: 'Build Full-Stack Web Application',
    description: 'Design, develop, and deploy a complete web application with frontend, backend, and database.',
    targetDate: 'Mar 15, 2024',
    progress: 45,
    status: 'at-risk',
    milestones: [
      { name: 'Design system architecture', completed: true },
      { name: 'Build REST API', completed: true },
      { name: 'Create frontend components', completed: false },
      { name: 'Implement authentication', completed: false },
      { name: 'Deploy to production', completed: false },
    ],
  },
  {
    id: 'goal-3',
    title: 'IB Extended Essay Completion',
    description: 'Complete the 4,000-word extended essay on environmental science with proper research methodology.',
    targetDate: 'May 20, 2024',
    progress: 82,
    status: 'on-track',
    milestones: [
      { name: 'Topic selection and approval', completed: true },
      { name: 'Literature review', completed: true },
      { name: 'Data collection', completed: true },
      { name: 'First draft complete', completed: true },
      { name: 'Final revision and submission', completed: false },
    ],
  },
  {
    id: 'goal-4',
    title: 'Achieve B2 French Proficiency',
    description: 'Reach upper-intermediate French proficiency across all four language skills.',
    targetDate: 'Jun 30, 2024',
    progress: 55,
    status: 'on-track',
    milestones: [
      { name: 'B1 reading comprehension', completed: true },
      { name: 'B1 listening proficiency', completed: true },
      { name: 'B2 vocabulary threshold', completed: false },
      { name: 'B2 writing assessment', completed: false },
      { name: 'B2 speaking evaluation', completed: false },
    ],
  },
  {
    id: 'goal-5',
    title: 'Complete Biology IA Experiment',
    description: 'Design and execute an independent biology investigation on enzyme activity and pH levels.',
    targetDate: 'Feb 1, 2024',
    progress: 100,
    status: 'completed',
    milestones: [
      { name: 'Research question formulation', completed: true },
      { name: 'Experimental design', completed: true },
      { name: 'Data collection', completed: true },
      { name: 'Statistical analysis', completed: true },
      { name: 'Report submission', completed: true },
    ],
  },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  'on-track': { label: 'On Track', variant: 'default', icon: TrendingUp },
  'at-risk': { label: 'At Risk', variant: 'warning', icon: AlertTriangle },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  overdue: { label: 'Overdue', variant: 'warning', icon: Clock },
};

export default function GoalsPage() {
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
            <h1 className="heading-2">Learning Goals</h1>
            <p className="text-muted-foreground">
              Set, track, and achieve your learning objectives
            </p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
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

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const status = statusConfig[goal.status];
          const StatusIcon = status.icon;
          const completedMilestones = goal.milestones.filter((m) => m.completed).length;

          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <Badge variant={status.variant}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <CardDescription>{goal.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress
                    value={goal.progress}
                    className="h-2"
                    indicatorClassName={
                      goal.status === 'completed'
                        ? 'bg-emerald-500'
                        : goal.status === 'at-risk'
                          ? 'bg-amber-500'
                          : 'bg-primary'
                    }
                  />
                </div>

                {/* Target Date and Milestone Count */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Target: {goal.targetDate}
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {completedMilestones}/{goal.milestones.length} milestones
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2.5">
                  <p className="text-sm font-medium">Milestones</p>
                  {goal.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {milestone.completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={`text-sm ${
                          milestone.completed ? 'text-muted-foreground line-through' : ''
                        }`}
                      >
                        {milestone.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
