import { useMemo } from 'react';
import { colors, ThemeColors, typography, spacing, radius } from '../theme';
import { useSettingsStore } from '../stores';
import { Appearance } from 'react-native';
import type { ThemeId } from '../stores/SettingsStore';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
  themeId: ThemeId;
}

const resolvePaletteId = (
  themeId: ThemeId,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>,
): 'light' | 'dark' | 'amoled' => {
  if (themeId === 'auto') {
    return colorScheme === 'light' ? 'light' : 'dark';
  }
  return themeId;
};

export const useTheme = (): Theme => {
  const settingsStore = useSettingsStore();
  const colorScheme = Appearance.getColorScheme();

  const paletteId = resolvePaletteId(settingsStore.theme, colorScheme);

  const isDark = useMemo(() => {
    if (settingsStore.theme === 'auto') return colorScheme !== 'light';
    return settingsStore.theme !== 'light';
  }, [settingsStore.theme, colorScheme]);

  const theme = useMemo<Theme>(
    () => ({
      colors: colors[paletteId],
      typography,
      spacing,
      radius,
      isDark,
      themeId: settingsStore.theme,
    }),
    [paletteId, isDark, settingsStore.theme],
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
