import React, { useEffect } from 'react';
import { StatusBar, LogBox, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { logger, errorLogs } from './utils/logger';
import { crashReportsService } from './services/supabase/crashReports';
import { CONFIG } from './config/constants';
import { AppNavigator } from './navigation/AppNavigator';
import { StoreContext, rootStore } from './stores';
import { colors } from './theme';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const globalErrorHandler = (error: Error, isFatal?: boolean) => {
  logger.error('[Global] Unhandled error:', error, `isFatal: ${isFatal}`);
  if (isFatal || __DEV__) {
    const payload = crashReportsService.buildPayload({
      diagnosticLogs: [...errorLogs, {
        timestamp: new Date().toISOString(),
        message: `${error.message}\n${error.stack || ''}`,
      }],
    });
    crashReportsService.submit(payload);
  }
};

if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
  ErrorUtils.setGlobalHandler(globalErrorHandler);
}

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
  reportSent: boolean;
  isSendingReport: boolean;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, reportSent: false, isSendingReport: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, reportSent: false, isSendingReport: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('[App] Uncaught error:', error, info?.componentStack);
    this.sendCrashReport(error, info?.componentStack ?? undefined);
  }

  async sendCrashReport(error: Error, componentStack?: string) {
    const payload = crashReportsService.buildPayload({
      diagnosticLogs: [...errorLogs, {
        timestamp: new Date().toISOString(),
        message: `${error.message}\n${error.stack || ''}\nComponent Stack: ${componentStack || ''}`,
      }],
    });
    const result = await crashReportsService.submit(payload);
    if (result) {
      this.setState({ reportSent: true });
    }
  }

  handleRetry = () => {
    this.setState({ error: null, reportSent: false, isSendingReport: false });
  }

  handleSendReport = async () => {
    this.setState({ isSendingReport: true });
    if (this.state.error) {
      await this.sendCrashReport(this.state.error);
    }
    this.setState({ isSendingReport: false });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errContainer}>
          <Text style={styles.errTitle}>Something went wrong</Text>
          <ScrollView style={styles.errScroll}>
            <Text style={styles.errMessage}>{this.state.error.message}</Text>
            {this.state.error.stack ? (
              <Text style={styles.errStack}>{this.state.error.stack}</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportButton, this.state.reportSent && styles.reportButtonSent]}
            onPress={this.handleSendReport}
            disabled={this.state.isSendingReport || this.state.reportSent}
          >
            <Text style={styles.reportButtonText}>
              {this.state.reportSent ? 'Report Sent' : this.state.isSendingReport ? 'Sending...' : 'Send Crash Report'}
            </Text>
          </TouchableOpacity>
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
  retryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  reportButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  reportButtonSent: {
    backgroundColor: 'rgba(52,199,89,0.2)',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
