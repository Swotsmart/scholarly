'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared';
import api from '@/lib/api';
import type { ProcessingJob, ProcessingJobType, VoiceWordTimestamp } from '@/lib/api';
import type { VoicePersona } from './_components/voice-persona-data';
import { SynthesiseTab } from './_components/synthesise-tab';
import { AdjustTab } from './_components/adjust-tab';
import { PhonicsTab } from './_components/phonics-tab';
import { VoiceLibraryTab } from './_components/voice-library-tab';
import { VoiceCloningTab } from './_components/voice-cloning-tab';
import { ProcessingJobsTab } from './_components/processing-jobs-tab';
import {
  Mic, SlidersHorizontal, Sparkles, Users, Fingerprint, ListTodo,
  AlertCircle, Check, Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudioAudio {
  base64: string;
  duration: number;
  format: string;
  timestamps: VoiceWordTimestamp[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function audioBase64ToUrl(base64: string, format: string): string {
  const mime = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
  return `data:${mime};base64,${base64}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VoiceStudioPage() {
  // Service health
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Shared audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [studioAudio, setStudioAudio] = useState<StudioAudio | null>(null);
  const [synthText, setSynthText] = useState('');

  // Error
  const [error, setError] = useState<string | null>(null);

  // Tab navigation
  const [activeTab, setActiveTab] = useState('synthesise');
  const [preselectedPersona, setPreselectedPersona] = useState<VoicePersona | null>(null);

  // Processing jobs (client-side tracking)
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setServiceStatus('checking');
    const res = await api.voiceStudio.health();
    setServiceStatus(res.success ? 'online' : 'offline');
  };

  // ─── Playback ──────────────────────────────────────────────────────────────

  const playAudio = useCallback((base64: string, format: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioBase64ToUrl(base64, format);
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // ─── Job tracking ──────────────────────────────────────────────────────────

  const addJob = useCallback((type: ProcessingJobType, detail: string): string => {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const job: ProcessingJob = {
      id,
      type,
      status: 'queued',
      progress: 0,
      detail,
      startedAt: new Date().toISOString(),
    };
    setJobs(prev => [job, ...prev]);
    return id;
  }, []);

  const updateJob = useCallback((id: string, updates: { status?: string; progress?: number; detail?: string; error?: string }) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      return {
        ...j,
        ...updates,
        ...(updates.status === 'complete' || updates.status === 'failed'
          ? { completedAt: new Date().toISOString() }
          : {}),
      } as ProcessingJob;
    }));
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  // ─── Voice Library → Synthesise handoff ────────────────────────────────────

  const handleSelectForSynthesis = useCallback((persona: VoicePersona) => {
    setPreselectedPersona(persona);
    setActiveTab('synthesise');
  }, []);

  // ─── Shared props ──────────────────────────────────────────────────────────

  const playbackProps = {
    audioRef,
    isPlaying,
    playAudio,
    togglePlayback,
    stopAudio,
    playbackProgress,
  };

  const jobProps = {
    addJob,
    updateJob,
  };

  // ─── Active job count for badge ────────────────────────────────────────────

  const activeJobCount = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current && audioRef.current.duration) {
            setPlaybackProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setPlaybackProgress(0);
        }}
      />

      <PageHeader
        title="Voice Studio"
        description="Text-to-speech synthesis, audio processing, and phonics narration tools"
        actions={
          <Badge
            variant={serviceStatus === 'online' ? 'default' : 'destructive'}
            className="cursor-pointer"
            onClick={checkHealth}
          >
            {serviceStatus === 'checking' ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : serviceStatus === 'online' ? (
              <Check className="mr-1 h-3 w-3" />
            ) : (
              <AlertCircle className="mr-1 h-3 w-3" />
            )}
            Voice Service: {serviceStatus}
          </Badge>
        }
      />

      {/* Error banner */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* 6-tab layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="synthesise">
            <Mic className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Synthesise</span>
          </TabsTrigger>
          <TabsTrigger value="adjust">
            <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Adjust</span>
          </TabsTrigger>
          <TabsTrigger value="phonics">
            <Sparkles className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Phonics</span>
          </TabsTrigger>
          <TabsTrigger value="library">
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="cloning">
            <Fingerprint className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Cloning</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="relative">
            <ListTodo className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Jobs</span>
            {activeJobCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeJobCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="synthesise" className="mt-4">
          <SynthesiseTab
            {...playbackProps}
            setStudioAudio={setStudioAudio}
            serviceStatus={serviceStatus}
            setError={setError}
            preselectedPersona={preselectedPersona}
          />
        </TabsContent>

        <TabsContent value="adjust" className="mt-4">
          <AdjustTab
            {...playbackProps}
            studioAudio={studioAudio}
            setStudioAudio={setStudioAudio}
            setError={setError}
            {...jobProps}
          />
        </TabsContent>

        <TabsContent value="phonics" className="mt-4">
          <PhonicsTab
            {...playbackProps}
            studioAudio={studioAudio}
            setStudioAudio={setStudioAudio}
            synthText={synthText}
            setError={setError}
          />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <VoiceLibraryTab
            {...playbackProps}
            serviceStatus={serviceStatus}
            setError={setError}
            onSelectForSynthesis={handleSelectForSynthesis}
          />
        </TabsContent>

        <TabsContent value="cloning" className="mt-4">
          <VoiceCloningTab
            serviceStatus={serviceStatus}
            setError={setError}
            {...jobProps}
          />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <ProcessingJobsTab
            jobs={jobs}
            removeJob={removeJob}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
