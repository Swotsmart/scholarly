'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  Star,
  Target,
  TrendingUp,
  FileText,
  Layers,
} from 'lucide-react';

const stats = [
  { label: 'Pending', value: '3', icon: Clock, color: 'orange' },
  { label: 'Graded Today', value: '2', icon: CheckCircle2, color: 'green' },
  { label: 'Average Score', value: '82%', icon: TrendingUp, color: 'blue' },
  { label: 'Total Graded', value: '31', icon: FileText, color: 'purple' },
];

const rubricCriteria = [
  { id: 'c1', name: 'Curation Quality', maxScore: 10, description: 'Thoughtful selection and organisation of portfolio pieces' },
  { id: 'c2', name: 'Reflection Depth', maxScore: 10, description: 'Quality of reflective commentary on work and learning' },
  { id: 'c3', name: 'Growth Evidence', maxScore: 10, description: 'Demonstration of skill development and progression' },
  { id: 'c4', name: 'Presentation', maxScore: 10, description: 'Visual design, layout, and overall polish' },
];

const pendingPortfolios = [
  {
    id: 'portfolio-1',
    student: 'Emma Smith',
    title: 'Sustainable Campus Journey',
    itemCount: 12,
    submittedAt: '3 hours ago',
    scores: { c1: 9, c2: 8, c3: 8, c4: 9 },
  },
  {
    id: 'portfolio-2',
    student: 'Olivia Brown',
    title: 'Design Thinking Exploration',
    itemCount: 8,
    submittedAt: '1 day ago',
    scores: { c1: null, c2: null, c3: null, c4: null },
  },
  {
    id: 'portfolio-3',
    student: 'Charlotte Webb',
    title: 'Innovation & Impact Portfolio',
    itemCount: 15,
    submittedAt: '2 days ago',
    scores: { c1: 7, c2: null, c3: null, c4: null },
  },
];

export default function PortfolioReviewsPage() {
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
          <h1 className="heading-2">Portfolio Reviews</h1>
          <p className="text-muted-foreground">
            Review and assess student showcase portfolios
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

      {/* Pending Portfolios */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Reviews</h2>
        {pendingPortfolios.map((portfolio) => {
          const total = getTotal(portfolio.scores);
          const allScored = getAllScored(portfolio.scores);

          return (
            <Card key={portfolio.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{portfolio.title}</CardTitle>
                      <CardDescription>
                        {portfolio.student} &middot;{' '}
                        <Layers className="inline h-3 w-3" /> {portfolio.itemCount} items
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {portfolio.submittedAt}
                    </Badge>
                    {total !== null && (
                      <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{total}</span>
                        <span className="text-sm text-muted-foreground">/40</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rubric */}
                <div className="rounded-lg border">
                  <div className="border-b bg-muted/50 px-4 py-2">
                    <p className="text-sm font-medium">Portfolio Rubric</p>
                  </div>
                  <div className="divide-y">
                    {rubricCriteria.map((criterion) => {
                      const score = portfolio.scores[criterion.id as keyof typeof portfolio.scores];
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

                {/* Strengths & Areas for Improvement */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`strengths-${portfolio.id}`}>Strengths</Label>
                    <Textarea
                      id={`strengths-${portfolio.id}`}
                      placeholder="Highlight key strengths of the portfolio..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`improvements-${portfolio.id}`}>Areas for Improvement</Label>
                    <Textarea
                      id={`improvements-${portfolio.id}`}
                      placeholder="Suggest areas where the student can improve..."
                      className="min-h-[80px]"
                    />
                  </div>
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
                        {Object.values(portfolio.scores).filter((v) => v !== null).length} of{' '}
                        {rubricCriteria.length} criteria scored
                      </span>
                    )}
                  </div>
                  <Button disabled={!allScored}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Review
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
