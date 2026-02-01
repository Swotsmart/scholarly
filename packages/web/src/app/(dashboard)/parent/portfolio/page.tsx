'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Download, Eye, Calendar, Award } from 'lucide-react';

const PORTFOLIO_ITEMS = [
  {
    id: 'p1',
    title: 'Science Fair Project - Solar System Model',
    type: 'project',
    subject: 'Science',
    date: '2026-01-20',
    grade: 'A',
    description: 'Created a 3D model of the solar system with accurate scale representations.',
  },
  {
    id: 'p2',
    title: 'Creative Writing - Short Story',
    type: 'assignment',
    subject: 'English',
    date: '2026-01-15',
    grade: 'A-',
    description: 'Original short story exploring themes of friendship and adventure.',
  },
  {
    id: 'p3',
    title: 'Math Problem Solving Challenge',
    type: 'challenge',
    subject: 'Mathematics',
    date: '2026-01-10',
    grade: 'B+',
    description: 'Participated in school-wide math challenge, solved 15/20 problems.',
  },
  {
    id: 'p4',
    title: 'Art Project - Watercolor Landscape',
    type: 'project',
    subject: 'Art',
    date: '2026-01-05',
    grade: 'A+',
    description: 'Beautiful watercolor painting of a sunset landscape.',
  },
];

export default function ParentPortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">View your child&apos;s work and achievements</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      <div className="grid gap-4">
        {PORTFOLIO_ITEMS.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{item.subject}</Badge>
                      <Badge variant="outline" className="capitalize">{item.type}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-700 text-lg px-3">
                      {item.grade}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {item.date}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
