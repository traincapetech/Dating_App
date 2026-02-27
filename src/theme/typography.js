// Industry-standard typography for dating apps
// Using system fonts that are clean and modern
export const typography = {
  // Font families - using system fonts for best performance
  // On iOS: San Francisco, On Android: Roboto
  fontFamilyRegular: 'System',
  fontFamilyMedium: 'System',
  fontFamilyBold: 'System',
  fontFamilySemiBold: 'System',

  // Heading sizes - larger, bolder for dating app feel
  headings: {
    h1: 34, // Large hero text
    h2: 28, // Section titles
    h3: 24, // Card titles
    h4: 20, // Subsection titles
  },

  // Body text sizes - optimized for readability
  body: {
    large: 17, // Primary body text
    medium: 15, // Secondary body text
    small: 13, // Tertiary text
  },

  // Specialized text sizes
  caption: 11, // Small labels, timestamps
  button: 16, // Button text
  label: 13, // Form labels

  // Line heights for better readability
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};
