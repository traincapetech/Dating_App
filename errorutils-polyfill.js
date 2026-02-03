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

// atob & btoa Polyfill
if (typeof global !== 'undefined') {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  if (!global.btoa) {
    global.btoa = (input = '') => {
      let str = String(input);
      let output = '';
      for (
        let block = 0, charCode, i = 0, map = chars;
        str.charAt(i | 0) || ((map = '='), i % 1);
        output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
      ) {
        charCode = str.charCodeAt((i += 3 / 4));
        if (charCode > 0xff) {
          throw new Error(
            "'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.",
          );
        }
        block = (block << 8) | charCode;
      }
      return output;
    };
    console.log('[Polyfill] btoa initialized');
  }

  if (!global.atob) {
    global.atob = (input = '') => {
      let str = String(input).replace(/[=]+$/, '');
      if (str.length % 4 === 1) {
        throw new Error(
          "'atob' failed: The string to be decoded is not correctly encoded.",
        );
      }
      let output = '';
      for (
        let bc = 0, bs = 0, buffer, i = 0;
        (buffer = str.charAt(i++));
        ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
          ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
          : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    };
    console.log('[Polyfill] atob initialized');
  }
}

// Also ensure methods exist even if ErrorUtils was already present
if (typeof global !== 'undefined' && global.ErrorUtils) {
  const ErrorUtils = global.ErrorUtils;

  if (!ErrorUtils.setGlobalHandler) {
    ErrorUtils._globalHandler = null;
    ErrorUtils.setGlobalHandler = function (callback) {
      ErrorUtils._globalHandler = callback;
    };
  }

  if (!ErrorUtils.getGlobalHandler) {
    ErrorUtils.getGlobalHandler = function () {
      return ErrorUtils._globalHandler || null;
    };
  }
}

/**
 * NativeEventEmitter Polyfill for react-native-screenshot-prevent
 *
 * In React Native 0.65+, NativeEventEmitter requires the native module to have
 * addListener and removeListeners methods. This library (v1.2.1) doesn't have them,
 * causing a warning/error on startup.
 */
import {NativeModules} from 'react-native';

if (NativeModules.RNScreenshotPrevent) {
  const RNScreenshotPrevent = NativeModules.RNScreenshotPrevent;

  if (typeof RNScreenshotPrevent.addListener !== 'function') {
    RNScreenshotPrevent.addListener = () => {};
    console.log(
      '[NativeEventEmitter] Polyfilled RNScreenshotPrevent.addListener',
    );
  }

  if (typeof RNScreenshotPrevent.removeListeners !== 'function') {
    RNScreenshotPrevent.removeListeners = () => {};
    console.log(
      '[NativeEventEmitter] Polyfilled RNScreenshotPrevent.removeListeners',
    );
  }
}
