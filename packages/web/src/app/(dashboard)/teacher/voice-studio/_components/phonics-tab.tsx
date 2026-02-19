'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import api, { type VoiceWordTimestamp } from '@/lib/api';
import { KaraokePlayer } from './karaoke-player';
import {
  Sparkles, Play, Pause, Square, Loader2,
} from 'lucide-react';

interface StudioAudio {
  base64: string;
  duration: number;
  format: string;
  timestamps: VoiceWordTimestamp[];
}

interface PhonicsTabProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  studioAudio: StudioAudio | null;
  setStudioAudio: (audio: StudioAudio) => void;
  synthText: string;
  isPlaying: boolean;
  playAudio: (base64: string, format: string) => void;
  togglePlayback: () => void;
  stopAudio: () => void;
  playbackProgress: number;
  setError: (error: string | null) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PhonicsTab({
  audioRef,
  studioAudio,
  setStudioAudio,
  synthText,
  isPlaying,
  playAudio,
  togglePlayback,
  stopAudio,
  playbackProgress,
  setError,
}: PhonicsTabProps) {
  const [targetGpcs, setTargetGpcs] = useState('');
  const [phonicsText, setPhonicsText] = useState('');
  const [emphasisPace, setEmphasisPace] = useState(0.6);
  const [processing, setProcessing] = useState(false);
  const [applied, setApplied] = useState(false);

  const gpcsArray = targetGpcs.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);

  const handleApply = async () => {
    if (!studioAudio || gpcsArray.length === 0) return;
    setError(null);
    setProcessing(true);
    try {
      const res = await api.voiceStudio.phonicsPace({
        audio_base64: studioAudio.base64,
        text: phonicsText || synthText,
        target_gpcs: gpcsArray,
        emphasis_pace: emphasisPace,
        word_timestamps: studioAudio.timestamps,
      });
      if (!res.success) {
        setError(res.error || 'Phonics pace adjustment failed');
        return;
      }
      setStudioAudio({
        base64: res.data.audio_base64,
        duration: res.data.duration_seconds,
        format: 'wav',
        timestamps: res.data.word_timestamps,
      });
      setApplied(true);
      playAudio(res.data.audio_base64, 'wav');
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setProcessing(false);
    }
  };

  if (!studioAudio) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Audio Loaded</h3>
          <p className="text-muted-foreground">Synthesise some text first, then apply phonics-aware pacing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-violet-800 dark:text-violet-200">The Scholarly Differentiator</p>
              <p className="text-sm text-violet-700 dark:text-violet-300">
                Phonics emphasis slows down words containing target GPCs so students can hear letter-sound
                correspondences clearly. Target words pulse during karaoke playback to show the pacing change.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Phonics Emphasis Controls
            </CardTitle>
            <CardDescription>Enter target GPCs and adjust emphasis pacing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target GPCs</Label>
              <Input
                placeholder="e.g. sh, ch, th, ee, oa, a_e"
                value={targetGpcs}
                onChange={(e) => { setTargetGpcs(e.target.value); setApplied(false); }}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated grapheme-phoneme correspondences. Supports digraphs (sh, ch, th), trigraphs (igh, ough), and split digraphs (a_e, i_e).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Text (for word matching)</Label>
              <Textarea
                placeholder="Uses the synthesised text by default"
                value={phonicsText}
                onChange={(e) => setPhonicsText(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Emphasis Pace</Label>
                <span className="text-sm font-mono">{emphasisPace.toFixed(2)}x</span>
              </div>
              <Slider
                value={[emphasisPace]}
                onValueChange={([v]) => { setEmphasisPace(v); setApplied(false); }}
                min={0.3}
                max={0.9}
                step={0.05}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Very slow (0.3x)</span>
                <span>Slightly slow (0.9x)</span>
              </div>
            </div>

            <Button className="w-full" onClick={handleApply} disabled={processing || gpcsArray.length === 0}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {processing ? 'Processing...' : 'Apply Phonics Pace'}
            </Button>
          </CardContent>
        </Card>

        {/* Word map + Karaoke */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Word Map &amp; Karaoke Demo</CardTitle>
            <CardDescription>
              {gpcsArray.length > 0
                ? `Targeting: ${gpcsArray.join(', ')} — matching words highlighted in violet`
                : 'Enter GPCs to see which words will be emphasised'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Static word map */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Static Word Map</Label>
              <div className="flex flex-wrap gap-1.5">
                {studioAudio.timestamps.map((wt, i) => {
                  const isTarget = gpcsArray.length > 0 && gpcsArray.some(g => wt.word.toLowerCase().includes(g));
                  return (
                    <Badge
                      key={i}
                      variant={isTarget ? 'default' : 'secondary'}
                      className={isTarget ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}
                    >
                      {wt.word}
                    </Badge>
                  );
                })}
              </div>
              {gpcsArray.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {studioAudio.timestamps.filter(wt => gpcsArray.some(g => wt.word.toLowerCase().includes(g))).length} of {studioAudio.timestamps.length} words will be slowed to {emphasisPace}x pace
                </p>
              )}
            </div>

            {/* Karaoke demo */}
            {applied && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Karaoke Demo (target words pulse when active)</Label>
                <KaraokePlayer
                  timestamps={studioAudio.timestamps}
                  audioRef={audioRef}
                  isPlaying={isPlaying}
                  targetGpcs={gpcsArray}
                />
              </div>
            )}

            {/* Playback */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="icon" onClick={togglePlayback}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={stopAudio}>
                <Square className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Progress value={playbackProgress} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(studioAudio.duration)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
