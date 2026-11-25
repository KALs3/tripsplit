import { StyleProp, StyleSheet, TextStyle } from 'react-native';

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const arabicFonts = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

/**
 * Ensures monetary figures, percentages, and counts align pixel-for-pixel vertically.
 */
export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/**
 * Computes optical Arabic font size and generous line height for Cairo so Arabic
 * copy stays crisp alongside SpaceGrotesk numbers without clipping ascenders/descenders.
 */
export function getScaledArabicMetrics(
  baseSize: number,
  preserveNumericSize: boolean
): { fontSize: number; lineHeight: number } {
  if (preserveNumericSize) {
    return {
      fontSize: baseSize,
      lineHeight: Math.round(baseSize * 1.25),
    };
  }

  let fontSize = baseSize;
  if (baseSize <= 11) {
    fontSize = 13;
  } else if (baseSize <= 12) {
    fontSize = 13.5;
  } else if (baseSize <= 13) {
    fontSize = 14.5;
  } else if (baseSize <= 14) {
    fontSize = 15.5;
  } else if (baseSize <= 15) {
    fontSize = 16.5;
  } else if (baseSize <= 24) {
    fontSize = baseSize + 1;
  }

  const ratio = fontSize <= 14 ? 1.5 : fontSize <= 20 ? 1.45 : 1.35;
  return {
    fontSize,
    lineHeight: Math.round(fontSize * ratio),
  };
}

/**
 * Resolves className and inline styles for Arabic mode: swaps font family to Cairo,
 * clears negative tracking so cursive ligatures stay intact, and scales font size/lineHeight.
 */
export function resolveArabicTypography(
  className: string | undefined,
  style: StyleProp<TextStyle>,
  isArabic: boolean
): { className: string | undefined; style: StyleProp<TextStyle> } {
  if (!isArabic) {
    return { className, style };
  }

  const rawClass = className || '';
  const flat = (style ? StyleSheet.flatten(style) : undefined) || {};

  const hasInviteTracking = rawClass.includes('tracking-[2px]');
  const isTabular =
    Array.isArray(flat.fontVariant) && flat.fontVariant.includes('tabular-nums');
  const isLtrNumeric = isTabular && flat.writingDirection === 'ltr';

  let fontFamily: string = arabicFonts.regular;
  let nextClass = rawClass;

  if (/\bfont-bold\b/.test(nextClass)) {
    fontFamily = arabicFonts.bold;
    nextClass = nextClass.replace(/\bfont-bold\b/g, 'font-bold-ar');
  } else if (/\bfont-semibold\b/.test(nextClass)) {
    fontFamily = arabicFonts.semibold;
    nextClass = nextClass.replace(/\bfont-semibold\b/g, 'font-semibold-ar');
  } else if (/\bfont-medium\b/.test(nextClass)) {
    fontFamily = arabicFonts.medium;
    nextClass = nextClass.replace(/\bfont-medium\b/g, 'font-medium-ar');
  } else if (/\bfont-sans\b/.test(nextClass)) {
    fontFamily = arabicFonts.regular;
    nextClass = nextClass.replace(/\bfont-sans\b/g, 'font-sans-ar');
  } else {
    nextClass = `font-sans-ar ${nextClass}`.trim();
  }

  if (!hasInviteTracking) {
    nextClass = nextClass
      .replace(/\btracking-(?:tight|tighter|normal|wide|wider|widest|\[[^\]]+\])\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const sizeMatch = rawClass.match(/\btext-\[(\d+(?:\.\d+)?)px\]/);
  const baseSize = flat.fontSize ?? (sizeMatch ? Number(sizeMatch[1]) : 14);
  const metrics = getScaledArabicMetrics(baseSize, isLtrNumeric);

  const arabicOverride: TextStyle = {
    fontFamily,
    fontSize: metrics.fontSize,
    ...(isLtrNumeric ? {} : { lineHeight: metrics.lineHeight }),
    ...(hasInviteTracking ? {} : { letterSpacing: 0 }),
  };

  return {
    className: nextClass,
    style: style ? [style, arabicOverride] : arabicOverride,
  };
}
