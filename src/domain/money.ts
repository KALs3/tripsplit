import { CurrencyCode, CurrencyMeta } from './types';

export const CURRENCY_METADATA: Record<string, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, name: 'British Pound' },
  EGP: { code: 'EGP', symbol: 'E£', decimals: 2, name: 'Egyptian Pound' },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, name: 'Japanese Yen' },
  CAD: { code: 'CAD', symbol: 'CA$', decimals: 2, name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
  AED: { code: 'AED', symbol: 'AED', decimals: 2, name: 'UAE Dirham' },
  SAR: { code: 'SAR', symbol: 'SAR', decimals: 2, name: 'Saudi Riyal' },
  KWD: { code: 'KWD', symbol: 'KD', decimals: 3, name: 'Kuwaiti Dinar' },
};

/**
 * Returns the number of decimal places for a currency. Defaults to 2.
 */
export function getCurrencyDecimals(currency: CurrencyCode): number {
  return CURRENCY_METADATA[currency.toUpperCase()]?.decimals ?? 2;
}

/**
 * Converts a human-readable major amount (e.g. 14.99) to minor units (e.g. 1499).
 * Avoids float precision errors via Math.round.
 */
export function toMinorUnits(majorAmount: number, currency: CurrencyCode = 'USD'): number {
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(majorAmount * factor);
}

/**
 * Converts minor units (e.g. 1499) to human-readable major units (e.g. 14.99).
 */
export function fromMinorUnits(minorAmount: number, currency: CurrencyCode = 'USD'): number {
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return minorAmount / factor;
}

/**
 * Formats minor units into localized currency string (e.g. "$14.99").
 */
export function formatMoney(
  minorAmount: number,
  currency: CurrencyCode = 'USD',
  locale = 'en-US'
): string {
  const major = fromMinorUnits(minorAmount, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: getCurrencyDecimals(currency),
      maximumFractionDigits: getCurrencyDecimals(currency),
    }).format(major);
  } catch {
    // Fallback if locale or currency code is unsupported by environment
    const meta = CURRENCY_METADATA[currency.toUpperCase()];
    const symbol = meta?.symbol ?? currency;
    return `${symbol}${major.toFixed(getCurrencyDecimals(currency))}`;
  }
}

/**
 * Converts an amount in minor units from one currency to base currency using fxRateToBase.
 * Returns rounded integer minor units.
 */
export function convertToBaseMinor(amountMinor: number, fxRateToBase: number): number {
  if (fxRateToBase === 1.0) {
    return amountMinor;
  }
  return Math.round(amountMinor * fxRateToBase);
}
