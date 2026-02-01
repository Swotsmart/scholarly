'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Sparkles,
  BarChart3,
  Star,
  BookOpen,
  GraduationCap,
  Languages,
  Users,
  Brain,
  Shield,
  Lightbulb,
  Calendar,
  Target,
  MessageSquare,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Heart,
  Volume2,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Demo slides with embedded UI previews
const demoSlides = [
  {
    id: 'student-dashboard',
    title: 'Student Dashboard',
    category: 'Dashboards',
    description: 'Personalized learning hub with gamification, progress tracking, and AI recommendations',
    href: '/dashboard',
    highlights: ['XP & Level System', 'Daily Streaks', 'AI Recommendations', 'Progress Rings'],
    component: StudentDashboardPreview,
  },
  {
    id: 'golden-path',
    title: 'Golden Path - Adaptive Learning',
    category: 'AI Learning',
    description: 'Bayesian Knowledge Tracing with Zone of Proximal Development optimization',
    href: '/golden-path',
    highlights: ['Mastery Visualization', 'ZPD Indicator', 'AI Recommendations', 'Difficulty Adjustment'],
    component: GoldenPathPreview,
  },
  {
    id: 'analytics-dashboard',
    title: 'Analytics Dashboard',
    category: 'Analytics',
    description: 'Comprehensive learning analytics with drill-down capabilities',
    href: '/analytics',
    highlights: ['Real-time Metrics', 'Trend Analysis', 'Cohort Comparison', 'Export Options'],
    component: AnalyticsDashboardPreview,
  },
  {
    id: 'ml-pipeline',
    title: 'ML Pipeline - Predictions',
    category: 'Analytics',
    description: 'Machine learning models for student risk prediction and engagement forecasting',
    href: '/ml',
    highlights: ['Risk Prediction', 'Engagement Scoring', 'Model Performance', 'Intervention Alerts'],
    component: MLPipelinePreview,
  },
  {
    id: 'early-years-home',
    title: 'Little Explorers - Home',
    category: 'Early Years',
    description: 'Playful, character-driven learning for ages 3-7 with picture-based navigation',
    href: '/early-years',
    highlights: ['Mentor Characters', 'Learning Worlds', 'Parent PIN Access', 'Audio Instructions'],
    component: EarlyYearsHomePreview,
  },
  {
    id: 'early-years-phonics',
    title: 'Little Explorers - Phonics',
    category: 'Early Years',
    description: 'Systematic Synthetic Phonics with 6-phase structure and collectible badges',
    href: '/early-years/phonics',
    highlights: ['6-Phase SSP', 'Sound Matching', 'Letter Badges', 'Progress Tracking'],
    component: PhonicsEnginePreview,
  },
  {
    id: 'explorer-points',
    title: 'Explorer Points',
    category: 'Early Years',
    description: 'ClassDojo-style behavior recognition with celebrations and parent notifications',
    href: '/early-years/points',
    highlights: ['One-tap Awards', 'Class Celebrations', 'Parent Alerts', 'Milestone Rewards'],
    component: ExplorerPointsPreview,
  },
  {
    id: 'linguaflow',
    title: 'LinguaFlow - Language Learning',
    category: 'Languages',
    description: '30+ languages with CEFR progression, spaced repetition, and AI conversation',
    href: '/linguaflow',
    highlights: ['CEFR Levels', 'Vocabulary SM-2', 'AI Partners', 'Virtual Immersion'],
    component: LinguaFlowPreview,
  },
  {
    id: 'teacher-dashboard',
    title: 'Teacher Dashboard',
    category: 'Teacher Tools',
    description: 'AI-powered insights with at-risk student alerts and quick actions',
    href: '/teacher/dashboard',
    highlights: ['At-Risk Alerts', 'AI Insights', 'Quick Actions', 'Class Overview'],
    component: TeacherDashboardPreview,
  },
  {
    id: 'ai-studio',
    title: 'AI Content Studio',
    category: 'Teacher Tools',
    description: 'Generate lesson plans, assessments, and resources in seconds',
    href: '/ai-studio',
    highlights: ['Lesson Generator', 'Differentiation', 'Curriculum Aligned', '<30s Generation'],
    component: AIStudioPreview,
  },
  {
    id: 'compliance',
    title: 'Compliance Dashboard',
    category: 'Admin',
    description: 'Track compliance across ACARA, AITSL, EYLF, and other frameworks',
    href: '/standards',
    highlights: ['Traffic Light Status', 'Gap Analysis', 'Audit Reports', 'Remediation'],
    component: CompliancePreview,
  },
  {
    id: 'data-lake',
    title: 'Data Lake Explorer',
    category: 'Analytics',
    description: 'Enterprise ETL pipelines with data cataloging and quality monitoring',
    href: '/data-lake',
    highlights: ['Visual ETL', 'Data Catalog', 'Quality Scores', 'Multi-source'],
    component: DataLakePreview,
  },
];

