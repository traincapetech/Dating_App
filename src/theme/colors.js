import {useColorScheme} from 'react-native';

// Spark app primary color - a warm, romantic pink/coral
export const SEED_COLOR = '#9411FA';

// Custom color palette for the dating app
export const AppColors = {
  primary: '#9411FA',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  like: '#4CD964',
  reject: '#FF3B30',
  match: '#FF2D55',
  background: {
    light: '#FFFFFA',
    dark: '#0A0A0F',
  },
  surface: {
    light: '#FFFFFA',
    dark: '#101014',
  },
  text: {
    light: '#121212',
    dark: '#F5F5F5',
  },
  textSecondary: {
    light: '#6C757D',
    dark: '#A9A9B3',
  },
};

const theme = {
  light: {
    primary: AppColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#F0DCFF',
    onPrimaryContainer: '#2B0057',
    secondary: AppColors.secondary,
    onSecondary: '#002B28',
    background: AppColors.background.light,
    onBackground: AppColors.text.light,
    surface: AppColors.surface.light,
    onSurface: AppColors.text.light,
    surfaceVariant: '#E8E3EB',
    onSurfaceVariant: '#49454F',
    outline: '#7F7C84',
    error: '#B3261E',
  },
  dark: {
    primary: '#D9B4FF',
    onPrimary: '#1F003D',
    primaryContainer: '#3D006F',
    onPrimaryContainer: '#F6ECFF',
    secondary: '#7FD7CF',
    onSecondary: '#002024',
    background: AppColors.background.dark,
    onBackground: AppColors.text.dark,
    surface: AppColors.surface.dark,
    onSurface: AppColors.text.dark,
    surfaceVariant: '#201C24',
    onSurfaceVariant: '#CDC9D9',
    outline: '#99939E',
    error: '#F2B8B5',
  },
};

export const colors = {
  primary: theme.light.primary,
  primaryDark: theme.dark.primary,
  primaryLight: '#C48EFF',
  secondary: theme.light.secondary,
  accent: AppColors.accent,
  background: theme.light.background,
  backgroundSecondary: '#F4F4F8',
  surface: theme.light.surface,
  textPrimary: theme.light.onBackground,
  textSecondary: '#6C757D',
  textTertiary: '#A9A9B3',
  textInverse: '#FFFFFF',
  border: '#E4E4F0',
  borderLight: '#F3F3F8',
  inputBackground: '#F6F5FF',
  success: AppColors.like,
  warning: '#FFC857',
  error: theme.light.error,
  like: AppColors.like,
  reject: AppColors.reject,
  match: AppColors.match,
};

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return {
    isDark,
    theme,
    colors: {
      ...currentTheme,
      ...colors,
    },
  };
}
