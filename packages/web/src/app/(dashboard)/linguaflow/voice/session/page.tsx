'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  Pause,
  Play,
  MessageCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKokoroTTS } from '@/hooks/use-kokoro-tts';

// SpeechRecognition types
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean } };
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const LANGUAGE_CODES: Record<string, string> = {
  french: 'fr-FR',
  spanish: 'es-ES',
  german: 'de-DE',
  mandarin: 'zh-CN',
  japanese: 'ja-JP',
};

// Scenario-specific agent greetings
const AGENT_GREETINGS: Record<string, { text: string; responses: string[] }> = {
  'Cafe Conversation': {
    text: 'Bonjour! Bienvenue au Cafe de Paris. Comment puis-je vous aider aujourd\'hui?',
    responses: [
      'Excellent choix! Un cafe au lait. Voulez-vous aussi un croissant?',
      'Tres bien! Et comme dessert, nous avons une tarte aux pommes delicieuse.',
      'Bien sur! Votre commande arrive tout de suite. Bon appetit!',
    ],
  },
  'Hotel Check-in': {
    text: 'Buenas tardes! Bienvenido al Hotel Barcelona. Tiene una reserva?',
    responses: [
      'Perfecto! He encontrado su reserva. Habitacion 305, tercer piso.',
      'El desayuno es de 7 a 10 de la manana en el restaurante del primer piso.',
      'Aqui tiene su llave. Que disfrute su estancia!',
    ],
  },
  'Shopping': {
    text: 'Bonjour! Bienvenue dans notre boutique. Vous cherchez quelque chose en particulier?',
    responses: [
      'Bien sur! Nous avons une belle selection. Quelle taille faites-vous?',
      'Celui-ci vous irait tres bien! Voulez-vous l\'essayer?',
      'C\'est 45 euros. Nous acceptons les cartes et les especes.',
    ],
  },
};

const DEFAULT_GREETING = {
  text: 'Bonjour! Comment allez-vous aujourd\'hui? Je suis pret a pratiquer avec vous.',
  responses: [
    'Tres bien! Continuons la conversation. Qu\'est-ce que vous aimez faire?',
    'Interessant! Et qu\'est-ce que vous pensez de la culture francaise?',
    'Merci pour cette belle conversation! Vous progressez tres bien.',
  ],
};

interface Message {
  id: string;
  speaker: 'agent' | 'learner';
  text: string;
  timestamp: Date;
  assessment?: {
    score: number;
    issues?: string[];
  };
}

