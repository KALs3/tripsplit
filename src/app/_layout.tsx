import '../../global.css';
import '../lib/nativewind';

import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDark, palette } = useTheme();
  const setNetworkOnline = useAppStore((s) => s.setNetworkOnline);
  const hydrateThemePreference = useAppStore((s) => s.hydrateThemePreference);

  useEffect(() => {
    void hydrateThemePreference();
  }, [hydrateThemePreference]);

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 bg-canvas dark:bg-canvas-dark">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: palette.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join/[code]" />
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
      </View>
    </SafeAreaProvider>
  );
}
