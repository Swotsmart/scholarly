'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';

// Mock ML insights data
const insights = [
  {
    id: '1',
    type: 'at-risk',
    title: '3 students showing signs of disengagement',
    description: 'Based on attendance patterns and assignment completion rates',
    students: ['Sophie Williams', 'James Chen', 'Emma Thompson'],
    confidence: 87,
    action: 'Review individual progress',
  },
  {
    id: '2',
    type: 'improvement',
    title: 'Class average improving in Algebra',
    description: 'Up 12% since implementing the new visual learning resources',
    confidence: 92,
    action: 'Continue current approach',
  },
  {
    id: '3',
    type: 'suggestion',
    title: 'Consider peer tutoring for Geometry',
    description: 'High performers could help struggling students based on learning patterns',
    confidence: 78,
    action: 'Set up peer groups',
  },
];

const predictions = [
  { student: 'Liam Davis', currentGrade: 'B+', predictedGrade: 'A-', trend: 'up' },
  { student: 'Ava Wilson', currentGrade: 'B', predictedGrade: 'B+', trend: 'up' },
  { student: 'Noah Garcia', currentGrade: 'C+', predictedGrade: 'C', trend: 'down' },
  { student: 'Oliver Brown', currentGrade: 'A', predictedGrade: 'A', trend: 'stable' },
];

const learningPatterns = [
  { pattern: 'Visual learners', percentage: 42, students: 12 },
  { pattern: 'Kinesthetic learners', percentage: 28, students: 8 },
  { pattern: 'Auditory learners', percentage: 18, students: 5 },
  { pattern: 'Reading/Writing', percentage: 12, students: 3 },
];

export default function TeacherMLPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ML Insights</h1>
          <p className="text-muted-foreground">
            AI-powered analytics and predictions for your classes
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ml">
            Advanced Analytics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Active Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-muted-foreground">Prediction Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">At-Risk Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-muted-foreground">Improvement Areas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI-Generated Insights
          </CardTitle>
          <CardDescription>Actionable recommendations based on student data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map(insight => (
            <div
              key={insight.id}
              className="flex items-start gap-4 rounded-lg border p-4"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                insight.type === 'at-risk'
                  ? 'bg-red-500/10'
                  : insight.type === 'improvement'
                    ? 'bg-green-500/10'
                    : 'bg-blue-500/10'
              }`}>
                {insight.type === 'at-risk' ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : insight.type === 'improvement' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{insight.title}</p>
                  <Badge variant="outline">{insight.confidence}% confidence</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                {insight.students && (
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {insight.students.join(', ')}
                    </p>
                  </div>
                )}
              </div>
              <Button size="sm">{insight.action}</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grade Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Grade Predictions
            </CardTitle>
            <CardDescription>Projected end-of-term grades based on current performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.map((pred, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium">{pred.student}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{pred.currentGrade}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge
                      variant={pred.trend === 'up' ? 'default' : pred.trend === 'down' ? 'destructive' : 'secondary'}
                    >
                      {pred.predictedGrade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Learning Patterns
            </CardTitle>
            <CardDescription>Class distribution by learning style</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningPatterns.map((pattern, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{pattern.pattern}</span>
                    <span className="text-muted-foreground">{pattern.students} students ({pattern.percentage}%)</span>
                  </div>
                  <Progress value={pattern.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Card */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">AI Teaching Assistant</p>
              <p className="text-sm text-muted-foreground">
                Get personalized lesson recommendations based on your class's learning patterns
              </p>
            </div>
            <Button>Get Recommendations</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
