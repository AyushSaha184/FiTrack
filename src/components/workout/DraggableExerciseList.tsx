import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ExerciseCard } from './ExerciseCard';
import type { WorkoutExercise, Set } from '../../models';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggableExerciseListProps {
  exercises: WorkoutExercise[];
  weightUnit?: 'kg' | 'lbs';
  scrollViewRef?: React.RefObject<any>;
  scrollYRef?: React.MutableRefObject<number>;
  maxScrollYRef?: React.MutableRefObject<number>;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<Set>) => void;
  onToggleSetComplete: (exerciseId: string, setId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string, name?: string) => void;
  onStartRest?: (setId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface ItemLayout {
  y: number;
  height: number;
}

const TIMING_CONFIG = {
  duration: 160,
  easing: Easing.out(Easing.quad),
};

export const DraggableExerciseList = memo(({
  exercises,
  weightUnit,
  scrollViewRef,
  scrollYRef,
  maxScrollYRef,
  onAddSet,
  onUpdateSet,
  onToggleSetComplete,
  onRemoveSet,
  onRemoveExercise,
  onStartRest,
  onReorder,
}: DraggableExerciseListProps) => {
  const activeIndex = useSharedValue<number>(-1);
  const translateY = useSharedValue<number>(0);
  const targetIndex = useSharedValue<number>(-1);

  // Store layout height & position of each item
  const [layouts, setLayouts] = useState<Record<number, ItemLayout>>({});

  const handleLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setLayouts((prev) => ({
      ...prev,
      [index]: { y, height },
    }));
  }, []);

  const handleReorderJS = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        onReorder(fromIdx, toIdx);
      }
    },
    [onReorder]
  );

  return (
    <View style={styles.container}>
      {exercises.map((exercise, index) => (
        <DraggableItem
          key={exercise.id}
          exercise={exercise}
          index={index}
          totalCount={exercises.length}
          weightUnit={weightUnit}
          scrollViewRef={scrollViewRef}
          scrollYRef={scrollYRef}
          maxScrollYRef={maxScrollYRef}
          activeIndex={activeIndex}
          translateY={translateY}
          targetIndex={targetIndex}
          layouts={layouts}
          onLayout={handleLayout}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          onToggleSetComplete={onToggleSetComplete}
          onRemoveSet={onRemoveSet}
          onRemoveExercise={onRemoveExercise}
          onStartRest={onStartRest}
          onReorder={handleReorderJS}
        />
      ))}
    </View>
  );
});

DraggableExerciseList.displayName = 'DraggableExerciseList';

const TOP_LIMIT_Y = 220; // Top boundary: card cannot travel above Customize / Rest Day buttons
const BOTTOM_LIMIT_Y = SCREEN_HEIGHT - 170; // Bottom boundary: card cannot travel below bottom tab bar
const TOP_TRIGGER_ZONE = 250; // Finger in top 250px triggers upward auto-scroll
const BOTTOM_TRIGGER_ZONE = SCREEN_HEIGHT - 210; // Finger in bottom area triggers downward auto-scroll

