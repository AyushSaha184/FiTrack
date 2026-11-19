import { storage } from '../../utils/storage';

type Listener = () => void;

/**
 * Tiny in-memory pub/sub used to emulate live database listeners for data
 * that lives entirely on the device. Every write through the local
 * services notifies subscribers so screens keep updating live.
 */
const listeners = new Map<string, Set<Listener>>();

export const localStore = {
  getList<T>(key: string): T[] {
    const value = storage.get<T[]>(key);
    return Array.isArray(value) ? value : [];
  },

  setList<T>(key: string, items: T[]): void {
    storage.set(key, items);
    localStore.notify(key);
  },

  subscribe(key: string, listener: Listener): () => void {
    let bucket = listeners.get(key);
    if (!bucket) {
      bucket = new Set();
      listeners.set(key, bucket);
    }
    bucket.add(listener);
    return () => {
      bucket?.delete(listener);
      if (bucket && bucket.size === 0) {
        listeners.delete(key);
      }
    };
  },

  notify(key: string): void {
    const bucket = listeners.get(key);
    if (!bucket) return;
    bucket.forEach((listener) => {
      try {
        listener();
      } catch {
        // A broken listener must never prevent other subscribers (or the
        // write that triggered the notification) from completing.
      }
    });
  },
};
