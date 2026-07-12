import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { useAuth, useColors } from '../../hooks';
import { spacing, typography, radius } from '../../theme';
import { signupSchema } from '../../utils/validators';
import type { AuthStackParamList } from '../../types/navigation';
import { logger } from '../../utils/logger';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

// Custom premium SVG icons
const BackIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const PersonIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

const MailIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
);

const LockIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" />
  </Svg>
);

const EyeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx={12} cy={12} r={3} />
  </Svg>
);

const GoogleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </Svg>
);

export const SignupScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<NavigationProp>();
  const { signup, socialLogin, isLoading, isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState(false);

  const mapAuthError = (e: any): string => {
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
      return 'An account with this email already exists.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return "Can't connect. Check your internet connection.";
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return 'Too many attempts. Try again shortly.';
    }
    if (msg.includes('google')) {
      return 'Google sign-in failed. Please try again.';
    }
    return e?.message || 'Something went wrong. Please try again.';
  };

  const handleSignup = async () => {
    console.log('[SignupScreen] handleSignup triggered with:', { name, email });
    const normalizedEmail = email.trim().toLowerCase();
    const result = signupSchema.safeParse({ name, email: normalizedEmail, password });
    if (!result.success) {
      console.log('[SignupScreen] Validation failed:', result.error.errors);
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    try {
      console.log('[SignupScreen] Calling signup function...');
      await signup(result.data);
      console.log('[SignupScreen] Signup completed successfully');
      if (!isAuthenticated) {
        navigation.navigate('Login');
      }
    } catch (e: any) {
      logger.error('[SignupScreen] Signup caught error:', e);
      const signupError = e?.message?.toLowerCase().includes('already')
        ? 'An account with this email already exists.'
        : mapAuthError(e);
      setErrors({ email: signupError });
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    setErrors({});
    try {
      await socialLogin('google');
    } catch (e: any) {
      logger.error('[SignupScreen] Google login error:', e);
      const googleError = e?.message?.toLowerCase().includes('cancel')
        ? 'Google sign-in was cancelled.'
        : mapAuthError(e);
      setErrors({ general: googleError });
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Navigation Arrow */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <BackIcon color="#FFFFFF" />
          </TouchableOpacity>

          {/* Left-aligned Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#FFFFFF' }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.6)' }]}>
              Join FiTrack and start your fitness journey.
            </Text>
          </View>

          {/* Credentials Card */}
          <View style={styles.form}>
            {/* General Error Banner */}
            {errors.general ? (
              <View style={[styles.generalErrorBanner, { backgroundColor: 'rgba(255,80,80,0.1)', borderColor: colors.error }]}>
                <Text style={[styles.generalErrorText, { color: colors.error }]}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={[styles.inputCard, { borderColor: '#1F1F1F', backgroundColor: '#0A0A0C' }]}>
              {/* Full Name */}
              <View style={styles.inputRow}>
                <View style={styles.iconContainer}>
                  <PersonIcon color="rgba(255,255,255,0.4)" />
                </View>
                <TextInput
                  style={[styles.textInput, { color: '#FFFFFF' }]}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={name}
                  onChangeText={(text) => { setName(text); setErrors((prev) => { const { general, ...rest } = prev; return rest; }); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: '#1F1F1F' }]} />

              {/* Email Address */}
              <View style={styles.inputRow}>
                <View style={styles.iconContainer}>
                  <MailIcon color="rgba(255,255,255,0.4)" />
                </View>
                <TextInput
                  style={[styles.textInput, { color: '#FFFFFF' }]}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrors((prev) => { const { general, ...rest } = prev; return rest; }); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: '#1F1F1F' }]} />

              {/* Password */}
              <View style={styles.inputRow}>
                <View style={styles.iconContainer}>
                  <LockIcon color="rgba(255,255,255,0.4)" />
                </View>
                <TextInput
                  style={[styles.textInput, { color: '#FFFFFF' }]}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrors((prev) => { const { general, ...rest } = prev; return rest; }); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <EyeIcon color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Validation Warnings */}
            {errors.name ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>
            ) : null}
            {errors.email ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
            ) : null}
            {errors.password ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>
            ) : null}

            {/* Instruction description */}
            <Text style={styles.instructionText}>
              Password must be at least 8 characters and include a number, a letter, and a special character.
            </Text>

            {/* Create Account button - Solid White, Black Text */}
            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={isLoading}
              fullWidth
              size="large"
              style={StyleSheet.flatten([styles.submitButton, { backgroundColor: '#FFFFFF' }])}
              textStyle={{ color: '#000000', fontWeight: '700' }}
            />

            {/* or Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: '#1F1F1F' }]} />
              <Text style={[styles.dividerText, { color: 'rgba(255,255,255,0.4)' }]}>or</Text>
              <View style={[styles.line, { backgroundColor: '#1F1F1F' }]} />
            </View>

            {/* Google Signup Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                { borderColor: '#1F1F1F', backgroundColor: '#000000', opacity: socialLoading ? 0.6 : 1 },
              ]}
              onPress={handleGoogleLogin}
              disabled={socialLoading || isLoading}
              activeOpacity={0.8}
            >
              {socialLoading ? (
                <Text style={[styles.googleButtonText, { color: '#FFFFFF' }]}>Signing in...</Text>
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={[styles.googleButtonText, { color: '#FFFFFF' }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Footer navigation */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.6)' }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: '#FFFFFF' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginLeft: -8,
  },
  header: {
    marginTop: 24,
    marginBottom: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 58,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0,
  },
  divider: {
    height: 1,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 8,
  },
  generalErrorBanner: {
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  generalErrorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  submitButton: {
    borderRadius: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 56,
    gap: 12,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});