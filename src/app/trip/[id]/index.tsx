import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Receipt,
  Scale,
  Search,
  Sparkles,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { EXPENSE_CATEGORIES, getCategoryMeta } from '../../../constants/categories';
import { colors } from '../../../constants/colors';
import { calculateNetBalances, convertToBaseMinor, formatMoney, simplifyDebts } from '../../../domain';
import { ExpenseCategory, ExpenseRecord } from '../../../domain/types';
import { useAppStore } from '../../../store/useAppStore';
import { subscribeToTripRealtime } from '../../../sync/tripSync';

export default function TripDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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

  // Recompute balances reactively from subscribed expenses, payments, and members
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

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundTitle, { color: palette.text }]}>
            Trip not found
          </Text>
          <Button
            title="Back to Trips"
            onPress={() => router.replace('/(tabs)/trips')}
            variant="primary"
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isOwed = userNetMinor > 0;
  const isDebt = userNetMinor < 0;

  const renderExpenseRow = (expense: ExpenseRecord) => {
    const cat = getCategoryMeta(expense.category);
    const payerName = getMemberName(expense.paidBy);
    const userSplit = expense.splits.find((s) => s.userId === currentUserId);
    const userShareMinor = userSplit?.shareMinor ?? 0;

    // Personal impact in expense currency:
    // If you paid: you lent (amountMinor - yourOwnShare)
    // If someone else paid: you borrowed userShareMinor
    const youPaid = expense.paidBy === currentUserId;
    const personalImpactMinor = youPaid
      ? expense.amountMinor - userShareMinor
      : userShareMinor;

    return (
      <Pressable
        key={expense.id}
        onPress={() =>
          router.push({
            pathname: '/trip/[id]/expenses/[expenseId]',
            params: { id: trip.id, expenseId: expense.id },
          })
        }
      >
        <Card style={styles.expenseCard}>
          <View style={styles.expenseRow}>
            <View
              style={[
                styles.categoryIconBox,
                { backgroundColor: `${cat.color}18` },
              ]}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            </View>

            <View style={styles.expenseMeta}>
              <Text style={[styles.expenseTitle, { color: palette.text }]} numberOfLines={1}>
                {expense.title}
              </Text>
              <Text style={[styles.expenseSub, { color: palette.textMuted }]}>
                {payerName} paid {formatMoney(expense.amountMinor, expense.currency)}
                {expense.currency !== trip.baseCurrency
                  ? ` (~${formatMoney(
                      convertToBaseMinor(expense.amountMinor, expense.fxRateToBase),
                      trip.baseCurrency
                    )})`
                  : ''}
              </Text>
            </View>

            <View style={styles.expenseImpact}>
              {personalImpactMinor === 0 ? (
                <Text style={[styles.impactLabel, { color: palette.textMuted }]}>
                  not involved
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.impactLabel,
                      { color: youPaid ? colors.success : colors.danger },
                    ]}
                  >
                    {youPaid ? 'you lent' : 'you owe'}
                  </Text>
                  <Text
                    style={[
                      styles.impactAmount,
                      { color: youPaid ? colors.success : colors.danger },
                    ]}
                  >
                    {formatMoney(personalImpactMinor, expense.currency)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Top Navigation Header */}
      <View style={[styles.topBar, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
          accessibilityLabel="Go back to trips"
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>

        <View style={styles.topBarTitleWrap}>
          <Text style={[styles.topBarTitle, { color: palette.text }]} numberOfLines={1}>
            {trip.name}
          </Text>
          <View style={styles.topBarMeta}>
            <Users size={12} color={palette.textMuted} />
            <Text style={[styles.topBarSub, { color: palette.textMuted }]}>
              {tripMembers.length} members • {trip.inviteCode}
            </Text>
            <SyncStatusBadge status={syncStatus} pendingCount={pendingMutationsCount} />
          </View>
        </View>

        <Button
          title="Add"
          onPress={() =>
            router.push({
              pathname: '/trip/[id]/expenses/new',
              params: { id: trip.id },
            })
          }
          variant="primary"
          size="sm"
          icon={<Plus size={16} color="#FFFFFF" />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cover Banner */}
        {trip.coverUrl ? (
          <Image source={{ uri: trip.coverUrl }} style={styles.coverBanner} />
        ) : null}

        {/* Financial Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
                Total Group Spend
              </Text>
              <Text style={[styles.summaryValue, { color: palette.text }]}>
                {formatMoney(totalSpendMinor, trip.baseCurrency)}
              </Text>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: palette.border }]} />

            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>
                Your Net Balance
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color: isOwed
                      ? colors.success
                      : isDebt
                      ? colors.danger
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
            </View>
          </View>

          <View style={styles.summaryBadgeRow}>
            <Badge
              label={
                isOwed
                  ? 'In the green — others owe you'
                  : isDebt
                  ? 'You have pending settlements'
                  : 'All settled up!'
              }
              variant={isOwed ? 'success' : isDebt ? 'danger' : 'neutral'}
            />
          </View>
        </Card>

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          <Button
            title="Settle Up"
            onPress={() =>
              router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
            }
            variant="secondary"
            size="sm"
            icon={<Scale size={15} color={palette.text} />}
            style={{ flex: 1 }}
          />
          <Button
            title={`Members (${tripMembers.length})`}
            onPress={() =>
              router.push({ pathname: '/trip/[id]/members', params: { id: trip.id } })
            }
            variant="secondary"
            size="sm"
            icon={<Users size={15} color={palette.text} />}
            style={{ flex: 1 }}
          />
        </View>

        {/* Simplified Settlement Plan Preview */}
        <Card
          style={[
            styles.settlementCard,
            {
              borderColor: isDark ? colors.primaryDark : colors.primaryLight,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleIcon}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Simplified Settlement Plan
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/trip/[id]/balances', params: { id: trip.id } })
              }
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                Settle →
              </Text>
            </Pressable>
          </View>

          {settlements.length === 0 ? (
            <Text style={[styles.settledText, { color: palette.textMuted }]}>
              Everyone is square — zero transfers needed.
            </Text>
          ) : (
            <View style={styles.transfersList}>
              {settlements.map((t, index) => (
                <View
                  key={`${t.fromUser}_${t.toUser}_${index}`}
                  style={[
                    styles.transferRow,
                    index < settlements.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.transferParties}>
                    <Text style={[styles.transferName, { color: colors.danger }]}>
                      {getMemberName(t.fromUser)}
                    </Text>
                    <ArrowRight size={14} color={palette.textMuted} />
                    <Text style={[styles.transferName, { color: colors.success }]}>
                      {getMemberName(t.toUser)}
                    </Text>
                  </View>
                  <Text style={[styles.transferAmount, { color: palette.text }]}>
                    {formatMoney(t.amountMinor, trip.baseCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Expenses Header + Search */}
        <View style={styles.expensesSectionHeader}>
          <Text style={[styles.expensesHeading, { color: palette.text }]}>
            Expenses ({activeExpenses.length})
          </Text>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}
        >
          <Search size={16} color={palette.textMuted} />
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
                  selectedCategory === 'all' ? colors.primary : palette.card,
                borderColor:
                  selectedCategory === 'all' ? colors.primary : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedCategory === 'all' ? '#FFFFFF' : palette.text },
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
                    backgroundColor: active ? colors.primary : palette.card,
                    borderColor: active ? colors.primary : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {cat.emoji} {cat.label.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Expenses List */}
        {activeExpenses.length === 0 ? (
          <Card style={styles.emptyExpensesCard}>
            <Receipt size={32} color={palette.textMuted} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              No expenses match
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
              Tap &quot;Add&quot; to log your first group expense and see balances update automatically.
            </Text>
            <Button
              title="Add Expense"
              onPress={() =>
                router.push({
                  pathname: '/trip/[id]/expenses/new',
                  params: { id: trip.id },
                })
              }
              variant="primary"
              size="sm"
              style={{ marginTop: 14 }}
            />
          </Card>
        ) : (
          <View style={styles.expensesList}>
            {activeExpenses.map(renderExpenseRow)}
          </View>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topBarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  topBarSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  coverBanner: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
  },
  summaryCard: {
    padding: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  summaryBadgeRow: {
    marginTop: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  settlementCard: {
    borderWidth: 1.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settledText: {
    fontSize: 13,
    paddingVertical: 4,
  },
  transfersList: {
    marginTop: 2,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  transferParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferName: {
    fontSize: 14,
    fontWeight: '700',
  },
  transferAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  expensesSectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expensesHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterPillsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expensesList: {
    marginTop: 2,
  },
  expenseCard: {
    padding: 13,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  expenseMeta: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  expenseSub: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseImpact: {
    alignItems: 'flex-end',
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  impactAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  emptyExpensesCard: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
});
