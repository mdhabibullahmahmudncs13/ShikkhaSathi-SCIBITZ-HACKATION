import { useEffect, useState, useCallback } from 'react';
import { syncManager, SyncStatus, SyncConflict, SyncError, SyncEvent } from '../services/syncManager';

export interface UseSyncManagerReturn {
  // Status
  syncStatus: SyncStatus;
  conflicts: SyncConflict[];
  errors: SyncError[];
  
  // Actions
  startSync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge') => Promise<void>;
  clearErrors: () => void;
  clearResolvedConflicts: () => void;
  
  // UI State
  showSyncProgress: boolean;
  showConflictResolution: boolean;
  setShowSyncProgress: (show: boolean) => void;
  setShowConflictResolution: (show: boolean) => void;
}

export const useSyncManager = (): UseSyncManagerReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus());
  const [conflicts, setConflicts] = useState<SyncConflict[]>(syncManager.getConflicts());
  const [errors, setErrors] = useState<SyncError[]>(syncManager.getErrors());
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [showConflictResolution, setShowConflictResolution] = useState(false);

  // Update state when sync events occur
  useEffect(() => {
    const handleStatusChange = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    const handleProgressUpdate = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
    };

    const handleSyncComplete = (event: SyncEvent) => {
      setSyncStatus(syncManager.getSyncStatus());
      setErrors(syncManager.getErrors());
    };

    const handleConflictDetected = (event: SyncEvent) => {
      setConflicts(syncManager.getConflicts());
      // Auto-show conflict resolution modal when conflicts are detected
      if (!showConflictResolution) {
        setShowConflictResolution(true);
      }
    };

    const handleSyncError = (event: SyncEvent) => {
      setErrors(syncManager.getErrors());
      setSyncStatus(syncManager.getSyncStatus());
    };

    // Register event listeners
    syncManager.addEventListener('status-change', handleStatusChange);
    syncManager.addEventListener('progress-update', handleProgressUpdate);
    syncManager.addEventListener('sync-complete', handleSyncComplete);
    syncManager.addEventListener('conflict-detected', handleConflictDetected);
    syncManager.addEventListener('sync-error', handleSyncError);

    return () => {
      // Cleanup event listeners
      syncManager.removeEventListener('status-change', handleStatusChange);
      syncManager.removeEventListener('progress-update', handleProgressUpdate);
      syncManager.removeEventListener('sync-complete', handleSyncComplete);
      syncManager.removeEventListener('conflict-detected', handleConflictDetected);
      syncManager.removeEventListener('sync-error', handleSyncError);
    };
  }, [showConflictResolution]);

  // Auto-show sync progress when sync starts
  useEffect(() => {
    if (syncStatus.isSyncing && !showSyncProgress) {
      setShowSyncProgress(true);
    }
  }, [syncStatus.isSyncing, showSyncProgress]);

  // Actions
  const startSync = useCallback(async () => {
    setShowSyncProgress(true);
    await syncManager.forcSync();
  }, []);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    await syncManager.resolveConflict(conflictId, resolution);
    setConflicts(syncManager.getConflicts());
  }, []);

  const clearErrors = useCallback(() => {
    syncManager.clearErrors();
    setErrors([]);
  }, []);

  const clearResolvedConflicts = useCallback(() => {
    syncManager.clearResolvedConflicts();
    setConflicts(syncManager.getConflicts());
  }, []);

  return {
    // Status
    syncStatus,
    conflicts: conflicts.filter(c => !c.resolved),
    errors,
    
    // Actions
    startSync,
    resolveConflict,
    clearErrors,
    clearResolvedConflicts,
    
    // UI State
    showSyncProgress,
    showConflictResolution,
    setShowSyncProgress,
    setShowConflictResolution
  };
};