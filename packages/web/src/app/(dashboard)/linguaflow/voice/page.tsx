'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
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
  Play,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

function audioBase64ToUrl(base64: string, format: string): string {
  const mime = format === 'wav' ? 'audio/wav' : format === 'opus' ? 'audio/opus' : 'audio/mpeg';
  return `data:${mime};base64,${base64}`;
}

// Language code mapping for Kokoro voices
const LANGUAGE_VOICES: Record<string, { language: string; voiceId: string }> = {
  french:   { language: 'fr-fr', voiceId: 'ff_siwis' },
  spanish:  { language: 'es-es', voiceId: 'ef_dora' },
  german:   { language: 'de-de', voiceId: 'df_anna' },
  mandarin: { language: 'zh-cn', voiceId: 'zf_xiaobei' },
  japanese: { language: 'ja-jp', voiceId: 'jf_alpha' },
};

export default function VoiceIntelligencePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('french');
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [loadingWord, setLoadingWord] = useState<string | null>(null);
  const [playingDialogue, setPlayingDialogue] = useState<string | null>(null);
  const [loadingDialogue, setLoadingDialogue] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recentSessions = [
    { id: 1, language: 'French', scenario: 'Cafe Conversation', score: 85, duration: '15 min', date: 'Today' },
    { id: 2, language: 'Spanish', scenario: 'Hotel Check-in', score: 78, duration: '12 min', date: 'Yesterday' },
    { id: 3, language: 'French', scenario: 'Shopping', score: 92, duration: '18 min', date: '2 days ago' },
  ];

  const voiceAgents = [
    { id: 1, name: 'Pierre', language: 'French', role: 'Cafe Waiter', level: 'Beginner', langCode: 'fr-fr', voiceId: 'fm_marcelo' },
    { id: 2, name: 'Maria', language: 'Spanish', role: 'Hotel Receptionist', level: 'Intermediate', langCode: 'es-es', voiceId: 'ef_dora' },
    { id: 3, name: 'Hans', language: 'German', role: 'Museum Guide', level: 'Advanced', langCode: 'de-de', voiceId: 'dm_hans' },
  ];

  const pronunciationWords: Record<string, { word: string; text: string }[]> = {
    french: [
      { word: 'Bonjour', text: 'Bonjour' },
      { word: 'Croissant', text: 'Croissant' },
      { word: 'Rendez-vous', text: 'Rendez-vous' },
      { word: "Aujourd'hui", text: "Aujourd'hui" },
    ],
    spanish: [
      { word: 'Buenos días', text: 'Buenos días' },
      { word: 'Gracias', text: 'Gracias' },
      { word: 'Por favor', text: 'Por favor' },
      { word: 'Hasta luego', text: 'Hasta luego' },
    ],
    german: [
      { word: 'Guten Tag', text: 'Guten Tag' },
      { word: 'Entschuldigung', text: 'Entschuldigung' },
      { word: 'Bitte schön', text: 'Bitte schön' },
      { word: 'Auf Wiedersehen', text: 'Auf Wiedersehen' },
    ],
    mandarin: [
      { word: '你好 (Nǐ hǎo)', text: '你好' },
      { word: '谢谢 (Xièxiè)', text: '谢谢' },
      { word: '再见 (Zàijiàn)', text: '再见' },
      { word: '对不起 (Duìbùqǐ)', text: '对不起' },
    ],
    japanese: [
      { word: 'こんにちは', text: 'こんにちは' },
      { word: 'ありがとう', text: 'ありがとう' },
      { word: 'すみません', text: 'すみません' },
      { word: 'さようなら', text: 'さようなら' },
    ],
  };

  const dialogues = [
    { title: 'At the Restaurant', speakers: 2, duration: '5 min', level: 'Beginner', text: 'Bonsoir! Bienvenue au restaurant. Je voudrais une table pour deux personnes, s\'il vous plaît. Bien sûr, suivez-moi. Voici le menu.' },
    { title: 'Airport Check-in', speakers: 3, duration: '8 min', level: 'Intermediate', text: '¡Buenos días! Necesito hacer el check-in para mi vuelo a Madrid. ¿Tiene su pasaporte y tarjeta de embarque? Sí, aquí tiene.' },
    { title: 'Job Interview', speakers: 2, duration: '12 min', level: 'Advanced', text: 'Guten Tag, mein Name ist Anna Schmidt. Ich bewerbe mich für die Stelle als Projektmanagerin. Erzählen Sie mir bitte etwas über Ihre Berufserfahrung.' },
    { title: 'Shopping at the Market', speakers: 2, duration: '6 min', level: 'Beginner', text: 'Combien coûtent les pommes? Deux euros le kilo. Je prends un kilo, s\'il vous plaît. Voilà, et avec ceci?' },
  ];

  const pronunciationStats = {
    overall: 82,
    accuracy: 85,
    fluency: 78,
    prosody: 80,
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingWord(null);
    setPlayingDialogue(null);
  }, []);

  const playWord = useCallback(async (word: string, text: string) => {
    if (playingWord === word) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingWord(word);

    try {
      const langConfig = LANGUAGE_VOICES[selectedLanguage];
      const result = await api.voiceStudio.synthesize({
        text,
        voice_id: langConfig.voiceId,
        language: langConfig.language,
        output_format: 'mp3',
      });

      if (result.success && result.data) {
        const audio = new Audio(audioBase64ToUrl(result.data.audio_base64, 'mp3'));
        audioRef.current = audio;
        audio.addEventListener('ended', () => setPlayingWord(null), { once: true });
        audio.addEventListener('error', () => setPlayingWord(null), { once: true });
        await audio.play();
        setPlayingWord(word);
      }
    } catch {
      // Synthesis failed
    } finally {
      setLoadingWord(null);
    }
  }, [playingWord, selectedLanguage, stopAudio]);

  const playDialogue = useCallback(async (title: string, text: string, index: number) => {
    if (playingDialogue === title) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingDialogue(title);

    try {
      // Detect language from the dialogue
      const langMap: Record<number, { language: string; voiceId: string }> = {
        0: { language: 'fr-fr', voiceId: 'ff_siwis' },
        1: { language: 'es-es', voiceId: 'ef_dora' },
        2: { language: 'de-de', voiceId: 'df_anna' },
        3: { language: 'fr-fr', voiceId: 'fm_marcelo' },
      };
      const lang = langMap[index] || langMap[0];

      const result = await api.voiceStudio.synthesize({
        text,
        voice_id: lang.voiceId,
        language: lang.language,
        output_format: 'mp3',
      });

      if (result.success && result.data) {
        const audio = new Audio(audioBase64ToUrl(result.data.audio_base64, 'mp3'));
        audioRef.current = audio;
        audio.addEventListener('ended', () => setPlayingDialogue(null), { once: true });
        audio.addEventListener('error', () => setPlayingDialogue(null), { once: true });
        await audio.play();
        setPlayingDialogue(title);
      }
    } catch {
      // Synthesis failed
    } finally {
      setLoadingDialogue(null);
    }
  }, [playingDialogue, stopAudio]);

  const currentWords = pronunciationWords[selectedLanguage] || pronunciationWords.french;

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
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
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
                    <option value="french">French</option>
                    <option value="spanish">Spanish</option>
                    <option value="german">German</option>
                    <option value="mandarin">Mandarin</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </div>

                <div className="flex flex-col items-center gap-4 py-8">
                  <div
                    className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      className="h-full w-full rounded-full flex items-center justify-center text-white"
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

                <div className="flex justify-center gap-4">
                  <Button variant="outline" disabled={isRecording}>
                    <Headphones className="h-4 w-4 mr-2" />
                    Listen
                  </Button>
                  <Button disabled={isRecording}>
                    <Play className="h-4 w-4 mr-2" />
                    Analyze
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
                      className="flex items-center justify-between p-3 border rounded-lg"
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
                    <Button className="w-full mt-4">
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
                <CardDescription>Practice difficult words — click the speaker to hear pronunciation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentWords.map(({ word, text }) => (
                    <div key={word} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{word}</p>
                        <p className="text-sm text-muted-foreground">Click to hear pronunciation</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playWord(word, text)}
                          disabled={loadingWord === word}
                        >
                          {loadingWord === word ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : playingWord === word ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="sm">
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
                {dialogues.map((dialogue, i) => (
                  <div key={i} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playDialogue(dialogue.title, dialogue.text, i)}
                        disabled={loadingDialogue === dialogue.title}
                      >
                        {loadingDialogue === dialogue.title ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : playingDialogue === dialogue.title ? (
                          <Square className="h-4 w-4 mr-1" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        {playingDialogue === dialogue.title ? 'Stop' : 'Listen'}
                      </Button>
                      <Button size="sm">
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
                  { title: 'Paris Cafe', language: 'French', environment: 'cafe' },
                  { title: 'Barcelona Market', language: 'Spanish', environment: 'market' },
                  { title: 'Tokyo Street', language: 'Japanese', environment: 'street' },
                ].map((scenario, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg border">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Globe className="h-12 w-12 text-primary/50" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium">{scenario.title}</h4>
                      <p className="text-sm text-muted-foreground">{scenario.language}</p>
                      <Button className="w-full mt-3" variant="outline">
                        <Headphones className="h-4 w-4 mr-2" />
                        Launch VR
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
