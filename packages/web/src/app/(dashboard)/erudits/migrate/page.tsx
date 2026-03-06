'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Globe,
  Upload,
  FileSearch,
  RefreshCw,
  Eye,
  Download,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Layers,
  Users,
  Image,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import { eruditsApi } from '@/lib/erudits-api';
import type { PlatformMigration, MigrationContentItem, MigrationSource, MigrationStatus } from '@/types/erudits';

const MIGRATION_STEPS = [
  { key: 'created', label: 'Create', description: 'Configure source', icon: Globe },
  { key: 'extracting', label: 'Extract', description: 'Scan content', icon: FileSearch },
  { key: 'transforming', label: 'Transform', description: 'Map content', icon: RefreshCw },
  { key: 'ready_for_review', label: 'Review', description: 'Verify mapping', icon: Eye },
  { key: 'importing', label: 'Import', description: 'Transfer data', icon: Download },
];

const SOURCES: { value: MigrationSource; label: string; description: string }[] = [
  { value: 'squarespace', label: 'Squarespace', description: 'Import pages, products, blog posts, and members' },
  { value: 'wordpress', label: 'WordPress', description: 'Import posts, pages, media, and users' },
  { value: 'wix', label: 'Wix', description: 'Import site content and products' },
  { value: 'shopify', label: 'Shopify', description: 'Import products, collections, and customers' },
  { value: 'teacherspayteachers', label: 'Teachers Pay Teachers', description: 'Import your store and resources' },
];

function statusStep(status: MigrationStatus): number {
  const map: Record<string, number> = {
    created: 0,
    extracting: 1,
    transforming: 2,
    validating: 2,
    ready_for_review: 3,
    approved: 3,
    importing: 4,
    parallel_run: 4,
    cutover_ready: 5,
    live: 5,
    failed: -1,
    rolled_back: -1,
  };
  return map[status] ?? 0;
}

function contentIcon(type: string) {
  switch (type) {
    case 'product': return ShoppingBag;
    case 'page': return FileText;
    case 'post': return FileText;
    case 'image': return Image;
    case 'member': return Users;
    default: return Layers;
  }
}

export default function MigrationWizardPage() {
  const [source, setSource] = useState<MigrationSource | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [migration, setMigration] = useState<PlatformMigration | null>(null);
  const [contentItems, setContentItems] = useState<MigrationContentItem[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!source || !sourceUrl.trim()) {
      setError('Please select a source and enter the URL');
      return;
    }
    setIsStarting(true);
    setError(null);
    try {
      const result = await eruditsApi.migration.start(source, sourceUrl.trim(), customDomain.trim() || undefined);
      setMigration(result);
      // Start polling for status
      pollStatus(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start migration');
    } finally {
      setIsStarting(false);
    }
  }

  async function pollStatus(id: string) {
    setIsPolling(true);
    try {
      const result = await eruditsApi.migration.status(id);
      setMigration(result);
      // Load content items
      const items = await eruditsApi.migration.getContent(id);
      setContentItems(items);
    } catch {
      // Silently handle poll errors
    } finally {
      setIsPolling(false);
    }
  }

  const currentStep = migration ? statusStep(migration.status) : -1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/erudits"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Migration</h1>
          <p className="text-muted-foreground mt-1">Import your existing website content into Scholarly</p>
        </div>
      </div>

      {/* Pipeline Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {MIGRATION_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = currentStep === i;
              const isComplete = currentStep > i;
              const isFailed = migration?.status === 'failed';
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isComplete
                          ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                          : isActive
                          ? 'border-primary bg-primary/10'
                          : isFailed && currentStep === i
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                          : 'border-muted bg-muted'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : isActive && isPolling ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <p className={`text-xs font-medium mt-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</p>
                    <p className="text-[10px] text-muted-foreground">{step.description}</p>
                  </div>
                  {i < MIGRATION_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-green-500' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!migration ? (
        /* Step 1: Configuration */
        <div className="max-w-2xl space-y-6">
          {/* Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Source Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    className={`rounded-lg border p-4 text-left transition-colors ${source === s.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSource(s.value)}
                  >
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* URL Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Website URL *</label>
                <Input
                  placeholder="https://your-site.squarespace.com"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Custom Domain (optional)</label>
                <Input
                  placeholder="www.yourdomain.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">If you have a custom domain, we can set up DNS redirection</p>
              </div>
            </CardContent>
          </Card>

          {/* Start */}
          <Button
            size="lg"
            onClick={handleStart}
            disabled={isStarting || !source || !sourceUrl.trim()}
          >
            {isStarting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting Migration...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Start Migration</>
            )}
          </Button>
        </div>
      ) : (
        /* Migration Progress */
        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Migration Progress
                </span>
                <Badge variant={migration.status === 'failed' ? 'destructive' : migration.status === 'live' ? 'default' : 'outline'}>
                  {migration.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall progress</span>
                  <span>{migration.progressPercent}%</span>
                </div>
                <Progress value={migration.progressPercent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold">{migration.pagesFound}</p>
                  <p className="text-xs text-muted-foreground">Pages</p>
                  {migration.pagesImported > 0 && (
                    <p className="text-xs text-green-600">{migration.pagesImported} imported</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{migration.productsFound}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                  {migration.productsImported > 0 && (
                    <p className="text-xs text-green-600">{migration.productsImported} imported</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{migration.membersFound}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                  {migration.membersImported > 0 && (
                    <p className="text-xs text-green-600">{migration.membersImported} imported</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{migration.imagesFound}</p>
                  <p className="text-xs text-muted-foreground">Images</p>
                  {migration.imagesImported > 0 && (
                    <p className="text-xs text-green-600">{migration.imagesImported} imported</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{migration.postsFound}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                  {migration.postsImported > 0 && (
                    <p className="text-xs text-green-600">{migration.postsImported} imported</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <ExternalLink className="h-3 w-3" />
                <span>Source: {migration.sourceUrl}</span>
              </div>
            </CardContent>
          </Card>

          {/* Content Items */}
          {contentItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Items ({contentItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contentItems.map((item) => {
                    const Icon = contentIcon(item.sourceType);
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.sourceTitle || 'Untitled'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.sourceType}</span>
                              {item.targetType && <><ArrowRight className="h-3 w-3" /><span>{item.targetType.replace('_', ' ')}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.requiresReview && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="mr-1 h-3 w-3" />Review
                            </Badge>
                          )}
                          <Badge
                            className={`text-xs ${
                              item.status === 'imported' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : item.status === 'mapped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => pollStatus(migration.id)}
              disabled={isPolling}
            >
              {isPolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Status
            </Button>
            {migration.status === 'ready_for_review' && (
              <Button onClick={async () => {
                try {
                  const approvedIds = contentItems.map(c => c.id);
                  const result = await eruditsApi.migration.approve(migration.id, approvedIds, []);
                  setMigration(result);
                } catch { setError('Failed to approve migration'); }
              }}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Approve & Import
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
