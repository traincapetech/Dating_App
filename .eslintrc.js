module.exports = {
  root: true,
  extends: '@react-native',
  globals: {
    atob: 'readable',
    btoa: 'readable',
    Buffer: 'readable',
  },
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': 'warn',
    curly: 'off',
  },
};
