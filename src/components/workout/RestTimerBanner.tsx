import React, { memo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRestTimer } from '../../hooks/useRestTimer';
import { AnimatedCard } from '../common/AnimatedCard';
import { useColors } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

export interface RestTimerBannerHandle {
  startTimer: (duration?: number) => void;
  dismissTimer: () => void;
}

export const RestTimerBanner = memo(
  forwardRef<RestTimerBannerHandle>((props, ref) => {
    const colors = useColors();
    const restTimer = useRestTimer();

    useImperativeHandle(ref, () => ({
      startTimer: (duration?: number) => restTimer.startTimer(duration),
      dismissTimer: () => restTimer.dismissTimer(),
    }));

    if (!restTimer.isVisible || !restTimer.isActive) {
      return null;
    }

    return (
      <AnimatedCard index={1} style={[styles.restTimerCard, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
        <View style={styles.restTimerContent}>
          <Text style={[styles.restTimerLabel, { color: colors.warning }]}>REST</Text>
          <Text style={[styles.restTimerTime, { color: colors.text }]}>
            {Math.floor(restTimer.timeRemaining / 60)}:{(restTimer.timeRemaining % 60).toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity
            style={[styles.restTimerDismiss, { borderColor: colors.warning }]}
            onPress={restTimer.dismissTimer}
          >
            <Text style={[styles.restTimerDismissText, { color: colors.warning }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>
    );
  })
);

RestTimerBanner.displayName = 'RestTimerBanner';

const styles = StyleSheet.create({
  restTimerCard: {
    marginBottom: spacing.base,
    borderWidth: 1,
  },
  restTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  restTimerLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
  },
  restTimerTime: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  restTimerDismiss: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  restTimerDismissText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
