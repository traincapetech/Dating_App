// Polyfill for crypto.getRandomValues() in React Native
// This is needed for libraries like uuid that require crypto.getRandomValues()

if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  // Simple polyfill using Math.random() for React Native
  // Note: This is not cryptographically secure, but sufficient for UUID generation
  global.crypto.getRandomValues = function(buffer) {
    if (buffer instanceof Uint8Array) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    } else if (buffer instanceof Uint16Array) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 65536);
      }
    } else if (buffer instanceof Uint32Array) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 4294967296);
      }
    }
    return buffer;
  };
}

