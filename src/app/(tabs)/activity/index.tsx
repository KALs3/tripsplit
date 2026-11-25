import { ArrowUpRight } from 'lucide-react-native';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { fonts, tabularNums } from '../../../constants/typography';
import { formatMoney } from '../../../domain';
import { ExpenseCategory } from '../../../domain/types';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function ActivityScreen() {
  const { isDark, palette, colors } = useTheme();

  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const members = useAppStore((s) => s.members);

  const getMemberName = (userId: string) => {
    return members.find((m) => m.userId === userId)?.displayName || 'A member';
  };

  const feed = [
    ...expenses
      .filter((e) => !e.deletedAt)
      .map((e) => ({
        id: e.id,
        type: 'expense' as const,
        category: e.category as ExpenseCategory | undefined,
        title: `${getMemberName(e.paidBy)} paid for "${e.title}"`,
        amountMinor: e.amountMinor,
        currency: e.currency,
        subtitle: `Split across ${e.splits.length} travelers`,
        sortKey: e.spentAt || '',
      })),
    ...payments
      .filter((p) => !p.deletedAt)
      .map((p) => ({
        id: p.id,
        type: 'payment' as const,
        category: undefined,
        title: `${getMemberName(p.fromUser)} paid ${getMemberName(p.toUser)}`,
        amountMinor: p.amountMinor,
        currency: p.currency,
        subtitle: 'Settlement transfer',
        sortKey: p.id,
      })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const creditColor = isDark ? colors.successDark : colors.success;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Activity</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
          Expenses and settlements across your trips
        </Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWell, { backgroundColor: palette.surface }]}>
                {item.type === 'expense' ? (
                  <CategoryIcon category={item.category} size={17} color={palette.text} />
                ) : (
                  <ArrowUpRight size={17} color={creditColor} strokeWidth={2.2} />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  tabularNums,
                  {
                    color: item.type === 'expense' ? palette.text : creditColor,
                  },
                ]}
              >
                {formatMoney(item.amountMinor, item.currency)}
              </Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No recent activity yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 110,
  },
  activityCard: {
    marginVertical: 4,
    padding: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});
