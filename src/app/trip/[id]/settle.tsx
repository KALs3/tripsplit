import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { fonts } from '../../../constants/typography';
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

  const { isDark, palette, colors } = useTheme();

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

  const creditColor = isDark ? colors.successDark : colors.success;
  const debtColor = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>Record payment</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card style={styles.summaryCard}>
            <View style={styles.directionRow}>
              <Text style={[styles.partyBadge, { color: debtColor }]}>
                {getMemberLabel(fromUser)}
              </Text>
              <ArrowRight size={17} color={palette.textMuted} />
              <Text style={[styles.partyBadge, { color: creditColor }]}>
                {getMemberLabel(toUser)}
              </Text>
            </View>
            <Text style={[styles.summarySub, { color: palette.textMuted }]}>
              Updates net balances immediately
            </Text>
          </Card>

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
                      backgroundColor: selected ? palette.accent : palette.card,
                      borderColor: selected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? palette.accentText : palette.text },
                    ]}
                  >
                    {getMemberLabel(m.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
                      backgroundColor: selected ? palette.accent : palette.card,
                      borderColor: selected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? palette.accentText : palette.text },
                    ]}
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
            containerStyle={{ marginTop: 14 }}
          />

          <Button
            title="Confirm payment"
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -0.3 },
  closeBtn: { padding: 4 },
  scroll: { padding: 18, paddingBottom: 40 },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 12,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partyBadge: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  summarySub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 5,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },
});
