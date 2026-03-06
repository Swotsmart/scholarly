'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  PenTool,
  BookOpen,
  FileText,
  Headphones,
  Layers,
  Save,
  Loader2,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';

const RESOURCE_TYPES = [
  { value: 'textbook', label: 'Textbook', icon: BookOpen, description: 'Full-length educational textbook' },
  { value: 'workbook', label: 'Workbook', icon: PenTool, description: 'Exercises and practice activities' },
  { value: 'reference', label: 'Reference Guide', icon: FileText, description: 'Quick-reference grammar or topic guide' },
  { value: 'audio', label: 'Audio Resource', icon: Headphones, description: 'Audio content with transcripts' },
  { value: 'curriculum', label: 'Curriculum Pack', icon: Layers, description: 'Complete lesson plans and materials' },
];

const SUBJECTS = ['French', 'Spanish', 'German', 'Italian', 'Japanese', 'Mandarin', 'Mathematics', 'Science', 'English', 'History'];
const YEAR_LEVELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Mandarin' },
];

export default function NewManuscriptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [genre, setGenre] = useState('');
  const [subjectArea, setSubjectArea] = useState('');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleYear(year: string) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const manuscript = await eruditsApi.publishing.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        language,
        genre: genre || undefined,
        subjectArea: subjectArea || undefined,
        yearLevels: selectedYears.length > 0 ? selectedYears : undefined,
      });
      router.push(`/erudits/publish/${manuscript.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manuscript');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/erudits/publish"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Manuscript</h1>
          <p className="text-muted-foreground mt-1">Set up your manuscript details to start writing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Title & Subtitle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input
                placeholder="e.g., Le Petit Guide du Francais ATAR"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subtitle</label>
              <Input
                placeholder="e.g., A Student Companion for WACE French"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe your manuscript..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resource Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resource Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RESOURCE_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = genre === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    className={`rounded-lg border p-4 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setGenre(type.value)}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subject & Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject & Language</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject Area</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <Button
                    key={subject}
                    type="button"
                    variant={subjectArea === subject ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSubjectArea(subjectArea === subject ? '' : subject)}
                  >
                    {subject}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Writing Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.value}
                    type="button"
                    variant={language === lang.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLanguage(lang.value)}
                  >
                    {lang.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Year Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {YEAR_LEVELS.map((year) => (
                <Button
                  key={year}
                  type="button"
                  variant={selectedYears.includes(year) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
            {selectedYears.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedYears.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Create Manuscript</>
            )}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link href="/erudits/publish">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
