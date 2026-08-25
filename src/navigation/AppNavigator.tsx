import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { MetricSelectionScreen } from '../screens/onboarding/MetricSelectionScreen';
import { NameInputScreen } from '../screens/auth/NameInputScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ExerciseProgressScreen } from '../screens/main/ExerciseProgressScreen';
import { AIReportScreen } from '../screens/main/AIReportScreen';
import { observer } from 'mobx-react-lite';
import { useAuth, useColors } from '../hooks';
import { Loading } from '../components/common/Loading';

const Stack = createNativeStackNavigator();

const settingsScreenOptions = { animation: 'slide_from_right' as const };
const exerciseProgressScreenOptions = { animation: 'slide_from_bottom' as const };
const aiReportScreenOptions = { animation: 'slide_from_right' as const };
const defaultScreenOptions = { headerShown: false };

export const AppNavigator = observer(() => {
  const { isInitialized, isAuthenticated, isOnboarded, isNameRequired } = useAuth();
  const colors = useColors();

  // Memoize theme object to prevent NavigationContainer re-renders (rerender-memo)
  const theme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.cardBorder,
        primary: colors.primary,
      },
    }),
    [colors]
  );

  if (!isInitialized) {
    return <Loading fullScreen message="Loading FiTrack..." />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={defaultScreenOptions}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isNameRequired ? (
          <Stack.Screen name="NameInput" component={NameInputScreen} />
        ) : !isOnboarded ? (
          <Stack.Screen name="MetricSelection" component={MetricSelectionScreen} />
        ) : (
          <>
            <Stack.Screen name="App" component={MainTabNavigator} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={settingsScreenOptions}
            />
            <Stack.Screen
              name="ExerciseProgress"
              component={ExerciseProgressScreen}
              options={exerciseProgressScreenOptions}
            />
            <Stack.Screen
              name="AIReport"
              component={AIReportScreen}
              options={aiReportScreenOptions}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});
