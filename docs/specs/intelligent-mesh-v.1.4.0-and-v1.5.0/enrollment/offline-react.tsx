/**
 * Offline Form React Hooks & Components
 * 
 * Provides React integration for offline-capable enrollment forms.
 * Includes hooks for managing offline state, syncing, and UI components
 * for showing connectivity status.
 * 
 * ## Usage
 * 
 * ```tsx
 * import { 
 *   useOfflineForm, 
 *   useConnectivity, 
 *   OfflineIndicator,
 *   SyncStatus 
 * } from '@scholarly/enrollment/offline-react';
 * 
 * function EnrollmentForm({ formConfigId }) {
 *   const {
 *     submission,
 *     saveField,
 *     submitForm,
 *     isOnline,
 *     isSyncing,
 *     pendingSyncCount,
 *     lastSaved
 *   } = useOfflineForm(formConfigId);
 * 
 *   return (
 *     <form>
 *       <OfflineIndicator />
 *       
 *       <input
 *         value={submission.responses.firstName || ''}
 *         onChange={(e) => saveField('firstName', e.target.value)}
 *       />
 *       
 *       <SyncStatus 
 *         pendingCount={pendingSyncCount}
 *         lastSaved={lastSaved}
 *         isSyncing={isSyncing}
 *       />
 *       
 *       <button onClick={submitForm} disabled={!isOnline}>
 *         Submit
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 * 
 * @module IntelligenceMesh/Enrollment/OfflineReact
 * @version 1.4.1
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  ReactNode 
} from 'react';

import { 
  OfflineManager, 
  LocalSubmission, 
  ConnectivityState, 
  SyncResult,
  SyncConflict,
  ConflictStrategy,
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG
} from './offline-storage';

// ============================================================================
// CONTEXT
// ============================================================================

interface OfflineContextValue {
  manager: OfflineManager;
  isOnline: boolean;
  connectivity: ConnectivityState;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncResult: SyncResult | null;
  forceSync: () => Promise<SyncResult>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface OfflineProviderProps {
  children: ReactNode;
  config?: Partial<OfflineConfig>;
  onSyncComplete?: (result: SyncResult) => void;
  onConflict?: (conflicts: SyncConflict[]) => void;
  onStorageWarning?: (used: number, quota: number) => void;
}

/**
 * Provider component that initializes offline capabilities
 */
