import React, { useState, useEffect } from 'react';
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
import { useColors, useSettingsStore, useWorkoutStore, useAuthStore, useRestTimer, useStopwatch } from '../../hooks';
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
  const navigation = useNavigation<any>();
  const workoutStore = useWorkoutStore();
  const authStore = useAuthStore();
  const restTimer = useRestTimer();
  const stopwatch = useStopwatch();
  
  // Store references
  const activeWorkout = workoutStore.activeWorkout;
  const activeWorkoutExercises = workoutStore.activeWorkoutExercises;
  const totalVolume = workoutStore.totalVolume;
  
  // Local state for day selection (React needs local state to re-render)
  const [selectedDate, setSelectedDate] = useState<Date>(workoutStore.selectedDate);
  const selectedDay = workoutStore.selectedDay;
  const weightUnit = useSettingsStore().units.weight;

  const weekDates = getWeekDates();
  const today = new Date();

  // Rest day storage persistence
  const [restDays, setRestDays] = useState<Record<string, boolean>>(() => {
    return storage.get<Record<string, boolean>>('workout.rest_days') || {};
  });

  // Planned routines storage persistence
  const [plannedRoutines, setPlannedRoutines] = useState<Record<string, WorkoutType>>(() => {
    return storage.get<Record<string, WorkoutType>>('workout.planned_routines') || {};
  });
  const dateStr = dateKey(selectedDate);
  const isRestDay = !!restDays[dateStr];

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showRestDayAlert, setShowRestDayAlert] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showStopwatchDialog, setShowStopwatchDialog] = useState(false);

  const fabScale = useSharedValue(1);

  // Handle date selection
  const handleDayPress = (date: Date) => {
    const dayKey = getDayOfWeekKey(date);
    workoutStore.switchDay(dayKey, date);
    setSelectedDate(date);
  };

  // Get workout type label
  const getWorkoutTypeLabel = () => {
    if (plannedRoutines[dateStr]) {
      const planned = ROUTINE_OPTIONS.find(opt => opt.type === plannedRoutines[dateStr]);
      return planned ? planned.label : 'Customise';
    }
    return 'Customise';
  };

  const handleSelectRoutine = (type: WorkoutType) => {
    setShowRoutineModal(false);
    const newPlannedRoutines = { ...plannedRoutines, [dateStr]: type };
    setPlannedRoutines(newPlannedRoutines);
    storage.set('workout.planned_routines', newPlannedRoutines);
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

  const handleExerciseSelect = (exercise: ExerciseItem) => {
    workoutStore.addExercise(exercise.id, exercise.name, exercise.muscleGroup, exercise.equipment);
    setShowExercisePicker(false);
  };

  const handleConfirmRemoveExercise = (id: string, name?: string) => {
    setExerciseToRemove({ id, name: name || 'this exercise' });
    setShowRemoveAlert(true);
  };

  const handleResetWeek = () => {
    setShowResetAlert(true);
  };

  // Stopwatch button handler - toggles start/stop and shows dialog when running
  const handleStopwatchPress = () => {
    if (stopwatch.isRunning) {
      stopwatch.stop();
      setShowStopwatchDialog(true);
    } else {
      stopwatch.start();
    }
  };

  const handleStopwatchDialogClose = () => {
    setShowStopwatchDialog(false);
  };

  const handleStopwatchReset = () => {
    stopwatch.reset();
    setShowStopwatchDialog(false);
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
            <View style={styles.headerLeft}>
              <Logo size="medium" />
              {workoutStore.isSyncing && (
                <View style={[styles.syncIndicator, { backgroundColor: colors.primary }]}>
                  <Text style={styles.syncIndicatorText}>✓</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'Settings' })}
              style={[styles.settingsButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="3" />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
                    onPress={() => handleDayPress(date)}
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

          {/* Workout Type Pills with Stopwatch Button */}
          <AnimatedCard index={1} padding="none" style={styles.typePillsCard}>
            <View style={styles.typePillsWithTimer}>
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
                    setShowRoutineModal(true);
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

              {/* Stopwatch Button */}
              <TouchableOpacity
                style={[
                  styles.stopwatchButton,
                  {
                    backgroundColor: stopwatch.isRunning ? colors.primary : 'rgba(255,255,255,0.08)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={handleStopwatchPress}
                activeOpacity={0.7}
              >
                <Text style={styles.stopwatchIcon}>⏱</Text>
                <Text style={[styles.stopwatchText, { color: colors.text }]}>
                  {stopwatch.getFormattedTime()}
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
            /* Active Workout Exercise List */
            <View>
              {/* Rest Timer Banner */}
              {restTimer.isVisible && restTimer.isActive && (
                <AnimatedCard index={1} style={[styles.restTimerCard, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
                  <View style={styles.restTimerContent}>
                    <Text style={[styles.restTimerLabel, { color: colors.warning }]}>REST</Text>
                    <Text style={[styles.restTimerTime, { color: colors.text }]}>
                      {Math.floor(restTimer.timeRemaining / 60)}:{(restTimer.timeRemaining % 60).toString().padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.restTimerDismiss, { borderColor: colors.warning }]}
                      onPress={restTimer.dismissTimer}
                    >
                      <Text style={[styles.restTimerDismissText, { color: colors.warning }]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </AnimatedCard>
              )}

              <View style={styles.exercisesSection}>
                {activeWorkoutExercises.map((exercise, index) => (
                  <Animated.View
                    key={exercise.id}
                    entering={FadeInDown.delay(index * 80).springify().damping(18)}
                  >
                    <ExerciseCard
                      exercise={exercise}
                      weightUnit={weightUnit}
                      onAddSet={() => workoutStore.addSet(exercise.id)}
                      onUpdateSet={(setId, updates) =>
                        workoutStore.updateSet(exercise.id, setId, updates)
                      }
                      onToggleSetComplete={(setId) =>
                        workoutStore.toggleSetComplete(exercise.id, setId)
                      }
                      onRemoveSet={(setId) => workoutStore.removeSet(exercise.id, setId)}
                      onRemoveExercise={() => handleConfirmRemoveExercise(exercise.id, exercise.exercise?.name)}
                      onStartRest={() => restTimer.startTimer()}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : (
            <AnimatedCard index={2} style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Workout Planned
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap + below to add exercises to your workout
              </Text>
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
            Choose a workout routine for today:
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

      {/* Stopwatch Dialog */}
      <Modal
        visible={showStopwatchDialog}
        onClose={handleStopwatchDialogClose}
        title="Workout Timer"
        sheet
      >
        <View style={styles.stopwatchDialog}>
          <Text style={[styles.stopwatchDialogTime, { color: colors.text }]}>
            {stopwatch.getFormattedTime()}
          </Text>
          <View style={styles.stopwatchDialogStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Started</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stopwatch.startTime ? new Date(stopwatch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ended</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stopwatch.endTime ? new Date(stopwatch.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Running'}
              </Text>
            </View>
          </View>
          <View style={styles.stopwatchDialogActions}>
            <TouchableOpacity
              style={[styles.stopwatchDialogBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              onPress={handleStopwatchReset}
            >
              <Text style={[styles.stopwatchDialogBtnText, { color: colors.text }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stopwatchDialogBtn, { backgroundColor: colors.primary }]}
              onPress={handleStopwatchDialogClose}
            >
              <Text style={[styles.stopwatchDialogBtnText, { color: colors.background }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={showRestDayAlert}
        onClose={() => setShowRestDayAlert(false)}
        title="Switch to Rest Day?"
        message="You have an active workout. Marking today as a rest day will cancel your current workout."
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowRestDayAlert(false) },
          {
            text: 'Rest Day',
            onPress: async () => {
              setShowRestDayAlert(false);
              await workoutStore.cancelWorkout();
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
                workoutStore.removeExercise(exerciseToRemove.id);
              }
              setShowRemoveAlert(false);
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
              workoutStore.resetWorkoutRoutine();
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  syncIndicatorText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
  typePillsCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  typePillsWithTimer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
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
  stopwatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  stopwatchIcon: {
    fontSize: 16,
    lineHeight: 20,
    opacity: 0.9,
  },
  stopwatchText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
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
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  restTimerCard: {
    marginBottom: spacing.base,
    borderWidth: 1,
  },
  restTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  restTimerLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
  },
  restTimerTime: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  restTimerDismiss: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  restTimerDismissText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  routineGrid: {
    gap: spacing.sm,
  },
  routineItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  routineLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  stopwatchDialog: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  stopwatchDialogTime: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xl,
  },
  stopwatchDialogStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  stopwatchDialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  stopwatchDialogBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  stopwatchDialogBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});