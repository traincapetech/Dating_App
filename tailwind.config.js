/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    './App.tsx',
    './App.js',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#9411FA',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        background: '#FFFFFF',
        surface: '#F8F9FA',
        'text-primary': '#121212',
        // …more tokens from `colors.js`
      },
      fontFamily: {
        'mona-sans-regular': ['MonaSans-Regular', 'sans-serif'],
        'mona-sans-semibold': ['MonaSans-SemiBold', 'sans-serif'],
        'mona-sans-bold': ['MonaSans-Bold', 'sans-serif'],
        'poppins-regular': ['MonaSans-Regular', 'sans-serif'],
        'poppins-bold': ['MonaSans-Bold', 'sans-serif'],
        urbanist: ['MonaSans-Regular', 'sans-serif'],
        'urbanist-bold': ['MonaSans-Bold', 'sans-serif'],
        'urbanist-medium': ['MonaSans-Medium', 'sans-serif'],
        'urbanist-semibold': ['MonaSans-SemiBold', 'sans-serif'],
        'urbanist-light': ['MonaSans-Light', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