export function OfflineProvider({
  children,
  config,
  onSyncComplete,
  onConflict,
  onStorageWarning
}: OfflineProviderProps) {
  const [manager] = useState(() => new OfflineManager(config));
  const [isOnline, setIsOnline] = useState(true);
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    isOnline: true,
    lastChecked: new Date()
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    // Initialize manager
    manager.initialize().then(async () => {
      const count = await manager.getPendingSyncCount();
      setPendingSyncCount(count);
    });

    // Set up event listeners
    manager.on('connectivityChange', (state: ConnectivityState) => {
      setIsOnline(state.isOnline);
      setConnectivity(state);
    });

    manager.on('syncStarted', () => {
      setIsSyncing(true);
    });

    manager.on('syncComplete', async (result: SyncResult) => {
      setIsSyncing(false);
      setLastSyncResult(result);
      const count = await manager.getPendingSyncCount();
      setPendingSyncCount(count);
      
      if (result.conflicts.length > 0 && onConflict) {
        onConflict(result.conflicts);
      }
      
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    });

    manager.on('storageWarning', ({ usedBytes, quotaBytes }: { usedBytes: number; quotaBytes: number }) => {
      if (onStorageWarning) {
        onStorageWarning(usedBytes, quotaBytes);
      }
    });

    manager.on('responseSaved', async () => {
      const count = await manager.getPendingSyncCount();
      setPendingSyncCount(count);
    });

    // Initial connectivity state
    setConnectivity(manager.getConnectivityState());
    setIsOnline(manager.isOnline());
  }, [manager, onSyncComplete, onConflict, onStorageWarning]);

  const forceSync = useCallback(async () => {
    return manager.forceSync();
  }, [manager]);

  const value: OfflineContextValue = {
    manager,
    isOnline,
    connectivity,
    isSyncing,
    pendingSyncCount,
    lastSyncResult,
    forceSync
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access the offline context
 */
export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

/**
 * Hook for connectivity status only
 */
export function useConnectivity(): {
  isOnline: boolean;
  connectivity: ConnectivityState;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
} {
  const { isOnline, connectivity } = useOffline();
  
  const connectionQuality = !isOnline ? 'offline' :
    connectivity.effectiveType === '4g' ? 'excellent' :
    connectivity.effectiveType === '3g' ? 'good' : 'poor';
  
  return { isOnline, connectivity, connectionQuality };
}

/**
 * Main hook for offline-capable forms
 */
export function useOfflineForm(formConfigId: string, tenantId: string): {
  submission: LocalSubmission | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSaved: Date | null;
  saveField: (fieldId: string, value: any) => Promise<void>;
  saveFields: (fields: { fieldId: string; value: any }[]) => Promise<void>;
  submitForm: () => Promise<void>;
  discardDraft: () => Promise<void>;
  resolveConflict: (conflict: SyncConflict, strategy: ConflictStrategy) => Promise<void>;
} {
  const { manager, isOnline, isSyncing, pendingSyncCount } = useOffline();
  const [submission, setSubmission] = useState<LocalSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingChanges = useRef<Map<string, any>>(new Map());

  // Initialize or load submission
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to find existing draft
        const existing = await manager.getLocalSubmissions(formConfigId);
        const draft = existing.find(s => s.status === 'draft');
        
        if (draft) {
          setSubmission(draft);
        } else {
          // Create new submission
          const newSubmission = await manager.createLocalSubmission(formConfigId, tenantId);
          setSubmission(newSubmission);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [manager, formConfigId, tenantId]);

  // Listen for sync updates to this submission
  useEffect(() => {
    const handleResponseSaved = async ({ submissionId }: { submissionId: string }) => {
      if (submission && submissionId === submission.localId) {
        const updated = await manager.getLocalSubmission(submissionId);
        if (updated) {
          setSubmission(updated);
          setLastSaved(new Date());
        }
      }
    };

    manager.on('responseSaved', handleResponseSaved);
    return () => manager.off('responseSaved', handleResponseSaved);
  }, [manager, submission]);

  // Save a single field
  const saveField = useCallback(async (fieldId: string, value: any) => {
    if (!submission) return;
    
    try {
      const updated = await manager.saveResponseLocally(submission.localId, fieldId, value);
      setSubmission(updated);
      setLastSaved(new Date());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [manager, submission]);

  // Save multiple fields (batched)
  const saveFields = useCallback(async (fields: { fieldId: string; value: any }[]) => {
    if (!submission) return;
    
    try {
      let updated = submission;
      for (const { fieldId, value } of fields) {
        updated = await manager.saveResponseLocally(updated.localId, fieldId, value);
      }
      setSubmission(updated);
      setLastSaved(new Date());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [manager, submission]);

  // Submit the form
  const submitForm = useCallback(async () => {
    if (!submission) return;
    
    if (!isOnline) {
      setError('You must be online to submit the form');
      return;
    }
    
    try {
      // Mark submission as pending
      // The actual submission will happen through the sync process
      // or directly if online
      const response = await fetch(`/api/v1/enrollment/submissions/${submission.serverId || submission.localId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Submission failed');
      }
      
      // Update local state
      const updated = await manager.getLocalSubmission(submission.localId);
      if (updated) {
        setSubmission({ ...updated, status: 'submitted' });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [manager, submission, isOnline]);

  // Discard draft
  const discardDraft = useCallback(async () => {
    if (!submission) return;
    
    // TODO: Implement draft deletion
    setSubmission(null);
  }, [submission]);

  // Resolve conflict
  const resolveConflict = useCallback(async (conflict: SyncConflict, strategy: ConflictStrategy) => {
    await manager.resolveConflict(conflict, strategy);
  }, [manager]);

  return {
    submission,
    isLoading,
    error,
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSaved,
    saveField,
    saveFields,
    submitForm,
    discardDraft,
    resolveConflict
  };
}

/**
 * Hook for debounced field saving
 */
export function useDebouncedSave(
  saveField: (fieldId: string, value: any) => Promise<void>,
  debounceMs: number = 500
): (fieldId: string, value: any) => void {
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingValues = useRef<Map<string, any>>(new Map());

  return useCallback((fieldId: string, value: any) => {
    // Store the pending value
    pendingValues.current.set(fieldId, value);
    
    // Clear existing timeout for this field
    const existing = timeouts.current.get(fieldId);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      const valueToSave = pendingValues.current.get(fieldId);
      pendingValues.current.delete(fieldId);
      timeouts.current.delete(fieldId);
      saveField(fieldId, valueToSave);
    }, debounceMs);
    
    timeouts.current.set(fieldId, timeout);
  }, [saveField, debounceMs]);
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
}

/**
 * Visual indicator for offline status
 */
export function OfflineIndicator({
  className = '',
  showWhenOnline = false,
  position = 'bottom-right'
}: OfflineIndicatorProps) {
  const { isOnline, connectivity } = useConnectivity();
  
  if (isOnline && !showWhenOnline) {
    return null;
  }
  
  const positionClasses = {
    'top-left': 'fixed top-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'inline': 'relative'
  };
  
  const statusColor = isOnline ? 'bg-green-500' : 'bg-amber-500';
  const statusText = isOnline 
    ? `Online (${connectivity.effectiveType || 'unknown'})` 
    : 'Offline - Changes saved locally';
  
  return (
    <div 
      className={`${positionClasses[position]} flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg bg-white border ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full ${statusColor} ${!isOnline ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-gray-700">{statusText}</span>
    </div>
  );
}

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Displays sync status information
 */
export function SyncStatus({ className = '', showDetails = true }: SyncStatusProps) {
  const { isSyncing, pendingSyncCount, lastSyncResult, forceSync } = useOffline();
  
  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {isSyncing ? (
        <span className="flex items-center gap-2 text-blue-600">
          <SyncingIcon className="w-4 h-4 animate-spin" />
          Syncing...
        </span>
      ) : pendingSyncCount > 0 ? (
        <span className="flex items-center gap-2 text-amber-600">
          <PendingIcon className="w-4 h-4" />
          {pendingSyncCount} change{pendingSyncCount !== 1 ? 's' : ''} pending
          <button 
            onClick={() => forceSync()}
            className="text-xs underline hover:no-underline"
          >
            Sync now
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-green-600">
          <CheckIcon className="w-4 h-4" />
          All changes saved
        </span>
      )}
      
      {showDetails && lastSyncResult && (
        <span className="text-gray-500">
          Last sync: {lastSyncResult.itemsSynced} synced
          {lastSyncResult.itemsFailed > 0 && `, ${lastSyncResult.itemsFailed} failed`}
        </span>
      )}
    </div>
  );
}

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isSaving?: boolean;
  className?: string;
}

/**
 * Shows auto-save status
 */
export function AutoSaveIndicator({ lastSaved, isSaving = false, className = '' }: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('');
  
  useEffect(() => {
    if (!lastSaved) return;
    
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo('just now');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setTimeAgo(lastSaved.toLocaleTimeString());
      }
    };
    
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastSaved]);
  
  if (isSaving) {
    return (
      <span className={`text-sm text-gray-500 ${className}`}>
        Saving...
      </span>
    );
  }
  
  if (!lastSaved) {
    return null;
  }
  
  return (
    <span className={`text-sm text-gray-500 ${className}`}>
      Saved {timeAgo}
    </span>
  );
}

interface ConflictResolverProps {
  conflict: SyncConflict;
  onResolve: (strategy: ConflictStrategy, manualValue?: any) => void;
  onCancel: () => void;
}

/**
 * UI for resolving sync conflicts
 */
export function ConflictResolver({ conflict, onResolve, onCancel }: ConflictResolverProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Sync Conflict</h3>
        
        <p className="text-gray-600 mb-4">
          This field was modified both locally and on the server. 
          Please choose which version to keep.
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Your version</div>
            <div className="text-gray-900">{JSON.stringify(conflict.localVersion)}</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Server version</div>
            <div className="text-gray-900">{JSON.stringify(conflict.serverVersion)}</div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => onResolve('local_wins')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Keep mine
          </button>
          <button
            onClick={() => onResolve('server_wins')}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Use server
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ICONS (inline SVGs for independence)
// ============================================================================

function SyncingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  OfflineContextValue,
  OfflineProviderProps,
  OfflineIndicatorProps,
  SyncStatusProps,
  AutoSaveIndicatorProps,
  ConflictResolverProps
};
