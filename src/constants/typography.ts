import { TextStyle } from 'react-native';

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/**
 * Ensures monetary figures, percentages, and counts align pixel-for-pixel vertically.
 */
export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};
