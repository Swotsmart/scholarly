'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  PenTool,
  History,
  Image,
  Send,
  Plus,
  Clock,
  Hash,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  Globe,
  ShoppingBag,
  School,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { Manuscript, ManuscriptVersion, BookCover, ManuscriptStatus, DistributionChannel, PublicationFormat } from '@/types/erudits';

function statusColor(status: ManuscriptStatus): string {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    case 'in_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'formatting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'revision_requested': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}

const CHANNELS: { value: DistributionChannel; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'scholarly_direct', label: 'Scholarly Direct', icon: ShoppingBag, description: 'Sell directly on Scholarly' },
  { value: 'scholarly_marketplace', label: 'Marketplace', icon: Globe, description: 'Scholarly resource marketplace' },
  { value: 'amazon_kdp', label: 'Amazon KDP', icon: BookOpen, description: 'Kindle Direct Publishing' },
  { value: 'ingram_spark', label: 'IngramSpark', icon: Send, description: 'Global print distribution' },
  { value: 'school_direct', label: 'School Direct', icon: School, description: 'Direct to schools' },
];

export default function ManuscriptEditorPage() {
  const params = useParams();
  const manuscriptId = params.id as string;

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [covers, setCovers] = useState<BookCover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<DistributionChannel[]>(['scholarly_direct']);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [ms, vs, cvs] = await Promise.allSettled([
          eruditsApi.publishing.get(manuscriptId),
          eruditsApi.publishing.getVersions(manuscriptId),
          eruditsApi.publishing.getCovers(manuscriptId),
        ]);
        if (ms.status === 'fulfilled') setManuscript(ms.value);
        else setError('Manuscript not found');
        if (vs.status === 'fulfilled') setVersions(vs.value);
        if (cvs.status === 'fulfilled') setCovers(cvs.value);
      } catch {
        setError('Failed to load manuscript');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [manuscriptId]);

  function toggleChannel(channel: DistributionChannel) {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-[500px]" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !manuscript) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-400">{error || 'Manuscript not found'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/erudits/publish">Back to publishing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/erudits/publish"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{manuscript.title}</h1>
              <Badge className={statusColor(manuscript.status)}>
                {manuscript.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
            </div>
            {manuscript.subtitle && <p className="text-muted-foreground">{manuscript.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-3 w-3" />Save Version
          </Button>
          <Button size="sm" onClick={() => setShowPublishModal(true)}>
            <Send className="mr-2 h-3 w-3" />Publish
          </Button>
        </div>
      </div>

      {/* Manuscript Stats Bar */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{manuscript.wordCount.toLocaleString()} words</span>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{manuscript.pageCountEstimate} pages (est.)</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{manuscript.chapters.length} chapters</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {new Date(manuscript.updatedAt).toLocaleDateString()}</span>
        {manuscript.language && <span className="uppercase font-medium">{manuscript.language}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Chapter Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">Chapters</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {manuscript.chapters.length > 0 ? (
              <div className="divide-y">
                {manuscript.chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground">{chapter.wordCount.toLocaleString()} words</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No chapters yet</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="mr-1 h-3 w-3" />Add Chapter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="editor">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
              <TabsTrigger value="covers">Cover Design</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="min-h-[400px] rounded-lg border border-dashed p-6 flex flex-col items-center justify-center text-center">
                    <PenTool className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold">Manuscript Editor</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      The rich text editor (ProseMirror) will render here. For now, this is a placeholder showing the manuscript content area.
                    </p>
                    {manuscript.description && (
                      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-left max-w-lg w-full">
                        <p className="text-sm font-medium mb-1">Description</p>
                        <p className="text-sm text-muted-foreground">{manuscript.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {versions.length > 0 ? (
                    <div className="space-y-3">
                      {versions.map((version) => (
                        <div key={version.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <History className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">Version {version.versionNumber}</p>
                                {version.label && <Badge variant="secondary" className="text-xs">{version.label}</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{version.wordCount.toLocaleString()} words</span>
                                <span>{new Date(version.createdAt).toLocaleString()}</span>
                              </div>
                              {version.changeDescription && (
                                <p className="text-xs text-muted-foreground mt-0.5">{version.changeDescription}</p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">Restore</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No versions saved yet</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        <Save className="mr-1 h-3 w-3" />Save First Version
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="covers" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {covers.map((cover) => (
                      <div
                        key={cover.id}
                        className={`rounded-lg border p-4 ${cover.isSelected ? 'ring-2 ring-primary' : ''}`}
                      >
                        <div className="relative aspect-[2/3] rounded bg-muted flex items-center justify-center mb-3 overflow-hidden">
                          {cover.thumbnailUrl ? (
                            <NextImage src={cover.thumbnailUrl} alt="Cover" fill className="object-cover rounded" />
                          ) : (
                            <Image className="h-10 w-10 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{cover.source.replace('_', ' ')}</Badge>
                          {cover.isSelected && <Badge variant="default" className="text-xs">Selected</Badge>}
                        </div>
                      </div>
                    ))}

                    {/* Generate New Cover */}
                    <button className="rounded-lg border border-dashed p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                      <div className="aspect-[2/3] flex items-center justify-center">
                        <div>
                          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-sm font-medium">Generate AI Cover</p>
                          <p className="text-xs text-muted-foreground mt-1">Create with DALL-E</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish Manuscript</DialogTitle>
            <DialogDescription>
              Select distribution channels for &quot;{manuscript.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const selected = selectedChannels.includes(channel.value);
              return (
                <button
                  key={channel.value}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => toggleChannel(channel.value)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium text-sm">{channel.label}</p>
                      <p className="text-xs text-muted-foreground">{channel.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>Cancel</Button>
            <Button disabled={selectedChannels.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              Publish to {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
