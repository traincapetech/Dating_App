import {useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/**
 * Custom hook for responsive design
 * Provides screen dimensions and safe area insets
 */
export const useResponsive = () => {
  const {width, height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Common breakpoints for mobile
  const isSmallScreen = width < 375; // iPhone SE, small Android phones
  const isMediumScreen = width >= 375 && width < 414; // iPhone 12/13/14
  const isLargeScreen = width >= 414; // iPhone Pro Max, large Android phones

  // Responsive spacing multipliers
  const spacingMultiplier = isSmallScreen ? 0.85 : isMediumScreen ? 1 : 1.15;

  // Responsive font size multipliers
  const fontSizeMultiplier = isSmallScreen ? 0.9 : 1;

  return {
    width,
    height,
    insets,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    spacingMultiplier,
    fontSizeMultiplier,
  };
};

