import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { TicketDivider } from '../../../components/ui/TicketDivider';
import { fonts, tabularNums } from '../../../constants/typography';
import {
  calculateNetBalances,
  convertToBaseMinor,
  formatMoney,
  getSortedNetBalances,
  simplifyDebts,
} from '../../../domain';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function BalancesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();

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

  const getMember = (userId: string) =>
    tripMembers.find((member) => member.userId === userId);

  const getMemberName = (userId: string) => {
    const m = getMember(userId);
    if (!m) return 'Unknown';
    return m.userId === currentUserId ? 'You' : m.displayName.split(' ')[0];
  };

  const handleDeletePayment = (paymentId: string) => {
    if (Platform.OS === 'web') {
      deletePayment(paymentId);
      return;
    }
    Alert.alert(
      'Remove payment',
      'Undo this recorded settlement? Balances will recalculate.',
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

  const creditColor = isDark ? colors.successDark : colors.success;
  const debtColor = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Balances & settle up
        </Text>
        <Button
          title="Pay"
          onPress={() =>
            router.push({ pathname: '/trip/[id]/settle', params: { id: trip.id } })
          }
          variant="primary"
          size="sm"
          icon={<Plus size={15} color={palette.accentText} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Simplified Debt Ticket */}
        <Card style={styles.planCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Recommended transfers
            </Text>
            <Badge label={`${settlements.length} needed`} variant="neutral" />
          </View>
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            Minimized payment plan to clear every group balance.
          </Text>

          <TicketDivider />

          {settlements.length === 0 ? (
            <View style={styles.allSettledBox}>
              <CheckCircle2 size={26} color={creditColor} />
              <Text style={[styles.allSettledText, { color: palette.text }]}>
                Everyone is settled up.
              </Text>
            </View>
          ) : (
            <View>
              {settlements.map((t, idx) => {
                const fromMember = getMember(t.fromUser);
                const toMember = getMember(t.toUser);
                return (
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
                    <View style={styles.transferLeft}>
                      <View style={styles.transferAvatars}>
                        {fromMember && (
                          <AvatarStack members={[fromMember]} size={26} />
                        )}
                        <ArrowRight size={14} color={palette.textMuted} />
                        {toMember && (
                          <AvatarStack members={[toMember]} size={26} />
                        )}
                      </View>
                      <View style={{ marginTop: 5 }}>
                        <Text style={[styles.transferLabel, { color: palette.text }]}>
                          <Text style={{ color: debtColor }}>
                            {getMemberName(t.fromUser)}
                          </Text>
                          {' pays '}
                          <Text style={{ color: creditColor }}>
                            {getMemberName(t.toUser)}
                          </Text>
                        </Text>
                        <Text style={[styles.transferAmount, tabularNums, { color: palette.text }]}>
                          {formatMoney(t.amountMinor, trip.baseCurrency)}
                        </Text>
                      </View>
                    </View>

                    <Button
                      title="Mark paid"
                      size="sm"
                      variant="primary"
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
                );
              })}
            </View>
          )}
        </Card>

        {/* Per-Member Net Balances */}
        <Text style={[styles.groupHeading, { color: palette.text }]}>
          Net balances
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
                      tabularNums,
                      {
                        color: isPositive
                          ? creditColor
                          : isNegative
                          ? debtColor
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
                        width: `${b.netMinor === 0 ? 0 : Math.max(6, barWidthPct)}%`,
                        backgroundColor: isPositive ? creditColor : debtColor,
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
          Recorded payments ({tripPayments.length})
        </Text>
        {tripPayments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No payments recorded yet. Tap &quot;Mark paid&quot; above after settling up.
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
                  <Text style={[styles.paymentSub, tabularNums, { color: creditColor }]}>
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
                  <Trash2 size={15} color={debtColor} />
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
  notFoundText: { fontFamily: fonts.bold, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  planCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  allSettledBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  allSettledText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transferLeft: {
    flex: 1,
    marginRight: 12,
  },
  transferAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  transferAmount: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginTop: 2,
  },
  groupHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  balancesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  balanceRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: { fontFamily: fonts.semibold, fontSize: 14 },
  balanceAmount: { fontFamily: fonts.bold, fontSize: 15 },
  barTrack: {
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  paymentsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paymentTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  paymentSub: { fontFamily: fonts.bold, fontSize: 13, marginTop: 2 },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
