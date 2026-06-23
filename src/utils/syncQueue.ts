import { storage } from './storage';
import { STORAGE_KEYS } from './constants';
import { AppState, AppStateStatus } from 'react-native';

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private appStateSubscription: any = null;

  constructor() {
    this.loadQueue();
    this.setupAppStateListener();
  }

  private loadQueue() {
    const stored = storage.get<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE);
    if (stored) {
      this.queue = stored;
    }
  }

  private saveQueue() {
    storage.set(STORAGE_KEYS.SYNC_QUEUE, this.queue);
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.processQueue();
      }
    });
  }

  add(type: SyncQueueItem['type'], table: string, data: Record<string, any>): string {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(item);
    this.saveQueue();
    return item.id;
  }

  remove(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const { supabase } = await import('../services/supabase/client');

      const itemsToProcess = [...this.queue];
      const processedIds: string[] = [];

      for (const item of itemsToProcess) {
        try {
          switch (item.type) {
            case 'create':
              await supabase.from(item.table).insert(item.data);
              break;
            case 'update':
              if (item.data.id) {
                const { id, ...updates } = item.data;
                await supabase.from(item.table).update(updates).eq('id', id);
              }
              break;
            case 'delete':
              if (item.data.id) {
                await supabase.from(item.table).delete().eq('id', item.data.id);
              }
              break;
          }
          processedIds.push(item.id);
        } catch (err) {
          const updatedItem = item;
          updatedItem.retryCount++;

          if (updatedItem.retryCount >= 3) {
            processedIds.push(item.id);
            console.warn('[SyncQueue] Dropping item after 3 failed retries:', item);
          } else {
            const index = this.queue.findIndex((q) => q.id === item.id);
            if (index !== -1) {
              this.queue[index] = updatedItem;
            }
          }
        }
      }

      if (processedIds.length > 0) {
        this.queue = this.queue.filter((item) => !processedIds.includes(item.id));
        this.saveQueue();
        storage.set(STORAGE_KEYS.LAST_SYNC_AT, Date.now());
      }
    } catch (err) {
      console.error('[SyncQueue] Error processing queue:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getLastSyncAt(): number | null {
    return storage.get<number>(STORAGE_KEYS.LAST_SYNC_AT);
  }

  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const syncQueue = new SyncQueue();