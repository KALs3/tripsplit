import { router } from 'expo-router';
import { QrCode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';

export default function JoinTripModal() {
  const { palette } = useTheme();

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
        <Text style={[styles.title, { color: palette.text }]}>Join a trip</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.iconBox, { backgroundColor: palette.surface }]}>
            <QrCode size={30} color={palette.text} />
          </View>

          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Enter the invite code shared by a trip member.
          </Text>

          <Input
            label="Invite code"
            placeholder="TOKYO26"
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
            title="Join trip"
            onPress={() => handleJoin()}
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 14 }}
          />

          {isGuestDemo && (
            <Card style={styles.demoHintCard}>
              <View style={styles.demoHintRow}>
                <Badge label="Demo" variant="neutral" />
                <Text style={[styles.demoHintText, { color: palette.text }]}>
                  Try code PARIS26 to join a sample Paris trip in EUR.
                </Text>
              </View>
              <Button
                title="Join PARIS26"
                onPress={() => handleJoin('PARIS26')}
                variant="outline"
                size="sm"
                style={{ marginTop: 10 }}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3 },
  closeBtn: { padding: 4 },
  body: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    paddingTop: 32,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  demoHintCard: {
    width: '100%',
    marginTop: 22,
    padding: 14,
  },
  demoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoHintText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
