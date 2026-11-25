import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { palette, colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: palette.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: palette.card,
            borderColor: error
              ? colors.danger
              : focused
              ? palette.text
              : palette.border,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
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
          style={[
            styles.input,
            {
              color: palette.text,
            },
            style,
          ]}
          {...props}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 4,
  },
});
