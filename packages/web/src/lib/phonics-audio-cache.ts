'use client';

interface CachedAudioEntry {
  key: string;       // format: "persona:text" e.g. "pip:hello"
  blob: ArrayBuffer;
  createdAt: number; // Date.now()
  ttl: number;       // milliseconds
}

export class PhonicsAudioCache {
  private dbName = 'scholarly-phonics-audio';
  private storeName = 'audio-cache';
  private defaultTtl = 7 * 24 * 60 * 60 * 1000;
  private db: IDBDatabase | null = null;

  async open(): Promise<boolean> {
    if (this.db) return true;
    if (typeof indexedDB === 'undefined') return false;
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () =>
          req.result.createObjectStore(this.storeName, { keyPath: 'key' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      this.prune();
      return true;
    } catch { return false; }
  }

  async get(key: string): Promise<Blob | null> {
    try {
      if (!(await this.open())) return null;
      const entry = await this.tx<CachedAudioEntry | undefined>('readonly', (s) => s.get(key));
      if (!entry) return null;
      if (Date.now() - entry.createdAt > entry.ttl) { this.delete(key); return null; }
      return new Blob([entry.blob], { type: 'audio/mpeg' });
    } catch { return null; }
  }

  async set(key: string, blob: Blob, ttl?: number): Promise<void> {
    try {
      if (!(await this.open())) return;
      const buffer = await blob.arrayBuffer();
      await this.tx('readwrite', (s) =>
        s.put({ key, blob: buffer, createdAt: Date.now(), ttl: ttl ?? this.defaultTtl })
      );
    } catch { /* cache write is non-critical */ }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    try {
      if (!(await this.open())) return;
      await this.tx('readwrite', (s) => s.delete(key));
    } catch { /* silently ignore */ }
  }

  async prune(): Promise<number> {
    try {
      if (!this.db) return 0;
      const all = await this.tx<CachedAudioEntry[]>('readonly', (s) => s.getAll());
      const now = Date.now();
      const expired = all.filter((e) => now - e.createdAt > e.ttl);
      if (expired.length) {
        await this.tx('readwrite', (s) => {
          expired.forEach((e) => s.delete(e.key));
          return s.count();
        });
      }
      return expired.length;
    } catch { return 0; }
  }

  async clear(): Promise<void> {
    try {
      if (!(await this.open())) return;
      await this.tx('readwrite', (s) => s.clear());
    } catch { /* silently ignore */ }
  }

  private tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      const txn = this.db!.transaction(this.storeName, mode);
      const store = txn.objectStore(this.storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      txn.onerror = () => reject(txn.error);
    });
  }
}

export const phonicsAudioCache = new PhonicsAudioCache();
