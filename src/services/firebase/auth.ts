import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { User } from '../../models';
import type { LoginInput, SignupInput } from '../../utils/validators';
import { ENV } from '../../config/env';

GoogleSignin.configure({
  webClientId: ENV.FIREBASE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export const firebaseAuthService = {
  async getSession() {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return { session: null, user: null };
    }

    const idToken = await currentUser.getIdToken();
    return {
      session: {
        user: currentUser,
        access_token: idToken,
        refresh_token: await currentUser.getIdToken(true),
      },
      user: currentUser,
    };
  },

  async getUser() {
    const currentUser = auth().currentUser;
    return { user: currentUser };
  },

  async login({ email, password }: LoginInput) {
    console.log('[firebaseAuthService] login beginning with email:', email);
    try {
      const credential = await auth().signInWithEmailAndPassword(email, password);
      console.log('[firebaseAuthService] signInWithEmailAndPassword succeeded');
      return {
        user: credential.user,
        session: {
          user: credential.user,
          access_token: await credential.user.getIdToken(),
          refresh_token: await credential.user.getIdToken(true),
        },
      };
    } catch (err: any) {
      console.error('[firebaseAuthService] login error:', err);
      throw this.mapAuthError(err);
    }
  },

  async signup({ email, password, name }: SignupInput) {
    console.log('[firebaseAuthService] signup beginning with email:', email);
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      console.log('[firebaseAuthService] createUserWithEmailAndPassword succeeded');

      await credential.user.updateProfile({
        displayName: name,
      });

      await firestore().collection('users').doc(credential.user.uid).set({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name,
        createdAt: firestore.FieldValue.serverTimestamp(),
        onboardingCompleted: false,
      });

      return {
        user: credential.user,
        session: {
          user: credential.user,
          access_token: await credential.user.getIdToken(),
          refresh_token: await credential.user.getIdToken(true),
        },
      };
    } catch (err: any) {
      console.error('[firebaseAuthService] signup error:', err);
      throw this.mapAuthError(err);
    }
  },

  async signInWithGoogle() {
    console.log('[firebaseAuthService] signInWithGoogle beginning');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID Token returned');
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const credential = await auth().signInWithCredential(googleCredential);

      const userDoc = await firestore().collection('users').doc(credential.user.uid).get();
      if (!userDoc.exists) {
        await firestore().collection('users').doc(credential.user.uid).set({
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName,
          photoURL: credential.user.photoURL,
          createdAt: firestore.FieldValue.serverTimestamp(),
          onboardingCompleted: false,
        });
      }

      return {
        user: credential.user,
        session: {
          user: credential.user,
          access_token: await credential.user.getIdToken(),
          refresh_token: await credential.user.getIdToken(true),
        },
      };
    } catch (err: any) {
      console.error('[firebaseAuthService] signInWithGoogle error:', err);
      throw this.mapAuthError(err);
    }
  },

  async signOut() {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
    } catch (err: any) {
      console.error('[firebaseAuthService] signOut error:', err);
      throw err;
    }
  },

  async resetPassword(email: string) {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (err: any) {
      console.error('[firebaseAuthService] resetPassword error:', err);
      throw this.mapAuthError(err);
    }
  },

  async updatePassword(newPassword: string) {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    try {
      await user.updatePassword(newPassword);
    } catch (err: any) {
      console.error('[firebaseAuthService] updatePassword error:', err);
      throw this.mapAuthError(err);
    }
  },

  async updateProfile(updates: { name?: string; email?: string; onboardingCompleted?: boolean }) {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const updatePromises: Promise<void>[] = [];

      if (updates.name) {
        updatePromises.push(user.updateProfile({ displayName: updates.name }));
      }

      if (updates.email) {
        updatePromises.push(user.updateEmail(updates.email));
      }

      if (updates.onboardingCompleted !== undefined) {
        updatePromises.push(
          firestore().collection('users').doc(user.uid).update({
            onboardingCompleted: updates.onboardingCompleted,
          }),
        );
      }

      await Promise.all(updatePromises);
    } catch (err: any) {
      console.error('[firebaseAuthService] updateProfile error:', err);
      throw this.mapAuthError(err);
    }
  },

  onAuthStateChange(callback: (nextUser: FirebaseAuthTypes.User | null) => void) {
    return auth().onAuthStateChanged(callback);
  },

  mapAuthError(err: any): Error {
    const code = err?.code || '';
    const message = err?.message || 'An error occurred';

    const errorMap: Record<string, string> = {
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/wrong-password': 'Invalid email or password.',
      'auth/user-not-found': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many attempts. Try again shortly.',
      'auth/network-request-failed': "Can't connect. Check your internet connection.",
      'auth/requires-recent-login': 'This operation is sensitive. Please log in again.',
    };

    return new Error(errorMap[code] || message);
  },
};