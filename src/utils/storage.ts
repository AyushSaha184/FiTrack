import { MMKV } from 'react-native-mmkv';
import { ENV } from '../config/env';

let storageInstance: MMKV | null = null;

const getStorage = (): MMKV => {
  if (!storageInstance) {
    storageInstance = new MMKV({
      id: 'fitrack-storage-v2',
      encryptionKey: ENV.STORAGE_ENCRYPTION_KEY || undefined,
    });
  }
  return storageInstance;
};

export const storage = {
  getString: (key: string): string | null => {
    try {
      return getStorage().getString(key) ?? null;
    } catch {
      return null;
    }
  },
  get: <T = unknown>(key: string): T | null => {
    try {
      const value = getStorage().getString(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown): void => {
    try {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      getStorage().set(key, serialized);
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage] set failed', key, error);
      }
    }
  },
  delete: (key: string): void => {
    try {
      getStorage().delete(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage] delete failed', key, error);
      }
    }
  },
  contains: (key: string): boolean => {
    try {
      return getStorage().contains(key);
    } catch {
      return false;
    }
  },
  clearAll: (): void => {
    try {
      getStorage().clearAll();
    } catch (error) {
      if (__DEV__) {
        console.warn('[storage] clearAll failed', error);
      }
    }
  },
};
