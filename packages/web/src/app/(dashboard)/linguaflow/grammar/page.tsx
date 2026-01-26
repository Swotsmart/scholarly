'use client';

/**
 * Grammar Lessons Page
 * Interactive French grammar lessons with explanations and exercises
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Circle,
  Lock,
  Play,
  ChevronRight,
  Star,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Lesson = {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  cefrLevel: string;
  durationMinutes: number;
  exercises: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progress?: number;
  xpReward: number;
};

type GrammarUnit = {
  id: string;
  title: string;
  titleFr: string;
  cefrLevel: string;
  lessons: Lesson[];
  progress: number;
};

const grammarUnits: GrammarUnit[] = [
  {
    id: 'unit-1',
    title: 'Present Tense Foundations',
    titleFr: 'Les bases du présent',
    cefrLevel: 'A1-A2',
    progress: 100,
    lessons: [
      {
        id: 'lesson-1-1',
        title: 'Regular -ER Verbs',
        titleFr: 'Les verbes en -ER',
        description: 'Master the most common verb conjugation pattern',
        cefrLevel: 'A1',
        durationMinutes: 15,
        exercises: 12,
        status: 'completed',
        progress: 100,
        xpReward: 50,
      },
      {
        id: 'lesson-1-2',
        title: 'Regular -IR & -RE Verbs',
        titleFr: 'Les verbes en -IR et -RE',
        description: 'Complete your present tense verb toolkit',
        cefrLevel: 'A1',
        durationMinutes: 20,
        exercises: 15,
        status: 'completed',
        progress: 100,
        xpReward: 60,
      },
      {
        id: 'lesson-1-3',
        title: 'Être & Avoir',
        titleFr: 'Être et Avoir',
        description: 'Essential irregular verbs for everyday French',
        cefrLevel: 'A1',
        durationMinutes: 20,
        exercises: 18,
        status: 'completed',
        progress: 100,
        xpReward: 70,
      },
    ],
  },
  {
    id: 'unit-2',
    title: 'Past Tenses',
    titleFr: 'Les temps du passé',
    cefrLevel: 'A2-B1',
    progress: 65,
    lessons: [
      {
        id: 'lesson-2-1',
        title: 'Passé Composé with Avoir',
        titleFr: 'Le passé composé avec avoir',
        description: 'Express past actions with the most common auxiliary',
        cefrLevel: 'A2',
        durationMinutes: 25,
        exercises: 20,
        status: 'completed',
        progress: 100,
        xpReward: 80,
      },
      {
        id: 'lesson-2-2',
        title: 'Passé Composé with Être',
        titleFr: 'Le passé composé avec être',
        description: 'Learn the DR MRS VANDERTRAMP verbs',
        cefrLevel: 'A2',
        durationMinutes: 25,
        exercises: 18,
        status: 'in_progress',
        progress: 45,
        xpReward: 80,
      },
      {
        id: 'lesson-2-3',
        title: 'The Imperfect Tense',
        titleFr: "L'imparfait",
        description: 'Describe past habits and ongoing states',
        cefrLevel: 'B1',
        durationMinutes: 30,
        exercises: 22,
        status: 'available',
        xpReward: 90,
      },
      {
        id: 'lesson-2-4',
        title: 'Passé Composé vs Imparfait',
        titleFr: 'Passé composé vs Imparfait',
        description: 'Master the crucial distinction between past tenses',
        cefrLevel: 'B1',
        durationMinutes: 35,
        exercises: 25,
        status: 'locked',
        xpReward: 100,
      },
    ],
  },
  {
    id: 'unit-3',
    title: 'The Subjunctive Mood',
    titleFr: 'Le subjonctif',
    cefrLevel: 'B1-B2',
    progress: 0,
    lessons: [
      {
        id: 'lesson-3-1',
        title: 'Introduction to the Subjunctive',
        titleFr: 'Introduction au subjonctif',
        description: 'Understand when and why to use the subjunctive',
        cefrLevel: 'B1',
        durationMinutes: 25,
        exercises: 15,
        status: 'available',
        xpReward: 85,
      },
      {
        id: 'lesson-3-2',
        title: 'Subjunctive with Emotions',
        titleFr: 'Le subjonctif avec les émotions',
        description: 'Express feelings and desires properly',
        cefrLevel: 'B1',
        durationMinutes: 30,
        exercises: 20,
        status: 'locked',
        xpReward: 90,
      },
      {
        id: 'lesson-3-3',
        title: 'Subjunctive with Doubt & Necessity',
        titleFr: 'Le subjonctif avec le doute',
        description: 'Navigate uncertainty and obligation',
        cefrLevel: 'B2',
        durationMinutes: 30,
        exercises: 22,
        status: 'locked',
        xpReward: 95,
      },
    ],
  },
];

function LessonStatusIcon({ status }: { status: Lesson['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <Play className="w-5 h-5 text-primary" />;
    case 'available':
      return <Circle className="w-5 h-5 text-muted-foreground" />;
    case 'locked':
      return <Lock className="w-5 h-5 text-muted-foreground/50" />;
  }
}

export default function GrammarPage() {
  const [expandedUnit, setExpandedUnit] = useState<string | null>('unit-2');

  const totalXP = grammarUnits.reduce(
    (sum, unit) =>
      sum +
      unit.lessons
        .filter((l) => l.status === 'completed')
        .reduce((s, l) => s + l.xpReward, 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/linguaflow"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">French Grammar</h1>
            <p className="text-muted-foreground">Master the building blocks of French</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-full">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="font-bold text-amber-700 dark:text-amber-400">{totalXP} XP earned</span>
        </div>
      </div>

      {/* Units */}
      <div className="space-y-4">
        {grammarUnits.map((unit) => (
          <Card key={unit.id} className="overflow-hidden">
            <CardHeader
              className={cn(
                'cursor-pointer transition-colors',
                expandedUnit === unit.id ? 'bg-primary/5' : 'hover:bg-muted/50'
              )}
              onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        unit.progress === 100
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : unit.progress > 0
                          ? 'bg-primary/10'
                          : 'bg-muted'
                      )}
                    >
                      {unit.progress === 100 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{unit.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {unit.titleFr} · {unit.cefrLevel}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{unit.progress}%</div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${unit.progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform',
                      expandedUnit === unit.id && 'rotate-90'
                    )}
                  />
                </div>
              </div>
            </CardHeader>

            {expandedUnit === unit.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="pt-0 pb-4">
                  <div className="border-t pt-4 space-y-2">
                    {unit.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={lesson.status !== 'locked' ? `/linguaflow/grammar/${lesson.id}` : '#'}
                        className={cn(
                          'block rounded-lg transition-colors',
                          lesson.status === 'locked'
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <LessonStatusIcon status={lesson.status} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{lesson.title}</span>
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {lesson.cefrLevel}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {lesson.description}
                            </p>
                            {lesson.status === 'in_progress' && lesson.progress && (
                              <Progress value={lesson.progress} className="h-1.5 mt-2 w-32" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{lesson.durationMinutes} min</span>
                            <span>{lesson.exercises} exercises</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-500" />
                              <span>{lesson.xpReward} XP</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Tips */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Grammar Tip of the Day
          </h3>
          <p className="text-muted-foreground">
            <strong className="text-foreground">Remember:</strong> After{' '}
            <span className="text-primary font-medium">bien que</span> (although), always use the
            subjunctive! For example: "Bien qu'il <em>soit</em> fatigué, il continue."
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
