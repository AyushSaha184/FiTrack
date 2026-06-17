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

## License

MIT