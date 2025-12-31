/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 */

// Try to use @react-native/metro-config, fallback to metro-config if not available
let getDefaultConfig, mergeConfig;
try {
  const metroConfig = require('@react-native/metro-config');
  getDefaultConfig = metroConfig.getDefaultConfig;
  mergeConfig = metroConfig.mergeConfig;
} catch (e) {
  // Fallback to metro-config
  const metroConfig = require('metro-config');
  getDefaultConfig = metroConfig.getDefaultConfig;
  mergeConfig = (defaultConfig, config) => ({...defaultConfig, ...config});
}

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts = [], sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json']} = defaultConfig.resolver || {};

const config = {
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    assetRegistryPath: require.resolve('@react-native/assets-registry/registry.js'),
  },
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [
      ...(Array.isArray(assetExts) ? assetExts.filter(ext => !['js', 'jsx', 'ts', 'tsx'].includes(ext)) : []),
      'png',
      'jpg',
      'jpeg',
      'gif',
      'svg',
      'webp',
    ],
    sourceExts: [
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      ...(Array.isArray(sourceExts) ? sourceExts.filter(ext => !['js', 'jsx', 'ts', 'tsx', 'json'].includes(ext)) : []),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
