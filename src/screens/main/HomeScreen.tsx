import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Button } from '../../components/common/Button';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { Logo } from '../../components/common/Logo';
import { useAuth, useWeight, useSteps, useWorkout, useColors } from '../../hooks';
import { spacing, typography, radius } from '../../theme';
import { getWeekDates, formatDate, formatWeight, formatSteps } from '../../utils/helpers';
import type { MainTabParamList, HomeStackParamList } from '../../types/navigation';
import type { DayOfWeek } from '../../models';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export const HomeScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { todaySteps, todayProgress, dailyGoal, loadTodaySteps, loadWeeklySteps } = useSteps();
  const { currentWeight, goalWeight, progress, loadEntries, loadStats } = useWeight();
  const { selectedDay, selectedDate, activeWorkout, loadWorkouts } = useWorkout();

  useEffect(() => {
    if (user?.id) {
      loadTodaySteps();
      loadWeeklySteps();
      loadEntries();
      loadStats();
      loadWorkouts();
    }
  }, [user?.id, loadTodaySteps, loadWeeklySteps, loadEntries, loadStats, loadWorkouts]);

  const weekDates = getWeekDates();
  const today = new Date();

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const workoutTypes = [
    { value: 'push', label: 'Push' },
    { value: 'pull', label: 'Pull' },
    { value: 'legs', label: 'Legs' },
  ];
  const [selectedWorkoutType, setSelectedWorkoutType] = useState('push');

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Logo size="medium" />
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="12" r="3" />
              <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Athlete'}!
          </Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatDate(today, 'long')}
          </Text>
        </View>

        <Card style={styles.workoutCard} padding="xl">
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Today's Workout
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('History')}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          <SegmentedControl
            options={workoutTypes}
            selectedValue={selectedWorkoutType}
            onValueChange={setSelectedWorkoutType}
          />

          <View style={styles.weekCalendar}>
            {weekDates.map((date, index) => {
              const dayKey = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as DayOfWeek[])[date.getDay()];
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const hasWorkout = false;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayItem,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: isSelected ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index]}
                  </Text>
                  {hasWorkout && (
                    <View
                      style={[styles.workoutDot, { backgroundColor: colors.success }]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {activeWorkout ? (
            <View style={styles.activeWorkoutInfo}>
              <Text style={[styles.workoutName, { color: colors.text }]}>
                {activeWorkout.name}
              </Text>
              <Text style={[styles.workoutDetails, { color: colors.textSecondary }]}>
                {activeWorkout.exercises.length} exercises
              </Text>
              <Button
                title="Continue Workout"
                onPress={() => {}}
                fullWidth
                style={styles.continueButton}
              />
            </View>
          ) : (
            <Button
              title="Start Workout"
              onPress={() => {}}
              fullWidth
              size="large"
              style={styles.startButton}
            />
          )}
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding="base">
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Steps Today
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatSteps(todaySteps)}
            </Text>
            <ProgressBar
              progress={todayProgress}
              height={6}
              color={colors.primary}
            />
            <Text style={[styles.statSubtext, { color: colors.textMuted }]}>
              Goal: {formatSteps(dailyGoal)}
            </Text>
          </Card>

          <Card style={styles.statCard} padding="base">
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Weight
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentWeight ? formatWeight(currentWeight, 'kg') : '--'}
            </Text>
            {goalWeight && (
              <ProgressBar
                progress={progress}
                height={6}
                color={colors.success}
              />
            )}
            <Text style={[styles.statSubtext, { color: colors.textMuted }]}>
              Goal: {goalWeight ? formatWeight(goalWeight, 'kg') : 'Set a goal'}
            </Text>
          </Card>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  greeting: {
    marginTop: spacing.base,
  },
  greetingText: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
  },
  dateText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
  },
  workoutCard: {
    marginTop: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  settingsButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xl,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 36,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    marginTop: 2,
  },
  workoutDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  activeWorkoutInfo: {
    alignItems: 'center',
  },
  workoutName: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
  },
  workoutDetails: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  continueButton: {
    marginTop: spacing.base,
  },
  startButton: {
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.base,
    gap: spacing.base,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  statSubtext: {
    fontSize: typography.small.fontSize,
    marginTop: spacing.xs,
  },
});

const NativeStackNavigation = require('@react-navigation/native-stack').NativeStackNavigationProp;