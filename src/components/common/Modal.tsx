import React, { memo, ReactNode, useEffect } from 'react';
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
} from 'react-native-reanimated';
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
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.95, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
            fullScreen && styles.fullScreen,
            sheet && styles.sheet,
            contentStyle,
          ]}
        >
          {sheet && (
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
            </View>
          )}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={[styles.body, noPadding && { padding: 0 }, bodyStyle]}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
});

Modal.displayName = 'Modal';

const styles = StyleSheet.create({
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