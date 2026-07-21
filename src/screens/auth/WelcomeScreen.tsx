import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useColors } from '../../hooks';
import { Logo } from '../../components/common/Logo';
import { spacing, typography, radius } from '../../theme';
import type { AuthStackParamList } from '../../types/navigation';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_SPACING = 16;
const SWIPE_THRESHOLD = CARD_WIDTH * 0.3;
const CARD_HEIGHT = Math.min(420, Math.max(290, SCREEN_HEIGHT * 0.42));
const CAROUSEL_HEIGHT = CARD_HEIGHT + 48;
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 720;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface PreviewCard {
  id: string;
  type: 'home' | 'weight' | 'steps';
}

const previewCards: PreviewCard[] = [
  { id: '1', type: 'weight' },
  { id: '2', type: 'home' },
  { id: '3', type: 'steps' },
];

// SVG Icons for mock previews
const WeightIcon = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <Path d="M8 7h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
    <Path d="M12 11v-3" strokeWidth={2} />
  </Svg>
);

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

const FootprintsIcon = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 12.5C8 10 9 8 10 5a1 1 0 0 0-1-1.25C7.25 4 6 5.5 5.5 8c-.3 1.5-.5 3-.5 5 0 2.5 1 4 2.5 4.5.8.3 1.7-.2 1.7-1v-4Z" />
    <Circle cx="8" cy="2" r="1" fill={color} />
    <Circle cx="10" cy="2.5" r="0.8" fill={color} />
    <Path d="M16 15.5C16 13 15 11 14 8a1 1 0 0 0 1-1.25C16.75 7 18 8.5 18.5 11c.3 1.5.5 3 .5 5 0 2.5-1 4-2.5 4.5-.8.3-1.7-.2-1.7-1v-4Z" />
    <Circle cx="16" cy="5" r="1" fill={color} />
    <Circle cx="14" cy="5.5" r="0.8" fill={color} />
  </Svg>
);

