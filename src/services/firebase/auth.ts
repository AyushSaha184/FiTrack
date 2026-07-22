import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { setSupabaseToken, syncSupabaseAuth } from '../supabase/client';
import { ENV } from '../../config/env';
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
    if (firebaseUser) {
      try {
        // Timeout the entire token sync to prevent hanging on cold starts
        // (Edge Function cold start + stale token refresh can take 60-120s)
        let timeoutId: any;
        const syncPromise = (async () => {
          try {
            const idToken = await firebaseUser.getIdToken(false);
            await syncSupabaseAuth(idToken);
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        })();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Session sync timed out')), 10000);
        });
        await Promise.race([syncPromise, timeoutPromise]);
      } catch (err) {
        logger.error('[firebaseAuthService] getSession failed to sync Supabase:', err);
      }
    }
    const user = mapFirebaseUser(firebaseUser);
    return { session: user ? { user } : null };
  },

  async getUser() {
    const user = mapFirebaseUser(auth().currentUser);
    return { user };
  },

  async login({ email, password }: LoginInput) {
    console.log('[firebaseAuthService] login beginning with email:', email);
    try {
      console.log('[firebaseAuthService] calling signInWithEmailAndPassword...');
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      console.log('[firebaseAuthService] signInWithEmailAndPassword succeeded for uid:', userCredential.user?.uid);
      
      console.log('[firebaseAuthService] getting ID token...');
      const idToken = await userCredential.user.getIdToken(false);
      
      console.log('[firebaseAuthService] calling syncSupabaseAuth...');
      await syncSupabaseAuth(idToken);
      console.log('[firebaseAuthService] syncSupabaseAuth complete!');
      
      const user = mapFirebaseUser(userCredential.user);
      return { user, session: user ? { user } : null };
    } catch (error: any) {
      logger.error('[firebaseAuthService] login error:', error);
      throw this.mapAuthError(error);
    }
  },

  async signup({ email, password, name }: SignupInput) {
    console.log('[firebaseAuthService] signup beginning with email:', email);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        await userCredential.user.updateProfile({
          displayName: name,
        });
        await userCredential.user.reload();
      }
      const updatedUser = auth().currentUser;
      if (updatedUser) {
        const idToken = await updatedUser.getIdToken(false);
        await syncSupabaseAuth(idToken);
      }
      const user = mapFirebaseUser(updatedUser);
      return { user, session: user ? { user } : null };
    } catch (error: any) {
      logger.error('[firebaseAuthService] signup error:', error);
      throw this.mapAuthError(error);
    }
  },

  async signInWithGoogle() {
    console.log('[firebaseAuthService] signInWithGoogle beginning');
    try {
      console.log('[firebaseAuthService] Checking Google Play Services...');
      await GoogleSignin.hasPlayServices();
      console.log('[firebaseAuthService] Triggering GoogleSignin.signIn prompt...');
      const userInfo = await GoogleSignin.signIn();
      const googleUser = userInfo.data?.user || (userInfo as any).user;
      console.log('[firebaseAuthService] GoogleSignin.signIn returned user info for:', googleUser?.email || googleUser?.name);
      
      console.log('[firebaseAuthService] Fetching Google OAuth tokens...');
      const { idToken, accessToken } = await GoogleSignin.getTokens();
      console.log('[firebaseAuthService] Retrieved tokens from Google SDK:', {
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
      });

      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID Token returned');
      }

      console.log('[firebaseAuthService] Signing in to Firebase with Google credential...');
      const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      console.log('[firebaseAuthService] Firebase signInWithCredential succeeded for uid:', userCredential.user?.uid);

      console.log('[firebaseAuthService] Getting Firebase ID token...');
      const fbIdToken = await userCredential.user.getIdToken(false);

      console.log('[firebaseAuthService] Calling syncSupabaseAuth for Google user...');
      await syncSupabaseAuth(fbIdToken);
      console.log('[firebaseAuthService] syncSupabaseAuth complete for Google user!');

      const user = mapFirebaseUser(userCredential.user);
      return { user, session: user ? { user } : null };
    } catch (err: any) {
      logger.error('[firebaseAuthService] signInWithGoogle error:', err);
      throw this.mapAuthError(err);
    }
  },

  async signOut() {
    try {
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
    } finally {
      await setSupabaseToken(null);
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
      const idToken = await user.getIdToken(false);
      await syncSupabaseAuth(idToken);
    } catch (error: any) {
      logger.error('[firebaseAuthService] updateProfile error:', error);
      throw this.mapAuthError(error);
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const unsubscribe = auth().onIdTokenChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(false);
          await syncSupabaseAuth(idToken);
        } catch (err) {
          logger.error('[firebaseAuthService] onIdTokenChanged failed to sync Supabase:', err);
        }
        const user = mapFirebaseUser(firebaseUser);
        callback('SIGNED_IN', { user });
      } else {
        await setSupabaseToken(null);
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
    };

    if (code && errorMap[code]) {
      return new Error(errorMap[code]);
    }

    return new Error(message);
  },
};
