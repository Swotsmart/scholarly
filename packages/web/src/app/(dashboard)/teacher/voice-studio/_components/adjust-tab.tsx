'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import api, { type AudioQualityReport, type VoiceWordTimestamp } from '@/lib/api';
import { ADJUST_PRESETS, type AdjustPreset } from './voice-persona-data';
import { WaveformDisplay } from './waveform-display';
import {
  SlidersHorizontal, Waves, Moon, BookOpen, Zap, Heart,
  Play, Pause, Square, Download, RotateCcw, Eye, Check,
  Loader2, Volume2,
} from 'lucide-react';

interface StudioAudio {
  base64: string;
  duration: number;
  format: string;
  timestamps: VoiceWordTimestamp[];
}

interface QualityMetrics {
  loudness: string;
  loudnessValue: number;
  snr: string;
  snrValue: number;
  pace: string;
  peak: string;
  duration: string;
}

interface AdjustTabProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  studioAudio: StudioAudio | null;
  setStudioAudio: (audio: StudioAudio) => void;
  isPlaying: boolean;
  playAudio: (base64: string, format: string) => void;
  togglePlayback: () => void;
  stopAudio: () => void;
  playbackProgress: number;
  setError: (error: string | null) => void;
  addJob: (type: 'narrate-book' | 'batch-variant' | 'clone-profile', detail: string) => string;
  updateJob: (id: string, updates: { status?: string; progress?: number; detail?: string; error?: string }) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function qualityFromReport(r: AudioQualityReport): QualityMetrics {
  return {
    loudness: `${r.loudness_lufs.toFixed(1)} LUFS`,
    loudnessValue: r.loudness_lufs,
    snr: `${r.snr_db.toFixed(1)} dB`,
    snrValue: r.snr_db,
    pace: r.pace_wpm ? `${r.pace_wpm} WPM` : 'N/A',
    peak: `${r.peak_dbfs.toFixed(1)} dBFS`,
    duration: formatDuration(r.duration_seconds),
  };
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Moon: <Moon className="h-6 w-6 text-indigo-500" />,
  BookOpen: <BookOpen className="h-6 w-6 text-green-500" />,
  Zap: <Zap className="h-6 w-6 text-amber-500" />,
  Heart: <Heart className="h-6 w-6 text-pink-500" />,
};

