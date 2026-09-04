import React, { memo, ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal as RNModal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  fullScreen?: boolean;
  sheet?: boolean;
  noPadding?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
}

export const Modal = memo<ModalProps>(({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  fullScreen = false,
  sheet = false,
  noPadding = false,
  bodyStyle,
}) => {
  const colors = useColors();

  // Local state to keep the RNModal mounted during exit animations
  const [mounted, setMounted] = useState(visible);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const translateY = useSharedValue(20);
  const dragY = useSharedValue(0);

  const handleUnmount = useCallback(() => {
    setMounted(false);
  }, []);

  const handleCloseAndUnmount = useCallback(() => {
    onClose();
    setMounted(false);
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.set(0);
      opacity.set(withTiming(1, { duration: 200 }));
      if (sheet) {
        scale.set(1);
        translateY.set(600); // Slide from bottom
        translateY.set(withSpring(0, { damping: 20, stiffness: 220 }));
      } else {
        scale.set(0.95);
        scale.set(withSpring(1, { damping: 20, stiffness: 250 }));
        translateY.set(50);
        translateY.set(withSpring(0, { damping: 20, stiffness: 250 }));
      }
    } else if (mounted) {
      opacity.set(withTiming(0, { duration: 200 }));
      if (sheet) {
        translateY.set(withTiming(600, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(handleUnmount)();
          }
        }));
      } else {
        scale.set(withTiming(0.95, { duration: 200 }));
        translateY.set(withTiming(50, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(handleUnmount)();
          }
        }));
      }
    }
  }, [visible, mounted, sheet, dragY, opacity, scale, translateY, handleUnmount]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      'worklet';
      // Touch feedback: slightly shrink the sheet springily to interact
      scale.set(withSpring(0.985, { damping: 15, stiffness: 150 }));
    })
    .onUpdate((event) => {
      'worklet';
      if (event.translationY < 0) {
        // Dragging above normal size -> make it resistive/springy
        dragY.set(event.translationY * 0.25);
      } else {
        // Dragging down -> moves directly with finger
        dragY.set(event.translationY);
      }
    })
    .onEnd((event) => {
      'worklet';
      // Reset scale feedback
      scale.set(withSpring(1, { damping: 15, stiffness: 150 }));

      // If dragged down enough (e.g. 150px) or flicked down rapidly (velocityY > 600)
      const shouldClose = event.translationY > 150 || event.velocityY > 600;
      if (shouldClose) {
        opacity.set(withTiming(0, { duration: 200 }));
        dragY.set(withTiming(600, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(handleCloseAndUnmount)();
          }
        }));
      } else {
        // Spring back to normal size
        dragY.set(withSpring(0, { damping: 20, stiffness: 250 }));
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { scale: scale.get() },
      { translateY: translateY.get() + dragY.get() },
    ],
  }));

  // Memoize the static portions of the modal body so we don't re-create
  // styles / JSX on every parent render. The animated style and the
  // children / title still need to be in the live tree.
  const contentBaseStyle = useMemo<ViewStyle[]>(
    () => [
      styles.content,
      { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ...(fullScreen ? [styles.fullScreen] : []),
      ...(sheet
        ? [
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderTopWidth: 1.5,
              borderTopColor: colors.cardBorder,
              borderLeftWidth: 1,
              borderLeftColor: colors.cardBorder,
              borderRightWidth: 1,
              borderRightColor: colors.cardBorder,
            },
          ]
        : []),
    ],
    [colors.card, colors.cardBorder, fullScreen, sheet]
  );

  const handleContainer = useMemo(
    () => (
      <View style={styles.sheetHeaderWrapper}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        {(title || showCloseButton) && (
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            {title ? (
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
            ) : null}
            {showCloseButton ? (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    ),
    [title, showCloseButton, onClose, colors.text, colors.textSecondary, colors.border, colors.cardBorder]
  );

  const defaultHeader = useMemo(
    () => (
      (title || showCloseButton) && (
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
          ) : null}
          {showCloseButton ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )
    ),
    [title, showCloseButton, onClose, colors.text, colors.textSecondary, colors.cardBorder]
  );

  return (
    <RNModal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}>
            <Pressable style={styles.backdropPress} onPress={onClose} />
          </Animated.View>

          <Animated.View style={[contentBaseStyle, contentStyle]}>
            {sheet ? (
              <GestureDetector gesture={panGesture}>
                {handleContainer}
              </GestureDetector>
            ) : (
              defaultHeader
            )}
            <View style={[styles.body, noPadding && styles.bodyNoPadding, bodyStyle]}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </RNModal>
  );
});

Modal.displayName = 'Modal';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPress: {
    flex: 1,
  },
  content: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fullScreen: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
  },
  sheetHeaderWrapper: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.base,
  },
  closeText: {
    fontSize: 20,
    fontWeight: '400',
  },
  body: {
    padding: spacing.xl,
  },
  bodyNoPadding: {
    padding: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
});