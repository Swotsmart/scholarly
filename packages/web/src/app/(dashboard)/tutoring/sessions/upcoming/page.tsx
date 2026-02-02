'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Edit,
  X,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const upcomingSessions = [
  {
    id: 1,
    student: 'Emma Smith',
    subject: 'Algebra',
    date: 'Today',
    time: '2:00 PM - 3:00 PM',
    timeUntil: '2 hours',
    status: 'confirmed',
    notes: 'Focus on quadratic formula practice',
  },
  {
    id: 2,
    student: 'Liam Chen',
    subject: 'Calculus',
    date: 'Today',
    time: '4:30 PM - 6:00 PM',
    timeUntil: '4.5 hours',
    status: 'confirmed',
    notes: 'Test preparation - integration',
  },
  {
    id: 3,
    student: 'Sophie Garcia',
    subject: 'Statistics',
    date: 'Tomorrow',
    time: '10:00 AM - 11:00 AM',
    timeUntil: '1 day',
    status: 'pending',
    notes: 'Introduction to hypothesis testing',
  },
  {
    id: 4,
    student: 'James Wilson',
    subject: 'Algebra',
    date: 'Feb 4',
    time: '3:00 PM - 3:45 PM',
    timeUntil: '2 days',
    status: 'confirmed',
    notes: '',
  },
  {
    id: 5,
    student: 'Olivia Brown',
    subject: 'Calculus',
    date: 'Feb 5',
    time: '5:00 PM - 6:00 PM',
    timeUntil: '3 days',
    status: 'confirmed',
    notes: 'Review derivatives',
  },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekDates = [3, 4, 5, 6, 7, 8, 9];

export default function UpcomingSessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Upcoming Sessions
          </h1>
          <p className="text-muted-foreground">
            View and manage your scheduled sessions
          </p>
        </div>
      </div>

      {/* Week Calendar View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">February 2026</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">Today</Button>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => (
              <div key={day} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{day}</p>
                <div className={`p-2 rounded-lg ${weekDates[i] === 3 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <p className="font-medium">{weekDates[i]}</p>
                  {(weekDates[i] === 3 || weekDates[i] === 4 || weekDates[i] === 5) && (
                    <div className="flex justify-center gap-1 mt-1">
                      {weekDates[i] === 3 && (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        </>
                      )}
                      {weekDates[i] === 4 && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                      {weekDates[i] === 5 && (
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">sessions scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <div className="mt-2 text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">sessions total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground mt-1">awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Sessions</CardTitle>
          <CardDescription>Your upcoming tutoring appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      session.date === 'Today' ? 'bg-blue-100' : 'bg-muted'
                    }`}>
                      <Video className={`h-5 w-5 ${session.date === 'Today' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.student}</p>
                        <Badge variant="outline">{session.subject}</Badge>
                        <Badge className={session.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {session.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {session.date}
                        <span className="text-muted-foreground/50">|</span>
                        <Clock className="h-3 w-3" />
                        {session.time}
                      </p>
                      {session.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary">{session.timeUntil}</Badge>
                    <div className="flex items-center gap-1">
                      {session.date === 'Today' && (
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                          <Video className="mr-1 h-3 w-3" />
                          Join
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                        <X className="h-4 w-4" />
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
