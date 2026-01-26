'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Lightbulb,
  SkipForward,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
  Timer,
  Target,
  BookOpen,
  CheckCircle2,
  Circle,
  MessageSquare,
  User,
  Bot,
  Star,
  Headphones,
  Glasses,
  Monitor,
  Box,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

type ConversationMessage = {
  id: string;
  speaker: 'learner' | 'character';
  text: string;
  translation: string;
  pronunciationScore?: number;
  phonemeScores?: { phoneme: string; score: number }[];
  timestamp: string;
};

type VocabularyItem = {
  word: string;
  translation: string;
  encountered: boolean;
};

type Objective = {
  id: string;
  text: string;
  completed: boolean;
};

type SessionData = {
  scenarioId: string;
  scenarioTitle: string;
  language: string;
  languageFlag: string;
  cefrLevel: string;
  activeTier: string;
  characterName: string;
  characterRole: string;
  characterMood: string;
  sceneDescription: string;
  currentScore: number;
  maxScore: number;
  hintsRemaining: number;
  hintsUsed: number;
  totalObjectives: number;
  elapsedSeconds: number;
  conversation: ConversationMessage[];
  vocabulary: VocabularyItem[];
  objectives: Objective[];
  latestPronunciation: {
    text: string;
    overallScore: number;
    phonemes: { phoneme: string; score: number }[];
  };
};

