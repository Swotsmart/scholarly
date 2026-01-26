'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { subjects } from '@/lib/homeschool-api';

const overallCoverage = Math.round(
  subjects.reduce((sum, s) => sum + s.standardsCoverage, 0) / subjects.length
);

const subjectColorMap: Record<string, string> = {
  Mathematics: 'bg-blue-500/10 text-blue-600',
  English: 'bg-green-500/10 text-green-600',
  Science: 'bg-purple-500/10 text-purple-600',
  HASS: 'bg-amber-500/10 text-amber-600',
  Technologies: 'bg-cyan-500/10 text-cyan-600',
  Arts: 'bg-pink-500/10 text-pink-600',
};

function SubjectGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <Card key={subject.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{subject.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  {subject.hoursPerWeek} hrs/week
                </CardDescription>
              </div>
              <Badge className={subjectColorMap[subject.name] || 'bg-gray-500/10 text-gray-600'}>
                Year {subject.yearLevel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{subject.acaraAlignment}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{subject.progress}%</span>
              </div>
              <Progress value={subject.progress} />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Units</p>
              <ul className="space-y-1">
                {subject.units.map((unit) => (
                  <li key={unit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {unit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Standards Coverage</span>
                <span className="font-medium">{subject.standardsCoverage}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${subject.standardsCoverage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CurriculumPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Curriculum Planner</h1>
          <p className="text-muted-foreground">
            Plan and track ACARA-aligned learning across all subjects
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Overall Standards Coverage */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="rounded-lg bg-primary/10 p-3">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Overall ACARA Standards Coverage</p>
                <p className="text-sm text-muted-foreground">
                  Across all {subjects.length} subjects
                </p>
              </div>
              <p className="text-2xl font-bold">{overallCoverage}%</p>
            </div>
            <Progress value={overallCoverage} />
          </div>
        </CardContent>
      </Card>

      {/* Term Tabs */}
      <Tabs defaultValue="term1">
        <TabsList>
          <TabsTrigger value="term1">Term 1</TabsTrigger>
          <TabsTrigger value="term2">Term 2</TabsTrigger>
          <TabsTrigger value="term3">Term 3</TabsTrigger>
          <TabsTrigger value="term4">Term 4</TabsTrigger>
        </TabsList>

        <TabsContent value="term1" className="mt-6">
          <SubjectGrid />
        </TabsContent>

        <TabsContent value="term2" className="mt-6">
          <SubjectGrid />
        </TabsContent>

        <TabsContent value="term3" className="mt-6">
          <SubjectGrid />
        </TabsContent>

        <TabsContent value="term4" className="mt-6">
          <SubjectGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
