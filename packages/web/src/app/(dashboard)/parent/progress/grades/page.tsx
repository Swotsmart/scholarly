'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';

const CHILDREN = [
  {
    id: 'c1',
    name: 'Emma',
    gpa: 3.7,
    subjects: [
      { name: 'Mathematics', grade: 'A-', score: 88, trend: 'up' },
      { name: 'English Literature', grade: 'A', score: 92, trend: 'stable' },
      { name: 'Science', grade: 'B+', score: 85, trend: 'up' },
      { name: 'History', grade: 'B', score: 82, trend: 'down' },
      { name: 'Art', grade: 'A', score: 95, trend: 'stable' },
    ],
  },
  {
    id: 'c2',
    name: 'Oliver',
    gpa: 3.5,
    subjects: [
      { name: 'Reading', grade: 'A', score: 94, trend: 'up' },
      { name: 'Mathematics', grade: 'B+', score: 86, trend: 'up' },
      { name: 'Writing', grade: 'B', score: 83, trend: 'stable' },
      { name: 'Art', grade: 'A+', score: 98, trend: 'stable' },
    ],
  },
];

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getGradeBadge(grade: string) {
  const color = grade.startsWith('A') ? 'bg-green-100 text-green-700' :
    grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
    grade.startsWith('C') ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  return <Badge className={color}>{grade}</Badge>;
}

export default function ParentGradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grades</h1>
        <p className="text-muted-foreground">View your children's academic performance</p>
      </div>

      {CHILDREN.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {child.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">GPA</span>
                <span className="text-2xl font-bold">{child.gpa}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {child.subjects.map((subject) => (
                <div key={subject.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{subject.score}%</span>
                    {getGradeBadge(subject.grade)}
                    {getTrendIcon(subject.trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
