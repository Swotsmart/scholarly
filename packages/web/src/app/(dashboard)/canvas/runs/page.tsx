'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const SR_API_BASE = process.env.NEXT_PUBLIC_SR_API_URL ?? '/api/v1/sr';

interface WorkflowRun {
  runId: string;
  workflowId?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  durationMs: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Pending' },
  running:   { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Running' },
  paused:    { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Paused' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Complete' },
  failed:    { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
  cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Cancelled' },
};

export default function RunsPage() {
  const { user, accessToken } = useAuthStore();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  const token = accessToken ?? '';
  const tenantId = (user as any)?.tenantId ?? 'default';

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${SR_API_BASE}/runs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.value ?? data.runs ?? []);
      }
    } catch (err) {
      console.error('[SR Runs] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useEffect(() => {
    fetchRuns();
    // Refresh every 10 seconds while on this page
    const interval = setInterval(fetchRuns, 10_000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#E8ECF0]">Active Runs</h1>
          <p className="text-sm text-[#8BA4B8] mt-1">Monitor workflow executions in real time</p>
        </div>
        <a href="/dashboard/canvas"
          className="px-4 py-2 bg-[#4DA6FF] text-white rounded text-sm hover:bg-[#3D96EF] transition-colors">
          Back to Canvas
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#162230] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg text-[#E8ECF0] mb-1">No runs yet</h2>
          <p className="text-sm text-[#8BA4B8]">
            Execute a workflow from the canvas to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => {
            const style = STATUS_STYLES[run.status] ?? STATUS_STYLES.pending!;
            const duration = run.durationMs > 0 ? `${(run.durationMs / 1000).toFixed(1)}s` : '\u2014';
            const isTerminal = ['completed', 'failed', 'cancelled'].includes(run.status);
            return (
              <div key={run.runId} className="flex items-center gap-4 p-4 bg-[#162230] rounded-lg border border-[#253545] hover:border-[#4DA6FF]/30 transition-colors">
                <div className={`px-2 py-1 rounded text-xs font-mono ${style.bg} ${style.text}`}>
                  {style.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#E8ECF0] truncate">{run.workflowId ?? run.runId}</div>
                  <div className="text-xs text-[#5A7A90] font-mono mt-0.5">
                    {run.runId} · Started {new Date(run.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm font-mono text-[#8BA4B8]">{duration}</div>
                  <div className="text-xs text-[#5A7A90]">
                    {isTerminal ? 'finished' : 'elapsed'}
                  </div>
                </div>
                <a href={`/dashboard/canvas?run=${run.runId}`}
                  className="text-xs text-[#4DA6FF] hover:underline whitespace-nowrap">
                  View
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
