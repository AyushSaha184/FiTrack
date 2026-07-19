import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth, useColors } from '../../hooks';
import { spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<NavigationProp>();
  const { resetPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      await resetPassword(normalizedEmail);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {sent ? 'Check Your Email' : 'Reset Password'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {sent
              ? `We sent a password reset link to ${email}`
              : "Enter your email and we'll send you a reset link"}
          </Text>
        </View>

        {!sent && (
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />

            <Button
              title="Send Reset Link"
              onPress={handleReset}
              loading={isLoading}
              fullWidth
              size="large"
              style={styles.submitButton}
            />
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.text, textDecorationLine: 'underline' }]}>
              {sent ? 'Back to Sign In' : 'Back to Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.base,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: 'auto',
  },
  backText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});