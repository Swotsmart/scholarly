'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';

const classes = [
  {
    id: 'class_1',
    name: 'Year 10 Design & Technology',
    code: '10DT-A',
    students: 28,
    activeChallenge: 'Sustainable Campus Life',
    avgProgress: 45,
    nextSession: 'Monday 8:30 AM',
    room: 'Room 204',
  },
  {
    id: 'class_2',
    name: 'Year 11 Innovation Studies',
    code: '11INN-B',
    students: 24,
    activeChallenge: 'Student Wellness Innovation',
    avgProgress: 32,
    nextSession: 'Monday 10:35 AM',
    room: 'Lab 3',
  },
  {
    id: 'class_3',
    name: 'Year 12 Major Project',
    code: '12MP-A',
    students: 18,
    activeChallenge: 'Individual Projects',
    avgProgress: 68,
    nextSession: 'Monday 2:15 PM',
    room: 'Room 312',
  },
];

export default function TeacherClassesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">My Classes</h1>
          <p className="text-muted-foreground">
            Manage your classes and track student progress
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {classes.map((cls) => (
          <Card key={cls.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>Code: {cls.code}</CardDescription>
                </div>
                <Badge variant="outline">{cls.students} students</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Active Challenge
                  </div>
                  <p className="mt-1 font-medium">{cls.activeChallenge}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Average Progress
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={cls.avgProgress} className="flex-1" />
                    <span className="text-sm font-medium">{cls.avgProgress}%</span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Next Session
                  </div>
                  <p className="mt-1 font-medium">{cls.nextSession}</p>
                  <p className="text-sm text-muted-foreground">{cls.room}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Users className="mr-2 h-4 w-4" />
                    View Students
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/teacher/classes/${cls.id}/progress`}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Progress Report
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
