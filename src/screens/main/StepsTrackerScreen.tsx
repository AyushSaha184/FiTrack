import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { LineChart } from '../../components/common/LineChart';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';
import { CustomAlert } from '../../components/common/CustomAlert';
import { useColors, useAuth, useStepsStore, useWeightStore } from '../../hooks';
import { spacing, typography, durations } from '../../theme';
import { formatDate, formatStepsWithCommas } from '../../utils/helpers';
import { stepsToCalories } from '../../utils/calculations';
import type { StepEntry } from '../../models';

const timeRangeOptions = [
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

interface StepsTrackerScreenProps {
  isActive?: boolean;
}

export const StepsTrackerScreen = observer(({ isActive = true }: StepsTrackerScreenProps) => {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const stepsStore = useStepsStore();
  const weightStore = useWeightStore();
  const { width: screenWidth } = useWindowDimensions();

  const [timeRange, setTimeRange] = useState('7');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StepEntry | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const todaySteps = stepsStore.todaySteps;
  const goalSteps = stepsStore.dailyGoal;
  const entries = stepsStore.weeklyEntries;

  const handleRefreshData = useCallback(async () => {
    if (!user?.id) return;
    await stepsStore.syncFromBackgroundService(user.id);
    await Promise.all([
      stepsStore.loadTodaySteps(user.id),
      stepsStore.loadWeeklySteps(user.id),
    ]);
  }, [user?.id, stepsStore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await handleRefreshData();
    } finally {
      setRefreshing(false);
    }
  }, [handleRefreshData]);

  // Load today's steps and weekly history whenever active screen or user changes
  useEffect(() => {
    if (user?.id && isActive) {
      handleRefreshData();
    }
  }, [user?.id, isActive, handleRefreshData]);

  useEffect(() => {
    if (!user?.id || !isActive) {
      return;
    }
    // Defer the permission request until after the swipe-in animation
    // (250ms in MainTabNavigator) and the initial layout settle. This avoids
    // the system dialog popping up while the screen is still animating in.
    const timer = setTimeout(() => {
      stepsStore.startLiveStepTracking(user.id);
    }, 600);
    return () => clearTimeout(timer);
  }, [user?.id, isActive, stepsStore]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user?.id) {
        handleRefreshData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [user?.id, handleRefreshData]);

  const currentWeight = weightStore.currentWeight;

  // Single shared filter+sort used by both weekly stats and the chart so we
  // never compute the same filtered entry list twice.
  const getFilteredEntries = useCallback(
    (source: StepEntry[], range: string): StepEntry[] => {
      if (range === 'all') {
        return [...source];
      }
      const days = parseInt(range, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return source.filter((e) => new Date(e.date) >= cutoffDate);
    },
    []
  );

  const filteredEntries = useMemo(
    () => getFilteredEntries(entries, timeRange),
    [entries, timeRange, getFilteredEntries]
  );

  const weeklyStats = useMemo(() => {
    const totalSteps = filteredEntries.reduce((sum, e) => sum + e.steps, 0);
    const userWeight = currentWeight || 70;
    const caloriesBurned = stepsToCalories(totalSteps, userWeight);
    const achievedDays = filteredEntries.filter((e) => e.steps >= goalSteps).length;
    const goalAchievedPercent = filteredEntries.length > 0
      ? Math.round((achievedDays / filteredEntries.length) * 100)
      : 0;

    return {
      totalSteps,
      caloriesBurned,
      goalAchievedPercent,
      entryCount: filteredEntries.length,
    };
  }, [filteredEntries, goalSteps, currentWeight]);

  const percentage = Math.min(100, Math.round((todaySteps / (goalSteps || 10000)) * 100));

  // Animated progress bar (.get() and .set() for React Compiler compat)
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.set(
      withDelay(
        400,
        withTiming(percentage, { duration: durations.chartDraw, easing: Easing.out(Easing.cubic) }),
      )
    );
  }, [percentage, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.get()}%`,
  }));

  const chartData = useMemo(() => {
    const getTimestamp = (e: StepEntry) => {
      const d = e.createdAt ? new Date(e.createdAt) : new Date(e.date);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    };

    const sorted = [...filteredEntries].sort((a, b) => {
      const tA = getTimestamp(a);
      const tB = getTimestamp(b);
      if (tA !== tB) {
        return tA - tB;
      }
      return filteredEntries.indexOf(b) - filteredEntries.indexOf(a);
    });

    return sorted.map((e: StepEntry) => ({
      date: formatDate(e.date, 'dayMonth'),
      value: e.steps,
      timestamp: getTimestamp(e),
    }));
  }, [filteredEntries]);

  const chartWidth = screenWidth - spacing.xl * 2 - spacing.xl * 2;

  // Memoized handlers
  const handleDeleteEntry = useCallback((entry: StepEntry) => {
    setDeleteTarget(entry);
  }, []);

  const handleCloseDeleteAlert = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget) {
      try {
        await stepsStore.deleteEntry(deleteTarget.id);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to delete step entry');
      } finally {
        setDeleteTarget(null);
      }
    }
  }, [deleteTarget, stepsStore]);

  const handleOpenGoalModal = useCallback(() => {
    setGoalInput(goalSteps ? String(goalSteps) : '');
    setShowGoalModal(true);
  }, [goalSteps]);

  const handleCloseGoalModal = useCallback(() => {
    setShowGoalModal(false);
  }, []);

  const handleSaveGoal = useCallback(async () => {
    const steps = parseInt(goalInput, 10);
    if (steps > 0 && user?.id) {
      try {
        stepsStore.setDailyGoal(steps);
        await stepsStore.loadTodaySteps(user.id);
        await stepsStore.loadWeeklySteps(user.id);
        setGoalInput('');
        setShowGoalModal(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to set daily goal');
      }
    }
  }, [goalInput, user?.id, stepsStore]);

  const deleteAlertActions = useMemo(
    () => [
      { text: 'Cancel', style: 'cancel' as const, onPress: handleCloseDeleteAlert },
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: handleConfirmDelete,
      },
    ],
    [handleCloseDeleteAlert, handleConfirmDelete]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedScreen>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo size="medium" />
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

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Step Tracker</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your daily steps and stay active.
          </Text>

          {/* Daily Progress Card */}
          <AnimatedCard index={0} style={styles.progressCard}>
            <View style={styles.progressContent}>
              <View style={styles.progressLeft}>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                  Today's Steps
                </Text>
                <View style={styles.stepsRow}>
                  <Text style={[styles.stepsValue, { color: colors.text }]}>
                    {formatStepsWithCommas(todaySteps)}
                  </Text>
                  <Text style={[styles.stepsUnit, { color: colors.textMuted }]}>
                    steps
                  </Text>
                </View>
                <TouchableOpacity onPress={handleOpenGoalModal} style={styles.goalButton}>
                  <Text style={[styles.goalText, { color: colors.text }]}>
                    Set your steps goal
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.illustrationCenter}>
                <View style={styles.stepsIllustration}>
                  <Svg width={90} height={90} viewBox="0 0 90 90">
                    {/* Background Track Circle */}
                    <Circle
                      cx={45}
                      cy={45}
                      r={38}
                      stroke={colors.cardBorder}
                      strokeWidth={6}
                      fill="transparent"
                    />
                    {/* Progress Arc */}
                    <Circle
                      cx={45}
                      cy={45}
                      r={38}
                      stroke={colors.text}
                      strokeWidth={6}
                      fill="transparent"
                      strokeDasharray={238.76}
                      strokeDashoffset={238.76 * (1 - Math.min(1, Math.max(0, todaySteps / (goalSteps || 10000))))}
                      strokeLinecap="round"
                      transform="rotate(-90 45 45)"
                    />
                  </Svg>
                  <View style={styles.stepsIconCenter}>
                    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M4 16v-2.38C4 11.5 5.5 10 7.5 10h.75c1.25 0 2.25-.8 2.6-2l.9-3.1C12.1 3.7 13.25 3 14.5 3h1.8c1.3 0 2.2 1.25 1.8 2.5l-1.5 4.5h2.9c1.6 0 2.8 1.5 2.4 3.1l-1.2 4.8C20.4 19.3 19 20.5 17.5 20.5H8.5C6 20.5 4 18.5 4 16z" />
                      <Circle cx="8" cy="16" r="1.2" fill={colors.text} />
                      <Circle cx="14" cy="16" r="1.2" fill={colors.text} />
                    </Svg>
                  </View>
                </View>
                {goalSteps > 0 ? (
                  <Text style={[styles.goalUnderRing, { color: colors.textMuted }]}>
                    Goal: {formatStepsWithCommas(goalSteps)}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressTrack, { backgroundColor: colors.cardBorder }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.text },
                    progressStyle,
                  ]}
                />
              </View>
              <Text style={[styles.percentageText, { color: colors.text }]}>
                {percentage}%
              </Text>
            </View>
          </AnimatedCard>

          {/* Steps Trend Chart */}
          <AnimatedCard index={1} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Trend
              </Text>
              <DropdownPicker
                options={timeRangeOptions}
                selectedValue={timeRange}
                onValueChange={setTimeRange}
              />
            </View>
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={chartWidth}
                height={200}
                tooltipValue={
                  todaySteps > 0
                    ? formatStepsWithCommas(todaySteps)
                    : undefined
                }
                yMax={goalSteps > 0 ? goalSteps : undefined}
                yTickCount={6}
              />
            </View>
          </AnimatedCard>

          {/* Weekly Statistics */}
          <AnimatedCard index={2} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  Total Steps
                </Text>
                <Text
                  style={[styles.statValue, { color: colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatStepsWithCommas(weeklyStats.totalSteps)}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textMuted }]} numberOfLines={1}>
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  Calories Burned
                </Text>
                <Text
                  style={[styles.statValue, { color: colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatStepsWithCommas(weeklyStats.caloriesBurned)}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textMuted }]} numberOfLines={1}>
                  {timeRange === 'all' ? 'All time (kcal)' : `Last ${timeRange} days (kcal)`}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Step History */}
          <AnimatedCard index={3} style={styles.historyCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              History
            </Text>
            {entries.slice(0, 6).map((entry: StepEntry, index: number) => {
              const displayLimit = Math.min(entries.length, 6);
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.historyItem,
                    index < displayLimit - 1 && [
                      styles.historyItemBorder,
                      { borderBottomColor: colors.cardBorder },
                    ],
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, { backgroundColor: colors.cardSurface }]}>
                      <Text style={styles.historyIconText}>👟</Text>
                    </View>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {formatDate(entry.date, 'short')}
                      </Text>
                      <Text style={[styles.historyDay, { color: colors.textMuted }]}>
                        {formatDate(entry.date, 'long').split(',')[0]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historySteps, { color: colors.text }]}>
                      {formatStepsWithCommas(entry.steps)} steps
                    </Text>
                    <Pressable
                      onPress={() => handleDeleteEntry(entry)}
                      style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
                      hitSlop={8}
                    >
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M3 6h18" />
                        <Path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </Svg>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </AnimatedCard>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </AnimatedScreen>

      {/* Goal Modal */}
      <Modal
        visible={showGoalModal}
        onClose={handleCloseGoalModal}
        title="Set Step Goal"
      >
        <Input
          label="Steps Goal"
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder="Enter daily goal"
          keyboardType="number-pad"
        />
        <Button
          title="Save"
          onPress={handleSaveGoal}
          fullWidth
          style={{ backgroundColor: colors.text, marginTop: spacing.base }}
          textStyle={{ color: colors.background }}
        />
      </Modal>

      {/* Custom Delete Confirmation Alert */}
      <CustomAlert
        visible={!!deleteTarget}
        onClose={handleCloseDeleteAlert}
        title="Delete Step Entry"
        message={deleteTarget ? `Are you sure you want to delete ${formatStepsWithCommas(deleteTarget.steps)} steps from ${formatDate(deleteTarget.date, 'short')}?` : ''}
        actions={deleteAlertActions}
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
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.xl,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  progressLeft: {
    flex: 1,
  },
  progressLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.xs,
  },
  stepsValue: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
  },
  stepsUnit: {
    fontSize: typography.body.fontSize,
    marginLeft: spacing.xs,
  },
  goalButton: {
    marginTop: spacing.xs,
  },
  goalText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  illustrationCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsIllustration: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stepsIconCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalUnderRing: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
  },
  chartContainer: {
    marginVertical: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statIconText: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 28,
  },
  statUnit: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'center',
    minHeight: 50,
  },
  historyCard: {
    marginBottom: spacing.lg,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyIconText: {
    fontSize: 18,
  },
  historyDate: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  historyDay: {
    fontSize: typography.caption.fontSize,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historySteps: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  bottomSpacer: {
    height: 100,
  },
});
