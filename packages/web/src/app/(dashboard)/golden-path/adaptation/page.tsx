'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Activity,
  Gauge,
  Layers,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const stats = [
  { label: 'Avg Mastery', value: '72%', icon: Brain, color: 'violet' },
  { label: 'Active Competencies', value: '24', icon: Layers, color: 'blue' },
  { label: 'ZPD Width', value: '0.15', icon: Activity, color: 'emerald' },
  { label: 'Fatigue Level', value: 'Low', icon: Gauge, color: 'green' },
];

const competencies = [
  {
    id: 'comp-1',
    name: 'Algebraic Expressions',
    domain: 'Mathematics',
    pKnown: 0.85,
    observations: 42,
    lastUpdated: '2024-02-10',
  },
  {
    id: 'comp-2',
    name: 'Cell Biology',
    domain: 'Science',
    pKnown: 0.72,
    observations: 38,
    lastUpdated: '2024-02-09',
  },
  {
    id: 'comp-3',
    name: 'Essay Structure',
    domain: 'English',
    pKnown: 0.68,
    observations: 25,
    lastUpdated: '2024-02-08',
  },
  {
    id: 'comp-4',
    name: 'Chemical Bonding',
    domain: 'Science',
    pKnown: 0.55,
    observations: 30,
    lastUpdated: '2024-02-10',
  },
  {
    id: 'comp-5',
    name: 'Statistical Analysis',
    domain: 'Mathematics',
    pKnown: 0.78,
    observations: 35,
    lastUpdated: '2024-02-09',
  },
  {
    id: 'comp-6',
    name: 'Historical Analysis',
    domain: 'Humanities',
    pKnown: 0.62,
    observations: 22,
    lastUpdated: '2024-02-07',
  },
];

const zpdDomains = [
  {
    domain: 'Mathematics',
    lowerBound: 0.6,
    upperBound: 0.85,
    currentLevel: 0.75,
    optimalDifficulty: 0.78,
    color: 'violet',
  },
  {
    domain: 'Science',
    lowerBound: 0.5,
    upperBound: 0.78,
    currentLevel: 0.64,
    optimalDifficulty: 0.7,
    color: 'emerald',
  },
  {
    domain: 'English',
    lowerBound: 0.55,
    upperBound: 0.8,
    currentLevel: 0.68,
    optimalDifficulty: 0.73,
    color: 'blue',
  },
];

const fatigueFactors = [
  { name: 'Accuracy Decline', value: 15 },
  { name: 'Response Time', value: 22 },
  { name: 'Hint Usage', value: 35 },
  { name: 'Session Duration', value: 40 },
];

const masteryDistribution = [
  { range: '0-20%', count: 1 },
  { range: '20-40%', count: 2 },
  { range: '40-60%', count: 5 },
  { range: '60-80%', count: 10 },
  { range: '80-100%', count: 6 },
];

const domainBadgeColor: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'outline'> = {
  Mathematics: 'default',
  Science: 'secondary',
  English: 'info',
  Humanities: 'warning',
};

export default function AdaptationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/golden-path">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Adaptation Engine</h1>
            <p className="text-muted-foreground">
              BKT mastery tracking, ZPD analysis, and fatigue monitoring
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* BKT Mastery Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">BKT Mastery Tracking</CardTitle>
                <CardDescription>
                  Bayesian Knowledge Tracing probability of mastery per competency
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Brain className="mr-1 h-3 w-3" />
                6 Competencies
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {competencies.map((comp) => {
              const mastery = Math.round(comp.pKnown * 100);
              const variant = domainBadgeColor[comp.domain] || 'outline';
              return (
                <div key={comp.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comp.name}</span>
                      <Badge variant={variant} className="text-xs">
                        {comp.domain}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {comp.observations} observations
                      </span>
                      <span className="text-sm font-bold">{mastery}%</span>
                    </div>
                  </div>
                  <Progress
                    value={mastery}
                    className="h-2"
                    indicatorClassName={
                      mastery >= 80 ? 'bg-green-500' : mastery >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Mastery Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mastery Distribution</CardTitle>
            <CardDescription>
              Number of competencies by mastery range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masteryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="range"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fatigue Monitor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Fatigue Monitor</CardTitle>
                <CardDescription>
                  Cognitive load and fatigue indicators
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Low
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500/20">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">28</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Overall Fatigue Score</p>
                <p className="text-xs text-muted-foreground">
                  Learner is performing well. Consider introducing more challenging material.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Factor Breakdown</p>
              {fatigueFactors.map((factor) => (
                <div key={factor.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{factor.name}</span>
                    <span className="font-medium">{factor.value}%</span>
                  </div>
                  <Progress
                    value={factor.value}
                    className="h-1.5"
                    indicatorClassName={
                      factor.value <= 25 ? 'bg-green-500' : factor.value <= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ZPD Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Zone of Proximal Development</CardTitle>
              <CardDescription>
                Current level and optimal difficulty range per domain
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              Hover zones for details
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {zpdDomains.map((zpd) => {
              const currentPercent = Math.round(zpd.currentLevel * 100);
              const lowerPercent = Math.round(zpd.lowerBound * 100);
              const upperPercent = Math.round(zpd.upperBound * 100);
              const optimalPercent = Math.round(zpd.optimalDifficulty * 100);

              return (
                <Card key={zpd.domain} className="relative overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{zpd.domain}</h3>
                      <Badge variant="outline" className="text-xs">
                        Level {currentPercent}%
                      </Badge>
                    </div>

                    {/* Zone Visualization */}
                    <div className="relative h-8 w-full rounded-full bg-muted overflow-hidden">
                      {/* ZPD Zone */}
                      <div
                        className={`absolute h-full bg-${zpd.color}-500/20`}
                        style={{
                          left: `${lowerPercent}%`,
                          width: `${upperPercent - lowerPercent}%`,
                        }}
                      />
                      {/* Current Level Marker */}
                      <div
                        className={`absolute top-0 h-full w-1 bg-${zpd.color}-500`}
                        style={{ left: `${currentPercent}%` }}
                      />
                      {/* Optimal Difficulty Marker */}
                      <div
                        className="absolute top-0 h-full w-1 bg-amber-500"
                        style={{ left: `${optimalPercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">ZPD Range</p>
                        <p className="font-medium">{lowerPercent}% - {upperPercent}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Optimal Difficulty</p>
                        <p className="font-medium">{optimalPercent}%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full bg-${zpd.color}-500`} />
                        Current
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        Optimal
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full bg-${zpd.color}-500/20`} />
                        ZPD Zone
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
