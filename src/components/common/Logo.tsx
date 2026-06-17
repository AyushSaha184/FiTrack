import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks';
import { typography } from '../../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showText?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  color,
  showText = true,
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  const getSizes = () => {
    switch (size) {
      case 'small':
        return { iconSize: 22, fontSize: 18, spacing: 6 };
      case 'large':
        return { iconSize: 48, fontSize: 36, spacing: 12 };
      case 'medium':
      default:
        return { iconSize: 32, fontSize: 26, spacing: 8 };
    }
  };

  const { iconSize, fontSize, spacing } = getSizes();
  
  // Custom gray color for "Fi" and the logo icon to match the premium gray/silver aesthetic
  const brandGray = color || (isDark ? '#8E8E93' : '#767680');
  const primaryTextColor = colors.text;

  return (
    <View style={[styles.container, { gap: spacing }, style]}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none">
        {/* Left Stem / Backbone */}
        <Path
          d="M 28,25 C 38,25 44,28 44,34 C 40,48 32,70 18,90 C 20,76 24,56 28,25 Z"
          fill={brandGray}
        />
        {/* Top Right Wing */}
        <Path
          d="M 48,30 C 62,24 76,20 90,20 C 92,23 88,27 82,30 C 68,37 54,43 42,47 C 43,42 45,36 48,30 Z"
          fill={brandGray}
        />
        {/* Middle Right Wing */}
        <Path
          d="M 43,50 C 54,46 66,42 78,42 C 80,45 76,49 71,51 C 60,56 48,61 36,66 C 38,61 40,55 43,50 Z"
          fill={brandGray}
        />
      </Svg>
      {showText && (
        <Text
          style={[
            styles.text,
            { fontSize, color: primaryTextColor },
            textStyle,
          ]}
        >
          <Text style={{ color: brandGray }}>Fi</Text>
          <Text style={{ fontWeight: '700' }}>Track</Text>
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '400',
    letterSpacing: -0.5,
  },
});
