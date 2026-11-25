import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const { colorScheme } = useNativeWindColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);

  const isDark =
    themePreference === 'system'
      ? colorScheme === 'dark'
      : themePreference === 'dark';

  const palette = isDark ? colors.dark : colors.light;
  return { isDark, palette, colors, themePreference };
}
