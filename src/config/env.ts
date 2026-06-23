const STORAGE_ENCRYPTION_KEY = process.env.EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY;

if (isProduction && !STORAGE_ENCRYPTION_KEY) {
  throw new Error(
    'STORAGE_ENCRYPTION_KEY environment variable is required in production. ' +
    'Set EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY in your environment.'
  );
}

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
  STORAGE_ENCRYPTION_KEY: STORAGE_ENCRYPTION_KEY || undefined,
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV as 'development' | 'staging' | 'production') || 'development',
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  REST_TIMER_DEFAULT: 90,
} as const;

export const isProduction = ENV.APP_ENV === 'production';
export const isDevelopment = ENV.APP_ENV === 'development';

if (__DEV__) {
  console.log('[ENV] SUPABASE_URL configured as:', ENV.SUPABASE_URL);
}

