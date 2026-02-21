'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, Play, Pause, Square, Volume2, Clock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function audioBase64ToUrl(base64: string, format: string): string {
  const mime = format === 'wav' ? 'audio/wav' : format === 'opus' ? 'audio/opus' : 'audio/mpeg';
  return `data:${mime};base64,${base64}`;
}

interface Exercise {
  id: number;
  title: string;
  level: string;
  duration: string;
  completed: boolean;
  sampleText: string;
  language: string;
  voiceId: string;
}

export default function LinguaflowListeningPage() {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const exercises: Exercise[] = [
    {
      id: 1,
      title: 'Daily Conversation',
      level: 'Beginner',
      duration: '5 min',
      completed: true,
      sampleText: 'Bonjour! Comment allez-vous aujourd\'hui? Je vais très bien, merci. Il fait beau dehors. Voulez-vous aller au parc?',
      language: 'fr-fr',
      voiceId: 'ff_siwis',
    },
    {
      id: 2,
      title: 'News Report',
      level: 'Intermediate',
      duration: '8 min',
      completed: false,
      sampleText: 'Las noticias de hoy reportan un aumento en el turismo internacional. Los expertos señalan que los viajes sostenibles están ganando popularidad entre los jóvenes.',
      language: 'es-es',
      voiceId: 'ef_dora',
    },
    {
      id: 3,
      title: 'Podcast Discussion',
      level: 'Advanced',
      duration: '12 min',
      completed: false,
      sampleText: 'Aujourd\'hui nous discutons de l\'impact de l\'intelligence artificielle sur l\'éducation. Les nouvelles technologies transforment la manière dont nous apprenons et enseignons.',
      language: 'fr-fr',
      voiceId: 'ff_siwis',
    },
    {
      id: 4,
      title: 'Movie Dialogue',
      level: 'Intermediate',
      duration: '6 min',
      completed: true,
      sampleText: '¿Dónde estabas anoche? Te estuve buscando por todas partes. Necesitamos hablar sobre lo que pasó. Es muy importante para nuestro futuro.',
      language: 'es-es',
      voiceId: 'ef_dora',
    },
  ];

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playExercise = useCallback(async (exercise: Exercise) => {
    if (playingId === exercise.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingId(exercise.id);

    try {
      const result = await api.voiceStudio.synthesize({
        text: exercise.sampleText,
        voice_id: exercise.voiceId,
        language: exercise.language,
        output_format: 'mp3',
      });

      if (result.success && result.data) {
        const audio = new Audio(audioBase64ToUrl(result.data.audio_base64, 'mp3'));
        audioRef.current = audio;
        audio.addEventListener('ended', () => setPlayingId(null), { once: true });
        audio.addEventListener('error', () => setPlayingId(null), { once: true });
        await audio.play();
        setPlayingId(exercise.id);
      }
    } catch {
      // Synthesis failed — silently stop
    } finally {
      setLoadingId(null);
    }
  }, [playingId, stopAudio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listening Practice</h1>
        <p className="text-muted-foreground">Improve your comprehension with audio exercises</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Exercises Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">2.5h</p>
                <p className="text-sm text-muted-foreground">Total Listening Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">Comprehension Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listening Exercises</CardTitle>
          <CardDescription>Choose an exercise to practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => playExercise(exercise)}
                    disabled={loadingId === exercise.id}
                  >
                    {loadingId === exercise.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playingId === exercise.id ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <p className="font-medium">{exercise.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                        {exercise.level}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exercise.duration}
                      </span>
                    </div>
                  </div>
                </div>
                {exercise.completed ? (
                  <span className="text-green-500 text-sm">Completed</span>
                ) : (
                  <Button size="sm">Start</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
