module.exports = {
  dependencies: {
    'react-native-screenshot-prevent': {
      platforms: {
        android: null,
      },
    },
  },
  assets: [
    './src/assets/fonts', // your custom fonts ✅
    './node_modules/react-native-vector-icons/Fonts', // 🔥 required for icons
  ],
};