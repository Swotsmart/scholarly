'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BookOpen, Clock, Award, Target } from 'lucide-react';

export default function HomeschoolProgressPage() {
  const subjects = [
    { name: 'Mathematics', progress: 75, hours: 24, status: 'on-track' },
    { name: 'English', progress: 82, hours: 30, status: 'ahead' },
    { name: 'Science', progress: 68, hours: 18, status: 'on-track' },
    { name: 'History', progress: 45, hours: 12, status: 'behind' },
    { name: 'Art', progress: 90, hours: 15, status: 'ahead' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-green-500';
      case 'behind': return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">Track your homeschool curriculum progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">72%</p>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Active Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">99h</p>
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Progress</CardTitle>
          <CardDescription>Progress by curriculum area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {subjects.map((subject) => (
              <div key={subject.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{subject.name}</span>
                    <span className={`text-xs capitalize ${getStatusColor(subject.status)}`}>
                      ({subject.status.replace('-', ' ')})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{subject.hours}h logged</span>
                    <span className="font-medium text-foreground">{subject.progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${subject.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
