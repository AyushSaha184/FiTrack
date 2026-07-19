import React, { useState, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import { ExerciseCard } from './ExerciseCard';
import type { WorkoutExercise, Set } from '../../models';

interface DraggableExerciseListProps {
  exercises: WorkoutExercise[];
  weightUnit?: 'kg' | 'lbs';
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

export const DraggableExerciseList = ({
  exercises,
  weightUnit,
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

  const handleLayout = (index: number, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setLayouts((prev) => ({
      ...prev,
      [index]: { y, height },
    }));
  };

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
          activeIndex={activeIndex}
          translateY={translateY}
          targetIndex={targetIndex}
          layouts={layouts}
          onLayout={(e) => handleLayout(index, e)}
          onAddSet={() => onAddSet(exercise.id)}
          onUpdateSet={(setId, updates) => onUpdateSet(exercise.id, setId, updates)}
          onToggleSetComplete={(setId) => onToggleSetComplete(exercise.id, setId)}
          onRemoveSet={(setId) => onRemoveSet(exercise.id, setId)}
          onRemoveExercise={() => onRemoveExercise(exercise.id, exercise.exercise?.name)}
          onStartRest={onStartRest}
          onReorder={handleReorderJS}
        />
      ))}
    </View>
  );
};

interface DraggableItemProps {
  exercise: WorkoutExercise;
  index: number;
  totalCount: number;
  weightUnit?: 'kg' | 'lbs';
  activeIndex: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  targetIndex: Animated.SharedValue<number>;
  layouts: Record<number, ItemLayout>;
  onLayout: (e: LayoutChangeEvent) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<Set>) => void;
  onToggleSetComplete: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onStartRest?: (setId: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

const DraggableItem = ({
  exercise,
  index,
  totalCount,
  weightUnit,
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
  const itemOffsetY = useSharedValue<number>(0);
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false);

  const handleFinishSwap = useCallback(
    (fromIdx: number, toIdx: number) => {
      activeIndex.value = -1;
      targetIndex.value = -1;
      translateY.value = 0;
      itemOffsetY.value = 0;
      setIsDraggingState(false);
      onReorder(fromIdx, toIdx);
    },
    [onReorder, activeIndex, targetIndex, translateY, itemOffsetY]
  );

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      activeIndex.value = index;
      targetIndex.value = index;
      isDraggingItem.value = true;
      runOnJS(setIsDraggingState)(true);
    })
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;

      // Estimate current drag item center relative to original position
      const currentLayout = layouts[index];
      if (!currentLayout) return;

      const draggedCenterY = currentLayout.y + currentLayout.height / 2 + event.translationY;

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
      targetIndex.value = newTarget;
    })
    .onFinalize(() => {
      'worklet';
      const fromIdx = activeIndex.value;
      const toIdx = targetIndex.value;

      isDraggingItem.value = false;

      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        runOnJS(handleFinishSwap)(fromIdx, toIdx);
      } else {
        translateY.value = 0;
        itemOffsetY.value = 0;
        activeIndex.value = -1;
        targetIndex.value = -1;
        runOnJS(setIsDraggingState)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    const isTargeting = activeIndex.value !== -1 && !isActive;

    let shiftY = 0;
    if (isActive) {
      shiftY = translateY.value;
    } else if (isTargeting) {
      const activeIdx = activeIndex.value;
      const targetIdx = targetIndex.value;
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

    if (isActive) {
      itemOffsetY.value = translateY.value;
    } else if (activeIndex.value === -1) {
      itemOffsetY.value = 0;
    } else {
      itemOffsetY.value = withTiming(shiftY, TIMING_CONFIG);
    }

    return {
      transform: [
        { translateY: itemOffsetY.value },
        { scale: isActive ? 1.01 : 1 },
      ],
      zIndex: isActive ? 999 : 1,
      elevation: isActive ? 8 : 0,
      shadowOpacity: isActive ? 0.25 : 0,
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View onLayout={onLayout} style={[styles.cardShadow, animatedStyle]}>
        <ExerciseCard
          exercise={exercise}
          weightUnit={weightUnit}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          onToggleSetComplete={onToggleSetComplete}
          onRemoveSet={onRemoveSet}
          onRemoveExercise={onRemoveExercise}
          onStartRest={onStartRest}
          isDragging={isDraggingState}
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
});
