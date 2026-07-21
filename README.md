# FiTrack

Your all-in-one fitness tracker for tracking workouts, exercises, sets, reps, weights, body weight, and daily steps.

## Features

- **Workout Tracking**: Log sets, reps, and weights with real-time tracking
- **Exercise Library**: Predefined exercises with custom exercise creation
- **Weight Tracker**: Track body weight and visualize progress over time
- **Step Tracking**: Monitor daily steps with goal progress
- **Analytics**: View workout statistics, muscle group distribution, and personal records
- **Dark Theme**: Premium dark UI design optimized for gym use

## Tech Stack

- React Native (Expo)
- TypeScript
- MobX for state management
- Supabase for backend (Auth, PostgreSQL, Storage)
- React Navigation
- React Native Reanimated for animations
- MMKV for fast local storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials.

4. Start the development server:

```bash
npx expo start
```

### Database Setup

Run the SQL migrations in `supabase/migrations/` to set up your Supabase database.

## Project Structure

```
Fitrack/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/         # App screens
│   ├── navigation/      # Navigation configuration
│   ├── stores/          # MobX stores
│   ├── services/        # Supabase services
│   ├── hooks/           # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── theme/            # Theme configuration
│   ├── models/           # TypeScript types/models
│   └── config/           # App configuration
├── assets/              # Images, fonts, icons
└── supabase/
    └── migrations/       # Database migrations
```

## Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run Jest tests
- `./scripts/build-release.sh` - Build release APK locally

## CI/CD Pipeline

Fitrack utilizes GitHub Actions for continuous integration and automated release builds.

### Workflows

- **CI Checks (`.github/workflows/ci.yml`)**: Runs on `push` and `pull_request` to `main`, `master`, and `develop`. Executes ESLint (`npm run lint`), TypeScript check (`npm run typecheck`), and Jest tests (`npm run test`).
- **Build Android Release APK (`.github/workflows/android-release.yml`)**: Runs on `push` (to `main`/`master` or tag `v*`) and manual trigger (`workflow_dispatch`). Compiles the signed release APK (`Fitrack_v1.0.1_release.apk`) and uploads it as a downloadable GitHub Actions artifact (`fitrack-release-apk`).

### GitHub Repository Secrets

Configure the following secrets in **Settings > Secrets and variables > Actions**:

| Secret Name | Description |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 string of the release keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the release keystore |
| `ANDROID_KEY_ALIAS` | Release key alias name |
| `ANDROID_KEY_PASSWORD` | Password for the release key |
| `GOOGLE_SERVICES_JSON_BASE64` | Base64 string of `google-services.json` |
| `EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY` | 32-byte hex storage encryption key |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` | Firebase Web Client ID |

## License

MIT