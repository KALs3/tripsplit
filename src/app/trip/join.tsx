import { router } from 'expo-router';
import { QrCode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
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
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[19px] tracking-tight text-ink dark:text-ink-dark">
          Join a trip
        </Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            alignItems: 'center',
            paddingTop: 32,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="w-[60px] h-[60px] rounded-[10px] bg-surface dark:bg-surface-dark items-center justify-center mb-4">
            <QrCode size={30} color={palette.text} />
          </View>

          <Text className="font-sans text-[14px] text-center mb-[18px] leading-5 text-muted dark:text-muted-dark">
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
            containerClassName="w-full"
          />

          <Button
            title="Join trip"
            onPress={() => handleJoin()}
            variant="primary"
            size="lg"
            className="w-full mt-3.5"
          />

          {isGuestDemo && (
            <Card className="w-full mt-5 p-3.5">
              <View className="flex-row items-center gap-2">
                <Badge label="Demo" variant="neutral" />
                <Text className="flex-1 font-sans text-[13px] leading-[18px] text-ink dark:text-ink-dark">
                  Try code PARIS26 to join a sample Paris trip in EUR.
                </Text>
              </View>
              <Button
                title="Join PARIS26"
                onPress={() => handleJoin('PARIS26')}
                variant="outline"
                size="sm"
                className="mt-2.5"
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
