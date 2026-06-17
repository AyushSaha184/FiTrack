import firebase from '@react-native-firebase/app';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import analytics, { FirebaseAnalyticsTypes } from '@react-native-firebase/analytics';

export type FirebaseApp = typeof firebase;
export type Auth = FirebaseAuthTypes.Module;
export type Firestore = FirebaseFirestoreTypes.Module;
export type FirebaseStorage = FirebaseStorageTypes.Module;
export type Analytics = FirebaseAnalyticsTypes.Module;

let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let analyticsInstance: Analytics;

export const initializeFirebase = () => {
  // Native Firebase SDK initializes automatically.
  // We reference them here.
  appInstance = firebase;
  authInstance = auth();
  dbInstance = firestore();
  storageInstance = storage();
  analyticsInstance = analytics();

  console.log('[Firebase] Initialized');
  return {
    app: appInstance,
    auth: authInstance,
    db: dbInstance,
    storage: storageInstance,
    analytics: analyticsInstance,
  };
};

export const getAuth = () => {
  if (!authInstance) initializeFirebase();
  return authInstance;
};

export const getFirestore = () => {
  if (!dbInstance) initializeFirebase();
  return dbInstance;
};

export const getStorage = () => {
  if (!storageInstance) initializeFirebase();
  return storageInstance;
};

export const getAnalytics = () => {
  if (!analyticsInstance) initializeFirebase();
  return analyticsInstance;
};

export const signIn = (email: string, password: string) => {
  return getAuth().signInWithEmailAndPassword(email, password);
};

export const signUp = (email: string, password: string) => {
  return getAuth().createUserWithEmailAndPassword(email, password);
};

export const logout = () => {
  return getAuth().signOut();
};

export const signInWithEmailAndPassword = (authInst: Auth, email: string, password: string) => {
  return authInst.signInWithEmailAndPassword(email, password);
};

export const createUserWithEmailAndPassword = (authInst: Auth, email: string, password: string) => {
  return authInst.createUserWithEmailAndPassword(email, password);
};

export const signOut = (authInst: Auth) => {
  return authInst.signOut();
};