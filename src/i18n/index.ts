import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { ar } from './ar';
import { en } from './en';

const i18n = createInstance();

export type LanguagePreference = 'system' | 'en' | 'ar';
export type AppLanguage = 'en' | 'ar';

/**
 * Resolves the device/browser OS language to a supported app language ('en' or 'ar').
 */
export function resolveSystemLanguage(): AppLanguage {
  try {
    const locales = Localization.getLocales();
    const code = locales[0]?.languageCode?.toLowerCase();
    if (code === 'ar') return 'ar';
  } catch {
    // Fallback to English in non-native environments
  }
  return 'en';
}

export function resolveAppLanguage(pref: LanguagePreference): AppLanguage {
  if (pref === 'system') return resolveSystemLanguage();
  return pref;
}

export function isRTLLanguage(lang: AppLanguage): boolean {
  return lang === 'ar';
}

/**
 * Uses Western 0-9 numerals with Arabic locale formatting so ledger numbers stay consistent.
 */
export function getFormattingLocale(lang: AppLanguage): string {
  return lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
}

const initialLanguage = resolveSystemLanguage();

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

/**
 * Applies language, web document direction, and native I18nManager flags.
 * Returns whether a native OS restart is needed to align platform navigation direction.
 */
export function applyLanguageSideEffects(lang: AppLanguage): boolean {
  const rtl = isRTLLanguage(lang);

  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang);
  }

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return false;
  }

  try {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      return true;
    }
  } catch {
    // Ignore outside RN runtime
  }
  return false;
}

export { i18n };
