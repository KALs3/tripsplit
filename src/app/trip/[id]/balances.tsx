import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../constants/colors';
import {
  calculateNetBalances,
  convertToBaseMinor,
  formatMoney,
  getSortedNetBalances,
  simplifyDebts,
} from '../../../domain';
import { useAppStore } from '../../../store/useAppStore';

export default function BalancesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const user = useAppStore((s) => s.user);
  const deletePayment = useAppStore((s) => s.deletePayment);

  const trip = trips.find((t) => t.id === id);
  const currentUserId = user?.id || 'user_me';

  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const tripPayments = useMemo(
    () => payments.filter((p) => p.tripId === id && !p.deletedAt),
    [payments, id]
  );

  const { sortedBalances, settlements, maxAbsBalance } = useMemo(() => {
    const tripExpenses = expenses.filter((e) => e.tripId === id && !e.deletedAt);
    const memberIds = tripMembers.map((m) => m.userId);
    const balancesMap = calculateNetBalances(memberIds, tripExpenses, tripPayments);
    const sorted = getSortedNetBalances(balancesMap);
    const simplified = simplifyDebts(balancesMap);
    const maxAbs = sorted.reduce(
      (max, item) => Math.max(max, Math.abs(item.netMinor)),
      1
    );

    return {
      sortedBalances: sorted,
      settlements: simplified,
      maxAbsBalance: maxAbs,
    };
  }, [id, expenses, tripPayments, tripMembers]);

  const getMemberName = (userId: string) => {
    const m = tripMembers.find((member) => member.userId === userId);
    if (!m) return 'Unknown';
    return m.userId === currentUserId ? 'You' : m.displayName.split(' ')[0];
  };

  const handleDeletePayment = (paymentId: string) => {
    if (Platform.OS === 'web') {
      deletePayment(paymentId);
      return;
    }
    Alert.alert(
      'Undo Settlement',
      'Remove this recorded payment? Balances will update automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deletePayment(paymentId),
        },
      ]
    );
  };

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: palette.text }]}>Trip not found</Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Balances & Settle Up
        </Text>
        <Button
          title="Pay"
          onPress={() =>
            router.push({ pathname: '/trip/[id]/settle', params: { id: trip.id } })
          }
          variant="primary"
          size="sm"
          icon={<Plus size={15} color="#FFFFFF" />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Simplified Debt Plan */}
        <Card
          style={[
            styles.planCard,
            { borderColor: isDark ? colors.primaryDark : colors.primaryLight },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleIcon}>
              <Sparkles size={17} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Recommended Transfers
              </Text>
            </View>
            <Badge label={`${settlements.length} needed`} variant="info" />
          </View>
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            Greedy bipartite simplification minimizes the payments needed to clear all debts.
          </Text>

          {settlements.length === 0 ? (
            <View style={styles.allSettledBox}>
              <CheckCircle2 size={28} color={colors.success} />
              <Text style={[styles.allSettledText, { color: palette.text }]}>
                Everyone is completely settled up!
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {settlements.map((t, idx) => (
                <View
                  key={`${t.fromUser}_${t.toUser}_${idx}`}
                  style={[
                    styles.transferRow,
                    idx < settlements.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.transferInfo}>
                    <View style={styles.transferNames}>
                      <Text style={[styles.debtorName, { color: colors.danger }]}>
                        {getMemberName(t.fromUser)}
                      </Text>
                      <ArrowRight size={14} color={palette.textMuted} />
                      <Text style={[styles.creditorName, { color: colors.success }]}>
                        {getMemberName(t.toUser)}
                      </Text>
                    </View>
                    <Text style={[styles.transferAmount, { color: palette.text }]}>
                      {formatMoney(t.amountMinor, trip.baseCurrency)}
                    </Text>
                  </View>

                  <Button
                    title="Settle"
                    size="sm"
                    variant="outline"
                    onPress={() =>
                      router.push({
                        pathname: '/trip/[id]/settle',
                        params: {
                          id: trip.id,
                          fromUser: t.fromUser,
                          toUser: t.toUser,
                          amountMinor: String(t.amountMinor),
                        },
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Per-Member Net Balances */}
        <Text style={[styles.groupHeading, { color: palette.text }]}>
          Group Net Balances
        </Text>
        <Card style={styles.balancesCard}>
          {sortedBalances.map((b, idx) => {
            const isPositive = b.netMinor > 0;
            const isNegative = b.netMinor < 0;
            const barWidthPct = Math.min(
              100,
              Math.round((Math.abs(b.netMinor) / maxAbsBalance) * 100)
            );

            return (
              <View
                key={b.userId}
                style={[
                  styles.balanceRow,
                  idx < sortedBalances.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <View style={styles.balanceTopRow}>
                  <Text style={[styles.memberName, { color: palette.text }]}>
                    {getMemberName(b.userId)}
                  </Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      {
                        color: isPositive
                          ? colors.success
                          : isNegative
                          ? colors.danger
                          : palette.textMuted,
                      },
                    ]}
                  >
                    {isPositive
                      ? `+${formatMoney(b.netMinor, trip.baseCurrency)}`
                      : isNegative
                      ? formatMoney(b.netMinor, trip.baseCurrency)
                      : 'Settled'}
                  </Text>
                </View>

                <View style={[styles.barTrack, { backgroundColor: palette.surface }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${b.netMinor === 0 ? 0 : Math.max(8, barWidthPct)}%`,
                        backgroundColor: isPositive ? colors.success : colors.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>

        {/* Recorded Payments History */}
        <Text style={[styles.groupHeading, { color: palette.text }]}>
          Recorded Payments ({tripPayments.length})
        </Text>
        {tripPayments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No payments recorded yet. Tap &quot;Settle&quot; above once someone pays back a friend.
            </Text>
          </Card>
        ) : (
          <Card style={styles.paymentsCard}>
            {tripPayments.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.paymentRow,
                  idx < tripPayments.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentTitle, { color: palette.text }]}>
                    {getMemberName(p.fromUser)} paid {getMemberName(p.toUser)}
                  </Text>
                  <Text style={[styles.paymentSub, { color: palette.textMuted }]}>
                    {formatMoney(
                      convertToBaseMinor(p.amountMinor, p.fxRateToBase),
                      trip.baseCurrency
                    )}
                    {p.currency !== trip.baseCurrency
                      ? ` (${formatMoney(p.amountMinor, p.currency)})`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeletePayment(p.id)}
                  style={[styles.trashBtn, { backgroundColor: palette.surface }]}
                  accessibilityLabel="Remove payment"
                >
                  <Trash2 size={15} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  planCard: {
    borderWidth: 1.5,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  allSettledBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  allSettledText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transferInfo: {
    flex: 1,
    marginRight: 10,
  },
  transferNames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debtorName: { fontSize: 14, fontWeight: '700' },
  creditorName: { fontSize: 14, fontWeight: '700' },
  transferAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  groupHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  balancesCard: {
    padding: 14,
  },
  balanceRow: {
    paddingVertical: 10,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: { fontSize: 14, fontWeight: '600' },
  balanceAmount: { fontSize: 15, fontWeight: '700' },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  paymentsCard: {
    padding: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paymentTitle: { fontSize: 14, fontWeight: '600' },
  paymentSub: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  trashBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
