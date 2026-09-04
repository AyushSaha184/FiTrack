import firestore from '@react-native-firebase/firestore';

// Explicitly enable offline cache persistence and configure cache size settings
try {
  firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
  }).catch(() => {});
} catch {
  // Ignore if Firestore is already started (e.g. across Fast Refresh or after background service start)
}

export const db = firestore();

export const collections = {
  users: () => db.collection('users'),
  userDoc: (userId: string) => db.collection('users').doc(userId),
  workouts: (userId: string) => db.collection('users').doc(userId).collection('workouts'),
  workoutDoc: (userId: string, workoutId: string) =>
    db.collection('users').doc(userId).collection('workouts').doc(workoutId),
  weightEntries: (userId: string) => db.collection('users').doc(userId).collection('weightEntries'),
  weightDoc: (userId: string, entryId: string) =>
    db.collection('users').doc(userId).collection('weightEntries').doc(entryId),
  stepLogs: (userId: string) => db.collection('users').doc(userId).collection('stepLogs'),
  stepDoc: (userId: string, logId: string) =>
    db.collection('users').doc(userId).collection('stepLogs').doc(logId),
  aiContentReports: db.collection('aiContentReports'),
};
