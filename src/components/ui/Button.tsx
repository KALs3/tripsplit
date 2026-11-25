import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';

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
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink dark:bg-ink-dark active:opacity-85',
  secondary: 'bg-surface dark:bg-surface-dark active:opacity-80',
  outline: 'bg-transparent border border-hairline-dark/25 dark:border-hairline-dark active:bg-surface dark:active:bg-surface-dark',
  danger: 'bg-debt active:opacity-85',
  ghost: 'bg-transparent active:bg-surface dark:active:bg-surface-dark',
};

const TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-ink-dark dark:text-ink',
  secondary: 'text-ink dark:text-ink-dark',
  outline: 'text-ink dark:text-ink-dark',
  danger: 'text-white',
  ghost: 'text-ink dark:text-ink-dark',
};

const SIZE_CLASSES: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'py-2 px-3 min-h-[36px]', text: 'text-[13px]' },
  md: { container: 'py-3 px-4 min-h-[46px]', text: 'text-[15px]' },
  lg: { container: 'py-3.5 px-5 min-h-[52px]', text: 'text-[16px]' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  style,
}: ButtonProps) {
  const { palette } = useTheme();
  const spinnerColor =
    variant === 'primary'
      ? palette.accentText
      : variant === 'danger'
      ? '#FFFFFF'
      : palette.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      className={`rounded-lg flex-row items-center justify-center ${
        disabled ? 'bg-surface dark:bg-surface-dark opacity-55' : VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size].container} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon ? <React.Fragment>{icon}</React.Fragment> : null}
          <Text
            className={`font-semibold tracking-tight ${SIZE_CLASSES[size].text} ${
              disabled ? 'text-muted dark:text-muted-dark' : TEXT_CLASSES[variant]
            } ${icon ? 'ms-2' : ''}`}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
