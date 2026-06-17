import React, { memo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  compact?: boolean;
  style?: ViewStyle;
}

export const SegmentedControl = memo<SegmentedControlProps>(({
  options,
  selectedValue,
  onValueChange,
  compact = false,
  style,
}) => {
  const colors = useColors();
  const selectedIndex = options.findIndex((o) => o.value === selectedValue);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(selectedIndex * (100 / options.length), {
      damping: 20,
      stiffness: 300,
    });
  }, [selectedIndex, options.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${translateX.value}%`,
    width: `${100 / options.length}%`,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardSurface,
          borderColor: colors.cardBorder,
        },
        compact && styles.compact,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: colors.primary },
          indicatorStyle,
        ]}
      />
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={styles.option}
          onPress={() => onValueChange(option.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              {
                color:
                  option.value === selectedValue
                    ? '#FFFFFF'
                    : colors.textSecondary,
              },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

SegmentedControl.displayName = 'SegmentedControl';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 2,
    position: 'relative',
  },
  compact: {
    padding: 1,
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: radius.sm,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});