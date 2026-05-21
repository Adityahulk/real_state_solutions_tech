'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { offlineQueue } from '~/lib/offline-queue';
import { pingQueueChanged } from '~/components/pwa/PwaBootstrap';

type Kind = 'work_package' | 'plot_checklist_item';

interface Task {
  kind: Kind;
  id: string;
  title: string;
  subtitle: string;
  percentComplete: number;
  status: string;
}

interface CapturedPhoto {
  placeholderId: string;
  previewUrl: string;
  blob: Blob;
  filename: string;
  contentType: string;
}

export default function EngineerTaskUpdate() {
  const params = useParams<{ kind: Kind; id: string }>();
  const router = useRouter();
  const { kind, id } = params;

  // Try to find the task in the cached list (works offline)
  const tasksQ = useQuery({
    queryKey: ['me', 'tasks'],
    queryFn: () => api.get<Task[]>('/me/tasks'),
    staleTime: 60_000,
  });
  const task = tasksQ.data?.find((t) => t.kind === kind && t.id === id);

  const [percent, setPercent] = useState<number>(0);
  const [note, setNote] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (task) setPercent(Math.round(task.percentComplete));
  }, [task]);

  function captureLocation() {
    if (!('geolocation' in navigator)) {
      setMessage('Geolocation unavailable on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setMessage(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const placeholderId = offlineQueue.newId();
    setPhotos((p) => [
      ...p,
      {
        placeholderId,
        previewUrl: URL.createObjectURL(file),
        blob: file,
        filename: file.name || `photo-${Date.now()}.jpg`,
        contentType: file.type || 'image/jpeg',
      },
    ]);
    e.target.value = '';
  }

  async function submit() {
    if (!task) return;
    setSubmitting(true);
    setMessage(null);

    const path = '/progress-updates';
    const body: Record<string, unknown> = {
      percentAfter: percent,
      note: note || undefined,
      lat: geo?.lat,
      lng: geo?.lng,
      capturedAt: new Date().toISOString(),
      photoDocIds: [] as string[],
    };
    if (kind === 'work_package') body.workPackageId = id;
    else body.plotChecklistItemId = id;

    const parentScope: 'progress' = 'progress';

    if (!online) {
      // queue the updates + photos for later replay
      const updateId = offlineQueue.newId();
      const photoPlaceholders: string[] = [];
      for (const p of photos) {
        photoPlaceholders.push(p.placeholderId);
        await offlineQueue.enqueuePhoto({
          id: p.placeholderId,
          scope: parentScope,
          parentId: id,
          filename: p.filename,
          contentType: p.contentType,
          blob: p.blob,
          updateId,
        });
      }
      body.photoDocIds = photoPlaceholders; // replaced on flush
      await offlineQueue.enqueueUpdate({ path, body, photoPlaceholders });
      pingQueueChanged();
      setMessage('Offline — saved to device, will sync when connection returns.');
      setSubmitting(false);
      setTimeout(() => router.push('/engineer'), 500);
      return;
    }

    try {
      const docIds: string[] = [];
      for (const p of photos) {
        const presign = await api.post<{ url: string; key: string }>('/photos/presign', {
          scope: parentScope,
          parentId: id,
          filename: p.filename,
          contentType: p.contentType,
        });
        const put = await fetch(presign.url, {
          method: 'PUT',
          body: p.blob,
          headers: { 'content-type': p.contentType },
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);
        const doc = await api.post<{ id: string }>('/photos/register', {
          storageKey: presign.key,
          mimeType: p.contentType,
          scope: parentScope,
          parentId: id,
        });
        docIds.push(doc.id);
      }
      body.photoDocIds = docIds;
      await api.post(path, body);
      router.push('/engineer');
    } catch (e: unknown) {
      setMessage(`Failed: ${(e as Error).message}`);
      setSubmitting(false);
    }
  }

  if (!task) {
    return (
      <p className="text-slate-500 text-sm">
        Task not in your assignment list. Pull to refresh or check your network.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{task.title}</h1>
        <p className="text-xs text-slate-500">{task.subtitle}</p>
      </div>

      <label className="block rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <span className="text-sm text-slate-700">Progress</span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-lg font-semibold w-12 text-right">{percent}%</span>
        </div>
      </label>

      <label className="block rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <span className="text-sm text-slate-700">Notes (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Slab cured, ready for next pour."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
        />
      </label>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Photos</span>
          <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 text-sm font-medium text-brand-500 rounded-md border border-brand-500 hover:bg-brand-50 cursor-pointer focus-within:ring-2 focus-within:ring-brand-500">
            + Add photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              aria-label="Add progress photo"
              className="hidden"
            />
          </label>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <img
                key={p.placeholderId}
                src={p.previewUrl}
                alt=""
                className="h-24 w-full rounded border border-slate-200 object-cover"
              />
            ))}
          </div>
        )}
        {photos.length === 0 && (
          <p className="text-xs text-slate-500">
            No photos attached yet. Camera capture is preferred for evidence.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700">Location</span>
          <button
            onClick={captureLocation}
            className="inline-flex items-center justify-center min-h-[44px] px-3 text-sm font-medium text-brand-500 rounded-md border border-brand-500 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {geo ? 'Re-capture' : 'Capture'}
          </button>
        </div>
        {geo ? (
          <p className="text-xs text-slate-600 font-mono">
            {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Tap "Capture" to geo-tag this update (helps verify the engineer was on-site).
          </p>
        )}
      </div>

      {message && (
        <p role="status" aria-live="polite" className="text-sm text-amber-700">
          {message}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-md bg-brand-500 text-white px-4 min-h-[52px] text-base font-medium hover:bg-brand-700 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {submitting ? 'Submitting…' : online ? 'Submit update' : 'Save for sync'}
      </button>
    </div>
  );
}
