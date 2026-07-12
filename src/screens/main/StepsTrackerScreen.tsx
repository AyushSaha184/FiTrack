import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { useColors, useSettingsStore, useAuth, useStepsStore, useWeightStore } from '../../hooks';
import { spacing, typography, radius, durations } from '../../theme';
import { formatDate, formatStepsWithCommas, formatCalories } from '../../utils/helpers';
import { stepsToCalories } from '../../utils/calculations';
import type { StepEntry } from '../../models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const timeRangeOptions = [
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

export const StepsTrackerScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const stepsStore = useStepsStore();
  const weightStore = useWeightStore();
  const [timeRange, setTimeRange] = useState('7');

  const todaySteps = stepsStore.todaySteps;
  const goalSteps = stepsStore.dailyGoal;
  const entries = stepsStore.weeklyEntries;

  useEffect(() => {
    if (user?.id) {
      stepsStore.loadTodaySteps(user.id);
      stepsStore.loadWeeklySteps(user.id);
    }
  }, [user?.id, stepsStore]);

  const currentWeight = weightStore.currentWeight;

  const weeklyStats = useMemo(() => {
    const now = new Date();
    let filteredEntries: StepEntry[];

    if (timeRange === 'all') {
      filteredEntries = [...entries];
    } else {
      const days = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredEntries = entries.filter((e) => new Date(e.date) >= cutoffDate);
    }

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
  }, [entries, goalSteps, currentWeight, timeRange]);

  
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const percentage = Math.min(100, Math.round((todaySteps / goalSteps) * 100));

  // Animated progress bar
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withDelay(
      400,
      withTiming(percentage, { duration: durations.chartDraw, easing: Easing.out(Easing.cubic) }),
    );
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const chartData = useMemo(() => {
    const now = new Date();
    let filteredEntries: StepEntry[];

    if (timeRange === 'all') {
      filteredEntries = [...entries];
    } else {
      const days = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredEntries = entries.filter((e) => new Date(e.date) >= cutoffDate);
    }

    return filteredEntries
      .map((e: StepEntry) => ({
        date: formatDate(e.date, 'dayMonth'),
        value: e.steps,
        timestamp: new Date(e.date).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [entries, timeRange]);

  const chartWidth = SCREEN_WIDTH - spacing.xl * 2 - spacing.xl * 2;

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
              onPress={() => navigation.navigate('HomeTab', { screen: 'Settings' })}
              style={[styles.settingsButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="3" />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
                {goalSteps ? (
                  <TouchableOpacity onPress={() => { setGoalInput(String(goalSteps)); setShowGoalModal(true); }} style={styles.goalButton}>
                    <Text style={[styles.goalText, { color: colors.textMuted }]}>
                      Goal: {formatStepsWithCommas(goalSteps)} steps
                    </Text>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} style={styles.editIcon}>
                      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <Path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </Svg>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setGoalInput(''); setShowGoalModal(true); }} style={styles.goalButton}>
                    <Text style={[styles.goalText, { color: colors.primary }]}>
                      Set Daily Goal
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                <View
                  style={[
                    styles.stepsIllustration,
                    { backgroundColor: 'rgba(255,255,255,0.04)' },
                  ]}
                >
                  <Text style={styles.stepsEmoji}>👣</Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
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
              />
            </View>
          </AnimatedCard>

          {/* Weekly Statistics */}
          <AnimatedCard index={2} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.statIconText}>👣</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Total Steps
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatStepsWithCommas(weeklyStats.totalSteps)}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textMuted }]}>
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.statIconText}>🔥</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Calories Burned
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatStepsWithCommas(weeklyStats.caloriesBurned)}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textMuted }]}>
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
            {entries.slice(0, 7).map((entry: StepEntry, index: number) => (
              <View
                key={entry.id}
                style={[
                  styles.historyItem,
                  index < 6 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.historyLeft}>
                  <View
                    style={[
                      styles.historyIcon,
                      { backgroundColor: 'rgba(255,255,255,0.05)' },
                    ]}
                  >
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
                <Text style={[styles.historySteps, { color: colors.text }]}>
                  {formatStepsWithCommas(entry.steps)} steps
                </Text>
              </View>
            ))}
          </AnimatedCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </AnimatedScreen>

      {/* Goal Modal */}
      <Modal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Set Daily Goal"
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
          onPress={async () => {
            const steps = parseInt(goalInput);
            if (steps > 0) {
              try {
                stepsStore.setDailyGoal(steps);
                await stepsStore.loadTodaySteps(user!.id);
                await stepsStore.loadWeeklySteps(user!.id);
                setGoalInput('');
                setShowGoalModal(false);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to set daily goal');
              }
            }
          }}
          fullWidth
          style={{ marginTop: spacing.base }}
        />
      </Modal>
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
  settingsIcon: { fontSize: 20 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  progressCard: {
    marginBottom: spacing.base,
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  progressLeft: {
    flex: 1,
  },
  progressRight: {},
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepsValue: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
  },
  stepsUnit: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editIcon: {
    marginLeft: 6,
  },
  stepsIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsEmoji: {
    fontSize: 44,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  chartCard: {
    marginBottom: spacing.base,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
  },
  statsCard: {
    marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    opacity: 0.5,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statIconText: { fontSize: 18 },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  historyCard: {
    marginBottom: spacing.base,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconText: { fontSize: 18 },
  historyDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  historyDay: {
    fontSize: 12,
    marginTop: 2,
  },
  historySteps: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  addButtonIcon: {
    fontSize: 18,
    fontWeight: '300',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});