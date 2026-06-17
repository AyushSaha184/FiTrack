import React, { useEffect } from 'react';
import { StatusBar, LogBox, View, Text, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './utils/logger';
import { AppNavigator } from './navigation/AppNavigator';
import { StoreContext, rootStore } from './stores';
import { colors } from './theme';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App] Uncaught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errContainer}>
          <Text style={styles.errTitle}>App failed to start</Text>
          <ScrollView style={styles.errScroll}>
            <Text style={styles.errMessage}>{this.state.error.message}</Text>
            {this.state.error.stack ? (
              <Text style={styles.errStack}>{this.state.error.stack}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  errTitle: {
    color: '#FF453A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  errScroll: {
    flex: 1,
  },
  errMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  errStack: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.dark.background }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StoreContext.Provider value={rootStore}>
              <StatusBar barStyle="light-content" backgroundColor={colors.dark.background} />
              <AppNavigator />
            </StoreContext.Provider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