const MOCK_SESSION: SessionData = {
  scenarioId: 'cafe-parisien',
  scenarioTitle: 'Caf\u00e9 Parisien',
  language: 'French',
  languageFlag: '\ud83c\uddeb\ud83c\uddf7',
  cefrLevel: 'A2',
  activeTier: 'VR',
  characterName: 'Pierre',
  characterRole: 'Waiter at Caf\u00e9 de la Paix',
  characterMood: 'Friendly and patient',
  sceneDescription:
    'You are seated at a marble-topped table in the corner of Caf\u00e9 de la Paix, a traditional Parisian caf\u00e9 on the Left Bank. Warm afternoon light streams through lace curtains. The aroma of fresh coffee and baked pastries fills the air. A chalkboard behind the zinc counter displays the day\u2019s specials. Pierre, your waiter, approaches with a small notepad and a welcoming smile.',
  currentScore: 340,
  maxScore: 500,
  hintsRemaining: 2,
  hintsUsed: 1,
  totalObjectives: 6,
  elapsedSeconds: 487,
  conversation: [
    {
      id: 'msg-1',
      speaker: 'character',
      text: 'Bonjour et bienvenue au Caf\u00e9 de la Paix ! Je m\u2019appelle Pierre et je serai votre serveur aujourd\u2019hui. Voici le menu. Avez-vous d\u00e9j\u00e0 une id\u00e9e de ce que vous aimeriez commander ?',
      translation:
        'Hello and welcome to Caf\u00e9 de la Paix! My name is Pierre and I will be your waiter today. Here is the menu. Do you already have an idea of what you would like to order?',
      timestamp: '00:12',
    },
    {
      id: 'msg-2',
      speaker: 'learner',
      text: 'Bonjour Pierre ! Oui, je voudrais un caf\u00e9 cr\u00e8me et un croissant, s\u2019il vous pla\u00eet.',
      translation: 'Hello Pierre! Yes, I would like a caf\u00e9 cr\u00e8me and a croissant, please.',
      pronunciationScore: 87,
      phonemeScores: [
        { phoneme: 'b\u0254\u0303\u0292u\u0281', score: 92 },
        { phoneme: 'vud\u0281\u025b', score: 84 },
        { phoneme: 'k\u0281wa.s\u0251\u0303', score: 78 },
        { phoneme: 'sil.vu.pl\u025b', score: 95 },
      ],
      timestamp: '00:34',
    },
    {
      id: 'msg-3',
      speaker: 'character',
      text: 'Excellent choix ! Un caf\u00e9 cr\u00e8me et un croissant. Nous avons aussi des pains au chocolat tout frais ce matin. Est-ce que cela vous tente ?',
      translation:
        'Excellent choice! A caf\u00e9 cr\u00e8me and a croissant. We also have fresh pains au chocolat this morning. Would you be tempted by that?',
      timestamp: '00:48',
    },
    {
      id: 'msg-4',
      speaker: 'learner',
      text: 'Oh oui, pourquoi pas ! Je vais prendre un pain au chocolat aussi. Combien \u00e7a co\u00fbte en tout ?',
      translation: 'Oh yes, why not! I will take a pain au chocolat as well. How much does it cost in total?',
      pronunciationScore: 82,
      phonemeScores: [
        { phoneme: 'pu\u0281.kwa.pa', score: 88 },
        { phoneme: 'p\u025b\u0303.o.\u0283o.ko.la', score: 75 },
        { phoneme: 'k\u0254\u0303.bj\u025b\u0303', score: 80 },
        { phoneme: 'ku.t\u0259', score: 85 },
      ],
      timestamp: '01:15',
    },
  ],
  vocabulary: [
    { word: 'serveur', translation: 'waiter', encountered: true },
    { word: 'commander', translation: 'to order', encountered: true },
    { word: 'caf\u00e9 cr\u00e8me', translation: 'coffee with cream', encountered: true },
    { word: 'croissant', translation: 'croissant', encountered: true },
    { word: 'pain au chocolat', translation: 'chocolate pastry', encountered: true },
    { word: 'l\u2019addition', translation: 'the bill', encountered: false },
    { word: 'pourboire', translation: 'tip', encountered: false },
    { word: 'carte bancaire', translation: 'bank card', encountered: false },
  ],
  objectives: [
    { id: 'obj-1', text: 'Greet the waiter in French', completed: true },
    { id: 'obj-2', text: 'Order a drink from the menu', completed: true },
    { id: 'obj-3', text: 'Order a food item', completed: true },
    { id: 'obj-4', text: 'Ask about the price', completed: true },
    { id: 'obj-5', text: 'Request the bill', completed: false },
    { id: 'obj-6', text: 'Pay and leave a tip', completed: false },
  ],
  latestPronunciation: {
    text: 'Combien \u00e7a co\u00fbte en tout',
    overallScore: 82,
    phonemes: [
      { phoneme: 'k\u0254\u0303', score: 90 },
      { phoneme: 'bj\u025b\u0303', score: 78 },
      { phoneme: 'sa', score: 85 },
      { phoneme: 'ku', score: 80 },
      { phoneme: 't\u0259', score: 88 },
      { phoneme: '\u0251\u0303', score: 72 },
      { phoneme: 'tu', score: 84 },
    ],
  },
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const scoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const scoreBg = (score: number) => {
  if (score >= 90) return 'bg-green-500/10';
  if (score >= 75) return 'bg-amber-500/10';
  return 'bg-red-500/10';
};

const tierIcon = (tier: string) => {
  switch (tier) {
    case 'VR':
      return <Headphones className="h-4 w-4" />;
    case 'AR':
      return <Glasses className="h-4 w-4" />;
    case '3D':
      return <Box className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

const tierBadgeClass = (tier: string) => {
  switch (tier) {
    case 'VR':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'AR':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

export default function ActiveImmersionSessionPage() {
  const params = useParams();
  const [session, setSession] = useState<SessionData>(MOCK_SESSION);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(session.elapsedSeconds);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.conversation]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleSpeak = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      const newMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        speaker: 'learner',
        text: "Oui, l'addition s'il vous pla\u00eet. Est-ce que vous acceptez la carte bancaire ?",
        translation: 'Yes, the bill please. Do you accept bank cards?',
        pronunciationScore: 79,
        phonemeScores: [
          { phoneme: 'la.di.sj\u0254\u0303', score: 82 },
          { phoneme: 'sil.vu.pl\u025b', score: 91 },
          { phoneme: 'ka\u0281t.b\u0251\u0303.k\u025b\u0281', score: 73 },
        ],
        timestamp: formatTime(elapsedSeconds),
      };
      setSession((prev) => ({
        ...prev,
        conversation: [...prev.conversation, newMessage],
        currentScore: prev.currentScore + 45,
        objectives: prev.objectives.map((obj) =>
          obj.id === 'obj-5' ? { ...obj, completed: true } : obj
        ),
        latestPronunciation: {
          text: newMessage.text,
          overallScore: 79,
          phonemes: newMessage.phonemeScores || [],
        },
        vocabulary: prev.vocabulary.map((v) =>
          v.word === "l'addition" || v.word === 'carte bancaire'
            ? { ...v, encountered: true }
            : v
        ),
      }));

      setTimeout(() => {
        const characterResponse: ConversationMessage = {
          id: `msg-${Date.now() + 1}`,
          speaker: 'character',
          text: 'Bien s\u00fbr ! Alors, un caf\u00e9 cr\u00e8me, un croissant et un pain au chocolat\u2026 \u00c7a fait 11 euros 50. Oui, nous acceptons la carte. Voici le terminal.',
          translation:
            'Of course! So, a caf\u00e9 cr\u00e8me, a croissant and a pain au chocolat... That comes to 11 euros 50. Yes, we accept card. Here is the terminal.',
          timestamp: formatTime(elapsedSeconds + 3),
        };
        setSession((prev) => ({
          ...prev,
          conversation: [...prev.conversation, characterResponse],
        }));
      }, 2000);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    const newMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      speaker: 'learner',
      text: inputText,
      translation: '(User typed response)',
      pronunciationScore: undefined,
      timestamp: formatTime(elapsedSeconds),
    };
    setSession((prev) => ({
      ...prev,
      conversation: [...prev.conversation, newMessage],
      currentScore: prev.currentScore + 30,
    }));
    setInputText('');
  };

  const handleUseHint = () => {
    if (session.hintsRemaining <= 0) return;
    setHintText(
      'Try asking for the bill: "L\'addition, s\'il vous pla\u00eet." You can also ask if they accept card payments.'
    );
    setShowHint(true);
    setSession((prev) => ({
      ...prev,
      hintsRemaining: prev.hintsRemaining - 1,
      hintsUsed: prev.hintsUsed + 1,
    }));
  };

  const completedObjectives = session.objectives.filter((o) => o.completed).length;
  const progressPercent = (completedObjectives / session.objectives.length) * 100;

  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/linguaflow/immersion">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Session
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {session.languageFlag} {session.scenarioTitle}
              </h1>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                {session.cefrLevel}
              </Badge>
              <Badge variant="outline" className={tierBadgeClass(session.activeTier)}>
                {tierIcon(session.activeTier)}
                <span className="ml-1">{session.activeTier}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {session.language} Immersion Session
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg font-semibold">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Session Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedObjectives}/{session.objectives.length} objectives completed
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left Column: Scene + Conversation */}
        <div className="space-y-4">
          {/* Scene Description */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Current Scene</CardTitle>
                  <CardDescription>{session.characterRole}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {session.characterMood}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4 mb-3">
                <p className="text-sm leading-relaxed">{session.sceneDescription}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{session.characterName}</p>
                    <p className="text-xs text-muted-foreground">{session.characterRole}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Panel */}
          <Card className="flex flex-col" style={{ minHeight: '400px' }}>
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 pb-2">
              {session.conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker === 'learner' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.speaker === 'learner'
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                        : 'bg-muted rounded-2xl rounded-bl-md'
                    } p-4`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.speaker === 'character' ? (
                        <Bot className="h-3.5 w-3.5 opacity-70" />
                      ) : (
                        <User className="h-3.5 w-3.5 opacity-70" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.speaker === 'character' ? session.characterName : 'You'} - {message.timestamp}
                      </span>
                      {message.pronunciationScore !== undefined && (
                        <Badge
                          variant="outline"
                          className={`ml-auto text-xs ${
                            message.pronunciationScore >= 85
                              ? 'bg-green-500/20 text-green-100 border-green-400/30'
                              : message.pronunciationScore >= 70
                              ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
                              : 'bg-red-500/20 text-red-100 border-red-400/30'
                          }`}
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          {message.pronunciationScore}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p
                      className={`text-xs mt-2 pt-2 border-t ${
                        message.speaker === 'learner'
                          ? 'border-primary-foreground/20 opacity-70'
                          : 'border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {message.translation}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </CardContent>

            {/* Hint Display */}
            {showHint && (
              <div className="mx-4 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Hint</p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">{hintText}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => setShowHint(false)}
                  >
                    &times;
                  </Button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={handleSpeak}
                  className="flex-shrink-0"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Type your response in French..."
                  className="flex-1"
                />
                <Button onClick={handleUseHint} variant="outline" size="sm" disabled={session.hintsRemaining <= 0}>
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Hint ({session.hintsRemaining})
                </Button>
                <Button onClick={() => {}} variant="outline" size="sm">
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
          </Card>

          {/* Session Controls Footer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href="/linguaflow/immersion">
                    <Button variant="destructive" size="sm">
                      <Square className="h-4 w-4 mr-2" />
                      End Session
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {isMuted ? 'Audio muted' : 'Audio on'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Score Tracker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <p className="text-4xl font-bold text-primary">{session.currentScore}</p>
                <p className="text-sm text-muted-foreground">out of {session.maxScore} possible</p>
              </div>
              <Progress
                value={(session.currentScore / session.maxScore) * 100}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                {Math.round((session.currentScore / session.maxScore) * 100)}% of maximum score
              </p>
            </CardContent>
          </Card>

          {/* Objectives Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Objectives
              </CardTitle>
              <CardDescription>
                {completedObjectives}/{session.objectives.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {session.objectives.map((objective) => (
                  <div key={objective.id} className="flex items-start gap-2.5">
                    {objective.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        objective.completed ? 'text-green-700 dark:text-green-400 line-through' : ''
                      }`}
                    >
                      {objective.text}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vocabulary Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                Vocabulary
              </CardTitle>
              <CardDescription>
                {session.vocabulary.filter((v) => v.encountered).length}/{session.vocabulary.length} words encountered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {session.vocabulary.map((item) => (
                  <div
                    key={item.word}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                      item.encountered
                        ? 'bg-green-500/5 border border-green-500/10'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${item.encountered ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {item.word}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.translation}</p>
                    </div>
                    {item.encountered && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pronunciation Feedback */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-rose-500" />
                Pronunciation
              </CardTitle>
              <CardDescription>Latest attempt analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <p className="text-sm italic text-muted-foreground mb-2">
                  &ldquo;{session.latestPronunciation.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Overall:</span>
                  <span className={`text-lg font-bold ${scoreColor(session.latestPronunciation.overallScore)}`}>
                    {session.latestPronunciation.overallScore}%
                  </span>
                </div>
                <Progress value={session.latestPronunciation.overallScore} className="h-2" />
              </div>
              <div className="space-y-1.5">
                {session.latestPronunciation.phonemes.map((phoneme, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{phoneme.phoneme}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            phoneme.score >= 90
                              ? 'bg-green-500'
                              : phoneme.score >= 75
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${phoneme.score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium w-8 text-right ${scoreColor(phoneme.score)}`}>
                        {phoneme.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hints Remaining */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Hints Remaining</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: session.hintsRemaining + session.hintsUsed }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full ${
                        i < session.hintsRemaining ? 'bg-amber-500' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
