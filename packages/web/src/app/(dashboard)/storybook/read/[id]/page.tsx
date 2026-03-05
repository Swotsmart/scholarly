'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Star,
  Sparkles,
  HelpCircle,
  Trophy,
  Library,
} from 'lucide-react';
import Link from 'next/link';
import { storybookApi } from '@/lib/storybook-api';

// =============================================================================
// TYPES — aligned with the interactive-reader.ts backend data model
// =============================================================================

interface WordToken {
  text: string;
  index: number;
  isTargetGPC: boolean;
  startMs: number;
  endMs: number;
}

interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string | null;
  words: WordToken[];
  targetGPCWords: string[];
  durationMs: number;
}

interface StoryData {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  phonicsPhase: number;
  ageGroup: string;
  themes: string[];
  targetGPCs: string[];
  decodabilityScore: number;
  pages: StoryPage[];
}

interface ComprehensionQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

type ReaderMode = 'passive' | 'active';
type ReaderState = 'loading' | 'ready' | 'playing' | 'listening' | 'paused' | 'complete' | 'quiz';

// =============================================================================
// DEMO DATA — used when API is unavailable / DEMO_MODE
// =============================================================================

const DEMO_STORY: StoryData = {
  id: 'demo-story-001',
  title: 'Finn the Fox and the Singing Stream',
  author: 'Ms. Sarah Chen',
  coverImageUrl: null,
  phonicsPhase: 2,
  ageGroup: '4-5',
  themes: ['animals', 'nature', 'music'],
  targetGPCs: ['sh', 'ch', 'th'],
  decodabilityScore: 0.91,
  pages: [
    {
      pageNumber: 1,
      text: 'Finn the fox sat on a big rock by the stream. The sun was hot on his back.',
      illustrationUrl: null,
      targetGPCWords: ['the'],
      durationMs: 6000,
      words: buildWordsFromText('Finn the fox sat on a big rock by the stream. The sun was hot on his back.', ['the'], 6000),
    },
    {
      pageNumber: 2,
      text: 'He shut his eyes and let the rush of the stream sing to him. Shh, shh, shh.',
      illustrationUrl: null,
      targetGPCWords: ['shut', 'shh', 'the', 'rush'],
      durationMs: 7000,
      words: buildWordsFromText('He shut his eyes and let the rush of the stream sing to him. Shh, shh, shh.', ['shut', 'shh', 'the', 'rush'], 7000),
    },
    {
      pageNumber: 3,
      text: 'A thin fish shot up from the stream with a splash! Finn fell off the rock with a thud.',
      illustrationUrl: null,
      targetGPCWords: ['thin', 'the', 'thud', 'shot', 'splash'],
      durationMs: 7500,
      words: buildWordsFromText('A thin fish shot up from the stream with a splash! Finn fell off the rock with a thud.', ['thin', 'the', 'thud', 'shot', 'splash'], 7500),
    },
    {
      pageNumber: 4,
      text: 'The fish had a shell on its back. "That is odd!" said Finn. "A fish with a shell?"',
      illustrationUrl: null,
      targetGPCWords: ['the', 'shell', 'that'],
      durationMs: 7000,
      words: buildWordsFromText('The fish had a shell on its back. "That is odd!" said Finn. "A fish with a shell?"', ['the', 'shell', 'that'], 7000),
    },
    {
      pageNumber: 5,
      text: '"I am a shell-fish," chirped the fish. "I chat and I chomp! Shall we be chums?"',
      illustrationUrl: null,
      targetGPCWords: ['shell', 'chirped', 'the', 'chat', 'chomp', 'shall', 'chums'],
      durationMs: 7500,
      words: buildWordsFromText('"I am a shell-fish," chirped the fish. "I chat and I chomp! Shall we be chums?"', ['shell', 'chirped', 'the', 'chat', 'chomp', 'shall', 'chums'], 7500),
    },
    {
      pageNumber: 6,
      text: 'Finn grinned. "Yes! Shall we sing with the stream?" And so they did, the fox and the shell-fish, singing by the shining stream.',
      illustrationUrl: null,
      targetGPCWords: ['shall', 'the', 'shell', 'shining'],
      durationMs: 9000,
      words: buildWordsFromText('Finn grinned. "Yes! Shall we sing with the stream?" And so they did, the fox and the shell-fish, singing by the shining stream.', ['shall', 'the', 'shell', 'shining'], 9000),
    },
  ],
};

