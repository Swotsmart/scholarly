'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookOpen, Sparkles, Loader2, Check, Palette, Volume2, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { storybookApi } from '@/lib/storybook-api';
import type { GenerationJob } from '@/types/storybook';

type Step = 'configure' | 'generating' | 'complete';

export default function StorybookCreatePage() {
  const [step, setStep] = useState<Step>('configure');
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('2');
  const [theme, setTheme] = useState('');
  const [artStyle, setArtStyle] = useState('watercolour');
  const [pageCount, setPageCount] = useState('12');
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerate() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await storybookApi.generation.create({
        title: title.trim(),
        phase: parseInt(phase),
        theme: theme || undefined,
        artStyle,
        pageCount: parseInt(pageCount),
      });
      setJob(result);
      setStep('generating');
      // Poll for status
      pollStatus(result.id);
    } catch {
      // Error handling — API client throws with message
    } finally {
      setIsSubmitting(false);
    }
  }

  async function pollStatus(jobId: string) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const status = await storybookApi.generation.getStatus(jobId);
        setJob(status);
        if (status.status === 'completed' || status.status === 'failed' || attempts > 60) {
          clearInterval(interval);
          if (status.status === 'completed') setStep('complete');
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/storybook"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a Storybook</h1>
        <p className="text-muted-foreground">
          Generate a curriculum-aligned, decodable storybook using AI. Every story is validated against phonics constraints.
        </p>
      </div>

      {step === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Story Configuration
            </CardTitle>
            <CardDescription>
              Set the phonics constraints and creative parameters. The AI will generate a story that meets your decodability requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Story Title</label>
              <Input
                placeholder="e.g., Finn the Fox and the Singing Stream"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phonics Phase</label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Phase 1 — s, a, t, p, i, n</SelectItem>
                    <SelectItem value="2">Phase 2 — Digraphs (sh, ch, th)</SelectItem>
                    <SelectItem value="3">Phase 3 — Long vowels</SelectItem>
                    <SelectItem value="4">Phase 4 — Adjacent consonants</SelectItem>
                    <SelectItem value="5">Phase 5 — Alternative spellings</SelectItem>
                    <SelectItem value="6">Phase 6 — Morphemes & fluency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Page Count</label>
                <Select value={pageCount} onValueChange={setPageCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 pages (short)</SelectItem>
                    <SelectItem value="12">12 pages (standard)</SelectItem>
                    <SelectItem value="16">16 pages (long)</SelectItem>
                    <SelectItem value="24">24 pages (extended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Theme (optional)</label>
              <Input
                placeholder="e.g., Australian animals, space adventure, garden"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Art Style</label>
              <Select value={artStyle} onValueChange={setArtStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watercolour">Watercolour</SelectItem>
                  <SelectItem value="flat-vector">Flat Vector</SelectItem>
                  <SelectItem value="soft-3d">Soft 3D</SelectItem>
                  <SelectItem value="crayon">Crayon / Hand-drawn</SelectItem>
                  <SelectItem value="papercraft">Papercraft</SelectItem>
                  <SelectItem value="storybook-classic">Storybook Classic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>How it works:</strong> The Storybook Engine generates narrative text constrained by your selected phonics phase.
                Every word is validated against the learner&apos;s taught GPC set using our grapheme parser. Stories that fail the 85% decodability threshold are automatically regenerated.
              </p>
            </div>

            <Button onClick={handleGenerate} disabled={!title.trim() || isSubmitting} className="w-full">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Story</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'generating' && job && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Generating Your Story
            </CardTitle>
            <CardDescription>The AI is crafting a decodable story. This typically takes 30-60 seconds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={job.progress} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress: {job.progress}%</span>
              <Badge variant="outline" className="capitalize">{job.status}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className={`h-4 w-4 ${job.progress >= 20 ? 'text-green-600' : 'text-muted-foreground/30'}`} />
                <span className={job.progress >= 20 ? '' : 'text-muted-foreground'}>Narrative generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-4 w-4 ${job.progress >= 40 ? 'text-green-600' : 'text-muted-foreground/30'}`} />
                <span className={job.progress >= 40 ? '' : 'text-muted-foreground'}>Decodability validation</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className={`h-4 w-4 ${job.progress >= 60 ? 'text-green-600' : 'text-muted-foreground/30'}`} />
                <span className={job.progress >= 60 ? '' : 'text-muted-foreground'}>Illustration generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className={`h-4 w-4 ${job.progress >= 80 ? 'text-green-600' : 'text-muted-foreground/30'}`} />
                <span className={job.progress >= 80 ? '' : 'text-muted-foreground'}>Audio narration (Kokoro TTS)</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className={`h-4 w-4 ${job.progress >= 100 ? 'text-green-600' : 'text-muted-foreground/30'}`} />
                <span className={job.progress >= 100 ? '' : 'text-muted-foreground'}>Content safety review</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && job && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Story Created Successfully
            </CardTitle>
            <CardDescription>Your storybook has been generated and is ready for review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-800 dark:text-green-300">
                <strong>{title}</strong> has been created with {pageCount} pages at Phase {phase}.
                It will go through the 5-stage quality pipeline before being published to the library.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/storybook/review`}>View in Review Pipeline</Link>
              </Button>
              <Button variant="outline" onClick={() => { setStep('configure'); setTitle(''); setTheme(''); setJob(null); }}>
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
