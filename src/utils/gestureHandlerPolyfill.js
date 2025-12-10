// Polyfill for React Native Gesture Handler initialization issue with RN 0.78
// CRITICAL: This MUST run before ANY React Native code imports
// This file is executed immediately when imported - no function wrapper

// Ensure global exists
if (typeof global === 'undefined') {
  if (typeof window !== 'undefined') {
    window.global = window;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  }
}

// Create ErrorUtils IMMEDIATELY - no IIFE, execute at module load time
const g = typeof global !== 'undefined' ? global : (typeof globalThis !== 'undefined' ? globalThis : {});

if (!g.ErrorUtils) {
  g.ErrorUtils = {
    setGlobalHandler: function() {},
    getGlobalHandler: function() { return function() {}; },
    reportFatalError: function(error) {
      console.error('Fatal error:', error);
    }
  };
} else {
  // Ensure all methods exist
  if (typeof g.ErrorUtils.setGlobalHandler !== 'function') {
    g.ErrorUtils.setGlobalHandler = function() {};
  }
  if (typeof g.ErrorUtils.getGlobalHandler !== 'function') {
    g.ErrorUtils.getGlobalHandler = function() { return function() {}; };
  }
  if (typeof g.ErrorUtils.reportFatalError !== 'function') {
    g.ErrorUtils.reportFatalError = function(error) {
      console.error('Fatal error:', error);
    };
  }
}

// Also ensure it's available on globalThis for React Native 0.78+
if (typeof globalThis !== 'undefined' && !globalThis.ErrorUtils) {
  globalThis.ErrorUtils = g.ErrorUtils;
}

