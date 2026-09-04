import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography, responsive } from '../../theme';
import type { Set } from '../../models';

interface SetRowProps {
  set: Set;
  setId: string;
  setNumber: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _weightUnit?: 'kg' | 'lbs';
  onWeightChange: (setId: string, weight: number) => void;
  onRepsChange: (setId: string, reps: number) => void;
  onToggleComplete: (setId: string) => void;
  onDelete?: (setId: string) => void;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _onStartRest?: (setId: string) => void;
}

// Hoist pure sanitizers outside component (rerender-hoist-jsx)
const sanitizeWeightInput = (raw: string): string => {
  let text = raw.replace(/[^0-9.]/g, '');
  const dotIndex = text.indexOf('.');
  if (dotIndex !== -1) {
    text = text.slice(0, dotIndex + 1) + text.slice(dotIndex + 1).replace(/\./g, '');
  }
  return text.slice(0, 6);
};

const sanitizeRepsInput = (raw: string): string => {
  return raw.replace(/[^0-9]/g, '').slice(0, 4);
};

// Use uncontrolled TextInputs keyed off the set id + value. The `key` reset
// pattern means React remounts the input (and re-initialises defaultValue)
// whenever the underlying set is replaced (e.g. after a successful blur that
// round-trips through the store). This avoids the previous
// useEffect->setState double-render that fired on every weight/reps change.
export const SetRow = memo<SetRowProps>(({
  set,
  setId,
  setNumber,
  _weightUnit = 'kg',
  onWeightChange,
  onRepsChange,
  onToggleComplete,
  onDelete,
  _onStartRest,
}) => {
  const colors = useColors();
  const checkScale = useSharedValue(1);
  const [uncontrolledWeight, setUncontrolledWeight] = useState<string>(() =>
    set.weight > 0 ? String(set.weight) : ''
  );
  const [uncontrolledReps, setUncontrolledReps] = useState<string>(() =>
    set.reps > 0 ? String(set.reps) : ''
  );

  const handleToggleComplete = useCallback(() => {
    // Use .set() for React Compiler compatibility (react-compiler-reanimated-shared-values)
    checkScale.set(
      withSpring(1.2, { damping: 10, stiffness: 400 }, () => {
        checkScale.set(withSpring(1, { damping: 15, stiffness: 300 }));
      })
    );
    onToggleComplete(setId);
  }, [checkScale, onToggleComplete, setId]);

  const handleWeightChange = useCallback((text: string) => {
    setUncontrolledWeight(sanitizeWeightInput(text));
  }, []);

  const handleRepsChange = useCallback((text: string) => {
    setUncontrolledReps(sanitizeRepsInput(text));
  }, []);

  const handleWeightBlur = useCallback(() => {
    const val = parseFloat(uncontrolledWeight);
    if (!isNaN(val) && val >= 0) {
      onWeightChange(setId, val);
    } else {
      setUncontrolledWeight(set.weight > 0 ? String(set.weight) : '');
    }
  }, [uncontrolledWeight, onWeightChange, setId, set.weight]);

  const handleRepsBlur = useCallback(() => {
    const val = parseInt(uncontrolledReps);
    if (!isNaN(val) && val >= 0) {
      onRepsChange(setId, val);
    } else {
      setUncontrolledReps(set.reps > 0 ? String(set.reps) : '');
    }
  }, [uncontrolledReps, onRepsChange, setId, set.reps]);

  const handleDelete = useCallback(() => {
    onDelete?.(setId);
  }, [onDelete, setId]);

  // Use .get() for React Compiler compatibility (react-compiler-reanimated-shared-values)
  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.get() }],
  }));

  const getCheckColor = () => {
    if (set.completed) return colors.success;
    return colors.textMuted;
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.cardBorder }]}>
      {onDelete ? (
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
        >
          <View style={[styles.deleteIconContainer, { backgroundColor: colors.error + '20' }]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 6h18" />
              <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </Svg>
          </View>
        </Pressable>
      ) : null}
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
          key={`w-${setId}-${set.weight}`}
          style={[styles.inputText, { color: colors.text }]}
          defaultValue={uncontrolledWeight}
          onChangeText={handleWeightChange}
          onBlur={handleWeightBlur}
          keyboardType="number-pad"
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
          key={`r-${setId}-${set.reps}`}
          style={[styles.inputText, { color: colors.text }]}
          defaultValue={uncontrolledReps}
          onChangeText={handleRepsChange}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          placeholder="-"
          placeholderTextColor={colors.textMuted}
          textAlign="center"
          selectTextOnFocus
          editable={!set.completed}
        />
      </View>

      <Pressable
        onPress={handleToggleComplete}
        style={({ pressed }) => [styles.checkButton, pressed && { opacity: 0.7 }]}
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
            {set.completed ? (
              <Text style={styles.checkMark}>✓</Text>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

SetRow.displayName = 'SetRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1.5,
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
    borderWidth: 1.5,
    height: 40,
  },
  repsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
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
    fontSize: responsive.font(14),
    fontWeight: '700',
  },
});