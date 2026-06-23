import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import type { WeightEntry } from '../../models';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { AnimatedCard } from '../../components/common/AnimatedCard';
import { AnimatedScreen } from '../../components/common/AnimatedScreen';
import { DropdownPicker } from '../../components/common/DropdownPicker';
import { LineChart } from '../../components/common/LineChart';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';
import { useColors, useSettingsStore, useAuth, useWeightStore, useAuthStore } from '../../hooks';
import { spacing, typography, radius } from '../../theme';
import { formatWeight, formatDate } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const timeRangeOptions = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

export const WeightTrackerScreen = () => {
  const colors = useColors();
  const navigation = useNavigation();
  const { user } = useAuth();
  const weightStore = useWeightStore();
  const authStore = useAuthStore();
  
  const currentWeight = weightStore.currentWeight;
  const goalWeight = weightStore.goalWeight;
  const progress = weightStore.progress;
  const trend = weightStore.trend;
  const stats = weightStore.stats;
  const entries = weightStore.entries;

  useEffect(() => {
    if (authStore.userId) {
      weightStore.loadEntries(authStore.userId);
      weightStore.loadStats(authStore.userId);
    }
  }, [authStore.userId, weightStore]);

  const weightUnit = useSettingsStore().units.weight;



  const [timeRange, setTimeRange] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const chartData = useMemo(() => {
    const limit = timeRange === 'all' ? entries.length : parseInt(timeRange);
    return entries
      .slice(0, limit)
      .reverse()
      .map((e) => ({
        date: formatDate(e.date, 'dayMonth'),
        value: e.weight,
      }));
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
          <Text style={[styles.title, { color: colors.text }]}>Weight Tracking</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your progress over time.
          </Text>

          {/* Current Weight Card */}
          <AnimatedCard index={0} style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View>
                <Text style={[styles.currentLabel, { color: colors.textMuted }]}>
                  Current Weight
                </Text>
                <View style={styles.weightRow}>
                  <Text style={[styles.currentWeight, { color: colors.text }]}>
                    {currentWeight ? currentWeight.toFixed(1) : '--'}
                  </Text>
                  <Text style={[styles.unit, { color: colors.textMuted }]}>
                    {weightUnit}
                  </Text>
                </View>
                {goalWeight ? (
                  <TouchableOpacity onPress={() => { setGoalInput(String(goalWeight)); setShowGoalModal(true); }} style={styles.goalButton}>
                    <Text style={[styles.goalText, { color: colors.textMuted }]}>
                      Goal: {goalWeight.toFixed(1)} {weightUnit}
                    </Text>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} style={styles.editIcon}>
                      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <Path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </Svg>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setGoalInput(''); setShowGoalModal(true); }} style={styles.goalButton}>
                    <Text style={[styles.goalText, { color: colors.primary }]}>
                      Set Weight Goal
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.addButtonIcon, { color: colors.text }]}>+</Text>
                <Text style={[styles.addButtonText, { color: colors.text }]}>
                  Add Weight
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* Weight Trend Chart */}
          <AnimatedCard index={1} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Progress
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
                  currentWeight ? `${currentWeight.toFixed(1)} ${weightUnit}` : undefined
                }
              />
            </View>
          </AnimatedCard>

          {/* Statistics */}
          <AnimatedCard index={2} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.statIconText}>📈</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Highest Weight
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.highest?.weight?.toFixed(1) || '--'} {weightUnit}
                </Text>
                <Text style={[styles.statDate, { color: colors.textMuted }]}>
                  {stats.highest?.date
                    ? formatDate(stats.highest.date, 'short')
                    : ''}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.statIconText}>📉</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Lowest Weight
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.lowest?.weight?.toFixed(1) || '--'} {weightUnit}
                </Text>
                <Text style={[styles.statDate, { color: colors.textMuted }]}>
                  {stats.lowest?.date
                    ? formatDate(stats.lowest.date, 'short')
                    : ''}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={styles.statIconText}>📊</Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Average Weight
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.average?.toFixed(1) || '--'} {weightUnit}
                </Text>
                <Text style={[styles.statDate, { color: colors.textMuted }]}>
                  Last 30 days
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Weight History */}
          <AnimatedCard index={3} style={styles.historyCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              History
            </Text>

            {entries.slice(0, 5).map((entry, index) => (
              <TouchableOpacity
                key={entry.id}
                style={[
                  styles.historyItem,
                  index < 4 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.historyLeft}>
                  <View
                    style={[
                      styles.historyIcon,
                      { backgroundColor: 'rgba(255,255,255,0.05)' },
                    ]}
                  >
                    <Text style={styles.historyIconText}>📊</Text>
                  </View>
                  <View>
                    <Text style={[styles.historyDate, { color: colors.text }]}>
                      {formatDate(entry.date, 'short')}
                    </Text>
                    <Text style={[styles.historyTime, { color: colors.textMuted }]}>
                      {formatDate(entry.createdAt, 'time')}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyWeight, { color: colors.text }]}>
                    {entry.weight.toFixed(1)} {weightUnit}
                  </Text>
                  <Text style={[styles.historyChevron, { color: colors.textMuted }]}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </AnimatedCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </AnimatedScreen>

      {/* Add Weight Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Weight"
      >
        <Input
          label="Weight"
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder={`Enter weight in ${weightUnit}`}
          keyboardType="decimal-pad"
        />
        <Button
          title="Save"
          onPress={async () => {
            const weight = parseFloat(newWeight);
            if (weight > 0) {
              try {
                await weightStore.addEntry(authStore.userId!, weight);
                await weightStore.loadEntries(authStore.userId!);
                await weightStore.loadStats(authStore.userId!);
                setNewWeight('');
                setShowAddModal(false);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to add weight entry');
              }
            }
          }}
          fullWidth
          style={{ marginTop: spacing.base }}
        />
      </Modal>

      {/* Goal Modal */}
      <Modal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Set Goal Weight"
      >
        <Input
          label="Goal Weight"
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder={`Enter goal in ${weightUnit}`}
          keyboardType="decimal-pad"
        />
        <Button
          title="Save"
          onPress={async () => {
            const weight = parseFloat(goalInput);
            if (weight > 0) {
              try {
                weightStore.setGoalWeight(weight);
                await weightStore.loadEntries(authStore.userId!);
                await weightStore.loadStats(authStore.userId!);
                setGoalInput('');
                setShowGoalModal(false);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to set goal weight');
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
  currentCard: {
    marginBottom: spacing.base,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentWeight: {
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 20,
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
  historyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyChevron: {
    fontSize: 20,
    fontWeight: '300',
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
  statDate: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});