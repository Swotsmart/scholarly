'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Search,
  Star,
  Clock,
  TrendingUp,
  Calendar,
  MessageSquare,
  BookOpen,
  MoreHorizontal,
} from 'lucide-react';

const students = [
  {
    id: 1,
    name: 'Emma Smith',
    initials: 'ES',
    subject: 'Algebra',
    level: 'Year 10',
    sessions: 24,
    totalHours: 28,
    progress: 85,
    lastSession: '2 days ago',
    nextSession: 'Today, 2:00 PM',
    status: 'active',
  },
  {
    id: 2,
    name: 'Liam Chen',
    initials: 'LC',
    subject: 'Calculus',
    level: 'Year 12',
    sessions: 18,
    totalHours: 27,
    progress: 72,
    lastSession: '3 days ago',
    nextSession: 'Today, 4:30 PM',
    status: 'active',
  },
  {
    id: 3,
    name: 'Sophie Garcia',
    initials: 'SG',
    subject: 'Statistics',
    level: 'Year 11',
    sessions: 12,
    totalHours: 14,
    progress: 65,
    lastSession: '4 days ago',
    nextSession: 'Tomorrow, 10:00 AM',
    status: 'active',
  },
  {
    id: 4,
    name: 'James Wilson',
    initials: 'JW',
    subject: 'Algebra',
    level: 'Year 9',
    sessions: 8,
    totalHours: 8,
    progress: 45,
    lastSession: '5 days ago',
    nextSession: 'Feb 4, 3:00 PM',
    status: 'active',
  },
  {
    id: 5,
    name: 'Olivia Brown',
    initials: 'OB',
    subject: 'Calculus',
    level: 'Year 12',
    sessions: 15,
    totalHours: 18,
    progress: 78,
    lastSession: '6 days ago',
    nextSession: 'Feb 5, 5:00 PM',
    status: 'active',
  },
  {
    id: 6,
    name: 'Noah Davis',
    initials: 'ND',
    subject: 'Algebra',
    level: 'Year 10',
    sessions: 20,
    totalHours: 22,
    progress: 92,
    lastSession: '1 week ago',
    nextSession: 'Not scheduled',
    status: 'inactive',
  },
];

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            My Students
          </h1>
          <p className="text-muted-foreground">
            Manage your regular tutoring students
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Students</span>
            </div>
            <div className="mt-2 text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">regular students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Avg. Sessions</span>
            </div>
            <div className="mt-2 text-2xl font-bold">16</div>
            <p className="text-xs text-muted-foreground mt-1">per student</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Avg. Rating</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4.9</div>
            <p className="text-xs text-muted-foreground mt-1">from students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg. Progress</span>
            </div>
            <div className="mt-2 text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground mt-1">goal completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
              />
            </div>
            <select className="p-2 rounded border">
              <option>All Subjects</option>
              <option>Algebra</option>
              <option>Calculus</option>
              <option>Statistics</option>
            </select>
            <select className="p-2 rounded border">
              <option>All Students</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Your regular tutoring students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10">{student.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{student.name}</p>
                        <Badge variant="outline">{student.subject}</Badge>
                        <Badge variant="secondary">{student.level}</Badge>
                        <Badge className={student.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}>
                          {student.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {student.sessions} sessions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {student.totalHours} hours
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {student.lastSession}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Next: </span>
                      <span className={student.nextSession !== 'Not scheduled' ? 'font-medium' : 'text-muted-foreground'}>
                        {student.nextSession}
                      </span>
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-1 h-3 w-3" />
                        Schedule
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
