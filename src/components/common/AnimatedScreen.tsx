import React, { memo, ReactNode, useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { durations } from '../../theme';

interface AnimatedScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  delay?: number;
}

export const AnimatedScreen = memo<AnimatedScreenProps>(({
  children,
  style,
  delay = 0,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: durations.pageEntrance, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: durations.pageEntrance, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
});

AnimatedScreen.displayName = 'AnimatedScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
