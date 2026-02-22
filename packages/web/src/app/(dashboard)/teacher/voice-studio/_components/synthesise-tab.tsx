'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api, { type SynthesizeResult, type TranslateAndSpeakResult, type VoiceWordTimestamp } from '@/lib/api';
import { VOICE_PERSONAS, PACE_CONFIG, phaseToMultiplier, PREVIEW_SENTENCE, type VoicePersona } from './voice-persona-data';
import { KaraokePlayer } from './karaoke-player';
import {
  Mic, Play, Pause, Square, Download, Loader2, Check, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Language display names
const LANGUAGE_LABELS: Record<string, string> = {
  'en-us': 'English (US)',
  'en-gb': 'English (UK)',
  'es-es': 'Spanish',
  'fr-fr': 'French',
  'hi-in': 'Hindi',
  'it-it': 'Italian',
  'ja-jp': 'Japanese',
  'ko-kr': 'Korean',
  'pt-br': 'Portuguese (BR)',
  'zh-cn': 'Chinese (Mandarin)',
};

interface VoiceOption {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  style: string;
}

interface StudioAudio {
  base64: string;
  duration: number;
  format: string;
  timestamps: VoiceWordTimestamp[];
}

interface SynthesiseTabProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setStudioAudio: (audio: StudioAudio) => void;
  isPlaying: boolean;
  serviceStatus: 'checking' | 'online' | 'offline';
  playAudio: (base64: string, format: string) => void;
  togglePlayback: () => void;
  stopAudio: () => void;
  playbackProgress: number;
  setError: (error: string | null) => void;
  /** Called when user selects a persona from Voice Library tab */
  preselectedPersona?: VoicePersona | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SynthesiseTab({
  audioRef,
  setStudioAudio,
  isPlaying,
  serviceStatus,
  playAudio,
  togglePlayback,
  stopAudio,
  playbackProgress,
  setError,
  preselectedPersona,
}: SynthesiseTabProps) {
  const [synthText, setSynthText] = useState(PREVIEW_SENTENCE);
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona | null>(preselectedPersona ?? VOICE_PERSONAS[0]);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [synthPace, setSynthPace] = useState(1.0);
  const [synthPitch, setSynthPitch] = useState(0);
  const [synthWarmth, setSynthWarmth] = useState(0);
  const [synthLanguage, setSynthLanguage] = useState<string>('auto');
  const [wordTimestamps, setWordTimestamps] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthResult, setSynthResult] = useState<SynthesizeResult | null>(null);
  const [translationInfo, setTranslationInfo] = useState<{
    translatedText: string;
    transliteration: string | null;
    sourceLanguage: string;
    targetLanguage: string;
  } | null>(null);

  // All voices from API (for language browser)
  const [allVoices, setAllVoices] = useState<VoiceOption[]>([]);
  const [showVoiceBrowser, setShowVoiceBrowser] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);

  // Fetch all voices on mount
  useEffect(() => {
    api.voiceStudio.getVoices().then(res => {
      if (res.success) setAllVoices(res.data.voices);
    });
  }, []);

  // Apply preselected persona from Voice Library tab
  useEffect(() => {
    if (preselectedPersona) {
      applyPersona(preselectedPersona);
    }
  }, [preselectedPersona]);

  const applyPersona = useCallback((persona: VoicePersona) => {
    setSelectedPersona(persona);
    setSynthPace(persona.defaults.pace);
    setSynthPitch(persona.defaults.pitch);
    setSynthWarmth(persona.defaults.warmth);
    setSelectedPhase(null);
  }, []);

  const applyPhase = useCallback((phase: number) => {
    setSelectedPhase(phase);
    setSynthPace(phaseToMultiplier(phase));
  }, []);

  const charCount = synthText.length;
  const estimatedSeconds = Math.ceil(charCount / 15);

  // Determine if the selected language needs translation (non-English)
  const needsTranslation = synthLanguage !== 'auto' && !synthLanguage.startsWith('en-');

  const handleSynthesize = async () => {
    if (!synthText.trim()) return;
    setError(null);
    setSynthesizing(true);
    try {
      if (needsTranslation) {
        // Use translate-and-speak for non-English languages
        const res = await api.voiceStudio.translateAndSpeak({
          text: synthText,
          target_language: synthLanguage,
          voice_id: customVoiceId || selectedPersona?.voiceId || undefined,
          speed: synthPace,
          word_timestamps: wordTimestamps,
        });
        if (!res.success) {
          setError(res.error || 'Translation & synthesis failed');
          return;
        }
        // Map translate-and-speak result to SynthesizeResult shape
        const mapped: SynthesizeResult = {
          audio_base64: res.data.audio_base64,
          duration_seconds: res.data.duration_seconds,
          sample_rate: 24000,
          format: res.data.audio_format,
          word_timestamps: res.data.word_timestamps ?? [],
          cost: {
            provider: 'kokoro+claude',
            compute_seconds: res.data.duration_seconds,
            estimated_cost_usd: res.data.cost.total_cost_usd,
            model: 'kokoro-v1',
          },
        };
        setSynthResult(mapped);
        setTranslationInfo({
          translatedText: res.data.translated_text,
          transliteration: res.data.transliteration,
          sourceLanguage: res.data.source_language,
          targetLanguage: res.data.target_language,
        });
        setStudioAudio({
          base64: res.data.audio_base64,
          duration: res.data.duration_seconds,
          format: res.data.audio_format,
          timestamps: res.data.word_timestamps ?? [],
        });
        playAudio(res.data.audio_base64, res.data.audio_format);
      } else {
        // Use direct synthesis for English or auto-detect
        const res = await api.voiceStudio.synthesize({
          text: synthText,
          voice_id: customVoiceId || selectedPersona?.voiceId || undefined,
          language: synthLanguage !== 'auto' ? synthLanguage : undefined,
          pace: synthPace,
          pitch: synthPitch,
          warmth: synthWarmth,
          word_timestamps: wordTimestamps,
        });
        if (!res.success) {
          setError(res.error || 'Synthesis failed');
          return;
        }
        setSynthResult(res.data);
        setTranslationInfo(null);
        setStudioAudio({
          base64: res.data.audio_base64,
          duration: res.data.duration_seconds,
          format: res.data.format,
          timestamps: res.data.word_timestamps,
        });
        playAudio(res.data.audio_base64, res.data.format);
      }
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Voice Persona Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voice Persona</CardTitle>
          <CardDescription>Select a Kokoro voice persona for narration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {VOICE_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                onClick={() => applyPersona(persona)}
                className={cn(
                  'rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md',
                  selectedPersona?.id === persona.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30',
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{persona.name}</h4>
                  <Badge variant="outline" className="font-mono text-xs">{persona.voiceId}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{persona.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {persona.ageGroups.map(ag => (
                    <Badge key={ag} variant="secondary" className="text-xs">Ages {ag}</Badge>
                  ))}
                  <Badge variant="outline" className="text-xs capitalize">{persona.gender} &middot; {persona.style}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.themes.slice(0, 4).map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                  {persona.themes.length > 4 && (
                    <Badge variant="outline" className="text-xs">+{persona.themes.length - 4}</Badge>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Pace {persona.defaults.pace}x &middot; Pitch {persona.defaults.pitch} st &middot; Warmth {persona.defaults.warmth > 0 ? '+' : ''}{persona.defaults.warmth}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Voices Browser */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowVoiceBrowser(!showVoiceBrowser)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">All Voices</CardTitle>
              <Badge variant="secondary">{allVoices.length} voices &middot; {Object.keys(LANGUAGE_LABELS).length} languages</Badge>
              {customVoiceId && (
                <Badge variant="default" className="font-mono">{customVoiceId}</Badge>
              )}
            </div>
            {showVoiceBrowser ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showVoiceBrowser && (
          <CardContent className="space-y-3">
            {/* Language filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedLanguage === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage(null)}
              >
                All
              </Button>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => {
                const count = allVoices.filter(v => v.language === code).length;
                if (count === 0) return null;
                return (
                  <Button
                    key={code}
                    variant={selectedLanguage === code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedLanguage(code)}
                  >
                    {label} ({count})
                  </Button>
                );
              })}
            </div>

            {/* Voice grid */}
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {allVoices
                .filter(v => !selectedLanguage || v.language === selectedLanguage)
                .map(voice => (
                  <div
                    key={voice.voice_id}
                    onClick={() => {
                      setCustomVoiceId(voice.voice_id);
                      setSelectedPersona(null);
                      setSynthLanguage(voice.language);
                    }}
                    className={cn(
                      'rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm text-sm',
                      customVoiceId === voice.voice_id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{voice.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">{voice.voice_id}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">{LANGUAGE_LABELS[voice.language] || voice.language}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{voice.gender}</Badge>
                    </div>
                  </div>
                ))}
            </div>

            {customVoiceId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomVoiceId(null);
                  setSelectedPersona(VOICE_PERSONAS[0]);
                  applyPersona(VOICE_PERSONAS[0]);
                }}
              >
                Clear custom voice &middot; back to personas
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Phonics Phase + Text + Controls */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Text to Synthesise</CardTitle>
            <CardDescription>Enter text and select an SSP phonics phase for pace adaptation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SSP Phase selector */}
            <div className="space-y-2">
              <Label>SSP Phonics Phase</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PACE_CONFIG).map(([phase, config]) => {
                  const p = Number(phase);
                  return (
                    <Button
                      key={p}
                      variant={selectedPhase === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPhase(p)}
                    >
                      Phase {p} ({config.wpm} WPM)
                    </Button>
                  );
                })}
                {selectedPhase && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedPhase(null); if (selectedPersona) setSynthPace(selectedPersona.defaults.pace); }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Language selector */}
            <div className="space-y-2">
              <Label>Language</Label>
              <div className="flex items-center gap-3">
                <Select value={synthLanguage} onValueChange={(v) => setSynthLanguage(v)}>
                  <SelectTrigger className="w-[220px]">
                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {synthLanguage === 'auto'
                    ? 'Voice language determines output'
                    : needsTranslation
                      ? `Text will be translated to ${LANGUAGE_LABELS[synthLanguage] || synthLanguage} and spoken`
                      : `Text will be spoken in ${LANGUAGE_LABELS[synthLanguage] || synthLanguage}`}
                </span>
              </div>
            </div>

            <Textarea
              placeholder="Enter the text you want to synthesise..."
              value={synthText}
              onChange={(e) => setSynthText(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {charCount} characters &middot; ~{estimatedSeconds}s estimated
              </span>
              <div className="flex items-center gap-2">
                <Switch checked={wordTimestamps} onCheckedChange={setWordTimestamps} id="ts" />
                <Label htmlFor="ts" className="text-sm">Word timestamps</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fine-tune</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Pace</Label>
                <span className="text-sm text-muted-foreground">{synthPace.toFixed(2)}x</span>
              </div>
              <Slider value={[synthPace]} onValueChange={([v]) => { setSynthPace(v); setSelectedPhase(null); }} min={0.5} max={2.0} step={0.05} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Pitch</Label>
                <span className="text-sm text-muted-foreground">{synthPitch > 0 ? '+' : ''}{synthPitch.toFixed(1)} st</span>
              </div>
              <Slider value={[synthPitch]} onValueChange={([v]) => setSynthPitch(v)} min={-6} max={6} step={0.5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Warmth</Label>
                <span className="text-sm text-muted-foreground">{synthWarmth > 0 ? '+' : ''}{synthWarmth.toFixed(1)}</span>
              </div>
              <Slider value={[synthWarmth]} onValueChange={([v]) => setSynthWarmth(v)} min={-6} max={6} step={0.5} />
            </div>
            <Button className="w-full" onClick={handleSynthesize} disabled={synthesizing || !synthText.trim() || serviceStatus !== 'online'}>
              {synthesizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : needsTranslation ? <Globe className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {synthesizing ? (needsTranslation ? 'Translating & Synthesising...' : 'Synthesising...') : (needsTranslation ? 'Translate & Speak' : 'Synthesise')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result: Playback + Karaoke */}
      {synthResult && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={togglePlayback}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={stopAudio}>
                <Square className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Progress value={playbackProgress} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground min-w-[48px] text-right">
                {formatDuration(synthResult.duration_seconds)}
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                const link = document.createElement('a');
                const mime = synthResult.format === 'mp3' ? 'audio/mpeg' : `audio/${synthResult.format}`;
                link.href = `data:${mime};base64,${synthResult.audio_base64}`;
                link.download = `synthesis.${synthResult.format}`;
                link.click();
              }}>
                <Download className="mr-2 h-3 w-3" />
                Download
              </Button>
            </div>

            {/* Translation result */}
            {translationInfo && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-medium">
                    Translated: {LANGUAGE_LABELS[translationInfo.sourceLanguage] || translationInfo.sourceLanguage} → {LANGUAGE_LABELS[translationInfo.targetLanguage] || translationInfo.targetLanguage}
                  </Label>
                </div>
                <p className="text-sm font-medium">{translationInfo.translatedText}</p>
                {translationInfo.transliteration && (
                  <p className="text-xs text-muted-foreground italic">{translationInfo.transliteration}</p>
                )}
              </div>
            )}

            {/* Karaoke word display */}
            {synthResult.word_timestamps.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Karaoke Preview</Label>
                <KaraokePlayer
                  timestamps={synthResult.word_timestamps}
                  audioRef={audioRef}
                  isPlaying={isPlaying}
                />
              </div>
            )}

            {/* Cost info */}
            {synthResult.cost && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Provider: {synthResult.cost.provider}</span>
                <span>Compute: {synthResult.cost.compute_seconds.toFixed(1)}s</span>
                <span>Cost: ${synthResult.cost.estimated_cost_usd.toFixed(4)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
