'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, BookOpen, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { useHomeschool } from '@/hooks/use-homeschool';

const FALLBACK_CHILDREN = [
  { id: 1, name: 'Emma', age: 8, grade: 'Year 3', subjects: 4, progress: 78 },
  { id: 2, name: 'Liam', age: 11, grade: 'Year 6', subjects: 6, progress: 85 },
  { id: 3, name: 'Sophie', age: 6, grade: 'Year 1', subjects: 3, progress: 92 },
];

function computeAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function HomeschoolChildrenPage() {
  const { family, isLoading } = useHomeschool();

  const children = family?.children
    ? family.children.map((c) => ({
        id: c.id,
        name: c.name,
        age: computeAge(c.dateOfBirth),
        grade: c.currentYearLevel,
        subjects: c.subjectProgress?.length || c.interests?.length || 0,
        progress: c.subjectProgress?.length
          ? Math.round(c.subjectProgress.reduce((sum, sp) => sum + (sp.completedCodes.length / Math.max(sp.curriculumCodes.length, 1)) * 100, 0) / c.subjectProgress.length)
          : 0,
      }))
    : FALLBACK_CHILDREN;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Children</h1>
          <p className="text-muted-foreground">Manage your homeschool learners</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {child.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{child.name}</CardTitle>
                  <CardDescription>{child.grade} • Age {child.age}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{child.subjects} subjects</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{child.progress}% complete</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${child.progress}%` }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
                <Button size="sm" className="flex-1" asChild><Link href="/homeschool/progress">View Progress</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[250px] text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">Add Another Child</p>
            <p className="text-sm text-muted-foreground">Set up a learning profile</p>
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
