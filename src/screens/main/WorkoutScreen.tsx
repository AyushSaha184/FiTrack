import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { DraggableExerciseList } from '../../components/workout/DraggableExerciseList';
import { ExercisePicker } from '../../components/workout/ExercisePicker';
import { CustomAlert } from '../../components/common/CustomAlert';
import { Modal } from '../../components/common/Modal';
import { Logo } from '../../components/common/Logo';
import { StopwatchDisplay } from '../../components/workout/StopwatchDisplay';
import { RestTimerBanner, type RestTimerBannerHandle } from '../../components/workout/RestTimerBanner';
import { useColors, useSettingsStore, useWorkoutStore } from '../../hooks';
import { spacing, radius, responsive } from '../../theme';
import { getWeekDates, getDayOfWeekKey, storage, dateKey } from '../../utils/helpers';
import type { WorkoutType, Set } from '../../models';
import type { ExerciseItem } from '../../utils/exerciseData';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ROUTINE_OPTIONS: { type: WorkoutType; label: string }[] = [
  { type: 'push', label: 'Push Day' },
  { type: 'pull', label: 'Pull Day' },
  { type: 'legs', label: 'Leg Day' },
  { type: 'upper', label: 'Upper Body' },
  { type: 'fullbody', label: 'Full Body' },
  { type: 'cardio', label: 'Cardio' },
];

