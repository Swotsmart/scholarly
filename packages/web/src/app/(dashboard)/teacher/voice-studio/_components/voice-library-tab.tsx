'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { VOICE_PERSONAS, PREVIEW_SENTENCE, type VoicePersona } from './voice-persona-data';
import {
  Mic, Play, Pause, Square, Loader2, Users,
} from 'lucide-react';

interface VoiceLibraryTabProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  playAudio: (base64: string, format: string) => void;
  stopAudio: () => void;
  togglePlayback: () => void;
  playbackProgress: number;
  serviceStatus: 'checking' | 'online' | 'offline';
  setError: (error: string | null) => void;
  onSelectForSynthesis: (persona: VoicePersona) => void;
}

const STYLE_COLORS: Record<string, string> = {
  warm: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  bright: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
  calm: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  energetic: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function VoiceLibraryTab({
  audioRef,
  isPlaying,
  playAudio,
  stopAudio,
  togglePlayback,
  playbackProgress,
  serviceStatus,
  setError,
  onSelectForSynthesis,
}: VoiceLibraryTabProps) {
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const handlePreview = async (persona: VoicePersona) => {
    if (serviceStatus !== 'online') {
      setError('Voice service is offline');
      return;
    }
    setPreviewingId(persona.id);
    try {
      const res = await api.voiceStudio.synthesize({
        text: PREVIEW_SENTENCE,
        voice_id: persona.voiceId,
        pace: persona.defaults.pace,
        pitch: persona.defaults.pitch,
        warmth: persona.defaults.warmth,
        word_timestamps: false,
      });
      if (!res.success) {
        setError(res.error || 'Preview failed');
        return;
      }
      setActivePreviewId(persona.id);
      playAudio(res.data.audio_base64, res.data.format);
    } catch {
      setError('Failed to connect to voice service');
    } finally {
      setPreviewingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">6 Kokoro Voice Personas</p>
              <p className="text-sm text-muted-foreground">
                Each persona is tuned for specific age groups, reading phases, and story themes.
                Preview a voice to hear it, then select it for synthesis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {VOICE_PERSONAS.map((persona) => (
          <Card key={persona.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{persona.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{persona.description}</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0 ml-2">{persona.voiceId}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Gender + Style */}
              <div className="flex gap-1.5">
                <Badge variant="secondary" className="text-xs capitalize">{persona.gender}</Badge>
                <Badge className={`text-xs capitalize ${STYLE_COLORS[persona.style] || ''}`}>{persona.style}</Badge>
                <Badge variant="outline" className="text-xs">{persona.language}</Badge>
              </div>

              {/* Age groups */}
              <div>
                <span className="text-xs text-muted-foreground">Age Groups</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.ageGroups.map(ag => (
                    <Badge key={ag} variant="secondary" className="text-xs">Ages {ag}</Badge>
                  ))}
                </div>
              </div>

              {/* Themes */}
              <div>
                <span className="text-xs text-muted-foreground">Themes</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.themes.map(t => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>

              {/* SSP Phases + WCPM */}
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>SSP Phases: {persona.suitablePhases.join(', ')}</p>
                <p>WCPM Band: {persona.wcpmBand[0]}–{persona.wcpmBand[1]}</p>
                <p>GPC Emphasis: {persona.emphasisFactor}x</p>
              </div>

              {/* Defaults */}
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Defaults:</span>{' '}
                Pace {persona.defaults.pace}x &middot; Pitch {persona.defaults.pitch} st &middot; Warmth {persona.defaults.warmth > 0 ? '+' : ''}{persona.defaults.warmth}
              </div>

              {/* Preview playback */}
              {activePreviewId === persona.id && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={togglePlayback}>
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Progress value={playbackProgress} className="h-1.5 flex-1" />
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { stopAudio(); setActivePreviewId(null); }}>
                    <Square className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePreview(persona)}
                  disabled={previewingId === persona.id || serviceStatus !== 'online'}
                >
                  {previewingId === persona.id ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-3 w-3" />
                  )}
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onSelectForSynthesis(persona)}
                >
                  <Mic className="mr-2 h-3 w-3" />
                  Select
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
