import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Text } from '../../../components/ui/Text';
import { TicketDivider } from '../../../components/ui/TicketDivider';
import { tabularNums } from '../../../constants/typography';
import {
  calculateNetBalances,
  convertToBaseMinor,
  getSortedNetBalances,
  simplifyDebts,
} from '../../../domain';
import { useLocale } from '../../../hooks/useLocale';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function BalancesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();
  const { t, flipRtlStyle, ltrTextStyle, formatCurrency } = useLocale();

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
    if (!m) return t('common.unknown');
    return m.userId === currentUserId ? t('common.you') : m.displayName.split(' ')[0];
  };

  const handleDeletePayment = (paymentId: string) => {
    if (Platform.OS === 'web') {
      deletePayment(paymentId);
      return;
    }
    Alert.alert(
      t('balances.removePaymentTitle'),
      t('balances.removePaymentBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => deletePayment(paymentId),
        },
      ]
    );
  };

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            {t('common.tripNotFound')}
          </Text>
          <Button title={t('common.back')} onPress={() => router.back()} className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  const creditColor = isDark ? colors.successDark : colors.success;
  const debtColor = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline-dark">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
        >
          <View style={flipRtlStyle}>
            <ArrowLeft size={19} color={palette.text} />
          </View>
        </Pressable>
        <Text className="font-bold text-[17px] tracking-tight text-ink dark:text-ink-dark">
          {t('balances.title')}
        </Text>
        <Button
          title={t('balances.pay')}
          onPress={() =>
            router.push({ pathname: '/trip/[id]/settle', params: { id: trip.id } })
          }
          variant="primary"
          size="sm"
          icon={<Plus size={15} color={palette.accentText} />}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Simplified Debt Ticket */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
              {t('balances.recommendedTransfers')}
            </Text>
            <Badge
              label={t('balances.neededCount', { count: settlements.length })}
              variant="neutral"
            />
          </View>
          <Text className="font-sans text-[12px] mt-1 leading-[17px] text-muted dark:text-muted-dark">
            {t('balances.planSubtitle')}
          </Text>

          <TicketDivider />

          {settlements.length === 0 ? (
            <View className="items-center py-4 gap-2">
              <CheckCircle2 size={26} color={creditColor} />
              <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                {t('balances.everyoneSettled')}
              </Text>
            </View>
          ) : (
            <View>
              {settlements.map((transfer, idx) => {
                const fromMember = getMember(transfer.fromUser);
                const toMember = getMember(transfer.toUser);
                return (
                  <View
                    key={`${transfer.fromUser}_${transfer.toUser}_${idx}`}
                    className={`flex-row items-center justify-between py-3 ${
                      idx < settlements.length - 1
                        ? 'border-b border-hairline dark:border-hairline-dark'
                        : ''
                    }`}
                  >
                    <View className="flex-1 me-3">
                      <View className="flex-row items-center gap-2">
                        {fromMember && (
                          <AvatarStack members={[fromMember]} size={26} />
                        )}
                        <View style={flipRtlStyle}>
                          <ArrowRight size={14} color={palette.textMuted} />
                        </View>
                        {toMember && (
                          <AvatarStack members={[toMember]} size={26} />
                        )}
                      </View>
                      <View className="mt-1.5">
                        <Text className="font-semibold text-[13px] text-ink dark:text-ink-dark">
                          <Text className="text-debt dark:text-debt-dark">
                            {getMemberName(transfer.fromUser)}
                          </Text>
                          {` ${t('balances.pays')} `}
                          <Text className="text-credit dark:text-credit-dark">
                            {getMemberName(transfer.toUser)}
                          </Text>
                        </Text>
                        <Text
                          style={[tabularNums, ltrTextStyle]}
                          className="font-bold text-[17px] mt-0.5 self-start text-ink dark:text-ink-dark"
                        >
                          {formatCurrency(transfer.amountMinor, trip.baseCurrency)}
                        </Text>
                      </View>
                    </View>

                    <Button
                      title={t('balances.markPaid')}
                      size="sm"
                      variant="primary"
                      onPress={() =>
                        router.push({
                          pathname: '/trip/[id]/settle',
                          params: {
                            id: trip.id,
                            fromUser: transfer.fromUser,
                            toUser: transfer.toUser,
                            amountMinor: String(transfer.amountMinor),
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
        <Text className="font-bold text-[16px] mt-4 mb-1.5 tracking-tight text-ink dark:text-ink-dark">
          {t('balances.netBalances')}
        </Text>
        <Card className="p-0 overflow-hidden">
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
                className={`px-3.5 py-3 ${
                  idx < sortedBalances.length - 1
                    ? 'border-b border-hairline dark:border-hairline-dark'
                    : ''
                }`}
              >
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                    {getMemberName(b.userId)}
                  </Text>
                  <Text
                    style={[tabularNums, ltrTextStyle]}
                    className={`font-bold text-[15px] ${
                      isPositive
                        ? 'text-credit dark:text-credit-dark'
                        : isNegative
                        ? 'text-debt dark:text-debt-dark'
                        : 'text-muted dark:text-muted-dark'
                    }`}
                  >
                    {isPositive
                      ? `+${formatCurrency(b.netMinor, trip.baseCurrency)}`
                      : isNegative
                      ? formatCurrency(b.netMinor, trip.baseCurrency)
                      : t('common.settled')}
                  </Text>
                </View>

                <View className="h-[5px] rounded bg-surface dark:bg-surface-dark overflow-hidden">
                  <View
                    style={{
                      width: `${b.netMinor === 0 ? 0 : Math.max(6, barWidthPct)}%`,
                      backgroundColor: isPositive ? creditColor : debtColor,
                    }}
                    className="h-full rounded"
                  />
                </View>
              </View>
            );
          })}
        </Card>

        {/* Recorded Payments History */}
        <Text className="font-bold text-[16px] mt-4 mb-1.5 tracking-tight text-ink dark:text-ink-dark">
          {t('balances.recordedPayments', { count: tripPayments.length })}
        </Text>
        {tripPayments.length === 0 ? (
          <Card className="p-5 items-center">
            <Text className="font-sans text-[13px] text-center leading-[19px] text-muted dark:text-muted-dark">
              {t('balances.noPayments')}
            </Text>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            {tripPayments.map((p, idx) => (
              <View
                key={p.id}
                className={`flex-row items-center px-3.5 py-3 ${
                  idx < tripPayments.length - 1
                    ? 'border-b border-hairline dark:border-hairline-dark'
                    : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                    {t('balances.paidLine', {
                      from: getMemberName(p.fromUser),
                      to: getMemberName(p.toUser),
                    })}
                  </Text>
                  <Text
                    style={[tabularNums, ltrTextStyle]}
                    className="font-bold text-[13px] mt-0.5 self-start text-credit dark:text-credit-dark"
                  >
                    {formatCurrency(
                      convertToBaseMinor(p.amountMinor, p.fxRateToBase),
                      trip.baseCurrency
                    )}
                    {p.currency !== trip.baseCurrency
                      ? ` (${formatCurrency(p.amountMinor, p.currency)})`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeletePayment(p.id)}
                  className="w-8 h-8 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
                  accessibilityLabel={t('balances.removePaymentTitle')}
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
