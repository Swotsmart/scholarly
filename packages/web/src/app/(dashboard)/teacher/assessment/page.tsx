'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  FileText,
  PenTool,
  Library,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const assessments = [
  {
    id: 'a1',
    title: 'Design Thinking Process Quiz',
    type: 'quiz',
    subject: 'Design & Technology',
    yearLevel: 'Year 10',
    questions: 15,
    duration: '30 mins',
    status: 'published',
    submissions: 24,
    total: 28,
  },
  {
    id: 'a2',
    title: 'Innovation Lab Project Rubric',
    type: 'rubric',
    subject: 'Innovation',
    yearLevel: 'Year 11',
    criteria: 8,
    status: 'published',
    submissions: 20,
    total: 24,
  },
  {
    id: 'a3',
    title: 'PBL Milestone Assessment',
    type: 'rubric',
    subject: 'Project Based Learning',
    yearLevel: 'Year 12',
    criteria: 12,
    status: 'draft',
    submissions: 0,
    total: 18,
  },
  {
    id: 'a4',
    title: 'Prototyping Skills Test',
    type: 'practical',
    subject: 'Design & Technology',
    yearLevel: 'Year 10',
    tasks: 5,
    duration: '60 mins',
    status: 'scheduled',
    submissions: 0,
    total: 28,
  },
];

const templates = [
  { id: 't1', name: 'Multiple Choice Quiz', icon: ClipboardCheck, count: 12 },
  { id: 't2', name: 'Rubric Assessment', icon: FileText, count: 8 },
  { id: 't3', name: 'Practical Task', icon: PenTool, count: 5 },
];

export default function TeacherAssessmentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment</h1>
          <p className="text-muted-foreground">
            Create and manage assessments for your classes
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/assessment/builder">
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map(template => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.count} templates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assessments..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>My Assessments</CardTitle>
          <CardDescription>All assessments you have created</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assessments.map(assessment => (
              <div
                key={assessment.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {assessment.type === 'quiz' ? (
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  ) : assessment.type === 'rubric' ? (
                    <FileText className="h-5 w-5 text-primary" />
                  ) : (
                    <PenTool className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{assessment.title}</p>
                    <Badge
                      variant={
                        assessment.status === 'published'
                          ? 'default'
                          : assessment.status === 'draft'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {assessment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assessment.subject} • {assessment.yearLevel}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">
                    {assessment.submissions}/{assessment.total} submitted
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {assessment.questions
                      ? `${assessment.questions} questions`
                      : assessment.criteria
                        ? `${assessment.criteria} criteria`
                        : `${assessment.tasks} tasks`}
                  </p>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Library Link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Library className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Assessment Library</p>
              <p className="text-sm text-muted-foreground">
                Browse shared assessments from other teachers and curriculum resources
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/teacher/assessment/library">Browse Library</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
