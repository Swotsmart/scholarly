'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  FileText,
  MessageSquare,
  Sparkles,
  Clock,
  Target,
  Edit,
  Save,
  Trash2,
  Plus,
  Send,
  PlayCircle,
  PanelLeftClose,
  PanelLeft,
  Download,
  Share2,
  Flag,
  Lightbulb,
  HelpCircle,
  Lock,
  Subtitles,
  FastForward,
  Rewind,
  Code,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'interactive' | 'assignment';
  completed: boolean;
  locked: boolean;
  moduleId: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Note {
  id: string;
  timestamp?: number;
  content: string;
  createdAt: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface LessonContent {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'reading' | 'quiz' | 'interactive' | 'assignment';
  duration: string;
  videoUrl?: string;
  transcript?: string;
  content?: string;
  quizQuestions?: QuizQuestion[];
  codeExercise?: {
    language: string;
    starterCode: string;
    solution: string;
    instructions: string;
  };
}

// Mock data
const LESSON_DATA: LessonContent = {
  id: 'lesson_10',
  title: 'Creating Problem Statements',
  description: 'Learn how to synthesize your research into clear, actionable problem statements that guide your design process.',
  type: 'video',
  duration: '15 min',
  videoUrl: 'https://example.com/video.mp4',
  transcript: `In this lesson, we'll learn how to create effective problem statements that guide our design thinking process.

A good problem statement is:
1. Human-centered - focused on the user's needs
2. Broad enough to allow creative freedom
3. Narrow enough to be actionable
4. Based on your research insights

The format we'll use is:
"[User] needs [need] because [insight]"

For example:
"Busy parents need a way to quickly find healthy meal options because they have limited time to plan and prepare nutritious food for their families."

Let's practice creating problem statements based on our empathy maps and research findings...`,
};

const MODULES_DATA: Module[] = [
  {
    id: 'module_1',
    title: 'Introduction to Design Thinking',
    lessons: [
      { id: 'lesson_1', title: 'What is Design Thinking?', duration: '10 min', type: 'video', completed: true, locked: false, moduleId: 'module_1' },
      { id: 'lesson_2', title: 'The History of Design Thinking', duration: '8 min', type: 'video', completed: true, locked: false, moduleId: 'module_1' },
      { id: 'lesson_3', title: 'Why Design Thinking Matters', duration: '12 min', type: 'reading', completed: true, locked: false, moduleId: 'module_1' },
      { id: 'lesson_4', title: 'Module Quiz', duration: '15 min', type: 'quiz', completed: true, locked: false, moduleId: 'module_1' },
    ],
  },
  {
    id: 'module_2',
    title: 'Empathize: Understanding Users',
    lessons: [
      { id: 'lesson_5', title: 'The Art of Empathy', duration: '15 min', type: 'video', completed: true, locked: false, moduleId: 'module_2' },
      { id: 'lesson_6', title: 'User Interview Techniques', duration: '20 min', type: 'video', completed: true, locked: false, moduleId: 'module_2' },
      { id: 'lesson_7', title: 'Observation Methods', duration: '15 min', type: 'reading', completed: true, locked: false, moduleId: 'module_2' },
      { id: 'lesson_8', title: 'Creating Empathy Maps', duration: '25 min', type: 'interactive', completed: true, locked: false, moduleId: 'module_2' },
    ],
  },
  {
    id: 'module_3',
    title: 'Define: Framing the Problem',
    lessons: [
      { id: 'lesson_9', title: 'Synthesizing User Research', duration: '18 min', type: 'video', completed: true, locked: false, moduleId: 'module_3' },
      { id: 'lesson_10', title: 'Creating Problem Statements', duration: '15 min', type: 'video', completed: false, locked: false, moduleId: 'module_3' },
      { id: 'lesson_11', title: 'Point of View Statements', duration: '12 min', type: 'reading', completed: false, locked: false, moduleId: 'module_3' },
      { id: 'lesson_12', title: 'Define Exercise', duration: '15 min', type: 'assignment', completed: false, locked: false, moduleId: 'module_3' },
    ],
  },
  {
    id: 'module_4',
    title: 'Ideate: Generating Solutions',
    lessons: [
      { id: 'lesson_13', title: 'Brainstorming Techniques', duration: '20 min', type: 'video', completed: false, locked: true, moduleId: 'module_4' },
      { id: 'lesson_14', title: 'Crazy 8s Method', duration: '15 min', type: 'interactive', completed: false, locked: true, moduleId: 'module_4' },
    ],
  },
];

const INITIAL_NOTES: Note[] = [
  {
    id: 'note_1',
    timestamp: 125,
    content: 'Key insight: Problem statements should be human-centered and focused on user needs.',
    createdAt: '2 days ago',
  },
  {
    id: 'note_2',
    content: 'Remember the format: [User] needs [need] because [insight]',
    createdAt: '2 days ago',
  },
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What is the recommended format for a problem statement?',
    options: [
      'Problem: Solution: Result',
      '[User] needs [need] because [insight]',
      'If [situation], then [outcome]',
      'We believe [user] will [action]',
    ],
    correctAnswer: 1,
    explanation: 'The human-centered format "[User] needs [need] because [insight]" keeps the focus on user needs while incorporating research insights.',
  },
  {
    id: 'q2',
    question: 'Which of the following is NOT a characteristic of a good problem statement?',
    options: [
      'Human-centered',
      'Based on research insights',
      'Includes the solution',
      'Broad enough for creativity',
    ],
    correctAnswer: 2,
    explanation: 'A good problem statement should NOT include the solution. It should frame the problem while leaving room for creative exploration.',
  },
];

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Lesson type icon
function getLessonIcon(type: Lesson['type'], className?: string) {
  const iconClass = className || 'h-4 w-4';
  switch (type) {
    case 'video':
      return <PlayCircle className={iconClass} />;
    case 'reading':
      return <FileText className={iconClass} />;
    case 'quiz':
      return <Target className={iconClass} />;
    case 'interactive':
      return <Sparkles className={iconClass} />;
    case 'assignment':
      return <FileText className={iconClass} />;
    default:
      return <BookOpen className={iconClass} />;
  }
}

