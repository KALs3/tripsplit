/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['SpaceGrotesk_400Regular'],
        medium: ['SpaceGrotesk_500Medium'],
        semibold: ['SpaceGrotesk_600SemiBold'],
        bold: ['SpaceGrotesk_700Bold'],
        'sans-ar': ['Cairo_400Regular'],
        'medium-ar': ['Cairo_500Medium'],
        'semibold-ar': ['Cairo_600SemiBold'],
        'bold-ar': ['Cairo_700Bold'],
      },
      colors: {
        canvas: {
          DEFAULT: '#FFFFFF',
          dark: '#09090B',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#121215',
        },
        surface: {
          DEFAULT: '#F4F4F5',
          dark: '#1C1C21',
        },
        hairline: {
          DEFAULT: '#E4E4E7',
          dark: '#27272A',
        },
        ink: {
          DEFAULT: '#09090B',
          dark: '#FAFAFA',
        },
        muted: {
          DEFAULT: '#71717A',
          dark: '#A1A1AA',
        },
        credit: {
          DEFAULT: '#16A34A',
          dark: '#22C55E',
        },
        debt: {
          DEFAULT: '#DC2626',
          dark: '#F87171',
        },
      },
    },
  },
  plugins: [],
};
