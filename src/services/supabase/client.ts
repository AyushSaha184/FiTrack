import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/env';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';

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
export const syncSupabaseAuth = async (firebaseIdToken: string): Promise<void> => {
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
    throw new Error(
      (errorData as any).error || `Token exchange failed (${response.status})`,
    );
  }

  const { token } = await response.json();
  console.log('[Supabase client] Exchanged token:', token);
  await setSupabaseToken(token);
};