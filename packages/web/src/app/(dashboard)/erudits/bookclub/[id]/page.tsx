'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Library,
  Users,
  Calendar,
  Clock,
  BookOpen,
  MessageCircle,
  Sparkles,
  UserPlus,
  BarChart3,
  Globe,
  Lock,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import { toast } from '@/hooks/use-toast';
import type { BookClub, BookClubSession, BookClubReading, BookClubMember } from '@/types/erudits';

export default function BookClubDetailPage() {
  const params = useParams();
  const clubId = params.id as string;

  const [club, setClub] = useState<BookClub | null>(null);
  const [sessions, setSessions] = useState<BookClubSession[]>([]);
  const [readings, setReadings] = useState<BookClubReading[]>([]);
  const [members, setMembers] = useState<BookClubMember[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [c, s, r, m] = await Promise.allSettled([
          eruditsApi.bookclub.get(clubId),
          eruditsApi.bookclub.getSessions(clubId),
          eruditsApi.bookclub.getReadings(clubId),
          eruditsApi.bookclub.getMembers(clubId),
        ]);
        if (c.status === 'fulfilled') setClub(c.value);
        else setError('Book club not found');
        if (s.status === 'fulfilled') setSessions(s.value);
        if (r.status === 'fulfilled') setReadings(r.value);
        if (m.status === 'fulfilled') setMembers(m.value);
      } catch {
        setError('Failed to load book club');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [clubId]);

  async function loadAiQuestions(readingId: string) {
    setIsLoadingQuestions(true);
    try {
      const result = await eruditsApi.bookclub.generateQuestions(clubId, readingId);
      setAiQuestions(result.questions);
    } catch {
      setAiQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><Skeleton className="h-64 w-full" /></div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-400">{error || 'Book club not found'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/erudits/bookclub">Back to clubs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentReading = readings.find(r => !r.isComplete);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/erudits/bookclub"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{club.name}</h1>
              {club.isPublic ? (
                <Badge variant="outline"><Globe className="mr-1 h-3 w-3" />Public</Badge>
              ) : (
                <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Private</Badge>
              )}
              <Badge variant={club.isActive ? 'default' : 'secondary'}>
                {club.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Organised by {club.organiserName}</p>
          </div>
        </div>
        <Button onClick={async () => {
          try {
            await eruditsApi.bookclub.join(clubId);
            toast({ title: 'Joined!', description: 'You have joined the book club.' });
          } catch { toast({ title: 'Failed to join', variant: 'destructive' }); }
        }}>
          <UserPlus className="mr-2 h-4 w-4" />Join Club
        </Button>
      </div>

      {/* Club Description & Stats */}
      <Card>
        <CardContent className="p-5">
          {club.description && <p className="text-sm mb-4">{club.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{club.memberCount}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{club.readingCount}</p>
              <p className="text-xs text-muted-foreground">Readings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{club.sessionCount}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round(club.completionRate * 100)}%</p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </div>
          </div>
          {club.meetingFrequency && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meets {club.meetingFrequency} on {club.meetingDay}s at {club.meetingTime} ({club.timezone})
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="readings">
            <TabsList>
              <TabsTrigger value="readings">Readings ({readings.length})</TabsTrigger>
              <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
              <TabsTrigger value="ai">AI Questions</TabsTrigger>
            </TabsList>

            <TabsContent value="readings" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {readings.length > 0 ? (
                    <div className="space-y-4">
                      {readings.map((reading) => (
                        <div key={reading.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <p className="font-semibold">{reading.title}</p>
                                {reading.author && <p className="text-sm text-muted-foreground">by {reading.author}</p>}
                              </div>
                            </div>
                            {reading.isComplete ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="mr-1 h-3 w-3" />Complete
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Circle className="mr-1 h-3 w-3" />In Progress
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{Math.round(reading.completionRate * 100)}%</span>
                            </div>
                            <Progress value={reading.completionRate * 100} className="h-1.5" />
                          </div>

                          {reading.learningObjectives.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Learning Objectives</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {reading.learningObjectives.map((obj, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-primary mt-0.5">-</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {reading.startDate && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(reading.startDate).toLocaleDateString()} — {reading.endDate ? new Date(reading.endDate).toLocaleDateString() : 'Ongoing'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <BookOpen className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No readings assigned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {sessions.length > 0 ? (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-sm font-medium text-primary">
                              {session.sortOrder}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{session.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(session.scheduledAt).toLocaleDateString()}</span>
                                <Clock className="h-3 w-3" />
                                <span>{session.durationMinutes} min</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{session.sessionType.replace('_', ' ')}</Badge>
                            {session.isCompleted && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Done</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No sessions scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5" />
                    AI Discussion Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentReading ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate discussion questions for <span className="font-medium text-foreground">{currentReading.title}</span>
                      </p>
                      {aiQuestions.length === 0 ? (
                        <Button
                          onClick={() => loadAiQuestions(currentReading.id)}
                          disabled={isLoadingQuestions}
                        >
                          {isLoadingQuestions ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                          ) : (
                            <><Sparkles className="mr-2 h-4 w-4" />Generate Questions</>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          {aiQuestions.map((q, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                {i + 1}
                              </div>
                              <p className="text-sm">{q}</p>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => loadAiQuestions(currentReading.id)}>
                            <Sparkles className="mr-1 h-3 w-3" />Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No active reading to generate questions for
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Members Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {member.displayName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{member.sessionsAttended} sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
              )}
            </CardContent>
          </Card>

          {/* Reading Progress */}
          {readings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Reading Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {readings.map((reading) => (
                    <div key={reading.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate">{reading.title}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{Math.round(reading.completionRate * 100)}%</span>
                      </div>
                      <Progress value={reading.completionRate * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
