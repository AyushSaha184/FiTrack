import React, { memo, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Module-scope lookup tables so we don't allocate a new style object per
// variant/size combination on every render. Each entry is a static object
// referencing theme tokens (which are themselves stable references).
const PADDING_BY_SIZE: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
  small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
  medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
};

const FONT_SIZE_BY_SIZE: Record<ButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

export const Button = memo<ButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePressIn = () => {
    scale.set(withSpring(0.96, { damping: 14, stiffness: 350, mass: 0.5 }));
  };

  const handlePressOut = () => {
    scale.set(withSpring(1, { damping: 14, stiffness: 350, mass: 0.5 }));
  };

  const backgroundColor = disabled
    ? colors.textMuted
    : variant === 'primary'
    ? colors.primary
    : variant === 'secondary'
    ? colors.cardSurface
    : 'transparent';

  const textColor = disabled
    ? colors.textMuted
    : variant === 'primary'
    ? '#FFFFFF'
    : variant === 'secondary'
    ? colors.text
    : colors.primary;

  const containerStyles: ViewStyle = useMemo(
    () => ({
      backgroundColor,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...PADDING_BY_SIZE[size],
      ...(variant === 'outline'
        ? { borderWidth: 1, borderColor: disabled ? colors.textMuted : colors.primary }
        : {}),
      ...(fullWidth ? { width: '100%' } : {}),
      ...(variant === 'secondary'
        ? { backgroundColor: colors.cardSurface, borderWidth: 1, borderColor: colors.cardBorder }
        : {}),
    }),
    [backgroundColor, size, variant, fullWidth, disabled, colors.textMuted, colors.primary, colors.cardSurface, colors.cardBorder]
  );

  const textBaseStyle: TextStyle = useMemo(
    () => ({
      color: textColor,
      fontSize: FONT_SIZE_BY_SIZE[size],
      fontWeight: '600' as const,
      marginLeft: icon && iconPosition === 'left' ? spacing.sm : 0,
      marginRight: icon && iconPosition === 'right' ? spacing.sm : 0,
    }),
    [textColor, size, icon, iconPosition]
  );

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[containerStyles, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={[textBaseStyle, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </AnimatedTouchable>
  );
});

Button.displayName = 'Button';