// Preview Components
function StudentDashboardPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Hero */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary">
            <AvatarFallback className="bg-primary text-white">SJ</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">Good morning, Sarah! 👋</div>
            <div className="text-sm text-muted-foreground">Ready to continue your learning journey?</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="font-bold text-orange-600">12 day streak!</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'XP', value: '2,450', icon: Star, color: 'amber', change: '+120' },
          { label: 'Level', value: '15', icon: Award, color: 'purple', change: null },
          { label: 'Courses', value: '4', icon: BookOpen, color: 'blue', change: null },
          { label: 'Badges', value: '23', icon: Award, color: 'emerald', change: '+2' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg bg-${stat.color}-500/10 p-2`}>
                <stat.icon className={`h-4 w-4 text-${stat.color}-500`} />
              </div>
              <div>
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
            {stat.change && (
              <div className="mt-1 text-xs text-emerald-600">{stat.change} today</div>
            )}
          </div>
        ))}
      </div>

      {/* Continue Learning */}
      <div>
        <div className="mb-2 font-semibold">Continue Learning</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Algebra Fundamentals', subject: 'Mathematics', progress: 65 },
            { title: 'Climate Science', subject: 'Science', progress: 42 },
          ].map((course) => (
            <div key={course.title} className="rounded-lg border bg-card p-3">
              <Badge variant="secondary" className="mb-2">{course.subject}</Badge>
              <div className="font-medium">{course.title}</div>
              <Progress value={course.progress} className="mt-2 h-2" />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{course.progress}% complete</span>
                <span>Resume →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Buddy */}
      <div className="fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg">
        <MessageSquare className="h-6 w-6 text-white" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">3</span>
      </div>
    </div>
  );
}

function GoldenPathPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Path Visualization */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Your Learning Path</div>
          <Badge className="bg-emerald-500">ZPD: 72-85%</Badge>
        </div>
        <div className="flex items-center justify-between">
          {['Basics', 'Core', 'Advanced', 'Expert', 'Master'].map((level, i) => (
            <div key={level} className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                i < 2 ? 'bg-emerald-500 text-white' : i === 2 ? 'animate-pulse bg-blue-500 text-white ring-4 ring-blue-200' : 'bg-gray-200'
              }`}>
                {i < 2 ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </div>
              <span className="mt-1 text-xs">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mastery Rings */}
      <div>
        <div className="mb-2 font-semibold">Competency Mastery</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { domain: 'Algebra', mastery: 78, color: 'blue' },
            { domain: 'Geometry', mastery: 65, color: 'emerald' },
            { domain: 'Statistics', mastery: 42, color: 'amber' },
            { domain: 'Calculus', mastery: 15, color: 'purple' },
          ].map((item) => (
            <div key={item.domain} className="text-center">
              <div className="relative mx-auto h-16 w-16">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke={item.color === 'blue' ? '#3b82f6' : item.color === 'emerald' ? '#10b981' : item.color === 'amber' ? '#f59e0b' : '#8b5cf6'}
                    strokeWidth="3"
                    strokeDasharray={`${item.mastery} 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {item.mastery}%
                </span>
              </div>
              <div className="mt-1 text-xs">{item.domain}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <div className="mb-2 font-semibold">AI Recommendations</div>
        <div className="space-y-2">
          {[
            { title: 'Practice quadratic equations', impact: 'High', time: '15 min' },
            { title: 'Review triangle properties', impact: 'Medium', time: '10 min' },
          ].map((rec, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm">{rec.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rec.impact === 'High' ? 'default' : 'secondary'}>{rec.impact}</Badge>
                <span className="text-xs text-muted-foreground">{rec.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsDashboardPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: '2,847', change: '+12%', icon: Users },
          { label: 'Avg. Engagement', value: '78%', change: '+5%', icon: TrendingUp },
          { label: 'Course Completion', value: '64%', change: '+8%', icon: CheckCircle2 },
          { label: 'At-Risk Students', value: '23', change: '-15%', icon: AlertTriangle },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <kpi.icon className="h-5 w-5 text-muted-foreground" />
              <span className={`text-xs ${kpi.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpi.change}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Engagement Trends</div>
          <div className="flex gap-2">
            {['7D', '30D', '90D'].map((period) => (
              <Button key={period} variant={period === '30D' ? 'default' : 'ghost'} size="sm">
                {period}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex h-32 items-end gap-1">
          {[65, 72, 68, 75, 82, 78, 85, 80, 88, 84, 90, 86].map((value, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400" style={{ height: `${value}%` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Week 1</span>
          <span>Week 12</span>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Subject Performance</div>
        <div className="space-y-3">
          {[
            { subject: 'Mathematics', avg: 78, color: 'blue' },
            { subject: 'Science', avg: 72, color: 'emerald' },
            { subject: 'English', avg: 85, color: 'purple' },
            { subject: 'Design', avg: 68, color: 'amber' },
          ].map((item) => (
            <div key={item.subject}>
              <div className="flex justify-between text-sm">
                <span>{item.subject}</span>
                <span className="font-medium">{item.avg}%</span>
              </div>
              <Progress value={item.avg} className="mt-1 h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MLPipelinePreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Model Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Models', value: '6', status: 'healthy' },
          { label: 'Predictions Today', value: '12.4K', status: 'healthy' },
          { label: 'Model Accuracy', value: '94.2%', status: 'healthy' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">{stat.status}</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Risk Predictions */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Student Risk Predictions</div>
        <div className="space-y-3">
          {[
            { name: 'James W.', risk: 'High', score: 0.85, factors: ['Declining attendance', 'Low engagement'] },
            { name: 'Emma T.', risk: 'Medium', score: 0.62, factors: ['Missing assignments'] },
            { name: 'Liam K.', risk: 'Medium', score: 0.58, factors: ['Grade decline'] },
          ].map((student) => (
            <div key={student.name} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{student.name}</div>
                  <div className="text-xs text-muted-foreground">{student.factors.join(', ')}</div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={student.risk === 'High' ? 'destructive' : 'secondary'}>{student.risk}</Badge>
                <div className="mt-1 text-xs text-muted-foreground">{(student.score * 100).toFixed(0)}% confidence</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Performance */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Model Performance</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { model: 'Risk Predictor', accuracy: 94.2, status: 'Deployed' },
            { model: 'Engagement Model', accuracy: 91.8, status: 'Deployed' },
            { model: 'Performance Forecast', accuracy: 88.5, status: 'Training' },
            { model: 'Dropout Prediction', accuracy: 96.1, status: 'Deployed' },
          ].map((model) => (
            <div key={model.model} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{model.model}</div>
                <div className="text-xs text-muted-foreground">{model.accuracy}% accuracy</div>
              </div>
              <Badge variant={model.status === 'Deployed' ? 'default' : 'secondary'}>{model.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EarlyYearsHomePreview() {
  return (
    <div className="relative min-h-[400px] overflow-hidden rounded-xl bg-gradient-to-b from-sky-300 via-sky-200 to-green-200 p-4">
      {/* Decorations */}
      <div className="absolute right-4 top-4 text-4xl">☀️</div>
      <div className="absolute left-10 top-8 text-2xl">🦋</div>
      <div className="absolute bottom-20 right-8 text-2xl">🌈</div>

      {/* Welcome */}
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl font-bold text-purple-800">Welcome, Explorer! 🎉</div>
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5].map((i) => (
            <Star key={i} className={`h-6 w-6 ${i <= 3 ? 'fill-yellow-400 text-yellow-400' : 'text-yellow-200'}`} />
          ))}
        </div>
        <div className="mt-1 text-sm text-purple-700">3 stars collected today!</div>
      </div>

      {/* Learning Worlds */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'Phonics Forest', emoji: '🌲', color: 'from-green-400 to-emerald-500', stars: 12 },
          { name: 'Number Land', emoji: '🔢', color: 'from-blue-400 to-blue-500', stars: 8 },
          { name: 'Story Garden', emoji: '📖', color: 'from-purple-400 to-purple-500', stars: 5 },
          { name: 'Creative Cove', emoji: '🎨', color: 'from-pink-400 to-pink-500', stars: 3 },
        ].map((world) => (
          <button
            key={world.name}
            className={`rounded-2xl bg-gradient-to-br ${world.color} p-4 text-white shadow-lg transition-transform hover:scale-105`}
          >
            <div className="text-4xl">{world.emoji}</div>
            <div className="mt-2 font-bold">{world.name}</div>
            <div className="flex items-center justify-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              {world.stars}
            </div>
          </button>
        ))}
      </div>

      {/* Mentor */}
      <div className="absolute bottom-4 left-4 flex items-end gap-2">
        <div className="text-5xl">🦉</div>
        <div className="rounded-xl bg-white/90 p-2 text-sm shadow">
          <div className="font-bold text-purple-800">Ollie says:</div>
          <div className="text-gray-700">&quot;Let&apos;s learn together!&quot;</div>
        </div>
      </div>

      {/* Audio Button */}
      <button className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
        <Volume2 className="h-6 w-6 text-purple-600" />
      </button>
    </div>
  );
}

function PhonicsEnginePreview() {
  return (
    <div className="space-y-4 rounded-xl bg-gradient-to-b from-green-100 to-emerald-50 p-4">
      {/* Phase Progress */}
      <div className="rounded-xl bg-white/80 p-4">
        <div className="mb-2 font-bold text-green-800">Phonics Journey</div>
        <div className="flex items-center gap-2">
          {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6'].map((phase, i) => (
            <div key={phase} className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i < 2 ? 'bg-green-500 text-white' : i === 2 ? 'bg-yellow-400' : 'bg-gray-200'
              }`}>
                {i < 2 ? '✓' : i + 1}
              </div>
              <span className="mt-1 text-xs">{phase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Sound */}
      <div className="rounded-xl bg-white/80 p-6 text-center">
        <div className="mb-4 text-6xl font-bold text-green-700">ch</div>
        <div className="mb-2 text-lg text-green-600">as in &quot;chip&quot; 🍪</div>
        <button className="rounded-full bg-green-500 px-6 py-3 text-white shadow-lg">
          <Volume2 className="mr-2 inline h-5 w-5" />
          Hear the sound
        </button>
      </div>

      {/* Letter Badges */}
      <div>
        <div className="mb-2 font-bold text-green-800">Your Letter Badges</div>
        <div className="flex flex-wrap gap-2">
          {['a', 'b', 'c', 'd', 'e', 'f', 's', 'sh', 'ch'].map((letter, i) => (
            <div
              key={letter}
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                i < 7 ? 'bg-yellow-400 text-yellow-800' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      {/* Mentor */}
      <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
        <div className="text-3xl">🐻</div>
        <div className="text-sm text-green-800">
          <div className="font-bold">Bongo says:</div>
          &quot;Great job! You&apos;ve mastered 7 sounds!&quot;
        </div>
      </div>
    </div>
  );
}

function ExplorerPointsPreview() {
  return (
    <div className="space-y-4 rounded-xl bg-gradient-to-b from-purple-100 to-pink-50 p-4">
      {/* Class Progress */}
      <div className="rounded-xl bg-white/80 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-bold text-purple-800">Class Goal: Pizza Party! 🍕</div>
          <Badge className="bg-purple-500">234 / 300 points</Badge>
        </div>
        <Progress value={78} className="h-4" />
      </div>

      {/* Award Categories */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'Kind Hearts', emoji: '💜', color: 'from-purple-400 to-purple-500' },
          { name: 'Helping Hands', emoji: '🤝', color: 'from-blue-400 to-blue-500' },
          { name: 'Great Listening', emoji: '👂', color: 'from-green-400 to-green-500' },
        ].map((cat) => (
          <button
            key={cat.name}
            className={`rounded-xl bg-gradient-to-br ${cat.color} p-3 text-white shadow-lg transition-transform hover:scale-105`}
          >
            <div className="text-2xl">{cat.emoji}</div>
            <div className="mt-1 text-xs font-bold">{cat.name}</div>
          </button>
        ))}
      </div>

      {/* Student List */}
      <div className="rounded-xl bg-white/80 p-4">
        <div className="mb-3 font-bold text-purple-800">Explorers</div>
        <div className="space-y-2">
          {[
            { name: 'Emma', points: 45, avatar: '🐰' },
            { name: 'Liam', points: 42, avatar: '🦁' },
            { name: 'Sophie', points: 38, avatar: '🦋' },
          ].map((student, i) => (
            <div key={student.name} className="flex items-center justify-between rounded-lg bg-purple-50 p-2">
              <div className="flex items-center gap-2">
                {i === 0 && <span className="text-yellow-500">👑</span>}
                <span className="text-xl">{student.avatar}</span>
                <span className="font-medium">{student.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-600">{student.points}</span>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinguaFlowPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Language Selector & CEFR */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🇯🇵</div>
          <div>
            <div className="font-bold">Japanese</div>
            <div className="text-sm text-muted-foreground">日本語</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-600">A2</div>
          <Progress value={65} className="mt-1 h-2 w-24" />
        </div>
      </div>

      {/* Skills Radar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Skills</div>
          <div className="space-y-2">
            {[
              { skill: 'Reading', level: 72 },
              { skill: 'Writing', level: 58 },
              { skill: 'Listening', level: 80 },
              { skill: 'Speaking', level: 45 },
            ].map((skill) => (
              <div key={skill.skill}>
                <div className="flex justify-between text-xs">
                  <span>{skill.skill}</span>
                  <span>{skill.level}%</span>
                </div>
                <Progress value={skill.level} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Daily Goal</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">85<span className="text-base">/100</span></div>
            <div className="text-xs text-muted-foreground">XP Today</div>
            <div className="mt-2 flex items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="font-bold text-orange-600">7 day streak!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vocabulary & AI Partner */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-medium">Vocabulary</div>
              <div className="text-xs text-muted-foreground">15 words to review</div>
            </div>
          </div>
          <Button size="sm" className="mt-2 w-full">Practice Now</Button>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <div>
              <div className="font-medium">AI Conversation</div>
              <div className="text-xs text-muted-foreground">Chat with Yuki</div>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="mt-2 w-full">Start Chat</Button>
        </div>
      </div>
    </div>
  );
}

function TeacherDashboardPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Schedule */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
        <div>
          <div className="text-sm text-muted-foreground">Now Teaching</div>
          <div className="text-lg font-bold">Year 10 Mathematics</div>
          <div className="text-sm">Room 12A • 24 students</div>
        </div>
        <Badge className="bg-green-500">LIVE</Badge>
      </div>

      {/* At-Risk Alerts */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-semibold text-red-700">At-Risk Students (2)</span>
        </div>
        <div className="space-y-2">
          {[
            { name: 'James W.', issue: 'Declining attendance - 3 missed classes' },
            { name: 'Emma T.', issue: 'Performance drop - 15% decline this term' },
          ].map((student) => (
            <div key={student.name} className="flex items-center justify-between rounded bg-white p-2">
              <div>
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">{student.issue}</div>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-semibold">AI Insights</span>
        </div>
        <div className="space-y-2">
          <div className="rounded bg-purple-50 p-2 text-sm">
            <span className="font-medium">Suggestion:</span> Consider grouping Sarah and Michael for the next project - high collaboration potential.
          </div>
          <div className="rounded bg-blue-50 p-2 text-sm">
            <span className="font-medium">Insight:</span> Class engagement peaks at 10am. Schedule complex topics accordingly.
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Users, label: 'Attendance' },
          { icon: Sparkles, label: 'AI Lesson' },
          { icon: GraduationCap, label: 'Grade' },
          { icon: Calendar, label: 'Schedule' },
        ].map((action) => (
          <button key={action.label} className="flex flex-col items-center rounded-lg border p-3 hover:bg-muted">
            <action.icon className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-xs">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AIStudioPreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Input */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Generate Content</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Topic</label>
            <div className="rounded border bg-muted p-2 text-sm">Quadratic Equations</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Year Level</label>
            <div className="rounded border bg-muted p-2 text-sm">Year 10</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Curriculum</label>
            <div className="rounded border bg-muted p-2 text-sm">ACARA</div>
          </div>
        </div>
      </div>

      {/* Output Types */}
      <div>
        <div className="mb-2 text-sm font-medium">Output Type</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { type: 'Lesson Plan', icon: BookOpen, active: true },
            { type: 'Assessment', icon: GraduationCap, active: false },
            { type: 'Worksheet', icon: Palette, active: false },
            { type: 'Slides', icon: Palette, active: false },
          ].map((item) => (
            <button
              key={item.type}
              className={`flex flex-col items-center rounded-lg border p-3 ${item.active ? 'border-primary bg-primary/10' : ''}`}
            >
              <item.icon className={`h-5 w-5 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="mt-1 text-xs">{item.type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generated Preview */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">Generated Lesson Plan</span>
          </div>
          <Badge className="bg-green-500">Ready</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="rounded bg-muted p-2">
            <div className="font-medium">Learning Objectives</div>
            <ul className="ml-4 list-disc text-muted-foreground">
              <li>Solve quadratic equations using factorization</li>
              <li>Apply the quadratic formula</li>
            </ul>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="font-medium">Activities</div>
            <ul className="ml-4 list-disc text-muted-foreground">
              <li>Warm-up: Review factoring (10 min)</li>
              <li>Direct instruction: Quadratic formula (15 min)</li>
              <li>Practice problems: Differentiated (20 min)</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm">Save to Library</Button>
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="outline">Regenerate</Button>
        </div>
      </div>
    </div>
  );
}

function CompliancePreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Overall Score */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Overall Compliance</div>
            <div className="text-3xl font-bold text-emerald-600">96%</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Framework Status */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Framework Compliance</div>
        <div className="space-y-3">
          {[
            { name: 'ACARA Curriculum', score: 98, status: 'green' },
            { name: 'AITSL Standards', score: 95, status: 'green' },
            { name: 'EYLF/EYFS', score: 100, status: 'green' },
            { name: 'Privacy (APPs)', score: 87, status: 'amber' },
            { name: 'Accessibility (WCAG)', score: 92, status: 'green' },
          ].map((framework) => (
            <div key={framework.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${
                  framework.status === 'green' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <span className="text-sm">{framework.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={framework.score} className="h-2 w-24" />
                <span className="text-sm font-medium">{framework.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-800">Action Required</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="rounded bg-white p-2">
            <div className="font-medium">Privacy Policy Update</div>
            <div className="text-xs text-muted-foreground">Due: Feb 15, 2026</div>
          </div>
          <div className="rounded bg-white p-2">
            <div className="font-medium">WCAG 2.1 AA Audit</div>
            <div className="text-xs text-muted-foreground">Due: Mar 1, 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataLakePreview() {
  return (
    <div className="space-y-4 p-4">
      {/* Pipeline Status */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Pipelines', value: '12', status: 'healthy' },
          { label: 'Data Sources', value: '8', status: 'healthy' },
          { label: 'Data Quality', value: '94%', status: 'healthy' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">{stat.status}</span>
            </div>
            <div className="mt-1 text-xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Visual Pipeline */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">ETL Pipeline: Student Progress</div>
        <div className="flex items-center gap-2">
          {[
            { name: 'Source', icon: '📥', status: 'success' },
            { name: 'Transform', icon: '⚙️', status: 'success' },
            { name: 'Validate', icon: '✓', status: 'success' },
            { name: 'Enrich', icon: '🔗', status: 'running' },
            { name: 'Load', icon: '📤', status: 'pending' },
          ].map((stage, i) => (
            <div key={stage.name} className="flex items-center">
              <div className={`flex flex-col items-center rounded-lg border p-2 ${
                stage.status === 'success' ? 'border-emerald-500 bg-emerald-50' :
                stage.status === 'running' ? 'border-blue-500 bg-blue-50' : ''
              }`}>
                <span className="text-xl">{stage.icon}</span>
                <span className="text-xs">{stage.name}</span>
              </div>
              {i < 4 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Data Catalog */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 font-semibold">Data Catalog</div>
        <div className="space-y-2">
          {[
            { name: 'students', type: 'Table', rows: '2,847', quality: 98 },
            { name: 'assessments', type: 'Table', rows: '45,231', quality: 95 },
            { name: 'learning_events', type: 'Stream', rows: '1.2M', quality: 92 },
          ].map((table) => (
            <div key={table.name} className="flex items-center justify-between rounded bg-muted p-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{table.type}</Badge>
                <span className="font-mono text-sm">{table.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{table.rows} rows</span>
                <span className="text-emerald-600">{table.quality}% quality</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DemoShowcasePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const slide = demoSlides[currentSlide];
  const SlideComponent = slide.component;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % demoSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + demoSlides.length) % demoSlides.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Scholarly Platform Demo</h1>
            <p className="text-sm text-muted-foreground">Interactive walkthrough of key features</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {currentSlide + 1} / {demoSlides.length}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setCurrentSlide(0)}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      {/* Slide Navigation Pills */}
      <div className="border-b bg-muted/30 py-3">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {demoSlides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(i)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  i === currentSlide
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Slide Info */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Badge className="mb-2">{slide.category}</Badge>
                <h2 className="mb-2 text-3xl font-bold">{slide.title}</h2>
                <p className="mb-6 text-lg text-muted-foreground">{slide.description}</p>

                <div className="mb-6">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">Key Features</div>
                  <div className="flex flex-wrap gap-2">
                    {slide.highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button asChild>
                    <Link href={slide.href}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Try Live Page
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={nextSlide}>
                    Next Feature
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <Button variant="ghost" size="icon" onClick={prevSlide}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-1">
                {demoSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      i === currentSlide ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={nextSlide}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Preview Window */}
          <div className="relative">
            <div className="sticky top-24">
              <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 border-b bg-muted px-4 py-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 rounded bg-background px-3 py-1 text-center text-xs text-muted-foreground">
                    scholarly.edu.au{slide.href}
                  </div>
                </div>

                {/* Preview Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-h-[600px] overflow-y-auto"
                  >
                    <SlideComponent />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quick Jump Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-4 text-center">
            <h3 className="font-semibold">Jump to Section</h3>
            <p className="text-sm text-muted-foreground">Quick access to specific features</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {[
              { name: 'Dashboards', icon: BarChart3, slides: [0, 8] },
              { name: 'Early Years', icon: Star, slides: [4, 5, 6] },
              { name: 'Analytics', icon: TrendingUp, slides: [2, 3, 11] },
              { name: 'Languages', icon: Languages, slides: [7] },
              { name: 'Teacher Tools', icon: GraduationCap, slides: [8, 9] },
              { name: 'Compliance', icon: Shield, slides: [10] },
            ].map((section) => (
              <button
                key={section.name}
                onClick={() => setCurrentSlide(section.slides[0])}
                className="flex flex-col items-center rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <section.icon className="mb-2 h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{section.name}</span>
                <span className="text-xs text-muted-foreground">{section.slides.length} slides</span>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
