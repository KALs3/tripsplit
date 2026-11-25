import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';

/**
 * Deep link handler for tripsplit://join/<code> (scanned via QR code).
 */
export default function JoinDeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: palette.text }]}>
          Joining trip {code?.toUpperCase()}...
        </Text>
        <Button
          title="Go to Trips"
          onPress={() => router.replace('/(tabs)/trips')}
          variant="ghost"
          size="sm"
          style={{ marginTop: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
  },
});
