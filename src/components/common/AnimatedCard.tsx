import React, { memo, ReactNode, useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, shadow, durations, staggerDelay } from '../../theme';

interface AnimatedCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
  borderRadius?: keyof typeof radius;
  elevated?: boolean;
  index?: number;
  animated?: boolean;
}

export const AnimatedCard = memo<AnimatedCardProps>(({
  children,
  style,
  padding = 'xl',
  borderRadius = 'lg',
  elevated = false,
  index = 0,
  animated = true,
}) => {
  const colors = useColors();
  const opacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 16 : 0);

  useEffect(() => {
    if (animated) {
      const delay = index * staggerDelay.base;
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: durations.slower, easing: Easing.out(Easing.cubic) }),
      );
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: durations.slower, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [animated, index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const cardStyles: ViewStyle = {
    backgroundColor: colors.cardSurface,
    borderRadius: radius[borderRadius],
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: spacing[padding],
    ...(elevated && { ...shadow.md }),
  };

  return (
    <Animated.View style={[cardStyles, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
});

AnimatedCard.displayName = 'AnimatedCard';
