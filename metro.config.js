const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const MetroServer = require('metro/src/Server');

// Patch Metro Server's _symbolicate method to handle undefined body
const originalSymbolicate = MetroServer.prototype._symbolicate;
MetroServer.prototype._symbolicate = async function(req, res) {
  try {
    const body = await req.rawBody;
    if (!body || body === 'undefined' || typeof body !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid symbolication request',
        stack: []
      }));
      return;
    }
    // Validate JSON before passing to original handler
    try {
      JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid JSON in symbolication request',
        stack: []
      }));
      return;
    }
    return originalSymbolicate.call(this, req, res);
  } catch (error) {
    // Fallback to original if our patch fails
    if (error.message && error.message.includes('not valid JSON')) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid symbolication request',
        stack: []
      }));
      return;
    }
    return originalSymbolicate.call(this, req, res);
  }
};

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  transformer: {
    unstable_allowRequireContext: true,
  },
});
