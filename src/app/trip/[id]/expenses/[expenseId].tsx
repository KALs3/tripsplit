import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, FileText, Pencil, Trash2, User } from 'lucide-react-native';
import React from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CategoryIcon } from '../../../../components/ui/CategoryIcon';
import { Text } from '../../../../components/ui/Text';
import { TicketDivider } from '../../../../components/ui/TicketDivider';
import { tabularNums } from '../../../../constants/typography';
import { convertToBaseMinor } from '../../../../domain';
import { useLocale } from '../../../../hooks/useLocale';
import { useTheme } from '../../../../hooks/useTheme';
import { useAppStore } from '../../../../store/useAppStore';

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { isDark, palette, colors } = useTheme();
  const { t, flipRtlStyle, ltrTextStyle, formatCurrency, formatDate } = useLocale();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const deleteExpense = useAppStore((s) => s.deleteExpense);

  const trip = trips.find((t) => t.id === id);
  const expense = expenses.find((e) => e.id === expenseId && !e.deletedAt);
  const tripMembers = members.filter((m) => m.tripId === id);

  const getMemberName = (userId: string) => {
    return tripMembers.find((m) => m.userId === userId)?.displayName || t('common.unknown');
  };

  const handleDelete = () => {
    if (!expense) return;
    if (Platform.OS === 'web') {
      deleteExpense(expense.id);
      router.back();
      return;
    }

    Alert.alert(
      t('expenses.deleteExpenseTitle'),
      t('expenses.deleteExpenseBody', { title: expense.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
            {t('expenses.receiptNotFound')}
          </Text>
          <Button
            title={t('expenses.receiptGoBack')}
            onPress={() => router.back()}
            variant="primary"
            className="mt-3.5"
          />
        </View>
      </SafeAreaView>
    );
  }

  const baseAmountMinor = convertToBaseMinor(expense.amountMinor, expense.fxRateToBase);
  const dangerFg = isDark ? colors.dangerDark : colors.danger;
  const catId = expense.category || 'other';

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
          {t('expenses.receiptStubTitle')}
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
            accessibilityLabel={t('expenses.editExpense')}
          >
            <Pencil size={16} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/15 items-center justify-center"
            accessibilityLabel={t('expenses.deleteExpenseTitle')}
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
            <Badge label={t(`categories.${catId}.label`)} variant="neutral" />
          </View>

          <Text className="font-bold text-[20px] tracking-tight text-ink dark:text-ink-dark">
            {expense.title}
          </Text>
          <Text
            style={[tabularNums, ltrTextStyle]}
            className="font-bold text-[34px] mt-1 tracking-tight self-start text-ink dark:text-ink-dark"
          >
            {formatCurrency(expense.amountMinor, expense.currency)}
          </Text>
          {expense.currency !== trip.baseCurrency && (
            <Text
              style={[tabularNums, ltrTextStyle]}
              className="font-sans text-[13px] mt-1 self-start text-muted dark:text-muted-dark"
            >
              {formatCurrency(baseAmountMinor, trip.baseCurrency)} ·{' '}
              {t('expenses.receiptBaseEquivalent', { currency: trip.baseCurrency })} (FX{' '}
              {expense.fxRateToBase})
            </Text>
          )}

          <TicketDivider />

          <View className="flex-row items-center gap-2.5">
            <User size={15} color={palette.textMuted} />
            <Text className="font-medium text-[13px] w-[72px] text-muted dark:text-muted-dark">
              {t('expenses.receiptPaidBy')}
            </Text>
            <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
              {getMemberName(expense.paidBy)}
            </Text>
          </View>

          {expense.spentAt && (
            <View className="flex-row items-center gap-2.5 mt-2.5">
              <Calendar size={15} color={palette.textMuted} />
              <Text className="font-medium text-[13px] w-[72px] text-muted dark:text-muted-dark">
                {t('expenses.receiptDate')}
              </Text>
              <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
                {formatDate(expense.spentAt)}
              </Text>
            </View>
          )}

          {expense.note && (
            <View className="flex-row items-center gap-2.5 mt-2.5">
              <FileText size={15} color={palette.textMuted} />
              <Text className="font-medium text-[13px] w-[72px] text-muted dark:text-muted-dark">
                {t('expenses.receiptNotes')}
              </Text>
              <Text className="font-semibold text-[14px] flex-1 text-ink dark:text-ink-dark">
                {expense.note}
              </Text>
            </View>
          )}

          <TicketDivider />

          <Text className="font-bold text-[14px] mb-1 text-ink dark:text-ink-dark">
            {t('expenses.receiptSplitBreakdown')} ({expense.splits.length})
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
                style={[tabularNums, ltrTextStyle]}
                className="font-bold text-[14px] text-ink dark:text-ink-dark"
              >
                {formatCurrency(split.shareMinor, expense.currency)}
              </Text>
            </View>
          ))}
        </Card>

        {expense.receiptUrl && (
          <View className="mt-2.5">
            <Text className="font-bold text-[15px] mb-1.5 text-ink dark:text-ink-dark">
              {t('expenses.receiptAttachedPhoto')}
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
          title={t('expenses.deleteExpenseTitle')}
          onPress={handleDelete}
          variant="danger"
          size="md"
          icon={<Trash2 size={16} color={dangerFg} />}
          className="mt-[18px]"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
