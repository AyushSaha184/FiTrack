import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
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

// Get appropriate emoji icon based on equipment type
const getEquipmentIcon = (equipment?: string): string => {
  switch (equipment?.toLowerCase()) {
    case 'barbell':
      return '🏋️';
    case 'dumbbell':
      return '🏋️‍♂️';
    case 'machine':
      return '⚙️';
    case 'cable':
      return '🔗';
    case 'bodyweight':
      return '🤸';
    case 'kettlebell':
      return '🔔';
    case 'resistance_band':
      return '🎗️';
    default:
      return '💪';
  }
};

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const completedSetsCount = exercise.sets.filter((s) => s.completed).length;
  const totalSetsCount = exercise.sets.length;

  return (
    <Card
      padding="base"
      style={[
        styles.container,
        isDragging && {
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 2.5,
          backgroundColor: '#1C1C1E',
        },
      ]}
    >
      {/* Header — Tapping exercise name line expands/collapses card */}
      <View style={[styles.header, isCollapsed && { marginBottom: 0 }]}>
        <TouchableOpacity
          style={styles.exerciseInfo}
          onPress={() => setIsCollapsed(!isCollapsed)}
          activeOpacity={0.7}
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

            {isCollapsed && (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {totalSetsCount} {totalSetsCount === 1 ? 'set' : 'sets'}
                {completedSetsCount > 0 ? ` (${completedSetsCount} completed)` : ''}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Delete Icon Button */}
        <TouchableOpacity
          onPress={onRemoveExercise}
          style={styles.deleteButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        </TouchableOpacity>
      </View>

      {/* Table & Content (Hidden when collapsed) */}
      {!isCollapsed && (
        <>
          <View style={styles.tableHeader}>
            <View style={{ width: 24 + spacing.xs }} />
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
              setNumber={index + 1}
              weightUnit={weightUnit}
              onWeightChange={(weight) => onUpdateSet(set.id, { weight })}
              onRepsChange={(reps) => onUpdateSet(set.id, { reps })}
              onToggleComplete={() => onToggleSetComplete(set.id)}
              onDelete={() => onRemoveSet(set.id)}
              onStartRest={onStartRest ? () => onStartRest(set.id) : undefined}
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
      )}
    </Card>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  iconText: {
    fontSize: 22,
  },
  exerciseImage: {
    width: 28,
    height: 28,
  },
  textInfo: {
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