'use client';

/**
 * LinguaFlow Language Dashboard
 * Main language learning dashboard with CEFR progress, skills radar, and gamification elements
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Mic,
  Headphones,
  PenTool,
  Flame,
  Target,
  Clock,
  Trophy,
  ChevronRight,
  Star,
  Zap,
  Calendar,
  TrendingUp,
  MessageCircle,
  Brain,
  Volume2,
  Award,
  Users,
  Settings,
  ChevronDown,
  Check,
  Globe,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { linguaflowApi } from '@/lib/linguaflow-api';
import {
  type LearningProgress,
  type SkillType,
  type CEFRLevel,
  CEFR_LEVELS,
  SUPPORTED_LANGUAGES,
} from '@/types/linguaflow';

// CEFR level colors for progress visualization
const cefrColors: Record<CEFRLevel, string> = {
  A1: 'bg-emerald-500',
  A2: 'bg-green-500',
  B1: 'bg-blue-500',
  B2: 'bg-indigo-500',
  C1: 'bg-purple-500',
  C2: 'bg-amber-500',
};

const skillColors: Record<SkillType, { gradient: string; bg: string; text: string }> = {
  reading: { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  writing: { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  listening: { gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  speaking: { gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
};

const skillIcons: Record<SkillType, React.ReactNode> = {
  reading: <BookOpen className="w-5 h-5" />,
  writing: <PenTool className="w-5 h-5" />,
  listening: <Headphones className="w-5 h-5" />,
  speaking: <Mic className="w-5 h-5" />,
};

// Skills Radar Chart Component
function SkillsRadar({ skills }: { skills: LearningProgress['skills'] }) {
  const skillOrder: SkillType[] = ['reading', 'writing', 'listening', 'speaking'];
  const size = 200;
  const center = size / 2;
  const maxRadius = 80;

  const levels = [25, 50, 75, 100];
  const angles = skillOrder.map((_, i) => (Math.PI * 2 * i) / skillOrder.length - Math.PI / 2);

  const getSkillValue = (skill: SkillType) => {
    const s = skills.find((sk) => sk.skill === skill);
    return s ? s.progressPercent : 0;
  };

  const points = skillOrder.map((skill, i) => {
    const value = getSkillValue(skill);
    const radius = (value / 100) * maxRadius;
    const x = center + radius * Math.cos(angles[i]);
    const y = center + radius * Math.sin(angles[i]);
    return { x, y, skill, value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto">
        {/* Background circles */}
        {levels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * maxRadius}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={1}
          />
        ))}
        {/* Axis lines */}
        {angles.map((angle, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos(angle)}
            y2={center + maxRadius * Math.sin(angle)}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={1}
          />
        ))}
        {/* Skill area */}
        <motion.path
          d={pathD}
          fill="url(#radarGradient)"
          fillOpacity={0.3}
          stroke="url(#radarGradient)"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            className="fill-primary"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
        ))}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
          </linearGradient>
        </defs>
      </svg>
      {/* Skill labels */}
      <div className="absolute inset-0">
        {skillOrder.map((skill, i) => {
          const angle = angles[i];
          const labelRadius = maxRadius + 30;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          const value = getSkillValue(skill);
          return (
            <div
              key={skill}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: x, top: y }}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1', skillColors[skill].bg)}>
                <span className={skillColors[skill].text}>{skillIcons[skill]}</span>
              </div>
              <span className="text-xs font-medium capitalize">{skill}</span>
              <span className="block text-xs text-muted-foreground">{value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Streak Fire Animation Component
function StreakFire({ days, isActive }: { days: number; isActive: boolean }) {
  return (
    <motion.div
      className="relative"
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      <Flame
        className={cn(
          'w-6 h-6',
          isActive ? 'text-orange-500' : 'text-muted-foreground'
        )}
      />
      {isActive && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Flame className="w-6 h-6 text-yellow-400 blur-sm" />
        </motion.div>
      )}
    </motion.div>
  );
}

// CEFR Progress Component
function CEFRProgressIndicator({ currentLevel, progressPercent }: { currentLevel: CEFRLevel; progressPercent: number }) {
  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = levels.indexOf(currentLevel);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        {levels.map((level, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const levelInfo = CEFR_LEVELS[level];

          return (
            <div key={level} className="flex flex-col items-center flex-1">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all',
                  isComplete && 'bg-primary text-primary-foreground border-primary',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  !isComplete && !isCurrent && 'border-muted-foreground/30 text-muted-foreground'
                )}
                initial={false}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {isComplete ? <Check className="w-5 h-5" /> : level}
              </motion.div>
              <span className={cn(
                'text-xs mt-1',
                isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'
              )}>
                {levelInfo.name}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + progressPercent / 100) / levels.length) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// AI Partner Availability Component
function AIPartnerCard() {
  const personas = [
    { name: 'Marie', role: 'Cafe Owner', available: true, avatar: 'bg-pink-100 text-pink-600' },
    { name: 'Pierre', role: 'Travel Guide', available: true, avatar: 'bg-blue-100 text-blue-600' },
    { name: 'Claire', role: 'Newsreader', available: true, avatar: 'bg-purple-100 text-purple-600' },
    { name: 'Lucas', role: 'Friend', available: true, avatar: 'bg-green-100 text-green-600' },
  ];

  return (
    <Card hover>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          AI Conversation Partners
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {personas.map((persona) => (
            <Link key={persona.name} href={`/linguaflow/conversation?persona=${persona.name.toLowerCase()}`}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', persona.avatar)}>
                    {persona.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{persona.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{persona.role}</p>
                  </div>
                  {persona.available && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="w-full mt-3">
          <Link href="/linguaflow/conversation">
            Start Conversation
            <ChevronRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LinguaFlowPage() {
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        const data = await linguaflowApi.getProgress();
        setProgress(data);
        setSelectedLanguage(data.profile.targetLanguage);
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, []);

  const language = useMemo(() => {
    if (!selectedLanguage) return null;
    return SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
  }, [selectedLanguage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Unable to load progress</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  const { profile, skills, weeklyStats, recommendations, recentSessions } = progress;
  const levelInfo = CEFR_LEVELS[profile.currentLevel];
  const avgSkillProgress = Math.round(skills.reduce((sum, s) => sum + s.progressPercent, 0) / skills.length);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Language Dashboard"
          description={`${levelInfo.name} (${profile.currentLevel}) - ${profile.vocabularyMastered} words mastered`}
          actions={
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <span className="text-lg">{language?.flag}</span>
                    <span>{language?.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className="gap-2"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {lang.code === selectedLanguage && <Check className="ml-auto w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Streak Badge */}
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full">
                <StreakFire days={profile.dailyStreakDays} isActive={profile.dailyStreakDays > 0} />
                <span className="font-bold text-orange-700 dark:text-orange-400">
                  {profile.dailyStreakDays} day streak
                </span>
              </div>

              {/* XP Badge */}
              <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-700 dark:text-purple-400">
                  {profile.totalXP.toLocaleString()} XP
                </span>
              </div>
            </div>
          }
        />
      </motion.div>

      {/* CEFR Progress */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              CEFR Progress
            </CardTitle>
            <CardDescription>
              Track your journey from beginner to proficient
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CEFRProgressIndicator
              currentLevel={profile.currentLevel}
              progressPercent={avgSkillProgress}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Skills Radar & Daily Goal */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Skills Radar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Skills Radar</CardTitle>
                  <CardDescription>Reading, Writing, Listening, Speaking</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/linguaflow/skills">View Details</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <SkillsRadar skills={skills} />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {skills.map((skill) => (
                  <div key={skill.skill} className="text-center">
                    <Badge variant="secondary" className="mb-1">
                      {skill.level}
                    </Badge>
                    <div className="text-sm font-medium capitalize">{skill.skill}</div>
                    <Progress value={skill.progressPercent} className="h-1.5 mt-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Goal & Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Daily Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">XP Target: 50 XP</span>
                    <span className="text-lg font-bold text-primary">{weeklyStats.xpEarned % 50}/50</span>
                  </div>
                  <Progress value={(weeklyStats.xpEarned % 50) * 2} className="h-3" />
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <StreakFire days={profile.dailyStreakDays} isActive={true} />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">{profile.dailyStreakDays} days</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center pt-4 border-t">
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.minutesPracticed}</div>
                  <div className="text-xs text-muted-foreground">Minutes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.sessionsCompleted}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{weeklyStats.vocabularyLearned}</div>
                  <div className="text-xs text-muted-foreground">Words</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{weeklyStats.xpEarned}</div>
                  <div className="text-xs text-muted-foreground">XP This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Vocabulary & Conversation */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Vocabulary Review Card */}
          <Card hover>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-500" />
                Vocabulary Review
              </CardTitle>
              <CardDescription>SM-2 Spaced Repetition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-bold">12</div>
                  <div className="text-sm text-muted-foreground">Cards due today</div>
                </div>
                <div className="text-right">
                  <Badge variant="warning" className="mb-1">Due Now</Badge>
                  <div className="text-xs text-muted-foreground">+5 XP per card</div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mastered</span>
                  <span className="font-medium text-green-600">342</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Learning</span>
                  <span className="font-medium text-blue-600">45</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Struggling</span>
                  <span className="font-medium text-orange-600">8</span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/linguaflow/vocabulary">
                  <BookOpen className="mr-2 w-4 h-4" />
                  Start Review
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* AI Conversation Partners */}
          <AIPartnerCard />

          {/* Streak Card */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Flame className="w-8 h-8 text-orange-500" />
                    </motion.div>
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {profile.dailyStreakDays} Day Streak!
                    </span>
                  </div>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    Keep it up! Practice today to maintain your streak.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Best streak</div>
                  <div className="font-bold">{profile.longestStreak} days</div>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      'flex-1 h-2 rounded',
                      i < 5 ? 'bg-orange-500' : 'bg-muted'
                    )}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.1 }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Mon</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Link href="/linguaflow/vocabulary">
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Vocabulary</h3>
                <p className="text-sm text-muted-foreground mb-3">12 cards due</p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Start Review <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/linguaflow/grammar">
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Grammar</h3>
                <p className="text-sm text-muted-foreground mb-3">Subjunctive Mood</p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/linguaflow/conversation">
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mic className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Conversation</h3>
                <p className="text-sm text-muted-foreground mb-3">AI tutor available</p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Start Chat <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/linguaflow/listening">
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Headphones className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Listening</h3>
                <p className="text-sm text-muted-foreground mb-3">New podcasts</p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Listen Now <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <Link key={index} href={rec.actionUrl}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      rec.priority === 'high'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {rec.type === 'vocabulary' && <BookOpen className="w-5 h-5" />}
                    {rec.type === 'grammar' && <PenTool className="w-5 h-5" />}
                    {rec.type === 'conversation' && <Mic className="w-5 h-5" />}
                    {rec.type === 'review' && <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{rec.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground block">{rec.estimatedMinutes} min</span>
                      <span className="text-xs text-primary">+{rec.estimatedMinutes * 5} XP</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentSessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      'bg-gradient-to-br text-white',
                      skillColors[session.skill].gradient
                    )}
                  >
                    {skillIcons[session.skill]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{session.type} Practice</div>
                    <div className="text-sm text-muted-foreground">
                      {session.durationMinutes} min - {session.activitiesCompleted} activities - {Math.round(session.accuracy * 100)}% accuracy
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary font-medium">
                      <Star className="w-4 h-4" />
                      +{session.xpEarned} XP
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
