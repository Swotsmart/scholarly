'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared';
import {
  Brain,
  Sparkles,
  Target,
  ArrowRight,
  TrendingUp,
  Compass,
  Zap,
  Play,
  Pause,
  Coffee,
  GaugeCircle,
  Clock,
  Trophy,
  BarChart3,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mastery domains (24+ competency domains)
const masteryDomains = [
  { id: 'md-1', name: 'Algebra', mastery: 85, domain: 'Mathematics', color: 'bg-violet-500' },
  { id: 'md-2', name: 'Geometry', mastery: 72, domain: 'Mathematics', color: 'bg-violet-500' },
  { id: 'md-3', name: 'Statistics', mastery: 68, domain: 'Mathematics', color: 'bg-violet-500' },
  { id: 'md-4', name: 'Calculus', mastery: 45, domain: 'Mathematics', color: 'bg-violet-500' },
  { id: 'md-5', name: 'Number Theory', mastery: 78, domain: 'Mathematics', color: 'bg-violet-500' },
  { id: 'md-6', name: 'Biology', mastery: 82, domain: 'Science', color: 'bg-emerald-500' },
  { id: 'md-7', name: 'Chemistry', mastery: 65, domain: 'Science', color: 'bg-emerald-500' },
  { id: 'md-8', name: 'Physics', mastery: 58, domain: 'Science', color: 'bg-emerald-500' },
  { id: 'md-9', name: 'Earth Science', mastery: 74, domain: 'Science', color: 'bg-emerald-500' },
  { id: 'md-10', name: 'Reading Comp.', mastery: 88, domain: 'English', color: 'bg-blue-500' },
  { id: 'md-11', name: 'Writing', mastery: 76, domain: 'English', color: 'bg-blue-500' },
  { id: 'md-12', name: 'Grammar', mastery: 82, domain: 'English', color: 'bg-blue-500' },
  { id: 'md-13', name: 'Literature', mastery: 70, domain: 'English', color: 'bg-blue-500' },
  { id: 'md-14', name: 'World History', mastery: 65, domain: 'Humanities', color: 'bg-amber-500' },
  { id: 'md-15', name: 'Geography', mastery: 72, domain: 'Humanities', color: 'bg-amber-500' },
  { id: 'md-16', name: 'Civics', mastery: 60, domain: 'Humanities', color: 'bg-amber-500' },
  { id: 'md-17', name: 'Economics', mastery: 55, domain: 'Humanities', color: 'bg-amber-500' },
  { id: 'md-18', name: 'Programming', mastery: 78, domain: 'Technology', color: 'bg-indigo-500' },
  { id: 'md-19', name: 'Digital Literacy', mastery: 92, domain: 'Technology', color: 'bg-indigo-500' },
  { id: 'md-20', name: 'Data Science', mastery: 48, domain: 'Technology', color: 'bg-indigo-500' },
  { id: 'md-21', name: 'Music Theory', mastery: 55, domain: 'Arts', color: 'bg-pink-500' },
  { id: 'md-22', name: 'Visual Arts', mastery: 68, domain: 'Arts', color: 'bg-pink-500' },
  { id: 'md-23', name: 'Drama', mastery: 62, domain: 'Arts', color: 'bg-pink-500' },
  { id: 'md-24', name: 'Critical Thinking', mastery: 80, domain: 'Core Skills', color: 'bg-cyan-500' },
];

// Path nodes for visualization
const pathNodes = [
  { id: 'node-1', label: 'Algebra Basics', status: 'completed', mastery: 95 },
  { id: 'node-2', label: 'Linear Equations', status: 'completed', mastery: 88 },
  { id: 'node-3', label: 'Quadratic Functions', status: 'current', mastery: 72 },
  { id: 'node-4', label: 'Polynomial Operations', status: 'upcoming', mastery: 0 },
  { id: 'node-5', label: 'Advanced Factoring', status: 'upcoming', mastery: 0 },
  { id: 'node-6', label: 'Complex Numbers', status: 'locked', mastery: 0 },
];

// AI recommendations
const recommendations = [
  {
    id: 'rec-1',
    title: 'Practice Quadratic Factoring',
    type: 'Practice',
    priority: 'high',
    reason: 'Strengthen current topic mastery',
    duration: '20 min',
    impact: '+8% mastery',
  },
  {
    id: 'rec-2',
    title: 'Review Linear Equation Word Problems',
    type: 'Review',
    priority: 'medium',
    reason: 'Retention boost needed',
    duration: '15 min',
    impact: 'Prevent decay',
  },
  {
    id: 'rec-3',
    title: 'Explore: Physics Applications of Algebra',
    type: 'Cross-curricular',
    priority: 'medium',
    reason: 'Deepen understanding through connection',
    duration: '25 min',
    impact: '+4% in both domains',
  },
  {
    id: 'rec-4',
    title: 'Challenge: Algebraic Proofs',
    type: 'Challenge',
    priority: 'low',
    reason: 'Ready for advanced content',
    duration: '30 min',
    impact: 'Unlock new pathways',
  },
];

// Break reminders
const breakSuggestions = [
  { id: 'br-1', type: 'micro', duration: '2 min', activity: 'Eye rest - look at distance', icon: Clock },
  { id: 'br-2', type: 'short', duration: '5 min', activity: 'Stretch break', icon: RefreshCw },
  { id: 'br-3', type: 'movement', duration: '10 min', activity: 'Walk around', icon: Zap },
];

export default function GoldenPathPage() {
  const [difficultyLevel, setDifficultyLevel] = useState('optimal');
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // ZPD indicator calculation
  const zpdRange = { lower: 68, upper: 82 };
  const currentMastery = 72;
  const isInZPD = currentMastery >= zpdRange.lower && currentMastery <= zpdRange.upper;

  // Personal pace analytics
  const paceAnalytics = {
    currentPace: 12.5,
    averagePace: 10.2,
    weeklyProgress: 8.4,
    targetPace: 15.0,
    percentAboveAverage: 22.5,
  };

  // Session timer with break reminders
  const checkBreakTime = useCallback(() => {
    if (sessionTime > 0 && sessionTime % 1800 === 0) {
      setShowBreakReminder(true);
    }
  }, [sessionTime]);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  useEffect(() => {
    checkBreakTime();
  }, [sessionTime, checkBreakTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Group domains by subject
  const domainsBySubject = masteryDomains.reduce(
    (acc, domain) => {
      if (!acc[domain.domain]) {
        acc[domain.domain] = [];
      }
      acc[domain.domain].push(domain);
      return acc;
    },
    {} as Record<string, typeof masteryDomains>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Golden Path"
        description="Your adaptive learning journey powered by AI"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{formatTime(sessionTime)}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              Personalized
            </Badge>
          </div>
        }
      />

      {/* Break Reminder Modal */}
      {showBreakReminder && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Coffee className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Time for a break!</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve been studying for {Math.floor(sessionTime / 60)} minutes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {breakSuggestions.map((suggestion) => (
                <Button key={suggestion.id} variant="outline" size="sm">
                  {suggestion.duration} {suggestion.type}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBreakReminder(false)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Path Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Learning Path</CardTitle>
              <CardDescription>
                Your current progression through Algebra
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  isInZPD
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                )}
              >
                <Target className="mr-1 h-3 w-3" />
                ZPD: {zpdRange.lower}%-{zpdRange.upper}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Animated Path */}
          <div className="relative py-4">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <div className="relative flex justify-between">
              {pathNodes.map((node, index) => (
                <div
                  key={node.id}
                  className="relative flex flex-col items-center"
                >
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                      node.status === 'completed' &&
                        'border-emerald-500 bg-emerald-500 text-white',
                      node.status === 'current' &&
                        'border-primary bg-primary text-white ring-4 ring-primary/20',
                      node.status === 'upcoming' &&
                        'border-muted-foreground/30 bg-background',
                      node.status === 'locked' &&
                        'border-muted bg-muted text-muted-foreground'
                    )}
                  >
                    {node.status === 'completed' && (
                      <Trophy className="h-5 w-5" />
                    )}
                    {node.status === 'current' && (
                      <div className="relative">
                        <Brain className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                        </span>
                      </div>
                    )}
                    {node.status === 'upcoming' && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                    {node.status === 'locked' && (
                      <span className="text-xs">🔒</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        node.status === 'current' && 'text-primary'
                      )}
                    >
                      {node.label}
                    </p>
                    {node.mastery > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {node.mastery}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Position Details */}
          <div className="mt-6 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Current: Quadratic Functions</p>
                  <p className="text-sm text-muted-foreground">
                    Mastery: {currentMastery}% | Optimal range: {zpdRange.lower}%-{zpdRange.upper}%
                  </p>
                </div>
              </div>
              <Button>
                Continue Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mastery Rings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Mastery Rings</CardTitle>
                  <CardDescription>
                    Progress across {masteryDomains.length} competency domains
                  </CardDescription>
                </div>
                <Select value={selectedDomain || 'all'} onValueChange={(v) => setSelectedDomain(v === 'all' ? null : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All domains</SelectItem>
                    {Object.keys(domainsBySubject).map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(domainsBySubject)
                  .filter(([subject]) => !selectedDomain || subject === selectedDomain)
                  .map(([subject, domains]) => (
                    <div key={subject} className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        {subject}
                      </h4>
                      <div className="space-y-2">
                        {domains.map((domain) => (
                          <div key={domain.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="truncate">{domain.name}</span>
                              <span className="font-medium">{domain.mastery}%</span>
                            </div>
                            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  domain.color
                                )}
                                style={{ width: `${domain.mastery}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty Slider & Pace Analytics */}
        <div className="space-y-6">
          {/* Difficulty Override */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4" />
                Difficulty Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easier">Easier (-20%)</SelectItem>
                  <SelectItem value="slightly-easier">Slightly Easier (-10%)</SelectItem>
                  <SelectItem value="optimal">Optimal (AI-selected)</SelectItem>
                  <SelectItem value="slightly-harder">Slightly Harder (+10%)</SelectItem>
                  <SelectItem value="challenging">Challenging (+20%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {difficultyLevel === 'optimal'
                  ? 'AI automatically adjusts difficulty to your Zone of Proximal Development'
                  : 'Manual override active - content difficulty adjusted'}
              </p>
            </CardContent>
          </Card>

          {/* Pace Analytics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GaugeCircle className="h-4 w-4" />
                Pace Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current pace</span>
                <span className="font-semibold">{paceAnalytics.currentPace} pts/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your average</span>
                <span className="text-sm">{paceAnalytics.averagePace} pts/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weekly progress</span>
                <span className="text-sm">{paceAnalytics.weeklyProgress}%</span>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {paceAnalytics.percentAboveAverage}% above your average
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                AI Recommendations
              </CardTitle>
              <CardDescription>
                Personalized next steps based on your learning profile
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'group rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm',
                  rec.priority === 'high' && 'border-l-4 border-l-primary'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rec.type === 'Practice'
                            ? 'default'
                            : rec.type === 'Challenge'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {rec.type}
                      </Badge>
                      {rec.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          Priority
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rec.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {rec.impact}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card hover className="cursor-pointer">
          <Link href="/golden-path/adaptation">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-violet-500/10 p-3">
                <Brain className="h-6 w-6 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Adaptation Engine</p>
                <p className="text-sm text-muted-foreground">
                  View BKT & cognitive models
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card hover className="cursor-pointer">
          <Link href="/golden-path/curiosity">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Curiosity Map</p>
                <p className="text-sm text-muted-foreground">
                  Explore interest clusters
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card hover className="cursor-pointer">
          <Link href="/golden-path/optimizer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <Compass className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Path Optimizer</p>
                <p className="text-sm text-muted-foreground">
                  Multi-objective optimization
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