// Video Player Component
function VideoPlayer({
  onTimeUpdate,
  currentTime,
}: {
  onTimeUpdate: (time: number) => void;
  currentTime: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [showControls, setShowControls] = useState(true);
  const totalDuration = 900; // 15 minutes in seconds
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (parseFloat(playbackSpeed) / totalDuration) * 100;
          if (newProgress >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const newTime = (newProgress / 100) * totalDuration;
          onTimeUpdate(newTime);
          return newProgress;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onTimeUpdate, totalDuration]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newProgress = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.max(0, Math.min(100, newProgress)));
    onTimeUpdate((newProgress / 100) * totalDuration);
  };

  const skip = (seconds: number) => {
    const newProgress = progress + (seconds / totalDuration) * 100;
    setProgress(Math.max(0, Math.min(100, newProgress)));
    onTimeUpdate((newProgress / 100) * totalDuration);
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black aspect-video rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(!isPlaying)}
    >
      {/* Video placeholder */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <PlayCircle className="h-20 w-20 text-white/30 mx-auto" />
          <p className="text-white/50 mt-4">Video content will play here</p>
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <h3 className="text-white font-medium">Creating Problem Statements</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowCaptions(!showCaptions)}
            >
              <Subtitles className={cn('h-5 w-5', showCaptions && 'text-primary')} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/20">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Quality: Auto (720p)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPlaybackSpeed('0.5')}>
                  Speed: 0.5x {playbackSpeed === '0.5' && '(selected)'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlaybackSpeed('1')}>
                  Speed: 1x {playbackSpeed === '1' && '(selected)'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlaybackSpeed('1.5')}>
                  Speed: 1.5x {playbackSpeed === '1.5' && '(selected)'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlaybackSpeed('2')}>
                  Speed: 2x {playbackSpeed === '2' && '(selected)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Center play button */}
        {!isPlaying && (
          <button
            className="absolute inset-0 flex items-center justify-center"
            onClick={() => setIsPlaying(true)}
          >
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform">
              <Play className="h-10 w-10 text-white ml-1" />
            </div>
          </button>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress bar */}
          <div
            className="h-1.5 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/20"
                onClick={() => skip(-10)}
              >
                <Rewind className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/20"
                onClick={() => skip(10)}
              >
                <FastForward className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <span className="text-white text-sm ml-2">
                {formatTime((progress / 100) * totalDuration)} / {formatTime(totalDuration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {playbackSpeed}x
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Captions */}
      {showCaptions && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
          <div className="bg-black/80 text-white px-4 py-2 rounded text-center max-w-2xl">
            A good problem statement is human-centered and focused on user needs...
          </div>
        </div>
      )}
    </div>
  );
}

