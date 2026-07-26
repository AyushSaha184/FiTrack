import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import Svg, { Path, Line, Polyline } from 'react-native-svg';
import { useColors, useSpacing, useTypography, useWorkoutStore } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
import { collections } from '../../services/firebase/firestore';
import { workoutsService } from '../../services/firebase/workoutsService';
import { aiService } from '../../services/ai/aiService';
import { storage } from '../../utils/storage';
import { dateKey } from '../../utils/helpers';
import type { Workout, WorkoutExercise } from '../../models';
import { logger } from '../../utils/logger';

// Enable layout animations for smooth collapse/expand on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SetInfo {
  weight: number;
  reps: number;
}

interface WeekProgress {
  weekLabel: string;
  dateStr: string;
  sets: SetInfo[];
}

interface ExerciseHistory {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  statusTag: string | null; // e.g. "Added 2 weeks ago", "Removed 1 week ago"
  weeks: WeekProgress[];
}

export const ExerciseProgressScreen = observer(() => {
  const colors = useColors();
  const spacing = useSpacing();
  const typography = useTypography();
  const navigation = useNavigation();
  const workoutStore = useWorkoutStore();

  const [loading, setLoading] = useState(true);
  const [exerciseHistories, setExerciseHistories] = useState<ExerciseHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const handleGenerateReport = async () => {
    if (exerciseHistories.length === 0) return;

    const keys = aiService.getSavedKeys();
    if (keys.length === 0) {
      Alert.alert(
        'Setup Required',
        'Please add at least one AI API key in the settings menu to generate weekly reports.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings' as any) }
        ]
      );
      return;
    }

    try {
      setGenerating(true);

      const minifiedHistory = exerciseHistories.map((h) => ({
        exercise: h.name,
        weeks: h.weeks.map((w) => ({
          week: w.weekLabel,
          date: w.dateStr,
          sets: w.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      }));

      const reportResult = await aiService.generateReport(JSON.stringify(minifiedHistory));
      navigation.navigate('AIReport' as any, { report: reportResult });
    } catch (err: any) {
      logger.error('[ExerciseProgressScreen] Failed to generate AI report:', err);
      Alert.alert(
        'Generation Failed',
        err.message || 'An error occurred while generating your progress report. Please check your network and API keys.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const userId = workoutStore.userId;
      const targetDay = workoutStore.selectedDay; // e.g., 'MON', 'TUE'

      // Calculate 30 days ago limit
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

      const parseLocalDate = (dateStr: string): Date => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-indexed
          const day = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };

      const parseDateSafely = (val: any): Date => {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            return parseLocalDate(val);
          }
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date(val);
      };

      const getDayOfWeekKeyFromDate = (date: Date): string => {
        const keys = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        return keys[date.getDay()];
      };

      // 1. Get workouts from local MMKV storage
      const localWorkouts: Workout[] = [];
      const allKeys = storage.getAllKeys();

      allKeys.forEach((key: string) => {
        if (key.startsWith('workout.archive.')) {
          const dateStr = key.replace('workout.archive.', '');
          const keyDate = parseDateSafely(dateStr);
          if (!isNaN(keyDate.getTime()) && keyDate >= thirtyDaysAgo) {
            const archives = storage.get<any[]>(key) || [];
            archives.forEach((arc) => {
              if (arc.workout) {
                // Determine day of week
                const d = parseDateSafely(arc.workout.date);
                const arcDayKey = getDayOfWeekKeyFromDate(d);

                if (arcDayKey === targetDay) {
                  localWorkouts.push({
                    id: arc.workout.id || key,
                    userId: userId || 'local',
                    name: arc.workout.name || 'Workout',
                    type: arc.workout.type || 'custom',
                    date: d,
                    completed: true,
                    totalVolume: 0,
                    exercises: arc.exercises || [],
                    createdAt: d,
                    updatedAt: d,
                  });
                }
              }
            });
          }
        }
      });

      // 2. Fetch workouts from Firestore if logged in
      let dbWorkouts: Workout[] = [];
      if (userId) {
        try {
          dbWorkouts = await workoutsService.getWorkouts(
            userId,
            thirtyDaysAgoIso,
            new Date().toISOString()
          );
        } catch (err) {
          logger.error('[ExerciseProgressScreen] Failed to fetch workouts from DB:', err);
        }
      }

      // 3. Merge Local and DB workouts (remove duplicates by date/id)
      const mergedWorkoutsMap = new Map<string, Workout>();
      
      // Filter for target day of week
      const filterAndAdd = (workoutList: Workout[]) => {
        workoutList.forEach((w) => {
          const wDate = parseDateSafely(w.date);
          const wDayKey = getDayOfWeekKeyFromDate(wDate);
          if (wDayKey === targetDay) {
            const keyStr = dateKey(wDate);
            mergedWorkoutsMap.set(keyStr, {
              ...w,
              date: wDate,
            });
          }
        });
      };

      filterAndAdd(localWorkouts);
      filterAndAdd(dbWorkouts);

      // Sort workouts: newest to oldest
      const sortedWorkouts = Array.from(mergedWorkoutsMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Take the last 4 weeks (sessions)
      const lastFourWorkouts = sortedWorkouts.slice(0, 4);

      if (lastFourWorkouts.length === 0) {
        setExerciseHistories([]);
        setLoading(false);
        return;
      }

      // Collect all exercises seen in today's active workout or any of the last 4 workouts
      const todayExercises = workoutStore.activeWorkoutExercises;
      const allExerciseIds = new Set<string>();
      const exerciseMeta = new Map<string, { name: string; muscleGroup: string }>();

      todayExercises.forEach((ex) => {
        if (ex.exerciseId && ex.exercise) {
          allExerciseIds.add(ex.exerciseId);
          exerciseMeta.set(ex.exerciseId, {
            name: ex.exercise.name,
            muscleGroup: ex.exercise.muscleGroup || 'chest',
          });
        }
      });

      lastFourWorkouts.forEach((w) => {
        w.exercises.forEach((ex) => {
          if (ex.exerciseId && ex.exercise) {
            allExerciseIds.add(ex.exerciseId);
            exerciseMeta.set(ex.exerciseId, {
              name: ex.exercise.name,
              muscleGroup: ex.exercise.muscleGroup || 'chest',
            });
          }
        });
      });

      // Build histories
      const histories: ExerciseHistory[] = [];

      allExerciseIds.forEach((exId) => {
        const meta = exerciseMeta.get(exId)!;
        const weeksData: WeekProgress[] = [];

        // For each of the last 4 workouts, extract the sets for this exercise
        lastFourWorkouts.forEach((w, index) => {
          const matchedEx = w.exercises.find((ex) => ex.exerciseId === exId);
          const wDate = new Date(w.date);
          const formattedDate = wDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

          weeksData.push({
            weekLabel: `Week ${index + 1}`,
            dateStr: formattedDate,
            sets: matchedEx
              ? matchedEx.sets.map((s) => ({
                  weight: s.weight,
                  reps: s.reps,
                }))
              : [],
          });
        });

        // Determine statusTag (Added / Removed)
        let statusTag: string | null = null;
        const isPresentToday = todayExercises.some((ex) => ex.exerciseId === exId);

        if (isPresentToday) {
          // Check if it was NOT present in past weeks (i.e. newly added)
          // Find first week index from end where it was performed
          let firstPerformedWeekIdx = -1;
          for (let i = weeksData.length - 1; i >= 0; i--) {
            if (weeksData[i].sets.length > 0) {
              firstPerformedWeekIdx = i;
              break;
            }
          }

          if (firstPerformedWeekIdx === 0) {
            statusTag = 'Added this week';
          } else if (firstPerformedWeekIdx > 0) {
            statusTag = `Added ${firstPerformedWeekIdx} week${firstPerformedWeekIdx > 1 ? 's' : ''} ago`;
          }
        } else {
          // It is not present today but was present in past weeks (i.e. removed)
          let lastPerformedWeekIdx = -1;
          for (let i = 0; i < weeksData.length; i++) {
            if (weeksData[i].sets.length > 0) {
              lastPerformedWeekIdx = i;
              break;
            }
          }

          if (lastPerformedWeekIdx === 0) {
            statusTag = 'Removed this week';
          } else if (lastPerformedWeekIdx > 0) {
            statusTag = `Removed ${lastPerformedWeekIdx} week${lastPerformedWeekIdx > 1 ? 's' : ''} ago`;
          }
        }

        histories.push({
          exerciseId: exId,
          name: meta.name,
          muscleGroup: meta.muscleGroup,
          statusTag,
          weeks: weeksData,
        });
      });

      setExerciseHistories(histories);
    } catch (err) {
      logger.error('[ExerciseProgressScreen] loadProgressData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Exercise Progress</Text>
        <View style={styles.headerActions}>
          {exerciseHistories.length > 0 && (
            <TouchableOpacity
              onPress={handleGenerateReport}
              disabled={generating}
              style={styles.generateButton}
              activeOpacity={0.7}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Report
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            activeOpacity={0.7}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Line x1="19" y1="12" x2="5" y2="12" />
              <Polyline points="12 19 5 12 12 5" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : exerciseHistories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            You just started working out
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {exerciseHistories.map((item) => {
            const isExpanded = expandedId === item.exerciseId;
            return (
              <View
                key={item.exerciseId}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleExpand(item.exerciseId)}
                  style={styles.cardHeader}
                  activeOpacity={0.8}
                >
                  <View style={styles.headerTextContainer}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name}</Text>
                    {item.statusTag && (
                      <Text
                        style={[
                          styles.statusTag,
                          {
                            color: colors.text,
                          },
                        ]}
                      >
                        {item.statusTag}
                      </Text>
                    )}
                  </View>
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.textSecondary}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  >
                    <Polyline points="6 9 12 15 18 9" />
                  </Svg>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.cardContent}>
                    <View style={styles.weeksGrid}>
                      {item.weeks.map((w, idx) => (
                        <View key={idx} style={[styles.weekGridCell, { borderColor: colors.cardBorder }]}>
                          <View style={styles.weekCellHeader}>
                            <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
                              {w.weekLabel}
                            </Text>
                            <Text style={[styles.weekDateSub, { color: colors.textMuted }]}>
                              {w.dateStr}
                            </Text>
                          </View>
                          {w.sets.length === 0 ? (
                            <Text style={[styles.noSetsText, { color: colors.textMuted }]}>
                              Not performed
                            </Text>
                          ) : (
                            <View style={styles.setsGridContainer}>
                              <View style={styles.setsHeaderRow}>
                                <Text style={[styles.setsHeaderText, { color: colors.textMuted }]}>Wt</Text>
                                <Text style={[styles.setsHeaderText, { color: colors.textMuted }]}>Reps</Text>
                              </View>
                              {w.sets.map((s, sIdx) => (
                                <View key={sIdx} style={styles.setRow}>
                                  <Text style={[styles.setText, { color: colors.text }]}>
                                    {s.weight}kg
                                  </Text>
                                  <Text style={[styles.setText, { color: colors.text }]}>
                                    {s.reps}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Fullscreen Loading Overlay */}
      {generating && (
        <View style={[styles.overlayContainer, { backgroundColor: colors.overlay }]}>
          <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingStatusText, { color: colors.text, marginTop: spacing.md }]}>
              Generating report...
            </Text>
            <Text style={[styles.loadingSubText, { color: colors.textMuted, marginTop: spacing.xs }]}>
              This may take up to 10 seconds
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
});



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  generateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  weeksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  weekGridCell: {
    width: '48.5%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  weekCellHeader: {
    marginBottom: 6,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekDateSub: {
    fontSize: 10,
    marginTop: 1,
  },
  noSetsText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  setsGridContainer: {
    marginTop: 4,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  setsHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    width: 50,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  setText: {
    fontSize: 11,
    fontWeight: '500',
    width: 50,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    width: 260,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingStatusText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
