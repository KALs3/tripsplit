import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return isDark ? '#1E293B' : '#E2E8F0';
    switch (variant) {
      case 'primary':
        return pressed ? colors.primaryHover : colors.primary;
      case 'secondary':
        return pressed ? (isDark ? '#334155' : '#CBD5E1') : palette.surface;
      case 'danger':
        return pressed ? '#BE123C' : colors.danger;
      case 'outline':
      case 'ghost':
        return pressed ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#64748B' : '#94A3B8';
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return palette.text;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return palette.text;
    }
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, minHeight: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 15, minHeight: 48 },
    lg: { paddingVertical: 15, paddingHorizontal: 24, fontSize: 17, minHeight: 54 },
  }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: variant === 'outline' ? (disabled ? palette.border : colors.primary) : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          minHeight: sizeStyles.minHeight,
          opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: sizeStyles.fontSize,
                marginLeft: icon ? 8 : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
