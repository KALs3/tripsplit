import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, FileText, Pencil, Trash2, User } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CategoryIcon } from '../../../../components/ui/CategoryIcon';
import { TicketDivider } from '../../../../components/ui/TicketDivider';
import { getCategoryMeta } from '../../../../constants/categories';
import { fonts, tabularNums } from '../../../../constants/typography';
import { convertToBaseMinor, formatMoney } from '../../../../domain';
import { useTheme } from '../../../../hooks/useTheme';
import { useAppStore } from '../../../../store/useAppStore';

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { isDark, palette, colors } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const deleteExpense = useAppStore((s) => s.deleteExpense);

  const trip = trips.find((t) => t.id === id);
  const expense = expenses.find((e) => e.id === expenseId && !e.deletedAt);
  const tripMembers = members.filter((m) => m.tripId === id);

  const getMemberName = (userId: string) => {
    return tripMembers.find((m) => m.userId === userId)?.displayName || 'Unknown';
  };

  const handleDelete = () => {
    if (!expense) return;
    if (Platform.OS === 'web') {
      deleteExpense(expense.id);
      router.back();
      return;
    }

    Alert.alert(
      'Delete expense',
      `Delete "${expense.title}"? Balances will recalculate immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteExpense(expense.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!expense || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: palette.text }]}>
            Expense not found
          </Text>
          <Button
            title="Go back"
            onPress={() => router.back()}
            variant="primary"
            style={{ marginTop: 14 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const cat = getCategoryMeta(expense.category);
  const baseAmountMinor = convertToBaseMinor(expense.amountMinor, expense.fxRateToBase);
  const dangerBg = isDark ? 'rgba(248, 113, 113, 0.14)' : colors.dangerLight;
  const dangerFg = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Receipt stub</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/trip/[id]/expenses/new',
                params: { id: trip.id, expenseId: expense.id },
              })
            }
            style={[styles.iconButton, { backgroundColor: palette.surface }]}
            accessibilityLabel="Edit expense"
          >
            <Pencil size={16} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.iconButton, { backgroundColor: dangerBg }]}
            accessibilityLabel="Delete expense"
          >
            <Trash2 size={17} color={dangerFg} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Transit Ticket Receipt Stub */}
        <Card style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <View style={[styles.iconWell, { backgroundColor: palette.surface }]}>
              <CategoryIcon category={expense.category} size={22} color={palette.text} />
            </View>
            <Badge label={cat.label} variant="neutral" />
          </View>

          <Text style={[styles.expenseTitle, { color: palette.text }]}>
            {expense.title}
          </Text>
          <Text style={[styles.amountText, tabularNums, { color: palette.text }]}>
            {formatMoney(expense.amountMinor, expense.currency)}
          </Text>
          {expense.currency !== trip.baseCurrency && (
            <Text style={[styles.convertedText, tabularNums, { color: palette.textMuted }]}>
              {formatMoney(baseAmountMinor, trip.baseCurrency)} in {trip.baseCurrency} (FX{' '}
              {expense.fxRateToBase})
            </Text>
          )}

          <TicketDivider />

          <View style={styles.metaRow}>
            <User size={15} color={palette.textMuted} />
            <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Paid by</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {getMemberName(expense.paidBy)}
            </Text>
          </View>

          {expense.spentAt && (
            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <Calendar size={15} color={palette.textMuted} />
              <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Date</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>
                {new Date(expense.spentAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {expense.note && (
            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <FileText size={15} color={palette.textMuted} />
              <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Note</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>
                {expense.note}
              </Text>
            </View>
          )}

          <TicketDivider />

          <Text style={[styles.splitsHeading, { color: palette.text }]}>
            Split breakdown ({expense.splits.length})
          </Text>
          {expense.splits.map((split, idx) => (
            <View
              key={split.userId}
              style={[
                styles.splitRow,
                idx < expense.splits.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.splitUser, { color: palette.text }]}>
                {getMemberName(split.userId)}
              </Text>
              <Text style={[styles.splitAmount, tabularNums, { color: palette.text }]}>
                {formatMoney(split.shareMinor, expense.currency)}
              </Text>
            </View>
          ))}
        </Card>

        {expense.receiptUrl && (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Attached receipt
            </Text>
            <Card style={{ padding: 8 }}>
              <Image
                source={{ uri: expense.receiptUrl }}
                style={{ width: '100%', height: 220, borderRadius: 8 }}
                resizeMode="cover"
              />
            </Card>
          </View>
        )}

        <Button
          title="Delete expense"
          onPress={handleDelete}
          variant="danger"
          size="md"
          icon={<Trash2 size={16} color="#FFFFFF" />}
          style={{ marginTop: 18 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
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
  ticketCard: {
    padding: 16,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  amountText: {
    fontFamily: fonts.bold,
    fontSize: 34,
    marginTop: 4,
    letterSpacing: -0.8,
  },
  convertedText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    width: 60,
  },
  metaValue: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    flex: 1,
  },
  splitsHeading: {
    fontFamily: fonts.bold,
    fontSize: 14,
    marginBottom: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  splitUser: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  splitAmount: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginBottom: 6,
  },
});