const GearIcon = ({ color }: { color: string }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const PreviewCardComponent = ({
  card,
  index,
  scrollX,
}: {
  card: PreviewCard;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) => {
  const colors = useColors();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.86, 1, 0.86],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.35, 1, 0.35],
      Extrapolation.CLAMP,
    );

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [CARD_WIDTH * 0.12, 0, -CARD_WIDTH * 0.12],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateX }],
      opacity,
    };
  });

  const renderHomeMock = () => (
    <View style={styles.mockScreenContainer}>
      <View style={styles.mockHeader}>
        <Logo size="small" />
        <View style={styles.mockGearBtn}>
          <GearIcon color="#FFFFFF" />
        </View>
      </View>

      {/* Title Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.mockTitle, { color: '#FFFFFF', marginBottom: 0 }]}>Today's Workout</Text>
        <View style={styles.mockResetPill}>
          <Text style={styles.mockResetText}>Reset Week</Text>
        </View>
      </View>

      {/* Calendar Card — matches exact UI */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E', paddingVertical: 8, marginBottom: 6 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {[
            { name: 'MON' },
            { name: 'TUE', active: true },
            { name: 'WED' },
            { name: 'THU' },
            { name: 'FRI' },
            { name: 'SAT' },
            { name: 'SUN' },
          ].map((day, idx) => (
            <View key={idx} style={day.active ? styles.mockDayCircleActive : styles.mockDayCircle}>
              <Text style={day.active ? styles.mockDayTextActive : styles.mockDayText}>
                {day.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons Row — compact inline, matching screenshot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <View style={styles.mockInlineBtn}>
          <Text style={styles.mockInlineBtnText}>Customise</Text>
        </View>
        <View style={styles.mockInlineBtn}>
          <Text style={styles.mockInlineBtnText}>☕ Rest Day</Text>
        </View>
        <View style={[styles.mockInlineBtn, { marginLeft: 'auto' }]}>
          <Text style={styles.mockInlineBtnText}>⏱ Start</Text>
        </View>
      </View>

      {/* Exercise Card 1: Pull-Up / Chin-Up */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E', marginBottom: 5 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>Pull-Up / Chin-Up ^</Text>
          <Text style={{ fontSize: 10, color: '#FF453A' }}>🗑</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#2C2C2E' }}>
          <Text style={styles.mockTableHeader}>SET</Text>
          <Text style={styles.mockTableHeader}>WEIGHT (KG)</Text>
          <Text style={styles.mockTableHeader}>REPS</Text>
          <Text style={styles.mockTableHeader}>DONE</Text>
        </View>
        <Text style={{ fontSize: 8, fontWeight: '700', color: '#0A84FF', marginTop: 5, textAlign: 'center' }}>+ Add Set</Text>
      </View>

      {/* Exercise Card 2: Bent Over Rows */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E', flex: 1 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>Bent Over Rows ^</Text>
          <Text style={{ fontSize: 10, color: '#FF453A' }}>🗑</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#2C2C2E' }}>
          <Text style={styles.mockTableHeader}>SET</Text>
          <Text style={styles.mockTableHeader}>WEIGHT (KG)</Text>
          <Text style={styles.mockTableHeader}>REPS</Text>
          <Text style={styles.mockTableHeader}>DONE</Text>
        </View>
        <Text style={{ fontSize: 8, fontWeight: '700', color: '#0A84FF', marginTop: 5, textAlign: 'center' }}>+ Add Set</Text>

        {/* Floating Add Exercise FAB — bottom right as in actual app */}
        <View style={styles.mockAddExerciseFab}>
          <Text style={styles.mockAddExerciseText}>+ Add Exercise</Text>
        </View>
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#08080A' }]}>
        <View style={styles.mockTabItem}>
          <WeightIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Weight</Text>
        </View>
        <View style={[styles.mockTabItem, styles.mockTabItemActive]}>
          <HomeIcon color="#FFFFFF" />
          <Text style={styles.mockTabTextActive}>Home</Text>
        </View>
        <View style={styles.mockTabItem}>
          <FootprintsIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Steps</Text>
        </View>
      </View>
    </View>
  );

  const renderWeightMock = () => (
    <View style={styles.mockScreenContainer}>
      <View style={styles.mockHeader}>
        <Logo size="small" />
        <View style={styles.mockGearBtn}>
          <GearIcon color="#FFFFFF" />
        </View>
      </View>

      <Text style={[styles.mockTitle, { color: '#FFFFFF' }]}>Weight Tracking</Text>
      <Text style={styles.mockSubTitle}>Track your progress over time.</Text>

      {/* Current Weight Card */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.mockLabel}>Current Weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <Text style={[styles.mockBigVal, { color: '#FFFFFF' }]}>74.8</Text>
              <Text style={styles.mockUnitVal}> kg</Text>
            </View>
            <Text style={styles.mockSubText}>Goal: 72.0 kg ✏️</Text>
          </View>
          <View style={styles.mockAddWeightPill}>
            <Text style={styles.mockAddWeightText}>+ Add Weight</Text>
          </View>
        </View>
      </View>

      {/* Progress Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Progress</Text>
        <View style={styles.mockPillBtn}>
          <Text style={styles.mockPillText}>All Time ▾</Text>
        </View>
      </View>

      {/* Enriched Multi-Point Progress Line Chart Box */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E', height: 80, padding: 6 }]}>
        <View style={styles.mockTooltipBadge}>
          <Text style={styles.mockTooltipText}>74.8 kg</Text>
        </View>
        <Svg width="100%" height={45} viewBox="0 0 200 45">
          <Path d="M 0 10 L 200 10" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 25 L 200 25" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 40 L 200 40" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          
          {/* Gradient Fill under curve */}
          <Path
            d="M 10 10 L 40 18 L 70 14 L 100 26 L 130 22 L 160 34 L 190 38 L 190 45 L 10 45 Z"
            fill="rgba(255,255,255,0.06)"
          />
          {/* Trend Line */}
          <Path
            d="M 10 10 L 40 18 L 70 14 L 100 26 L 130 22 L 160 34 L 190 38"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          {[
            { x: 10, y: 10 },
            { x: 40, y: 18 },
            { x: 70, y: 14 },
            { x: 100, y: 26 },
            { x: 130, y: 22 },
            { x: 160, y: 34 },
            { x: 190, y: 38 },
          ].map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={2.5} fill="#000000" stroke="#FFFFFF" strokeWidth={1.5} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={styles.mockDateTick}>Jul 1</Text>
          <Text style={styles.mockDateTick}>Jul 8</Text>
          <Text style={styles.mockDateTick}>Jul 15</Text>
          <Text style={styles.mockDateTick}>Jul 21</Text>
        </View>
      </View>

      {/* 3-Column Summary Stats Grid */}
      <View style={styles.mockSummaryGrid3}>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <View style={styles.mockIconBoxRed}>
            <Text style={{ fontSize: 8 }}>📈</Text>
          </View>
          <Text style={styles.mockSummaryTitle}>Highest Weight</Text>
          <Text style={[styles.mockSummaryValueSmall, { color: '#FFFFFF' }]}>78.8 kg</Text>
          <Text style={styles.mockDateSub}>Jul 1, 2026</Text>
        </View>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <View style={styles.mockIconBoxBlue}>
            <Text style={{ fontSize: 8 }}>📉</Text>
          </View>
          <Text style={styles.mockSummaryTitle}>Lowest Weight</Text>
          <Text style={[styles.mockSummaryValueSmall, { color: '#FFFFFF' }]}>74.8 kg</Text>
          <Text style={styles.mockDateSub}>Jul 21, 2026</Text>
        </View>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <View style={styles.mockIconBoxGreen}>
            <Text style={{ fontSize: 8 }}>📊</Text>
          </View>
          <Text style={styles.mockSummaryTitle}>Average Weight</Text>
          <Text style={[styles.mockSummaryValueSmall, { color: '#FFFFFF' }]}>76.5 kg</Text>
          <Text style={styles.mockDateSub}>All time</Text>
        </View>
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#08080A' }]}>
        <View style={[styles.mockTabItem, styles.mockTabItemActive]}>
          <WeightIcon color="#FFFFFF" />
          <Text style={styles.mockTabTextActive}>Weight</Text>
        </View>
        <View style={styles.mockTabItem}>
          <HomeIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Home</Text>
        </View>
        <View style={styles.mockTabItem}>
          <FootprintsIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Steps</Text>
        </View>
      </View>
    </View>
  );

  const renderStepsMock = () => (
    <View style={styles.mockScreenContainer}>
      <View style={styles.mockHeader}>
        <Logo size="small" />
        <View style={styles.mockGearBtn}>
          <GearIcon color="#FFFFFF" />
        </View>
      </View>

      <Text style={[styles.mockTitle, { color: '#FFFFFF' }]}>Step Tracker</Text>
      <Text style={styles.mockSubTitle}>Track your daily steps and stay active.</Text>

      {/* Today's Steps Card matching Screenshot 1 */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.mockLabel}>Today's Steps</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <Text style={[styles.mockBigVal, { color: '#FFFFFF' }]}>8,642</Text>
              <Text style={styles.mockUnitVal}> steps</Text>
            </View>
            <Text style={styles.mockSubText}>Goal: 10,000 steps ✏️</Text>
          </View>
          <View style={styles.mockThumbCircle}>
            <Text style={{ fontSize: 14 }}>👍</Text>
          </View>
        </View>

        {/* Progress Bar Track */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <View style={styles.mockProgressBarTrack}>
            <View style={[styles.mockProgressBarFill, { width: '86%' }]} />
          </View>
          <Text style={styles.mockProgressPercent}>86%</Text>
        </View>
      </View>

      {/* Trend Section matching Screenshot 1 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Trend</Text>
        <View style={styles.mockPillBtn}>
          <Text style={styles.mockPillText}>7 Days ▾</Text>
        </View>
      </View>

      {/* Trend Chart Box */}
      <View style={[styles.mockCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E', height: 75, padding: 6 }]}>
        <Svg width="100%" height={40} viewBox="0 0 200 40">
          <Path d="M 0 5 L 200 5" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 20 L 200 20" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 35 L 200 35" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 10 32 L 40 22 L 70 12 L 100 32 L 130 8 L 160 18 L 190 10" fill="none" stroke="#FFFFFF" strokeWidth={2} />
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={styles.mockDateTick}>Jul 15</Text>
          <Text style={styles.mockDateTick}>Jul 18</Text>
          <Text style={styles.mockDateTick}>Jul 21</Text>
        </View>
      </View>

      {/* Summary Grid matching Screenshot 1 */}
      <View style={styles.mockSummaryGrid}>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <View style={styles.mockFootCircle}>
            <Text style={{ fontSize: 10 }}>🐾</Text>
          </View>
          <Text style={styles.mockSummaryTitle}>Total Steps</Text>
          <Text style={[styles.mockSummaryValue, { color: '#FFFFFF' }]}>60,132</Text>
        </View>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <View style={styles.mockFireCircle}>
            <Text style={{ fontSize: 10 }}>🔥</Text>
          </View>
          <Text style={styles.mockSummaryTitle}>Calories Burned</Text>
          <Text style={[styles.mockSummaryValue, { color: '#FFFFFF' }]}>2,356</Text>
        </View>
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#08080A' }]}>
        <View style={styles.mockTabItem}>
          <WeightIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Weight</Text>
        </View>
        <View style={styles.mockTabItem}>
          <HomeIcon color="rgba(255,255,255,0.4)" />
          <Text style={styles.mockTabTextMuted}>Home</Text>
        </View>
        <View style={[styles.mockTabItem, styles.mockTabItemActive]}>
          <FootprintsIcon color="#FFFFFF" />
          <Text style={styles.mockTabTextActive}>Steps</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.previewCard,
        {
          borderColor: '#1F1F1F',
          backgroundColor: '#000000',
          width: CARD_WIDTH,
        },
        animatedStyle,
      ]}
    >
      {card.type === 'home' && renderHomeMock()}
      {card.type === 'weight' && renderWeightMock()}
      {card.type === 'steps' && renderStepsMock()}
    </Animated.View>
  );
};

export const WelcomeScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<NavigationProp>();
  const [activeIndex, setActiveIndex] = useState(1); // Default to middle card (Home screen)
  const scrollX = useSharedValue(CARD_WIDTH + CARD_SPACING); // Centered default position
  const scrollRef = React.useRef<ScrollView>(null);

  // Position middle card as center on layout load
  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: (CARD_WIDTH + CARD_SPACING),
        animated: false,
      });
    }, 100);
  }, []);

  const handleScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      scrollX.value = offsetX;
      const newIndex = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < previewCards.length) {
        setActiveIndex(newIndex);
      }
    },
    [activeIndex, scrollX],
  );

  const scrollToIndex = useCallback((index: number) => {
    scrollRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_SPACING),
      animated: true,
    });
    setActiveIndex(index);
  }, []);

  const gesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && activeIndex < previewCards.length - 1) {
        runOnJS(scrollToIndex)(activeIndex + 1);
      } else if (event.translationX > SWIPE_THRESHOLD && activeIndex > 0) {
        runOnJS(scrollToIndex)(activeIndex - 1);
      }
    });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Left Header Section */}
        <View style={styles.headerSection}>
          <Logo size={IS_SMALL_SCREEN ? 'medium' : 'large'} />
          <Text style={[styles.tagline, { color: '#FFFFFF' }]}>
            Track. Improve. Become Stronger.
          </Text>
          <Text style={[styles.description, { color: 'rgba(255,255,255,0.6)' }]}>
            Your all-in-one fitness tracker.
          </Text>
        </View>

        {/* Center Previews Carousel */}
        <GestureDetector gesture={gesture}>
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              snapToAlignment="center"
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {previewCards.map((card, index) => (
                <PreviewCardComponent
                  key={card.id}
                  card={card}
                  index={index}
                  scrollX={scrollX}
                />
              ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.pagination}>
              {previewCards.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor:
                        index === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                      width: index === activeIndex ? 8 : 6,
                      height: index === activeIndex ? 8 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </GestureDetector>

        {/* Bottom Center Tappable Text Link */}
        <TouchableOpacity
          style={styles.ctaSection}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={[styles.ctaTitle, { color: '#FFFFFF' }]}>Get Started</Text>
          <Text style={styles.ctaSubtitle}>
            Join now and start your fitness journey.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerSection: {
    paddingHorizontal: 32,
    paddingTop: IS_SMALL_SCREEN ? 16 : 36,
  },
  tagline: {
    fontSize: IS_SMALL_SCREEN ? 18 : 20,
    fontWeight: '600',
    marginTop: IS_SMALL_SCREEN ? 8 : 16,
  },
  description: {
    fontSize: IS_SMALL_SCREEN ? 13 : 15,
    marginTop: IS_SMALL_SCREEN ? 3 : 6,
  },
  carouselContainer: {
    marginTop: IS_SMALL_SCREEN ? 8 : 20,
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH - CARD_SPACING) / 2,
    alignItems: 'center',
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: CARD_SPACING / 2,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: IS_SMALL_SCREEN ? 10 : 20,
    gap: 8,
  },
  paginationDot: {
    borderRadius: 4,
  },
  ctaSection: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
    paddingHorizontal: 20,
    marginBottom: IS_SMALL_SCREEN ? 36 : 52,
    marginHorizontal: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#0C0C0E',
    borderRadius: 14,
  },
  ctaTitle: {
    fontSize: IS_SMALL_SCREEN ? 18 : 20,
    fontWeight: '700',
  },
  ctaSubtitle: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textAlign: 'center',
  },

  // Mock Device UI styles
  mockScreenContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  mockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
  },
  mockHeaderIcon: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  mockTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  mockResetPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  mockResetText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mockCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Old pill styles kept for compatibility if anything references them
  mockCalendarDayPill: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mockCalendarDayPillActive: {
    backgroundColor: '#2C2C2E',
  },
  mockDayNameText: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  mockDayNameTextActive: {
    color: '#FFFFFF',
  },
  // New circle day styles matching actual app screenshot
  mockDayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockDayCircleActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
  },
  mockDayText: {
    fontSize: 5.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  mockDayTextActive: {
    fontSize: 5.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Inline action buttons (non-equal-width, natural size)
  mockInlineBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  mockInlineBtnText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Keep old for reference
  mockActionBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  mockActionText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mockTableHeader: {
    fontSize: 6,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  mockTableCell: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mockDoneCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mockAddExerciseFab: {
    alignSelf: 'flex-end',
    marginTop: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  mockAddExerciseText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  mockWorkoutLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  mockWorkoutTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  mockWorkoutSub: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  mockWorkoutIcon: {
    fontSize: 16,
  },
  mockExercisesTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  mockExercisesList: {
    flex: 1,
  },
  mockExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
  },
  mockExerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockExerciseDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  mockExName: {
    fontSize: 10,
    fontWeight: '600',
  },
  mockExDesc: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  mockCheckCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCheckCircleChecked: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  mockCheckMark: {
    color: '#000000',
    fontSize: 7,
    fontWeight: '800',
  },

  mockGearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockSubTitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  mockCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
    position: 'relative',
  },
  mockLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  mockBigVal: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mockUnitVal: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  mockSubText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  mockThumbCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockProgressBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  mockProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2.5,
  },
  mockProgressPercent: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockPillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  mockPillText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mockDateTick: {
    fontSize: 6,
    color: 'rgba(255,255,255,0.35)',
  },
  mockSectionHeader: {
    fontSize: 10,
    fontWeight: '700',
  },
  mockSummaryGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  mockSummaryGrid3: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  mockSummaryBox: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  mockSummaryTitle: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  mockSummaryValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  mockSummaryValueSmall: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  mockDateSub: {
    fontSize: 6,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  mockIconBoxRed: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,69,58,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockIconBoxBlue: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockIconBoxGreen: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(48,209,88,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockFootCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(10,132,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockFireCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,159,10,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockAddWeightPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  mockAddWeightText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockTooltipBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#1C1C1E',
    zIndex: 10,
  },
  mockTooltipText: {
    fontSize: 6,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockTabBar: {
    flexDirection: 'row',
    height: 34,
    borderTopWidth: 0.5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 'auto',
    marginHorizontal: -12,
    marginBottom: -12,
  },
  mockTabItem: {
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  mockTabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mockTabTextMuted: {
    fontSize: 6,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  mockTabTextActive: {
    fontSize: 6,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
});