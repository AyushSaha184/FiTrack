import { supabase } from './client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { LoginInput, SignupInput } from '../../utils/validators';
import { ENV } from '../../config/env';
import { logger } from '../../utils/logger';

GoogleSignin.configure({
  webClientId: ENV.FIREBASE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export const supabaseAuthService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('[supabaseAuthService] getSession error:', error);
    }
    return { session: data.session };
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      logger.error('[supabaseAuthService] getUser error:', error);
    }
    return { user: data.user };
  },

  async login({ email, password }: LoginInput) {
    console.log('[supabaseAuthService] login beginning with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logger.error('[supabaseAuthService] login error:', error);
      throw this.mapAuthError(error);
    }
    console.log('[supabaseAuthService] signInWithPassword succeeded');
    return { user: data.user, session: data.session };
  },

  async signup({ email, password, name }: SignupInput) {
    console.log('[supabaseAuthService] signup beginning with email:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
      },
    });
    if (error) {
      logger.error('[supabaseAuthService] signup error:', error);
      throw this.mapAuthError(error);
    }
    console.log('[supabaseAuthService] signUp succeeded');
    return { user: data.user, session: data.session };
  },

  async signInWithGoogle() {
    console.log('[supabaseAuthService] signInWithGoogle beginning');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID Token returned');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        logger.error('[supabaseAuthService] signInWithIdToken error:', error);
        throw this.mapAuthError(error);
      }

      console.log('[supabaseAuthService] signInWithIdToken succeeded');
      return { user: data.user, session: data.session };
    } catch (err: any) {
      logger.error('[supabaseAuthService] signInWithGoogle error:', err);
      if (err.message?.includes('Invalid login credentials') || err.code) {
        throw this.mapAuthError(err);
      }
      throw err;
    }
  },

  async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (_) {
      // Google sign-out may fail if user didn't sign in with Google; that's fine
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('[supabaseAuthService] signOut error:', error);
      throw error;
    }
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      logger.error('[supabaseAuthService] resetPassword error:', error);
      throw this.mapAuthError(error);
    }
  },

  async updateProfile(updates: { name?: string; email?: string; onboardingCompleted?: boolean }) {
    // Update Supabase Auth user_metadata
    const authUpdates: any = {};
    if (updates.name) {
      authUpdates.data = { ...authUpdates.data, name: updates.name, full_name: updates.name };
    }
    if (updates.email) {
      authUpdates.email = updates.email;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabase.auth.updateUser(authUpdates);
      if (error) {
        logger.error('[supabaseAuthService] updateUser error:', error);
        throw this.mapAuthError(error);
      }
    }

    // Update profiles table
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const profileUpdates: Record<string, any> = {};
      if (updates.name) profileUpdates.name = updates.name;
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.onboardingCompleted !== undefined) {
        profileUpdates.onboarding_completed = updates.onboardingCompleted;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userData.user.id);
        if (profileError) {
          logger.error('[supabaseAuthService] profiles update error:', profileError);
        }
      }
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription.unsubscribe;
  },

  mapAuthError(err: any): Error {
    const message = err?.message || 'An error occurred';
    const status = err?.status;

    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password.',
      'Email not confirmed': 'Please verify your email before logging in.',
      'User already registered': 'An account with this email already exists.',
      'Password should be at least 6 characters': 'Password is too weak.',
      'Unable to validate email address: invalid format': 'Invalid email address.',
      'Email rate limit exceeded': 'Too many attempts. Try again shortly.',
      'For security purposes, you can only request this after': 'Too many attempts. Try again shortly.',
    };

    for (const [key, mapped] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return new Error(mapped);
      }
    }

    if (status === 429) {
      return new Error('Too many attempts. Try again shortly.');
    }

    return new Error(message);
  },
};
