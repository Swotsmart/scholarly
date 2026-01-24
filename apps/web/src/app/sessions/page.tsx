'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api, Booking } from '@/lib/api';
import { formatDate, formatDateTime, formatCurrency, getInitials } from '@/lib/utils';

export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['sessions', 'upcoming'],
    queryFn: () => api.get<{ data: Booking[] }>('/bookings', { status: 'confirmed,pending' }),
  });

  const { data: pastData, isLoading: pastLoading } = useQuery({
    queryKey: ['sessions', 'past'],
    queryFn: () => api.get<{ data: Booking[] }>('/bookings', { status: 'completed' }),
  });

  const upcomingSessions = upcomingData?.data ?? [];
  const pastSessions = pastData?.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Sessions</h1>
            <p className="text-muted-foreground">
              Manage your tutoring sessions and bookings
            </p>
          </div>
          <Button asChild className="bg-scholarly-600 hover:bg-scholarly-700">
            <Link href="/tutors">
              <Calendar className="mr-2 h-4 w-4" />
              Book a Session
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="h-4 w-4" />
              Upcoming
              {upcomingSessions.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {upcomingSessions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Past Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcomingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <SessionCardSkeleton key={i} />
                ))}
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} isUpcoming />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    Book a session with a tutor to get started
                  </p>
                  <Button asChild>
                    <Link href="/tutors">Find a Tutor</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-4">
            {pastLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <SessionCardSkeleton key={i} />
                ))}
              </div>
            ) : pastSessions.length > 0 ? (
              <div className="space-y-4">
                {pastSessions.map((session) => (
                  <SessionCard key={session.id} session={session} isUpcoming={false} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past sessions</h3>
                  <p className="text-muted-foreground">
                    Your completed sessions will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function SessionCard({ session, isUpcoming }: { session: Booking; isUpcoming: boolean }) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle className="h-4 w-4" />,
    pending: <AlertCircle className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Tutor Info */}
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarImage src={session.tutor?.user?.avatarUrl} />
              <AvatarFallback className="bg-scholarly-100 text-scholarly-700 text-lg">
                {session.tutor?.user?.displayName
                  ? getInitials(session.tutor.user.displayName)
                  : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{session.tutor?.user?.displayName || 'Tutor'}</h3>
              <p className="text-sm text-muted-foreground">{session.subjectName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColors[session.status] || 'bg-gray-100'}>
                  {statusIcons[session.status]}
                  <span className="ml-1 capitalize">{session.status}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {session.sessionType === '1to1' ? '1:1' : 'Group'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(session.scheduledStart)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(session.scheduledStart).toLocaleTimeString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' - '}
                {new Date(session.scheduledEnd).toLocaleTimeString('en-AU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {formatCurrency(session.pricing.total, session.pricing.currency)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isUpcoming && session.status === 'confirmed' && (
              <Button size="sm" className="bg-scholarly-600 hover:bg-scholarly-700">
                <Video className="mr-2 h-4 w-4" />
                Join
              </Button>
            )}
            {isUpcoming && session.status === 'pending' && (
              <Button size="sm" variant="outline">
                Confirm
              </Button>
            )}
            {!isUpcoming && (
              <Button size="sm" variant="outline">
                <Star className="mr-2 h-4 w-4" />
                Review
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
