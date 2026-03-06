'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGoldenPath } from '@/hooks/use-golden-path';
import { useAuthStore } from '@/stores/auth-store';
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
  Lock,
  HelpCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// HELPER: Mastery level descriptor
// =============================================================================

function getMasteryLabel(mastery: number): { label: string; color: string; advice: string } {
  if (mastery >= 90) return { label: 'Mastered', color: 'text-emerald-600', advice: 'Ready to advance or mentor others' };
  if (mastery >= 75) return { label: 'Proficient', color: 'text-blue-600', advice: 'Solid understanding — practice to master' };
  if (mastery >= 60) return { label: 'Developing', color: 'text-amber-600', advice: 'Building skills — focus here for growth' };
  if (mastery >= 40) return { label: 'Emerging', color: 'text-orange-600', advice: 'Early stages — consistent practice will help' };
  return { label: 'Beginning', color: 'text-red-600', advice: 'Start with foundational exercises' };
}

// =============================================================================
// DOMAIN COLOR MAP
// =============================================================================

const DOMAIN_COLORS: Record<string, string> = {
  Mathematics: 'bg-violet-500',
  Science: 'bg-emerald-500',
  English: 'bg-blue-500',
  Humanities: 'bg-amber-500',
  Technology: 'bg-indigo-500',
  Arts: 'bg-pink-500',
  'Core Skills': 'bg-cyan-500',
};

const breakSuggestions = [
  { id: 'br-1', type: 'micro', duration: '2 min', activity: 'Eye rest - look at distance', icon: Clock },
  { id: 'br-2', type: 'short', duration: '5 min', activity: 'Stretch break', icon: RefreshCw },
  { id: 'br-3', type: 'movement', duration: '10 min', activity: 'Walk around', icon: Zap },
];

// =============================================================================
// INLINE GUIDE COMPONENT
// =============================================================================

