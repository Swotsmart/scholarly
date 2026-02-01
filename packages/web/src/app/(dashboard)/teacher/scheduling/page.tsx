'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  School,
  Users,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  BarChart3,
} from 'lucide-react';

const todaySchedule = [
  { period: 1, time: '8:30 - 9:20', class: 'Year 10 Design & Tech', room: 'Room 204', status: 'scheduled' },
  { period: 2, time: '9:25 - 10:15', class: 'Year 10 Design & Tech', room: 'Room 204', status: 'scheduled' },
  { period: 3, time: '10:35 - 11:25', class: 'Year 11 Innovation', room: 'Lab 3', status: 'scheduled' },
  { period: 4, time: '11:30 - 12:20', class: 'Year 11 Innovation', room: 'Lab 3', status: 'scheduled' },
  { period: 5, time: '1:20 - 2:10', class: 'Free Period', room: '-', status: 'free' },
  { period: 6, time: '2:15 - 3:05', class: 'Year 12 Project', room: 'Room 312', status: 'scheduled' },
];

const reliefNotices = [
  { date: 'Tomorrow', teacher: 'Ms. Chen', subject: 'Mathematics', periods: '3-4', status: 'open' },
  { date: 'Friday', teacher: 'Mr. Torres', subject: 'Physics', periods: '1-2', status: 'filled' },
];

const roomBookings = [
  { room: 'Lab 3', date: 'Today', time: '10:35 - 12:20', purpose: 'Design prototyping session' },
  { room: 'Makerspace', date: 'Thursday', time: '2:15 - 3:05', purpose: 'Student pitch practice' },
];

export default function TeacherSchedulingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Scheduling</h1>
          <p className="text-muted-foreground">
            Manage your timetable, relief coverage, and room bookings
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/teacher/scheduling/timetable">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">My Timetable</h3>
                <p className="text-sm text-muted-foreground">
                  View your weekly schedule
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/scheduling/relief">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Relief Marketplace</h3>
                <p className="text-sm text-muted-foreground">
                  View or accept relief slots
                </p>
              </div>
              <Badge>1 Open</Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/scheduling/rooms">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3">
                <School className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Room Booking</h3>
                <p className="text-sm text-muted-foreground">
                  Book labs and facilities
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/scheduling/capacity">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Capacity Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor resource utilization
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todaySchedule.map((period) => (
              <div
                key={period.period}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  period.status === 'free' ? 'bg-muted/50' : ''
                }`}
              >
                <div className="w-20 text-center">
                  <Badge variant={period.status === 'free' ? 'secondary' : 'default'}>
                    Period {period.period}
                  </Badge>
                </div>
                <div className="w-32 text-sm text-muted-foreground">
                  {period.time}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{period.class}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {period.room}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Relief Notices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Relief Notices
            </CardTitle>
            <CardDescription>Upcoming relief opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reliefNotices.map((notice, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{notice.teacher} - {notice.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {notice.date} • Periods {notice.periods}
                  </p>
                </div>
                {notice.status === 'open' ? (
                  <Button size="sm">Accept</Button>
                ) : (
                  <Badge variant="secondary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Filled
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Room Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  My Room Bookings
                </CardTitle>
                <CardDescription>Upcoming room reservations</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/teacher/scheduling/rooms">Book Room</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {roomBookings.map((booking, index) => (
              <div
                key={index}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{booking.room}</p>
                  <Badge variant="outline">{booking.date}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {booking.time}
                </p>
                <p className="text-sm mt-1">{booking.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
