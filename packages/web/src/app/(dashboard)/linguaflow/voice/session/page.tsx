'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useRouter } from 'next/navigation';

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
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      speaker: 'agent',
      text: 'Bonjour! Bienvenue au Cafe de Paris. Comment puis-je vous aider aujourd\'hui?',
      timestamp: new Date(),
    },
  ]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleListening = () => {
    if (!isListening) {
      // Start listening
      setIsListening(true);
      // Simulate recording...
      setTimeout(() => {
        setCurrentTranscript('Je voudrais un cafe au lait, s\'il vous plait.');
      }, 2000);
    } else {
      // Stop listening and add message
      setIsListening(false);
      if (currentTranscript) {
        const newMessage: Message = {
          id: Date.now().toString(),
          speaker: 'learner',
          text: currentTranscript,
          timestamp: new Date(),
          assessment: {
            score: 85,
            issues: ['pronunciation of "voudrais"'],
          },
        };
        setMessages((prev) => [...prev, newMessage]);
        setCurrentTranscript('');

        // Simulate agent response
        setIsAgentSpeaking(true);
        setTimeout(() => {
          const agentResponse: Message = {
            id: (Date.now() + 1).toString(),
            speaker: 'agent',
            text: 'Excellent choix! Un cafe au lait. Voulez-vous aussi un croissant?',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentResponse]);
          setIsAgentSpeaking(false);
        }, 2000);
      }
    }
  };

  const endSession = () => {
    router.push('/linguaflow/voice');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">Cafe Conversation</h1>
            <p className="text-sm text-muted-foreground">French - Pierre (Waiter)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-mono">
            {formatDuration(sessionDuration)}
          </Badge>
          <Button variant="ghost" size="icon">
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
                    <span className="text-sm">Pierre is speaking...</span>
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
                onClick={() => setIsMuted(!isMuted)}
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
                {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <Button variant="outline" size="icon">
                <Pause className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {isListening ? 'Listening... Click to stop' : 'Click the microphone to speak'}
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
                  <span>Greet the waiter</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Order a drink</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-muted-foreground">Order food</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-muted-foreground">Ask for the bill</span>
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
