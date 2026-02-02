'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Square,
  Loader2,
  Languages,
  MessageSquare,
  Users,
  Activity,
  Settings2,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface Voice {
  voiceId: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  previewUrl?: string;
}

interface TTSSettings {
  stability: number;
  similarityBoost: number;
  style: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export default function VoiceIntelligenceDemo() {
  const { accessToken } = useAuthStore();

  // Voice library state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);

  // TTS state
  const [ttsText, setTtsText] = useState('Welcome to Scholarly, your unified learning platform powered by AI.');
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.5,
  });
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pronunciation state
  const [pronText, setPronText] = useState('The quick brown fox jumps over the lazy dog.');
  const [pronLanguage, setPronLanguage] = useState('en');
  const [isRecording, setIsRecording] = useState(false);
  const [pronResult, setPronResult] = useState<any>(null);

  // Multi-speaker dialogue state
  const [dialogueScript, setDialogueScript] = useState(`Character 1: Hello, how are you today?
Character 2: I'm doing great, thanks for asking!
Character 1: That's wonderful to hear.`);
  const [dialogueLoading, setDialogueLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch voices on mount
  useEffect(() => {
    if (accessToken) {
      fetchVoices();
    }
  }, [accessToken]);

  const fetchVoices = async () => {
    setLoadingVoices(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/voice/voices`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setVoices(data.data.voices || []);
        if (data.data.voices?.length > 0) {
          setSelectedVoice(data.data.voices[0]);
        }
      } else {
        setError(data.error || 'Failed to fetch voices');
      }
    } catch (err) {
      setError('Failed to connect to voice service');
    } finally {
      setLoadingVoices(false);
    }
  };

  const generateSpeech = async () => {
    if (!selectedVoice || !ttsText.trim()) return;

    setTtsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/voice/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ttsText,
          voiceId: selectedVoice.voiceId,
          voiceSettings: {
            stability: ttsSettings.stability,
            similarityBoost: ttsSettings.similarityBoost,
            style: ttsSettings.style,
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Auto-play
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to generate speech');
      }
    } catch (err) {
      setError('Failed to generate speech');
    } finally {
      setTtsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'scholarly-tts.mp3';
    a.click();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleCode = `// Text-to-Speech API Example
const response = await fetch('${API_BASE_URL}/voice/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '${ttsText.slice(0, 50)}...',
    voiceId: '${selectedVoice?.voiceId || 'VOICE_ID'}',
    voiceSettings: {
      stability: ${ttsSettings.stability},
      similarityBoost: ${ttsSettings.similarityBoost},
      style: ${ttsSettings.style},
    },
  }),
});

