'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKokoroTTS } from '@/hooks/use-kokoro-tts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Play,
  Square,
  Volume2,
  MessageSquare,
  BookOpen,
  Users,
  Headphones,
  GraduationCap,
  Sparkles,
  Globe,
  Settings,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
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

const LANGUAGE_MAP: Record<string, { label: string; code: string }> = {
  french: { label: 'French', code: 'fr-FR' },
  spanish: { label: 'Spanish', code: 'es-ES' },
  german: { label: 'German', code: 'de-DE' },
  mandarin: { label: 'Mandarin', code: 'zh-CN' },
  japanese: { label: 'Japanese', code: 'ja-JP' },
  italian: { label: 'Italian', code: 'it-IT' },
  hindi: { label: 'Hindi', code: 'hi-IN' },
  portuguese: { label: 'Portuguese', code: 'pt-BR' },
};

export default function VoiceIntelligencePage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('french');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ score: number; feedback: string } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const tts = useKokoroTTS({ lang: LANGUAGE_MAP[selectedLanguage]?.code || 'fr-FR' });

  useEffect(() => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    setAnalysisResult(null);
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new (SpeechRecognition as new () => SpeechRecognitionInstance)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_MAP[selectedLanguage]?.code || 'fr-FR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== 'aborted') {
        setError(`Recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript('');
  }, [selectedLanguage]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    // Simulate pronunciation analysis (would call API in production)
    setTimeout(() => {
      const score = Math.floor(Math.random() * 20) + 75;
      setAnalysisResult({
        score,
        feedback: score >= 85
          ? 'Excellent pronunciation! Your intonation and rhythm are very natural.'
          : 'Good attempt! Focus on vowel sounds and sentence rhythm for improvement.',
      });
      setIsAnalyzing(false);
    }, 1500);
  }, [transcript]);

  const handleListenBack = useCallback(() => {
    if (!transcript.trim()) return;
    tts.speak(transcript);
  }, [transcript, tts]);

  const speakWord = useCallback((word: string) => {
    tts.speak(word);
  }, [tts]);

  // Mock data
  const recentSessions = [
    { id: 1, language: 'French', scenario: 'Cafe Conversation', score: 85, duration: '15 min', date: 'Today' },
    { id: 2, language: 'Spanish', scenario: 'Hotel Check-in', score: 78, duration: '12 min', date: 'Yesterday' },
    { id: 3, language: 'French', scenario: 'Shopping', score: 92, duration: '18 min', date: '2 days ago' },
  ];

  const voiceAgents = [
    { id: 1, name: 'Pierre', language: 'French', role: 'Cafe Waiter', level: 'Beginner', voiceId: 'ff_siwis' },
    { id: 2, name: 'Maria', language: 'Spanish', role: 'Hotel Receptionist', level: 'Intermediate', voiceId: 'ef_dora' },
    { id: 3, name: 'Hans', language: 'German', role: 'Museum Guide', level: 'Advanced', voiceId: 'bm_george' },
    { id: 4, name: 'Yuki', language: 'Japanese', role: 'Tea Ceremony Host', level: 'Beginner', voiceId: 'jf_tebukuro' },
    { id: 5, name: 'Xiaoxiao', language: 'Mandarin', role: 'Market Vendor', level: 'Intermediate', voiceId: 'zf_xiaoxiao' },
    { id: 6, name: 'Sara', language: 'Italian', role: 'Cooking Teacher', level: 'Beginner', voiceId: 'if_sara' },
    { id: 7, name: 'Priya', language: 'Hindi', role: 'Travel Guide', level: 'Intermediate', voiceId: 'hf_beta' },
    { id: 8, name: 'Dora', language: 'Portuguese', role: 'Dance Instructor', level: 'Beginner', voiceId: 'pf_dora' },
  ];

  const pronunciationStats = {
    overall: 82,
    accuracy: 85,
    fluency: 78,
    prosody: 80,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Intelligence</h1>
          <p className="text-muted-foreground">
            Practice speaking with AI-powered conversation partners
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" onClick={() => router.push('/linguaflow/voice/session')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Start Practice
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Speaking Score</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pronunciationStats.overall}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +5% from last week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5 hrs</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Sessions completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Active languages</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="practice" className="space-y-4">
        <TabsList>
          <TabsTrigger value="practice">
            <Mic className="h-4 w-4 mr-2" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Conversation Partners
          </TabsTrigger>
          <TabsTrigger value="pronunciation">
            <Volume2 className="h-4 w-4 mr-2" />
            Pronunciation
          </TabsTrigger>
          <TabsTrigger value="dialogues">
            <BookOpen className="h-4 w-4 mr-2" />
            Dialogues
          </TabsTrigger>
          <TabsTrigger value="immersive">
            <Headphones className="h-4 w-4 mr-2" />
            Immersive VR
          </TabsTrigger>
        </TabsList>

        {/* Practice Tab */}
        <TabsContent value="practice" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Practice</CardTitle>
                <CardDescription>
                  Start a voice practice session with an AI partner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {Object.entries(LANGUAGE_MAP).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {!speechSupported && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Speech recognition is not supported in this browser. Please use Chrome or Edge.
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex flex-col items-center gap-4 py-8">
                  <div
                    className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!speechSupported}
                      className="h-full w-full rounded-full flex items-center justify-center text-white disabled:opacity-50"
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? 'Recording... Click to stop' : 'Click to start speaking'}
                  </p>
                </div>

                {transcript && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Your speech:</p>
                    <p className="text-sm text-muted-foreground italic">&ldquo;{transcript}&rdquo;</p>
                  </div>
                )}

                {analysisResult && (
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pronunciation Score</span>
                      <Badge variant={analysisResult.score >= 80 ? 'default' : 'secondary'}>
                        {analysisResult.score}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysisResult.feedback}</p>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Button variant="outline" disabled={isRecording || !transcript} onClick={handleListenBack}>
                    <Headphones className="h-4 w-4 mr-2" />
                    Listen
                  </Button>
                  <Button disabled={isRecording || !transcript || isAnalyzing} onClick={handleAnalyze}>
                    <Play className="h-4 w-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Your latest voice practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/linguaflow/voice/session?scenario=${encodeURIComponent(session.scenario)}&lang=${session.language.toLowerCase()}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{session.scenario}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.language} - {session.duration}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={session.score >= 80 ? 'default' : 'secondary'}>
                          {session.score}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{session.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversation Partners Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {voiceAgents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription>{agent.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Language</span>
                      <Badge variant="outline">{agent.language}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Level</span>
                      <Badge>{agent.level}</Badge>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => router.push(`/linguaflow/voice/session?agent=${encodeURIComponent(agent.name)}&role=${encodeURIComponent(agent.role)}&lang=${agent.language.toLowerCase()}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start Conversation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pronunciation Tab */}
        <TabsContent value="pronunciation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pronunciation Score</CardTitle>
                <CardDescription>Your overall pronunciation metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall</span>
                    <span className="text-sm font-medium">{pronunciationStats.overall}%</span>
                  </div>
                  <Progress value={pronunciationStats.overall} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy</span>
                    <span className="text-sm font-medium">{pronunciationStats.accuracy}%</span>
                  </div>
                  <Progress value={pronunciationStats.accuracy} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fluency</span>
                    <span className="text-sm font-medium">{pronunciationStats.fluency}%</span>
                  </div>
                  <Progress value={pronunciationStats.fluency} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prosody</span>
                    <span className="text-sm font-medium">{pronunciationStats.prosody}%</span>
                  </div>
                  <Progress value={pronunciationStats.prosody} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Word Practice</CardTitle>
                <CardDescription>Practice difficult words</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Bonjour', 'Croissant', 'Rendez-vous', "Aujourd'hui"].map((word) => (
                    <div key={word} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{word}</p>
                        <p className="text-sm text-muted-foreground">Click to hear pronunciation</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => speakWord(word)}>
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => {
                          setSelectedLanguage('french');
                          startRecording();
                        }}>
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dialogues Tab */}
        <TabsContent value="dialogues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scripted Dialogues</CardTitle>
              <CardDescription>
                Practice with multi-speaker conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: 'At the Restaurant', speakers: 2, duration: '5 min', level: 'Beginner', lang: 'french' },
                  { title: 'Airport Check-in', speakers: 3, duration: '8 min', level: 'Intermediate', lang: 'spanish' },
                  { title: 'Job Interview', speakers: 2, duration: '12 min', level: 'Advanced', lang: 'french' },
                  { title: 'Shopping at the Market', speakers: 2, duration: '6 min', level: 'Beginner', lang: 'spanish' },
                ].map((dialogue) => (
                  <div key={dialogue.title} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{dialogue.title}</h4>
                      <Badge variant="outline">{dialogue.level}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {dialogue.speakers} speakers
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dialogue.duration}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        tts.speak(
                          dialogue.lang === 'french'
                            ? 'Bonjour, bienvenue! Comment puis-je vous aider?'
                            : 'Hola, bienvenido! Como puedo ayudarle?'
                        );
                      }}>
                        <Play className="h-4 w-4 mr-1" />
                        Listen
                      </Button>
                      <Button size="sm" onClick={() => router.push(`/linguaflow/voice/session?scenario=${encodeURIComponent(dialogue.title)}&lang=${dialogue.lang}`)}>
                        <Mic className="h-4 w-4 mr-1" />
                        Practice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Immersive VR Tab */}
        <TabsContent value="immersive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Immersive VR Experiences</CardTitle>
              <CardDescription>
                Practice in realistic 3D environments with spatial audio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: 'Paris Cafe', language: 'French', lang: 'french' },
                  { title: 'Barcelona Market', language: 'Spanish', lang: 'spanish' },
                  { title: 'Tokyo Street', language: 'Japanese', lang: 'japanese' },
                ].map((scenario) => (
                  <div key={scenario.title} className="relative overflow-hidden rounded-lg border">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Globe className="h-12 w-12 text-primary/50" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium">{scenario.title}</h4>
                      <p className="text-sm text-muted-foreground">{scenario.language}</p>
                      <Button
                        className="w-full mt-3"
                        variant="outline"
                        onClick={() => router.push(`/linguaflow/immersion?scenario=${encodeURIComponent(scenario.title)}&lang=${scenario.lang}`)}
                      >
                        <Headphones className="h-4 w-4 mr-2" />
                        Launch Experience
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-1" />
                  VR experiences work with Quest, Pico, and WebXR-compatible browsers.
                  Spatial audio provides an immersive language learning environment.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
