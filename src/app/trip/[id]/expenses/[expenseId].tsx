import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, FileText, Pencil, Trash2, User } from 'lucide-react-native';
import React from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CategoryIcon } from '../../../../components/ui/CategoryIcon';
import { TicketDivider } from '../../../../components/ui/TicketDivider';
import { getCategoryMeta } from '../../../../constants/categories';
import { tabularNums } from '../../../../constants/typography';
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
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            Expense not found
          </Text>
          <Button
            title="Go back"
            onPress={() => router.back()}
            variant="primary"
            className="mt-3.5"
          />
        </View>
      </SafeAreaView>
    );
  }

  const cat = getCategoryMeta(expense.category);
  const baseAmountMinor = convertToBaseMinor(expense.amountMinor, expense.fxRateToBase);
  const dangerFg = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline-dark">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text className="font-bold text-[17px] tracking-tight text-ink dark:text-ink-dark">
          Receipt stub
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/trip/[id]/expenses/new',
                params: { id: trip.id, expenseId: expense.id },
              })
            }
            className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
            accessibilityLabel="Edit expense"
          >
            <Pencil size={16} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/15 items-center justify-center"
            accessibilityLabel="Delete expense"
          >
            <Trash2 size={17} color={dangerFg} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Transit Ticket Receipt Stub */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="w-11 h-11 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center">
              <CategoryIcon category={expense.category} size={22} color={palette.text} />
            </View>
            <Badge label={cat.label} variant="neutral" />
          </View>

          <Text className="font-bold text-[20px] tracking-tight text-ink dark:text-ink-dark">
            {expense.title}
          </Text>
          <Text
            style={tabularNums}
            className="font-bold text-[34px] mt-1 tracking-tight text-ink dark:text-ink-dark"
          >
            {formatMoney(expense.amountMinor, expense.currency)}
          </Text>
          {expense.currency !== trip.baseCurrency && (
            <Text
              style={tabularNums}
              className="font-sans text-[13px] mt-1 text-muted dark:text-muted-dark"
            >
              {formatMoney(baseAmountMinor, trip.baseCurrency)} in {trip.baseCurrency} (FX{' '}
              {expense.fxRateToBase})
            </Text>
          )}

          <TicketDivider />

          <View className="flex-row items-center gap-2.5">
            <User size={15} color={palette.textMuted} />
            <Text className="font-medium text-[13px] w-[60px] text-muted dark:text-muted-dark">
              Paid by
            </Text>
            <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
              {getMemberName(expense.paidBy)}
            </Text>
          </View>

          {expense.spentAt && (
            <View className="flex-row items-center gap-2.5 mt-2.5">
              <Calendar size={15} color={palette.textMuted} />
              <Text className="font-medium text-[13px] w-[60px] text-muted dark:text-muted-dark">
                Date
              </Text>
              <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
                {new Date(expense.spentAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {expense.note && (
            <View className="flex-row items-center gap-2.5 mt-2.5">
              <FileText size={15} color={palette.textMuted} />
              <Text className="font-medium text-[13px] w-[60px] text-muted dark:text-muted-dark">
                Note
              </Text>
              <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
                {expense.note}
              </Text>
            </View>
          )}

          <TicketDivider />

          <Text className="font-bold text-[14px] mb-1 text-ink dark:text-ink-dark">
            Split breakdown ({expense.splits.length})
          </Text>
          {expense.splits.map((split, idx) => (
            <View
              key={split.userId}
              className={`flex-row justify-between items-center py-2.5 ${
                idx < expense.splits.length - 1
                  ? 'border-b border-hairline dark:border-hairline-dark'
                  : ''
              }`}
            >
              <Text className="font-medium text-[14px] text-ink dark:text-ink-dark">
                {getMemberName(split.userId)}
              </Text>
              <Text
                style={tabularNums}
                className="font-bold text-[14px] text-ink dark:text-ink-dark"
              >
                {formatMoney(split.shareMinor, expense.currency)}
              </Text>
            </View>
          ))}
        </Card>

        {expense.receiptUrl && (
          <View className="mt-2.5">
            <Text className="font-bold text-[15px] mb-1.5 text-ink dark:text-ink-dark">
              Attached receipt
            </Text>
            <Card className="p-2">
              <Image
                source={{ uri: expense.receiptUrl }}
                className="w-full h-[220px] rounded-lg"
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
          className="mt-[18px]"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
