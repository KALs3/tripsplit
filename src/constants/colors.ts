/**
 * TripSplit Design System — Pure Monochrome Foundation
 *
 * 90% monochrome surfaces & crisp typography; green and red are reserved
 * exclusively for financial credit/debt meaning and sync states.
 */

export const colors = {
  // Primary monochrome brand anchor (used for legacy/accent lookups)
  primary: '#09090B',
  primaryHover: '#27272A',
  primaryLight: '#F4F4F5',
  primaryDark: '#18181B',

  // Financial & Sync Semantic Status Colors ONLY
  success: '#16A34A',
  successDark: '#22C55E',
  successLight: '#DCFCE7',

  danger: '#DC2626',
  dangerDark: '#F87171',
  dangerLight: '#FEE2E2',

  warning: '#D97706',
  warningLight: '#FEF3C7',

  info: '#52525B',
  infoLight: '#F4F4F5',

  // Monochrome tonal steps for Donut Chart & Map Pin markers
  categories: {
    food: '#09090B',
    transport: '#3F3F46',
    lodging: '#52525B',
    activities: '#71717A',
    shopping: '#A1A1AA',
    other: '#D4D4D8',
  },

  categoriesDark: {
    food: '#FAFAFA',
    transport: '#D4D4D8',
    lodging: '#A1A1AA',
    activities: '#71717A',
    shopping: '#52525B',
    other: '#3F3F46',
  },

  // Light Mode Palette (Daylight Paper & Jet Ink)
  light: {
    background: '#F4F4F5',
    card: '#FFFFFF',
    surface: '#ECECEF',
    border: '#E4E4E7',
    borderStrong: '#D4D4D8',
    text: '#09090B',
    textMuted: '#71717A',
    textInverse: '#FFFFFF',
    accent: '#09090B',
    accentText: '#FFFFFF',
    credit: '#16A34A',
    debt: '#DC2626',
    tint: '#09090B',
    tabIconDefault: '#A1A1AA',
    tabIconSelected: '#09090B',
  },

  // Dark Mode Palette (Obsidian & Crisp Alabaster)
  dark: {
    background: '#09090B',
    card: '#121215',
    surface: '#1C1C21',
    border: '#27272A',
    borderStrong: '#3F3F46',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    textInverse: '#09090B',
    accent: '#FAFAFA',
    accentText: '#09090B',
    credit: '#22C55E',
    debt: '#F87171',
    tint: '#FAFAFA',
    tabIconDefault: '#71717A',
    tabIconSelected: '#FAFAFA',
  },
};
