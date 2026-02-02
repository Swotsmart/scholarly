'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit,
  MoreVertical,
  Users,
  Clock,
  Star,
} from 'lucide-react';

const assessments = [
  {
    id: 1,
    title: 'Algebra Fundamentals Quiz',
    subject: 'Mathematics',
    questions: 15,
    duration: 30,
    attempts: 124,
    avgScore: 78,
    created: '2 weeks ago',
    status: 'published',
  },
  {
    id: 2,
    title: 'Climate Change Essay',
    subject: 'Science',
    questions: 3,
    duration: 45,
    attempts: 89,
    avgScore: 82,
    created: '1 month ago',
    status: 'published',
  },
  {
    id: 3,
    title: 'Grammar & Punctuation Test',
    subject: 'English',
    questions: 25,
    duration: 20,
    attempts: 0,
    avgScore: 0,
    created: '3 days ago',
    status: 'draft',
  },
  {
    id: 4,
    title: 'World War II Knowledge Check',
    subject: 'History',
    questions: 20,
    duration: 25,
    attempts: 56,
    avgScore: 71,
    created: '3 weeks ago',
    status: 'published',
  },
];

export default function AssessmentLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Assessment Library
          </h1>
          <p className="text-muted-foreground">
            Browse and manage your assessments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Total Assessments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">269</div>
            <p className="text-sm text-muted-foreground">Total Attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">77%</div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">8</div>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assessments..." className="pl-10" />
        </div>
        <select className="p-2 rounded border">
          <option>All Subjects</option>
          <option>Mathematics</option>
          <option>Science</option>
          <option>English</option>
          <option>History</option>
        </select>
        <select className="p-2 rounded border">
          <option>All Status</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
      </div>

      {/* Assessment List */}
      <div className="grid gap-4">
        {assessments.map((assessment) => (
          <Card key={assessment.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{assessment.title}</h3>
                      <Badge variant={assessment.status === 'published' ? 'default' : 'secondary'}>
                        {assessment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline">{assessment.subject}</Badge>
                      <span>{assessment.questions} questions</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {assessment.duration} min
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {assessment.attempts} attempts
                      </span>
                      {assessment.avgScore > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {assessment.avgScore}% avg score
                        </span>
                      )}
                      <span>Created {assessment.created}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
