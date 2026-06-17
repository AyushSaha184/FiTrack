import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { ExercisePicker } from '../../components/workout/ExercisePicker';
import { CustomAlert } from '../../components/common/CustomAlert';
import { Modal } from '../../components/common/Modal';
import { Logo } from '../../components/common/Logo';
import { useWorkout, useColors, useSettingsStore } from '../../hooks';
import { spacing, typography, radius } from '../../theme';
import { getWeekDates, getDayOfWeekKey, storage, dateKey } from '../../utils/helpers';
import type { DayOfWeek, WorkoutType } from '../../models';
import type { ExerciseItem } from '../../utils/exerciseData';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ROUTINE_OPTIONS: { type: WorkoutType; label: string }[] = [
  { type: 'push', label: 'Push Day' },
  { type: 'pull', label: 'Pull Day' },
  { type: 'legs', label: 'Leg Day' },
  { type: 'upper', label: 'Upper Body' },
  { type: 'fullbody', label: 'Full Body' },
  { type: 'cardio', label: 'Cardio' },
];

export const WorkoutScreen = () => {
  const colors = useColors();
  const navigation = useNavigation();
  const {
    activeWorkout,
    activeWorkoutExercises,
    totalVolume,
    selectedDay,
    selectedDate,
    addSet,
    updateSet,
    toggleSetComplete,
    removeSet,
    removeExercise,
    addExercise,
    startWorkout,
    setDay,
    resetWorkoutRoutine,
    completeWorkout,
    cancelWorkout,
  } = useWorkout();
  const weightUnit = useSettingsStore().units.weight;

  const weekDates = getWeekDates();
  const today = new Date();

  // Rest day storage persistence
  const [restDays, setRestDays] = useState<Record<string, boolean>>(() => {
    return storage.get<Record<string, boolean>>('workout.rest_days') || {};
  });
  const dateStr = dateKey(selectedDate);
  const isRestDay = !!restDays[dateStr];

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showRestDayAlert, setShowRestDayAlert] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showCompleteAlert, setShowCompleteAlert] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  // Live Timer State
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout || !activeWorkout.startTime) {
      setElapsed(0);
      return;
    }
    const start = new Date(activeWorkout.startTime).getTime();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setElapsed(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const fabScale = useSharedValue(1);

  // Handle date selection
  const handleDayPress = (date: Date, index: number) => {
    const dayKey = getDayOfWeekKey(date);
    setDay(dayKey, date);
  };

  // Get workout type label from active workout
  const getWorkoutTypeLabel = () => {
    if (activeWorkout) {
      return activeWorkout.name || 'Workout';
    }
    return 'Customize';
  };

  const handleStartWorkout = () => {
    if (isRestDay) return;
    setShowRoutineModal(true);
  };

  const handleSelectRoutine = async (type: WorkoutType) => {
    setShowRoutineModal(false);
    // Small delay to let modal close before starting workout
    await startWorkout(type);
  };

  const handleRestDay = () => {
    if (activeWorkout) {
      setShowRestDayAlert(true);
    } else {
      const newRestDays = { ...restDays, [dateStr]: true };
      setRestDays(newRestDays);
      storage.set('workout.rest_days', newRestDays);
    }
  };

  const handleCancelRestDay = () => {
    const newRestDays = { ...restDays, [dateStr]: false };
    setRestDays(newRestDays);
    storage.set('workout.rest_days', newRestDays);
  };

  const handleExerciseSelect = async (exercise: ExerciseItem) => {
    if (!activeWorkout) {
      // Start a custom workout first, then add exercise
      const workout = await startWorkout('custom' as WorkoutType);
      if (!workout) return;
    }
    addExercise(exercise.id, exercise.name, exercise.muscleGroup);
    setShowExercisePicker(false);
  };

  // Workout confirmation dialogs
  const handleCompleteWorkout = () => {
    setShowCompleteAlert(true);
  };

  const handleCancelWorkout = () => {
    setShowCancelAlert(true);
  };

  const handleConfirmRemoveExercise = (id: string, name?: string) => {
    setExerciseToRemove({ id, name: name || 'Exercise' });
    setShowRemoveAlert(true);
  };

  const handleResetWeek = () => {
    setShowResetAlert(true);
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedScreen>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo size="medium" />
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('Settings')}
              style={[styles.settingsButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="3" />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Title Row with Reset Week Button */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Today's Workout</Text>
            <TouchableOpacity onPress={handleResetWeek} style={[styles.resetButton, { borderColor: colors.cardBorder }]} activeOpacity={0.7}>
              <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                Reset Week
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weekly Calendar */}
          <AnimatedCard index={0} style={styles.calendarCard}>
            <View style={styles.weekCalendar}>
              {weekDates.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayItem,
                      isSelected && [
                        styles.dayItemSelected,
                        { backgroundColor: 'rgba(255,255,255,0.12)' },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleDayPress(date, index)}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: isSelected ? colors.text : colors.textMuted },
                      ]}
                    >
                      {DAY_LABELS[index]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AnimatedCard>

          {/* Workout Type Pills */}
          <AnimatedCard index={1} padding="none" style={styles.typePillsCard}>
            <View style={styles.typePills}>
              <TouchableOpacity
                style={[
                  styles.pill,
                  !isRestDay && styles.pillActive,
                  {
                    backgroundColor: !isRestDay
                      ? 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  if (isRestDay) {
                    handleCancelRestDay();
                  }
                  // Only open routine modal if there's no active workout
                  if (!activeWorkout) {
                    setShowRoutineModal(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: !isRestDay ? colors.text : colors.textMuted },
                  ]}
                >
                  {getWorkoutTypeLabel()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pill,
                  isRestDay && styles.pillActive,
                  {
                    backgroundColor: isRestDay
                      ? 'rgba(255,255,255,0.9)'
                      : 'transparent',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={handleRestDay}
                activeOpacity={0.7}
              >
                <Text style={styles.pillIcon}>☕</Text>
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isRestDay ? '#000000' : colors.textMuted,
                    },
                  ]}
                >
                  Rest Day
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Rest Day View */}
          {isRestDay ? (
            <AnimatedCard index={2} style={styles.restDayCard}>
              <Text style={styles.restDayEmoji}>😴</Text>
              <Text style={[styles.restDayTitle, { color: colors.text }]}>
                Rest Day
              </Text>
              <Text style={[styles.restDaySubtitle, { color: colors.textSecondary }]}>
                Take it easy today. Recovery is just as{'\n'}important as training.
              </Text>
              <View style={styles.restDayTips}>
                {[
                  { icon: '💧', text: 'Stay hydrated' },
                  { icon: '🧘', text: 'Light stretching' },
                  { icon: '😴', text: 'Get quality sleep' },
                  { icon: '🥗', text: 'Eat nutritious food' },
                ].map((tip, i) => (
                  <View key={i} style={styles.restTipRow}>
                    <Text style={styles.restTipIcon}>{tip.icon}</Text>
                    <Text style={[styles.restTipText, { color: colors.textSecondary }]}>
                      {tip.text}
                    </Text>
                  </View>
                ))}
              </View>
            </AnimatedCard>
          ) : activeWorkout ? (
            /* Active Workout Exercise List & Timer */
            <View>
              <AnimatedCard index={2} style={styles.timerCard}>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
                  WORKOUT TIMER
                </Text>
                <Text style={[styles.timerValue, { color: colors.text }]}>
                  {formatTimer(elapsed)}
                </Text>
                <View style={styles.timerActions}>
                  <TouchableOpacity
                    style={[styles.timerBtn, { borderColor: colors.cardBorder, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                    onPress={handleCancelWorkout}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timerBtnText, { color: colors.error }]}>Discard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timerBtn, { borderColor: colors.cardBorder, backgroundColor: colors.text }]}
                    onPress={handleCompleteWorkout}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timerBtnText, { color: colors.background }]}>Complete</Text>
                  </TouchableOpacity>
                </View>
              </AnimatedCard>

              <View style={styles.exercisesSection}>
                {activeWorkoutExercises.map((exercise, index) => (
                  <Animated.View
                    key={exercise.id}
                    entering={FadeInDown.delay(index * 80).springify().damping(18)}
                  >
                    <ExerciseCard
                      exercise={exercise}
                      weightUnit={weightUnit}
                      onAddSet={() => addSet(exercise.id)}
                      onUpdateSet={(setId, updates) =>
                        updateSet(exercise.id, setId, updates)
                      }
                      onToggleSetComplete={(setId) =>
                        toggleSetComplete(exercise.id, setId)
                      }
                      onRemoveSet={(setId) => removeSet(exercise.id, setId)}
                      onRemoveExercise={() => handleConfirmRemoveExercise(exercise.id, exercise.exercise?.name)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : (
            <AnimatedCard index={2} style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Ready to train?
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Start your workout or add exercises
              </Text>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 }]}
                onPress={handleStartWorkout}
                activeOpacity={0.8}
              >
                <Text style={[styles.startButtonText, { color: colors.text }]}>
                  Start Workout
                </Text>
              </TouchableOpacity>
            </AnimatedCard>
          )}

          {/* Bottom spacer for FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Add Exercise Button */}
        {!isRestDay && (
          <AnimatedTouchable
            style={[styles.fab, fabAnimatedStyle]}
            onPress={() => setShowExercisePicker(true)}
            onPressIn={() => {
              fabScale.value = withTiming(0.95, { duration: 120 });
            }}
            onPressOut={() => {
              fabScale.value = withTiming(1, { duration: 120 });
            }}
            activeOpacity={0.9}
          >
            <Text style={[styles.fabIcon, { color: colors.text }]}>+</Text>
            <Text style={[styles.fabText, { color: colors.text }]}>Add Exercise</Text>
          </AnimatedTouchable>
        )}
      </AnimatedScreen>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={handleExerciseSelect}
      />

      <Modal
        visible={showRoutineModal}
        onClose={() => setShowRoutineModal(false)}
        title="Select Routine"
        sheet
      >
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Choose a workout routine to start today:
          </Text>
          <View style={styles.routineGrid}>
            {ROUTINE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.routineItem,
                  {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => handleSelectRoutine(item.type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.routineLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Modal>

      <CustomAlert
        visible={showRestDayAlert}
        onClose={() => setShowRestDayAlert(false)}
        title="Switch to Rest Day?"
        message="You have an active workout. Marking today as a rest day will keep your workout saved."
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowRestDayAlert(false) },
          {
            text: 'Rest Day',
            onPress: () => {
              setShowRestDayAlert(false);
              const newRestDays = { ...restDays, [dateStr]: true };
              setRestDays(newRestDays);
              storage.set('workout.rest_days', newRestDays);
            },
          },
        ]}
      />

      <CustomAlert
        visible={showRemoveAlert}
        onClose={() => setShowRemoveAlert(false)}
        title="Delete Exercise?"
        message={`Are you sure you want to delete ${exerciseToRemove?.name} from this workout?`}
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowRemoveAlert(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (exerciseToRemove) {
                removeExercise(exerciseToRemove.id);
              }
              setShowRemoveAlert(false);
            },
          },
        ]}
      />

      <CustomAlert
        visible={showCancelAlert}
        onClose={() => setShowCancelAlert(false)}
        title="Discard Workout?"
        message="Are you sure you want to discard this workout? All progress will be deleted."
        actions={[
          { text: 'No', style: 'cancel', onPress: () => setShowCancelAlert(false) },
          {
            text: 'Yes, Discard',
            style: 'destructive',
            onPress: async () => {
              await cancelWorkout();
              setShowCancelAlert(false);
            },
          },
        ]}
      />

      <CustomAlert
        visible={showCompleteAlert}
        onClose={() => setShowCompleteAlert(false)}
        title="Finish Workout"
        message="Are you sure you want to end this workout?"
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowCompleteAlert(false) },
          {
            text: 'Finish',
            onPress: async () => {
              await completeWorkout();
              setShowCompleteAlert(false);
            },
          },
        ]}
      />

      <CustomAlert
        visible={showResetAlert}
        onClose={() => setShowResetAlert(false)}
        title="Done with your workout?"
        message="Do you want to reset your progress for next week? This resets weights and reps but keeps exercises."
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowResetAlert(false) },
          {
            text: 'Reset Routine',
            style: 'destructive',
            onPress: () => {
              resetWorkoutRoutine();
              setShowResetAlert(false);
            },
          },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  settingsIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  calendarCard: {
    marginBottom: spacing.base,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 40,
  },
  dayItemSelected: {
    borderRadius: radius.md,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
  },
  typePillsCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  typePills: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  pillActive: {},
  pillIcon: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Rest Day styles
  restDayCard: {
    marginTop: spacing.base,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  restDayEmoji: {
    fontSize: 60,
    marginBottom: spacing.lg,
  },
  restDayTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  restDaySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  restDayTips: {
    width: '100%',
    marginTop: spacing.base,
  },
  restTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  restTipIcon: {
    fontSize: 20,
  },
  restTipText: {
    fontSize: 16,
  },
  // Exercise section
  exercisesSection: {
    marginTop: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.base,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 16,
    marginBottom: spacing.xl,
  },
  startButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resetButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.base,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.lg,
  },
  timerActions: {
    flexDirection: 'row',
    gap: spacing.base,
    width: '100%',
  },
  timerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  timerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 320,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  routineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  routineItem: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routineIcon: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  routineLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});