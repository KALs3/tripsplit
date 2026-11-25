import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra vertical offset on iOS if rendered below a native header */
  iosVerticalOffset?: number;
}

/**
 * Cross-platform keyboard-avoiding container tailored for Expo Edge-to-Edge.
 */
export function KeyboardAwareView({
  children,
  className = '',
  style,
  iosVerticalOffset = 0,
}: KeyboardAwareViewProps) {
  const insets = useSafeAreaInsets();
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setAndroidKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={iosVerticalOffset}
        className={`flex-1 ${className}`}
        style={style}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  const paddingBottom =
    androidKeyboardHeight > 0
      ? Math.max(0, androidKeyboardHeight - insets.bottom)
      : 0;

  return (
    <View className={`flex-1 ${className}`} style={[{ paddingBottom }, style]}>
      {children}
    </View>
  );
}
