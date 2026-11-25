import { formatMoney } from '../../src/domain';
import { arabicFonts, resolveArabicTypography, tabularNums } from '../../src/constants/typography';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';

function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function normalizePluralBase(key: string): string {
  return key.replace(/_(zero|one|two|few|many|other)$/, '');
}

describe('i18n Localization Dictionaries (en.ts / ar.ts)', () => {
  it('provides matching translation key coverage across English and Arabic', () => {
    const enBases = new Set(collectLeafKeys(en).map(normalizePluralBase));
    const arBases = new Set(collectLeafKeys(ar).map(normalizePluralBase));

    expect(Array.from(enBases).filter((k) => !arBases.has(k))).toEqual([]);
    expect(Array.from(arBases).filter((k) => !enBases.has(k))).toEqual([]);
  });

  it('formats money cleanly under Arabic locale with Western numerals', () => {
    const formatted = formatMoney(12550, 'EGP', 'ar-EG-u-nu-latn');
    expect(formatted).toContain('125.50');
  });

  it('switches font family to Cairo, strips negative tracking, and scales optical size in Arabic', () => {
    const resolved = resolveArabicTypography(
      'font-bold text-[12px] tracking-tight text-ink',
      undefined,
      true
    );
    expect(resolved.className).toContain('font-bold-ar');
    expect(resolved.className).not.toContain('tracking-tight');
    expect(resolved.style).toMatchObject({
      fontFamily: arabicFonts.bold,
      fontSize: 13.5,
      lineHeight: 20,
      letterSpacing: 0,
    });
  });

  it('preserves numeric font size for tabular LTR figures in Arabic', () => {
    const resolved = resolveArabicTypography(
      'font-bold text-[34px]',
      [tabularNums, { writingDirection: 'ltr' }],
      true
    );
    expect(resolved.style).toEqual([
      [tabularNums, { writingDirection: 'ltr' }],
      expect.objectContaining({
        fontFamily: arabicFonts.bold,
        fontSize: 34,
        letterSpacing: 0,
      }),
    ]);
  });
});
