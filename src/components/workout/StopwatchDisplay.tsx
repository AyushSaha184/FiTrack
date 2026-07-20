import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStopwatch } from '../../hooks/useStopwatch';
import { Modal } from '../common/Modal';
import { useColors } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';

export const StopwatchDisplay = memo(() => {
  const colors = useColors();
  const stopwatch = useStopwatch();
  const [showStopwatchDialog, setShowStopwatchDialog] = useState(false);

  const handleStopwatchPress = () => {
    if (stopwatch.isRunning) {
      stopwatch.stop();
      setShowStopwatchDialog(true);
    } else {
      stopwatch.start();
    }
  };

  const handleStopwatchDialogClose = () => {
    setShowStopwatchDialog(false);
  };

  const handleStopwatchReset = () => {
    stopwatch.reset();
    setShowStopwatchDialog(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.stopwatchButton,
          {
            backgroundColor: stopwatch.isRunning ? colors.primary : 'rgba(255,255,255,0.08)',
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={handleStopwatchPress}
        activeOpacity={0.7}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
          <Circle cx="12" cy="13" r="8" />
          <Path d="M12 9v4l2 2" />
          <Path d="M12 2v3" />
          <Path d="M9 2h6" />
        </Svg>
        <Text style={[styles.stopwatchText, { color: colors.text }]}>
          {stopwatch.getFormattedTime()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showStopwatchDialog}
        onClose={handleStopwatchDialogClose}
        title="Workout Timer"
        sheet
      >
        <View style={styles.stopwatchDialog}>
          <Text style={[styles.stopwatchDialogTime, { color: colors.text }]}>
            {stopwatch.getFormattedTime()}
          </Text>
          <View style={styles.stopwatchDialogStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Started</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stopwatch.startTime ? new Date(stopwatch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ended</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stopwatch.endTime ? new Date(stopwatch.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Running'}
              </Text>
            </View>
          </View>
          <View style={styles.stopwatchDialogActions}>
            <TouchableOpacity
              style={[styles.stopwatchDialogBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              onPress={handleStopwatchReset}
            >
              <Text style={[styles.stopwatchDialogBtnText, { color: colors.text }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stopwatchDialogBtn, { backgroundColor: colors.primary }]}
              onPress={handleStopwatchDialogClose}
            >
              <Text style={[styles.stopwatchDialogBtnText, { color: colors.background }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

StopwatchDisplay.displayName = 'StopwatchDisplay';

const styles = StyleSheet.create({
  stopwatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  stopwatchText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  stopwatchDialog: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  stopwatchDialogTime: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xl,
  },
  stopwatchDialogStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  stopwatchDialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  stopwatchDialogBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  stopwatchDialogBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
