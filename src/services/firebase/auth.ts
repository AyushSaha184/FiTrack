import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ENV } from '../../config/env';
import { storage } from '../../utils/storage';
import type { LoginInput, SignupInput } from '../../utils/validators';
import { logger } from '../../utils/logger';

GoogleSignin.configure({
  webClientId: ENV.FIREBASE_WEB_CLIENT_ID,
});

const mapFirebaseUser = (firebaseUser: any) => {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
    user_metadata: {
      name: firebaseUser.displayName || 'Athlete',
      full_name: firebaseUser.displayName || 'Athlete',
      avatar_url: firebaseUser.photoURL,
      picture: firebaseUser.photoURL,
    },
  };
};

export const firebaseAuthService = {
  async getSession() {
    const firebaseUser = auth().currentUser;
    const user = mapFirebaseUser(firebaseUser);
    return { session: user ? { user } : null };
  },

  async getUser() {
    const user = mapFirebaseUser(auth().currentUser);
    return { user };
  },

  async login({ email, password }: LoginInput) {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const user = mapFirebaseUser(userCredential.user);
      try {
        if (user?.id) {
          storage.set(`auth_credentials_${user.id}`, { email, password });
        }
      } catch (_) {}
      return { user, session: user ? { user } : null };
    } catch (error: any) {
      logger.error('[firebaseAuthService] login error:', error);
      throw this.mapAuthError(error);
    }
  },

  async signup({ email, password, name }: SignupInput) {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        await userCredential.user.updateProfile({
          displayName: name,
        });
        await userCredential.user.reload();
      }
      const updatedUser = auth().currentUser;
      const user = mapFirebaseUser(updatedUser);
      try {
        if (user?.id) {
          storage.set(`auth_credentials_${user.id}`, { email, password });
        }
      } catch (_) {}
      return { user, session: user ? { user } : null };
    } catch (error: any) {
      logger.error('[firebaseAuthService] signup error:', error);
      throw this.mapAuthError(error);
    }
  },

  async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken, accessToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID Token returned');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = mapFirebaseUser(userCredential.user);
      return { user, session: user ? { user } : null };
    } catch (err: any) {
      logger.error('[firebaseAuthService] signInWithGoogle error:', err);
      throw this.mapAuthError(err);
    }
  },

  async signOut() {
    try {
      const current = auth().currentUser;
      try {
        if (current?.uid) storage.delete(`auth_credentials_${current.uid}`);
      } catch (_) {}
      await GoogleSignin.signOut();
    } catch (_) {
      // Ignore Google sign-out failures
    }
    try {
      if (auth().currentUser) {
        await auth().signOut();
      }
    } catch (error: any) {
      if (error?.code !== 'auth/no-current-user' && !error?.message?.includes('no-current-user')) {
        logger.error('[firebaseAuthService] signOut error:', error);
      }
    }
  },

  async resetPassword(email: string) {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      logger.error('[firebaseAuthService] resetPassword error:', error);
      throw this.mapAuthError(error);
    }
  },

  async updateProfile(updates: { name?: string; email?: string; onboardingCompleted?: boolean }) {
    const user = auth().currentUser;
    if (!user) throw new Error('No user is currently signed in');

    try {
      if (updates.name) {
        await user.updateProfile({
          displayName: updates.name,
        });
      }
      if (updates.email) {
        await user.updateEmail(updates.email);
      }
      await user.reload();
    } catch (error: any) {
      logger.error('[firebaseAuthService] updateProfile error:', error);
      throw this.mapAuthError(error);
    }
  },

  async reauthenticate(email: string, password: string) {
    const user = auth().currentUser;
    if (!user) throw new Error('No user is currently signed in');
    try {
      const cred = auth.EmailAuthProvider.credential(email, password);
      await user.reauthenticateWithCredential(cred);
    } catch (error: any) {
      logger.error('[firebaseAuthService] reauthenticate error:', error);
      throw this.mapAuthError(error);
    }
  },

  async deleteAccount() {
    const user = auth().currentUser;
    if (!user) throw new Error('No user is currently signed in');

    const userId = user.uid;
    try {
      // 0. Ensure the session is fresh enough to perform a sensitive operation.
      // Firebase requires a recent login for user.delete(); reauthenticate silently
      // using stored credentials if we have them, otherwise surface a clear error.
      try {
        const lastSignIn = user.metadata?.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).getTime()
          : 0;
        const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - lastSignIn > STALE_THRESHOLD_MS) {
          const stored = storage.get<{ email: string; password: string }>(`auth_credentials_${userId}`);
          if (stored?.email && stored?.password) {
            const cred = auth.EmailAuthProvider.credential(stored.email, stored.password);
            await user.reauthenticateWithCredential(cred);
          } else {
            throw new Error(
              'For security, please log out and log back in with your password before deleting your account.',
            );
          }
        }
      } catch (e: any) {
        if (e?.message?.includes('log out and log back in')) {
          throw e;
        }
        logger.warn('[firebaseAuthService] Pre-delete reauth check failed:', e);
      }

      // 1. Delete all workouts
      try {
        const workoutsSnap = await firestore().collection('users').doc(userId).collection('workouts').get();
        const batch1 = firestore().batch();
        workoutsSnap.docs.forEach((doc) => batch1.delete(doc.ref));
        await batch1.commit();
      } catch (e) {
        logger.warn('[firebaseAuthService] Error deleting user workouts:', e);
      }

      // 2. Delete all weight entries
      try {
        const weightsSnap = await firestore().collection('users').doc(userId).collection('weightEntries').get();
        const batch2 = firestore().batch();
        weightsSnap.docs.forEach((doc) => batch2.delete(doc.ref));
        await batch2.commit();
      } catch (e) {
        logger.warn('[firebaseAuthService] Error deleting user weight entries:', e);
      }

      // 3. Delete all step logs
      try {
        const stepsSnap = await firestore().collection('users').doc(userId).collection('stepLogs').get();
        const batch3 = firestore().batch();
        stepsSnap.docs.forEach((doc) => batch3.delete(doc.ref));
        await batch3.commit();
      } catch (e) {
        logger.warn('[firebaseAuthService] Error deleting user step logs:', e);
      }

      // 4. Delete root user document
      try {
        await firestore().collection('users').doc(userId).delete();
      } catch (e) {
        logger.warn('[firebaseAuthService] Error deleting user document:', e);
      }

      // 5. Sign out from Google if signed in
      try {
        await GoogleSignin.signOut();
      } catch (_) {}

      // 6. Delete Firebase Auth user
      await user.delete();
      // 7. Clean up any cached credentials for this user
      try { storage.delete(`auth_credentials_${userId}`); } catch (_) {}
      logger.info(`[firebaseAuthService] Successfully deleted user account and all data for ${userId}`);
    } catch (error: any) {
      logger.error('[firebaseAuthService] deleteAccount error:', error);
      throw this.mapAuthError(error);
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const unsubscribe = auth().onIdTokenChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const user = mapFirebaseUser(firebaseUser);
        callback('SIGNED_IN', { user });
      } else {
        callback('SIGNED_OUT', null);
      }
    });
    return unsubscribe;
  },

  mapAuthError(err: any): Error {
    const code = err?.code;
    const message = err?.message || 'An error occurred';

    const errorMap: Record<string, string> = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This user account has been disabled.',
      'auth/user-not-found': 'No user found with this email.',
      'auth/wrong-password': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak.',
      'auth/too-many-requests': 'Too many attempts. Try again shortly.',
      'auth/invalid-credential': 'Invalid login credentials.',
      'auth/requires-recent-login': 'This sensitive operation requires recent authentication. Please log out, log back in, and try deleting your account again.',
    };

    if (code && errorMap[code]) {
      return new Error(errorMap[code]);
    }

    return new Error(message);
  },
};
