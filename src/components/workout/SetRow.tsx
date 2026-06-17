import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';
import type { Set } from '../../models';

interface SetRowProps {
  set: Set;
  setNumber: number;
  weightUnit?: 'kg' | 'lbs';
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onToggleComplete: () => void;
  onDelete?: () => void;
  onStartRest?: () => void;
}

export const SetRow = memo<SetRowProps>(({
  set,
  setNumber,
  weightUnit = 'kg',
  onWeightChange,
  onRepsChange,
  onToggleComplete,
  onDelete,
  onStartRest,
}) => {
  const colors = useColors();
  const checkScale = useSharedValue(1);
  const [weightText, setWeightText] = useState(set.weight > 0 ? String(set.weight) : '');
  const [repsText, setRepsText] = useState(set.reps > 0 ? String(set.reps) : '');

  // Sync local state when props change (e.g. after toggling completion)
  useEffect(() => {
    setWeightText(set.weight > 0 ? String(set.weight) : '');
  }, [set.weight]);

  useEffect(() => {
    setRepsText(set.reps > 0 ? String(set.reps) : '');
  }, [set.reps]);

  const handleToggleComplete = () => {
    checkScale.value = withSpring(1.2, { damping: 10, stiffness: 400 }, () => {
      checkScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });
    onToggleComplete();
  };

  const handleWeightBlur = () => {
    const val = parseFloat(weightText);
    if (!isNaN(val) && val >= 0) {
      onWeightChange(val);
    } else {
      setWeightText(set.weight > 0 ? String(set.weight) : '');
    }
  };

  const handleRepsBlur = () => {
    const val = parseInt(repsText);
    if (!isNaN(val) && val >= 0) {
      onRepsChange(val);
    } else {
      setRepsText(set.reps > 0 ? String(set.reps) : '');
    }
  };

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const getCheckColor = () => {
    if (set.completed) return colors.success;
    return colors.textMuted;
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.cardBorder }]}>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton} activeOpacity={0.6}>
          <View style={[styles.deleteIconContainer, { backgroundColor: 'rgba(255,80,80,0.1)' }]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 6h18" />
              <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </Svg>
          </View>
        </TouchableOpacity>
      )}
      <View style={styles.setNumber}>
        <Text style={[styles.setNumberText, { color: colors.textSecondary }]}>
          {setNumber}
        </Text>
      </View>

      <View
        style={[
          styles.weightContainer,
          { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          set.completed && { opacity: 0.5 },
        ]}
      >
        <TextInput
          style={[styles.inputText, { color: colors.text }]}
          value={weightText}
          onChangeText={setWeightText}
          onBlur={handleWeightBlur}
          keyboardType="decimal-pad"
          placeholder="-"
          placeholderTextColor={colors.textMuted}
          textAlign="center"
          selectTextOnFocus
          editable={!set.completed}
        />
      </View>

      <View
        style={[
          styles.repsContainer,
          { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          set.completed && { opacity: 0.5 },
        ]}
      >
        <TextInput
          style={[styles.inputText, { color: colors.text }]}
          value={repsText}
          onChangeText={setRepsText}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          placeholder="-"
          placeholderTextColor={colors.textMuted}
          textAlign="center"
          selectTextOnFocus
          editable={!set.completed}
        />
      </View>

      <TouchableOpacity
        onPress={handleToggleComplete}
        style={styles.checkButton}
        activeOpacity={0.7}
      >
        <Animated.View style={[checkAnimatedStyle]}>
          <View
            style={[
              styles.checkCircle,
              {
                borderColor: getCheckColor(),
                backgroundColor: set.completed ? colors.success : 'transparent',
              },
            ]}
          >
            {set.completed && (
              <Text style={styles.checkMark}>✓</Text>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

SetRow.displayName = 'SetRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  setNumber: {
    width: 32,
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  deleteButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  deleteIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 40,
  },
  repsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 40,
  },
  inputText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: spacing.sm,
  },
  checkButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});