// Notes Panel Component
function NotesPanel({
  notes,
  onAddNote,
  onDeleteNote,
  currentTime,
}: {
  notes: Note[];
  onAddNote: (note: string, timestamp?: number) => void;
  onDeleteNote: (id: string) => void;
  currentTime: number;
}) {
  const [newNote, setNewNote] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote, includeTimestamp ? currentTime : undefined);
      setNewNote('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">My Notes</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No notes yet. Add your first note below!
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
              {note.timestamp !== undefined && (
                <button className="text-xs text-primary hover:underline">
                  {formatTime(note.timestamp)}
                </button>
              )}
              <p className="text-sm">{note.content}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{note.createdAt}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t space-y-3">
        <Textarea
          placeholder="Add a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="rounded"
            />
            Include timestamp ({formatTime(currentTime)})
          </label>
          <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}

// AI Help Panel Component
function AIHelpPanel({ lessonContent }: { lessonContent: string }) {
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI learning assistant. I can help you understand this lesson better. Feel free to ask me questions about problem statements, design thinking, or anything else covered in this content.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    'Can you give me more examples of problem statements?',
    'How do I know if my problem statement is good?',
    'What common mistakes should I avoid?',
  ];

  const handleSend = (message: string) => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Great question! Based on this lesson, a good problem statement should follow the format: "[User] needs [need] because [insight]". This keeps the focus on the user while incorporating your research findings. Would you like me to help you practice creating one?',
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Learning Assistant
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs text-muted-foreground">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                className="text-xs bg-muted hover:bg-muted/80 rounded-full px-3 py-1.5 transition-colors"
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about this lesson..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          />
          <Button size="icon" onClick={() => handleSend(input)} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Quiz Component
