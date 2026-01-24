'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Presentation,
  FolderOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react';

const pendingEvaluations = {
  pitches: [
    { id: 'p1', student: 'James Miller', title: 'Community Connect', challenge: 'Individual Project', submittedAt: '2 hours ago' },
    { id: 'p2', student: 'Ava Davis', title: 'EcoTrack App', challenge: 'Individual Project', submittedAt: '1 day ago' },
  ],
  portfolios: [
    { id: 'po1', student: 'Emma Smith', title: 'Sustainable Campus Journey', challenge: 'Sustainable Campus', submittedAt: '3 hours ago' },
  ],
};

const recentEvaluations = [
  { id: 'e1', student: 'Noah Williams', type: 'pitch', title: 'WellnessHub', score: 85, date: '2024-01-20' },
  { id: 'e2', student: 'Olivia Brown', type: 'portfolio', title: 'Design Journey', score: 78, date: '2024-01-19' },
  { id: 'e3', student: 'Liam Johnson', type: 'pitch', title: 'GreenCampus', score: 92, date: '2024-01-18' },
];

export default function TeacherGradingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Grading & Evaluation</h1>
          <p className="text-muted-foreground">
            Evaluate student pitch decks and showcase portfolios
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Presentation className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEvaluations.pitches.length}</p>
                <p className="text-sm text-muted-foreground">Pitches Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEvaluations.portfolios.length}</p>
                <p className="text-sm text-muted-foreground">Portfolios Pending</p>
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
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Completed This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" asChild>
          <Link href="/teacher/grading/pitches">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Pitch Evaluations</h3>
                <p className="text-sm text-muted-foreground">
                  Grade student pitch presentations using the 10/20/30 rubric
                </p>
              </div>
              <Badge>{pendingEvaluations.pitches.length} pending</Badge>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" asChild>
          <Link href="/teacher/grading/portfolios">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Portfolio Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  Review and assess student showcase portfolios
                </p>
              </div>
              <Badge>{pendingEvaluations.portfolios.length} pending</Badge>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Pending Pitches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Pending Pitch Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingEvaluations.pitches.map((pitch) => (
            <div
              key={pitch.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{pitch.title}</p>
                <p className="text-sm text-muted-foreground">
                  {pitch.student} • {pitch.challenge}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {pitch.submittedAt}
                </Badge>
                <Button size="sm" asChild>
                  <Link href={`/teacher/grading/pitches/${pitch.id}`}>
                    Evaluate
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  {evaluation.type === 'pitch' ? (
                    <Presentation className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{evaluation.title}</p>
                    <p className="text-sm text-muted-foreground">{evaluation.student}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{evaluation.score}%</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(evaluation.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
