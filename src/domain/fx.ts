/**
 * Fetches the latest exchange rate from `fromCurrency` to `toCurrency`
 * using the free, no-key Frankfurter API (European Central Bank data).
 * Returns null gracefully if offline or currency is unsupported.
 */
export async function fetchLiveFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return 1.0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    const rate = data?.rates?.[to];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}
