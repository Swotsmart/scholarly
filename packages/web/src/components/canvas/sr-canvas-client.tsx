'use client';

import React, { useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';

// The production canvas component — does its own API calls internally
// via WorkflowAPIClient when given an apiConfig.
import SRCanvasProduction from '@/services/sr/sr-canvas-production';
import type { WorkflowAPIConfig } from '@/services/sr/sr-canvas-production';

// Environment-based API configuration
const SR_API_BASE = process.env.NEXT_PUBLIC_SR_API_URL ?? '/api/v1/sr';
const SR_WS_BASE = process.env.NEXT_PUBLIC_SR_WS_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/sr`
    : '');

export function SRCanvasClient() {
  const { user, accessToken } = useAuthStore();
  const recordUse = useComposingMenuStore(s => s.recordUse);

  const tenantId = (user as any)?.tenantId ?? 'default';
  const userId = user?.id ?? '';
  const token = accessToken ?? '';
  const role = (user as any)?.role ?? 'admin';

  // Build the apiConfig that the canvas component expects.
  const apiConfig: WorkflowAPIConfig = useMemo(() => ({
    baseUrl: SR_API_BASE,
    wsUrl: SR_WS_BASE,
    authToken: token,
    tenantId,
    userId,
  }), [token, tenantId, userId]);

  // Handle workflow save
  const handleSave = useMemo(() => (definition: unknown) => {
    console.log('[SR Canvas] Workflow saved:', (definition as any)?.workflowId);
  }, []);

  // Track meaningful use for the composing menu system.
  // After 5 seconds on the canvas, record a use of task SR1.
  useEffect(() => {
    const timer = setTimeout(() => {
      recordUse(role, 'SR1');
    }, 5000);
    return () => clearTimeout(timer);
  }, [role, recordUse]);

  return (
    <div className="h-full">
      <SRCanvasProduction
        apiConfig={apiConfig}
        onSave={handleSave}
      />
    </div>
  );
}

export default SRCanvasClient;
