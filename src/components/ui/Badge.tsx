import React from 'react';
import { StyleSheet, Text, useColorScheme, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.successLight,
          text: isDark ? '#34D399' : '#047857',
        };
      case 'danger':
        return {
          bg: isDark ? 'rgba(225, 29, 72, 0.15)' : colors.dangerLight,
          text: isDark ? '#FB7185' : '#BE123C',
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : colors.warningLight,
          text: isDark ? '#FBBF24' : '#B45309',
        };
      case 'info':
        return {
          bg: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.infoLight,
          text: isDark ? '#60A5FA' : '#1D4ED8',
        };
      case 'neutral':
      default:
        return {
          bg: palette.surface,
          text: palette.textMuted,
        };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
