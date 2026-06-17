import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { WeightTrackerScreen } from '../screens/main/WeightTrackerScreen';
import { WorkoutScreen } from '../screens/main/WorkoutScreen';
import { StepsTrackerScreen } from '../screens/main/StepsTrackerScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { useColors } from '../hooks';
import { spacing, radius } from '../theme';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator();

// HomeTab with nested stack for Settings
const HomeTabScreen = () => {
  const colors = useColors();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <HomeStack.Screen name="Workout" component={WorkoutScreen} />
      <HomeStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </HomeStack.Navigator>
  );
};

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

  React.useEffect(() => {
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

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#0C0C0C',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          height: 80 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing.sm,
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
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
      }}
      initialRouteName="HomeTab"
    >
      <Tab.Screen
        name="WeightTab"
        component={WeightTrackerScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem focused={focused} label="Weight" renderIcon={(color) => <WeightIcon color={color} />} />
          ),
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeTabScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem focused={focused} label="Home" renderIcon={(color) => <HomeIcon color={color} />} />
          ),
        }}
      />
      <Tab.Screen
        name="StepsTab"
        component={StepsTrackerScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem focused={focused} label="Steps" renderIcon={(color) => <FootprintsIcon color={color} />} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
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