function QuizSection({ questions }: { questions: QuizQuestion[] }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const question = questions[currentQuestion];

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === question.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Knowledge Check</CardTitle>
          <Badge variant="outline">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={cn(
                'w-full text-left p-4 rounded-lg border transition-colors',
                selectedAnswer === null && 'hover:bg-muted/50',
                showResult && index === question.correctAnswer && 'border-green-500 bg-green-500/10',
                showResult && selectedAnswer === index && index !== question.correctAnswer && 'border-red-500 bg-red-500/10',
                selectedAnswer === index && !showResult && 'border-primary'
              )}
              onClick={() => !showResult && handleAnswer(index)}
              disabled={showResult}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm',
                    showResult && index === question.correctAnswer && 'border-green-500 text-green-500',
                    showResult && selectedAnswer === index && index !== question.correctAnswer && 'border-red-500 text-red-500'
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        {showResult && (
          <div className={cn(
            'p-4 rounded-lg',
            selectedAnswer === question.correctAnswer ? 'bg-green-500/10' : 'bg-amber-500/10'
          )}>
            <p className="font-medium mb-1">
              {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Not quite...'}
            </p>
            <p className="text-sm text-muted-foreground">{question.explanation}</p>
          </div>
        )}

        {showResult && currentQuestion < questions.length - 1 && (
          <Button onClick={handleNext} className="w-full">
            Next Question
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {showResult && currentQuestion === questions.length - 1 && (
          <div className="text-center py-4">
            <p className="text-lg font-semibold">Quiz Complete!</p>
            <p className="text-muted-foreground">
              You scored {score} out of {questions.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LessonPlayerPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'notes' | 'ai'>('notes');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [currentTime, setCurrentTime] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['module_3']));

  // Find current and next/prev lessons
  const allLessons = MODULES_DATA.flatMap((m) => m.lessons);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === params.id);
  const currentLesson = allLessons[currentLessonIndex];
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const handleAddNote = (content: string, timestamp?: number) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      content,
      timestamp,
      createdAt: 'Just now',
    };
    setNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const completedCount = allLessons.filter((l) => l.completed).length;
  const progress = (completedCount / allLessons.length) * 100;

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Left Sidebar - Lesson List */}
      <div
        className={cn(
          'border-r bg-background transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-80' : 'w-0'
        )}
      >
        {sidebarOpen && (
          <>
            {/* Course header */}
            <div className="p-4 border-b">
              <Link
                href="/learning/courses/course_1"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Course
              </Link>
              <h2 className="font-semibold mt-2">Introduction to Design Thinking</h2>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Module list */}
            <div className="flex-1 overflow-y-auto">
              {MODULES_DATA.map((module) => {
                const moduleCompleted = module.lessons.filter((l) => l.completed).length;
                const isExpanded = expandedModules.has(module.id);

                return (
                  <div key={module.id} className="border-b">
                    <button
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium text-sm">{module.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {moduleCompleted}/{module.lessons.length}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="pb-2">
                        {module.lessons.map((lesson) => (
                          <Link
                            key={lesson.id}
                            href={lesson.locked ? '#' : `/learning/lesson/${lesson.id}`}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                              lesson.id === params.id && 'bg-primary/10 text-primary',
                              lesson.locked && 'opacity-50 cursor-not-allowed',
                              !lesson.locked && lesson.id !== params.id && 'hover:bg-muted/50'
                            )}
                            onClick={(e) => lesson.locked && e.preventDefault()}
                          >
                            <div className="flex-shrink-0">
                              {lesson.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : lesson.locked ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : lesson.id === params.id ? (
                                <Play className="h-4 w-4 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="line-clamp-1">{lesson.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {lesson.duration}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeft className="h-5 w-5" />
              )}
            </Button>
            <span className="font-medium">{LESSON_DATA.title}</span>
            <Badge variant="outline" className="ml-2">
              {LESSON_DATA.duration}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={rightPanelOpen && rightPanelTab === 'notes' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setRightPanelTab('notes');
                setRightPanelOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Notes
            </Button>
            <Button
              variant={rightPanelOpen && rightPanelTab === 'ai' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setRightPanelTab('ai');
                setRightPanelOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Help
            </Button>
            {rightPanelOpen && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRightPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Video player */}
            <VideoPlayer onTimeUpdate={setCurrentTime} currentTime={currentTime} />

            {/* Lesson description */}
            <div>
              <h1 className="text-2xl font-bold">{LESSON_DATA.title}</h1>
              <p className="text-muted-foreground mt-2">{LESSON_DATA.description}</p>
            </div>

            {/* Tabs for content */}
            <Tabs defaultValue="transcript">
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="discussion">Discussion</TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {LESSON_DATA.transcript?.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Problem Statement Template</p>
                          <p className="text-sm text-muted-foreground">PDF - 450 KB</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Example Problem Statements</p>
                          <p className="text-sm text-muted-foreground">PDF - 320 KB</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discussion" className="mt-4">
                <Card>
                  <CardContent className="p-6 text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="mt-4 font-semibold">Discussion Forum</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ask questions and discuss this lesson with other learners.
                    </p>
                    <Button className="mt-4">Start a Discussion</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Knowledge Check Quiz */}
            <QuizSection questions={QUIZ_QUESTIONS} />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
              {prevLesson ? (
                <Button variant="outline" asChild>
                  <Link href={`/learning/lesson/${prevLesson.id}`}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous: {prevLesson.title}
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              {nextLesson ? (
                <Button asChild>
                  <Link href={nextLesson.locked ? '#' : `/learning/lesson/${nextLesson.id}`}>
                    Next: {nextLesson.title}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Course
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Notes / AI Help */}
      <div
        className={cn(
          'border-l bg-background transition-all duration-300',
          rightPanelOpen ? 'w-96' : 'w-0'
        )}
      >
        {rightPanelOpen && (
          rightPanelTab === 'notes' ? (
            <NotesPanel
              notes={notes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              currentTime={currentTime}
            />
          ) : (
            <AIHelpPanel lessonContent={LESSON_DATA.transcript || ''} />
          )
        )}
      </div>
    </div>
  );
}
