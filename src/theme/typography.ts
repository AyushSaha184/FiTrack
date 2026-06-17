import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: fontFamilyMedium,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroNumber: {
    fontFamily: fontFamilyMedium,
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -1,
  },
  h1: {
    fontFamily: fontFamilyMedium,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fontFamilyMedium,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fontFamilyMedium,
    fontSize: 22,
    fontWeight: '700',
  },
  h4: {
    fontFamily: fontFamilyMedium,
    fontSize: 20,
    fontWeight: '700',
  },
  h5: {
    fontFamily: fontFamilyMedium,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    fontWeight: '500',
  },
  bodyBold: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    fontWeight: '600',
  },
  caption: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
  },
  captionMedium: {
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    fontWeight: '500',
  },
  small: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
  },
  sectionLabel: {
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    fontWeight: '600',
  },
};

export const sizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 58,
  display: 30,
};

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};