// Response is audio/mpeg binary data
const audioBlob = await response.blob();`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Voice Intelligence Demo
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore ElevenLabs-powered voice features for language learning
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="h-3 w-3 mr-1" />
          Powered by ElevenLabs
        </Badge>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <Tabs defaultValue="tts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tts" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Text-to-Speech
          </TabsTrigger>
          <TabsTrigger value="voices" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Voice Library
          </TabsTrigger>
          <TabsTrigger value="pronunciation" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Pronunciation
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            API Reference
          </TabsTrigger>
        </TabsList>

        {/* Text-to-Speech Tab */}
        <TabsContent value="tts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Speech</CardTitle>
                <CardDescription>
                  Enter text and select a voice to generate natural-sounding speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text to speak</Label>
                  <Textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter text to convert to speech..."
                    rows={4}
                    maxLength={5000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {ttsText.length} / 5000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select
                    value={selectedVoice?.voiceId}
                    onValueChange={(id) => setSelectedVoice(voices.find(v => v.voiceId === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.voiceId} value={voice.voiceId}>
                          {voice.name} ({voice.labels.accent || 'neutral'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVoice && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="font-medium">{selectedVoice.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVoice.labels.description || 'Professional voice'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {selectedVoice.labels.gender && (
                        <Badge variant="outline" className="text-xs">{selectedVoice.labels.gender}</Badge>
                      )}
                      {selectedVoice.labels.accent && (
                        <Badge variant="outline" className="text-xs">{selectedVoice.labels.accent}</Badge>
                      )}
                      {selectedVoice.labels.age && (
                        <Badge variant="outline" className="text-xs">{selectedVoice.labels.age}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={generateSpeech}
                  disabled={ttsLoading || !selectedVoice || !ttsText.trim()}
                  className="w-full"
                >
                  {ttsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Generate Speech
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Settings & Playback Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Settings</CardTitle>
                  <CardDescription>
                    Fine-tune the voice output characteristics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Stability</Label>
                      <span className="text-sm text-muted-foreground">{ttsSettings.stability.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[ttsSettings.stability]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, stability: v }))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher = more consistent, Lower = more expressive
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Similarity Boost</Label>
                      <span className="text-sm text-muted-foreground">{ttsSettings.similarityBoost.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[ttsSettings.similarityBoost]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, similarityBoost: v }))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                    <p className="text-xs text-muted-foreground">
                      How closely to match the original voice
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Style</Label>
                      <span className="text-sm text-muted-foreground">{ttsSettings.style.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[ttsSettings.style]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, style: v }))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                    <p className="text-xs text-muted-foreground">
                      Style exaggeration (0 = neutral, 1 = very expressive)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Playback Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Playback</CardTitle>
                </CardHeader>
                <CardContent>
                  {audioUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={togglePlayback}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.pause();
                              audioRef.current.currentTime = 0;
                              setIsPlaying(false);
                            }
                          }}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-primary transition-all ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: isPlaying ? '100%' : '0%' }} />
                          </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={downloadAudio}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Audio generated successfully
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Volume2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Generate speech to preview playback</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Voice Library Tab */}
        <TabsContent value="voices" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Available Voices</CardTitle>
                <CardDescription>
                  {voices.length} voices available from ElevenLabs
                </CardDescription>
              </div>
              <Button variant="outline" onClick={fetchVoices} disabled={loadingVoices}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingVoices ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingVoices ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {voices.map((voice) => (
                    <Card
                      key={voice.voiceId}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedVoice?.voiceId === voice.voiceId ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedVoice(voice)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{voice.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {voice.labels.description || voice.category}
                            </p>
                          </div>
                          {selectedVoice?.voiceId === voice.voiceId && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {voice.labels.gender && (
                            <Badge variant="secondary" className="text-xs">{voice.labels.gender}</Badge>
                          )}
                          {voice.labels.accent && (
                            <Badge variant="secondary" className="text-xs">{voice.labels.accent}</Badge>
                          )}
                          {voice.labels.age && (
                            <Badge variant="secondary" className="text-xs">{voice.labels.age}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pronunciation Tab */}
        <TabsContent value="pronunciation" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pronunciation Assessment</CardTitle>
                <CardDescription>
                  Practice speaking and get feedback on your pronunciation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text to practice</Label>
                  <Textarea
                    value={pronText}
                    onChange={(e) => setPronText(e.target.value)}
                    placeholder="Enter text to practice speaking..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={pronLanguage} onValueChange={setPronLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={isRecording ? 'destructive' : 'default'}
                  className="w-full"
                  onClick={() => setIsRecording(!isRecording)}
                >
                  {isRecording ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  {isRecording
                    ? 'Recording... Speak the text above clearly'
                    : 'Click to start recording your pronunciation'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
                <CardDescription>
                  Your pronunciation score and feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pronResult ? (
                  <div className="space-y-4">
                    {/* Results would be displayed here */}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Languages className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Record your speech to see assessment results</p>
                    <p className="text-xs mt-2">
                      Scores for accuracy, fluency, and prosody
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Reference Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
              <CardDescription>
                Integration examples for the Voice Intelligence API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Available Endpoints</h3>
                <div className="space-y-2">
                  {[
                    { method: 'POST', path: '/voice/tts', desc: 'Text-to-Speech' },
                    { method: 'POST', path: '/voice/stt', desc: 'Speech-to-Text' },
                    { method: 'GET', path: '/voice/voices', desc: 'List voices' },
                    { method: 'POST', path: '/voice/pronunciation/assess', desc: 'Pronunciation assessment' },
                    { method: 'POST', path: '/voice/agents', desc: 'Create conversation agent' },
                    { method: 'POST', path: '/voice/sessions', desc: 'Start voice session' },
                    { method: 'POST', path: '/voice/clones', desc: 'Create voice clone' },
                    { method: 'POST', path: '/voice/dialogues', desc: 'Generate multi-speaker dialogue' },
                  ].map((endpoint) => (
                    <div key={endpoint.path} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'} className="font-mono text-xs">
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm flex-1">{endpoint.path}</code>
                      <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Example: Text-to-Speech</h3>
                  <Button variant="outline" size="sm" onClick={() => copyCode(sampleCode)}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 text-slate-50 overflow-x-auto text-sm">
                  <code>{sampleCode}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
