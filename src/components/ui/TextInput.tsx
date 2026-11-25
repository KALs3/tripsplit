import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { resolveArabicTypography } from '../../constants/typography';
import { isRTLLanguage, resolveAppLanguage } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

/**
 * Drop-in TextInput wrapper that applies Cairo typography, size scaling, and RTL alignment in Arabic.
 */
export function TextInput({ className, style, textAlign, ...props }: TextInputProps) {
  const languagePreference = useAppStore((s) => s.languagePreference);
  const language = resolveAppLanguage(languagePreference);
  const isArabic = language === 'ar';
  const isRTL = isRTLLanguage(language);

  const resolved = resolveArabicTypography(className, style, isArabic);

  return (
    <RNTextInput
      textAlign={textAlign ?? (isRTL ? 'right' : 'left')}
      className={resolved.className}
      style={resolved.style}
      {...props}
    />
  );
}
