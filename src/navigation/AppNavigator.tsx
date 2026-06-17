import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { MetricSelectionScreen } from '../screens/onboarding/MetricSelectionScreen';
import { useAuth } from '../hooks';
import { Loading } from '../components/common/Loading';
import { useColors } from '../hooks';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isInitialized, isAuthenticated, isOnboarded } = useAuth();
  const colors = useColors();

  const theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.cardBorder,
      primary: colors.primary,
    },
  };

  if (!isInitialized) {
    return <Loading fullScreen message="Loading FiTrack..." />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !isOnboarded ? (
          <Stack.Screen name="MetricSelection" component={MetricSelectionScreen} />
        ) : (
          <Stack.Screen name="App" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};