import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';

/**
 * Deep link handler for tripsplit://join/<code> (scanned via QR code).
 */
export default function JoinDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { palette } = useTheme();

  const user = useAppStore((s) => s.user);
  const loginAsGuest = useAppStore((s) => s.loginAsGuest);
  const joinTripByCode = useAppStore((s) => s.joinTripByCode);

  useEffect(() => {
    if (!code) return;
    if (!user) {
      loginAsGuest();
    }
    const result = joinTripByCode(code);
    if (result.trip) {
      router.replace({ pathname: '/trip/[id]', params: { id: result.trip.id } });
    }
  }, [code, user, loginAsGuest, joinTripByCode]);

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" color={palette.text} />
        <Text className="font-semibold text-[15px] mt-3.5 text-ink dark:text-ink-dark">
          Joining trip {code?.toUpperCase()}...
        </Text>
        <Button
          title="Go to trips"
          onPress={() => router.replace('/(tabs)/trips')}
          variant="ghost"
          size="sm"
          className="mt-4"
        />
      </View>
    </SafeAreaView>
  );
}
