import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, tabularNums } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { isDark, palette, colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: isDark ? 'rgba(34, 197, 94, 0.14)' : colors.successLight,
          text: isDark ? colors.successDark : colors.success,
          border: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(22, 163, 74, 0.2)',
        };
      case 'danger':
        return {
          bg: isDark ? 'rgba(248, 113, 113, 0.14)' : colors.dangerLight,
          text: isDark ? colors.dangerDark : colors.danger,
          border: isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(220, 38, 38, 0.2)',
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(217, 119, 6, 0.16)' : colors.warningLight,
          text: isDark ? '#FBBF24' : '#B45309',
          border: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(217, 119, 6, 0.25)',
        };
      case 'info':
      case 'neutral':
      default:
        return {
          bg: palette.surface,
          text: palette.text,
          border: palette.border,
        };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
    >
      <Text style={[styles.text, tabularNums, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
});
