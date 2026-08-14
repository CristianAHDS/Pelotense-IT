import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getQueue, enqueueLocal, removeLocal } from '../utils/offlineQueue';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getQueue().length);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    const queue = getQueue();
    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.body ? { 'Content-Type': 'application/json' } : undefined,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
        if (res.ok) {
          removeLocal(item.id);
        } else {
          break;
        }
      } catch (_) {
        break;
      }
    }
    setPendingCount(getQueue().length);
    syncingRef.current = false;
  }, []);

  const enqueue = useCallback((op) => {
    enqueueLocal(op);
    setPendingCount(getQueue().length);
    sync();
  }, [sync]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      sync();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [sync]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) sync();
  }, [isOnline, pendingCount, sync]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, enqueue, sync }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
