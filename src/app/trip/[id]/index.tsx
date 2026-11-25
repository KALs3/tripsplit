import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  Search,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { Button } from '../../../components/ui/Button';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { EXPENSE_CATEGORIES } from '../../../constants/categories';
import { tabularNums } from '../../../constants/typography';
import { calculateNetBalances, formatMoney } from '../../../domain';
import { ExpenseCategory, ExpenseRecord, PaymentRecord } from '../../../domain/types';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';
import { subscribeToTripRealtime } from '../../../sync/tripSync';

export default function TripDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const user = useAppStore((s) => s.user);
  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const hydrateFromRemote = useAppStore((s) => s.hydrateFromRemote);

  useEffect(() => {
    if (!id || isGuestDemo) return;
    return subscribeToTripRealtime(id, () => {
      void hydrateFromRemote();
    });
  }, [id, isGuestDemo, hydrateFromRemote]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');

  const trip = trips.find((t) => t.id === id);
  const currentUserId = user?.id || 'user_me';

  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const getMemberName = (userId: string) => {
    const member = tripMembers.find((m) => m.userId === userId);
    if (!member) return 'Unknown';
    return member.userId === currentUserId ? 'you' : member.displayName.split(' ')[0];
  };

  const userNetMinor = useMemo(() => {
    const tripExpenses = expenses.filter((e) => e.tripId === id && !e.deletedAt);
    const tripPayments = payments.filter((p) => p.tripId === id && !p.deletedAt);
    const memberIds = tripMembers.map((m) => m.userId);
    const balances = calculateNetBalances(memberIds, tripExpenses, tripPayments);
    return balances.get(currentUserId) ?? 0;
  }, [id, expenses, payments, tripMembers, currentUserId]);

  const activeExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.tripId === id && !e.deletedAt)
      .filter((e) => {
        const matchesSearch = e.title
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || (e.category || 'other') === selectedCategory;
        return matchesSearch && matchesCategory;
      });
  }, [expenses, id, searchQuery, selectedCategory]);

  const groupedExpenses = useMemo(() => {
    const groups: { dateLabel: string; items: ExpenseRecord[] }[] = [];
    for (const exp of activeExpenses) {
      const label = exp.spentAt
        ? new Date(exp.spentAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'Recent';
      const existing = groups.find((g) => g.dateLabel === label);
      if (existing) {
        existing.items.push(exp);
      } else {
        groups.push({ dateLabel: label, items: [exp] });
      }
    }
    return groups;
  }, [activeExpenses]);

  const activePayments = useMemo(() => {
    return payments.filter((p) => p.tripId === id && !p.deletedAt);
  }, [payments, id]);

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="font-bold text-[18px] text-ink dark:text-ink-dark">
            Trip not found
          </Text>
          <Button
            title="Back to trips"
            onPress={() => router.replace('/(tabs)/trips')}
            variant="primary"
            className="mt-4"
          />
        </View>
      </SafeAreaView>
    );
  }

  const creditColor = isDark ? colors.successDark : colors.success;
  const isOwed = userNetMinor > 0;
  const isDebt = userNetMinor < 0;
  const isUserSettled = userNetMinor === 0;

  const dateRangeLabel = (() => {
    if (!trip.startDate) return `${tripMembers.length} members`;
    const start = new Date(trip.startDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    if (!trip.endDate) return `${start} · ${tripMembers.length} members`;
    const end = new Date(trip.endDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return `${start} – ${end} · ${tripMembers.length} members`;
  })();

  const renderLedgerExpense = (expense: ExpenseRecord, isLast: boolean) => {
    const payerName = getMemberName(expense.paidBy);
    const userSplit = expense.splits.find((s) => s.userId === currentUserId);
    const userShareMinor = userSplit?.shareMinor ?? 0;

    const youPaid = expense.paidBy === currentUserId;
    const personalImpactMinor = youPaid
      ? expense.amountMinor - userShareMinor
      : userShareMinor;

    const subText =
      expense.splits.length > 1 && !youPaid
        ? `Paid by ${payerName}`
        : youPaid
        ? 'Paid by you'
        : `Split ${expense.splits.length} ways`;

    const amountColorClass = isUserSettled
      ? 'text-muted dark:text-muted-dark'
      : youPaid
      ? 'text-credit dark:text-credit-dark'
      : 'text-debt dark:text-debt-dark';

    const formattedImpact =
      personalImpactMinor === 0
        ? formatMoney(0, expense.currency)
        : youPaid
        ? `+${formatMoney(personalImpactMinor, expense.currency)}`
        : `-${formatMoney(personalImpactMinor, expense.currency)}`;

    return (
      <Pressable
        key={expense.id}
        onPress={() =>
          router.push({
            pathname: '/trip/[id]/expenses/[expenseId]',
            params: { id: trip.id, expenseId: expense.id },
          })
        }
        className={`flex-row items-center py-[13px] ${
          !isLast ? 'border-b border-hairline dark:border-hairline-dark' : ''
        }`}
      >
        <View className="w-[34px] items-start justify-center">
          <CategoryIcon category={expense.category} size={20} color={palette.text} />
        </View>

        <View className="flex-1 mr-2.5">
          <Text
            className="font-semibold text-[15px] tracking-tight text-ink dark:text-ink-dark"
            numberOfLines={1}
          >
            {expense.title}
          </Text>
          <Text className="font-sans text-[12px] mt-0.5 text-muted dark:text-muted-dark">
            {subText}
          </Text>
        </View>

        <View className="items-end">
          <Text style={tabularNums} className={`font-semibold text-[15px] ${amountColorClass}`}>
            {formattedImpact}
          </Text>
          {isUserSettled && personalImpactMinor > 0 && (
            <Text className="font-medium text-[11px] mt-[1px] text-credit dark:text-credit-dark">
              settled
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const renderLedgerPayment = (payment: PaymentRecord, isLast: boolean) => {
    const fromName = getMemberName(payment.fromUser);
    const toName = getMemberName(payment.toUser);
    return (
      <Pressable
        key={payment.id}
        onPress={() =>
          router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
        }
        className={`flex-row items-center py-[13px] ${
          !isLast ? 'border-b border-hairline dark:border-hairline-dark' : ''
        }`}
      >
        <View className="w-[34px] items-start justify-center">
          <ArrowUpRight size={20} color={creditColor} strokeWidth={2.2} />
        </View>
        <View className="flex-1 mr-2.5">
          <Text
            className="font-semibold text-[15px] tracking-tight text-ink dark:text-ink-dark"
            numberOfLines={1}
          >
            {fromName === 'you' ? 'You' : fromName} paid {toName}
          </Text>
          <Text className="font-sans text-[12px] mt-0.5 text-muted dark:text-muted-dark">
            Settlement recorded
          </Text>
        </View>
        <Text
          style={tabularNums}
          className="font-semibold text-[15px] text-credit dark:text-credit-dark"
        >
          +{formatMoney(payment.amountMinor, payment.currency)}
        </Text>
      </Pressable>
    );
  };

  const heroBalanceColorClass = isOwed
    ? 'text-credit dark:text-credit-dark'
    : isDebt
    ? 'text-debt dark:text-debt-dark'
    : 'text-ink dark:text-ink-dark';

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 88 + Math.max(insets.bottom, 12),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Full-Bleed Travel Cover Hero */}
          <View
            style={{ paddingTop: Math.max(insets.top, 12) }}
            className="min-h-[248px] justify-between px-4 pb-[34px] relative"
          >
            {trip.coverUrl ? (
              <Image
                source={{ uri: trip.coverUrl }}
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <View className="absolute inset-0 bg-zinc-900" />
            )}
            <View className="absolute inset-0 bg-black/35" />

            {/* Top Hero Controls */}
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="w-9 h-9 rounded-full bg-white items-center justify-center active:opacity-85"
                accessibilityLabel="Go back to trips"
              >
                <ArrowLeft size={19} color="#09090B" />
              </Pressable>

              <View className="flex-row items-center gap-2">
                {(syncStatus !== 'synced' || pendingMutationsCount > 0) && (
                  <SyncStatusBadge
                    status={syncStatus}
                    pendingCount={pendingMutationsCount}
                  />
                )}
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/trip/[id]/members', params: { id: trip.id } })
                  }
                  accessibilityLabel="View trip members"
                >
                  <AvatarStack
                    members={tripMembers}
                    size={30}
                    maxVisible={2}
                    ringColor="#FFFFFF"
                    overflowTextColor="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>

            {/* Overlaid Title & Dates */}
            <View className="mt-7">
              <Text
                className="font-bold text-[28px] text-white tracking-tight"
                numberOfLines={1}
              >
                {trip.name}
              </Text>
              <Text className="font-medium text-[13px] text-zinc-100 mt-0.5">
                {dateRangeLabel}
              </Text>
            </View>
          </View>

          {/* Overlapping Sheet Container */}
          <View className="-mt-[18px] rounded-t-[20px] px-[18px] pt-5 flex-1 bg-canvas dark:bg-canvas-dark">
            {/* Hero Balance Block */}
            <View className="flex-row items-center justify-between mb-[18px]">
              <View className="flex-1">
                <Text className="font-medium text-[13px] text-muted dark:text-muted-dark">
                  Your Balance
                </Text>
                <Text
                  style={tabularNums}
                  className={`font-bold text-[34px] tracking-tight mt-0.5 ${heroBalanceColorClass}`}
                >
                  {isOwed
                    ? formatMoney(userNetMinor, trip.baseCurrency)
                    : isDebt
                    ? formatMoney(Math.abs(userNetMinor), trip.baseCurrency)
                    : formatMoney(0, trip.baseCurrency)}
                </Text>
                <Text className="font-semibold text-[13px] mt-0.5 text-ink dark:text-ink-dark">
                  {isOwed ? "You're owed" : isDebt ? 'You owe' : 'All settled up'}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                }
                className="px-[22px] py-[11px] rounded-full bg-ink dark:bg-ink-dark active:opacity-85"
              >
                <Text className="font-semibold text-[14px] text-ink-dark dark:text-ink">
                  Settle
                </Text>
              </Pressable>
            </View>

            {/* Clean Navigation Strip (Ledger | Balances | Map | Insights) */}
            <View className="flex-row items-center pb-3 border-b border-hairline dark:border-hairline-dark gap-1.5">
              <View className="px-3 py-1.5 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
                <Text className="font-semibold text-[13px] text-ink dark:text-ink-dark">
                  Ledger
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                }
                className="px-2.5 py-1.5"
              >
                <Text className="font-medium text-[13px] text-muted dark:text-muted-dark">
                  Balances
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/map', params: { id: trip.id } })
                }
                className="px-2.5 py-1.5"
              >
                <Text className="font-medium text-[13px] text-muted dark:text-muted-dark">
                  Map
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/insights', params: { id: trip.id } })
                }
                className="px-2.5 py-1.5"
              >
                <Text className="font-medium text-[13px] text-muted dark:text-muted-dark">
                  Insights
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }
                }}
                className="ml-auto p-1.5"
                accessibilityLabel="Search and filter expenses"
              >
                {showSearch ? (
                  <X size={16} color={palette.text} />
                ) : (
                  <Search size={16} color={palette.textMuted} />
                )}
              </Pressable>
            </View>

            {/* Optional Expandable Search & Category Filter */}
            {showSearch && (
              <View className="mt-3">
                <View className="flex-row items-center border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark rounded-lg px-3 h-[38px] gap-2 mb-2">
                  <Search size={15} color={palette.textMuted} />
                  <TextInput
                    placeholder="Search expenses..."
                    placeholderTextColor={palette.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    className="flex-1 font-sans text-[14px] text-ink dark:text-ink-dark"
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                >
                  <Pressable
                    onPress={() => setSelectedCategory('all')}
                    className={`px-[11px] py-[5px] rounded-lg ${
                      selectedCategory === 'all'
                        ? 'bg-ink dark:bg-ink-dark'
                        : 'bg-surface dark:bg-surface-dark'
                    }`}
                  >
                    <Text
                      className={`font-semibold text-[12px] ${
                        selectedCategory === 'all'
                          ? 'text-ink-dark dark:text-ink'
                          : 'text-ink dark:text-ink-dark'
                      }`}
                    >
                      All
                    </Text>
                  </Pressable>

                  {EXPENSE_CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id)}
                        className={`px-[11px] py-[5px] rounded-lg ${
                          active
                            ? 'bg-ink dark:bg-ink-dark'
                            : 'bg-surface dark:bg-surface-dark'
                        }`}
                      >
                        <Text
                          className={`font-semibold text-[12px] ${
                            active
                              ? 'text-ink-dark dark:text-ink'
                              : 'text-ink dark:text-ink-dark'
                          }`}
                        >
                          {cat.shortLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Settlements Section (if recorded) */}
            {activePayments.length > 0 &&
              selectedCategory === 'all' &&
              !searchQuery.trim() && (
                <View className="mt-3.5">
                  <View className="self-start px-2.5 py-1 rounded-[6px] mb-1 bg-surface dark:bg-surface-dark">
                    <Text className="font-semibold text-[12px] text-muted dark:text-muted-dark">
                      Settlements
                    </Text>
                  </View>
                  {activePayments.map((p, idx) =>
                    renderLedgerPayment(p, idx === activePayments.length - 1)
                  )}
                </View>
              )}

            {/* Date-Grouped Clean Ledger Rows */}
            {groupedExpenses.length === 0 ? (
              <View className="items-center py-[38px]">
                <Receipt size={26} color={palette.textMuted} />
                <Text className="font-bold text-[15px] mt-2.5 text-ink dark:text-ink-dark">
                  No expenses match
                </Text>
                <Text className="font-sans text-[13px] mt-1 text-muted dark:text-muted-dark">
                  Tap + Log Expense below to add one.
                </Text>
              </View>
            ) : (
              groupedExpenses.map((group) => (
                <View key={group.dateLabel} className="mt-3.5">
                  <View className="self-start px-2.5 py-1 rounded-[6px] mb-1 bg-surface dark:bg-surface-dark">
                    <Text className="font-semibold text-[12px] text-muted dark:text-muted-dark">
                      {group.dateLabel}
                    </Text>
                  </View>
                  {group.items.map((exp, idx) =>
                    renderLedgerExpense(exp, idx === group.items.length - 1)
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAwareView>

      {/* Bottom Pill CTA */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
        className="absolute left-0 right-0 bottom-0 px-[18px] pt-2.5 bg-canvas dark:bg-canvas-dark"
      >
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/trip/[id]/expenses/new',
              params: { id: trip.id },
            })
          }
          className="flex-row items-center justify-center gap-2 h-[52px] rounded-full bg-ink dark:bg-ink-dark active:opacity-90"
        >
          <Plus size={18} color={palette.accentText} strokeWidth={2.4} />
          <Text className="font-semibold text-[16px] tracking-tight text-ink-dark dark:text-ink">
            Log Expense
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
