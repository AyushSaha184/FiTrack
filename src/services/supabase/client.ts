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

export const syncSupabaseAuth = async (firebaseIdToken: string): Promise<void> => {
  if (!supabaseUrl) {
    logger.error('[Supabase client] syncSupabaseAuth failed: SUPABASE_URL is undefined or empty');
    throw new Error('Supabase URL is not configured. Please check your environment settings.');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/firebase-token-exchange`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ firebase_token: firebaseIdToken }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.error('[Supabase client] syncSupabaseAuth HTTP error:', response.status, errorData);
    throw new Error(
      (errorData as any).error || `Token exchange failed (${response.status})`,
    );
  }

  const { token } = await response.json();
  if (__DEV__) {
    logger.debug('[Supabase client] Token refreshed successfully');
  }
  await setSupabaseToken(token);
};