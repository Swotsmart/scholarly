'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Check,
  AlertCircle,
  Wand2,
  BookOpen,
  Type,
  SkipBack,
  SkipForward,
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
  speed: number;
  pitch: number;
  warmth: number;
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

const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Mandarin Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
];

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
    speed: 1.0,
    pitch: 0,
    warmth: 0,
  });
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Translation
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  // Voice library filters
  const [voiceLanguageFilter, setVoiceLanguageFilter] = useState('all');
  const [voiceGenderFilter, setVoiceGenderFilter] = useState('all');

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

  // Karaoke reader
  const [karaokeText, setKaraokeText] = useState('The cat sat on the mat. She had a big hat.');
  const [karaokeMode, setKaraokeMode] = useState<'word' | 'letter'>('word');
  const [karaokeWordIndex, setKaraokeWordIndex] = useState(-1);
  const [karaokeLetterIndex, setKaraokeLetterIndex] = useState(-1);
  const [karaokeAudioUrl, setKaraokeAudioUrl] = useState<string | null>(null);
  const [karaokeIsPlaying, setKaraokeIsPlaying] = useState(false);
  const [karaokeLoading, setKaraokeLoading] = useState(false);
  const karaokeAudioRef = useRef<HTMLAudioElement | null>(null);
  const karaokeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const karaokeStartTimeRef = useRef<number>(0);

  // UI
  const [error, setError] = useState<string | null>(null);

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
        // Map LinguaFlowVoice from API to frontend Voice shape
        const mapped: Voice[] = (Array.isArray(data.data) ? data.data : []).map((v: any) => ({
          voiceId: v.id,
          name: v.displayName,
          category: v.language,
          labels: {
            accent: v.accent,
            description: v.region && v.accent && v.region.toLowerCase() !== v.accent.toLowerCase()
              ? `${v.region} ${v.accent}`
              : v.accent || v.region || '',
            age: v.ageRange,
            gender: v.gender,
            use_case: v.speakingStyles?.join(', '),
          },
        }));
        setVoices(mapped);
        if (mapped.length > 0 && !selectedVoice) {
          setSelectedVoice(mapped[0]);
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

  const translateText = async (): Promise<string | null> => {
    if (!ttsText.trim()) return null;
    setIsTranslating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/voice/translate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ttsText,
          sourceLanguage,
          targetLanguage,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.data?.translatedText || null;
        setTranslatedText(translated);
        return translated;
      } else {
        const data = await res.json();
        setError(data.error || 'Translation failed');
        return null;
      }
    } catch {
      setError('Failed to translate text');
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  const generateSpeech = async () => {
    if (!selectedVoice || !ttsText.trim()) return;
    setTtsLoading(true);
    setError(null);

    // If translation is enabled, translate first
    let textToSpeak = ttsText;
    if (translateEnabled && sourceLanguage !== targetLanguage) {
      const translated = await translateText();
      if (!translated) {
        setTtsLoading(false);
        return;
      }
      textToSpeak = translated;
    } else {
      setTranslatedText(null);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/voice/tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
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

  // ---------------------------------------------------------------------------
  // Karaoke Reader
  // ---------------------------------------------------------------------------

  const karaokeWords = karaokeText.split(/\s+/).filter(Boolean);

  /** Total letters across all words (for letter-mode timing) */
  const karaokeTotalLetters = karaokeWords.reduce((sum, w) => sum + w.length, 0);

  const stopKaraoke = useCallback(() => {
    if (karaokeTimerRef.current) {
      clearInterval(karaokeTimerRef.current);
      karaokeTimerRef.current = null;
    }
    setKaraokeIsPlaying(false);
  }, []);

  const generateKaraokeAudio = async () => {
    if (!selectedVoice || !karaokeText.trim()) return;
    setKaraokeLoading(true);
    setError(null);
    stopKaraoke();
    setKaraokeWordIndex(-1);
    setKaraokeLetterIndex(-1);

    try {
      // Revoke old URL
      if (karaokeAudioUrl) URL.revokeObjectURL(karaokeAudioUrl);

      const speed = ttsSettings.speed;
      const pitch = ttsSettings.pitch;
      const warmth = ttsSettings.warmth;

      const res = await fetch(`${API_BASE_URL}/voice/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: karaokeText,
          voiceId: selectedVoice.voiceId,
          voiceSettings: {
            stability: ttsSettings.stability,
            similarityBoost: ttsSettings.similarityBoost,
            style: ttsSettings.style,
            speed,
            pitch,
            warmth,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `TTS failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setKaraokeAudioUrl(url);

      if (karaokeAudioRef.current) {
        karaokeAudioRef.current.src = url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate karaoke audio');
    } finally {
      setKaraokeLoading(false);
    }
  };

  const playKaraoke = useCallback(() => {
    if (!karaokeAudioRef.current || !karaokeAudioUrl) return;
    karaokeAudioRef.current.play();
    setKaraokeIsPlaying(true);
    karaokeStartTimeRef.current = Date.now();

    const duration = (karaokeAudioRef.current.duration || 3) * 1000; // ms
    const wordCount = karaokeWords.length;
    const totalLetters = karaokeTotalLetters;

    karaokeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - karaokeStartTimeRef.current;
      const progress = elapsed / duration;

      if (karaokeMode === 'word') {
        const wi = Math.min(Math.floor(progress * wordCount), wordCount - 1);
        setKaraokeWordIndex(wi);
        setKaraokeLetterIndex(-1);
      } else {
        // Letter mode: distribute time across all letters proportionally
        const letterPos = Math.min(Math.floor(progress * totalLetters), totalLetters - 1);
        let cumulative = 0;
        for (let wi = 0; wi < karaokeWords.length; wi++) {
          const wordLen = karaokeWords[wi].length;
          if (cumulative + wordLen > letterPos) {
            setKaraokeWordIndex(wi);
            setKaraokeLetterIndex(letterPos - cumulative);
            break;
          }
          cumulative += wordLen;
        }
      }

      if (progress >= 1) {
        stopKaraoke();
        setKaraokeWordIndex(wordCount - 1);
        if (karaokeMode === 'letter') {
          setKaraokeLetterIndex(karaokeWords[wordCount - 1].length - 1);
        }
      }
    }, 30); // ~33fps for smooth letter tracking
  }, [karaokeAudioUrl, karaokeWords, karaokeTotalLetters, karaokeMode, stopKaraoke]);

  const pauseKaraoke = useCallback(() => {
    if (karaokeAudioRef.current) karaokeAudioRef.current.pause();
    stopKaraoke();
  }, [stopKaraoke]);

  const resetKaraoke = useCallback(() => {
    if (karaokeAudioRef.current) {
      karaokeAudioRef.current.pause();
      karaokeAudioRef.current.currentTime = 0;
    }
    stopKaraoke();
    setKaraokeWordIndex(-1);
    setKaraokeLetterIndex(-1);
  }, [stopKaraoke]);

  // Cleanup karaoke timer on unmount
  useEffect(() => {
    return () => {
      if (karaokeTimerRef.current) clearInterval(karaokeTimerRef.current);
      if (karaokeAudioUrl) URL.revokeObjectURL(karaokeAudioUrl);
    };
  }, [karaokeAudioUrl]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

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
            Text-to-speech, pronunciation, voice cloning &amp; karaoke reading tools
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
          <TabsTrigger value="karaoke" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            Karaoke Reader
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

                {/* Translation toggle */}
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <Label className="cursor-pointer" htmlFor="translate-toggle">Translate before speaking</Label>
                    </div>
                    <input
                      id="translate-toggle"
                      type="checkbox"
                      checked={translateEnabled}
                      onChange={(e) => {
                        setTranslateEnabled(e.target.checked);
                        if (!e.target.checked) setTranslatedText(null);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  {translateEnabled && (
                    <div className="flex items-center gap-2">
                      <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSLATION_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground shrink-0">to</span>
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSLATION_LANGUAGES.filter(l => l.code !== sourceLanguage).map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {translatedText && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Translated text:</p>
                      <p className="text-sm">{translatedText}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Voice</Label>
                    <Select
                      value={voiceLanguageFilter}
                      onValueChange={setVoiceLanguageFilter}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Filter language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        {Array.from(new Set(voices.map(v => v.labels.accent || ''))).filter(Boolean).sort().map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select
                    value={selectedVoice?.voiceId}
                    onValueChange={(id) => setSelectedVoice(voices.find(v => v.voiceId === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingVoices ? 'Loading voices…' : 'Select a voice'} />
                    </SelectTrigger>
                    <SelectContent>
                      {voices
                        .filter(v => voiceLanguageFilter === 'all' || v.labels.accent === voiceLanguageFilter)
                        .map((voice) => (
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
                  disabled={ttsLoading || isTranslating || !selectedVoice || !ttsText.trim()}
                  className="w-full"
                >
                  {isTranslating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Translating…</>
                  ) : ttsLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
                  ) : translateEnabled && sourceLanguage !== targetLanguage ? (
                    <><Languages className="mr-2 h-4 w-4" />Translate &amp; Generate</>
                  ) : (
                    <><Volume2 className="mr-2 h-4 w-4" />Generate Speech</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Voice Studio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Voice Studio
                  </CardTitle>
                  <CardDescription>Tailor speech output to your learners</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Learner-Level Presets */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Early Years', desc: 'Slow, warm, gentle', speed: 0.65, pitch: 1, warmth: 3 },
                        { label: 'Primary', desc: 'Clear, measured pace', speed: 0.85, pitch: 0, warmth: 1 },
                        { label: 'Secondary', desc: 'Natural, balanced', speed: 1.0, pitch: 0, warmth: 0 },
                        { label: 'Fluent / Adult', desc: 'Conversational pace', speed: 1.15, pitch: 0, warmth: -1 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setTtsSettings(s => ({
                            ...s,
                            speed: preset.speed,
                            pitch: preset.pitch,
                            warmth: preset.warmth,
                          }))}
                        >
                          <span className="text-sm font-medium">{preset.label}</span>
                          <span className="text-xs text-muted-foreground">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4" />

                  {/* Speech Controls */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Speech Controls</Label>
                  </div>

                  {/* Speed */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Speed</Label>
                      <span className="text-sm text-muted-foreground">{ttsSettings.speed.toFixed(2)}x</span>
                    </div>
                    <Slider
                      value={[ttsSettings.speed]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, speed: v }))}
                      min={0.25} max={2.0} step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pace of speech (0.25x very slow – 2.0x double speed)
                    </p>
                  </div>

                  {/* Pitch */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Pitch</Label>
                      <span className="text-sm text-muted-foreground">
                        {ttsSettings.pitch > 0 ? '+' : ''}{ttsSettings.pitch} st
                      </span>
                    </div>
                    <Slider
                      value={[ttsSettings.pitch]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, pitch: v }))}
                      min={-6} max={6} step={0.5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher for younger characters, lower for older (±6 semitones)
                    </p>
                  </div>

                  {/* Warmth */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Warmth</Label>
                      <span className="text-sm text-muted-foreground">
                        {ttsSettings.warmth > 0 ? '+' : ''}{ttsSettings.warmth.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[ttsSettings.warmth]}
                      onValueChange={([v]) => setTtsSettings(s => ({ ...s, warmth: v }))}
                      min={-6} max={6} step={0.5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Warmer for storytelling, brighter for phonics drills (±6)
                    </p>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom row: Voice Character + Playback side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Voice Character */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Character</CardTitle>
                <CardDescription>Fine-tune voice personality traits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
        </TabsContent>

        {/* ══ Voice Library Tab ══ */}
        <TabsContent value="voices" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Available Voices</CardTitle>
                <CardDescription>{voices.length} voices available from Kokoro TTS + Edge TTS</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchVoices} disabled={loadingVoices}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingVoices ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {/* Language & Gender Filters */}
              {voices.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={voiceLanguageFilter} onValueChange={setVoiceLanguageFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {[...new Set(voices.map(v => v.category))].sort().map(lang => (
                        <SelectItem key={lang} value={lang}>
                          {TRANSLATION_LANGUAGES.find(l => l.code === lang)?.label || lang} ({voices.filter(v => v.category === lang).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={voiceGenderFilter} onValueChange={setVoiceGenderFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  {voices
                    .filter(v => voiceLanguageFilter === 'all' || v.category === voiceLanguageFilter)
                    .filter(v => voiceGenderFilter === 'all' || v.labels.gender === voiceGenderFilter)
                    .map((voice) => (
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

        {/* ══ Karaoke Reader Tab ══ */}
        <TabsContent value="karaoke" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Text input + controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Karaoke Reader
                </CardTitle>
                <CardDescription>
                  Word and letter tracking for early years reading practice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Reading text</Label>
                  <Textarea
                    value={karaokeText}
                    onChange={(e) => setKaraokeText(e.target.value)}
                    placeholder="Enter text for karaoke reading…"
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {karaokeText.length} / 2000 characters • {karaokeWords.length} words
                  </p>
                </div>

                {/* Tracking mode toggle */}
                <div className="space-y-2">
                  <Label>Tracking mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                        karaokeMode === 'word'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => setKaraokeMode('word')}
                    >
                      <Type className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium block">Word</span>
                        <span className="text-xs text-muted-foreground">Highlights each word</span>
                      </div>
                    </button>
                    <button
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                        karaokeMode === 'letter'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => setKaraokeMode('letter')}
                    >
                      <BookOpen className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium block">Letter</span>
                        <span className="text-xs text-muted-foreground">Tracks each letter</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Voice selection reminder */}
                {!selectedVoice && (
                  <div className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
                    Select a voice in the TTS tab first
                  </div>
                )}

                <Button
                  onClick={generateKaraokeAudio}
                  disabled={karaokeLoading || !selectedVoice || !karaokeText.trim()}
                  className="w-full"
                >
                  {karaokeLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating audio…</>
                  ) : (
                    <><Volume2 className="mr-2 h-4 w-4" />Generate Karaoke Audio</>
                  )}
                </Button>

                {/* Playback controls */}
                {karaokeAudioUrl && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="outline" size="icon" onClick={resetKaraoke} title="Reset">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={karaokeIsPlaying ? pauseKaraoke : playKaraoke}
                        className="gap-2 px-6"
                        size="lg"
                      >
                        {karaokeIsPlaying ? (
                          <><Pause className="h-5 w-5" /> Pause</>
                        ) : (
                          <><Play className="h-5 w-5" /> Play</>
                        )}
                      </Button>
                      <Button variant="outline" size="icon" onClick={resetKaraoke} title="Stop">
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Audio progress */}
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-primary rounded-full transition-all duration-100 ${karaokeIsPlaying ? '' : ''}`}
                          style={{
                            width: karaokeWordIndex >= 0
                              ? `${Math.min(((karaokeWordIndex + 1) / karaokeWords.length) * 100, 100)}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {karaokeWordIndex >= 0
                            ? `Word ${karaokeWordIndex + 1} of ${karaokeWords.length}`
                            : 'Ready'
                          }
                        </span>
                        <span>{karaokeIsPlaying ? 'Playing' : karaokeWordIndex >= 0 ? 'Paused' : ''}</span>
                      </div>
                    </div>

                    {/* Tracking speed */}
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex justify-between">
                        <Label className="text-sm">Tracking Speed</Label>
                        <span className="text-sm text-muted-foreground">{ttsSettings.speed.toFixed(2)}x</span>
                      </div>
                      <Slider
                        value={[ttsSettings.speed]}
                        onValueChange={([v]) => setTtsSettings(s => ({ ...s, speed: v }))}
                        min={0.25} max={2.0} step={0.05}
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjusts audio speed and word/letter tracking cadence
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Karaoke display */}
            <Card>
              <CardHeader>
                <CardTitle>Reading Display</CardTitle>
                <CardDescription>
                  {karaokeMode === 'word'
                    ? 'Each word highlights as it is spoken'
                    : 'Each letter highlights for phonics tracking'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {karaokeWords.length > 0 ? (
                  <div className="rounded-xl bg-muted/30 p-6 min-h-[200px] flex flex-wrap items-start content-start gap-x-3 gap-y-4 text-2xl lg:text-3xl leading-relaxed font-medium select-none">
                    {karaokeWords.map((word, wi) => {
                      const isActiveWord = wi === karaokeWordIndex;
                      const isPastWord = wi < karaokeWordIndex;

                      if (karaokeMode === 'letter') {
                        return (
                          <span key={wi} className="inline-flex">
                            {word.split('').map((letter, li) => {
                              const isActiveLetter = isActiveWord && li === karaokeLetterIndex;
                              const isPastLetter = isPastWord || (isActiveWord && li < karaokeLetterIndex);
                              return (
                                <span
                                  key={li}
                                  className={`
                                    inline-block transition-all duration-100
                                    ${isActiveLetter
                                      ? 'text-primary scale-125 font-bold drop-shadow-md'
                                      : isPastLetter
                                        ? 'text-primary/50'
                                        : karaokeWordIndex >= 0
                                          ? 'text-muted-foreground/40'
                                          : 'text-foreground'
                                    }
                                  `}
                                >
                                  {letter}
                                </span>
                              );
                            })}
                          </span>
                        );
                      }

                      // Word mode
                      return (
                        <span
                          key={wi}
                          className={`
                            inline-block px-1 py-0.5 rounded-lg transition-all duration-150
                            ${isActiveWord
                              ? 'bg-primary text-primary-foreground scale-110 font-bold shadow-lg'
                              : isPastWord
                                ? 'text-primary/50'
                                : karaokeWordIndex >= 0
                                  ? 'text-muted-foreground/40'
                                  : 'text-foreground'
                            }
                          `}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Enter text to see the karaoke display</p>
                  </div>
                )}

                {/* Legend */}
                {karaokeWordIndex >= 0 && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-primary" />
                      <span>Current {karaokeMode}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-primary/50" />
                      <span>Already read</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-muted-foreground/40" />
                      <span>Upcoming</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hidden audio element for karaoke */}
          <audio
            ref={karaokeAudioRef}
            onEnded={() => {
              stopKaraoke();
              setKaraokeWordIndex(karaokeWords.length - 1);
              if (karaokeMode === 'letter') {
                setKaraokeLetterIndex((karaokeWords[karaokeWords.length - 1]?.length ?? 1) - 1);
              }
            }}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
