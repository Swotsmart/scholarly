'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Library,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Search,
  ArrowRight,
  Globe,
  Lock,
  BarChart3,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { BookClub, BookClubSession } from '@/types/erudits';

export default function BookClubHubPage() {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const result = await eruditsApi.bookclub.list();
        setClubs(result);
      } catch {
        setClubs([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredClubs = searchQuery
    ? clubs.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : clubs;

  const joinedClubs = filteredClubs.filter(c => c.isActive);
  const discoverClubs = filteredClubs.filter(c => c.isPublic);

  // Collect upcoming sessions from all clubs (demo placeholder)
  const upcomingSessions: { club: BookClub; session: { title: string; scheduledAt: string; sessionType: string } }[] = clubs.slice(0, 2).flatMap((club) => [
    { club, session: { title: 'Chapter Discussion', scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(), sessionType: 'discussion' } },
  ]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/erudits"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Book Clubs</h1>
          <p className="text-muted-foreground mt-1">Join reading groups, discuss literature, and track your progress</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search book clubs..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingSessions.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.session.title}</p>
                          <p className="text-xs text-muted-foreground">{item.club.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{new Date(item.session.scheduledAt).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{item.session.sessionType}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Joined Clubs */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Clubs</h2>
            {joinedClubs.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {joinedClubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Library className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="font-medium">No clubs joined yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Browse available clubs below to get started</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Discover Clubs */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Discover Clubs</h2>
            {discoverClubs.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {discoverClubs.map((club) => (
                  <ClubCard key={club.id} club={club} showJoin />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No public clubs available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClubCard({ club, showJoin }: { club: BookClub; showJoin?: boolean }) {
  return (
    <Link href={`/erudits/bookclub/${club.id}`}>
      <Card className="group transition-shadow hover:shadow-md h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Library className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{club.name}</h3>
                <p className="text-xs text-muted-foreground">by {club.organiserName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {club.isPublic ? (
                <Badge variant="outline" className="text-xs"><Globe className="mr-1 h-3 w-3" />Public</Badge>
              ) : (
                <Badge variant="outline" className="text-xs"><Lock className="mr-1 h-3 w-3" />Private</Badge>
              )}
            </div>
          </div>

          {club.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{club.description}</p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {club.yearLevels.slice(0, 3).map((yl) => (
              <Badge key={yl} variant="secondary" className="text-xs">{yl}</Badge>
            ))}
            {club.subjectArea && <Badge variant="secondary" className="text-xs">{club.subjectArea}</Badge>}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completion</span>
              <span>{Math.round(club.completionRate * 100)}%</span>
            </div>
            <Progress value={club.completionRate * 100} className="h-1.5" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{club.memberCount} members</span>
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{club.readingCount} readings</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{club.sessionCount} sessions</span>
          </div>

          {club.meetingFrequency && (
            <p className="text-xs text-muted-foreground mt-2">
              {club.meetingFrequency.charAt(0).toUpperCase() + club.meetingFrequency.slice(1)} on {club.meetingDay}s at {club.meetingTime}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
