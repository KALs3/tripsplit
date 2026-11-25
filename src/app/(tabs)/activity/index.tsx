import { ArrowUpRight } from 'lucide-react-native';
import React from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { Text } from '../../../components/ui/Text';
import { tabularNums } from '../../../constants/typography';
import { ExpenseCategory } from '../../../domain/types';
import { useLocale } from '../../../hooks/useLocale';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function ActivityScreen() {
  const { isDark, palette, colors } = useTheme();
  const { t, formatCurrency, ltrTextStyle } = useLocale();

  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const members = useAppStore((s) => s.members);

  const getMemberName = (userId: string) => {
    return members.find((m) => m.userId === userId)?.displayName || t('activity.fallbackMember');
  };

  const feed = [
    ...expenses
      .filter((e) => !e.deletedAt)
      .map((e) => ({
        id: e.id,
        type: 'expense' as const,
        category: e.category as ExpenseCategory | undefined,
        title: t('activity.expenseTitle', {
          name: getMemberName(e.paidBy),
          title: e.title,
        }),
        amountMinor: e.amountMinor,
        currency: e.currency,
        subtitle: t('activity.splitAcross', { count: e.splits.length }),
        sortKey: e.spentAt || '',
      })),
    ...payments
      .filter((p) => !p.deletedAt)
      .map((p) => ({
        id: p.id,
        type: 'payment' as const,
        category: undefined,
        title: t('activity.paymentTitle', {
          from: getMemberName(p.fromUser),
          to: getMemberName(p.toUser),
        }),
        amountMinor: p.amountMinor,
        currency: p.currency,
        subtitle: t('activity.settlementTransfer'),
        sortKey: p.id,
      })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const creditColor = isDark ? colors.successDark : colors.success;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
      <View className="px-[18px] pt-2.5 pb-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[22px] tracking-tight text-ink dark:text-ink-dark">
          {t('activity.title')}
        </Text>
        <Text className="font-sans text-[13px] mt-0.5 text-muted dark:text-muted-dark">
          {t('activity.subtitle')}
        </Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Card className="my-1 p-[13px]">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center me-3">
                {item.type === 'expense' ? (
                  <CategoryIcon category={item.category} size={17} color={palette.text} />
                ) : (
                  <ArrowUpRight size={17} color={creditColor} strokeWidth={2.2} />
                )}
              </View>
              <View className="flex-1 me-2.5">
                <Text className="font-semibold text-[14px] tracking-tight text-ink dark:text-ink-dark">
                  {item.title}
                </Text>
                <Text className="font-sans text-[12px] mt-0.5 text-muted dark:text-muted-dark">
                  {item.subtitle}
                </Text>
              </View>
              <Text
                style={[tabularNums, ltrTextStyle]}
                className={`font-bold text-[14px] ${
                  item.type === 'expense'
                    ? 'text-ink dark:text-ink-dark'
                    : 'text-credit dark:text-credit-dark'
                }`}
              >
                {formatCurrency(item.amountMinor, item.currency)}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View className="items-center py-[60px]">
            <Text className="font-sans text-[14px] text-muted dark:text-muted-dark">
              {t('activity.empty')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
