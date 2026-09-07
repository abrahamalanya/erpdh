/**
 * Tiny IndexedDB-backed store for unsaved create-form state.
 *
 * On low-RAM phones the browser tab is discarded while the camera app is in the
 * foreground; when it returns the SPA reloads and every in-memory form (modal
 * fields plus the just-taken photo) is gone. IndexedDB survives that reload and,
 * unlike `localStorage`, can structured-clone `File`/`Blob` values, so the whole
 * form — text and photos — is kept on disk without adding memory pressure.
 *
 * Every call is best-effort: private-mode, denied storage or a missing
 * `indexedDB` resolve to a no-op rather than throwing into the form.
 */
const DB_NAME = 'umax-drafts';
const STORE = 'drafts';

export interface DraftRecord<T> {
  key: string;
  value: T;
  savedAt: number;
}

function withStore<R>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<R>
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    };
  });
}

export async function saveDraft<T>(key: string, value: T): Promise<void> {
  try {
    const record: DraftRecord<T> = { key, value, savedAt: Date.now() };
    await withStore('readwrite', (store) => store.put(record));
  } catch {
    // best-effort
  }
}

export async function loadDraft<T>(key: string): Promise<DraftRecord<T> | null> {
  try {
    const record = await withStore<DraftRecord<T> | undefined>('readonly', (store) =>
      store.get(key)
    );
    return record ?? null;
  } catch {
    return null;
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(key));
  } catch {
    // best-effort
  }
}
