const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');
// const defaultConfig = getDefaultConfig(__dirname);

const config = mergeConfig(getDefaultConfig(__dirname));
module.exports = withNativeWind(config, {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },input: "./global.css"
});