export function AdjustTab({
  audioRef,
  studioAudio,
  setStudioAudio,
  isPlaying,
  playAudio,
  togglePlayback,
  stopAudio,
  playbackProgress,
  setError,
}: AdjustTabProps) {
  const [adjustPace, setAdjustPace] = useState(1.0);
  const [adjustPitch, setAdjustPitch] = useState(0);
  const [adjustWarmth, setAdjustWarmth] = useState(0);
  const [adjustLoudness, setAdjustLoudness] = useState(-16);
  const [adjusting, setAdjusting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [normalising, setNormalising] = useState(false);
  const [denoise, setDenoise] = useState(true);
  const [trimSilence, setTrimSilence] = useState(true);

  // Waveform comparison
  const [originalAudio, setOriginalAudio] = useState<string | null>(null);
  const [qualityBefore, setQualityBefore] = useState<QualityMetrics | null>(null);
  const [qualityAfter, setQualityAfter] = useState<QualityMetrics | null>(null);

  const applyPreset = (preset: AdjustPreset) => {
    setAdjustPace(preset.pace);
    setAdjustPitch(preset.pitch);
    setAdjustWarmth(preset.warmth);
    setAdjustLoudness(preset.loudness);
  };

  const resetSliders = () => {
    setAdjustPace(1.0);
    setAdjustPitch(0);
    setAdjustWarmth(0);
    setAdjustLoudness(-16);
  };

  const handleAdjust = async (preview = false) => {
    if (!studioAudio) return;
    setError(null);
    preview ? setPreviewing(true) : setAdjusting(true);
    try {
      const fn = preview ? api.voiceStudio.adjustPreview : api.voiceStudio.adjust;
      const res = await fn({
        audio_base64: studioAudio.base64,
        pace: adjustPace,
        pitch: adjustPitch,
        warmth: adjustWarmth,
      });
      if (!res.success) {
        setError(res.error || 'Adjustment failed');
        return;
      }
      if (!preview) {
        setStudioAudio({
          base64: res.data.audio_base64,
          duration: res.data.duration_seconds,
          format: 'wav',
          timestamps: res.data.word_timestamps,
        });
      }
      playAudio(res.data.audio_base64, 'wav');
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setPreviewing(false);
      setAdjusting(false);
    }
  };

  const handleNormalise = async () => {
    if (!studioAudio) return;
    setError(null);
    setNormalising(true);
    // Save original for waveform comparison
    setOriginalAudio(studioAudio.base64);
    try {
      const res = await api.voiceStudio.normalise({
        audio_base64: studioAudio.base64,
        target_lufs: adjustLoudness,
        denoise,
        trim_silence: trimSilence,
      });
      if (!res.success) {
        setError(res.error || 'Normalisation failed');
        setOriginalAudio(null);
        return;
      }
      setStudioAudio({
        base64: res.data.audio_base64,
        duration: res.data.quality_after.duration_seconds,
        format: 'wav',
        timestamps: studioAudio.timestamps,
      });
      setQualityBefore(qualityFromReport(res.data.quality_before));
      setQualityAfter(qualityFromReport(res.data.quality_after));
      playAudio(res.data.audio_base64, 'wav');
    } catch {
      setError('Failed to connect to voice service');
      setOriginalAudio(null);
    } finally {
      setNormalising(false);
    }
  };

  if (!studioAudio) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Audio Loaded</h3>
          <p className="text-muted-foreground">Synthesise some text first, then come here to fine-tune.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Presets</CardTitle>
          <CardDescription>One-click settings for common narration styles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ADJUST_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto flex-col gap-2 p-4"
                onClick={() => applyPreset(preset)}
              >
                {PRESET_ICONS[preset.icon]}
                <span className="font-medium text-sm">{preset.name}</span>
                <span className="text-xs text-muted-foreground">{preset.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mixing desk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Mixing Desk
            </CardTitle>
            <CardDescription>Fine-tune pace, pitch, warmth, and loudness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">Pace <Badge variant="outline" className="text-xs font-normal">0.5x &ndash; 2.0x</Badge></Label>
                <span className="text-sm font-mono">{adjustPace.toFixed(2)}x</span>
              </div>
              <Slider value={[adjustPace]} onValueChange={([v]) => setAdjustPace(v)} min={0.5} max={2.0} step={0.05} />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Slower (struggling readers)</span><span>Faster (fluent readers)</span></div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">Pitch <Badge variant="outline" className="text-xs font-normal">-6 to +6 st</Badge></Label>
                <span className="text-sm font-mono">{adjustPitch > 0 ? '+' : ''}{adjustPitch.toFixed(1)} st</span>
              </div>
              <Slider value={[adjustPitch]} onValueChange={([v]) => setAdjustPitch(v)} min={-6} max={6} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Lower (older students)</span><span>Higher (younger students)</span></div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">Warmth <Badge variant="outline" className="text-xs font-normal">-6 to +6</Badge></Label>
                <span className="text-sm font-mono">{adjustWarmth > 0 ? '+' : ''}{adjustWarmth.toFixed(1)}</span>
              </div>
              <Slider value={[adjustWarmth]} onValueChange={([v]) => setAdjustWarmth(v)} min={-6} max={6} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Bright / Crisp</span><span>Warm / Bedtime</span></div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">Loudness <Badge variant="outline" className="text-xs font-normal">-24 to -8 LUFS</Badge></Label>
                <span className="text-sm font-mono">{adjustLoudness} LUFS</span>
              </div>
              <Slider value={[adjustLoudness]} onValueChange={([v]) => setAdjustLoudness(v)} min={-24} max={-8} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Quieter</span><span>Louder</span></div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => handleAdjust(true)} disabled={previewing || adjusting}>
                {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Preview (5s)
              </Button>
              <Button className="flex-1" onClick={() => handleAdjust(false)} disabled={adjusting || previewing}>
                {adjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Apply
              </Button>
              <Button variant="ghost" size="icon" onClick={resetSliders}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Normalise + Quality */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Waves className="h-5 w-5" />
                Normalise
              </CardTitle>
              <CardDescription>5-stage pipeline: loudness, noise gate, spectral denoise, silence trim, peak limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={denoise} onCheckedChange={setDenoise} id="denoise" />
                  <Label htmlFor="denoise">Spectral denoise</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={trimSilence} onCheckedChange={setTrimSilence} id="trim" />
                  <Label htmlFor="trim">Trim silence</Label>
                </div>
              </div>
              <Button className="w-full" onClick={handleNormalise} disabled={normalising}>
                {normalising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {normalising ? 'Normalising...' : `Normalise to ${adjustLoudness} LUFS`}
              </Button>
            </CardContent>
          </Card>

          {/* Dual Waveform Comparison */}
          {originalAudio && qualityBefore && qualityAfter && (
            <div className="space-y-3">
              <WaveformDisplay audioBase64={originalAudio} format="wav" label="Before" metrics={qualityBefore} />
              <WaveformDisplay audioBase64={studioAudio.base64} format="wav" label="After" metrics={qualityAfter} />
            </div>
          )}

          {/* Playback controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
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
                  {formatDuration(studioAudio.duration)}
                </span>
                <Button variant="outline" size="sm" onClick={() => {
                  const link = document.createElement('a');
                  link.href = `data:audio/${studioAudio.format};base64,${studioAudio.base64}`;
                  link.download = `studio-processed.${studioAudio.format}`;
                  link.click();
                }}>
                  <Download className="mr-2 h-3 w-3" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
