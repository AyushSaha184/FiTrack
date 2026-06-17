import { useMemo } from 'react';
import { colors, ThemeColors, typography, spacing, radius } from '../theme';
import { useSettingsStore } from '../stores';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
}

export const useTheme = (): Theme => {
  const settingsStore = useSettingsStore();
  const colorScheme = Appearance.getColorScheme();

  const isDark = useMemo(() => {
    if (settingsStore.theme === 'auto') {
      return colorScheme === 'dark';
    }
    return settingsStore.theme === 'dark';
  }, [settingsStore.theme, colorScheme]);

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? colors.dark : colors.light,
      typography,
      spacing,
      radius,
      isDark,
    }),
    [isDark],
  );

  return theme;
};

export const useColors = () => {
  const theme = useTheme();
  return theme.colors;
};

export const useTypography = () => {
  const theme = useTheme();
  return theme.typography;
};

export const useSpacing = () => {
  const theme = useTheme();
  return theme.spacing;
};