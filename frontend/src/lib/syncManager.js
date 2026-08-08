import { db } from '../lib/db.js';
import { axiosInstance } from './axios.js';
import { v4 as uuidv4 } from 'uuid';

let syncState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'Offline' : 'Synced',
  isSyncing: false,
  lastSyncedAt: localStorage.getItem("last_sync_timestamp") || null,
  pendingCount: 0,
  hasConflicts: false
};

const statusListeners = new Set();

const calculatePendingCount = async () => {
  try {
    const dirtyCount = await db.notes.filter(note => note.is_dirty === 1).count();
    const outboxCount = await db.syncOutbox.count();
    return dirtyCount + outboxCount;
  } catch (e) {
    return 0;
  }
};

const updateState = (partialState) => {
  syncState = { ...syncState, ...partialState };
  statusListeners.forEach((listener) => listener(syncState));
};

export const getSyncStatus = () => syncState;

export const setSyncStatus = async (status) => {
  const isSyncing = status === 'Syncing...';
  const pendingCount = await calculatePendingCount();
  updateState({ status, isSyncing, pendingCount });
};

export const subscribeSyncStatus = (listener) => {
  statusListeners.add(listener);
  listener(syncState);
  calculatePendingCount().then(count => {
    if (syncState.pendingCount !== count) {
       updateState({ pendingCount: count });
    }
  });
  return () => statusListeners.delete(listener);
};

let syncAttempt = 0;

export async function syncNotes() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }
  
  try {
    const dirtyNotes = await db.notes.filter(note => note.is_dirty === 1).toArray();
    const outboxItems = await db.syncOutbox.toArray();
    
    if (dirtyNotes.length === 0 && outboxItems.length === 0) {
      updateState({ pendingCount: 0 });
      return null;
    }

    const lastSyncTimestamp = localStorage.getItem("last_sync_timestamp") || null;
    const payload = {
      notes: dirtyNotes,
      last_sync_timestamp: lastSyncTimestamp,
    };

    const idempotencyKey = uuidv4();
    
    const response = await axiosInstance.post('/api/sync', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    const data = response.data;
    
    if (data) {
      await db.transaction('rw', db.notes, db.syncOutbox, async () => {
        for (const note of dirtyNotes) {
           const updatedNote = await db.notes.get(note.id);
           if (updatedNote && updatedNote.is_dirty === 1 && (updatedNote.updated_at === note.updated_at || !updatedNote.updated_at)) {
              await db.notes.update(note.id, { is_dirty: 0 });
           }
        }
        for (const item of outboxItems) {
           await db.syncOutbox.delete(item.id);
        }
        if (data.notes && data.notes.length > 0) {
           for (const serverNote of data.notes) {
              const existingNote = await db.notes.get(serverNote.id);
              // Do not overwrite local edits made while sync was in flight
              if (existingNote && existingNote.is_dirty === 1) {
                 continue;
              }
              await db.notes.put({
                 ...serverNote,
                 is_dirty: 0
              });
           }
        }
        if (data.tombstones && data.tombstones.length > 0) {
           for (const tombstone of data.tombstones) {
              const existingNote = await db.notes.get(tombstone.id);
              if (existingNote) {
                 await db.notes.delete(tombstone.id);
              }
           }
        }
        if (data.conflicts && data.conflicts.length > 0) {
           for (const conflict of data.conflicts) {
              await db.notes.put({
                 ...conflict.server_note,
                 is_dirty: 0
              });
           }
        }
      });
      
      const newSyncTimestamp = data.last_sync_timestamp || new Date().toISOString();
      localStorage.setItem("last_sync_timestamp", newSyncTimestamp);
      syncAttempt = 0;
      
      const hasConflicts = data.conflicts && data.conflicts.length > 0;
      updateState({ 
         lastSyncedAt: newSyncTimestamp,
         hasConflicts: hasConflicts,
         pendingCount: 0
      });
      return data;
    }
  } catch (error) {
    console.error("Failed to sync notes:", error);
    syncAttempt++;
    const delay = Math.min(30000, 1000 * Math.pow(2, syncAttempt)) + Math.random() * 1000;
    setTimeout(() => {
      triggerDebouncedSync(0);
    }, delay);
    throw error;
  }
}

let debounceTimer = null;

export const triggerDebouncedSync = (delay = 1000) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncStatus('Offline');
    return;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  setSyncStatus('Syncing...');
  debounceTimer = setTimeout(() => {
    syncNotes()
      .then(() => {
        setSyncStatus('Synced');
      })
      .catch((err) => {
        console.error('Error during auto-sync:', err);
        setSyncStatus('Offline');
      });
  }, delay);
};

export const initSyncManager = () => {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = () => {
    setSyncStatus('Syncing...');
    triggerDebouncedSync(500);
  };
  const handleOffline = () => {
    setSyncStatus('Offline');
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      triggerDebouncedSync(500);
    }
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

initSyncManager();
