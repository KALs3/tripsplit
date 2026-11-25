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
  StyleSheet,
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
import { fonts, tabularNums } from '../../../constants/typography';
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

  // Group active expenses by short date label (e.g. "Nov 12")
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
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundTitle, { color: palette.text }]}>
            Trip not found
          </Text>
          <Button
            title="Back to trips"
            onPress={() => router.replace('/(tabs)/trips')}
            variant="primary"
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const creditColor = isDark ? colors.successDark : colors.success;
  const debtColor = isDark ? colors.dangerDark : colors.danger;

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

    const amountColor = isUserSettled
      ? palette.textMuted
      : youPaid
      ? creditColor
      : debtColor;

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
        style={[
          styles.ledgerRow,
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View style={styles.iconCol}>
          <CategoryIcon category={expense.category} size={20} color={palette.text} />
        </View>

        <View style={styles.expenseMeta}>
          <Text style={[styles.expenseTitle, { color: palette.text }]} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={[styles.expenseSub, { color: palette.textMuted }]}>
            {subText}
          </Text>
        </View>

        <View style={styles.impactCol}>
          <Text style={[styles.impactAmount, tabularNums, { color: amountColor }]}>
            {formattedImpact}
          </Text>
          {isUserSettled && personalImpactMinor > 0 && (
            <Text style={[styles.settledTiny, { color: creditColor }]}>settled</Text>
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
        style={[
          styles.ledgerRow,
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View style={styles.iconCol}>
          <ArrowUpRight size={20} color={creditColor} strokeWidth={2.2} />
        </View>
        <View style={styles.expenseMeta}>
          <Text style={[styles.expenseTitle, { color: palette.text }]} numberOfLines={1}>
            {fromName === 'you' ? 'You' : fromName} paid {toName}
          </Text>
          <Text style={[styles.expenseSub, { color: palette.textMuted }]}>
            Settlement recorded
          </Text>
        </View>
        <Text style={[styles.impactAmount, tabularNums, { color: creditColor }]}>
          +{formatMoney(payment.amountMinor, payment.currency)}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 88 + Math.max(insets.bottom, 12) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Full-Bleed Travel Cover Hero */}
          <View style={[styles.heroWrap, { paddingTop: Math.max(insets.top, 12) }]}>
            {trip.coverUrl ? (
              <Image source={{ uri: trip.coverUrl }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroFallback, { backgroundColor: '#18181B' }]} />
            )}
            <View style={styles.heroScrim} />

            {/* Top Hero Controls */}
            <View style={styles.heroTopRow}>
              <Pressable
                onPress={() => router.back()}
                style={styles.heroBackCircle}
                accessibilityLabel="Go back to trips"
              >
                <ArrowLeft size={19} color="#09090B" />
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {trip.name}
              </Text>
              <Text style={styles.heroMeta}>{dateRangeLabel}</Text>
            </View>
          </View>

          {/* Overlapping Sheet Container */}
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: palette.background },
            ]}
          >
            {/* Hero Balance Block */}
            <View style={styles.balanceSection}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.balanceCaption, { color: palette.textMuted }]}>
                  Your Balance
                </Text>
                <Text
                  style={[
                    styles.balanceHero,
                    tabularNums,
                    {
                      color: isOwed
                        ? creditColor
                        : isDebt
                        ? debtColor
                        : palette.text,
                    },
                  ]}
                >
                  {isOwed
                    ? formatMoney(userNetMinor, trip.baseCurrency)
                    : isDebt
                    ? formatMoney(Math.abs(userNetMinor), trip.baseCurrency)
                    : formatMoney(0, trip.baseCurrency)}
                </Text>
                <Text style={[styles.balanceStatusSub, { color: palette.text }]}>
                  {isOwed
                    ? "You're owed"
                    : isDebt
                    ? 'You owe'
                    : 'All settled up'}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                }
                style={({ pressed }) => [
                  styles.settlePillBtn,
                  {
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={[styles.settlePillText, { color: palette.accentText }]}>
                  Settle
                </Text>
              </Pressable>
            </View>

            {/* Clean Navigation Strip (Ledger | Balances | Map | Insights) */}
            <View style={[styles.navTabsRow, { borderBottomColor: palette.border }]}>
              <View
                style={[
                  styles.activeTabPill,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={[styles.activeTabText, { color: palette.text }]}>
                  Ledger
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                }
                style={styles.inactiveTabBtn}
              >
                <Text style={[styles.inactiveTabText, { color: palette.textMuted }]}>
                  Balances
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/map', params: { id: trip.id } })
                }
                style={styles.inactiveTabBtn}
              >
                <Text style={[styles.inactiveTabText, { color: palette.textMuted }]}>
                  Map
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/insights', params: { id: trip.id } })
                }
                style={styles.inactiveTabBtn}
              >
                <Text style={[styles.inactiveTabText, { color: palette.textMuted }]}>
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
                style={styles.searchIconToggle}
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
              <View style={styles.filterBlock}>
                <View
                  style={[
                    styles.searchBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Search size={15} color={palette.textMuted} />
                  <TextInput
                    placeholder="Search expenses..."
                    placeholderTextColor={palette.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    style={[styles.searchInput, { color: palette.text }]}
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterPillsRow}
                >
                  <Pressable
                    onPress={() => setSelectedCategory('all')}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          selectedCategory === 'all' ? palette.accent : palette.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color:
                            selectedCategory === 'all'
                              ? palette.accentText
                              : palette.text,
                        },
                      ]}
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
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: active ? palette.accent : palette.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            { color: active ? palette.accentText : palette.text },
                          ]}
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
                <View style={styles.dateGroupBlock}>
                  <View style={[styles.datePill, { backgroundColor: palette.surface }]}>
                    <Text style={[styles.datePillText, { color: palette.textMuted }]}>
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
              <View style={styles.emptyBox}>
                <Receipt size={26} color={palette.textMuted} />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  No expenses match
                </Text>
                <Text style={[styles.emptySub, { color: palette.textMuted }]}>
                  Tap + Log Expense below to add one.
                </Text>
              </View>
            ) : (
              groupedExpenses.map((group) => (
                <View key={group.dateLabel} style={styles.dateGroupBlock}>
                  <View style={[styles.datePill, { backgroundColor: palette.surface }]}>
                    <Text style={[styles.datePillText, { color: palette.textMuted }]}>
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
        style={[
          styles.floatingBar,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: palette.background,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/trip/[id]/expenses/new',
              params: { id: trip.id },
            })
          }
          style={({ pressed }) => [
            styles.floatingPillBtn,
            {
              backgroundColor: palette.accent,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Plus size={18} color={palette.accentText} strokeWidth={2.4} />
          <Text style={[styles.floatingPillText, { color: palette.accentText }]}>
            Log Expense
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  scroll: {
    flexGrow: 1,
  },
  heroWrap: {
    minHeight: 248,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 34,
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.36)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBackCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    marginTop: 28,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },
  heroMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#F4F4F5',
    marginTop: 3,
  },
  sheetContainer: {
    marginTop: -18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 20,
    flex: 1,
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  balanceCaption: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  balanceHero: {
    fontFamily: fonts.bold,
    fontSize: 34,
    letterSpacing: -1,
    marginTop: 2,
  },
  balanceStatusSub: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 2,
  },
  settlePillBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 999,
  },
  settlePillText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  navTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  activeTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeTabText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  inactiveTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inactiveTabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  searchIconToggle: {
    marginLeft: 'auto',
    padding: 6,
  },
  filterBlock: {
    marginTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  filterPillsRow: {
    gap: 6,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterPillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  dateGroupBlock: {
    marginTop: 14,
  },
  datePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  datePillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  iconCol: {
    width: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  expenseMeta: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  expenseSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  impactCol: {
    alignItems: 'flex-end',
  },
  impactAmount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  settledTiny: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 1,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 38,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginTop: 10,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  floatingPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
  },
  floatingPillText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
});
