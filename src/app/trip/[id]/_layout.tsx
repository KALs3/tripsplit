import { Stack } from 'expo-router';
import React from 'react';

export default function TripLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="balances" />
      <Stack.Screen name="members" />
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
      <Stack.Screen name="expenses/[expenseId]" />
    </Stack>
  );
}