export const WorkoutScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const workoutStore = useWorkoutStore();
  const restTimerRef = useRef<RestTimerBannerHandle>(null);

  // Store references
  const activeWorkout = workoutStore.activeWorkout;
  const activeWorkoutExercises = workoutStore.activeWorkoutExercises;

  // Local state for day selection
  const [selectedDate, setSelectedDate] = useState<Date>(workoutStore.selectedDate);
  const selectedDay = workoutStore.selectedDay;
  const weightUnit = useSettingsStore().units.weight;

  // Memoize week dates to avoid allocating 7 Date objects on every render
  const weekDates = useMemo(() => getWeekDates(), []);

  // Live Firestore subscription: replaces the one-shot loadWorkouts() in
  // AuthStore.fetchUser. The store dedupes the underlying onSnapshot.
  useEffect(() => {
    const userId = workoutStore.userId;
    if (!userId) {
      return;
    }
    const unsubscribe = workoutStore.subscribeWorkouts(userId);
    return unsubscribe;
  }, [workoutStore]);

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

  const fabScale = useSharedValue(1);

  // Memoized handlers (list-performance-callbacks)
  const handleDayPress = useCallback((date: Date) => {
    const dayKey = getDayOfWeekKey(date);
    workoutStore.switchDay(dayKey, date);
    setSelectedDate(date);
  }, [workoutStore]);

  // Derived workout type label
  const workoutTypeLabel = useMemo(() => {
    if (plannedRoutines[dateStr]) {
      const planned = ROUTINE_OPTIONS.find(opt => opt.type === plannedRoutines[dateStr]);
      return planned ? planned.label : 'Customise';
    }
    return 'Customise';
  }, [plannedRoutines, dateStr]);

  const handleSelectRoutine = useCallback((type: WorkoutType) => {
    setShowRoutineModal(false);
    setPlannedRoutines((prev) => {
      const next = { ...prev, [dateStr]: type };
      storage.set('workout.planned_routines', next);
      return next;
    });
  }, [dateStr]);

  const handleRestDay = useCallback(() => {
    if (workoutStore.activeWorkout) {
      setShowRestDayAlert(true);
    } else {
      setRestDays((prev) => {
        const next = { ...prev, [dateStr]: true };
        storage.set('workout.rest_days', next);
        return next;
      });
    }
  }, [workoutStore.activeWorkout, dateStr]);

  const handleCancelRestDay = useCallback(() => {
    setRestDays((prev) => {
      const next = { ...prev, [dateStr]: false };
      storage.set('workout.rest_days', next);
      return next;
    });
  }, [dateStr]);

  const handleExerciseSelect = useCallback((exercise: ExerciseItem) => {
    workoutStore.addExercise(exercise.id, exercise.name, exercise.muscleGroup, exercise.equipment);
    setShowExercisePicker(false);
  }, [workoutStore]);

  const handleConfirmRemoveExercise = useCallback((id: string, name?: string) => {
    setExerciseToRemove({ id, name: name || 'this exercise' });
    setShowRemoveAlert(true);
  }, []);

  const handleResetWeek = useCallback(() => {
    setShowResetAlert(true);
  }, []);

  // DraggableExerciseList callback handlers (stable references)
  const handleAddSet = useCallback((exId: string) => {
    workoutStore.addSet(exId);
  }, [workoutStore]);

  const handleUpdateSet = useCallback((exId: string, setId: string, updates: Partial<Set>) => {
    workoutStore.updateSet(exId, setId, updates);
  }, [workoutStore]);

  const handleToggleSetComplete = useCallback((exId: string, setId: string) => {
    workoutStore.toggleSetComplete(exId, setId);
  }, [workoutStore]);

  const handleRemoveSet = useCallback((exId: string, setId: string) => {
    workoutStore.removeSet(exId, setId);
  }, [workoutStore]);

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    workoutStore.reorderExercises(fromIdx, toIdx);
  }, [workoutStore]);

  const handleStartRest = useCallback(() => {
    restTimerRef.current?.startTimer();
  }, []);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef<number>(0);
  const maxScrollYRef = useRef<number>(0);
  const viewportHeightRef = useRef<number>(0);

  // React Compiler compatible shared value reads (.get())
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.get() }],
  }));

  const handleFabPressIn = useCallback(() => {
    fabScale.set(withTiming(0.95, { duration: 120 }));
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    fabScale.set(withTiming(1, { duration: 120 }));
  }, [fabScale]);

  const handleOpenExercisePicker = useCallback(() => {
    setShowExercisePicker(true);
  }, []);

  const handleCloseExercisePicker = useCallback(() => {
    setShowExercisePicker(false);
  }, []);

  const handleCloseRoutineModal = useCallback(() => {
    setShowRoutineModal(false);
  }, []);

  const handleCloseRestDayAlert = useCallback(() => {
    setShowRestDayAlert(false);
  }, []);

  const handleCancelRestDayConfirm = useCallback(() => {
    setShowRestDayAlert(false);
  }, []);

  const handleSwitchToRestDay = useCallback(async () => {
    setShowRestDayAlert(false);
    storage.delete('workout.active.draft');
    storage.delete(`workout.draft.${selectedDay}`);
    workoutStore.activeWorkout = null;
    setRestDays((prev) => {
      const newRestDays = { ...prev, [dateStr]: true };
      storage.set('workout.rest_days', newRestDays);
      return newRestDays;
    });
  }, [dateStr, selectedDay, workoutStore]);

  const handleCloseRemoveAlert = useCallback(() => {
    setShowRemoveAlert(false);
  }, []);

  const handlePerformRemoveExercise = useCallback(() => {
    if (exerciseToRemove) {
      workoutStore.removeExercise(exerciseToRemove.id);
    }
    setShowRemoveAlert(false);
  }, [exerciseToRemove, workoutStore]);

  const handleCloseResetAlert = useCallback(() => {
    setShowResetAlert(false);
  }, []);

  const handleConfirmReset = useCallback(() => {
    workoutStore.resetWorkoutRoutine();
    setShowResetAlert(false);
  }, [workoutStore]);

  const restDayAlertActions = useMemo(
    () => [
      { text: 'Cancel', style: 'cancel' as const, onPress: handleCancelRestDayConfirm },
      { text: 'Rest Day', onPress: handleSwitchToRestDay },
    ],
    [handleCancelRestDayConfirm, handleSwitchToRestDay]
  );

  const removeExerciseAlertActions = useMemo(
    () => [
      { text: 'Cancel', style: 'cancel' as const, onPress: handleCloseRemoveAlert },
      { text: 'Delete', style: 'destructive' as const, onPress: handlePerformRemoveExercise },
    ],
    [handleCloseRemoveAlert, handlePerformRemoveExercise]
  );

  const resetAlertActions = useMemo(
    () => [
      { text: 'Cancel', style: 'cancel' as const, onPress: handleCloseResetAlert },
      { text: 'Reset Routine', style: 'destructive' as const, onPress: handleConfirmReset },
    ],
    [handleCloseResetAlert, handleConfirmReset]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedScreen>
        <ScrollView
          ref={scrollViewRef}
          onLayout={(e) => {
            viewportHeightRef.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_w, h) => {
            const vh = viewportHeightRef.current || 600;
            maxScrollYRef.current = Math.max(0, h - vh);
          }}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Logo size="medium" />
              {workoutStore.isSyncing ? (
                <View style={[styles.syncIndicator, { backgroundColor: colors.primary }]}>
                  <Text style={styles.syncIndicatorText}>✓</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={[styles.settingsButton, { backgroundColor: colors.cardSurface }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="3" />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Title Row with Reset Week and Progress Buttons */}
          <View style={styles.titleRow}>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ExerciseProgress' as any)}
                style={[styles.progressButton, { borderColor: colors.cardBorder }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.progressButtonText, { color: colors.textSecondary }]}>
                  Progress
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResetWeek} style={[styles.resetButton, { borderColor: colors.cardBorder }]} activeOpacity={0.7}>
                <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                  Reset Week
                </Text>
              </TouchableOpacity>
            </View>
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
                        { backgroundColor: colors.cardBorder },
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typePillsScrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.pill,
                    { borderColor: colors.cardBorder },
                    !isRestDay ? { backgroundColor: colors.cardSurface } : styles.pillInactive,
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
                    {workoutTypeLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pill,
                    { borderColor: colors.cardBorder },
                    isRestDay ? { backgroundColor: colors.text } : styles.pillInactive,
                  ]}
                  onPress={handleRestDay}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isRestDay ? colors.background : colors.textMuted },
                    ]}
                  >
                    Rest Day
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <StopwatchDisplay />
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
                Focus on recovery today.
              </Text>
            </AnimatedCard>
          ) : activeWorkout ? (
            /* Active Workout Exercise List */
            <View>
              <RestTimerBanner ref={restTimerRef} />

              <View style={styles.exercisesSection}>
                <DraggableExerciseList
                  exercises={activeWorkoutExercises}
                  weightUnit={weightUnit}
                  scrollViewRef={scrollViewRef}
                  scrollYRef={scrollYRef}
                  maxScrollYRef={maxScrollYRef}
                  onAddSet={handleAddSet}
                  onUpdateSet={handleUpdateSet}
                  onToggleSetComplete={handleToggleSetComplete}
                  onRemoveSet={handleRemoveSet}
                  onRemoveExercise={handleConfirmRemoveExercise}
                  onStartRest={handleStartRest}
                  onReorder={handleReorder}
                />
              </View>
            </View>
          ) : (
            <AnimatedCard index={2} style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Workout Planned
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap + Add to get started.
              </Text>
            </AnimatedCard>
          )}

          {/* Bottom spacer for FAB */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating Add Exercise Button (Pressable with animated shared value) */}
        {!isRestDay ? (
          <AnimatedPressable
            style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, fabAnimatedStyle]}
            onPress={handleOpenExercisePicker}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
          >
            <Text style={[styles.fabText, { color: colors.text }]}>Add</Text>
          </AnimatedPressable>
        ) : null}
      </AnimatedScreen>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={handleCloseExercisePicker}
        onSelectExercise={handleExerciseSelect}
      />

      <Modal
        visible={showRoutineModal}
        onClose={handleCloseRoutineModal}
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
                    backgroundColor: colors.cardSurface,
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
        onClose={handleCloseRestDayAlert}
        title="Switch to Rest Day?"
        message="You have an active workout. Marking today as a rest day will cancel your current workout."
        actions={restDayAlertActions}
      />

      <CustomAlert
        visible={showRemoveAlert}
        onClose={handleCloseRemoveAlert}
        title="Delete Exercise?"
        message={`Are you sure you want to delete ${exerciseToRemove?.name} from this workout?`}
        actions={removeExerciseAlertActions}
      />

      <CustomAlert
        visible={showResetAlert}
        onClose={handleCloseResetAlert}
        title="Done with your workout?"
        message="Do you want to reset your progress for next week? This resets weights and reps but keeps exercises."
        actions={resetAlertActions}
      />
    </SafeAreaView>
  );
});

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
    gap: spacing.xs,
  },
  typePillsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  pillActive: {},
  pillInactive: {
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: responsive.font(14),
    fontWeight: '500',
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
  bottomSpacer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 20,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  progressButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSubtitle: {
    fontSize: responsive.font(14),
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
});