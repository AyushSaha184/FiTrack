export const ENV = {
  FIREBASE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || '388469335990-78v3vqdvseci16e9acbifss6mdcqr7om.apps.googleusercontent.com',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jddzmsjnwomhppevocml.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZHptc2pud29taHBwZXZvY21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjk3NzIsImV4cCI6MjA5NTAwNTc3Mn0.EJKIt36FFAWfpGtWbryfl5tcOPpUlAz2bJES9eh4FTM',
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV as 'development' | 'staging' | 'production') || 'development',
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  REST_TIMER_DEFAULT: 90,
  STORAGE_ENCRYPTION_KEY: process.env.EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY || '',
} as const;

export const isProduction = ENV.APP_ENV === 'production';
export const isDevelopment = ENV.APP_ENV === 'development';

const STORAGE_ENCRYPTION_KEY = ENV.STORAGE_ENCRYPTION_KEY;

if (!STORAGE_ENCRYPTION_KEY) {
  throw new Error(
    'STORAGE_ENCRYPTION_KEY environment variable is required. ' +
    'Set EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY in your environment.'
  );
}

if (__DEV__) {
  console.log('[ENV] Firebase Web Client ID configured');
}