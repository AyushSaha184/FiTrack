import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks';
import { spacing, typography } from '../../theme';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export const Loading = memo<LoadingProps>(({ size = 'large', message, fullScreen = false }) => {
  const colors = useColors();

  const containerStyle = fullScreen
    ? [styles.container, styles.fullScreen, { backgroundColor: colors.background }]
    : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
});

Loading.displayName = 'Loading';

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  message: {
    marginTop: spacing.base,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
  },
});