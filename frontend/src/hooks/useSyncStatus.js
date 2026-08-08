import { useState, useEffect } from 'react';
import { subscribeSyncStatus, getSyncStatus } from '../lib/syncManager';

export function useSyncStatus() {
  const [syncState, setSyncState] = useState(getSyncStatus());

  useEffect(() => {
    return subscribeSyncStatus(setSyncState);
  }, []);

  if (typeof syncState === 'string') {
    return {
      status: syncState,
      isSyncing: syncState === 'Syncing...',
      pendingCount: 0,
      lastSyncedAt: null,
      hasConflicts: false
    };
  }

  return syncState || {
    status: 'Synced',
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    hasConflicts: false
  };
}