interface DraggableItemProps {
  exercise: WorkoutExercise;
  index: number;
  totalCount: number;
  weightUnit?: 'kg' | 'lbs';
  scrollViewRef?: React.RefObject<any>;
  scrollYRef?: React.MutableRefObject<number>;
  maxScrollYRef?: React.MutableRefObject<number>;
  activeIndex: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  targetIndex: Animated.SharedValue<number>;
  layouts: Record<number, ItemLayout>;
  onLayout: (index: number, e: LayoutChangeEvent) => void;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<Set>) => void;
  onToggleSetComplete: (exerciseId: string, setId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (exerciseId: string, name?: string) => void;
  onStartRest?: (setId: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

const DraggableItem = memo(({
  exercise,
  index,
  totalCount,
  weightUnit,
  scrollViewRef,
  scrollYRef,
  maxScrollYRef,
  activeIndex,
  translateY,
  targetIndex,
  layouts,
  onLayout,
  onAddSet,
  onUpdateSet,
  onToggleSetComplete,
  onRemoveSet,
  onRemoveExercise,
  onStartRest,
  onReorder,
}: DraggableItemProps) => {
  const isDraggingItem = useSharedValue<boolean>(false);
  const accumulatedScrollY = useSharedValue<number>(0);
  const startCardScreenY = useSharedValue<number>(0);
  const initialScrollY = useRef<number>(0);
  const latestTranslationYRef = useRef<number>(0);
  const autoScrollTimer = useRef<any>(null);
  const currentSpeedRef = useRef<number>(0);
  const layoutsRef = useRef<Record<number, ItemLayout>>(layouts);
  layoutsRef.current = layouts;
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false);

  const exerciseId = exercise.id;
  const exerciseName = exercise.exercise?.name;

  // Stabilize callbacks to ExerciseCard (list-performance-callbacks)
  const handleAddSet = useCallback(() => {
    onAddSet(exerciseId);
  }, [onAddSet, exerciseId]);

  const handleUpdateSet = useCallback(
    (setId: string, updates: Partial<Set>) => {
      onUpdateSet(exerciseId, setId, updates);
    },
    [onUpdateSet, exerciseId]
  );

  const handleToggleSetComplete = useCallback(
    (setId: string) => {
      onToggleSetComplete(exerciseId, setId);
    },
    [onToggleSetComplete, exerciseId]
  );

  const handleRemoveSet = useCallback(
    (setId: string) => {
      onRemoveSet(exerciseId, setId);
    },
    [onRemoveSet, exerciseId]
  );

  const handleRemoveExercise = useCallback(() => {
    onRemoveExercise(exerciseId, exerciseName);
  }, [onRemoveExercise, exerciseId, exerciseName]);

  const handleItemLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout(index, e);
    },
    [onLayout, index]
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    currentSpeedRef.current = 0;
  }, []);

  const handleAutoScrollCheck = useCallback(
    (absoluteY: number) => {
      let speed = 0;
      if (absoluteY <= TOP_TRIGGER_ZONE) {
        const dist = TOP_TRIGGER_ZONE - absoluteY;
        speed = -(10 + Math.min(22, dist * 0.35));
      } else if (absoluteY >= BOTTOM_TRIGGER_ZONE) {
        const dist = absoluteY - BOTTOM_TRIGGER_ZONE;
        speed = 10 + Math.min(22, dist * 0.35);
      }

      currentSpeedRef.current = speed;

      if (speed !== 0 && !autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => {
          if (!scrollViewRef?.current || currentSpeedRef.current === 0) return;
          const currentY = scrollYRef?.current || 0;
          const maxScroll = maxScrollYRef?.current ?? 3000;
          const nextY = Math.min(maxScroll, Math.max(0, currentY + currentSpeedRef.current));
          if (nextY !== currentY) {
            scrollViewRef.current.scrollTo({ y: nextY, x: 0, animated: false });
            if (scrollYRef) scrollYRef.current = nextY;
            const delta = nextY - initialScrollY.current;
            accumulatedScrollY.value = delta;

            // Continuously update card translateY and target index while scrolling under stationary finger
            const currentTotalY = latestTranslationYRef.current + delta;
            translateY.value = currentTotalY;

            const curLayouts = layoutsRef.current;
            const currentLayout = curLayouts[index];
            if (currentLayout) {
              const draggedCenterY = currentLayout.y + currentLayout.height / 2 + currentTotalY;
              let newTarget = index;
              for (let i = 0; i < totalCount; i++) {
                if (i === index) continue;
                const itemL = curLayouts[i];
                if (!itemL) continue;

                const itemCenterY = itemL.y + itemL.height / 2;
                if (i < index && draggedCenterY < itemCenterY) {
                  newTarget = Math.min(newTarget, i);
                } else if (i > index && draggedCenterY > itemCenterY) {
                  newTarget = Math.max(newTarget, i);
                }
              }
              targetIndex.value = newTarget;
            }
          }
        }, 16);
      } else if (speed === 0 && autoScrollTimer.current) {
        stopAutoScroll();
      }
    },
    [scrollViewRef, scrollYRef, maxScrollYRef, stopAutoScroll, accumulatedScrollY, translateY, targetIndex, index, totalCount]
  );

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  const handleFinishSwap = useCallback(
    (fromIdx: number, toIdx: number) => {
      stopAutoScroll();
      activeIndex.set(-1);
      targetIndex.set(-1);
      translateY.set(0);
      accumulatedScrollY.set(0);
      setIsDraggingState(false);
      onReorder(fromIdx, toIdx);
    },
    [onReorder, activeIndex, targetIndex, translateY, accumulatedScrollY, stopAutoScroll]
  );

  const handleStartDrag = useCallback(() => {
    if (scrollYRef) {
      initialScrollY.current = scrollYRef.current;
    }
    latestTranslationYRef.current = 0;
    setIsDraggingState(true);
  }, [scrollYRef]);

  const handleDragUpdate = useCallback(
    (translationY: number, absoluteY: number) => {
      latestTranslationYRef.current = translationY;
      handleAutoScrollCheck(absoluteY);
    },
    [handleAutoScrollCheck]
  );

  const handleCancelDrag = useCallback(() => {
    stopAutoScroll();
    setIsDraggingState(false);
  }, [stopAutoScroll]);

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart((event) => {
      'worklet';
      activeIndex.set(index);
      targetIndex.set(index);
      isDraggingItem.set(true);
      accumulatedScrollY.set(0);
      startCardScreenY.set(event.absoluteY - event.y);
      runOnJS(handleStartDrag)();
    })
    .onUpdate((event) => {
      'worklet';
      const cardTop0 = startCardScreenY.get();
      const cardHeight = layouts[index]?.height ?? 160;

      // Clamp card movement so it stays strictly below Customize/Rest Day buttons and above the Tab Bar
      const minAllowedTranslation = TOP_LIMIT_Y - cardTop0;
      const maxAllowedTranslation = Math.max(
        minAllowedTranslation,
        (BOTTOM_LIMIT_Y - cardHeight) - cardTop0
      );

      const clampedTranslationY = Math.min(
        maxAllowedTranslation,
        Math.max(minAllowedTranslation, event.translationY)
      );

      const totalY = clampedTranslationY + accumulatedScrollY.get();
      translateY.set(totalY);

      runOnJS(handleDragUpdate)(clampedTranslationY, event.absoluteY);

      // Estimate current drag item center relative to original position
      const currentLayout = layouts[index];
      if (!currentLayout) return;

      const draggedCenterY = currentLayout.y + currentLayout.height / 2 + totalY;

      // Determine new target index
      let newTarget = index;
      for (let i = 0; i < totalCount; i++) {
        if (i === index) continue;
        const itemL = layouts[i];
        if (!itemL) continue;

        const itemCenterY = itemL.y + itemL.height / 2;
        if (i < index && draggedCenterY < itemCenterY) {
          newTarget = Math.min(newTarget, i);
        } else if (i > index && draggedCenterY > itemCenterY) {
          newTarget = Math.max(newTarget, i);
        }
      }
      targetIndex.set(newTarget);
    })
    .onFinalize(() => {
      'worklet';
      const fromIdx = activeIndex.get();
      const toIdx = targetIndex.get();

      runOnJS(stopAutoScroll)();
      isDraggingItem.set(false);

      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        runOnJS(handleFinishSwap)(fromIdx, toIdx);
      } else {
        translateY.set(0);
        accumulatedScrollY.set(0);
        activeIndex.set(-1);
        targetIndex.set(-1);
        runOnJS(handleCancelDrag)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const currentActiveIdx = activeIndex.get();
    const isActive = currentActiveIdx === index;
    const isTargeting = currentActiveIdx !== -1 && !isActive;

    let shiftY = 0;
    if (isTargeting) {
      const activeIdx = currentActiveIdx;
      const targetIdx = targetIndex.get();
      const activeLayout = layouts[activeIdx];

      if (activeLayout) {
        const heightWithMargin = activeLayout.height + 16;
        if (index > activeIdx && index <= targetIdx) {
          shiftY = -heightWithMargin;
        } else if (index < activeIdx && index >= targetIdx) {
          shiftY = heightWithMargin;
        }
      }
    }

    return {
      transform: [
        { translateY: isActive ? translateY.get() : withTiming(shiftY, TIMING_CONFIG) },
        { scale: isActive ? withTiming(1.02, { duration: 120 }) : withTiming(1, { duration: 120 }) },
      ],
      zIndex: isActive ? 9999 : 1,
      elevation: isActive ? 24 : 0,
      opacity: isActive ? 0.96 : 1,
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View onLayout={handleItemLayout} style={[styles.cardShadow, animatedStyle]}>
        <ExerciseCard
          exercise={exercise}
          weightUnit={weightUnit}
          onAddSet={handleAddSet}
          onUpdateSet={handleUpdateSet}
          onToggleSetComplete={handleToggleSetComplete}
          onRemoveSet={handleRemoveSet}
          onRemoveExercise={handleRemoveExercise}
          onStartRest={onStartRest}
          isDragging={isDraggingState}
        />
      </Animated.View>
    </GestureDetector>
  );
});

DraggableItem.displayName = 'DraggableItem';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cardShadow: {
    position: 'relative',
  },
});
