'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Clock, Target } from 'lucide-react';

const CHILDREN = [
  {
    id: 'c1',
    name: 'Emma',
    courses: [
      { name: 'Mathematics', progress: 78, hoursThisWeek: 5.5, status: 'on-track' },
      { name: 'English Literature', progress: 85, hoursThisWeek: 4.2, status: 'ahead' },
      { name: 'Science', progress: 62, hoursThisWeek: 3.0, status: 'on-track' },
      { name: 'History', progress: 45, hoursThisWeek: 2.5, status: 'behind' },
    ],
    totalHours: 15.2,
    streak: 12,
  },
  {
    id: 'c2',
    name: 'Oliver',
    courses: [
      { name: 'Reading', progress: 90, hoursThisWeek: 4.0, status: 'ahead' },
      { name: 'Mathematics', progress: 72, hoursThisWeek: 3.5, status: 'on-track' },
      { name: 'Art', progress: 95, hoursThisWeek: 2.0, status: 'ahead' },
    ],
    totalHours: 9.5,
    streak: 8,
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'ahead':
      return <Badge className="bg-green-100 text-green-700">Ahead</Badge>;
    case 'on-track':
      return <Badge className="bg-blue-100 text-blue-700">On Track</Badge>;
    case 'behind':
      return <Badge className="bg-amber-100 text-amber-700">Needs Attention</Badge>;
    default:
      return null;
  }
}

export default function ParentLearningProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">Track your children's course completion and study time</p>
      </div>

      {CHILDREN.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{child.name}</span>
              <div className="flex items-center gap-4 text-sm font-normal">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {child.totalHours}h this week
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-orange-500" />
                  {child.streak} day streak
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {child.courses.map((course) => (
              <div key={course.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{course.name}</span>
                    {getStatusBadge(course.status)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {course.hoursThisWeek}h this week
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={course.progress} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-right">{course.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
