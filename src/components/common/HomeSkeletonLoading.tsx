import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { observer } from 'mobx-react-lite';
import Svg, { Circle, Path } from 'react-native-svg';
import { Logo } from './Logo';
import { useColors, useWorkoutStore } from '../../hooks';
import { spacing, radius } from '../../theme';
import { dateKey, getDayOfWeekKey, storage } from '../../utils/helpers';
import { STORAGE_KEYS } from '../../utils/constants';
import type { Workout } from '../../models';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface SkeletonBoneProps {
  style?: StyleProp<ViewStyle>;
  animValue: Animated.SharedValue<number>;
  color: string;
  borderRadius?: number;
}

const SkeletonBone: React.FC<SkeletonBoneProps> = ({
  style,
  animValue,
  color,
  borderRadius = 6,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animValue.get(),
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius,
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

export const HomeSkeletonLoading = observer(() => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const workoutStore = useWorkoutStore();

  // Subtle breathing shimmer animation
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.set(
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [shimmer]);

  // Inspect today's stored workout state synchronously
  const { isRestDay, exercises, todayDayIndex } = useMemo(() => {
    const today = new Date();
    const dateStr = dateKey(today);
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon...
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Mon ... 6 = Sun

    const selectedDayKey = getDayOfWeekKey(today);
    const restDays = storage.get<Record<string, boolean>>('workout.rest_days') || {};
    const isRest = typeof restDays[selectedDayKey] === 'boolean' ? restDays[selectedDayKey] : !!restDays[dateStr];

    // Check MobX active workout first, then fall back to synchronous MMKV drafts
    const dayDraft = storage.get<Workout>(`workout.draft.${selectedDayKey}`);
    const activeDraft = storage.get<Workout>(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);

    let currentExercises = workoutStore.activeWorkoutExercises;
    if (!currentExercises || currentExercises.length === 0) {
      currentExercises = dayDraft?.exercises || activeDraft?.exercises || [];
    }

    return {
      isRestDay: isRest,
      exercises: currentExercises,
      todayDayIndex: dayIndex,
    };
  }, [workoutStore.activeWorkoutExercises]);

  const boneColor = colors.cardBorder;
  const cardBg = colors.cardSurface;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header: Logo and Settings button */}
        <View style={styles.header}>
          <Logo size="medium" />
          <View style={[styles.settingsButton, { backgroundColor: colors.cardSurface }]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2}>
              <Circle cx="12" cy="12" r="3" />
              <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </Svg>
          </View>
        </View>

        {/* Title Row: Progress and Reset Week buttons */}
        <View style={styles.titleRow}>
          <View style={styles.buttonGroup}>
            <View style={[styles.progressButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardSurface }]}>
              <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 54, height: 12 }} />
            </View>
            <View style={[styles.resetButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardSurface }]}>
              <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 68, height: 12 }} />
            </View>
          </View>
        </View>

        {/* Weekly Calendar Card */}
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.weekCalendar}>
            {DAY_LABELS.map((label, index) => {
              const isToday = index === todayDayIndex;
              return (
                <View
                  key={label}
                  style={[
                    styles.dayItem,
                    isToday && [styles.dayItemSelected, { backgroundColor: colors.cardBorder }],
                  ]}
                >
                  <SkeletonBone
                    animValue={shimmer}
                    color={isToday ? colors.text : boneColor}
                    style={{ width: 22, height: 10, marginBottom: 4 }}
                  />
                  <SkeletonBone
                    animValue={shimmer}
                    color={isToday ? colors.text : boneColor}
                    borderRadius={radius.pill}
                    style={{ width: 6, height: 6 }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Workout Type Pills & Stopwatch Bar */}
        <View style={styles.typePillsWithTimer}>
          <View style={styles.typePillsRow}>
            <View
              style={[
                styles.pill,
                {
                  borderColor: colors.cardBorder,
                  backgroundColor: !isRestDay ? colors.cardSurface : 'transparent',
                },
              ]}
            >
              <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 75, height: 14 }} />
            </View>

            <View
              style={[
                styles.pill,
                {
                  borderColor: colors.cardBorder,
                  backgroundColor: isRestDay ? colors.cardBorder : 'transparent',
                },
              ]}
            >
              <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 58, height: 14 }} />
            </View>
          </View>

          {/* Stopwatch button placeholder */}
          <View style={[styles.stopwatchPill, { borderColor: colors.cardBorder, backgroundColor: colors.cardSurface }]}>
            <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 28, height: 12 }} />
          </View>
        </View>

        {/* Content Section: Rest Day vs Exercises vs Empty State */}
        {isRestDay ? (
          <View
            style={[
              styles.restDayCard,
              {
                backgroundColor: cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={30} style={{ width: 60, height: 60, marginBottom: spacing.lg }} />
            <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 140, height: 24, marginBottom: spacing.sm }} />
            <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 200, height: 16 }} />
          </View>
        ) : exercises.length > 0 ? (
          <View style={styles.exercisesSection}>
            {exercises.map((exercise, exIndex) => {
              const setsCount = Math.max(1, exercise.sets?.length || 3);
              return (
                <View
                  key={exercise.id || exIndex}
                  style={[
                    styles.exerciseCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  {/* Exercise Header */}
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseHeaderLeft}>
                      <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 12, height: 18, marginRight: spacing.sm }} />
                      <View>
                        <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 130, height: 16, marginBottom: 4 }} />
                        <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 60, height: 11 }} />
                      </View>
                    </View>
                    <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={radius.pill} style={{ width: 24, height: 24 }} />
                  </View>

                  {/* Table Header */}
                  <View style={[styles.tableHeader, { borderBottomColor: colors.cardBorder }]}>
                    <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 28, height: 10 }} />
                    <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 70, height: 10 }} />
                    <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 36, height: 10 }} />
                    <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 32, height: 10 }} />
                  </View>

                  {/* Set Rows */}
                  {Array.from({ length: setsCount }).map((_, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={radius.pill} style={{ width: 20, height: 20 }} />
                      <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 50, height: 14 }} />
                      <View style={[styles.inputBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                        <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 28, height: 12 }} />
                      </View>
                      <View style={[styles.inputBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                        <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 24, height: 12 }} />
                      </View>
                      <View style={[styles.checkButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardSurface }]}>
                        <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={4} style={{ width: 14, height: 14 }} />
                      </View>
                    </View>
                  ))}

                  {/* Add Set Button placeholder */}
                  <View style={styles.addSetRow}>
                    <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={radius.pill} style={{ width: 90, height: 24 }} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 170, height: 22, marginBottom: spacing.sm }} />
            <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 130, height: 14 }} />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Add Exercise Button Skeleton */}
      {!isRestDay ? (
        <View
          style={[
            styles.fab,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 44, height: 18 }} />
        </View>
      ) : null}

      {/* Floating Bottom Tab Bar Skeleton */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Weight Tab */}
        <View style={styles.tabButton}>
          <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={4} style={{ width: 20, height: 20, marginBottom: 4 }} />
          <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 36, height: 10 }} />
        </View>

        {/* Home Tab (Focused Pill) */}
        <View style={styles.tabButton}>
          <View style={[styles.tabPill, { backgroundColor: colors.cardSurface }]}>
            <SkeletonBone animValue={shimmer} color={colors.text} borderRadius={4} style={{ width: 20, height: 20, marginBottom: 4 }} />
            <SkeletonBone animValue={shimmer} color={colors.text} style={{ width: 32, height: 10 }} />
          </View>
        </View>

        {/* Steps Tab */}
        <View style={styles.tabButton}>
          <SkeletonBone animValue={shimmer} color={boneColor} borderRadius={4} style={{ width: 20, height: 20, marginBottom: 4 }} />
          <SkeletonBone animValue={shimmer} color={boneColor} style={{ width: 32, height: 10 }} />
        </View>
      </View>
    </View>
  );
});

HomeSkeletonLoading.displayName = 'HomeSkeletonLoading';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  resetButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  calendarCard: {
    marginBottom: spacing.base,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 40,
  },
  dayItemSelected: {
    borderRadius: radius.md,
  },
  typePillsWithTimer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  typePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pill: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  stopwatchPill: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  exercisesSection: {
    marginTop: spacing.sm,
  },
  exerciseCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  inputBox: {
    width: 62,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  restDayCard: {
    marginTop: spacing.base,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  emptyCard: {
    marginTop: spacing.base,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
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
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    elevation: 8,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
});
