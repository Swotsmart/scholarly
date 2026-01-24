'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const students = [
  { id: 's1', name: 'Emma Smith', class: 'Year 10 Design & Tech', challenge: 'Sustainable Campus', phase: 'prototype', progress: 62, status: 'on-track' },
  { id: 's2', name: 'Liam Johnson', class: 'Year 10 Design & Tech', challenge: 'Sustainable Campus', phase: 'ideate', progress: 45, status: 'on-track' },
  { id: 's3', name: 'Olivia Brown', class: 'Year 11 Innovation', challenge: 'Student Wellness', phase: 'empathize', progress: 20, status: 'needs-attention' },
  { id: 's4', name: 'Noah Williams', class: 'Year 11 Innovation', challenge: 'Student Wellness', phase: 'define', progress: 35, status: 'on-track' },
  { id: 's5', name: 'Ava Davis', class: 'Year 12 Project', challenge: 'Individual Project', phase: 'iterate', progress: 78, status: 'ahead' },
  { id: 's6', name: 'James Miller', class: 'Year 12 Project', challenge: 'Individual Project', phase: 'pitch', progress: 92, status: 'ahead' },
  { id: 's7', name: 'Sophia Wilson', class: 'Year 10 Design & Tech', challenge: 'Sustainable Campus', phase: 'define', progress: 28, status: 'needs-attention' },
  { id: 's8', name: 'Lucas Taylor', class: 'Year 11 Innovation', challenge: 'Student Wellness', phase: 'ideate', progress: 48, status: 'on-track' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'ahead':
      return <Badge variant="success">Ahead</Badge>;
    case 'needs-attention':
      return <Badge variant="destructive">Needs Attention</Badge>;
    default:
      return <Badge variant="secondary">On Track</Badge>;
  }
}

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Student Progress</h1>
          <p className="text-muted-foreground">
            Track individual student progress across all challenges
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.filter(s => s.status === 'ahead').length}</p>
                <p className="text-sm text-muted-foreground">Ahead of Schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.filter(s => s.status === 'on-track').length}</p>
                <p className="text-sm text-muted-foreground">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-500/10 p-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.filter(s => s.status === 'needs-attention').length}</p>
                <p className="text-sm text-muted-foreground">Need Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Student List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-medium">Student</th>
                <th className="p-4 text-left font-medium">Class</th>
                <th className="p-4 text-left font-medium">Challenge</th>
                <th className="p-4 text-left font-medium">Phase</th>
                <th className="p-4 text-left font-medium">Progress</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{student.class}</td>
                  <td className="p-4">{student.challenge}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="capitalize">
                      {student.phase}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={student.progress} className="flex-1" />
                      <span className="text-sm">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4">{getStatusBadge(student.status)}</td>
                  <td className="p-4">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/teacher/students/${student.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
