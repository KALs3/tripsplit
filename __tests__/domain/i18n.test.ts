import { formatMoney } from '../../src/domain';
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
});
