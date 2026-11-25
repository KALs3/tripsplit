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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { getCategoryMeta } from '../../../../constants/categories';
import { colors } from '../../../../constants/colors';
import { convertToBaseMinor, formatMoney } from '../../../../domain';
import { useAppStore } from '../../../../store/useAppStore';

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
      'Delete Expense',
      `Are you sure you want to delete "${expense.title}"? Balances will recalculate immediately.`,
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
            title="Go Back"
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Expense Details</Text>
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
            <Pencil size={17} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.iconButton, { backgroundColor: colors.dangerLight }]}
            accessibilityLabel="Delete expense"
          >
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <View
            style={[
              styles.heroIconBox,
              { backgroundColor: `${cat.color}20` },
            ]}
          >
            <Text style={{ fontSize: 30 }}>{cat.emoji}</Text>
          </View>
          <Badge label={cat.label} variant="neutral" style={{ marginVertical: 8 }} />
          <Text style={[styles.expenseTitle, { color: palette.text }]}>
            {expense.title}
          </Text>
          <Text style={[styles.amountText, { color: palette.text }]}>
            {formatMoney(expense.amountMinor, expense.currency)}
          </Text>
          {expense.currency !== trip.baseCurrency && (
            <Text style={[styles.convertedText, { color: palette.textMuted }]}>
              Converted: {formatMoney(baseAmountMinor, trip.baseCurrency)} (FX{' '}
              {expense.fxRateToBase})
            </Text>
          )}
        </Card>

        {/* Metadata Card */}
        <Card style={styles.metaCard}>
          <View style={styles.metaRow}>
            <User size={16} color={palette.textMuted} />
            <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Paid by</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {getMemberName(expense.paidBy)}
            </Text>
          </View>

          {expense.spentAt && (
            <View style={[styles.metaRow, { marginTop: 12 }]}>
              <Calendar size={16} color={palette.textMuted} />
              <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Date</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>
                {new Date(expense.spentAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {expense.note && (
            <View style={[styles.metaRow, { marginTop: 12 }]}>
              <FileText size={16} color={palette.textMuted} />
              <Text style={[styles.metaLabel, { color: palette.textMuted }]}>Note</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>
                {expense.note}
              </Text>
            </View>
          )}
        </Card>

        {/* Splits Breakdown */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Split Breakdown ({expense.splits.length} people)
        </Text>
        <Card style={styles.splitsCard}>
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
              <Text style={[styles.splitAmount, { color: palette.text }]}>
                {formatMoney(split.shareMinor, expense.currency)}
              </Text>
            </View>
          ))}
        </Card>

        {expense.receiptUrl && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Attached Receipt
            </Text>
            <Card style={{ padding: 10 }}>
              <Image
                source={{ uri: expense.receiptUrl }}
                style={{ width: '100%', height: 220, borderRadius: 10 }}
                resizeMode="cover"
              />
            </Card>
          </>
        )}

        <Button
          title="Delete Expense"
          onPress={handleDelete}
          variant="danger"
          size="md"
          icon={<Trash2 size={16} color="#FFFFFF" />}
          style={{ marginTop: 20 }}
        />
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
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
  },
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
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.6,
  },
  convertedText: {
    fontSize: 13,
    marginTop: 4,
  },
  metaCard: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaLabel: {
    fontSize: 13,
    width: 64,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 6,
  },
  splitsCard: {
    padding: 14,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  splitUser: {
    fontSize: 14,
    fontWeight: '600',
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
