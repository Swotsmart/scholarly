'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Settings,
  DoorOpen,
  Users,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Upload,
  Wand2,
} from 'lucide-react';

const schedulingModules = [
  {
    title: 'School Timetable',
    description: 'View and manage the weekly class schedule across all year levels and departments.',
    href: '/admin/scheduling/timetable',
    icon: Calendar,
    color: 'blue',
    status: 'ready' as const,
  },
  {
    title: 'Scheduling Constraints',
    description: 'Configure teacher preferences, room requirements, and time block rules that govern timetable generation.',
    href: '/admin/scheduling/constraints',
    icon: Settings,
    color: 'purple',
    status: 'ready' as const,
  },
  {
    title: 'Room Inventory',
    description: 'Manage classrooms, labs, studios, and facilities with capacity and equipment details.',
    href: '/admin/scheduling/rooms',
    icon: DoorOpen,
    color: 'green',
    status: 'ready' as const,
  },
  {
    title: 'Relief Teacher Pool',
    description: 'Manage relief and casual teaching staff, availability, and assignment history.',
    href: '/admin/scheduling/relief',
    icon: Users,
    color: 'orange',
    status: 'ready' as const,
  },
];

const setupSteps = [
  {
    step: 1,
    title: 'Configure Rooms & Facilities',
    description: 'Add your classrooms, labs, and specialist rooms with capacity and equipment details.',
    href: '/admin/scheduling/rooms',
    status: 'complete' as const,
  },
  {
    step: 2,
    title: 'Set Scheduling Constraints',
    description: 'Define teacher preferences, room requirements, and time block rules before generating.',
    href: '/admin/scheduling/constraints',
    status: 'complete' as const,
  },
  {
    step: 3,
    title: 'Import Staff & Class Data',
    description: 'Upload or sync teacher assignments, class lists, and subject allocations via OneRoster or CSV.',
    href: '/admin/interoperability/oneroster',
    status: 'pending' as const,
  },
  {
    step: 4,
    title: 'Generate & Review Timetable',
    description: 'Run the scheduling engine, review the output, resolve conflicts, and publish.',
    href: '/admin/scheduling/timetable',
    status: 'pending' as const,
  },
];

function getStepIcon(status: string) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    case 'in-progress':
      return <Clock className="h-6 w-6 text-blue-500" />;
    default:
      return <Circle className="h-6 w-6 text-muted-foreground" />;
  }
}

export default function AdminSchedulingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-2">Scheduling</h1>
        <p className="text-muted-foreground">
          Manage your school timetable, rooms, constraints, and relief coverage
        </p>
      </div>

      {/* Setup Wizard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Timetable Setup Guide</CardTitle>
              <CardDescription>
                Follow these steps to create your school timetable from scratch
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setupSteps.map((step, i) => (
              <div key={step.step} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step.status)}
                  {i < setupSteps.length - 1 && (
                    <div className="w-px h-8 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Step {step.step}: {step.title}</h3>
                        {step.status === 'complete' && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">Done</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={step.href}>
                        {step.status === 'complete' ? 'Review' : 'Start'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Upload className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Import Data</h3>
              <p className="text-sm text-muted-foreground">
                Import staff, classes, and rooms via OneRoster or CSV
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/interoperability/oneroster">
                Import <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Wand2 className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Generate Timetable</h3>
              <p className="text-sm text-muted-foreground">
                Run the scheduling engine with your current constraints
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/scheduling/timetable">
                Generate <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Scheduling Modules</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {schedulingModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className={`rounded-lg bg-${module.color}-500/10 p-3 shrink-0`}>
                      <Icon className={`h-6 w-6 text-${module.color}-500`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
