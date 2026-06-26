import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/env';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';

const supabaseUrl = ENV.SUPABASE_URL || '';
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || '';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => {
        return Promise.resolve(storage.getString(key));
      },
      setItem: (key, value) => {
        storage.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key) => {
        storage.delete(key);
        return Promise.resolve();
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const getUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};