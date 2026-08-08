import { useState, useEffect } from 'react';
import { subscribeSyncStatus, getSyncStatus } from '../lib/syncManager';

export function useSyncStatus() {
  const [syncState, setSyncState] = useState(getSyncStatus());

  useEffect(() => {
    return subscribeSyncStatus(setSyncState);
  }, []);

  return syncState;
}
