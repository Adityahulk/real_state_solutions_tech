'use client';

import { useEffect, useState } from 'react';
import { flushOfflineQueue, offlineQueue } from '~/lib/offline-queue';
import { api } from '~/lib/api';

/**
 * Registers the service worker (once), watches online/offline transitions,
 * and exposes a tiny "X queued" banner when there's pending offline data.
 */
export function PwaBootstrap() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const refresh = async () => {
      const c = await offlineQueue.count();
      setQueueCount(c.updates);
    };
    void refresh();

    const onOnline = async () => {
      setOnline(true);
      await flushOfflineQueue({
        apiPost: (p, b) => api.post(p, b),
      });
      void refresh();
    };
    const onOffline = () => setOnline(false);
    const onCustom = () => void refresh();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('rest:queue-changed', onCustom);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('rest:queue-changed', onCustom);
    };
  }, []);

  if (online && queueCount === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-1.5 text-xs shadow-md ${
        online ? 'bg-amber-100 text-amber-900' : 'bg-slate-900 text-white'
      }`}
    >
      {!online && '● Offline'}
      {queueCount > 0 && (online ? ` · syncing ${queueCount}…` : ` · ${queueCount} queued`)}
    </div>
  );
}

/** Fire after enqueue / dequeue so the banner refreshes immediately. */
export function pingQueueChanged() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('rest:queue-changed'));
}
