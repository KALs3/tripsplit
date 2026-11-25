import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  PieChart,
  Plus,
  Receipt,
  Scale,
  Search,
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
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { TicketDivider } from '../../../components/ui/TicketDivider';
import { EXPENSE_CATEGORIES } from '../../../constants/categories';
import { fonts, tabularNums } from '../../../constants/typography';
import {
  calculateNetBalances,
  convertToBaseMinor,
  formatMoney,
  simplifyDebts,
} from '../../../domain';
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
    return member.userId === currentUserId ? 'You' : member.displayName.split(' ')[0];
  };

  const { settlements, totalSpendMinor, userNetMinor } = useMemo(() => {
    const tripExpenses = expenses.filter((e) => e.tripId === id && !e.deletedAt);
    const tripPayments = payments.filter((p) => p.tripId === id && !p.deletedAt);
    const memberIds = tripMembers.map((m) => m.userId);

    const balances = calculateNetBalances(memberIds, tripExpenses, tripPayments);
    const simplified = simplifyDebts(balances);
    const totalSpend = tripExpenses.reduce(
      (sum, e) => sum + convertToBaseMinor(e.amountMinor, e.fxRateToBase),
      0
    );

    return {
      settlements: simplified,
      totalSpendMinor: totalSpend,
      userNetMinor: balances.get(currentUserId) ?? 0,
    };
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

  const renderLedgerExpense = (expense: ExpenseRecord, index: number, total: number) => {
    const payerName = getMemberName(expense.paidBy);
    const userSplit = expense.splits.find((s) => s.userId === currentUserId);
    const userShareMinor = userSplit?.shareMinor ?? 0;

    const youPaid = expense.paidBy === currentUserId;
    const personalImpactMinor = youPaid
      ? expense.amountMinor - userShareMinor
      : userShareMinor;

    const dateLabel = expense.spentAt
      ? new Date(expense.spentAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : '';

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
          index < total - 1 && {
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View style={[styles.iconWell, { backgroundColor: palette.surface }]}>
          <CategoryIcon category={expense.category} size={17} color={palette.text} />
        </View>

        <View style={styles.expenseMeta}>
          <Text style={[styles.expenseTitle, { color: palette.text }]} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={[styles.expenseSub, tabularNums, { color: palette.textMuted }]}>
            {payerName} paid {formatMoney(expense.amountMinor, expense.currency)}
            {dateLabel ? `  ${dateLabel}` : ''}
          </Text>
        </View>

        <View style={styles.expenseImpact}>
          {personalImpactMinor === 0 ? (
            <Text style={[styles.impactLabel, { color: palette.textMuted }]}>
              not involved
            </Text>
          ) : isUserSettled ? (
            <>
              <Text style={[styles.impactLabel, { color: creditColor }]}>
                settled
              </Text>
              <Text style={[styles.impactAmount, tabularNums, { color: palette.textMuted }]}>
                {formatMoney(personalImpactMinor, expense.currency)}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.impactLabel,
                  { color: youPaid ? creditColor : debtColor },
                ]}
              >
                {youPaid ? 'you lent' : 'you owe'}
              </Text>
              <Text
                style={[
                  styles.impactAmount,
                  tabularNums,
                  { color: youPaid ? creditColor : debtColor },
                ]}
              >
                {formatMoney(personalImpactMinor, expense.currency)}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    );
  };

  const renderLedgerPayment = (payment: PaymentRecord, index: number, total: number) => {
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
          index < total - 1 && {
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View style={[styles.iconWell, { backgroundColor: palette.surface }]}>
          <ArrowUpRight size={17} color={creditColor} strokeWidth={2.2} />
        </View>
        <View style={styles.expenseMeta}>
          <Text style={[styles.expenseTitle, { color: palette.text }]} numberOfLines={1}>
            {fromName} paid {toName}
          </Text>
          <Text style={[styles.expenseSub, { color: palette.textMuted }]}>
            Settlement transfer
          </Text>
        </View>
        <View style={styles.expenseImpact}>
          <Text style={[styles.impactLabel, { color: creditColor }]}>settled</Text>
          <Text style={[styles.impactAmount, tabularNums, { color: creditColor }]}>
            {formatMoney(payment.amountMinor, payment.currency)}
          </Text>
        </View>
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
                style={styles.heroIconBtn}
                accessibilityLabel="Go back to trips"
              >
                <ArrowLeft size={19} color="#FFFFFF" />
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SyncStatusBadge status={syncStatus} pendingCount={pendingMutationsCount} />
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/trip/[id]/members', params: { id: trip.id } })
                  }
                  style={styles.heroMembersBtn}
                >
                  <AvatarStack members={tripMembers} size={22} maxVisible={3} />
                </Pressable>
              </View>
            </View>

            {/* Hero Title Overlay */}
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {trip.name}
              </Text>
              <Text style={styles.heroMeta}>
                {tripMembers.length} travelers  Code {trip.inviteCode}
              </Text>
            </View>
          </View>

          <View style={styles.bodyPad}>
            {/* Transit Ticket Balance Stub */}
            <Card style={styles.ticketCard}>
              <View style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.balanceCaption, { color: palette.textMuted }]}>
                    {isOwed
                      ? 'You are owed'
                      : isDebt
                      ? 'You owe'
                      : 'Your net balance'}
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
                      ? `+${formatMoney(userNetMinor, trip.baseCurrency)}`
                      : isDebt
                      ? formatMoney(userNetMinor, trip.baseCurrency)
                      : formatMoney(0, trip.baseCurrency)}
                  </Text>
                  <Text style={[styles.totalSpendLine, tabularNums, { color: palette.textMuted }]}>
                    Group spend {formatMoney(totalSpendMinor, trip.baseCurrency)}
                  </Text>
                </View>

                <Button
                  title="Settle up"
                  onPress={() =>
                    router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                  }
                  variant={isDebt ? 'primary' : 'outline'}
                  size="sm"
                  icon={
                    <Scale
                      size={14}
                      color={isDebt ? palette.accentText : palette.text}
                    />
                  }
                />
              </View>

              <TicketDivider />

              <View style={styles.transferHeaderRow}>
                <Text style={[styles.transferTitle, { color: palette.text }]}>
                  Simplified transfers ({settlements.length})
                </Text>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                  }
                >
                  <Text style={[styles.manageLink, { color: palette.textMuted }]}>
                    View plan
                  </Text>
                </Pressable>
              </View>

              {settlements.length === 0 ? (
                <Text style={[styles.settledNote, { color: creditColor }]}>
                  All balances settled — zero transfers needed.
                </Text>
              ) : (
                <View style={{ marginTop: 6 }}>
                  {settlements.slice(0, 3).map((t, idx) => (
                    <View
                      key={`${t.fromUser}_${t.toUser}_${idx}`}
                      style={styles.transferCompactRow}
                    >
                      <View style={styles.transferParties}>
                        <Text style={[styles.transferParty, { color: debtColor }]}>
                          {getMemberName(t.fromUser)}
                        </Text>
                        <ArrowRight size={13} color={palette.textMuted} />
                        <Text style={[styles.transferParty, { color: creditColor }]}>
                          {getMemberName(t.toUser)}
                        </Text>
                      </View>
                      <Text style={[styles.transferAmt, tabularNums, { color: palette.text }]}>
                        {formatMoney(t.amountMinor, trip.baseCurrency)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Monochrome Inline Navigation Strip */}
            <View
              style={[
                styles.subNavStrip,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
                }
                style={styles.subNavBtn}
              >
                <Scale size={15} color={palette.text} />
                <Text style={[styles.subNavLabel, { color: palette.text }]}>Balances</Text>
              </Pressable>

              <View style={[styles.subNavSep, { backgroundColor: palette.border }]} />

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/insights', params: { id: trip.id } })
                }
                style={styles.subNavBtn}
              >
                <PieChart size={15} color={palette.text} />
                <Text style={[styles.subNavLabel, { color: palette.text }]}>Insights</Text>
              </Pressable>

              <View style={[styles.subNavSep, { backgroundColor: palette.border }]} />

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/trip/[id]/map', params: { id: trip.id } })
                }
                style={styles.subNavBtn}
              >
                <MapPin size={15} color={palette.text} />
                <Text style={[styles.subNavLabel, { color: palette.text }]}>Map</Text>
              </Pressable>
            </View>

            {/* Settlements Ledger (if present) */}
            {activePayments.length > 0 &&
              selectedCategory === 'all' &&
              !searchQuery.trim() && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: palette.text }]}>
                    Settlements ({activePayments.length})
                  </Text>
                  <Card style={styles.ledgerCard}>
                    {activePayments.map((p, idx) =>
                      renderLedgerPayment(p, idx, activePayments.length)
                    )}
                  </Card>
                </View>
              )}

            {/* Expenses Header & Search */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: palette.text }]}>
                Ledger ({activeExpenses.length})
              </Text>

              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: palette.card,
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
                  style={[styles.searchInput, { color: palette.text }]}
                />
              </View>

              {/* Category Filter Pills */}
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
                        selectedCategory === 'all' ? palette.accent : palette.card,
                      borderColor:
                        selectedCategory === 'all' ? palette.accent : palette.border,
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
                          backgroundColor: active ? palette.accent : palette.card,
                          borderColor: active ? palette.accent : palette.border,
                        },
                      ]}
                    >
                      <CategoryIcon
                        category={cat.id}
                        size={13}
                        color={active ? palette.accentText : palette.text}
                      />
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

              {/* Single Hairline-Divided Ledger Card */}
              {activeExpenses.length === 0 ? (
                <Card style={styles.emptyExpensesCard}>
                  <Receipt size={28} color={palette.textMuted} />
                  <Text style={[styles.emptyTitle, { color: palette.text }]}>
                    No expenses match
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
                    Log your first shared expense using the button below.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.ledgerCard}>
                  {activeExpenses.map((exp, idx) =>
                    renderLedgerExpense(exp, idx, activeExpenses.length)
                  )}
                </Card>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAwareView>

      {/* Bottom Thumb-Zone Floating CTA */}
      <View
        style={[
          styles.floatingBar,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: isDark
              ? 'rgba(9, 9, 11, 0.92)'
              : 'rgba(244, 244, 245, 0.94)',
            borderTopColor: palette.border,
          },
        ]}
      >
        <Button
          title="Log expense"
          onPress={() =>
            router.push({
              pathname: '/trip/[id]/expenses/new',
              params: { id: trip.id },
            })
          }
          variant="primary"
          size="lg"
          icon={<Plus size={18} color={palette.accentText} />}
        />
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
    minHeight: 190,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 18,
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
    backgroundColor: 'rgba(9, 9, 11, 0.48)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 9, 11, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMembersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 9, 11, 0.58)',
  },
  heroBottom: {
    marginTop: 8,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  heroMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#E4E4E7',
    marginTop: 3,
  },
  bodyPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ticketCard: {
    padding: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceCaption: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  balanceHero: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.7,
    marginTop: 2,
  },
  totalSpendLine: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
  },
  transferHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  manageLink: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  settledNote: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 6,
  },
  transferCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  transferParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferParty: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  transferAmt: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  subNavStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 6,
    height: 44,
  },
  subNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%',
  },
  subNavLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  subNavSep: {
    width: 1,
    height: 20,
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  filterPillsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  ledgerCard: {
    padding: 0,
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseMeta: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  expenseSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  expenseImpact: {
    alignItems: 'flex-end',
  },
  impactLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  impactAmount: {
    fontFamily: fonts.bold,
    fontSize: 14,
    marginTop: 1,
  },
  emptyExpensesCard: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