export default function VoiceSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = searchParams.get('scenario') || 'Cafe Conversation';
  const lang = searchParams.get('lang') || 'french';
  const agentName = searchParams.get('agent') || 'Pierre';
  const agentRole = searchParams.get('role') || 'Waiter';

  const scenarioData = AGENT_GREETINGS[scenario] || DEFAULT_GREETING;
  const langCode = LANGUAGE_CODES[lang] || 'fr-FR';

  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [responseIndex, setResponseIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      speaker: 'agent',
      text: scenarioData.text,
      timestamp: new Date(),
    },
  ]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const tts = useKokoroTTS({ lang: langCode });

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak the agent greeting on load
  useEffect(() => {
    if (!isMuted) {
      tts.speak(scenarioData.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speakText = useCallback((text: string) => {
    if (isMuted) return;
    setIsAgentSpeaking(true);
    tts.speak(text).then(() => setIsAgentSpeaking(false));
  }, [isMuted, tts]);

  const addAgentResponse = useCallback(() => {
    setIsAgentSpeaking(true);
    const responseText = scenarioData.responses[responseIndex % scenarioData.responses.length];

    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        speaker: 'agent',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
      setResponseIndex((prev) => prev + 1);
      speakText(responseText);
    }, 1500);
  }, [responseIndex, scenarioData.responses, speakText]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);

      // Submit the current transcript as a message
      if (currentTranscript.trim()) {
        const score = Math.floor(Math.random() * 25) + 70;
        const newMessage: Message = {
          id: Date.now().toString(),
          speaker: 'learner',
          text: currentTranscript,
          timestamp: new Date(),
          assessment: {
            score,
            issues: score < 85 ? ['intonation on vowels'] : undefined,
          },
        };
        setMessages((prev) => [...prev, newMessage]);
        setCurrentTranscript('');
        addAgentResponse();
      }
      return;
    }

    // Start listening with SpeechRecognition
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: simulate for browsers without support
      setIsListening(true);
      setTimeout(() => {
        setCurrentTranscript('Je voudrais un cafe au lait, s\'il vous plait.');
      }, 2000);
      return;
    }

    const recognition = new (SpeechRecognition as new () => SpeechRecognitionInstance)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langCode;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < Object.keys(event.results).length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCurrentTranscript(transcript);
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setCurrentTranscript('');
  }, [isListening, currentTranscript, langCode, addAgentResponse]);

  const endSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    speechSynthesis.cancel();
    router.push('/linguaflow/voice');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">{scenario}</h1>
            <p className="text-sm text-muted-foreground">{lang.charAt(0).toUpperCase() + lang.slice(1)} - {agentName} ({agentRole})</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-mono">
            {formatDuration(sessionDuration)}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="destructive" size="sm" onClick={endSession}>
            <X className="h-4 w-4 mr-1" />
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Panel */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.speaker === 'learner' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.speaker === 'learner'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  {message.speaker === 'agent' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs opacity-60 hover:opacity-100"
                      onClick={() => speakText(message.text)}
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Replay
                    </Button>
                  )}
                  {message.assessment && (
                    <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                      <div className="flex items-center gap-2 text-xs">
                        {message.assessment.score >= 80 ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>Score: {message.assessment.score}%</span>
                      </div>
                      {message.assessment.issues && message.assessment.issues.length > 0 && (
                        <p className="text-xs mt-1 opacity-75">
                          Tip: Check {message.assessment.issues.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isAgentSpeaking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">{agentName} is speaking...</span>
                  </div>
                </div>
              </div>
            )}
            {isListening && currentTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[70%] rounded-lg p-4 bg-primary/50 text-primary-foreground">
                  <p className="text-sm italic">{currentTranscript}</p>
                  <p className="text-xs mt-1 opacity-75">Listening...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="icon"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted) tts.stop();
                }}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Button
                size="lg"
                className={`h-16 w-16 rounded-full ${
                  isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''
                }`}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => tts.stop()}>
                <Pause className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {isListening ? 'Listening... Click to stop and send' : 'Click the microphone to speak'}
            </p>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 border-l p-4 overflow-y-auto hidden lg:block">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Session Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">Pronunciation</span>
                  <span className="text-xs font-medium">82%</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">Fluency</span>
                  <span className="text-xs font-medium">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">Vocabulary</span>
                  <span className="text-xs font-medium">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Scenario Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Greet the {agentRole.toLowerCase()}</span>
                </li>
                <li className="flex items-center gap-2">
                  {messages.filter(m => m.speaker === 'learner').length >= 1 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span className={messages.filter(m => m.speaker === 'learner').length >= 1 ? '' : 'text-muted-foreground'}>
                    Make a request
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {messages.filter(m => m.speaker === 'learner').length >= 2 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span className={messages.filter(m => m.speaker === 'learner').length >= 2 ? '' : 'text-muted-foreground'}>
                    Ask a follow-up question
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {messages.filter(m => m.speaker === 'learner').length >= 3 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span className={messages.filter(m => m.speaker === 'learner').length >= 3 ? '' : 'text-muted-foreground'}>
                    Complete the conversation
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Helpful Phrases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                  &quot;Je voudrais...&quot; - I would like...
                </li>
                <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                  &quot;L&apos;addition, s&apos;il vous plait&quot; - The bill, please
                </li>
                <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                  &quot;C&apos;est combien?&quot; - How much is it?
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
