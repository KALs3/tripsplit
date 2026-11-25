import { useColorScheme } from 'react-native';
import { colors } from '../constants/colors';

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  return { isDark, palette, colors };
}
