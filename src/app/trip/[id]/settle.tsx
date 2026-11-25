import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { colors } from '../../../constants/colors';
import { CURRENCY_METADATA, fromMinorUnits, toMinorUnits } from '../../../domain';
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

  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
      setError('Please enter a valid positive payment amount.');
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

  if (!trip) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>Record Payment</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Summary Banner */}
          <Card style={styles.summaryCard}>
            <View style={styles.directionRow}>
              <Text style={[styles.partyBadge, { color: colors.danger }]}>
                {getMemberLabel(fromUser)}
              </Text>
              <ArrowRight size={18} color={palette.textMuted} />
              <Text style={[styles.partyBadge, { color: colors.success }]}>
                {getMemberLabel(toUser)}
              </Text>
            </View>
            <Text style={[styles.summarySub, { color: palette.textMuted }]}>
              Recording this transfer adjusts net balances immediately
            </Text>
          </Card>

          {/* From User */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Who paid?</Text>
          <View style={styles.chipsWrap}>
            {tripMembers.map((m) => {
              const selected = fromUser === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => {
                    setFromUser(m.userId);
                    setError('');
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : palette.card,
                      borderColor: selected ? colors.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {getMemberLabel(m.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* To User */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Paid to whom?</Text>
          <View style={styles.chipsWrap}>
            {tripMembers.map((m) => {
              const selected = toUser === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => {
                    setToUser(m.userId);
                    setError('');
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : palette.card,
                      borderColor: selected ? colors.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {getMemberLabel(m.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount */}
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
            containerStyle={{ marginTop: 14 }}
          />

          <Button
            title="Confirm Payment"
            onPress={handleRecordPayment}
            variant="primary"
            size="lg"
            style={{ marginTop: 22 }}
          />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  scroll: { padding: 20, paddingBottom: 40 },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 14,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partyBadge: {
    fontSize: 18,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 12,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
