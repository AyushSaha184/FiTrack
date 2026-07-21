import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { WeightTrackerScreen } from '../screens/main/WeightTrackerScreen';
import { WorkoutScreen } from '../screens/main/WorkoutScreen';
import { StepsTrackerScreen } from '../screens/main/StepsTrackerScreen';
import { useColors } from '../hooks';
import { spacing, radius } from '../theme';
import type { MainTabParamList } from '../types/navigation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_ORDER: (keyof MainTabParamList)[] = ['WeightTab', 'HomeTab', 'StepsTab'];

// SVG Icons
const WeightIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <Path d="M8 7h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
    <Path d="M12 11v-3" strokeWidth={2} />
  </Svg>
);

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

const FootprintsIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 12.5C8 10 9 8 10 5a1 1 0 0 0-1-1.25C7.25 4 6 5.5 5.5 8c-.3 1.5-.5 3-.5 5 0 2.5 1 4 2.5 4.5.8.3 1.7-.2 1.7-1v-4Z" />
    <Circle cx="8" cy="2" r="1" fill={color} />
    <Circle cx="10" cy="2.5" r="0.8" fill={color} />
    <Path d="M16 15.5C16 13 15 11 14 8a1 1 0 0 0 1-1.25C16.75 7 18 8.5 18.5 11c.3 1.5.5 3 .5 5 0 2.5-1 4-2.5 4.5-.8.3-1.7-.2-1.7-1v-4Z" />
    <Circle cx="16" cy="5" r="1" fill={color} />
    <Circle cx="14" cy="5.5" r="0.8" fill={color} />
  </Svg>
);

// Custom tab icon with animated pill indicator
interface TabItemProps {
  focused: boolean;
  label: string;
  renderIcon: (color: string) => React.ReactNode;
}

const TabItem = ({ focused, label, renderIcon }: TabItemProps) => {
  const colors = useColors();
  const scale = useSharedValue(focused ? 1 : 0.92);
  const pillWidth = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, {
      damping: 18,
      stiffness: 280,
      mass: 0.7,
    });
    pillWidth.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 280,
      mass: 0.7,
    });
  }, [focused]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedPillStyle = useAnimatedStyle(() => ({
    opacity: pillWidth.value,
    transform: [{ scaleX: pillWidth.value }],
  }));

  const iconColor = focused ? colors.text : colors.textMuted;

  return (
    <Animated.View style={[styles.tabItemContainer, animatedContainerStyle]}>
      <Animated.View
        style={[
          styles.tabPill,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          animatedPillStyle,
        ]}
      />
      <View style={styles.tabContent}>
        <View style={styles.tabIcon}>
          {renderIcon(iconColor)}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: focused ? colors.text : colors.textMuted,
              fontWeight: focused ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
};

export const MainTabNavigator = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState<number>(1); // HomeTab default
  const activeIndexRef = useRef<number>(1);
  activeIndexRef.current = activeIndex;

  const translateX = useSharedValue(-SCREEN_WIDTH);
  const startX = useSharedValue(-SCREEN_WIDTH);
  const touchAbsoluteY = useSharedValue(0);

  const goToTab = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(TAB_ORDER.length - 1, index));
    setActiveIndex(clampedIndex);
    translateX.value = withTiming(-clampedIndex * SCREEN_WIDTH, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onStart((e) => {
      'worklet';
      startX.value = translateX.value;
      touchAbsoluteY.value = e.absoluteY;
    })
    .onUpdate((e) => {
      'worklet';
      const topBoundary = insets.top + 55;
      const bottomBoundary = SCREEN_HEIGHT - (80 + insets.bottom);

      if (touchAbsoluteY.value < topBoundary || touchAbsoluteY.value > bottomBoundary) {
        return;
      }

      // 1:1 continuous finger movement across screens
      const rawX = startX.value + e.translationX;
      // Clamp edge bounds with slight resistance
      const maxLeft = 0;
      const maxRight = -(TAB_ORDER.length - 1) * SCREEN_WIDTH;

      if (rawX > maxLeft) {
        translateX.value = maxLeft + (rawX - maxLeft) * 0.2;
      } else if (rawX < maxRight) {
        translateX.value = maxRight + (rawX - maxRight) * 0.2;
      } else {
        translateX.value = rawX;
      }
    })
    .onEnd((e) => {
      'worklet';
      const topBoundary = insets.top + 55;
      const bottomBoundary = SCREEN_HEIGHT - (80 + insets.bottom);

      const currentIdx = Math.max(
        0,
        Math.min(TAB_ORDER.length - 1, Math.round(-startX.value / SCREEN_WIDTH))
      );

      if (touchAbsoluteY.value < topBoundary || touchAbsoluteY.value > bottomBoundary) {
        translateX.value = withTiming(-currentIdx * SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        return;
      }

      const draggedDist = e.translationX;
      const velocity = e.velocityX;

      let newIndex = currentIdx;
      if (draggedDist < -SCREEN_WIDTH * 0.15 || velocity < -300) {
        newIndex = Math.min(TAB_ORDER.length - 1, currentIdx + 1);
      } else if (draggedDist > SCREEN_WIDTH * 0.15 || velocity > 300) {
        newIndex = Math.max(0, currentIdx - 1);
      }

      runOnJS(goToTab)(newIndex);
    });

  const animatedPagerStyle = useAnimatedStyle(() => ({
    width: SCREEN_WIDTH * TAB_ORDER.length,
    flex: 1,
    flexDirection: 'row',
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedPagerStyle}>
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <WeightTrackerScreen />
          </View>
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <WorkoutScreen />
          </View>
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <StepsTrackerScreen />
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Custom Bottom Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: '#0C0C0C',
            borderColor: colors.cardBorder,
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: spacing.sm,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => goToTab(0)}
          activeOpacity={0.7}
        >
          <TabItem
            focused={activeIndex === 0}
            label="Weight"
            renderIcon={(color) => <WeightIcon color={color} />}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => goToTab(1)}
          activeOpacity={0.7}
        >
          <TabItem
            focused={activeIndex === 1}
            label="Home"
            renderIcon={(color) => <HomeIcon color={color} />}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => goToTab(2)}
          activeOpacity={0.7}
        >
          <TabItem
            focused={activeIndex === 2}
            label="Steps"
            renderIcon={(color) => <FootprintsIcon color={color} />}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    minWidth: 72,
  },
  tabPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
    borderRadius: radius.pill,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabIcon: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});