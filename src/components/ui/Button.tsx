import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

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
  const { isDark, palette, colors } = useTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return palette.surface;
    switch (variant) {
      case 'primary':
        return pressed
          ? isDark
            ? '#E4E4E7'
            : '#27272A'
          : palette.accent;
      case 'secondary':
        return pressed ? palette.borderStrong : palette.surface;
      case 'danger':
        return pressed ? '#B91C1C' : colors.danger;
      case 'outline':
      case 'ghost':
        return pressed ? palette.surface : 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return palette.textMuted;
    switch (variant) {
      case 'primary':
        return palette.accentText;
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
        return palette.text;
    }
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, minHeight: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, minHeight: 46 },
    lg: { paddingVertical: 14, paddingHorizontal: 22, fontSize: 16, minHeight: 52 },
  }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor:
            variant === 'outline' ? palette.borderStrong : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          minHeight: sizeStyles.minHeight,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
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
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.semibold,
    letterSpacing: -0.2,
  },
});
