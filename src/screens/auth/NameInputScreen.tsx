import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../hooks';
import { spacing, radius } from '../../theme';
import Svg, { Path, Circle } from 'react-native-svg';

const PersonIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

export const NameInputScreen = () => {
  const { user, setUserName, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setError('');
    try {
      await setUserName(name.trim());
    } catch (e: any) {
      setError(e.message || 'Failed to update name');
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
          <View style={styles.header}>
            <Logo size="large" />
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { color: '#FFFFFF' }]}>
              Welcome!
            </Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.6)' }]}>
              Please enter your name to continue
            </Text>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(255,80,80,0.1)', borderColor: '#FF453A' }]}>
                <Text style={[styles.errorText, { color: '#FF453A' }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.inputCard, { borderColor: '#1F1F1F', backgroundColor: '#0A0A0C' }]}>
              <View style={styles.inputRow}>
                <View style={styles.iconContainer}>
                  <PersonIcon color="rgba(255,255,255,0.4)" />
                </View>
                <TextInput
                  style={[styles.textInput, { color: '#FFFFFF' }]}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={name}
                  onChangeText={(text) => { setName(text); setError(''); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={isLoading}
              fullWidth
              size="large"
              style={StyleSheet.flatten([styles.submitButton, { backgroundColor: '#FFFFFF' }])}
              textStyle={{ color: '#000000', fontWeight: '700' }}
            />
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
    justifyContent: 'center',
  },
  header: {
    marginTop: 64,
    marginBottom: 48,
    alignItems: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
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
  errorBanner: {
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 8,
    marginTop: 8,
  },
});
