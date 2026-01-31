/**
 * ErrorUtils Polyfill
 * 
 * This MUST run before any other code.
 * It ensures ErrorUtils exists on the global object before react-native-reanimated
 * tries to use it.
 */

// Create ErrorUtils on global if it doesn't exist
if (typeof global !== 'undefined' && !global.ErrorUtils) {
  global.ErrorUtils = {
    _globalHandler: null,
    
    setGlobalHandler(callback) {
      this._globalHandler = callback;
    },
    
    getGlobalHandler() {
      return this._globalHandler;
    },
    
    reportError(error) {
      if (this._globalHandler) {
        this._globalHandler(error);
      } else {
        console.error('ErrorUtils.reportError:', error);
      }
    },
    
    reportFatalError(error) {
      console.error('ErrorUtils.reportFatalError:', error);
      this.reportError(error);
    },
  };
  
  console.log('[ErrorUtils] Polyfill initialized');
}

// Also ensure methods exist even if ErrorUtils was already present
if (typeof global !== 'undefined' && global.ErrorUtils) {
  const ErrorUtils = global.ErrorUtils;
  
  if (!ErrorUtils.setGlobalHandler) {
    ErrorUtils._globalHandler = null;
    ErrorUtils.setGlobalHandler = function(callback) {
      ErrorUtils._globalHandler = callback;
    };
  }
  
  if (!ErrorUtils.getGlobalHandler) {
    ErrorUtils.getGlobalHandler = function() {
      return ErrorUtils._globalHandler || null;
    };
  }
}
