'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ProcessingJob, ProcessingJobType, ProcessingJobStatus } from '@/lib/api';
import {
  ListTodo, BookOpen, Layers, Fingerprint, Trash2, RefreshCw,
} from 'lucide-react';

interface ProcessingJobsTabProps {
  jobs: ProcessingJob[];
  removeJob: (id: string) => void;
}

const TYPE_CONFIG: Record<ProcessingJobType, { label: string; icon: React.ReactNode; color: string }> = {
  'narrate-book': {
    label: 'Narrate Book',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  'batch-variant': {
    label: 'Batch Variant',
    icon: <Layers className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  'clone-profile': {
    label: 'Clone Profile',
    icon: <Fingerprint className="h-4 w-4" />,
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  },
};

const STATUS_CONFIG: Record<ProcessingJobStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Queued', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  complete: { label: 'Complete', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function elapsed(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function ProcessingJobsTab({ jobs, removeJob }: ProcessingJobsTabProps) {
  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'complete' || j.status === 'failed');

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Processing Jobs</h3>
          <p className="text-muted-foreground">
            Jobs appear here when you narrate a book, generate batch variants, or build a voice clone profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListTodo className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}
                  {completedJobs.length > 0 && ` · ${completedJobs.length} completed`}
                </p>
              </div>
            </div>
            {completedJobs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => completedJobs.forEach(j => removeJob(j.id))}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Clear Finished
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active</h3>
          {activeJobs.map((job) => {
            const typeConf = TYPE_CONFIG[job.type];
            const statusConf = STATUS_CONFIG[job.status];
            return (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={typeConf.color}>
                        <span className="mr-1.5">{typeConf.icon}</span>
                        {typeConf.label}
                      </Badge>
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {elapsed(job.startedAt)}
                    </span>
                  </div>
                  <p className="text-sm mb-3">{job.detail}</p>
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="h-2 flex-1" />
                    <span className="text-sm font-mono text-muted-foreground min-w-[3ch] text-right">
                      {job.progress}%
                    </span>
                  </div>
                  {job.status === 'processing' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Processing...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
          {completedJobs.map((job) => {
            const typeConf = TYPE_CONFIG[job.type];
            const statusConf = STATUS_CONFIG[job.status];
            return (
              <Card key={job.id} className="opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={typeConf.color}>
                        <span className="mr-1.5">{typeConf.icon}</span>
                        {typeConf.label}
                      </Badge>
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {elapsed(job.startedAt, job.completedAt)} · {formatTime(job.startedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeJob(job.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{job.detail}</p>
                  {job.error && (
                    <p className="text-sm text-destructive mt-1">{job.error}</p>
                  )}
                  {job.status === 'complete' && (
                    <Progress value={100} className="h-1.5 mt-2" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
