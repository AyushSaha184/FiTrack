export const ENV = {
  FIREBASE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || '388469335990-78v3vqdvseci16e9acbifss6mdcqr7om.apps.googleusercontent.com',
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV as 'development' | 'staging' | 'production') || 'development',
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
  REST_TIMER_DEFAULT: 90,
  STORAGE_ENCRYPTION_KEY: process.env.EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY || 'fitrack_secure_storage_key_2026',
} as const;

export const isProduction = ENV.APP_ENV === 'production';
export const isDevelopment = ENV.APP_ENV === 'development';

if (__DEV__) {
  console.log('[ENV] Firebase Web Client ID configured');
}