const DATABASE = 'roma-offline';
const STORE = 'photo-queue';
const VERSION = 1;

export interface QueuedPhoto {
  entryId: string;
  blob: Blob;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB is unavailable'));
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'entryId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queuePhoto(entryId: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDatabase();
    return await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ entryId, blob, createdAt: Date.now() } satisfies QueuedPhoto);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    });
  } catch { return false; }
}

export async function getQueuedPhoto(entryId: string): Promise<QueuedPhoto | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(entryId);
      request.onsuccess = () => { db.close(); resolve((request.result as QueuedPhoto | undefined) ?? null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch { return null; }
}

export async function listQueuedPhotos(): Promise<QueuedPhoto[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => { db.close(); resolve(request.result as QueuedPhoto[]); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch { return []; }
}

export async function removeQueuedPhoto(entryId: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(entryId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    });
  } catch { /* Keep the queued photo if the browser cannot update IndexedDB. */ }
}
