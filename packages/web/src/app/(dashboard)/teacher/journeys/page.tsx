'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Users,
  Eye,
  MessageSquare,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const journeys = [
  {
    id: 'j1',
    student: 'Emma Smith',
    challenge: 'Sustainable Campus',
    class: 'Year 10 Design & Tech',
    phase: 'prototype',
    progress: 62,
    lastActivity: '2 hours ago',
    pendingReview: true,
    artifactCount: 8,
  },
  {
    id: 'j2',
    student: 'Liam Johnson',
    challenge: 'Sustainable Campus',
    class: 'Year 10 Design & Tech',
    phase: 'ideate',
    progress: 45,
    lastActivity: '1 day ago',
    pendingReview: false,
    artifactCount: 5,
  },
  {
    id: 'j3',
    student: 'Olivia Brown',
    challenge: 'Student Wellness',
    class: 'Year 11 Innovation',
    phase: 'empathize',
    progress: 20,
    lastActivity: '3 days ago',
    pendingReview: false,
    artifactCount: 2,
  },
  {
    id: 'j4',
    student: 'Noah Williams',
    challenge: 'Student Wellness',
    class: 'Year 11 Innovation',
    phase: 'define',
    progress: 35,
    lastActivity: '1 day ago',
    pendingReview: true,
    artifactCount: 4,
  },
  {
    id: 'j5',
    student: 'Ava Davis',
    challenge: 'Individual Project',
    class: 'Year 12 Project',
    phase: 'iterate',
    progress: 78,
    lastActivity: '5 hours ago',
    pendingReview: false,
    artifactCount: 12,
  },
  {
    id: 'j6',
    student: 'James Miller',
    challenge: 'Individual Project',
    class: 'Year 12 Project',
    phase: 'pitch',
    progress: 92,
    lastActivity: 'Just now',
    pendingReview: true,
    artifactCount: 15,
  },
];

const phases = ['all', 'empathize', 'define', 'ideate', 'prototype', 'iterate', 'pitch'];

export default function TeacherJourneysPage() {
  const [search, setSearch] = useState('');
  const [activePhase, setActivePhase] = useState('all');

  const filteredJourneys = journeys.filter((j) => {
    const matchesSearch = j.student.toLowerCase().includes(search.toLowerCase()) ||
      j.challenge.toLowerCase().includes(search.toLowerCase());
    const matchesPhase = activePhase === 'all' || j.phase === activePhase;
    return matchesSearch && matchesPhase;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Student Journeys</h1>
          <p className="text-muted-foreground">
            Monitor and support student progress through design challenges
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or challenge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activePhase} onValueChange={setActivePhase}>
          <TabsList>
            {phases.map((phase) => (
              <TabsTrigger key={phase} value={phase} className="capitalize">
                {phase}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Journey Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredJourneys.map((journey) => (
          <Card key={journey.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{journey.student}</p>
                    <p className="text-sm text-muted-foreground">{journey.class}</p>
                  </div>
                </div>
                {journey.pendingReview && (
                  <Badge variant="destructive">Review Pending</Badge>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{journey.challenge}</span>
                  <Badge variant="outline" className="capitalize">{journey.phase}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Progress value={journey.progress} className="flex-1" />
                  <span className="text-sm font-medium">{journey.progress}%</span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {journey.lastActivity}
                    </span>
                    <span>{journey.artifactCount} artifacts</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" asChild className="flex-1">
                  <Link href={`/teacher/journeys/${journey.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="flex-1">
                  <Link href={`/teacher/journeys/${journey.id}/feedback`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Feedback
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJourneys.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No journeys found</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      )}
    </div>
  );
}
