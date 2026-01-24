'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  Plus,
  Users,
  Calendar,
  Edit,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const challenges = [
  {
    id: 'challenge_1',
    title: 'Sustainable Campus Life',
    description: 'Design solutions for environmental sustainability on campus',
    status: 'active',
    classes: ['Year 10 Design & Tech'],
    students: 28,
    activeJourneys: 24,
    completedJourneys: 4,
    deadline: '2024-02-15',
    createdAt: '2024-01-01',
  },
  {
    id: 'challenge_2',
    title: 'Student Wellness Innovation',
    description: 'Address mental health challenges in educational settings',
    status: 'active',
    classes: ['Year 11 Innovation'],
    students: 24,
    activeJourneys: 20,
    completedJourneys: 2,
    deadline: '2024-02-28',
    createdAt: '2024-01-15',
  },
  {
    id: 'challenge_3',
    title: 'Community Food Sharing',
    description: 'Create platforms to reduce food waste through community sharing',
    status: 'completed',
    classes: ['Year 10 Design & Tech (2023)'],
    students: 26,
    activeJourneys: 0,
    completedJourneys: 24,
    deadline: '2023-12-15',
    createdAt: '2023-10-01',
  },
];

export default function TeacherChallengesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">My Challenges</h1>
          <p className="text-muted-foreground">
            Create and manage design thinking challenges for your classes
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/challenges/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Challenge
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {challenges.map((challenge) => (
          <Card key={challenge.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={challenge.status === 'active' ? 'default' : 'secondary'}>
                    {challenge.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/challenges/${challenge.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/challenges/${challenge.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {challenge.classes.map((cls) => (
                  <Badge key={cls} variant="outline">
                    {cls}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{challenge.students}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{challenge.activeJourneys}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{challenge.completedJourneys}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-sm font-medium">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(challenge.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/teacher/journeys?challenge=${challenge.id}`}>
                    <Users className="mr-2 h-4 w-4" />
                    View Journeys
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/teacher/challenges/${challenge.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Challenge
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
