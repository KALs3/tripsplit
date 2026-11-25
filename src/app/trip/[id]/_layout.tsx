import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useLocale } from '../../../hooks/useLocale';
import { useTheme } from '../../../hooks/useTheme';

export default function TripLayout() {
  const { palette } = useTheme();
  const { rtlContainerStyle, isRTL } = useLocale();

  return (
    <View style={rtlContainerStyle} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: isRTL ? 'slide_from_left' : 'slide_from_right',
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="balances" />
        <Stack.Screen name="members" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="map" />
        <Stack.Screen
          name="settle"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="expenses/new"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="expenses/[expenseId]" />
      </Stack>
    </View>
  );
}
