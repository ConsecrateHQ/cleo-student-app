// theme/colors.ts

// Base color palette
const palette = {
  // Primary background colors
  background: {
    primary: "#121212", // Main dark background
    secondary: "#1E1E1E", // Slightly lighter background
    tertiary: "#262626", // Card/box backgrounds
  },

  // Rainbow gradient colors
  gradient: {
    start: "#FF3366", // Pink/Red
    middle1: "#9C27B0", // Purple
    middle2: "#3F51B5", // Indigo
    middle3: "#2196F3", // Blue
    end: "#00BCD4", // Cyan
  },

  // UI colors
  ui: {
    primary: "#0088FF", // Primary action buttons (Accept/Try Again)
    secondary: "#FFFFFF", // Secondary buttons and icons
    active: "#FFFFFF", // Active state
    inactive: "#808080", // Inactive state
    divider: "#333333", // Dividers/separators
    error: "#FF3B30", // Error states
    success: "#4CD964", // Success states
    warning: "#FFCC00", // Warning states
  },

  // Text colors
  text: {
    primary: "#FFFFFF", // Primary text
    secondary: "#AAAAAA", // Secondary/dimmed text
    tertiary: "#666666", // Further dimmed text
    accent: "#0088FF", // Accent text (matching UI primary)
  },

  // Misc colors
  session: {
    iot: "#0088FF", // IOT class color
    ae: "#FF3366", // AE class color
    python: "#4CD964", // Python class color
  },

  // Base colors
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

// Semantic naming for usage in the app
const colors = {
  // App backgrounds
  background: {
    app: palette.background.primary,
    card: palette.background.secondary,
    modal: palette.background.tertiary,
  },

  // Text styling
  text: {
    primary: palette.text.primary,
    secondary: palette.text.secondary,
    tertiary: palette.text.tertiary,
    accent: palette.text.accent,
  },

  // UI elements
  button: {
    primary: palette.ui.primary,
    text: palette.white,
    disabled: palette.ui.inactive,
  },

  // Session states and indicators
  session: {
    iot: palette.session.iot,
    ae: palette.session.ae,
    python: palette.session.python,
  },

  // Status indicators
  status: {
    active: palette.ui.active,
    inactive: palette.ui.inactive,
    error: palette.ui.error,
    success: palette.ui.success,
    warning: palette.ui.warning,
  },

  // The gradient for the login curve
  gradient: [
    palette.gradient.start,
    palette.gradient.middle1,
    palette.gradient.middle2,
    palette.gradient.middle3,
    palette.gradient.end,
  ],

  // Utility colors
  divider: palette.ui.divider,
  icon: palette.ui.secondary,
  overlay: "rgba(0, 0, 0, 0.5)",
};

export default colors;
