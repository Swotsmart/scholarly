'use client';

/**
 * Vocabulary Review Page
 * Spaced repetition flashcard system
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Volume2,
  Check,
  X,
  RotateCcw,
  Lightbulb,
  ChevronRight,
  Trophy,
  Star,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { linguaflowApi } from '@/lib/linguaflow-api';
import type { VocabularyProgress, ReviewResult } from '@/types/linguaflow';

type CardState = 'question' | 'answer' | 'rated';

export default function VocabularyPage() {
  const [cards, setCards] = useState<VocabularyProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>('question');
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    async function loadCards() {
      try {
        const { cards: dueCards } = await linguaflowApi.getVocabularyDue(20);
        setCards(dueCards);
      } catch (error) {
        console.error('Failed to load cards:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCards();
  }, []);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  const speakWord = useCallback((text: string, lang: string = 'fr') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleReveal = () => {
    setCardState('answer');
    if (currentCard?.item.word) {
      speakWord(currentCard.item.word);
    }
  };

  const handleRate = async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!currentCard) return;

    const result: ReviewResult = {
      itemId: currentCard.itemId,
      quality,
      responseTimeMs: 3000, // Simplified
    };

    const newResults = [...results, result];
    setResults(newResults);
    setXpEarned((prev) => prev + (quality >= 3 ? 10 : 5));

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCardState('question');
    } else {
      // Submit all results
      try {
        await linguaflowApi.submitReview(newResults);
      } catch (error) {
        console.error('Failed to submit review:', error);
      }
      setIsComplete(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vocabulary cards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">All Caught Up!</h1>
        <p className="text-muted-foreground mb-6">
          No vocabulary cards are due for review right now.
        </p>
        <Link href="/linguaflow">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = results.filter((r) => r.quality >= 3).length;
    const accuracy = Math.round((correctCount / results.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-6"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
        <p className="text-muted-foreground mb-8">Great job reviewing your vocabulary!</p>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{results.length}</div>
              <div className="text-sm text-muted-foreground">Cards Reviewed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">+{xpEarned}</div>
              <div className="text-sm text-muted-foreground">XP Earned</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/linguaflow">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={() => window.location.reload()}>Review More</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/linguaflow"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
            <Star className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {xpEarned} XP
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2 mb-8" />

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Question Side */}
              <div
                className={cn(
                  'p-8 text-center min-h-[300px] flex flex-col items-center justify-center',
                  cardState === 'question'
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950'
                    : 'hidden'
                )}
              >
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  {currentCard?.item.partOfSpeech}
                </div>
                <h2 className="text-4xl font-bold mb-4">{currentCard?.item.word}</h2>
                {currentCard?.item.pronunciation && (
                  <p className="text-lg text-muted-foreground mb-4">
                    [{currentCard.item.pronunciation}]
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentCard && speakWord(currentCard.item.word)}
                  className="mb-6"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Listen
                </Button>

                <Button size="lg" onClick={handleReveal}>
                  Show Answer
                </Button>
              </div>

              {/* Answer Side */}
              <div
                className={cn(
                  'p-8 min-h-[300px]',
                  cardState === 'answer' ? 'block' : 'hidden'
                )}
              >
                <div className="text-center mb-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {currentCard?.item.word}
                  </div>
                  <h2 className="text-3xl font-bold text-primary mb-2">
                    {currentCard?.item.translation}
                  </h2>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <p className="text-lg italic mb-1">
                    "{currentCard?.item.exampleSentence}"
                  </p>
                  <p className="text-sm text-muted-foreground">
                    "{currentCard?.item.exampleTranslation}"
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {currentCard?.item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Rating Buttons */}
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground mb-2">
                    How well did you know this?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center py-4 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950"
                      onClick={() => handleRate(1)}
                    >
                      <X className="w-5 h-5 text-red-500 mb-1" />
                      <span className="text-xs">Forgot</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center py-4 border-amber-200 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:hover:bg-amber-950"
                      onClick={() => handleRate(3)}
                    >
                      <Lightbulb className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-xs">Hard</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center py-4 border-green-200 hover:bg-green-50 hover:border-green-300 dark:border-green-900 dark:hover:bg-green-950"
                      onClick={() => handleRate(5)}
                    >
                      <Check className="w-5 h-5 text-green-500 mb-1" />
                      <span className="text-xs">Easy</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Keyboard Hints */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          Press <kbd className="px-2 py-1 bg-muted rounded">Space</kbd> to reveal,{' '}
          <kbd className="px-2 py-1 bg-muted rounded">1</kbd>{' '}
          <kbd className="px-2 py-1 bg-muted rounded">2</kbd>{' '}
          <kbd className="px-2 py-1 bg-muted rounded">3</kbd> to rate
        </p>
      </div>
    </div>
  );
}