function Guide({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-2.5 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3', className)}>
      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default function GoldenPathPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const learnerId = user?.id || 'current';
  const { adaptation, curiosity, optimizer, isLoading: gpLoading, error: gpError, refresh } = useGoldenPath(learnerId);
  const [difficultyLevel, setDifficultyLevel] = useState('optimal');
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState(true);

  // Derive ZPD from API data
  const zpdRaw = adaptation?.zpd;
  const zpdRange = useMemo(() => {
    if (!zpdRaw) return { domain: 'Mathematics', lowerBound: 68, upperBound: 82, currentLevel: 72, optimalDifficulty: 75 };
    // API returns 0-1, convert to percentage
    const scale = zpdRaw.lowerBound <= 1 ? 100 : 1;
    return {
      domain: zpdRaw.domain,
      lowerBound: Math.round(zpdRaw.lowerBound * scale),
      upperBound: Math.round(zpdRaw.upperBound * scale),
      currentLevel: Math.round(zpdRaw.currentLevel * scale),
      optimalDifficulty: Math.round(zpdRaw.optimalDifficulty * scale),
    };
  }, [zpdRaw]);

  // Derive mastery domains from API competency states
  const masteryDomains = useMemo(() => {
    const states = adaptation?.profile?.competencyStates;
    if (!states || states.length === 0) return [];
    return states.map(s => ({
      id: s.id,
      name: s.name,
      mastery: Math.round(s.pKnown * 100),
      domain: s.domain,
      color: DOMAIN_COLORS[s.domain] || 'bg-slate-500',
    }));
  }, [adaptation?.profile?.competencyStates]);

  // Derive path nodes from optimizer result or competencies
  const pathNodes = useMemo(() => {
    const selectedPath = optimizer?.result?.selectedPath;
    if (selectedPath?.steps?.length) {
      return selectedPath.steps.map((step, i) => ({
        id: `step-${i}`,
        label: step.name,
        status: step.mastery >= 0.85 ? 'completed' : step.mastery > 0 ? (i === selectedPath.steps.findIndex(s => s.mastery < 0.85) ? 'current' : 'upcoming') : (i > 3 ? 'locked' : 'upcoming'),
        mastery: Math.round(step.mastery * 100),
      }));
    }
    // Fallback: build from competency states sorted by mastery
    const sorted = [...(adaptation?.profile?.competencyStates || [])].sort((a, b) => b.pKnown - a.pKnown);
    return sorted.slice(0, 6).map((s, i) => ({
      id: s.id,
      label: s.name,
      status: s.pKnown >= 0.85 ? 'completed' : (i === sorted.findIndex(x => x.pKnown < 0.85) ? 'current' : (s.pKnown > 0 ? 'upcoming' : 'locked')),
      mastery: Math.round(s.pKnown * 100),
    }));
  }, [optimizer?.result?.selectedPath, adaptation?.profile?.competencyStates]);

  // Derive recommendations from curiosity suggestions
  const recommendations = useMemo(() => {
    const suggestions = curiosity?.suggestions;
    if (suggestions && suggestions.length > 0) {
      return suggestions.map((s, i) => ({
        id: s.id,
        title: s.title,
        type: s.type === 'project' ? 'Challenge' : s.type === 'interactive' ? 'Practice' : 'Review',
        priority: i === 0 ? 'high' : (i <= 1 ? 'medium' : 'low'),
        reason: `Matched to your interests in ${s.matchedInterests.join(', ')}. Difficulty ${Math.round(s.difficulty * 100)}% — within your optimal learning zone.`,
        duration: s.estimatedDuration,
        impact: `Relevance: ${s.relevanceScore}%`,
        href: '/learning/courses',
      }));
    }
    // Fallback
    return [
      { id: 'rec-1', title: 'Practice current focus area', type: 'Practice', priority: 'high' as const, reason: 'Strengthen your current topic mastery with targeted exercises.', duration: '20 min', impact: '+8% mastery', href: '/learning/courses' },
      { id: 'rec-2', title: 'Review recent topics', type: 'Review', priority: 'medium' as const, reason: 'Spaced repetition prevents forgetting and reinforces learning.', duration: '15 min', impact: 'Prevent decay', href: '/learning/courses' },
    ];
  }, [curiosity?.suggestions]);

  const currentMastery = Math.round((adaptation?.profile?.overallMastery ?? (adaptation?.profile?.competencyStates?.[0]?.pKnown ?? 0.72)) * 100);
  const isInZPD = currentMastery >= zpdRange.lowerBound && currentMastery <= zpdRange.upperBound;
  const currentMasteryInfo = getMasteryLabel(currentMastery);

  // Pace analytics from optimizer weights or defaults
  const paceAnalytics = useMemo(() => {
    const weights = optimizer?.weights?.weights;
    if (weights && weights.length > 0) {
      const efficiency = weights.find(w => w.name === 'Efficiency');
      const engagement = weights.find(w => w.name === 'Engagement');
      return {
        currentPace: efficiency ? Math.round(efficiency.score / 8 * 10) / 10 : 12.5,
        averagePace: 10.2,
        weeklyProgress: engagement ? Math.round(engagement.score / 10) : 8.4,
        targetPace: 15.0,
        percentAboveAverage: efficiency ? Math.round((efficiency.score / 72 - 1) * 100) : 22.5,
      };
    }
    return { currentPace: 12.5, averagePace: 10.2, weeklyProgress: 8.4, targetPace: 15.0, percentAboveAverage: 22.5 };
  }, [optimizer?.weights?.weights]);

  // Session timer
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
  const domainsBySubject = useMemo(() => masteryDomains.reduce(
    (acc, domain) => {
      if (!acc[domain.domain]) acc[domain.domain] = [];
      acc[domain.domain].push(domain);
      return acc;
    },
    {} as Record<string, typeof masteryDomains>
  ), [masteryDomains]);

  // Compute strengths and growth areas
  const sortedDomains = useMemo(() => [...masteryDomains].sort((a, b) => b.mastery - a.mastery), [masteryDomains]);
  const topStrengths = sortedDomains.slice(0, 3);
  const growthAreas = sortedDomains.slice(-3).reverse();

  // Current focus topic
  const currentNode = pathNodes.find(n => n.status === 'current');
  const currentTopicName = currentNode?.label || 'your current topic';
  const topStrengthName = topStrengths[0]?.name || 'your strongest subject';

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
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              Personalized
            </Badge>
          </div>
        }
      />

      {/* Welcome Context Banner */}
      {showGuides && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-background">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                  <Compass className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Welcome to your Golden Path</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your Golden Path is a personalised learning journey that adapts to you in real time. Our AI analyses your strengths, identifies gaps, and sequences content in the order that helps you learn most effectively. Every recommendation, difficulty setting, and path adjustment is designed to keep you in your <strong>Zone of Proximal Development</strong> — the sweet spot where learning happens fastest.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span>Completed — you&apos;ve mastered this</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20" />
                      <span>Current focus — where you are now</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                      <span>Coming up next</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-3 w-3 rounded-full bg-muted" />
                      <span>Locked — complete prerequisites first</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setShowGuides(false)}>
                Hide guides
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary — What to focus on today */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 shrink-0">
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Your AI Learning Summary</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {topStrengths.length >= 2
                  ? <>You&apos;re making strong progress in <strong>{topStrengths[0].name}</strong> ({topStrengths[0].mastery}% mastery) and <strong>{topStrengths[1].name}</strong> ({topStrengths[1].mastery}%). </>
                  : <>You&apos;re building your learning profile. </>
                }
                {currentNode
                  ? <>Your current focus is <strong>{currentTopicName}</strong> at {currentNode.mastery}% — {isInZPD ? 'you\'re in your optimal learning zone, so the difficulty is just right' : 'the AI is adjusting difficulty to get you back into your optimal zone'}. </>
                  : <>The AI is mapping your learning path. </>
                }
                {recommendations.length > 0 && <>Today, I recommend starting with &ldquo;{recommendations[0].title}&rdquo; ({recommendations[0].duration}). </>}
                {paceAnalytics.percentAboveAverage > 0
                  ? <>Your pace is {paceAnalytics.percentAboveAverage}% above your personal average — great momentum!</>
                  : <>Keep going — consistency is key to building momentum.</>
                }
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => router.push('/learning/courses')}>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Start today&apos;s focus
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push('/ai-buddy')}>
                  <Brain className="h-3.5 w-3.5 mr-1.5" />
                  Ask Alice for help
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Break Reminder */}
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
                  You&apos;ve been studying for {Math.floor(sessionTime / 60)} minutes. Research shows short breaks improve retention by up to 20%.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {breakSuggestions.map((suggestion) => (
                <Button key={suggestion.id} variant="outline" size="sm">
                  {suggestion.duration} {suggestion.type}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setShowBreakReminder(false)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Path Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Learning Path</CardTitle>
              <CardDescription>
                Your current progression through {zpdRange.domain} — each step builds on the last
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
                title="Zone of Proximal Development — the difficulty range where you learn most effectively"
              >
                <Target className="mr-1 h-3 w-3" />
                ZPD: {zpdRange.lowerBound}%-{zpdRange.upperBound}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showGuides && (
            <Guide className="mb-4">
              <strong>Zone of Proximal Development (ZPD)</strong> is the range where content is challenging enough to promote growth but not so hard that it causes frustration. When the ZPD badge is green, the AI has calibrated your content difficulty perfectly. The percentage shows your current mastery window.
            </Guide>
          )}

          {/* Path nodes */}
          <div className="relative py-4">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <div className="relative flex justify-between">
              {pathNodes.map((node, index) => (
                <div key={node.id} className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all cursor-pointer',
                      node.status === 'completed' && 'border-emerald-500 bg-emerald-500 text-white',
                      node.status === 'current' && 'border-primary bg-primary text-white ring-4 ring-primary/20',
                      node.status === 'upcoming' && 'border-muted-foreground/30 bg-background hover:border-primary/50',
                      node.status === 'locked' && 'border-muted bg-muted text-muted-foreground'
                    )}
                    title={
                      node.status === 'completed' ? `${node.label}: Mastered at ${node.mastery}%` :
                      node.status === 'current' ? `${node.label}: Currently working on (${node.mastery}%)` :
                      node.status === 'upcoming' ? `${node.label}: Available after completing current topic` :
                      `${node.label}: Complete earlier topics to unlock`
                    }
                    onClick={() => {
                      if (node.status === 'current' || node.status === 'completed') {
                        router.push('/learning/courses');
                      }
                    }}
                  >
                    {node.status === 'completed' && <Trophy className="h-5 w-5" />}
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
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                    {node.status === 'locked' && <Lock className="h-3 w-3" />}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={cn('text-xs font-medium', node.status === 'current' && 'text-primary')}>
                      {node.label}
                    </p>
                    {node.mastery > 0 && (
                      <p className={cn('text-xs', getMasteryLabel(node.mastery).color)}>
                        {node.mastery}% — {getMasteryLabel(node.mastery).label}
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
                  <p className="font-medium">Current: {currentTopicName}</p>
                  <p className="text-sm text-muted-foreground">
                    Mastery: <span className={currentMasteryInfo.color}>{currentNode?.mastery ?? currentMastery}% ({getMasteryLabel(currentNode?.mastery ?? currentMastery).label})</span> | Optimal range: {zpdRange.lowerBound}%–{zpdRange.upperBound}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getMasteryLabel(currentNode?.mastery ?? currentMastery).advice}. Reach 80% to unlock the next topic.
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push('/learning/courses')}>
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
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {showGuides && (
                <Guide className="mb-4">
                  Each bar shows how well you&apos;ve mastered a topic. <strong>75%+</strong> means you&apos;re proficient and ready to advance. <strong>Below 60%</strong> means the topic needs more practice. The AI uses these scores to prioritise what to show you next — focusing on your growth areas while maintaining your strengths.
                </Guide>
              )}

              {/* Strengths & Growth callout */}
              <div className="grid gap-3 sm:grid-cols-2 mb-5">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">Your strengths</span>
                  </div>
                  <div className="space-y-1">
                    {topStrengths.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-xs">
                        <span>{d.name}</span>
                        <span className="font-medium text-emerald-600">{d.mastery}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600">Growth opportunities</span>
                  </div>
                  <div className="space-y-1">
                    {growthAreas.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-xs">
                        <span>{d.name}</span>
                        <span className="font-medium text-amber-600">{d.mastery}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Focusing 15 min/day on these could raise each by 10-15% this month.
                  </p>
                </div>
              </div>

              {masteryDomains.length === 0 && gpLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading your mastery data...</p>
                </div>
              )}
              {masteryDomains.length === 0 && !gpLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Start learning to build your mastery profile. The AI will track your progress across all domains.</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(domainsBySubject)
                  .filter(([subject]) => !selectedDomain || subject === selectedDomain)
                  .map(([subject, domains]) => (
                    <div key={subject} className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">{subject}</h4>
                      <div className="space-y-2">
                        {domains.map((domain) => {
                          const level = getMasteryLabel(domain.mastery);
                          return (
                            <div key={domain.id} className="space-y-1 group" title={`${domain.name}: ${level.label} — ${level.advice}`}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate">{domain.name}</span>
                                <span className={cn('font-medium', level.color)}>{domain.mastery}%</span>
                              </div>
                              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn('h-full rounded-full transition-all', domain.color)}
                                  style={{ width: `${domain.mastery}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty & Pace */}
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
              {difficultyLevel === 'optimal' ? (
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">AI is managing your difficulty</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Content is automatically calibrated to your ZPD — challenging enough to grow, not so hard it frustrates.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <div className="flex items-center gap-2 text-amber-600 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-medium">Manual override active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    You&apos;ve adjusted difficulty manually. The AI will still track your performance and suggest returning to optimal when ready.
                  </p>
                </div>
              )}
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
              {showGuides && (
                <Guide>
                  <strong>Pace</strong> measures your learning speed in mastery points per day. It&apos;s not about going fast — consistent, steady progress leads to the best long-term outcomes.
                </Guide>
              )}
              <div className="space-y-2">
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
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {paceAnalytics.percentAboveAverage}% above your average
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep this up! At your current pace, you&apos;ll reach Proficient level in Quadratic Functions within 3 days.
                </p>
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
                Personalized next steps — the AI explains why each activity matters
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={gpLoading}>
              <RefreshCw className={cn("mr-2 h-3 w-3", gpLoading && "animate-spin")} />
              {gpLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showGuides && (
            <Guide className="mb-4">
              These recommendations are ordered by impact. <strong>Priority</strong> items address the biggest gaps in your learning. Each card explains <em>why</em> the activity was chosen and what result you can expect — so you always know where your time is best spent.
            </Guide>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'group rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer',
                  rec.priority === 'high' && 'border-l-4 border-l-primary'
                )}
                onClick={() => router.push(rec.href)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rec.type === 'Practice' ? 'default' :
                          rec.type === 'Challenge' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {rec.type}
                      </Badge>
                      {rec.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">Priority</Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
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
                  See how the AI models your knowledge
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
                  Explore topics connected to your interests
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
                  Fine-tune your learning priorities
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
