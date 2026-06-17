import React, { memo, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = memo<InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue<string>(colors.cardBorder);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderColor.value = withTiming(colors.primary, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderColor.value = withTiming(error ? colors.error : colors.cardBorder, { duration: 200 });
    onBlur?.(e);
  };

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.cardBorder;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.cardSurface,
            borderColor: getBorderColor(),
          },
          animatedBorderStyle,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
            leftIcon ? { paddingLeft: 0 } : undefined,
            rightIcon ? { paddingRight: 0 } : undefined,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </Animated.View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: typography.body.fontSize,
  },
  iconLeft: {
    paddingLeft: spacing.base,
  },
  iconRight: {
    paddingRight: spacing.base,
  },
  error: {
    fontSize: typography.small.fontSize,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: typography.small.fontSize,
    marginTop: spacing.xs,
  },
});