import React, { memo, ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../hooks';
import { spacing, radius, shadow } from '../../theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  borderRadius?: keyof typeof radius;
  elevated?: boolean;
}

export const Card = memo<CardProps>(({
  children,
  style,
  padding = 'xl',
  borderRadius = 'lg',
  elevated = false,
}) => {
  const colors = useColors();

  const cardStyles: ViewStyle = {
    backgroundColor: colors.cardSurface,
    borderRadius: radius[borderRadius],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing[padding],
    ...(elevated && { ...shadow.md }),
  };

  return <View style={[cardStyles, style]}>{children}</View>;
});

Card.displayName = 'Card';