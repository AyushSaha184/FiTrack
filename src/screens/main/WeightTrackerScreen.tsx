import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
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
import { spacing, typography, radius } from '../../theme';
import { formatWeight, formatDate, formatCalories, calculateMaintenanceCalories } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const timeRangeOptions = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '180', label: '6 Months' },
  { value: '365', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

export const WeightTrackerScreen = observer(() => {
  const colors = useColors();
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const weightStore = useWeightStore();

  const currentWeight = weightStore.currentWeight;
  const goalWeight = weightStore.goalWeight;
  const progress = weightStore.progress;
  const trend = weightStore.trend;
  const stats = weightStore.stats;
  const entries = weightStore.entries;

  useEffect(() => {
    const loadWeightData = async () => {
      if (auth.user?.id) {
        await weightStore.loadEntries(auth.user.id);
      }
    };
    loadWeightData();
  }, [auth.isAuthenticated, auth.user?.id, weightStore]);

  const weightUnit = useSettingsStore().units.weight;



  const [timeRange, setTimeRange] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const sanitizeWeightInput = (raw: string): string => {
    let text = raw.replace(/[^0-9.]/g, '');
    const dotIndex = text.indexOf('.');
    if (dotIndex !== -1) {
      text = text.slice(0, dotIndex + 1) + text.slice(dotIndex + 1).replace(/\./g, '');
    }
    if (text.length > 5) text = text.slice(0, 5);
    return text;
  };
  const [newWeight, setNewWeight] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const chartData = useMemo(() => {
    const now = new Date();
    let filteredEntries: WeightEntry[];

    if (timeRange === 'all') {
      filteredEntries = [...entries];
    } else {
      const days = parseInt(timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredEntries = entries.filter((e) => new Date(e.date) >= cutoffDate);
    }

    const getTimestamp = (e: WeightEntry) => {
      const d = e.createdAt ? new Date(e.createdAt) : new Date(e.date);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    };

    const sorted = [...filteredEntries].sort((a, b) => {
      const tA = getTimestamp(a);
      const tB = getTimestamp(b);
      if (tA !== tB) return tA - tB;
      return filteredEntries.indexOf(b) - filteredEntries.indexOf(a);
    });

    return sorted.map((e) => ({
      date: formatDate(e.date, 'dayMonth'),
      value: e.weight,
      timestamp: getTimestamp(e),
    }));
  }, [entries, timeRange]);

  const chartWidth = SCREEN_WIDTH - spacing.xl * 2 - spacing.xl * 2;

  // Maintenance calories calculation inputs
  const userGender = auth.user?.profile?.gender;
  const userHeight = auth.user?.profile?.height;
  const latestWeight = currentWeight;

  const hasWeight = Boolean(latestWeight && latestWeight > 0);
  const hasHeight = Boolean(userHeight && userHeight > 0);
  const hasGender = Boolean(userGender);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!hasWeight) missing.push('weight');
    if (!hasHeight) missing.push('height');
    if (!hasGender) missing.push('gender');
    return missing;
  }, [hasWeight, hasHeight, hasGender]);

  const maintenanceCalories = useMemo(() => {
    if (!hasWeight || !hasHeight || !hasGender) return null;
    return calculateMaintenanceCalories({
      weight: latestWeight!,
      weightUnit: weightUnit as 'kg' | 'lbs',
      heightCm: userHeight,
      gender: userGender,
      age: auth.user?.profile?.age || 25,
    });
  }, [hasWeight, hasHeight, hasGender, latestWeight, weightUnit, userHeight, userGender, auth.user?.profile?.age]);

  const [deleteTarget, setDeleteTarget] = useState<WeightEntry | null>(null);

  const handleDeleteEntry = (entry: WeightEntry) => {
    setDeleteTarget(entry);
  };

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
              style={[styles.settingsButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx="12" cy="12" r="3" />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
              <View style={{ flex: 1 }}>
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
                  onPress={() => { setGoalInput(goalWeight ? String(goalWeight) : ''); setShowGoalModal(true); }}
                  style={styles.goalButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goalButtonText, { color: colors.text }]}>
                    Set weight goal
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
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

                {goalWeight !== null && goalWeight > 0 && (
                  <Text style={[styles.goalUnderAdd, { color: colors.textMuted }]}>
                    Goal: {goalWeight.toFixed(1)} {weightUnit}
                  </Text>
                )}
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
              <View style={[styles.maintenanceIconBox, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={styles.maintenanceIconText}>🔥</Text>
              </View>
              <View style={styles.maintenanceInfoGroup}>
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
            </View>

            <View style={[styles.maintenanceDivider, { backgroundColor: colors.cardBorder }]} />

            {missingFields.length > 0 ? (
              <View style={styles.maintenancePromptRow}>
                <Text style={[styles.maintenancePromptText, { color: colors.textSecondary }]}>
                  Add {missingFields.join(', ')} to calculate.
                </Text>
                {(!hasHeight || !hasGender) && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    activeOpacity={0.7}
                    style={styles.promptActionBtn}
                  >
                    <Text style={[styles.promptActionText, { color: colors.primary }]}>
                      Go to Settings ›
                    </Text>
                  </TouchableOpacity>
                )}
                {!hasWeight && hasHeight && hasGender && (
                  <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.7}
                    style={styles.promptActionBtn}
                  >
                    <Text style={[styles.promptActionText, { color: colors.primary }]}>
                      + Add Weight ›
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.maintenancePromptRow}>
                <Text style={[styles.maintenancePromptText, { color: colors.textMuted }]}>
                  Daily calorie intake estimated to maintain your weight at {currentWeight?.toFixed(1)} {weightUnit}.
                </Text>
              </View>
            )}
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
                    index < displayLimit - 1 && {
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
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(entry)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M3 6h18" />
                        <Path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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
          onChangeText={(text) => setNewWeight(sanitizeWeightInput(text))}
          placeholder={`Enter weight in ${weightUnit}`}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Button
          title="Save"
          onPress={async () => {
            const weight = parseFloat(newWeight);
            if (weight > 0) {
              try {
                await weightStore.addEntry(auth.user!.id, weight);
                setNewWeight('');
                setShowAddModal(false);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to add weight entry');
              }
            }
          }}
          fullWidth
          style={{ backgroundColor: colors.text, marginTop: spacing.base }}
          textStyle={{ color: colors.background }}
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
                await weightStore.loadEntries(auth.user!.id);
                await weightStore.loadStats(auth.user!.id);
                setGoalInput('');
                setShowGoalModal(false);
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to set goal weight');
              }
            }
          }}
          fullWidth
          style={{ backgroundColor: colors.text, marginTop: spacing.base }}
          textStyle={{ color: colors.background }}
        />
      </Modal>

      {/* Custom Delete Confirmation Alert */}
      <CustomAlert
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Weight Entry"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.weight.toFixed(1)} ${weightUnit} from ${formatDate(deleteTarget.date, 'short')}?` : ''}
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setDeleteTarget(null) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (deleteTarget) {
                try {
                  if (auth.user?.id) {
                    await weightStore.deleteEntry(auth.user.id, deleteTarget.id);
                  }
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to delete entry');
                } finally {
                  setDeleteTarget(null);
                }
              }
            },
          },
        ]}
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
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  goalButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalUnderAdd: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
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
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyChevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  maintenanceCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  maintenanceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  maintenanceIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maintenanceIconText: {
    fontSize: 22,
  },
  maintenanceInfoGroup: {
    flex: 1,
  },
  maintenanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  maintenanceValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  maintenanceValText: {
    fontSize: 22,
    fontWeight: '700',
  },
  maintenanceUnitText: {
    fontSize: 13,
    fontWeight: '500',
  },
  maintenanceDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  maintenancePromptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  maintenancePromptText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  promptActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  promptActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});