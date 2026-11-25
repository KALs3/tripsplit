import { useTranslation } from 'react-i18next';
import { TextStyle, ViewStyle } from 'react-native';
import { formatMoney } from '../domain';
import { CurrencyCode } from '../domain/types';
import { getFormattingLocale, isRTLLanguage, resolveAppLanguage } from '../i18n';
import { useAppStore } from '../store/useAppStore';

export function useLocale() {
  const { t, i18n } = useTranslation();
  const languagePreference = useAppStore((s) => s.languagePreference);
  const needsRtlRestart = useAppStore((s) => s.needsRtlRestart);
  const setLanguagePreference = useAppStore((s) => s.setLanguagePreference);

  const language = resolveAppLanguage(languagePreference);
  const isRTL = isRTLLanguage(language);
  const locale = getFormattingLocale(language);

  const ltrTextStyle: TextStyle = { writingDirection: 'ltr' };
  const rtlContainerStyle: ViewStyle = { direction: isRTL ? 'rtl' : 'ltr' };
  const flipRtlStyle: ViewStyle | undefined = isRTL
    ? { transform: [{ scaleX: -1 }] }
    : undefined;

  const formatCurrency = (minorAmount: number, currency: CurrencyCode = 'USD') =>
    formatMoney(minorAmount, currency, locale);

  const formatDate = (
    dateValue: string | number | Date,
    options?: Intl.DateTimeFormatOptions
  ) => {
    try {
      return new Date(dateValue).toLocaleDateString(locale, options);
    } catch {
      return new Date(dateValue).toLocaleDateString(undefined, options);
    }
  };

  return {
    t,
    i18n,
    language,
    languagePreference,
    needsRtlRestart,
    setLanguagePreference,
    isRTL,
    locale,
    ltrTextStyle,
    rtlContainerStyle,
    flipRtlStyle,
    formatCurrency,
    formatDate,
  };
}
