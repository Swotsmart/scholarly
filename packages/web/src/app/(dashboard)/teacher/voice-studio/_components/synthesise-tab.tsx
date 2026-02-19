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
import api, { type SynthesizeResult, type VoiceWordTimestamp } from '@/lib/api';
import { VOICE_PERSONAS, PACE_CONFIG, phaseToMultiplier, PREVIEW_SENTENCE, type VoicePersona } from './voice-persona-data';
import { KaraokePlayer } from './karaoke-player';
import {
  Mic, Play, Pause, Square, Download, Loader2, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [wordTimestamps, setWordTimestamps] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthResult, setSynthResult] = useState<SynthesizeResult | null>(null);

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

  const handleSynthesize = async () => {
    if (!synthText.trim()) return;
    setError(null);
    setSynthesizing(true);
    try {
      const res = await api.voiceStudio.synthesize({
        text: synthText,
        voice_id: selectedPersona?.voiceId || undefined,
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
      setStudioAudio({
        base64: res.data.audio_base64,
        duration: res.data.duration_seconds,
        format: res.data.format,
        timestamps: res.data.word_timestamps,
      });
      playAudio(res.data.audio_base64, res.data.format);
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
              {synthesizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
              {synthesizing ? 'Synthesising...' : 'Synthesise'}
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
