'use client';

/**
 * Vocabulary Practice Page
 * Flashcard-based vocabulary learning with SM-2 spaced repetition
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Volume2,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Star,
  Zap,
  Brain,
  Eye,
  EyeOff,
  Keyboard,
  Headphones,
  Filter,
  Settings,
  Trophy,
  Flame,
  Target,
  Clock,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Timer,
  BarChart3,
  Layers,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { linguaflowApi } from '@/lib/linguaflow-api';
import {
  type VocabularyProgress,
  type VocabularyItem,
  type ReviewResult,
  CEFR_LEVELS,
} from '@/types/linguaflow';

// Practice modes
type PracticeMode = 'recognition' | 'recall' | 'spelling' | 'listening';

const practiceModes: { value: PracticeMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'recognition', label: 'Recognition', icon: <Eye className="w-4 h-4" />, description: 'See word, choose translation' },
  { value: 'recall', label: 'Recall', icon: <Brain className="w-4 h-4" />, description: 'See translation, recall word' },
  { value: 'spelling', label: 'Spelling', icon: <Keyboard className="w-4 h-4" />, description: 'Type the word from memory' },
  { value: 'listening', label: 'Listening', icon: <Headphones className="w-4 h-4" />, description: 'Listen and identify' },
];

// SM-2 quality ratings
const qualityRatings = [
  { value: 0 as const, label: 'Blackout', color: 'bg-red-500', description: 'Complete failure' },
  { value: 1 as const, label: 'Wrong', color: 'bg-orange-500', description: 'Incorrect, but recognized' },
  { value: 2 as const, label: 'Hard', color: 'bg-amber-500', description: 'Correct with difficulty' },
  { value: 3 as const, label: 'Good', color: 'bg-yellow-500', description: 'Correct with hesitation' },
  { value: 4 as const, label: 'Easy', color: 'bg-lime-500', description: 'Correct, easy recall' },
  { value: 5 as const, label: 'Perfect', color: 'bg-green-500', description: 'Instant, perfect recall' },
];

// Flashcard Component
function Flashcard({
  card,
  isFlipped,
  onFlip,
  mode,
  userInput,
  onInputChange,
  showAnswer,
}: {
  card: VocabularyProgress;
  isFlipped: boolean;
  onFlip: () => void;
  mode: PracticeMode;
  userInput: string;
  onInputChange: (value: string) => void;
  showAnswer: boolean;
}) {
  const playAudio = () => {
    if (card.item.audioUrl) {
      const audio = new Audio(card.item.audioUrl);
      audio.play();
    } else {
      // Use browser speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(card.item.word);
      utterance.lang = 'fr-FR'; // French for demo
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="perspective-1000 w-full max-w-md mx-auto">
      <motion.div
        className={cn(
          'relative w-full aspect-[3/2] cursor-pointer preserve-3d',
          isFlipped && 'rotate-y-180'
        )}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        onClick={mode === 'recognition' || mode === 'listening' ? onFlip : undefined}
      >
        {/* Front of card */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full backface-hidden rounded-2xl p-6 flex flex-col',
            'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl',
            isFlipped && 'invisible'
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {card.item.cefrLevel}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                playAudio();
              }}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {mode === 'listening' ? (
              <div className="space-y-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto"
                >
                  <Headphones className="w-10 h-10" />
                </motion.div>
                <p className="text-lg opacity-80">Click to listen</p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-indigo-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio();
                  }}
                >
                  <Volume2 className="mr-2 w-5 h-5" />
                  Play Audio
                </Button>
              </div>
            ) : mode === 'recall' ? (
              <div>
                <p className="text-xl opacity-80 mb-2">Translation:</p>
                <p className="text-3xl font-bold">{card.item.translation}</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl font-bold mb-4">{card.item.word}</p>
                {card.item.pronunciation && (
                  <p className="text-lg opacity-80">[{card.item.pronunciation}]</p>
                )}
              </div>
            )}
          </div>

          {mode === 'spelling' && (
            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
              <Input
                value={userInput}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Type the word..."
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center text-lg"
                autoFocus
              />
            </div>
          )}

          <div className="text-center mt-4">
            <p className="text-sm opacity-70">
              {mode === 'spelling' ? 'Press Enter to check' : 'Click to flip'}
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full backface-hidden rounded-2xl p-6 flex flex-col rotate-y-180',
            'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl',
            !isFlipped && 'invisible'
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {card.item.partOfSpeech}
            </Badge>
            <div className="flex gap-1">
              {card.item.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="border-white/30 text-white text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-4xl font-bold mb-2">{card.item.word}</p>
            {card.item.pronunciation && (
              <p className="text-lg opacity-80 mb-4">[{card.item.pronunciation}]</p>
            )}
            <p className="text-xl">{card.item.translation}</p>
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm italic mb-1">&ldquo;{card.item.exampleSentence}&rdquo;</p>
            <p className="text-xs opacity-80">{card.item.exampleTranslation}</p>
          </div>

          {showAnswer && mode === 'spelling' && (
            <div className="mt-4 text-center">
              {userInput.toLowerCase().trim() === card.item.word.toLowerCase() ? (
                <div className="flex items-center justify-center gap-2 text-green-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Correct!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-200">
                  <XCircle className="w-5 h-5" />
                  <span>Your answer: {userInput || '(empty)'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Spaced Repetition Schedule Visualization
function SRScheduleViz({ cards }: { cards: VocabularyProgress[] }) {
  const schedule = useMemo(() => {
    const today = new Date();
    const days: { date: Date; count: number }[] = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const count = cards.filter((c) => {
        const reviewDate = new Date(c.nextReviewAt);
        return reviewDate.toDateString() === date.toDateString();
      }).length;
      days.push({ date, count });
    }

    return days;
  }, [cards]);

  const maxCount = Math.max(...schedule.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Next 2 weeks</span>
        <span className="font-medium">{cards.length} total cards</span>
      </div>
      <div className="flex gap-1 h-20">
        {schedule.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1">
            <motion.div
              className={cn(
                'w-full rounded-t',
                day.count > 0 ? 'bg-primary' : 'bg-muted'
              )}
              initial={{ height: 0 }}
              animate={{ height: `${(day.count / maxCount) * 100}%` }}
              transition={{ delay: i * 0.05 }}
              title={`${day.count} cards`}
            />
            <span className="text-[10px] text-muted-foreground">
              {i === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Display Component
function VocabStats({ cards }: { cards: VocabularyProgress[] }) {
  const stats = useMemo(() => {
    const mastered = cards.filter((c) => c.status === 'mastered').length;
    const learning = cards.filter((c) => c.status === 'learning' || c.status === 'review').length;
    const struggling = cards.filter((c) => c.incorrectCount > c.correctCount).length;
    const newCards = cards.filter((c) => c.status === 'new').length;

    return { mastered, learning, struggling, newCards };
  }, [cards]);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
        <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
        <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
        <div className="text-xs text-muted-foreground">Mastered</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <Brain className="w-6 h-6 text-blue-500 mx-auto mb-1" />
        <div className="text-2xl font-bold text-blue-600">{stats.learning}</div>
        <div className="text-xs text-muted-foreground">Learning</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
        <AlertCircle className="w-6 h-6 text-orange-500 mx-auto mb-1" />
        <div className="text-2xl font-bold text-orange-600">{stats.struggling}</div>
        <div className="text-xs text-muted-foreground">Struggling</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
        <Sparkles className="w-6 h-6 text-purple-500 mx-auto mb-1" />
        <div className="text-2xl font-bold text-purple-600">{stats.newCards}</div>
        <div className="text-xs text-muted-foreground">New</div>
      </div>
    </div>
  );
}

// Session Complete Dialog
function SessionCompleteDialog({
  open,
  onClose,
  results,
  xpEarned,
  comboMultiplier,
}: {
  open: boolean;
  onClose: () => void;
  results: { correct: number; incorrect: number };
  xpEarned: number;
  comboMultiplier: number;
}) {
  const accuracy = results.correct + results.incorrect > 0
    ? Math.round((results.correct / (results.correct + results.incorrect)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Session Complete!
          </DialogTitle>
          <DialogDescription>Great work on your vocabulary practice!</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* XP Earned */}
          <motion.div
            className="text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full">
              <Zap className="w-6 h-6" />
              <span className="text-2xl font-bold">+{xpEarned} XP</span>
            </div>
            {comboMultiplier > 1 && (
              <div className="text-sm text-muted-foreground mt-2">
                {comboMultiplier}x combo multiplier applied!
              </div>
            )}
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-500">{results.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-500">{results.incorrect}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          {/* Accuracy Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Accuracy</span>
              <span>{accuracy}%</span>
            </div>
            <Progress value={accuracy} className="h-3" />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Back to Overview
          </Button>
          <Button onClick={onClose}>
            Continue Learning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VocabularyPracticePage() {
  const [cards, setCards] = useState<VocabularyProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('practice');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('recognition');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionResults, setSessionResults] = useState<ReviewResult[]>([]);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    async function loadCards() {
      try {
        const { cards: dueCards } = await linguaflowApi.getVocabularyDue(20);
        setCards(dueCards);
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCards();
  }, []);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;
  const comboMultiplier = Math.min(1 + Math.floor(comboCount / 5) * 0.5, 3);

  // Categories from cards
  const categories = useMemo(() => {
    const themes = new Set(cards.map((c) => c.item.theme));
    return ['all', ...Array.from(themes)];
  }, [cards]);

  // Filter cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const categoryMatch = selectedCategory === 'all' || c.item.theme === selectedCategory;
      const difficultyMatch = selectedDifficulty === 'all' || c.item.cefrLevel === selectedDifficulty;
      return categoryMatch && difficultyMatch;
    });
  }, [cards, selectedCategory, selectedDifficulty]);

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  }, [isFlipped]);

  const handleRate = useCallback((quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!currentCard || !sessionStartTime) return;

    const result: ReviewResult = {
      itemId: currentCard.itemId,
      quality,
      responseTimeMs: Date.now() - sessionStartTime,
    };

    setSessionResults((prev) => [...prev, result]);

    // XP calculation
    const baseXP = 5;
    const qualityBonus = quality >= 3 ? quality - 2 : 0;
    const earned = Math.round((baseXP + qualityBonus) * comboMultiplier);
    setXpEarned((prev) => prev + earned);

    // Update combo
    if (quality >= 3) {
      setComboCount((prev) => prev + 1);
    } else {
      setComboCount(0);
    }

    // Move to next card or complete
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setUserInput('');
      setShowAnswer(false);
      setSessionStartTime(Date.now());
    } else {
      setShowCompleteDialog(true);
    }
  }, [currentCard, currentIndex, filteredCards.length, comboMultiplier, sessionStartTime]);

  const handleSpellingSubmit = useCallback(() => {
    if (!currentCard) return;
    setShowAnswer(true);
    setIsFlipped(true);
  }, [currentCard]);

  const startSession = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserInput('');
    setShowAnswer(false);
    setSessionResults([]);
    setXpEarned(0);
    setComboCount(0);
    setSessionStartTime(Date.now());
    setActiveTab('practice');
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && practiceMode === 'spelling' && !showAnswer) {
      handleSpellingSubmit();
    } else if (e.key === ' ' && !isFlipped) {
      e.preventDefault();
      handleFlip();
    } else if (isFlipped && !showAnswer) {
      const keyToQuality: Record<string, 0 | 1 | 2 | 3 | 4 | 5> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
      };
      if (keyToQuality[e.key] !== undefined) {
        handleRate(keyToQuality[e.key]);
      }
    }
  }, [practiceMode, showAnswer, isFlipped, handleFlip, handleSpellingSubmit, handleRate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        title="Vocabulary Practice"
        description="Master new words with spaced repetition"
        actions={
          <div className="flex items-center gap-3">
            {/* Combo indicator */}
            {comboCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full"
              >
                <Flame className="w-5 h-5" />
                <span className="font-bold">{comboCount} Combo!</span>
                {comboMultiplier > 1 && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {comboMultiplier}x
                  </Badge>
                )}
              </motion.div>
            )}

            {/* XP Display */}
            <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
              <Zap className="w-5 h-5 text-purple-500" />
              <span className="font-bold text-purple-700 dark:text-purple-400">
                {xpEarned} XP
              </span>
            </div>

            <Button variant="outline" asChild>
              <Link href="/linguaflow">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Practice Tab */}
        <TabsContent value="practice" className="mt-6">
          {filteredCards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground mb-4">No cards due for review right now.</p>
                <Button onClick={() => setActiveTab('overview')}>View Statistics</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Mode Selector */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Mode:</span>
                      <div className="flex gap-1">
                        {practiceModes.map((mode) => (
                          <Button
                            key={mode.value}
                            variant={practiceMode === mode.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setPracticeMode(mode.value);
                              setIsFlipped(false);
                              setUserInput('');
                              setShowAnswer(false);
                            }}
                            className="gap-1"
                          >
                            {mode.icon}
                            {mode.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {currentIndex + 1} / {filteredCards.length}
                      </div>
                      <Progress value={progress} className="w-32 h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Flashcard */}
              {currentCard && (
                <div className="py-8">
                  <Flashcard
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={handleFlip}
                    mode={practiceMode}
                    userInput={userInput}
                    onInputChange={setUserInput}
                    showAnswer={showAnswer}
                  />
                </div>
              )}

              {/* Rating Buttons */}
              <AnimatePresence>
                {(isFlipped || (practiceMode === 'spelling' && showAnswer)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">How well did you know this?</CardTitle>
                        <CardDescription>Rate your recall (or press 1-6)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-6 gap-2">
                          {qualityRatings.map((rating) => (
                            <Button
                              key={rating.value}
                              variant="outline"
                              className="flex flex-col h-auto py-3 hover:scale-105 transition-transform"
                              onClick={() => handleRate(rating.value)}
                            >
                              <div className={cn('w-3 h-3 rounded-full mb-1', rating.color)} />
                              <span className="text-xs font-medium">{rating.label}</span>
                              <span className="text-[10px] text-muted-foreground">{rating.value + 1}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Actions */}
              {!isFlipped && practiceMode !== 'spelling' && (
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={handleFlip} size="lg">
                    Show Answer
                    <span className="ml-2 text-xs text-muted-foreground">(Space)</span>
                  </Button>
                </div>
              )}

              {practiceMode === 'spelling' && !showAnswer && (
                <div className="flex justify-center gap-4">
                  <Button onClick={handleSpellingSubmit} size="lg">
                    Check Answer
                    <span className="ml-2 text-xs text-muted-foreground">(Enter)</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vocabulary Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <VocabStats cards={cards} />
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Schedule</CardTitle>
                <CardDescription>Spaced repetition visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <SRScheduleViz cards={cards} />
              </CardContent>
            </Card>

            {/* Recent Words */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Words Due for Review</CardTitle>
                  <Button onClick={startSession}>
                    Start Session
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {cards.slice(0, 9).map((card) => (
                    <div
                      key={card.itemId}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{card.item.word}</p>
                        <p className="text-sm text-muted-foreground truncate">{card.item.translation}</p>
                      </div>
                      <Badge
                        variant={
                          card.status === 'mastered' ? 'success' :
                          card.status === 'new' ? 'secondary' :
                          'outline'
                        }
                      >
                        {card.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <Tag className="mr-2 w-4 h-4" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-[140px]">
                      <Target className="mr-2 w-4 h-4" />
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {Object.keys(CEFR_LEVELS).map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {filteredCards.length} words
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.filter((c) => c !== 'all').map((category) => {
                const categoryCards = cards.filter((c) => c.item.theme === category);
                const masteredCount = categoryCards.filter((c) => c.status === 'mastered').length;
                const categoryProgress = categoryCards.length > 0
                  ? Math.round((masteredCount / categoryCards.length) * 100)
                  : 0;

                return (
                  <Card key={category} hover className="cursor-pointer" onClick={() => {
                    setSelectedCategory(category);
                    startSession();
                  }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{category}</h3>
                        <Badge variant="secondary">{categoryCards.length} words</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{categoryProgress}%</span>
                        </div>
                        <Progress value={categoryProgress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between mt-4 text-sm">
                        <span className="text-green-600">{masteredCount} mastered</span>
                        <span className="text-muted-foreground">{categoryCards.length - masteredCount} learning</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Session Complete Dialog */}
      <SessionCompleteDialog
        open={showCompleteDialog}
        onClose={() => {
          setShowCompleteDialog(false);
          setActiveTab('overview');
        }}
        results={{
          correct: sessionResults.filter((r) => r.quality >= 3).length,
          incorrect: sessionResults.filter((r) => r.quality < 3).length,
        }}
        xpEarned={xpEarned}
        comboMultiplier={comboMultiplier}
      />

      {/* CSS for 3D transforms */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </motion.div>
  );
}
