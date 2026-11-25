import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { CURRENCY_METADATA, fromMinorUnits, toMinorUnits } from '../../../domain';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function SettlePaymentModal() {
  const {
    id,
    fromUser: initialFrom,
    toUser: initialTo,
    amountMinor: initialAmountMinor,
  } = useLocalSearchParams<{
    id: string;
    fromUser?: string;
    toUser?: string;
    amountMinor?: string;
  }>();

  const { palette } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const user = useAppStore((s) => s.user);
  const addPayment = useAppStore((s) => s.addPayment);

  const trip = trips.find((t) => t.id === id);
  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const currentUserId = user?.id || 'user_me';
  const baseCurrency = trip?.baseCurrency || 'USD';

  const [fromUser, setFromUser] = useState(
    initialFrom || tripMembers[0]?.userId || currentUserId
  );
  const [toUser, setToUser] = useState(
    initialTo ||
      tripMembers.find((m) => m.userId !== (initialFrom || tripMembers[0]?.userId))
        ?.userId ||
      currentUserId
  );
  const [amountText, setAmountText] = useState(() => {
    if (!initialAmountMinor) return '';
    const parsed = Number.parseInt(initialAmountMinor, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return '';
    return String(fromMinorUnits(parsed, baseCurrency));
  });
  const [error, setError] = useState('');

  const getMemberLabel = (userId: string) => {
    const m = tripMembers.find((member) => member.userId === userId);
    if (!m) return 'Member';
    return m.userId === currentUserId ? 'You' : m.displayName.split(' ')[0];
  };

  const handleRecordPayment = () => {
    if (!trip) return;
    if (fromUser === toUser) {
      setError('Payer and recipient must be different people.');
      return;
    }

    const major = Number.parseFloat(amountText.replace(',', '.'));
    if (Number.isNaN(major) || major <= 0) {
      setError('Enter a positive payment amount.');
      return;
    }

    const amountMinor = toMinorUnits(major, trip.baseCurrency);
    addPayment({
      tripId: trip.id,
      fromUser,
      toUser,
      amountMinor,
      currency: trip.baseCurrency,
      fxRateToBase: 1.0,
    });

    router.back();
  };

  if (!trip) return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[19px] tracking-tight text-ink dark:text-ink-dark">
          Record payment
        </Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card className="items-center py-[18px] mb-3">
            <View className="flex-row items-center gap-3">
              <Text className="font-bold text-[18px] text-debt dark:text-debt-dark">
                {getMemberLabel(fromUser)}
              </Text>
              <ArrowRight size={17} color={palette.textMuted} />
              <Text className="font-bold text-[18px] text-credit dark:text-credit-dark">
                {getMemberLabel(toUser)}
              </Text>
            </View>
            <Text className="font-sans text-[12px] mt-1.5 text-muted dark:text-muted-dark">
              Updates net balances immediately
            </Text>
          </Card>

          <Text className="font-semibold text-[13px] mt-3 mb-2 text-ink dark:text-ink-dark">
            Who paid?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {tripMembers.map((m) => {
              const selected = fromUser === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => {
                    setFromUser(m.userId);
                    setError('');
                  }}
                  className={`px-[13px] py-2 rounded-lg border ${
                    selected
                      ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                      : 'bg-card dark:bg-card-dark border-hairline dark:border-hairline-dark'
                  }`}
                >
                  <Text
                    className={`font-semibold text-[13px] ${
                      selected
                        ? 'text-ink-dark dark:text-ink'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    {getMemberLabel(m.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="font-semibold text-[13px] mt-3 mb-2 text-ink dark:text-ink-dark">
            Paid to whom?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {tripMembers.map((m) => {
              const selected = toUser === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => {
                    setToUser(m.userId);
                    setError('');
                  }}
                  className={`px-[13px] py-2 rounded-lg border ${
                    selected
                      ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                      : 'bg-card dark:bg-card-dark border-hairline dark:border-hairline-dark'
                  }`}
                >
                  <Text
                    className={`font-semibold text-[13px] ${
                      selected
                        ? 'text-ink-dark dark:text-ink'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    {getMemberLabel(m.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label={`Amount (${CURRENCY_METADATA[trip.baseCurrency]?.symbol || trip.baseCurrency})`}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={(val) => {
              setAmountText(val);
              setError('');
            }}
            error={error}
            containerClassName="mt-3.5"
          />

          <Button
            title="Confirm payment"
            onPress={handleRecordPayment}
            variant="primary"
            size="lg"
            className="mt-5"
          />
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