const DEMO_QUESTIONS: ComprehensionQuestion[] = [
  {
    id: 'q1',
    question: 'Where was Finn sitting at the start of the story?',
    options: ['On the grass', 'On a big rock', 'In the stream', 'Under a tree'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'What jumped out of the stream?',
    options: ['A frog', 'A shell-fish', 'A bird', 'A crab'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    question: 'What did Finn and the shell-fish do together?',
    options: ['They raced', 'They danced', 'They sang', 'They swam'],
    correctIndex: 2,
  },
];

/** Build word tokens with evenly distributed timing from plain text */
function buildWordsFromText(text: string, targetGPCWords: string[], totalDurationMs: number): WordToken[] {
  const rawWords = text.split(/\s+/);
  const targetSet = new Set(targetGPCWords.map(w => w.toLowerCase()));
  const msPerWord = totalDurationMs / rawWords.length;
  return rawWords.map((w, i) => ({
    text: w,
    index: i,
    isTargetGPC: targetSet.has(w.toLowerCase().replace(/[^a-z'-]/g, '')),
    startMs: Math.round(i * msPerWord),
    endMs: Math.round((i + 1) * msPerWord),
  }));
}

// =============================================================================
// PAGE ILLUSTRATION PLACEHOLDER
// =============================================================================

const PAGE_COLORS = [
  'from-blue-100 to-sky-200 dark:from-blue-950/40 dark:to-sky-950/40',
  'from-emerald-100 to-teal-200 dark:from-emerald-950/40 dark:to-teal-950/40',
  'from-amber-100 to-orange-200 dark:from-amber-950/40 dark:to-orange-950/40',
  'from-violet-100 to-purple-200 dark:from-violet-950/40 dark:to-purple-950/40',
  'from-rose-100 to-pink-200 dark:from-rose-950/40 dark:to-pink-950/40',
  'from-cyan-100 to-indigo-200 dark:from-cyan-950/40 dark:to-indigo-950/40',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StoryReadPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  // Core state
  const [story, setStory] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [readerState, setReaderState] = useState<ReaderState>('loading');
  const [mode, setMode] = useState<ReaderMode>('passive');

  // Playback / highlight state
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [audioProgress, setAudioProgress] = useState(0);
  const playbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackStartTime = useRef<number>(0);
  const playbackElapsed = useRef<number>(0);

  // Active mode (read-aloud) state
  const [isListening, setIsListening] = useState(false);

  // Reading progress tracking
  const [pagesCompleted, setPagesCompleted] = useState<Set<number>>(new Set());
  const [sessionStartTime] = useState(() => Date.now());

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const totalPages = story?.pages.length ?? 0;
  const page = story?.pages[currentPage] ?? null;
  const progressPercent = totalPages > 0 ? ((pagesCompleted.size) / totalPages) * 100 : 0;

  // ── Data Fetching ──

  useEffect(() => {
    async function loadStory() {
      setIsLoading(true);
      setError(null);
      try {
        const detail = await storybookApi.library.get(storyId);
        // Transform API StoryDetail into our reader StoryData
        // The real API would return full RenderedBook; for now we build from StoryDetail
        if (detail) {
          // If there's no page content from the API, fall back to demo
          const hasContent = detail.body || detail.contentUrl;
          if (!hasContent) {
            setStory({ ...DEMO_STORY, id: detail.id, title: detail.title, author: detail.creator?.displayName ?? 'Unknown' });
          } else {
            // In production, parse the full rendered book here
            setStory({ ...DEMO_STORY, id: detail.id, title: detail.title, author: detail.creator?.displayName ?? 'Unknown' });
          }
        } else {
          setStory(DEMO_STORY);
        }
      } catch {
        // Fallback to demo data when API unavailable
        setStory(DEMO_STORY);
      } finally {
        setIsLoading(false);
        setReaderState('ready');
      }
    }
    loadStory();
  }, [storyId]);

  // ── Karaoke Playback Engine ──

  const stopPlayback = useCallback(() => {
    if (playbackTimer.current) {
      clearInterval(playbackTimer.current);
      playbackTimer.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (!page) return;
    stopPlayback();
    setReaderState('playing');
    playbackStartTime.current = Date.now();
    playbackElapsed.current = 0;

    playbackTimer.current = setInterval(() => {
      const elapsed = Date.now() - playbackStartTime.current;
      playbackElapsed.current = elapsed;
      const progress = Math.min((elapsed / page.durationMs) * 100, 100);
      setAudioProgress(progress);

      // Find current word by timestamp
      const wordIdx = page.words.findIndex(w => elapsed >= w.startMs && elapsed < w.endMs);
      if (wordIdx !== -1) {
        setCurrentWordIndex(wordIdx);
      }

      // Page audio complete
      if (elapsed >= page.durationMs) {
        stopPlayback();
        setCurrentWordIndex(-1);
        setPagesCompleted(prev => new Set(prev).add(currentPage));
        // Auto-advance or complete
        if (currentPage < totalPages - 1) {
          setReaderState('ready');
        } else {
          setReaderState('quiz');
        }
      }
    }, 50); // ~20fps update for smooth highlighting
  }, [page, currentPage, totalPages, stopPlayback]);

  const pausePlayback = useCallback(() => {
    stopPlayback();
    setReaderState('paused');
  }, [stopPlayback]);

  const resumePlayback = useCallback(() => {
    if (!page) return;
    // Simple resume — restart from current position
    startPlayback();
  }, [page, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  // Reset word highlight when page changes
  useEffect(() => {
    stopPlayback();
    setCurrentWordIndex(-1);
    setAudioProgress(0);
    setReaderState(prev => prev === 'quiz' || prev === 'complete' ? prev : 'ready');
  }, [currentPage, stopPlayback]);

  // ── Page Navigation ──

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setPagesCompleted(prev => new Set(prev).add(currentPage));
      setCurrentPage(p => p + 1);
    } else {
      setPagesCompleted(prev => new Set(prev).add(currentPage));
      setReaderState('quiz');
    }
  }, [currentPage, totalPages]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
    }
  }, [currentPage]);

  // ── Read Aloud (Active Mode) ──

  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      setReaderState('ready');
    } else {
      setIsListening(true);
      setReaderState('listening');
      // Placeholder: In production, this would start the Whisper ASR session
      // via the voice service endpoint. For now we simulate after a delay.
      setTimeout(() => {
        setIsListening(false);
        setPagesCompleted(prev => new Set(prev).add(currentPage));
        setReaderState('ready');
      }, 5000);
    }
  }, [isListening, currentPage]);

  // ── Quiz Logic ──

  const questions = DEMO_QUESTIONS;
  const quizScore = useMemo(() => {
    if (!quizSubmitted) return 0;
    return questions.reduce((score, q) => {
      return score + (quizAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [quizSubmitted, quizAnswers, questions]);

  const handleQuizAnswer = (questionId: string, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
  };

  const allQuestionsAnswered = questions.every(q => quizAnswers[q.id] !== undefined && quizAnswers[q.id] !== null);

  const restartBook = () => {
    setCurrentPage(0);
    setPagesCompleted(new Set());
    setQuizAnswers({});
    setQuizSubmitted(false);
    setReaderState('ready');
  };

  // ── Loading State ──

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">{error || 'Story not found'}</p>
        <Button variant="outline" asChild>
          <Link href="/storybook/library">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Link>
        </Button>
      </div>
    );
  }

  // ── Quiz / Completion Screen ──

  if (readerState === 'quiz' || readerState === 'complete') {
    const readingTimeMs = Date.now() - sessionStartTime;
    const readingTimeSec = Math.round(readingTimeMs / 1000);
    const readingTimeMin = Math.floor(readingTimeSec / 60);
    const readingTimeFmt = readingTimeMin > 0
      ? `${readingTimeMin}m ${readingTimeSec % 60}s`
      : `${readingTimeSec}s`;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/storybook/library">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{story.title}</h1>
            <p className="text-sm text-muted-foreground">Comprehension Check</p>
          </div>
        </div>

        {/* Reading Summary */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-green-900 dark:text-green-100">Great Reading!</h2>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You read {pagesCompleted.size} of {totalPages} pages in {readingTimeFmt}
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Comprehension Questions</h2>
          </div>

          {questions.map((q, qi) => {
            const selected = quizAnswers[q.id];
            const isCorrect = quizSubmitted && selected === q.correctIndex;
            const isWrong = quizSubmitted && selected !== null && selected !== undefined && selected !== q.correctIndex;

            return (
              <Card key={q.id} className={quizSubmitted ? (isCorrect ? 'border-green-300 dark:border-green-800' : isWrong ? 'border-red-300 dark:border-red-800' : '') : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                      {qi + 1}
                    </span>
                    {q.question}
                    {quizSubmitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
                    {quizSubmitted && isWrong && <XCircle className="h-5 w-5 text-red-500 ml-auto" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selected === oi;
                      const showCorrect = quizSubmitted && oi === q.correctIndex;
                      const showWrongSelected = quizSubmitted && isSelected && oi !== q.correctIndex;

                      return (
                        <button
                          key={oi}
                          onClick={() => handleQuizAnswer(q.id, oi)}
                          disabled={quizSubmitted}
                          className={`
                            w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium
                            transition-all duration-150
                            ${isSelected && !quizSubmitted ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300' : ''}
                            ${!isSelected && !quizSubmitted ? 'border-muted hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20' : ''}
                            ${showCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' : ''}
                            ${showWrongSelected ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' : ''}
                            ${quizSubmitted && !showCorrect && !showWrongSelected ? 'opacity-50' : ''}
                            disabled:cursor-default
                          `}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quiz Actions */}
        <div className="flex items-center justify-between">
          {!quizSubmitted ? (
            <Button
              onClick={submitQuiz}
              disabled={!allQuestionsAnswered}
              size="lg"
              className="w-full"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Check Answers
            </Button>
          ) : (
            <div className="w-full space-y-4">
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {Array.from({ length: questions.length }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-8 w-8 ${i < quizScore ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`}
                      />
                    ))}
                  </div>
                  <p className="text-lg font-semibold">
                    {quizScore === questions.length
                      ? 'Perfect Score!'
                      : quizScore >= questions.length / 2
                        ? 'Well Done!'
                        : 'Keep Practising!'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quizScore} out of {questions.length} correct
                  </p>
                </CardContent>
              </Card>
              <div className="flex gap-3">
                <Button variant="outline" onClick={restartBook} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Read Again
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/storybook/library">
                    <Library className="h-4 w-4 mr-2" />
                    Back to Library
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main Reader View ──

  const pageColor = PAGE_COLORS[currentPage % PAGE_COLORS.length];

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/storybook/library">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{story.title}</h1>
            <p className="text-xs text-muted-foreground">by {story.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Phase {story.phonicsPhase}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {story.decodabilityScore ? `${Math.round(story.decodabilityScore * 100)}% decodable` : story.ageGroup}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Page {currentPage + 1} of {totalPages}
        </span>
        <Progress value={((currentPage + 1) / totalPages) * 100} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {pagesCompleted.size} read
        </span>
      </div>

      {/* Reading Area */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Illustration Panel */}
        <div className="order-1">
          <div
            className={`
              relative aspect-[4/3] rounded-2xl overflow-hidden
              bg-gradient-to-br ${pageColor}
              flex items-center justify-center
              shadow-inner
            `}
          >
            {page?.illustrationUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.illustrationUrl}
                alt={`Illustration for page ${currentPage + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                <BookOpen className="h-20 w-20" />
                <span className="text-sm font-medium">Page {currentPage + 1}</span>
              </div>
            )}

            {/* Page Navigation Overlays — large touch targets */}
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="absolute left-0 top-0 bottom-0 w-1/5 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity disabled:hidden"
              aria-label="Previous page"
            >
              <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                <ChevronLeft className="h-6 w-6 text-white" />
              </div>
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1 && pagesCompleted.has(currentPage)}
              className="absolute right-0 top-0 bottom-0 w-1/5 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity disabled:hidden"
              aria-label="Next page"
            >
              <div className="h-12 w-12 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                <ChevronRight className="h-6 w-6 text-white" />
              </div>
            </button>

            {/* Audio progress indicator overlay */}
            {readerState === 'playing' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                <div
                  className="h-full bg-white/70 transition-all duration-100 ease-linear"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            )}

            {/* Listening indicator */}
            {readerState === 'listening' && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
                  <Mic className="h-3.5 w-3.5" />
                  Listening...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text & Controls Panel */}
        <div className="order-2 flex flex-col gap-4">
          {/* GPC Targets */}
          {story.targetGPCs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Target sounds:</span>
              {story.targetGPCs.map(gpc => (
                <Badge key={gpc} className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-mono">
                  {gpc}
                </Badge>
              ))}
            </div>
          )}

          {/* Story Text with Word Highlighting */}
          <Card className="flex-1">
            <CardContent className="p-6">
              <div
                className="leading-[2.2] text-xl sm:text-2xl font-sans tracking-wide"
                style={{ wordSpacing: '0.15em' }}
                role="article"
                aria-label={`Page ${currentPage + 1} text`}
              >
                {page?.words.map((word, wi) => {
                  const isActive = wi === currentWordIndex;
                  const isHighlighted = readerState === 'playing' && currentWordIndex >= 0 && wi <= currentWordIndex;
                  const isTarget = word.isTargetGPC;

                  return (
                    <span key={wi}>
                      <span
                        className={`
                          inline-block px-0.5 py-0.5 rounded transition-all duration-150
                          ${isActive && isTarget ? 'bg-green-300 dark:bg-green-700 text-green-950 dark:text-green-50 scale-110 font-bold' : ''}
                          ${isActive && !isTarget ? 'bg-yellow-300 dark:bg-yellow-700 text-yellow-950 dark:text-yellow-50 scale-105 font-semibold' : ''}
                          ${!isActive && isHighlighted ? 'text-muted-foreground/60' : ''}
                          ${!isActive && !isHighlighted && isTarget ? 'text-green-700 dark:text-green-400 font-medium underline decoration-green-300 dark:decoration-green-700 decoration-2 underline-offset-4' : ''}
                          ${!isActive && !isHighlighted && !isTarget ? '' : ''}
                        `}
                      >
                        {word.text}
                      </span>
                      {wi < (page?.words.length ?? 0) - 1 && ' '}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'passive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('passive'); stopPlayback(); setReaderState('ready'); setIsListening(false); }}
              className="flex-1"
            >
              <Volume2 className="h-4 w-4 mr-1.5" />
              Read to Me
            </Button>
            <Button
              variant={mode === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('active'); stopPlayback(); setReaderState('ready'); }}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-1.5" />
              I Will Read
            </Button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            {mode === 'passive' ? (
              <>
                {readerState === 'playing' ? (
                  <Button onClick={pausePlayback} size="lg" variant="outline" className="flex-1 h-14 text-base">
                    <Pause className="h-6 w-6 mr-2" />
                    Pause
                  </Button>
                ) : readerState === 'paused' ? (
                  <Button onClick={resumePlayback} size="lg" className="flex-1 h-14 text-base">
                    <Play className="h-6 w-6 mr-2" />
                    Continue
                  </Button>
                ) : (
                  <Button onClick={startPlayback} size="lg" className="flex-1 h-14 text-base">
                    <Play className="h-6 w-6 mr-2" />
                    Play
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={toggleListening}
                size="lg"
                variant={isListening ? 'destructive' : 'default'}
                className="flex-1 h-14 text-base"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-6 w-6 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6 mr-2" />
                    Start Reading
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="h-12 w-12 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center justify-center gap-1.5">
              {story.pages.map((_, pi) => (
                <button
                  key={pi}
                  onClick={() => { stopPlayback(); setCurrentPage(pi); }}
                  className={`
                    h-2.5 rounded-full transition-all duration-200
                    ${pi === currentPage ? 'w-8 bg-primary' : pagesCompleted.has(pi) ? 'w-2.5 bg-green-400 dark:bg-green-600' : 'w-2.5 bg-muted-foreground/20 hover:bg-muted-foreground/40'}
                  `}
                  aria-label={`Go to page ${pi + 1}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className="h-12 w-12 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Target Words for This Page */}
          {page && page.targetGPCWords.length > 0 && (
            <div className="rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 p-3">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
                Phonics focus on this page:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(page.targetGPCWords)].map(word => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-sm font-mono"
                  >
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
