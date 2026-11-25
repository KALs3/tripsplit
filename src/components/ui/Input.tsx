import React, { useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  icon,
  className = '',
  containerClassName = '',
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-debt dark:border-debt-dark'
    : focused
    ? 'border-ink dark:border-ink-dark'
    : 'border-hairline dark:border-hairline-dark';

  return (
    <View style={containerStyle} className={`my-1.5 ${containerClassName}`}>
      {label ? (
        <Text className="font-semibold text-[13px] mb-1.5 tracking-tight text-ink dark:text-ink-dark">
          {label}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center rounded-lg border px-3 min-h-[46px] bg-card dark:bg-card-dark ${borderClass}`}
      >
        {icon ? <View className="mr-2.5">{icon}</View> : null}
        <TextInput
          placeholderTextColor={palette.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`flex-1 font-sans text-[15px] py-2.5 text-ink dark:text-ink-dark ${className}`}
          {...props}
        />
      </View>

      {error ? (
        <Text className="font-medium text-[12px] mt-1 text-debt dark:text-debt-dark">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
