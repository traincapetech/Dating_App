// Babel plugin to inject ErrorUtils polyfill at the very start of index.js
module.exports = function({ types: t }) {
  return {
    visitor: {
      Program: {
        enter(path) {
          // Only inject in index.js
          if (this.file.opts.filename && this.file.opts.filename.includes('index.js')) {
            const polyfillCode = `
(function setupErrorUtils() {
  'use strict';
  try {
    const g = (typeof global !== 'undefined' ? global : (typeof globalThis !== 'undefined' ? globalThis : {}));
    if (!g.ErrorUtils) {
      g.ErrorUtils = {
        setGlobalHandler: function() {},
        getGlobalHandler: function() { return function() {}; },
        reportFatalError: function(error) { console.error('Fatal error:', error); }
      };
    } else {
      if (typeof g.ErrorUtils.setGlobalHandler !== 'function') {
        g.ErrorUtils.setGlobalHandler = function() {};
      }
      if (typeof g.ErrorUtils.getGlobalHandler !== 'function') {
        g.ErrorUtils.getGlobalHandler = function() { return function() {}; };
      }
      if (typeof g.ErrorUtils.reportFatalError !== 'function') {
        g.ErrorUtils.reportFatalError = function(error) { console.error('Fatal error:', error); };
      }
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.ErrorUtils = g.ErrorUtils;
    }
  } catch (e) {}
})();
`;
            // Parse and inject at the very beginning
            const polyfillAST = this.parse(polyfillCode);
            path.unshiftContainer('body', polyfillAST.body);
          }
        }
      }
    }
  };
};

