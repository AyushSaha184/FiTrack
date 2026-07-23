import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/env';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';
import { logger } from '../../utils/logger';

const supabaseUrl = ENV.SUPABASE_URL || '';
export const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || '';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export let isSupabaseTokenSynced = false;

export const setSupabaseToken = async (token: string | null): Promise<void> => {
  const authHeader = token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`;
  const headers = (supabase as any).rest?.headers;

  if (headers) {
    if (typeof headers.set === 'function') {
      headers.set('Authorization', authHeader);
    } else {
      headers['Authorization'] = authHeader;
    }
  }
  isSupabaseTokenSynced = !!token;
};

/**
 * Exchange a Firebase ID token for a Supabase-compatible JWT via the
 * `firebase-token-exchange` Edge Function, then set it as the active
 * Authorization header for all subsequent Supabase REST calls.
 */
import auth from '@react-native-firebase/auth';

export const refreshSupabaseToken = async (): Promise<boolean> => {
  try {
    const user = auth().currentUser;
    if (user) {
      const idToken = await user.getIdToken(true);
      await syncSupabaseAuth(idToken);
      return true;
    }
  } catch (err) {
    console.warn('[Supabase client] Failed to refresh token:', err);
  }
  return false;
};

export const withTokenRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isJwtExpired =
      error?.code === 'PGRST303' ||
      error?.message?.toLowerCase().includes('jwt expired') ||
      error?.message?.toLowerCase().includes('token expired');

    if (isJwtExpired) {
      console.log('[Supabase client] JWT expired, auto-refreshing token and retrying...');
      const refreshed = await refreshSupabaseToken();
      if (refreshed) {
        return await operation();
      }
    }
    throw error;
  }
};

let activeTokenExchangePromise: Promise<void> | null = null;
let lastSyncedToken: string | null = null;

export const syncSupabaseAuth = async (firebaseIdToken: string): Promise<void> => {
  if (!supabaseUrl) {
    logger.error('[Supabase client] syncSupabaseAuth failed: SUPABASE_URL is undefined or empty');
    throw new Error('Supabase URL is not configured. Please check your environment settings.');
  }

  if (lastSyncedToken === firebaseIdToken && isSupabaseTokenSynced) {
    return;
  }

  if (activeTokenExchangePromise) {
    return activeTokenExchangePromise;
  }

  activeTokenExchangePromise = (async () => {
    const performExchange = async (attempt: number): Promise<void> => {
      console.log(`[syncSupabaseAuth] Exchanging token with Edge Function (attempt ${attempt}):`, `${supabaseUrl}/functions/v1/firebase-token-exchange`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/firebase-token-exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ firebase_token: firebaseIdToken }),
            signal: controller.signal,
          },
        );

        console.log('[syncSupabaseAuth] Edge function response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[Supabase client] syncSupabaseAuth HTTP error:', response.status, errorData);
          throw new Error(
            (errorData as any).error || `Token exchange failed (${response.status})`,
          );
        }

        const { token } = await response.json();
        console.log('[syncSupabaseAuth] Token exchange succeeded');
        await setSupabaseToken(token);
        lastSyncedToken = firebaseIdToken;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('[syncSupabaseAuth] Token exchange timed out after 15s');
          throw new Error('Server response timed out. Please check your internet connection.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      await performExchange(1);
    } catch (firstError: any) {
      console.warn('[syncSupabaseAuth] First attempt failed, retrying once:', firstError?.message || firstError);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await performExchange(2);
    }
  })();

  try {
    await activeTokenExchangePromise;
  } finally {
    activeTokenExchangePromise = null;
  }
};

export const ensureProfileExists = async (
  userId: string,
  email?: string,
  name?: string,
  avatarUrl?: string,
): Promise<void> => {
  if (!userId) return;
  try {
    const currentUser = auth().currentUser;
    const resolvedEmail = email || currentUser?.email || undefined;
    const resolvedName = name || currentUser?.displayName || 'Athlete';
    const resolvedAvatar = avatarUrl || currentUser?.photoURL || null;

    const payload: Record<string, any> = {
      id: userId,
      name: resolvedName,
      avatar_url: resolvedAvatar,
      onboarding_completed: false,
    };
    if (resolvedEmail) {
      payload.email = resolvedEmail;
    }

    await withTokenRetry(async () => {
      const { error } = await supabase.from('profiles').upsert(
        payload,
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (error) {
        logger.error('[ensureProfileExists] Error upserting profile:', error);
      }
    });
  } catch (err) {
    logger.error('[ensureProfileExists] Exception:', err);
  }
};