import { syncNotes } from '../hooks/useDb.js';

let syncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'Offline' : 'Synced';
const statusListeners = new Set();

export const getSyncStatus = () => syncStatus;

export const setSyncStatus = (status) => {
  syncStatus = status;
  statusListeners.forEach((listener) => listener(syncStatus));
};

export const subscribeSyncStatus = (listener) => {
  statusListeners.add(listener);
  listener(syncStatus);
  return () => statusListeners.delete(listener);
};

let debounceTimer = null;

/**
 * Triggers a debounced call to syncNotes.
 * @param {number} delay - Debounce delay in milliseconds (default 1000ms)
 */
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
      .then((res) => {
        if (res !== null) {
          setSyncStatus('Synced');
        } else {
          setSyncStatus('Offline');
        }
      })
      .catch((err) => {
        console.error('Error during auto-sync:', err);
        setSyncStatus('Offline');
      });
  }, delay);
};

/**
 * Initializes window event listeners for auto-syncing notes on 'online' and 'visibilitychange' (visible).
 */
export const initSyncManager = () => {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('App network online: triggering sync');
    setSyncStatus('Syncing...');
    triggerDebouncedSync(500);
  };

  const handleOffline = () => {
    console.log('App network offline');
    setSyncStatus('Offline');
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('App visibility active: triggering sync');
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
