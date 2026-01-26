'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Presentation,
  Clock,
  CheckCircle2,
  Star,
  Target,
  TrendingUp,
  FileText,
} from 'lucide-react';

const stats = [
  { label: 'Pending', value: '5', icon: Clock, color: 'orange' },
  { label: 'Graded Today', value: '3', icon: CheckCircle2, color: 'green' },
  { label: 'Average Score', value: '78%', icon: TrendingUp, color: 'blue' },
  { label: 'Total Graded', value: '47', icon: FileText, color: 'purple' },
];

const rubricCriteria = [
  { id: 'c1', name: 'Problem Definition', maxScore: 10, description: 'Clarity and depth of the problem statement' },
  { id: 'c2', name: 'Solution Design', maxScore: 10, description: 'Creativity and feasibility of the proposed solution' },
  { id: 'c3', name: 'Design Process', maxScore: 10, description: 'Evidence of iterative design thinking approach' },
  { id: 'c4', name: 'Presentation Quality', maxScore: 10, description: 'Structure, clarity, and engagement of the pitch' },
  { id: 'c5', name: 'Innovation', maxScore: 10, description: 'Originality and novelty of the approach' },
];

const pendingPitches = [
  {
    id: 'pitch-1',
    student: 'James Miller',
    title: 'Community Connect App',
    challenge: 'Individual Design Project',
    submittedAt: '2 hours ago',
    scores: { c1: 8, c2: 7, c3: null, c4: null, c5: null },
  },
  {
    id: 'pitch-2',
    student: 'Ava Davis',
    title: 'EcoTrack: Carbon Footprint Monitor',
    challenge: 'Individual Design Project',
    submittedAt: '5 hours ago',
    scores: { c1: null, c2: null, c3: null, c4: null, c5: null },
  },
  {
    id: 'pitch-3',
    student: 'Liam Johnson',
    title: 'Smart Study Planner',
    challenge: 'Sustainable Campus',
    submittedAt: '1 day ago',
    scores: { c1: 9, c2: 8, c3: 7, c4: null, c5: null },
  },
  {
    id: 'pitch-4',
    student: 'Sophie Walsh',
    title: 'Heritage Walk AR Guide',
    challenge: 'Cultural Innovation',
    submittedAt: '1 day ago',
    scores: { c1: null, c2: null, c3: null, c4: null, c5: null },
  },
  {
    id: 'pitch-5',
    student: 'Noah Henderson',
    title: 'WellnessHub Dashboard',
    challenge: 'Individual Design Project',
    submittedAt: '2 days ago',
    scores: { c1: 7, c2: 9, c3: 8, c4: 8, c5: 7 },
  },
];

export default function PitchEvaluationsPage() {
  const getTotal = (scores: Record<string, number | null>) => {
    const values = Object.values(scores).filter((v) => v !== null) as number[];
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0);
  };

  const getAllScored = (scores: Record<string, number | null>) => {
    return Object.values(scores).every((v) => v !== null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Pitch Evaluations</h1>
          <p className="text-muted-foreground">
            Evaluate student pitch presentations using the design rubric
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Pitches */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Evaluations</h2>
        {pendingPitches.map((pitch) => {
          const total = getTotal(pitch.scores);
          const allScored = getAllScored(pitch.scores);

          return (
            <Card key={pitch.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-500/10 p-2">
                      <Presentation className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{pitch.title}</CardTitle>
                      <CardDescription>
                        {pitch.student} &middot; {pitch.challenge}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {pitch.submittedAt}
                    </Badge>
                    {total !== null && (
                      <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{total}</span>
                        <span className="text-sm text-muted-foreground">/50</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rubric */}
                <div className="rounded-lg border">
                  <div className="border-b bg-muted/50 px-4 py-2">
                    <p className="text-sm font-medium">Evaluation Rubric</p>
                  </div>
                  <div className="divide-y">
                    {rubricCriteria.map((criterion) => {
                      const score = pitch.scores[criterion.id as keyof typeof pitch.scores];
                      return (
                        <div
                          key={criterion.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{criterion.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {criterion.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-16 items-center justify-center rounded-md border bg-background text-sm font-medium">
                              {score !== null ? (
                                <span className={score >= 8 ? 'text-green-600' : score >= 6 ? 'text-yellow-600' : 'text-red-600'}>
                                  {score}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">&mdash;</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              / {criterion.maxScore}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label htmlFor={`feedback-${pitch.id}`}>Feedback</Label>
                  <Textarea
                    id={`feedback-${pitch.id}`}
                    placeholder="Provide constructive feedback on the pitch presentation..."
                    className="min-h-[80px]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {allScored ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        All criteria scored
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {Object.values(pitch.scores).filter((v) => v !== null).length} of{' '}
                        {rubricCriteria.length} criteria scored
                      </span>
                    )}
                  </div>
                  <Button disabled={!allScored}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Evaluation
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
