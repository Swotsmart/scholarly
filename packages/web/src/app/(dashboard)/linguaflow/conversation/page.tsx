'use client';

/**
 * AI Conversation Partner Page
 * Interactive language practice with AI personas and pronunciation feedback
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Volume2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  Bot,
  Lightbulb,
  BookOpen,
  ChevronRight,
  X,
  Zap,
  Trophy,
  Star,
  Coffee,
  Map,
  Newspaper,
  Users,
  Settings,
  Eye,
  EyeOff,
  HelpCircle,
  Gauge,
  BarChart3,
  Clock,
  Target,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ConversationMessage, CorrectionSuggestion } from '@/types/linguaflow';

// Persona definitions
type Persona = {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar: string;
  voiceStyle: string;
  icon: React.ReactNode;
  color: string;
  greeting: string;
  greetingTranslation: string;
};

const personas: Persona[] = [
  {
    id: 'marie',
    name: 'Marie',
    role: 'Cafe Owner',
    personality: 'Warm, patient, loves talking about French cuisine',
    avatar: 'bg-pink-100 text-pink-600',
    voiceStyle: 'Friendly and welcoming',
    icon: <Coffee className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500',
    greeting: 'Bonjour et bienvenue au Cafe de Paris! Je suis Marie. Qu\'est-ce que je peux vous servir aujourd\'hui?',
    greetingTranslation: 'Hello and welcome to Cafe de Paris! I\'m Marie. What can I serve you today?',
  },
  {
    id: 'pierre',
    name: 'Pierre',
    role: 'Travel Guide',
    personality: 'Enthusiastic, knowledgeable about history and culture',
    avatar: 'bg-blue-100 text-blue-600',
    voiceStyle: 'Energetic and informative',
    icon: <Map className="w-5 h-5" />,
    color: 'from-blue-500 to-indigo-500',
    greeting: 'Bonjour! Je suis Pierre, votre guide touristique. Etes-vous pret a decouvrir les merveilles de Paris?',
    greetingTranslation: 'Hello! I\'m Pierre, your tour guide. Are you ready to discover the wonders of Paris?',
  },
  {
    id: 'claire',
    name: 'Claire',
    role: 'Newsreader',
    personality: 'Professional, articulate, current events expert',
    avatar: 'bg-purple-100 text-purple-600',
    voiceStyle: 'Clear and formal',
    icon: <Newspaper className="w-5 h-5" />,
    color: 'from-purple-500 to-violet-500',
    greeting: 'Bonjour, je suis Claire. Voulez-vous discuter des actualites du jour? Je peux vous expliquer les evenements recents.',
    greetingTranslation: 'Hello, I\'m Claire. Would you like to discuss today\'s news? I can explain recent events to you.',
  },
  {
    id: 'lucas',
    name: 'Lucas',
    role: 'Friend',
    personality: 'Casual, fun-loving, uses colloquial expressions',
    avatar: 'bg-green-100 text-green-600',
    voiceStyle: 'Relaxed and casual',
    icon: <Users className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
    greeting: 'Salut! Ca va? C\'est Lucas! On se fait une petite conversation? Raconte-moi ce que tu fais de beau!',
    greetingTranslation: 'Hey! How\'s it going? It\'s Lucas! Shall we have a little chat? Tell me what you\'ve been up to!',
  },
];

// Scenario definitions
type Scenario = {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  personaId: string;
  targetVocabulary: string[];
  cefrLevel: string;
  objectives: string[];
};

const scenarios: Scenario[] = [
  {
    id: 'ordering_food',
    title: 'Ordering Food',
    titleFr: 'Commander a manger',
    description: 'Practice ordering at a French cafe',
    personaId: 'marie',
    targetVocabulary: ['commander', 'cafe', 'croissant', 'addition', 's\'il vous plait'],
    cefrLevel: 'A2-B1',
    objectives: ['Order a drink', 'Ask for recommendations', 'Request the bill'],
  },
  {
    id: 'asking_directions',
    title: 'Asking Directions',
    titleFr: 'Demander son chemin',
    description: 'Learn to navigate in a French city',
    personaId: 'pierre',
    targetVocabulary: ['tourner', 'tout droit', 'a gauche', 'a droite', 'pres de'],
    cefrLevel: 'A2-B1',
    objectives: ['Ask where something is', 'Understand directions', 'Thank for help'],
  },
  {
    id: 'small_talk',
    title: 'Small Talk',
    titleFr: 'Bavardage',
    description: 'Casual conversation with a friend',
    personaId: 'lucas',
    targetVocabulary: ['super', 'genial', 'tranquille', 'quoi de neuf', 'a plus'],
    cefrLevel: 'B1',
    objectives: ['Greet casually', 'Talk about weekend plans', 'Use informal expressions'],
  },
  {
    id: 'current_events',
    title: 'Current Events',
    titleFr: 'Actualites',
    description: 'Discuss news and current events',
    personaId: 'claire',
    targetVocabulary: ['actualite', 'politique', 'economie', 'selon', 'il parait que'],
    cefrLevel: 'B2',
    objectives: ['Discuss a news topic', 'Express opinions', 'Use formal register'],
  },
];

// Message type with corrections
type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string;
  corrections?: CorrectionSuggestion[];
  timestamp: Date;
  pronunciation?: {
    score: number;
    feedback: string;
  };
};

// Assessment scores
type AssessmentScores = {
  fluency: number;
  accuracy: number;
  complexity: number;
  vocabulary: number;
};

// Hint component
function HintPanel({ hints, vocabulary, onClose }: { hints: string[]; vocabulary: string[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-0 top-0 w-80 bg-card border rounded-lg shadow-lg p-4 z-10"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          Hints & Vocabulary
        </h4>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Suggested Responses:</p>
          <div className="space-y-2">
            {hints.map((hint, i) => (
              <div key={i} className="text-sm p-2 bg-muted rounded">
                {hint}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Useful Vocabulary:</p>
          <div className="flex flex-wrap gap-1">
            {vocabulary.map((word) => (
              <Badge key={word} variant="secondary" className="text-xs">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Correction display component
function CorrectionDisplay({ corrections }: { corrections: CorrectionSuggestion[] }) {
  if (corrections.length === 0) return null;

  return (
    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Corrections:
      </p>
      {corrections.map((c, i) => (
        <div key={i} className="text-xs mb-1">
          <span className="line-through text-red-500">{c.original}</span>
          {' -> '}
          <span className="text-green-600 font-medium">{c.corrected}</span>
          <p className="text-muted-foreground ml-4">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}

// Session summary dialog
function SessionSummaryDialog({
  open,
  onClose,
  messages,
  scores,
  xpEarned,
}: {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  scores: AssessmentScores;
  xpEarned: number;
}) {
  const userMessages = messages.filter((m) => m.role === 'user');
  const totalCorrections = messages.reduce((sum, m) => sum + (m.corrections?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Conversation Complete!
          </DialogTitle>
          <DialogDescription>Here&apos;s your performance summary</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* XP Badge */}
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
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{userMessages.length}</div>
              <div className="text-xs text-muted-foreground">Messages Sent</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{totalCorrections}</div>
              <div className="text-xs text-muted-foreground">Corrections Made</div>
            </div>
          </div>

          {/* Assessment Scores */}
          <div className="space-y-3">
            <h4 className="font-medium">Assessment Scores</h4>
            {Object.entries(scores).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{key}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
          </div>

          {/* Overall Grade */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <div className="text-4xl font-bold text-primary">
              {Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4)}%
            </div>
            <div className="text-sm text-muted-foreground">Overall Performance</div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            View Transcript
          </Button>
          <Button onClick={onClose}>
            Continue Learning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Transcript dialog
function TranscriptDialog({
  open,
  onClose,
  messages,
}: {
  open: boolean;
  onClose: () => void;
  messages: Message[];
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Conversation Transcript</DialogTitle>
          <DialogDescription>Full conversation log with corrections</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.filter((m) => m.role !== 'system').map((message) => (
            <div
              key={message.id}
              className={cn(
                'p-3 rounded-lg',
                message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                <span className="text-xs text-muted-foreground">
                  {message.role === 'user' ? 'You' : 'AI Partner'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
              {message.translation && (
                <p className="text-xs text-muted-foreground mt-1 italic">{message.translation}</p>
              )}
              {message.corrections && message.corrections.length > 0 && (
                <CorrectionDisplay corrections={message.corrections} />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConversationPage() {
  const [activeTab, setActiveTab] = useState('personas');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showTranslations, setShowTranslations] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [assessmentScores, setAssessmentScores] = useState<AssessmentScores>({
    fluency: 0,
    accuracy: 0,
    complexity: 0,
    vocabulary: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = useCallback((text: string, lang: string = 'fr-FR') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const startConversation = useCallback((persona: Persona, scenario?: Scenario) => {
    setSelectedPersona(persona);
    setSelectedScenario(scenario || null);

    const systemMessage: Message = {
      id: '0',
      role: 'system',
      content: scenario
        ? `Scenario: ${scenario.title} - ${scenario.description}`
        : `Chatting with ${persona.name} (${persona.role})`,
      timestamp: new Date(),
    };

    const greetingMessage: Message = {
      id: '1',
      role: 'assistant',
      content: persona.greeting,
      translation: persona.greetingTranslation,
      timestamp: new Date(),
    };

    setMessages([systemMessage, greetingMessage]);
    setXpEarned(0);
    setAssessmentScores({ fluency: 0, accuracy: 0, complexity: 0, vocabulary: 0 });
    setActiveTab('chat');

    setTimeout(() => speakText(persona.greeting), 500);
  }, [speakText]);

  const generateAIResponse = useCallback((userMessage: string): Message => {
    // Demo responses based on persona
    const responses: Record<string, { content: string; translation: string }[]> = {
      marie: [
        { content: 'Tres bien! Un cafe creme, c\'est parfait. Voulez-vous un croissant avec ca?', translation: 'Very good! A cafe creme, perfect. Would you like a croissant with that?' },
        { content: 'Excellent choix! Je vous apporte ca tout de suite. Ce sera 8 euros, s\'il vous plait.', translation: 'Excellent choice! I\'ll bring that right away. That will be 8 euros, please.' },
        { content: 'Merci beaucoup! Bon appetit! N\'hesitez pas si vous avez besoin d\'autre chose.', translation: 'Thank you very much! Enjoy! Don\'t hesitate if you need anything else.' },
      ],
      pierre: [
        { content: 'Ah, le Louvre! C\'est a environ 15 minutes a pied. Vous allez tout droit, puis tournez a gauche au carrefour.', translation: 'Ah, the Louvre! It\'s about 15 minutes on foot. You go straight, then turn left at the intersection.' },
        { content: 'Le musee ouvre a 9 heures. Je vous conseille d\'y aller tot pour eviter la foule!', translation: 'The museum opens at 9 o\'clock. I advise you to go early to avoid the crowd!' },
        { content: 'Vous ne pouvez pas le manquer! C\'est un batiment magnifique avec une pyramide de verre devant.', translation: 'You can\'t miss it! It\'s a magnificent building with a glass pyramid in front.' },
      ],
      claire: [
        { content: 'Oui, l\'actualite politique est tres interessante en ce moment. Avez-vous entendu parler des nouvelles reformes?', translation: 'Yes, the political news is very interesting right now. Have you heard about the new reforms?' },
        { content: 'C\'est une question complexe. D\'un cote, il y a ceux qui soutiennent ces mesures, de l\'autre, les opposants.', translation: 'It\'s a complex question. On one hand, there are those who support these measures, on the other, the opponents.' },
        { content: 'Je pense qu\'il est important de considerer tous les points de vue avant de se faire une opinion.', translation: 'I think it\'s important to consider all viewpoints before forming an opinion.' },
      ],
      lucas: [
        { content: 'Trop cool! Moi aussi j\'ai passe un super week-end. On est alles a un concert samedi, c\'etait genial!', translation: 'So cool! I also had a great weekend. We went to a concert on Saturday, it was amazing!' },
        { content: 'Ouais, c\'etait vraiment sympa! Et toi, t\'as des plans pour ce soir? On pourrait aller boire un verre?', translation: 'Yeah, it was really nice! And you, do you have plans for tonight? We could go for a drink?' },
        { content: 'Super! On se retrouve a 19h au bar du coin? A plus tard!', translation: 'Great! See you at 7pm at the corner bar? See you later!' },
      ],
    };

    const personaResponses = responses[selectedPersona?.id || 'marie'] || responses.marie;
    const userMessageCount = messages.filter((m) => m.role === 'user').length;
    const responseIndex = Math.min(userMessageCount, personaResponses.length - 1);
    const response = personaResponses[responseIndex];

    // Generate some random corrections for demo
    const corrections: CorrectionSuggestion[] = [];
    if (userMessage.includes('je suis')) {
      corrections.push({
        original: 'je suis',
        corrected: 'je suis',
        explanation: 'Good use of "je suis"!',
        severity: 'minor',
      });
    }
    if (userMessage.toLowerCase().includes('bonjour') === false && userMessageCount === 0) {
      corrections.push({
        original: '(start)',
        corrected: 'Bonjour!',
        explanation: 'Remember to greet first in French conversations',
        severity: 'minor',
      });
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: response.content,
      translation: response.translation,
      timestamp: new Date(),
    };
  }, [selectedPersona, messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      corrections: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiResponse = generateAIResponse(input);
    setMessages((prev) => [...prev, aiResponse]);

    // Update XP and scores
    const earnedXP = 15 + Math.floor(Math.random() * 10);
    setXpEarned((prev) => prev + earnedXP);
    setAssessmentScores((prev) => ({
      fluency: Math.min(100, prev.fluency + Math.floor(Math.random() * 15) + 5),
      accuracy: Math.min(100, prev.accuracy + Math.floor(Math.random() * 15) + 5),
      complexity: Math.min(100, prev.complexity + Math.floor(Math.random() * 10) + 3),
      vocabulary: Math.min(100, prev.vocabulary + Math.floor(Math.random() * 12) + 4),
    }));

    speakText(aiResponse.content);
    setIsLoading(false);
  }, [input, isLoading, generateAIResponse, speakText]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const endConversation = () => {
    setShowSummary(true);
  };

  const resetConversation = () => {
    setSelectedPersona(null);
    setSelectedScenario(null);
    setMessages([]);
    setXpEarned(0);
    setShowSummary(false);
    setActiveTab('personas');
  };

  // Current hints based on scenario
  const currentHints = selectedScenario
    ? [
        'Je voudrais... (I would like...)',
        'Est-ce que vous avez... (Do you have...)',
        'Combien coute... (How much does... cost)',
      ]
    : [
        'Bonjour, comment allez-vous?',
        'Je m\'appelle... (My name is...)',
        'Enchanté(e)! (Nice to meet you!)',
      ];

  const currentVocabulary = selectedScenario?.targetVocabulary || ['bonjour', 'merci', 'au revoir', 's\'il vous plait'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <PageHeader
        title="AI Conversation Partner"
        description="Practice speaking with AI personas in real scenarios"
        actions={
          <div className="flex items-center gap-3">
            {xpEarned > 0 && (
              <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-700 dark:text-purple-400">
                  {xpEarned} XP
                </span>
              </div>
            )}
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
          <TabsTrigger value="personas" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Personas
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2" disabled={!selectedPersona}>
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Personas Tab */}
        <TabsContent value="personas" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {personas.map((persona) => (
              <motion.div
                key={persona.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                  onClick={() => startConversation(persona)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={cn('w-14 h-14 rounded-full flex items-center justify-center', persona.avatar)}>
                        {persona.icon}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {persona.name}
                          <div className="w-2 h-2 rounded-full bg-green-500" title="Available" />
                        </CardTitle>
                        <CardDescription>{persona.role}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{persona.personality}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{persona.voiceStyle}</Badge>
                      <Button size="sm">
                        Start Chat
                        <ChevronRight className="ml-1 w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {scenarios.map((scenario) => {
              const persona = personas.find((p) => p.id === scenario.personaId);
              return (
                <motion.div
                  key={scenario.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                    onClick={() => persona && startConversation(persona, scenario)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{scenario.title}</CardTitle>
                          <CardDescription className="text-primary font-medium">
                            {scenario.titleFr}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{scenario.cefrLevel}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{scenario.description}</p>

                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Objectives:</p>
                        <div className="space-y-1">
                          {scenario.objectives.map((obj, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{obj}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {persona && (
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs', persona.avatar)}>
                              {persona.name[0]}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">with {persona?.name}</span>
                        </div>
                        <Button size="sm">
                          Start Scenario
                          <ChevronRight className="ml-1 w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          {selectedPersona && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Chat Area */}
              <div className="lg:col-span-2 flex flex-col h-[calc(100vh-20rem)]">
                {/* Chat Header */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', selectedPersona.avatar)}>
                          {selectedPersona.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{selectedPersona.name}</h3>
                          <p className="text-sm text-muted-foreground">{selectedPersona.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTranslations(!showTranslations)}
                          title={showTranslations ? 'Hide translations' : 'Show translations'}
                        >
                          {showTranslations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowHints(!showHints)}
                          title="Toggle hints"
                        >
                          <Lightbulb className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={endConversation}>
                          End Session
                        </Button>
                      </div>
                    </div>
                    {selectedScenario && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          <span>Scenario: {selectedScenario.title}</span>
                          <Badge variant="secondary" className="ml-auto">{selectedScenario.cefrLevel}</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Messages */}
                <Card className="flex-1 overflow-hidden flex flex-col relative">
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start',
                            message.role === 'system' && 'justify-center'
                          )}
                        >
                          {message.role === 'system' ? (
                            <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              {message.content}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'max-w-[80%] rounded-2xl p-4',
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className="text-base">{message.content}</p>
                              {message.translation && showTranslations && message.role === 'assistant' && (
                                <p className="text-sm opacity-70 mt-2 pt-2 border-t border-current/20">
                                  {message.translation}
                                </p>
                              )}
                              {message.role === 'assistant' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-8 px-2"
                                  onClick={() => speakText(message.content)}
                                >
                                  <Volume2 className="w-4 h-4 mr-1" />
                                  Listen
                                </Button>
                              )}
                              {message.corrections && message.corrections.length > 0 && (
                                <CorrectionDisplay corrections={message.corrections} />
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted rounded-2xl p-4">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Hint Panel */}
                  <AnimatePresence>
                    {showHints && (
                      <HintPanel
                        hints={currentHints}
                        vocabulary={currentVocabulary}
                        onClose={() => setShowHints(false)}
                      />
                    )}
                  </AnimatePresence>

                  {/* Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsListening(!isListening)}
                        className={cn(isListening && 'bg-red-100 border-red-300 text-red-600')}
                        title={isListening ? 'Stop recording' : 'Voice input'}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </Button>
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your response in French..."
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600"
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Listening... Speak now
                      </motion.div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Side Panel - Assessment & Stats */}
              <div className="space-y-4">
                {/* Assessment Scores */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-primary" />
                      Live Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(assessmentScores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key}</span>
                          <span className="font-medium">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Session Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Session Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-2 bg-muted rounded">
                        <div className="text-2xl font-bold">{messages.filter((m) => m.role === 'user').length}</div>
                        <div className="text-xs text-muted-foreground">Messages</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="text-2xl font-bold text-primary">{xpEarned}</div>
                        <div className="text-xs text-muted-foreground">XP Earned</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowTranscript(true)}>
                      <BookOpen className="mr-2 w-4 h-4" />
                      View Transcript
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowHints(!showHints)}>
                      <Lightbulb className="mr-2 w-4 h-4" />
                      {showHints ? 'Hide Hints' : 'Show Hints'}
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive" onClick={resetConversation}>
                      <RefreshCw className="mr-2 w-4 h-4" />
                      New Conversation
                    </Button>
                  </CardContent>
                </Card>

                {/* Vocabulary Focus */}
                {selectedScenario && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Vocabulary Focus</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedScenario.targetVocabulary.map((word) => (
                          <Badge
                            key={word}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => speakText(word)}
                          >
                            {word}
                            <Volume2 className="ml-1 w-3 h-3" />
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Summary Dialog */}
      <SessionSummaryDialog
        open={showSummary}
        onClose={() => {
          setShowSummary(false);
          resetConversation();
        }}
        messages={messages}
        scores={assessmentScores}
        xpEarned={xpEarned}
      />

      {/* Transcript Dialog */}
      <TranscriptDialog
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        messages={messages}
      />
    </motion.div>
  );
}
