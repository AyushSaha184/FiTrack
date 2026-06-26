module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-inline-environment-variables',
      {
        include: [
          'EXPO_PUBLIC_SUPABASE_URL',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY',
          'EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY',
          'EXPO_PUBLIC_APP_ENV',
          'EXPO_PUBLIC_SENTRY_DSN',
          'EXPO_PUBLIC_ENABLE_ANALYTICS',
        ],
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
