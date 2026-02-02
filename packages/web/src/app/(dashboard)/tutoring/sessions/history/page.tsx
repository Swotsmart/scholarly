'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  History,
  Search,
  Calendar,
  Clock,
  Video,
  Star,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const pastSessions = [
  {
    id: 1,
    student: 'Emma Smith',
    subject: 'Algebra',
    date: 'Jan 30, 2026',
    time: '2:00 PM - 3:00 PM',
    duration: 60,
    rating: 5,
    amount: 65,
    notes: 'Covered quadratic equations. Student showed great progress.',
  },
  {
    id: 2,
    student: 'Liam Chen',
    subject: 'Calculus',
    date: 'Jan 29, 2026',
    time: '4:30 PM - 6:00 PM',
    duration: 90,
    rating: 5,
    amount: 112.50,
    notes: 'Integration techniques review. Ready for upcoming test.',
  },
  {
    id: 3,
    student: 'Sophie Garcia',
    subject: 'Statistics',
    date: 'Jan 28, 2026',
    time: '10:00 AM - 11:00 AM',
    duration: 60,
    rating: 4,
    amount: 70,
    notes: 'Probability distributions introduction.',
  },
  {
    id: 4,
    student: 'James Wilson',
    subject: 'Algebra',
    date: 'Jan 27, 2026',
    time: '3:00 PM - 3:45 PM',
    duration: 45,
    rating: 5,
    amount: 48.75,
    notes: 'Linear equations practice. Homework review.',
  },
  {
    id: 5,
    student: 'Olivia Brown',
    subject: 'Calculus',
    date: 'Jan 26, 2026',
    time: '5:00 PM - 6:00 PM',
    duration: 60,
    rating: 5,
    amount: 75,
    notes: 'Derivatives and their applications.',
  },
];

export default function SessionHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Session History
          </h1>
          <p className="text-muted-foreground">
            View and manage your completed sessions
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export History
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">This Month</span>
            </div>
            <div className="mt-2 text-2xl font-bold">46</div>
            <p className="text-xs text-muted-foreground mt-1">sessions completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Hours</span>
            </div>
            <div className="mt-2 text-2xl font-bold">52.5</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Avg Rating</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4.9</div>
            <p className="text-xs text-muted-foreground mt-1">from 46 reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Lifetime</span>
            </div>
            <div className="mt-2 text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground mt-1">sessions total</p>
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
                placeholder="Search by student name or subject..."
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
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 3 months</option>
              <option>All time</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Sessions</CardTitle>
          <CardDescription>Showing 5 of 342 sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pastSessions.map((session) => (
              <div key={session.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Video className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.student}</p>
                        <Badge variant="outline">{session.subject}</Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(session.rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {session.date}
                        <span className="text-muted-foreground/50">|</span>
                        <Clock className="h-3 w-3" />
                        {session.time}
                        <span className="text-muted-foreground/50">|</span>
                        {session.duration} min
                      </p>
                      {session.notes && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
                          <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600">${session.amount.toFixed(2)}</span>
                    <div className="mt-2">
                      <Button variant="ghost" size="sm">View Details</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing 1-5 of 342 sessions
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
