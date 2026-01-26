'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  ArrowLeft,
  Play,
  Trophy,
  Clock,
  Shield,
  Sparkles,
  Heart,
  Layers,
  ArrowDownUp,
  Zap,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const stats = [
  { label: 'Best Score', value: '84', icon: Trophy, color: 'amber' },
  { label: 'Objectives', value: '7', icon: Target, color: 'violet' },
  { label: 'Active Paths', value: '2', icon: Layers, color: 'emerald' },
  { label: 'Est. Duration', value: '6 wks', icon: Clock, color: 'blue' },
];

const objectives = [
  { name: 'Mastery', weight: 25, score: 78, icon: Target, color: 'violet' },
  { name: 'Engagement', weight: 20, score: 85, icon: Sparkles, color: 'amber' },
  { name: 'Efficiency', weight: 15, score: 72, icon: Zap, color: 'blue' },
  { name: 'Curiosity', weight: 15, score: 88, icon: Sparkles, color: 'emerald' },
  { name: 'Well-being', weight: 10, score: 92, icon: Heart, color: 'pink' },
  { name: 'Breadth', weight: 8, score: 65, icon: Layers, color: 'orange' },
  { name: 'Depth', weight: 7, score: 80, icon: ArrowDownUp, color: 'indigo' },
];

const pathComparison = [
  {
    id: 'path-1',
    name: 'Balanced Growth Path',
    totalScore: 82,
    estimatedDuration: '6 weeks',
    scores: { Mastery: 78, Engagement: 85, Efficiency: 72, Curiosity: 88, 'Well-being': 92, Breadth: 65, Depth: 80 },
    steps: [
      { name: 'Algebraic Foundations Review', difficulty: 60, mastery: 85 },
      { name: 'Cell Biology Deep Dive', difficulty: 70, mastery: 72 },
      { name: 'Essay Writing Workshop', difficulty: 65, mastery: 68 },
      { name: 'Chemical Bonding Lab', difficulty: 75, mastery: 55 },
      { name: 'Statistical Methods Project', difficulty: 70, mastery: 78 },
    ],
  },
  {
    id: 'path-2',
    name: 'Curiosity-Driven Path',
    totalScore: 84,
    estimatedDuration: '8 weeks',
    scores: { Mastery: 70, Engagement: 92, Efficiency: 65, Curiosity: 95, 'Well-being': 88, Breadth: 82, Depth: 75 },
    steps: [
      { name: 'Space Physics Exploration', difficulty: 70, mastery: 45 },
      { name: 'Environmental Data Analysis', difficulty: 65, mastery: 60 },
      { name: 'Creative Narrative Project', difficulty: 55, mastery: 50 },
      { name: 'Robotics Prototyping', difficulty: 80, mastery: 40 },
      { name: 'Historical Research Paper', difficulty: 60, mastery: 35 },
    ],
  },
];

const simulationData = [
  { week: 'W1', balanced: 42, curiosity: 38, accelerated: 50 },
  { week: 'W2', balanced: 50, curiosity: 48, accelerated: 58 },
  { week: 'W3', balanced: 57, curiosity: 56, accelerated: 64 },
  { week: 'W4', balanced: 63, curiosity: 65, accelerated: 68 },
  { week: 'W5', balanced: 70, curiosity: 72, accelerated: 73 },
  { week: 'W6', balanced: 76, curiosity: 78, accelerated: 76 },
  { week: 'W7', balanced: 80, curiosity: 84, accelerated: 78 },
  { week: 'W8', balanced: 84, curiosity: 88, accelerated: 80 },
];

const constraints = [
  { label: 'Mandatory Curriculum', icon: Shield, active: true },
  { label: 'Max 90 min/day', icon: Clock, active: true },
  { label: 'Prerequisite Order', icon: ArrowDownUp, active: true },
  { label: 'Assessment Deadlines', icon: CheckCircle2, active: true },
  { label: 'Fatigue Limit', icon: AlertTriangle, active: false },
];

export default function OptimizerPage() {
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
            <h1 className="heading-2">Path Optimizer</h1>
            <p className="text-muted-foreground">
              Multi-objective optimization for your ideal learning path
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
        {/* Objective Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Objective Weights</CardTitle>
            <CardDescription>
              How each optimization objective is weighted in path selection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.map((obj) => {
              const Icon = obj.icon;
              return (
                <div key={obj.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 text-${obj.color}-500`} />
                      <span className="text-sm font-medium">{obj.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Score: {obj.score}
                      </Badge>
                      <span className="text-sm font-bold w-10 text-right">{obj.weight}%</span>
                    </div>
                  </div>
                  <Progress
                    value={obj.weight}
                    className="h-2"
                    indicatorClassName={`bg-${obj.color}-500`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Optimization Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended Path</CardTitle>
            <CardDescription>
              Highest scoring path based on current objective weights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Curiosity-Driven Path</h3>
                  <p className="text-sm text-muted-foreground">Optimized for engagement and curiosity</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">84</p>
                  <p className="text-xs text-muted-foreground">Total Score</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  8 weeks
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  5 modules
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Path Steps</p>
              {pathComparison[1].steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{step.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Difficulty: {step.difficulty}%</span>
                      <span>-</span>
                      <span>Current mastery: {step.mastery}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Constraints</p>
              <div className="flex flex-wrap gap-2">
                {constraints.map((constraint) => {
                  const CIcon = constraint.icon;
                  return (
                    <Badge
                      key={constraint.label}
                      variant={constraint.active ? 'secondary' : 'outline'}
                      className={`text-xs ${!constraint.active ? 'opacity-50' : ''}`}
                    >
                      <CIcon className="mr-1 h-3 w-3" />
                      {constraint.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Path Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Path Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of candidate learning paths
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium text-muted-foreground">Objective</th>
                  {pathComparison.map((path) => (
                    <th key={path.id} className="pb-3 text-center font-medium">
                      <div>{path.name}</div>
                      <div className="text-xs text-muted-foreground">{path.estimatedDuration}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objectives.map((obj) => (
                  <tr key={obj.name} className="border-b last:border-0">
                    <td className="py-3 font-medium">{obj.name}</td>
                    {pathComparison.map((path) => {
                      const score = path.scores[obj.name as keyof typeof path.scores];
                      const isHigher = pathComparison.every(
                        (p) => score >= (p.scores[obj.name as keyof typeof p.scores] || 0)
                      );
                      return (
                        <td key={path.id} className="py-3 text-center">
                          <span className={`font-medium ${isHigher ? 'text-emerald-600' : ''}`}>
                            {score}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="py-3">Total Score</td>
                  {pathComparison.map((path) => {
                    const isBest = pathComparison.every((p) => path.totalScore >= p.totalScore);
                    return (
                      <td key={path.id} className={`py-3 text-center ${isBest ? 'text-emerald-600' : ''}`}>
                        {path.totalScore}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Simulation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Mastery Trajectory Simulation</CardTitle>
              <CardDescription>
                Predicted mastery growth over time for each path strategy
              </CardDescription>
            </div>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Run Simulation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  className="text-xs"
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  className="text-xs"
                  domain={[30, 100]}
                  label={{
                    value: 'Mastery %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'hsl(var(--muted-foreground))',
                    style: { fontSize: '12px' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balanced"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Balanced Growth"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="curiosity"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Curiosity-Driven"
                  dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="accelerated"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Accelerated"
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
