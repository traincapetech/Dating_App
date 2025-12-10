const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    assetRegistryPath: path.resolve(__dirname, 'node_modules/react-native/Libraries/Image/AssetRegistry.js'),
  },
  resolver: {
    assetExts: [
      'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp',
      'ttf', 'otf', 'woff', 'woff2',
      'mp4', 'mov', 'avi', 'webm',
      'm4a', 'aac', 'ogg', 'wav',
    ],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
