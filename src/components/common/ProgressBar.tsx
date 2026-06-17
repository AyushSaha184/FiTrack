import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface ProgressBarProps {
  progress: number;
  height?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
  trackColor?: string;
  animated?: boolean;
}

export const ProgressBar = memo<ProgressBarProps>(({
  progress,
  height = 8,
  showLabel = false,
  label,
  color,
  trackColor,
  animated = true,
}) => {
  const colors = useColors();
  const progressValue = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progressValue.value = withTiming(Math.min(100, Math.max(0, progress)), {
        duration: 600,
      });
    } else {
      progressValue.value = Math.min(100, Math.max(0, progress));
    }
  }, [progress, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  return (
    <View style={styles.container}>
      {(showLabel || label) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {label}
            </Text>
          )}
          {showLabel && (
            <Text style={[styles.percentage, { color: colors.text }]}>
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            backgroundColor: trackColor || colors.cardBorder,
            height,
            borderRadius: height / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color || colors.progress,
              height,
              borderRadius: height / 2,
            },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  percentage: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});