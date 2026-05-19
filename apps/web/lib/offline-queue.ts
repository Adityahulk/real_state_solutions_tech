/**
 * Tiny IndexedDB-backed queue for offline progress updates.
 *
 * Stores include:
 *  - photos: Blob entries keyed by client-generated UUID; uploaded as multipart
 *  - updates: queued POSTs (path + body); replayed when online
 *
 * Replay strategy: on `online` event we drain photos first (presign → PUT →
 * register), substituting their server-issued Document ids into the matching
 * update body, then POST the update. Failures keep entries on the queue.
 */

const DB_NAME = 'rest_engineer';
const DB_VERSION = 1;

export interface QueuedPhoto {
  id: string;
  /** payload for /photos/presign */
  scope: 'progress' | 'issue';
  parentId: string;
  filename: string;
  contentType: string;
  blob: Blob;
  /** updateId this photo belongs to — drives substitution */
  updateId: string;
}

export interface QueuedUpdate {
  id: string;
  /** POST path under /api-proxy (e.g. '/progress-updates' or '/issues') */
  path: string;
  /** JSON body. `photoPlaceholders` will be replaced with real doc ids on flush. */
  body: Record<string, unknown>;
  /** Placeholder photo ids (UUIDs from QueuedPhoto.id) referenced in body.photoDocIds. */
  photoPlaceholders: string[];
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('updates')) {
        const s = db.createObjectStore('updates', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: 'photos' | 'updates',
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        Promise.resolve(fn(s))
          .then((v) => {
            t.oncomplete = () => resolve(v);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
          })
          .catch(reject);
      }),
  );
}

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const offlineQueue = {
  newId: uuid,

  async enqueuePhoto(p: Omit<QueuedPhoto, 'id'> & { id?: string }): Promise<string> {
    const id = p.id ?? uuid();
    await tx('photos', 'readwrite', (s) => {
      s.add({ ...p, id });
    });
    return id;
  },

  async enqueueUpdate(u: Omit<QueuedUpdate, 'id' | 'createdAt'>): Promise<string> {
    const id = uuid();
    await tx('updates', 'readwrite', (s) => {
      s.add({ ...u, id, createdAt: Date.now() });
    });
    return id;
  },

  async pendingUpdates(): Promise<QueuedUpdate[]> {
    return tx('updates', 'readonly', (s) =>
      new Promise<QueuedUpdate[]>((resolve, reject) => {
        const out: QueuedUpdate[] = [];
        const req = s.openCursor();
        req.onsuccess = () => {
          const cur = req.result;
          if (cur) {
            out.push(cur.value as QueuedUpdate);
            cur.continue();
          } else resolve(out);
        };
        req.onerror = () => reject(req.error);
      }),
    );
  },

  async getPhoto(id: string): Promise<QueuedPhoto | undefined> {
    return tx('photos', 'readonly', (s) =>
      new Promise<QueuedPhoto | undefined>((resolve, reject) => {
        const req = s.get(id);
        req.onsuccess = () => resolve(req.result as QueuedPhoto | undefined);
        req.onerror = () => reject(req.error);
      }),
    );
  },

  async removeUpdate(id: string) {
    await tx('updates', 'readwrite', (s) => {
      s.delete(id);
    });
  },

  async removePhoto(id: string) {
    await tx('photos', 'readwrite', (s) => {
      s.delete(id);
    });
  },

  async count(): Promise<{ updates: number; photos: number }> {
    const [updates, photos] = await Promise.all([
      tx('updates', 'readonly', (s) =>
        new Promise<number>((resolve, reject) => {
          const r = s.count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        }),
      ),
      tx('photos', 'readonly', (s) =>
        new Promise<number>((resolve, reject) => {
          const r = s.count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        }),
      ),
    ]);
    return { updates, photos };
  },
};

interface FlushDeps {
  apiPost: <T>(path: string, body: unknown) => Promise<T>;
}

/** Drains every queued update. Photos are uploaded first, real ids substituted. */
export async function flushOfflineQueue(deps: FlushDeps) {
  const pending = await offlineQueue.pendingUpdates();
  let processed = 0;
  let failed = 0;
  for (const update of pending) {
    try {
      const placeholderToDocId = new Map<string, string>();
      for (const ph of update.photoPlaceholders) {
        const photo = await offlineQueue.getPhoto(ph);
        if (!photo) continue;
        const presign = await deps.apiPost<{ url: string; key: string }>(
          '/photos/presign',
          {
            scope: photo.scope,
            parentId: photo.parentId,
            filename: photo.filename,
            contentType: photo.contentType,
          },
        );
        const put = await fetch(presign.url, {
          method: 'PUT',
          body: photo.blob,
          headers: { 'content-type': photo.contentType },
        });
        if (!put.ok) throw new Error(`upload failed ${put.status}`);
        const doc = await deps.apiPost<{ id: string }>('/photos/register', {
          storageKey: presign.key,
          mimeType: photo.contentType,
          scope: photo.scope,
          parentId: photo.parentId,
        });
        placeholderToDocId.set(ph, doc.id);
        await offlineQueue.removePhoto(ph);
      }
      // Substitute placeholder ids in body.photoDocIds (if present)
      const body = { ...update.body };
      if (Array.isArray(body.photoDocIds)) {
        body.photoDocIds = (body.photoDocIds as string[]).map(
          (x) => placeholderToDocId.get(x) ?? x,
        );
      }
      await deps.apiPost(update.path, body);
      await offlineQueue.removeUpdate(update.id);
      processed++;
    } catch (e) {
      failed++;
      // leave on queue for next attempt
      console.warn('flush failed', e);
    }
  }
  return { processed, failed };
}
