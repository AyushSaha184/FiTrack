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
import Svg, { Path, Circle } from 'react-native-svg';

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
      {/* Small Header */}
      <View style={styles.mockHeader}>
        <Logo size="small" />
        <Text style={styles.mockHeaderIcon}>⚙️</Text>
      </View>

      {/* Today's Workout */}
      <Text style={[styles.mockTitle, { color: '#FFFFFF' }]}>Today's Workout</Text>

      {/* Calendar Row */}
      <View style={styles.mockCalendarRow}>
        {[
          { name: 'MON', num: '10' },
          { name: 'TUE', num: '11' },
          { name: 'WED', num: '12', active: true },
          { name: 'THU', num: '13' },
          { name: 'FRI', num: '14' },
          { name: 'SAT', num: '15' },
          { name: 'SUN', num: '16' },
        ].map((day, idx) => (
          <View
            key={idx}
            style={[
              styles.mockCalendarDay,
              day.active && styles.mockCalendarDayActive,
            ]}
          >
            <Text style={[styles.mockDayName, day.active && styles.mockDayNameActive]}>
              {day.name}
            </Text>
            <Text style={[styles.mockDayNum, day.active && styles.mockDayNumActive]}>
              {day.num}
            </Text>
          </View>
        ))}
      </View>

      {/* Split Capsules */}
      <View style={styles.mockCapsuleRow}>
        <View style={styles.mockCapsule}>
          <Text style={styles.mockCapsuleText}>💪 Push Day</Text>
        </View>
        <View style={styles.mockCapsuleActive}>
          <Text style={styles.mockCapsuleTextActive}>⚡ Full Body</Text>
        </View>
      </View>

      {/* Workout of the Day */}
      <View style={[styles.mockWorkoutCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mockWorkoutLabel}>Workout of the Day</Text>
          <Text style={[styles.mockWorkoutTitle, { color: '#FFFFFF' }]}>Full Body Strength</Text>
          <Text style={styles.mockWorkoutSub}>45 min • 6 exercises</Text>
        </View>
        <Text style={styles.mockWorkoutIcon}>💪</Text>
      </View>

      {/* Exercises Title */}
      <Text style={[styles.mockExercisesTitle, { color: '#FFFFFF' }]}>Exercises</Text>

      {/* Exercise items */}
      <View style={styles.mockExercisesList}>
        {[
          { name: 'Squats', desc: '4 sets × 12 reps', checked: true },
          { name: 'Push Ups', desc: '3 sets × 15 reps', checked: true },
          { name: 'Pull Ups', desc: '4 sets × 8 reps', checked: false },
          { name: 'Dumbbell Row', desc: '3 sets × 12 reps', checked: false },
          { name: 'Plank', desc: '3 sets × 60 sec', checked: false },
          { name: 'Lunges', desc: '3 sets × 12 reps', checked: false },
        ].map((item, idx) => (
          <View key={idx} style={[styles.mockExerciseItem, { borderBottomColor: '#1F1F1F' }]}>
            <View style={styles.mockExerciseLeft}>
              <View style={[styles.mockExerciseDot, { backgroundColor: item.checked ? '#30D158' : 'rgba(255,255,255,0.2)' }]} />
              <View>
                <Text style={[styles.mockExName, { color: '#FFFFFF' }]}>{item.name}</Text>
                <Text style={styles.mockExDesc}>{item.desc}</Text>
              </View>
            </View>
            <View
              style={[
                styles.mockCheckCircle,
                item.checked && styles.mockCheckCircleChecked,
              ]}
            >
              {item.checked && <Text style={styles.mockCheckMark}>✓</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#000000' }]}>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>⚖️</Text>
          <Text style={styles.mockTabTextMuted}>Weight</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconActive}>🏠</Text>
          <Text style={styles.mockTabTextActive}>Home</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>👣</Text>
          <Text style={styles.mockTabTextMuted}>Steps</Text>
        </View>
      </View>
    </View>
  );

  const renderWeightMock = () => (
    <View style={styles.mockScreenContainer}>
      <View style={styles.mockHeader}>
        <Logo size="small" />
      </View>
      <Text style={[styles.mockTitle, { color: '#FFFFFF' }]}>Weight Tracking</Text>

      {/* Weight Stats */}
      <View style={styles.mockStatsRow}>
        <View style={styles.mockStatItem}>
          <Text style={styles.mockStatLabel}>Current Weight</Text>
          <Text style={[styles.mockStatValue, { color: '#FFFFFF' }]}>
            78.4 <Text style={styles.mockStatUnit}>kg</Text>
          </Text>
        </View>
        <View style={styles.mockStatItem}>
          <Text style={styles.mockStatLabel}>Goal Weight</Text>
          <Text style={[styles.mockStatValue, { color: '#FFFFFF' }]}>
            75.0 <Text style={styles.mockStatUnit}>kg</Text>
          </Text>
        </View>
      </View>

      {/* Chart Label */}
      <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Weight Trend</Text>
      
      {/* Mock Line Graph via SVG */}
      <View style={styles.mockChartContainer}>
        <Svg width="100%" height={90} viewBox="0 0 200 90">
          <Path d="M 0 10 L 200 10" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 45 L 200 45" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 80 L 200 80" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          
          <Path
            d="M 10 35 L 45 45 L 80 25 L 115 55 L 150 48 L 190 70"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          {[
            { x: 10, y: 35 },
            { x: 45, y: 45 },
            { x: 80, y: 25 },
            { x: 115, y: 55 },
            { x: 150, y: 48 },
            { x: 190, y: 70 },
          ].map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={3} fill="#FFFFFF" />
          ))}
        </Svg>
      </View>

      {/* History List */}
      <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Weight History</Text>
      <View style={styles.mockHistoryList}>
        {[
          { date: 'May 29, 2026', weight: '78.4 kg', sub: '9:30 AM' },
          { date: 'May 26, 2026', weight: '78.5 kg', sub: '8:45 AM' },
          { date: 'May 23, 2026', weight: '78.2 kg', sub: '8:20 AM' },
          { date: 'May 20, 2026', weight: '78.4 kg', sub: '9:10 AM' },
          { date: 'May 17, 2026', weight: '78.5 kg', sub: '8:55 AM' },
        ].map((item, idx) => (
          <View key={idx} style={[styles.mockHistoryRow, { borderBottomColor: '#1F1F1F' }]}>
            <View>
              <Text style={[styles.mockHistoryDate, { color: '#FFFFFF' }]}>{item.date}</Text>
              <Text style={styles.mockHistoryTime}>{item.sub}</Text>
            </View>
            <Text style={[styles.mockHistoryWeight, { color: '#FFFFFF' }]}>{item.weight}</Text>
          </View>
        ))}
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#000000' }]}>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconActive}>⚖️</Text>
          <Text style={styles.mockTabTextActive}>Weight</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>🏠</Text>
          <Text style={styles.mockTabTextMuted}>Home</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>👣</Text>
          <Text style={styles.mockTabTextMuted}>Steps</Text>
        </View>
      </View>
    </View>
  );

  const renderStepsMock = () => (
    <View style={styles.mockScreenContainer}>
      <View style={styles.mockHeader}>
        <Logo size="small" />
      </View>
      <Text style={[styles.mockTitle, { color: '#FFFFFF' }]}>Step Tracker</Text>

      {/* Progress Card */}
      <View style={[styles.mockStepsProgressCard, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
        <Text style={styles.mockStepsLabel}>Today's Steps</Text>
        <Text style={[styles.mockStepsVal, { color: '#FFFFFF' }]}>8,642</Text>
        <Text style={styles.mockStepsGoal}>Goal: 10,000 steps</Text>
        <View style={styles.mockProgressBarTrack}>
          <View style={[styles.mockProgressBarFill, { width: '86%' }]} />
        </View>
      </View>

      {/* Steps Trend */}
      <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Steps Trend</Text>
      <View style={styles.mockChartContainer}>
        <Svg width="100%" height={90} viewBox="0 0 200 90">
          <Path d="M 0 10 L 200 10" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 45 L 200 45" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <Path d="M 0 80 L 200 80" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          
          <Path
            d="M 10 50 L 45 40 L 80 25 L 115 55 L 150 20 L 190 35"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          {[
            { x: 10, y: 50 },
            { x: 45, y: 40 },
            { x: 80, y: 25 },
            { x: 115, y: 55 },
            { x: 150, y: 20 },
            { x: 190, y: 35 },
          ].map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={3} fill="#FFFFFF" />
          ))}
        </Svg>
      </View>

      {/* Weekly Stats Grid */}
      <View style={styles.mockSummaryGrid}>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <Text style={styles.mockSummaryTitle}>Total Steps</Text>
          <Text style={[styles.mockSummaryValue, { color: '#FFFFFF' }]}>60,132</Text>
          <Text style={styles.mockSummaryUnit}>This Week</Text>
        </View>
        <View style={[styles.mockSummaryBox, { borderColor: '#1F1F1F', backgroundColor: '#0C0C0E' }]}>
          <Text style={styles.mockSummaryTitle}>Calories Burned</Text>
          <Text style={[styles.mockSummaryValue, { color: '#FFFFFF' }]}>2,356</Text>
          <Text style={styles.mockSummaryUnit}>kcal</Text>
        </View>
      </View>

      {/* Step History */}
      <Text style={[styles.mockSectionHeader, { color: '#FFFFFF' }]}>Step History</Text>
      <View style={styles.mockHistoryList}>
        {[
          { date: 'May 26, 2026', val: '8,642 steps' },
          { date: 'May 25, 2026', val: '9,123 steps' },
          { date: 'May 24, 2026', val: '6,245 steps' },
        ].map((item, idx) => (
          <View key={idx} style={[styles.mockHistoryRowCompact, { borderBottomColor: '#1F1F1F' }]}>
            <Text style={[styles.mockHistoryDate, { color: '#FFFFFF' }]}>{item.date}</Text>
            <Text style={[styles.mockHistoryWeight, { color: '#FFFFFF' }]}>{item.val}</Text>
          </View>
        ))}
      </View>

      {/* Mock Tab Bar */}
      <View style={[styles.mockTabBar, { borderTopColor: '#1F1F1F', backgroundColor: '#000000' }]}>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>⚖️</Text>
          <Text style={styles.mockTabTextMuted}>Weight</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconMuted}>🏠</Text>
          <Text style={styles.mockTabTextMuted}>Home</Text>
        </View>
        <View style={styles.mockTabItem}>
          <Text style={styles.mockTabIconActive}>👣</Text>
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
          style={[styles.ctaSection, { borderColor: '#1F1F1F' }]}
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
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
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
    paddingVertical: IS_SMALL_SCREEN ? 12 : 16,
    paddingHorizontal: 24,
    marginBottom: IS_SMALL_SCREEN ? 20 : 36,
    marginHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
  },
  ctaTitle: {
    fontSize: IS_SMALL_SCREEN ? 20 : 24,
    fontWeight: '700',
  },
  ctaSubtitle: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  mockCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mockCalendarDay: {
    alignItems: 'center',
    paddingVertical: 4,
    width: 24,
    borderRadius: 6,
  },
  mockCalendarDayActive: {
    backgroundColor: '#FFFFFF',
  },
  mockDayName: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  mockDayNameActive: {
    color: '#000000',
  },
  mockDayNum: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  mockDayNumActive: {
    color: '#000000',
  },
  mockCapsuleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  mockCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    backgroundColor: '#0C0C0E',
  },
  mockCapsuleActive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#FFFFFF',
  },
  mockCapsuleText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  mockCapsuleTextActive: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
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

  // Weight Tracking Device Mock styles
  mockStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mockStatItem: {
    flex: 1,
  },
  mockStatLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  mockStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  mockStatUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  mockSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  mockChartContainer: {
    height: 90,
    justifyContent: 'center',
    marginBottom: 12,
  },
  mockHistoryList: {
    flex: 1,
  },
  mockHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
  },
  mockHistoryDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  mockHistoryTime: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  mockHistoryWeight: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Step Tracker Device Mock styles
  mockStepsProgressCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  mockStepsLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  mockStepsVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  mockStepsGoal: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    marginBottom: 6,
  },
  mockProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  mockProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  mockSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mockSummaryBox: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  mockSummaryTitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  mockSummaryValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  mockSummaryUnit: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  mockHistoryRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
  },

  // Mock bottom tab navigation
  mockTabBar: {
    flexDirection: 'row',
    height: 36,
    borderTopWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 'auto',
    marginHorizontal: -12,
    marginBottom: -12,
  },
  mockTabItem: {
    alignItems: 'center',
  },
  mockTabIconMuted: {
    fontSize: 10,
    opacity: 0.35,
  },
  mockTabIconActive: {
    fontSize: 10,
  },
  mockTabTextMuted: {
    fontSize: 6,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  mockTabTextActive: {
    fontSize: 6,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
});