import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, View, Text, Platform} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {LoadingProvider} from './src/context/LoadingContext';
import {AuthProvider} from './src/context/AuthContext';

import {InitialLoadProvider} from './src/context/InitialLoadContext';
import {StripeProvider} from '@stripe/stripe-react-native';

import './global.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR_BOUNDARY] Caught error:', error);
    console.error('[ERROR_BOUNDARY] Error info:', errorInfo);
    // Safely access stack property to avoid Hermes "invalid receiver" errors
    try {
      const stack = error?.stack;
      if (stack) {
        console.error('[ERROR_BOUNDARY] Error stack:', stack);
      }
    } catch (e) {
      // Ignore stack access errors
    }
    if (errorInfo?.componentStack) {
      console.error(
        '[ERROR_BOUNDARY] Component stack:',
        errorInfo.componentStack,
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
          <Text style={styles.errorDetails}>
            Check Metro bundler and reload the app
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  console.log('[APP] App component rendering');

  React.useEffect(() => {
    console.log('[APP] App mounted successfully - useEffect fired');
  }, []);

  console.log('[APP] About to render ErrorBoundary');

  return (
    <ErrorBoundary>
      <InitialLoadProvider>
        <LoadingProvider>
          <AuthProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.container}>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor={Platform.OS === 'android' ? '#FFF' : undefined}
                  translucent={Platform.OS === 'android'}
                />
                <StripeProvider
                  publishableKey={process.env.STRIPE_PUBLISHABLE_KEY || ""} // Ideally from .env
                >
                  <AppNavigator />
                </StripeProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </AuthProvider>
        </LoadingProvider>
      </InitialLoadProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default App;
