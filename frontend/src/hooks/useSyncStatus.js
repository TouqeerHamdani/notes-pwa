import { useState, useEffect } from 'react';
import { subscribeSyncStatus, getSyncStatus } from '../lib/syncManager';

export function useSyncStatus() {
  const [status, setStatus] = useState(getSyncStatus());

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}
