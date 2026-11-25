import { router } from 'expo-router';
import { QrCode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { colors } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';

export default function JoinTripModal() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const joinTripByCode = useAppStore((s) => s.joinTripByCode);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (inviteCodeInput?: string) => {
    const result = joinTripByCode(inviteCodeInput ?? code);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.trip) {
      router.replace({ pathname: '/trip/[id]', params: { id: result.trip.id } });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>Join a Trip</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.body}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
          <QrCode size={34} color={colors.primary} />
        </View>

        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Enter the 6-character invite code shared by a trip member.
        </Text>

        <Input
          label="Invite Code"
          placeholder="e.g. TOKYO26"
          value={code}
          onChangeText={(val) => {
            setCode(val.toUpperCase());
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
          containerStyle={{ width: '100%' }}
        />

        <Button
          title="Join Trip"
          onPress={() => handleJoin()}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: 14 }}
        />

        {isGuestDemo && (
          <Card style={styles.demoHintCard}>
            <View style={styles.demoHintRow}>
              <Badge label="Demo Tip" variant="info" />
              <Text style={[styles.demoHintText, { color: palette.text }]}>
                Try code <Text style={{ fontWeight: '800' }}>PARIS26</Text> to join a sample Paris weekend trip!
              </Text>
            </View>
            <Button
              title="Fill & Join PARIS26"
              onPress={() => handleJoin('PARIS26')}
              variant="outline"
              size="sm"
              style={{ marginTop: 10 }}
            />
          </Card>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  body: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    paddingTop: 36,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  demoHintCard: {
    width: '100%',
    marginTop: 24,
    padding: 14,
  },
  demoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
