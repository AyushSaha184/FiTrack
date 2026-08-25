import firestore from '@react-native-firebase/firestore';

// Explicitly enable offline cache persistence and configure cache size settings
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

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
