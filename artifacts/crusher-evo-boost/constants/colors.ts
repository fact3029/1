/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F7F5F0',
    tint: '#E9A63A',

    // Core surfaces
    background: '#11110F',
    foreground: '#F7F5F0',

    // Cards / elevated surfaces
    card: '#1B1B18',
    cardForeground: '#F7F5F0',

    // Primary action color (buttons, links, active states)
    primary: '#E9A63A',
    primaryForeground: '#17130B',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#282720',
    secondaryForeground: '#F7F5F0',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#24241F',
    mutedForeground: '#A9A59B',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#302A1C',
    accentForeground: '#F5C66C',

    // Destructive actions (delete, error states)
    destructive: '#D96857',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#34332C',
    input: '#34332C',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
