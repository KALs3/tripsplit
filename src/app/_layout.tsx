import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const setNetworkOnline = useAppStore((s) => s.setNetworkOnline);

  useEffect(() => {
    let mounted = true;

    Network.getNetworkStateAsync()
      .then((state) => {
        if (mounted) {
          const online = Boolean(
            state.isConnected && state.isInternetReachable !== false
          );
          setNetworkOnline(online);
        }
      })
      .catch(() => {});

    const subscription = Network.addNetworkStateListener((event) => {
      const online = Boolean(
        event.isConnected && event.isInternetReachable !== false
      );
      setNetworkOnline(online);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [setNetworkOnline]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trip/new"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="trip/join"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="trip/[id]" />
      </Stack>
    </>
  );
}
