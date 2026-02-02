'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  FileText,
  Award,
} from 'lucide-react';

// Mock student data - in real app this would come from API
const studentData: Record<string, {
  id: string;
  name: string;
  email: string;
  yearLevel: string;
  class: string;
  avatar: string | null;
  attendance: number;
  averageGrade: string;
  assignments: { completed: number; total: number };
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  notes: string[];
  recentActivity: { date: string; action: string; detail: string }[];
  grades: { subject: string; grade: string; trend: 'up' | 'down' | 'stable' }[];
}> = {
  s1: {
    id: 's1',
    name: 'Emma Thompson',
    email: 'emma.t@student.scholarly.edu',
    yearLevel: 'Year 10',
    class: 'Design & Technology',
    avatar: null,
    attendance: 96,
    averageGrade: 'A-',
    assignments: { completed: 12, total: 14 },
    parentName: 'Sarah Thompson',
    parentEmail: 'sarah.thompson@email.com',
    parentPhone: '+61 4XX XXX XXX',
    notes: ['Shows excellent initiative in group projects', 'Could benefit from additional challenge work'],
    recentActivity: [
      { date: '2024-01-15', action: 'Submitted', detail: 'Design Thinking Quiz' },
      { date: '2024-01-14', action: 'Attended', detail: 'Innovation Lab Workshop' },
      { date: '2024-01-12', action: 'Completed', detail: 'Prototyping Module' },
    ],
    grades: [
      { subject: 'Design & Technology', grade: 'A', trend: 'stable' },
      { subject: 'Mathematics', grade: 'B+', trend: 'up' },
      { subject: 'English', grade: 'A-', trend: 'stable' },
      { subject: 'Science', grade: 'B', trend: 'up' },
    ],
  },
  s3: {
    id: 's3',
    name: 'Sophie Williams',
    email: 'sophie.w@student.scholarly.edu',
    yearLevel: 'Year 10',
    class: 'Design & Technology',
    avatar: null,
    attendance: 78,
    averageGrade: 'C+',
    assignments: { completed: 8, total: 14 },
    parentName: 'Mark Williams',
    parentEmail: 'mark.williams@email.com',
    parentPhone: '+61 4XX XXX XXX',
    notes: ['Recent attendance concerns - follow up scheduled', 'Struggling with project timelines'],
    recentActivity: [
      { date: '2024-01-15', action: 'Absent', detail: 'Design & Technology class' },
      { date: '2024-01-10', action: 'Late submission', detail: 'Design Thinking Quiz' },
      { date: '2024-01-08', action: 'Attended', detail: 'Support session' },
    ],
    grades: [
      { subject: 'Design & Technology', grade: 'C', trend: 'down' },
      { subject: 'Mathematics', grade: 'C+', trend: 'stable' },
      { subject: 'English', grade: 'B-', trend: 'down' },
      { subject: 'Science', grade: 'C', trend: 'stable' },
    ],
  },
};

// Default student for unknown IDs
const defaultStudent = {
  id: 'unknown',
  name: 'Unknown Student',
  email: 'unknown@student.scholarly.edu',
  yearLevel: 'Unknown',
  class: 'Unknown',
  avatar: null,
  attendance: 0,
  averageGrade: 'N/A',
  assignments: { completed: 0, total: 0 },
  parentName: 'Unknown',
  parentEmail: 'unknown@email.com',
  parentPhone: 'N/A',
  notes: [],
  recentActivity: [],
  grades: [],
};

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const student = studentData[studentId] || defaultStudent;

  const isAtRisk = student.attendance < 85 || student.assignments.completed / student.assignments.total < 0.7;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Student Profile</h1>
          <p className="text-muted-foreground">
            View and manage student information
          </p>
        </div>
        <Button variant="outline">
          <MessageCircle className="mr-2 h-4 w-4" />
          Message
        </Button>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Student Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-20 w-20">
              <AvatarImage src={student.avatar || undefined} />
              <AvatarFallback className="text-xl">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{student.name}</h2>
                  {isAtRisk && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      At Risk
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{student.yearLevel} • {student.class}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {student.email}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{student.attendance}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{student.averageGrade}</p>
                <p className="text-xs text-muted-foreground">Avg Grade</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{student.assignments.completed}/{student.assignments.total}</p>
                <p className="text-xs text-muted-foreground">Assignments</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Attendance Rate</span>
                    <span className={student.attendance < 85 ? 'text-red-500' : 'text-green-500'}>
                      {student.attendance}%
                    </span>
                  </div>
                  <Progress value={student.attendance} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Assignments Completed</span>
                    <span>{Math.round((student.assignments.completed / student.assignments.total) * 100)}%</span>
                  </div>
                  <Progress
                    value={(student.assignments.completed / student.assignments.total) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Teacher Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Teacher Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {student.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-4">
                  Add Note
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {student.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.detail}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Grades</CardTitle>
              <CardDescription>Grades across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {student.grades.map((grade, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{grade.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        grade.grade.startsWith('A') ? 'default' :
                        grade.grade.startsWith('B') ? 'secondary' :
                        'outline'
                      }>
                        {grade.grade}
                      </Badge>
                      <TrendingUp className={`h-4 w-4 ${
                        grade.trend === 'up' ? 'text-green-500' :
                        grade.trend === 'down' ? 'text-red-500 rotate-180' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Full Activity Log</CardTitle>
              <CardDescription>All student activity in your classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {student.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.detail}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parent/Guardian Contact</CardTitle>
              <CardDescription>Primary contact for {student.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {student.parentName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{student.parentName}</p>
                  <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{student.parentEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{student.parentPhone}</p>
                  </div>
                </div>
              </div>
              <Button className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Send Message to Parent
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
