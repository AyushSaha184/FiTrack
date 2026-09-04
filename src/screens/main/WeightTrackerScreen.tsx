import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, useWindowDimensions, Alert } from 'react-native';
import type { WeightEntry } from '../../models';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
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
import { useColors, useAuth, useWeightStore, useSettingsStore } from '../../hooks';
import { spacing, typography, radius, responsive } from '../../theme';
import { formatDate, formatCalories, calculateMaintenanceCalories } from '../../utils/helpers';

const timeRangeOptions = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '180', label: '6 Months' },
  { value: '365', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

// Hoist pure sanitizer outside component (rerender-hoist-jsx)
const sanitizeWeightInput = (raw: string): string => {
  let text = raw.replace(/[^0-9.]/g, '');
  const dotIndex = text.indexOf('.');
  if (dotIndex !== -1) {
    text = text.slice(0, dotIndex + 1) + text.slice(dotIndex + 1).replace(/\./g, '');
  }
  if (text.length > 5) {
    text = text.slice(0, 5);
  }
  return text;
};

export const WeightTrackerScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const weightStore = useWeightStore();
  const { width: screenWidth } = useWindowDimensions();

  const currentWeight = weightStore.currentWeight;
  const goalWeight = weightStore.goalWeight;
  const entries = weightStore.entries;

  useEffect(() => {
    const loadWeightData = async () => {
      if (auth.user?.id) {
        await weightStore.loadEntries(auth.user.id);
      }
    };
    loadWeightData();
  }, [auth.isAuthenticated, auth.user?.id, weightStore]);

  // Live Firestore subscription: keeps the chart, history, and stats up to
  // date with writes from any other device (or this device's background
  // sync) without re-fetching.
  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId) {
      return;
    }
    const unsubscribe = weightStore.subscribeEntries(userId);
    return unsubscribe;
  }, [auth.user?.id, weightStore]);

  const weightUnit = useSettingsStore().units.weight;

  const [timeRange, setTimeRange] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WeightEntry | null>(null);

  const chartData = useMemo(() => {
    let filteredEntries: WeightEntry[];

    if (timeRange === 'all') {
      filteredEntries = [...entries];
    } else {
      const days = parseInt(timeRange, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredEntries = entries.filter((e) => new Date(e.date) >= cutoffDate);
    }

    const getTimestamp = (e: WeightEntry) => {
      const d = e.createdAt ? new Date(e.createdAt) : new Date(e.date);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    };

    // Deduplicate entries by calendar day. Multiple weights logged on the same
    // day collapse into a single chart point using the most recent value, so
    // we don't show "today" twice (once mid-chart from a prior entry and once
    // at the end from a new one).
    const dayKey = (e: WeightEntry): string => {
      const raw: any = e.createdAt ?? e.date;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (isNaN(d.getTime())) {
        return String(e.date);
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const byDay = new Map<string, WeightEntry>();
    for (const e of filteredEntries) {
      const key = dayKey(e);
      const existing = byDay.get(key);
      if (!existing || getTimestamp(e) >= getTimestamp(existing)) {
        byDay.set(key, e);
      }
    }

    const sorted = Array.from(byDay.values()).sort((a, b) => {
      const tA = getTimestamp(a);
      const tB = getTimestamp(b);
      if (tA !== tB) {
        return tA - tB;
      }
      return filteredEntries.indexOf(b) - filteredEntries.indexOf(a);
    });

    return sorted.map((e) => ({
      date: formatDate(e.date, 'dayMonth'),
      value: e.weight,
      timestamp: getTimestamp(e),
    }));
  }, [entries, timeRange]);

  const chartWidth = screenWidth - spacing.xl * 2 - spacing.xl * 2;

  // Maintenance calories calculation inputs
  const userGender = auth.user?.profile?.gender;
  const userHeight = auth.user?.profile?.height;
  const latestWeight = currentWeight;

  const hasWeight = Boolean(latestWeight && latestWeight > 0);
  const hasHeight = Boolean(userHeight && userHeight > 0);
  const hasGender = Boolean(userGender);

  const maintenanceCalories = useMemo(() => {
    if (!hasWeight || !hasHeight || !hasGender) {
      return null;
    }
    return calculateMaintenanceCalories({
      weight: latestWeight!,
      weightUnit: weightUnit as 'kg' | 'lbs',
      heightCm: userHeight,
      gender: userGender,
      age: auth.user?.profile?.age || 25,
    });
  }, [hasWeight, hasHeight, hasGender, latestWeight, weightUnit, userHeight, userGender, auth.user?.profile?.age]);

  // Memoized handlers (list-performance-callbacks)
  const handleDeleteEntry = useCallback((entry: WeightEntry) => {
    setDeleteTarget(entry);
  }, []);

  const handleCloseDeleteAlert = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget && auth.user?.id) {
      await weightStore.deleteEntry(auth.user.id, deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, auth.user?.id, weightStore]);

  const handleOpenGoalModal = useCallback(() => {
    setGoalInput(goalWeight ? String(goalWeight) : '');
    setShowGoalModal(true);
  }, [goalWeight]);

  const handleCloseGoalModal = useCallback(() => {
    setShowGoalModal(false);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleWeightInputChange = useCallback((text: string) => {
    setNewWeight(sanitizeWeightInput(text));
  }, []);

  const handleSaveWeight = useCallback(async () => {
    const weight = parseFloat(newWeight);
    if (weight > 0 && auth.user?.id) {
      try {
        await weightStore.addEntry(auth.user.id, weight);
        setNewWeight('');
        setShowAddModal(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to add weight entry');
      }
    }
  }, [newWeight, auth.user?.id, weightStore]);

  const handleSaveGoal = useCallback(async () => {
    const weight = parseFloat(goalInput);
    if (weight > 0 && auth.user?.id) {
      try {
        weightStore.setGoalWeight(weight);
        await weightStore.loadEntries(auth.user.id);
        await weightStore.loadStats(auth.user.id);
        setGoalInput('');
        setShowGoalModal(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to set goal weight');
      }
    }
  }, [goalInput, auth.user?.id, weightStore]);

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
          <Text style={[styles.title, { color: colors.text }]}>Weight Tracking</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your progress over time.
          </Text>

          {/* Current Weight Card */}
          <AnimatedCard index={0} style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View style={styles.currentLeft}>
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
                <TouchableOpacity
                  onPress={handleOpenGoalModal}
                  style={styles.goalButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goalButtonText, { color: colors.text }]}>
                    Set weight goal
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.currentRight}>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={handleOpenAddModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.addButtonIcon, { color: colors.text }]}>+</Text>
                  <Text style={[styles.addButtonText, { color: colors.text }]}>
                    Add Weight
                  </Text>
                </TouchableOpacity>

                {goalWeight !== null && goalWeight > 0 ? (
                  <Text style={[styles.goalUnderAdd, { color: colors.textMuted }]}>
                    Goal: {goalWeight.toFixed(1)} {weightUnit}
                  </Text>
                ) : null}
              </View>
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

          {/* Maintenance Calories */}
          <AnimatedCard index={2} style={styles.maintenanceCard}>
            <View style={styles.maintenanceMainRow}>
              <Text style={[styles.maintenanceLabel, { color: colors.textMuted }]}>
                Your Maintenance Calories
              </Text>
              {maintenanceCalories !== null ? (
                <View style={styles.maintenanceValRow}>
                  <Text style={[styles.maintenanceValText, { color: colors.text }]}>
                    {formatCalories(maintenanceCalories)}
                  </Text>
                  <Text style={[styles.maintenanceUnitText, { color: colors.textMuted }]}>
                    / day
                  </Text>
                </View>
              ) : (
                <Text style={[styles.maintenanceValText, { color: colors.textMuted }]}>
                  --
                </Text>
              )}
            </View>
          </AnimatedCard>

          {/* Weight History */}
          <AnimatedCard index={3} style={styles.historyCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              History
            </Text>

            {entries.slice(0, 6).map((entry, index) => {
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
                    <Text style={[styles.historyDate, { color: colors.text }]}>
                      {formatDate(entry.date, 'short')}
                    </Text>
                    <Text style={[styles.historyTime, { color: colors.textMuted }]}>
                      {formatDate(entry.createdAt, 'time')}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyWeight, { color: colors.text }]}>
                      {entry.weight.toFixed(1)} {weightUnit}
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

      {/* Add Weight Modal */}
      <Modal
        visible={showAddModal}
        onClose={handleCloseAddModal}
        title="Add Weight"
      >
        <Input
          label="Weight"
          value={newWeight}
          onChangeText={handleWeightInputChange}
          placeholder={`Enter weight in ${weightUnit}`}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Button
          title="Save"
          onPress={handleSaveWeight}
          fullWidth
          style={{ backgroundColor: colors.text, marginTop: spacing.base }}
          textStyle={{ color: colors.background }}
        />
      </Modal>

      {/* Goal Modal */}
      <Modal
        visible={showGoalModal}
        onClose={handleCloseGoalModal}
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
        title="Delete Weight Entry"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.weight.toFixed(1)} ${weightUnit} from ${formatDate(deleteTarget.date, 'short')}?` : ''}
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
  currentCard: {
    marginBottom: spacing.lg,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentLeft: {
    flex: 1,
  },
  currentRight: {
    alignItems: 'flex-end',
  },
  currentLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.xs,
  },
  currentWeight: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
  },
  unit: {
    fontSize: typography.body.fontSize,
    marginLeft: spacing.xs,
  },
  goalButton: {
    marginTop: spacing.xs,
  },
  goalButtonText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  goalUnderAdd: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  addButtonIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: responsive.font(14),
    fontWeight: '600',
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
    justifyContent: 'center',
    gap: 2,
  },
  historyDate: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  historyTime: {
    fontSize: typography.caption.fontSize,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyWeight: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  maintenanceCard: {
    marginBottom: spacing.lg,
  },
  maintenanceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  maintenanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: spacing.sm,
  },
  maintenanceValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  maintenanceValText: {
    fontSize: 20,
    fontWeight: '700',
  },
  maintenanceUnitText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 100,
  },
});