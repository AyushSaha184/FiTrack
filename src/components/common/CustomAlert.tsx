import React, { memo, ReactNode, useEffect } from 'react';
import {
  View,
  Modal as RNModal,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../hooks';
import { spacing, radius, typography } from '../../theme';

interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  actions?: AlertAction[];
  children?: ReactNode;
}

export const CustomAlert = memo<CustomAlertProps>(({
  visible,
  onClose,
  title,
  message,
  actions = [{ text: 'OK', onPress: onClose }],
  children,
}) => {
  const colors = useColors();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const getActionColor = (style?: string) => {
    switch (style) {
      case 'destructive':
        return colors.error;
      case 'cancel':
        return colors.textSecondary;
      default:
        return colors.text;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}
        >
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.alertBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
            },
            contentStyle,
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          )}
          {children}
          <View style={[styles.actionsContainer, { borderTopColor: colors.cardBorder }]}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.cardBorder },
                ]}
                onPress={() => {
                  action.onPress?.();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: getActionColor(action.style),
                      fontWeight: action.style === 'cancel' ? '400' : '600',
                    },
                  ]}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
});

CustomAlert.displayName = 'CustomAlert';

const styles = StyleSheet.create({
  container: {
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
  alertBox: {
    width: '80%',
    maxWidth: 320,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: typography.h5.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  message: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: typography.body.fontSize,
  },
});
