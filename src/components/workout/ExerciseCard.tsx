import React, { memo, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useColors } from '../../hooks';
import { spacing, typography } from '../../theme';
import { storage } from '../../utils/storage';
import { Card } from '../common/Card';
import { SetRow } from './SetRow';
import { Button } from '../common/Button';
import type { WorkoutExercise, Set } from '../../models';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  weightUnit?: 'kg' | 'lbs';
  onAddSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<Set>) => void;
  onToggleSetComplete: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onStartRest?: (setId: string) => void;
  isDragging?: boolean;
}

export const ExerciseCard = memo<ExerciseCardProps>(({
  exercise,
  weightUnit = 'kg',
  onAddSet,
  onUpdateSet,
  onToggleSetComplete,
  onRemoveSet,
  onRemoveExercise,
  onStartRest,
  isDragging = false,
}) => {
  const colors = useColors();
  const collapsedKey = exercise.exerciseId || exercise.id;

  // Lazy state init
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const map = storage.get<Record<string, boolean>>('workout.collapsed_exercises') || {};
    return !!map[collapsedKey];
  });

  // Functional setState updater with useCallback (rerender-functional-setstate)
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      const map = storage.get<Record<string, boolean>>('workout.collapsed_exercises') || {};
      map[collapsedKey] = nextState;
      storage.set('workout.collapsed_exercises', map);
      return nextState;
    });
  }, [collapsedKey]);

  // Stable callbacks for SetRow instances (list-performance-callbacks)
  const handleWeightChange = useCallback(
    (setId: string, weight: number) => {
      onUpdateSet(setId, { weight });
    },
    [onUpdateSet]
  );

  const handleRepsChange = useCallback(
    (setId: string, reps: number) => {
      onUpdateSet(setId, { reps });
    },
    [onUpdateSet]
  );

  // Derived counts during render (rerender-derived-state-no-effect)
  const completedSetsCount = useMemo(
    () => exercise.sets.filter((s) => s.completed).length,
    [exercise.sets]
  );
  const totalSetsCount = exercise.sets.length;

  return (
    <Card
      padding="base"
      style={[
        styles.container,
        isDragging && styles.draggingContainer,
      ]}
    >
      {/* Header — Tapping exercise name line expands/collapses card */}
      <View style={[styles.header, isCollapsed && styles.headerCollapsed]}>
        <Pressable
          style={styles.exerciseInfo}
          onPress={toggleCollapse}
        >
          <View style={styles.nameContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                {exercise.exercise?.name || 'Exercise'}
              </Text>
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textMuted}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: [{ rotate: isCollapsed ? '180deg' : '0deg' }],
                  marginLeft: spacing.xs,
                }}
              >
                <Polyline points="18 15 12 9 6 15" />
              </Svg>
            </View>

            {isCollapsed ? (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {totalSetsCount} {totalSetsCount === 1 ? 'set' : 'sets'}
                {completedSetsCount > 0 ? ` (${completedSetsCount} completed)` : ''}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Delete Icon Button (ui-pressable) */}
        <Pressable
          onPress={onRemoveExercise}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.error || '#FF453A'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <Line x1="10" y1="11" x2="10" y2="17" />
            <Line x1="14" y1="11" x2="14" y2="17" />
          </Svg>
        </Pressable>
      </View>

      {/* Table & Content (Hidden when collapsed) */}
      {!isCollapsed ? (
        <>
          <View style={styles.tableHeader}>
            <View style={styles.tableHeaderSpacer} />
            <Text style={[styles.headerText, styles.setCol, { color: colors.textMuted }]}>
              SET
            </Text>
            <Text style={[styles.headerText, styles.weightCol, { color: colors.textMuted }]}>
              WEIGHT ({weightUnit.toUpperCase()})
            </Text>
            <Text style={[styles.headerText, styles.repsCol, { color: colors.textMuted }]}>
              REPS
            </Text>
            <Text style={[styles.headerText, styles.doneCol, { color: colors.textMuted }]}>
              DONE
            </Text>
          </View>

          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              setId={set.id}
              setNumber={index + 1}
              _weightUnit={weightUnit}
              onWeightChange={handleWeightChange}
              onRepsChange={handleRepsChange}
              onToggleComplete={onToggleSetComplete}
              onDelete={onRemoveSet}
              _onStartRest={onStartRest}
            />
          ))}

          <Button
            title="Add Set"
            onPress={onAddSet}
            variant="ghost"
            size="small"
            icon={<Text style={{ color: colors.text }}>+</Text>}
            style={styles.addSetButton}
          />
        </>
      ) : null}
    </Card>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  draggingContainer: {
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2.5,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  headerCollapsed: {
    marginBottom: 0,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.h5.fontSize,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.xs,
  },
  tableHeaderSpacer: {
    width: 24 + spacing.xs,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  setCol: {
    width: 32,
    textAlign: 'center',
  },
  weightCol: {
    flex: 1,
    textAlign: 'center',
  },
  repsCol: {
    flex: 1,
    textAlign: 'center',
  },
  doneCol: {
    width: 44,
    textAlign: 'center',
  },
  addSetButton: {
    marginTop: spacing.base,
    alignSelf: 'center',
  },
});
