export const ENV = {
  FIREBASE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || '388469335990-78v3vqdvseci16e9acbifss6mdcqr7om.apps.googleusercontent.com',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV as 'development' | 'staging' | 'production') || 'development',
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  REST_TIMER_DEFAULT: 90,
  STORAGE_ENCRYPTION_KEY: process.env.EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY,
} as const;

export const isProduction = ENV.APP_ENV === 'production';
export const isDevelopment = ENV.APP_ENV === 'development';

const STORAGE_ENCRYPTION_KEY = ENV.STORAGE_ENCRYPTION_KEY;

if (isProduction && !STORAGE_ENCRYPTION_KEY) {
  throw new Error(
    'STORAGE_ENCRYPTION_KEY environment variable is required in production. ' +
    'Set EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY in your environment.'
  );
}

if (__DEV__) {
  console.log('[ENV] Firebase Web Client ID configured');
}