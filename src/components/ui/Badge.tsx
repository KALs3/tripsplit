import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { tabularNums } from '../../constants/typography';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const CONTAINER_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 dark:bg-green-500/15 border-green-600/20 dark:border-green-400/30',
  danger: 'bg-red-100 dark:bg-red-500/15 border-red-600/20 dark:border-red-400/30',
  warning: 'bg-amber-100 dark:bg-amber-500/15 border-amber-600/25 dark:border-amber-400/30',
  info: 'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark',
  neutral: 'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark',
};

const TEXT_CLASSES: Record<BadgeVariant, string> = {
  success: 'text-credit dark:text-credit-dark',
  danger: 'text-debt dark:text-debt-dark',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-ink dark:text-ink-dark',
  neutral: 'text-ink dark:text-ink-dark',
};

export function Badge({
  label,
  variant = 'neutral',
  className = '',
  style,
}: BadgeProps) {
  return (
    <View
      style={style}
      className={`px-2 py-[3px] rounded-lg border self-start ${CONTAINER_CLASSES[variant]} ${className}`}
    >
      <Text
        style={tabularNums}
        className={`font-semibold text-[12px] tracking-tight ${TEXT_CLASSES[variant]}`}
      >
        {label}
      </Text>
    </View>
  );
}
