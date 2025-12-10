import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, View, Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

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
      console.error('[ERROR_BOUNDARY] Component stack:', errorInfo.componentStack);
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
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </GestureHandlerRootView>
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
