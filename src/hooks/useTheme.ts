import { useColorScheme } from 'react-native';
import { colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);

  const isDark =
    themePreference === 'system'
      ? systemScheme === 'dark'
      : themePreference === 'dark';

  const palette = isDark ? colors.dark : colors.light;
  return { isDark, palette, colors, themePreference };
}
