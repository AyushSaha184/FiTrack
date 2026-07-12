import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, useSettingsStore, useWeightStore, useStepsStore, useAuthStore } from '../../hooks';
import { Button } from '../../components/common/Button';
import { spacing, typography, radius } from '../../theme';
import { logger } from '../../utils/logger';
import Svg, { Path, Rect } from 'react-native-svg';

// Custom premium Scale SVG Icon for metrics header
const ScaleIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2}>
    <Path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <Path d="M8 7h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
    <Path d="M12 11v-3" strokeWidth={2} />
  </Svg>
);

export const MetricSelectionScreen = () => {
  const colors = useColors();
  const settingsStore = useSettingsStore();
  const weightStore = useWeightStore();
  const stepsStore = useStepsStore();
  const authStore = useAuthStore();

  // Selected system of measurement
  const [selectedSystem, setSelectedSystem] = useState<'metric' | 'imperial'>('metric');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Save units to SettingsStore
      const weightUnit = selectedSystem === 'metric' ? 'kg' : 'lbs';
      const heightUnit = selectedSystem === 'metric' ? 'cm' : 'ft';

      settingsStore.setUnits({
        weight: weightUnit,
        height: heightUnit,
        temperature: 'celsius',
      });

      // Save goal weight if input is valid
      if (weightUnit === 'kg') {
        weightStore.setGoalWeight(75); // default kg weight goal
      } else {
        weightStore.setGoalWeight(165); // default lbs weight goal
      }

      // Save daily steps goal
      stepsStore.setDailyGoal(10000);

      // Finalize onboarding in database
      await authStore.completeOnboarding();
    } catch (error) {
      logger.error('Failed to save metrics:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scale Icon inside Circular Container */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <ScaleIcon />
          </View>
        </View>

        {/* Header Title & Subtitle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Choose Your Metrics</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.6)' }]}>
            Select your preferred units of measurement. You can change this anytime in settings.
          </Text>
        </View>

        {/* Selection Card Container */}
        <View style={[styles.card, { borderColor: '#1F1F1F', backgroundColor: '#0A0A0C' }]}>
          {/* Kilograms (kg) Metric System Option */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSelectedSystem('metric')}
            activeOpacity={0.8}
          >
            {/* Custom Radio Button */}
            <View style={styles.radioContainer}>
              {selectedSystem === 'metric' ? (
                <View style={styles.radioSelectedOuter}>
                  <View style={styles.radioSelectedInner} />
                </View>
              ) : (
                <View style={styles.radioUnselected} />
              )}
            </View>

            {/* Label and description */}
            <View style={styles.labelContainer}>
              <Text style={[styles.optionTitle, { color: '#FFFFFF' }]}>Kilograms (kg)</Text>
              <Text style={[styles.optionDesc, { color: 'rgba(255,255,255,0.4)' }]}>
                Weight in kilograms, height in centimeters
              </Text>
            </View>

            {/* Unit Badge */}
            <View style={styles.badgeContainer}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>kg</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: '#1F1F1F' }]} />

          {/* Pounds (lbs) Imperial System Option */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSelectedSystem('imperial')}
            activeOpacity={0.8}
          >
            {/* Custom Radio Button */}
            <View style={styles.radioContainer}>
              {selectedSystem === 'imperial' ? (
                <View style={styles.radioSelectedOuter}>
                  <View style={styles.radioSelectedInner} />
                </View>
              ) : (
                <View style={styles.radioUnselected} />
              )}
            </View>

            {/* Label and description */}
            <View style={styles.labelContainer}>
              <Text style={[styles.optionTitle, { color: '#FFFFFF' }]}>Pounds (lbs)</Text>
              <Text style={[styles.optionDesc, { color: 'rgba(255,255,255,0.4)' }]}>
                Weight in pounds, height in feet & inches
              </Text>
            </View>

            {/* Unit Badge */}
            <View style={styles.badgeContainer}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>lbs</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Action Button - Solid White, Black Text */}
        <Button
          title="Continue"
          onPress={handleSave}
          loading={isSubmitting}
          fullWidth
          size="large"
          style={StyleSheet.flatten([styles.submitButton, { backgroundColor: '#FFFFFF' }])}
          textStyle={{ color: '#000000', fontWeight: '700' }}
        />
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    backgroundColor: '#0A0A0C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 48,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  radioContainer: {
    marginRight: 16,
  },
  radioSelectedOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelectedInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgeContainer: {
    width: 44,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  submitButton: {
    height: 56,
    paddingVertical: 0,
    borderRadius: 8,
    marginBottom: 24,
  },
});
