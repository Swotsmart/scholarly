'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Users,
  Activity,
  Settings2,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// =============================================================================
// Types
// =============================================================================

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

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable' | 'checking';
  latencyMs?: number;
  model?: string;
}

// =============================================================================
// Constants
// =============================================================================

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '');
const API_BASE_URL = normalizedApiUrl.endsWith('/api/v1')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api/v1`;

// =============================================================================
// Page Component
// =============================================================================

const VALID_TABS = ['tts', 'voices', 'cloning', 'pronunciation', 'api'] as const;

export default function VoiceIntelligencePage() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = VALID_TABS.includes(tabParam as any) ? tabParam! : 'tts';

  // Service health
  const [health, setHealth] = useState<ServiceHealth>({ status: 'checking' });

  // Voice library
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);

  // TTS
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

  // Pronunciation
  const [pronText, setPronText] = useState('The quick brown fox jumps over the lazy dog.');
  const [pronLanguage, setPronLanguage] = useState('en');
  const [isRecording, setIsRecording] = useState(false);
  const [pronResult] = useState<any>(null);

  // Voice cloning
  const [cloneName, setCloneName] = useState('');
  const [cloneDescription, setCloneDescription] = useState('');
  const [cloneProvider, setCloneProvider] = useState<'chatterbox' | 'kokoro'>('chatterbox');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneResult, setCloneResult] = useState<{ cloneId: string; voiceId: string } | null>(null);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (accessToken) {
      checkHealth();
      fetchVoices();
    }
  }, [accessToken]);

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ---------------------------------------------------------------------------
  // API Calls
  // ---------------------------------------------------------------------------

  const checkHealth = async () => {
    if (!accessToken) return;
    setHealth({ status: 'checking' });
    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE_URL}/voice/voices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        setHealth({ status: 'healthy', latencyMs, model: 'Kokoro TTS + Whisper STT' });
      } else {
        setHealth({ status: 'degraded', latencyMs });
      }
    } catch {
      setHealth({ status: 'unavailable' });
    }
  };

  const fetchVoices = async () => {
    setLoadingVoices(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/voice/voices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setVoices(data.data.voices || []);
        if (data.data.voices?.length > 0 && !selectedVoice) {
          setSelectedVoice(data.data.voices[0]);
        }
      } else {
        setError(data.error || 'Failed to fetch voices');
      }
    } catch {
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
      const res = await fetch(`${API_BASE_URL}/voice/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ttsText,
          voiceId: selectedVoice.voiceId,
          voiceSettings: ttsSettings,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate speech');
      }
    } catch {
      setError('Failed to generate speech');
    } finally {
      setTtsLoading(false);
    }
  };

  const createVoiceClone = async () => {
    if (!cloneName.trim()) return;
    setCloneLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/voice/clones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cloneName,
          description: cloneDescription,
          provider: cloneProvider,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCloneResult(data.data);
      } else {
        setError(data.error || 'Failed to create voice clone');
      }
    } catch {
      setError('Failed to create voice clone');
    } finally {
      setCloneLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
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

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

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

  const healthColour = {
    healthy: 'text-green-600 dark:text-green-400',
    degraded: 'text-yellow-600 dark:text-yellow-400',
    unavailable: 'text-red-600 dark:text-red-400',
    checking: 'text-muted-foreground',
  }[health.status];

  const healthLabel = {
    healthy: 'Service healthy',
    degraded: 'Service degraded',
    unavailable: 'Service unavailable',
    checking: 'Checking…',
  }[health.status];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Voice Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Self-hosted Kokoro TTS · Whisper STT · Chatterbox voice cloning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${healthColour}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${
              health.status === 'healthy' ? 'bg-green-500 animate-pulse' :
              health.status === 'degraded' ? 'bg-yellow-500' :
              health.status === 'unavailable' ? 'bg-red-500' : 'bg-muted-foreground'
            }`} />
            {healthLabel}
            {health.latencyMs && (
              <span className="text-muted-foreground font-normal">({health.latencyMs}ms)</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={!accessToken}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── AI Insight Banner ── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Self-hosted voice pipeline active.</span>
            {' '}Kokoro TTS replaced ElevenLabs in Sprint 29, reducing narration costs ~98%.
            Voice cloning (Chatterbox) is available for content creators and platform admins.
            {health.model && (
              <span className="ml-2 text-primary font-medium">{health.model}</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* ── Hidden audio element ── */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* ── Tabs ── */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tts" className="flex items-center gap-1.5">
            <Volume2 className="h-4 w-4" />
            Text-to-Speech
          </TabsTrigger>
          <TabsTrigger value="voices" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Voice Library
          </TabsTrigger>
          <TabsTrigger value="cloning" className="flex items-center gap-1.5">
            <Wand2 className="h-4 w-4" />
            Voice Cloning
          </TabsTrigger>
          <TabsTrigger value="pronunciation" className="flex items-center gap-1.5">
            <Mic className="h-4 w-4" />
            Pronunciation
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            API Reference
          </TabsTrigger>
        </TabsList>

        {/* ══ TTS Tab ══ */}
        <TabsContent value="tts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Speech</CardTitle>
                <CardDescription>
                  Convert text to natural speech using the self-hosted Kokoro TTS engine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text to speak</Label>
                  <Textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter text to convert to speech…"
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
                      <SelectValue placeholder={loadingVoices ? 'Loading voices…' : 'Select a voice'} />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.voiceId} value={voice.voiceId}>
                          {voice.name} {voice.labels.accent ? `(${voice.labels.accent})` : ''}
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
                    <div className="flex gap-2 mt-2 flex-wrap">
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
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                  ) : (
                    <><Volume2 className="mr-2 h-4 w-4" />Generate Speech</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Voice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Voice Settings</CardTitle>
                  <CardDescription>Fine-tune the output characteristics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'stability' as const, label: 'Stability', hint: 'Higher = more consistent, Lower = more expressive' },
                    { key: 'similarityBoost' as const, label: 'Similarity Boost', hint: 'How closely to match the original voice' },
                    { key: 'style' as const, label: 'Style', hint: 'Style exaggeration (0 = neutral, 1 = very expressive)' },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between">
                        <Label>{label}</Label>
                        <span className="text-sm text-muted-foreground">{ttsSettings[key].toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[ttsSettings[key]]}
                        onValueChange={([v]) => setTtsSettings(s => ({ ...s, [key]: v }))}
                        min={0} max={1} step={0.01}
                      />
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Playback */}
              <Card>
                <CardHeader><CardTitle>Playback</CardTitle></CardHeader>
                <CardContent>
                  {audioUrl ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={togglePlayback}>
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline" size="icon"
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
                            <div className={`h-full bg-primary transition-all ${isPlaying ? 'animate-pulse w-full' : 'w-0'}`} />
                          </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={downloadAudio}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">Audio generated successfully</p>
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

        {/* ══ Voice Library Tab ══ */}
        <TabsContent value="voices" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Available Voices</CardTitle>
                <CardDescription>{voices.length} voices available from Kokoro TTS</CardDescription>
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
              ) : voices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No voices loaded — check voice service health</p>
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
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {voice.labels.gender && <Badge variant="secondary" className="text-xs">{voice.labels.gender}</Badge>}
                          {voice.labels.accent && <Badge variant="secondary" className="text-xs">{voice.labels.accent}</Badge>}
                          {voice.labels.age && <Badge variant="secondary" className="text-xs">{voice.labels.age}</Badge>}
                          {voice.labels.use_case && <Badge variant="outline" className="text-xs">{voice.labels.use_case}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Voice Cloning Tab ══ */}
        <TabsContent value="cloning" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Create Voice Clone
                </CardTitle>
                <CardDescription>
                  Clone a voice using Chatterbox (Sprint 29). Requires platform_admin,
                  tutor, or content_creator role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Clone name</Label>
                  <Input
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="e.g. Pip's Reading Voice"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={cloneDescription}
                    onChange={(e) => setCloneDescription(e.target.value)}
                    placeholder="Warm, encouraging voice for phonics narration…"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={cloneProvider}
                    onValueChange={(v) => setCloneProvider(v as 'chatterbox' | 'kokoro')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatterbox">Chatterbox (recommended)</SelectItem>
                      <SelectItem value="kokoro">Kokoro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={createVoiceClone}
                  disabled={cloneLoading || !cloneName.trim()}
                  className="w-full"
                >
                  {cloneLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating clone…</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" />Create Voice Clone</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clone Result</CardTitle>
                <CardDescription>
                  Once created, the voice ID can be used in TTS requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cloneResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <p className="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Voice clone created successfully
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                        <span className="text-sm text-muted-foreground">Clone ID</span>
                        <code className="text-sm font-mono">{cloneResult.cloneId}</code>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded bg-muted/50">
                        <span className="text-sm text-muted-foreground">Voice ID</span>
                        <code className="text-sm font-mono">{cloneResult.voiceId}</code>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use the Voice ID in TTS requests to synthesise speech with this clone.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Create a voice clone to see results here</p>
                    <p className="text-xs mt-2">Powered by Chatterbox (Sprint 29)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ Pronunciation Tab ══ */}
        <TabsContent value="pronunciation" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pronunciation Assessment</CardTitle>
                <CardDescription>
                  Practice speaking and receive Whisper STT feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text to practise</Label>
                  <Textarea
                    value={pronText}
                    onChange={(e) => setPronText(e.target.value)}
                    placeholder="Enter text to practise speaking…"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={pronLanguage} onValueChange={setPronLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
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
                    <><Square className="mr-2 h-4 w-4" />Stop Recording</>
                  ) : (
                    <><Mic className="mr-2 h-4 w-4" />Start Recording</>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  {isRecording
                    ? 'Recording… speak the text above clearly'
                    : 'Click to start recording your pronunciation'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
                <CardDescription>Accuracy, fluency, and prosody scores</CardDescription>
              </CardHeader>
              <CardContent>
                {pronResult ? (
                  <div className="space-y-4">{/* Results rendered here once STT returns */}</div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Languages className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Record your speech to see assessment results</p>
                    <p className="text-xs mt-2">Powered by self-hosted Whisper STT</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ API Reference Tab ══ */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
              <CardDescription>Voice Intelligence endpoints — all at /api/v1/voice/*</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {[
                  { method: 'POST', path: '/voice/tts', desc: 'Text-to-Speech (Kokoro)' },
                  { method: 'POST', path: '/voice/stt', desc: 'Speech-to-Text (Whisper)' },
                  { method: 'GET',  path: '/voice/voices', desc: 'List available voices' },
                  { method: 'POST', path: '/voice/pronunciation/assess', desc: 'Pronunciation assessment' },
                  { method: 'POST', path: '/voice/agents', desc: 'Create conversation agent' },
                  { method: 'POST', path: '/voice/sessions', desc: 'Start voice session' },
                  { method: 'DELETE', path: '/voice/sessions/:id', desc: 'End voice session' },
                  { method: 'POST', path: '/voice/clones', desc: 'Create voice clone (Chatterbox)' },
                  { method: 'POST', path: '/voice/dialogues', desc: 'Generate multi-speaker dialogue' },
                  { method: 'GET',  path: '/voice/ws/stats', desc: 'WebSocket stats (admin)' },
                ].map((ep) => (
                  <div key={ep.path} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <Badge
                      variant={ep.method === 'GET' ? 'secondary' : ep.method === 'DELETE' ? 'destructive' : 'default'}
                      className="font-mono text-xs w-16 justify-center"
                    >
                      {ep.method}
                    </Badge>
                    <code className="text-sm flex-1">{ep.path}</code>
                    <span className="text-sm text-muted-foreground">{ep.desc}</span>
                  </div>
                ))}
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
