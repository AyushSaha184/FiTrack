import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { observer } from 'mobx-react-lite';
import { useAuth, useColors } from '../hooks';
import { HomeSkeletonLoading } from '../components/common/HomeSkeletonLoading';

const Stack = createNativeStackNavigator();

const settingsScreenOptions = { animation: 'slide_from_right' as const };
const exerciseProgressScreenOptions = { animation: 'slide_from_bottom' as const };
const aiReportScreenOptions = { animation: 'slide_from_right' as const };
const defaultScreenOptions = { headerShown: false };

// Lazy screen loaders to reduce initial JS parse time during cold start
const getAuthNavigator = () => require('./AuthNavigator').AuthNavigator;
const getNameInputScreen = () => require('../screens/auth/NameInputScreen').NameInputScreen;
const getMetricSelectionScreen = () => require('../screens/onboarding/MetricSelectionScreen').MetricSelectionScreen;
const getSettingsScreen = () => require('../screens/settings/SettingsScreen').SettingsScreen;
const getExerciseProgressScreen = () => require('../screens/main/ExerciseProgressScreen').ExerciseProgressScreen;
const getAIReportScreen = () => require('../screens/main/AIReportScreen').AIReportScreen;

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
    return <HomeSkeletonLoading />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={defaultScreenOptions}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" getComponent={getAuthNavigator} />
        ) : isNameRequired ? (
          <Stack.Screen name="NameInput" getComponent={getNameInputScreen} />
        ) : !isOnboarded ? (
          <Stack.Screen name="MetricSelection" getComponent={getMetricSelectionScreen} />
        ) : (
          <>
            <Stack.Screen name="App" component={MainTabNavigator} />
            <Stack.Screen
              name="Settings"
              getComponent={getSettingsScreen}
              options={settingsScreenOptions}
            />
            <Stack.Screen
              name="ExerciseProgress"
              getComponent={getExerciseProgressScreen}
              options={exerciseProgressScreenOptions}
            />
            <Stack.Screen
              name="AIReport"
              getComponent={getAIReportScreen}
              options={aiReportScreenOptions}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});
