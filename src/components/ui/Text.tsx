import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { resolveArabicTypography } from '../../constants/typography';
import { resolveAppLanguage } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

/**
 * Drop-in Text wrapper that switches to Cairo and scales size/line-height in Arabic.
 */
export function Text({ className, style, ...props }: TextProps) {
  const languagePreference = useAppStore((s) => s.languagePreference);
  const isArabic = resolveAppLanguage(languagePreference) === 'ar';

  const resolved = resolveArabicTypography(className, style, isArabic);

  return <RNText className={resolved.className} style={resolved.style} {...props} />;
}
