import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../constants/colors';
import { formatMoney } from '../../../domain';
import { useAppStore } from '../../../store/useAppStore';

export default function ActivityScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const members = useAppStore((s) => s.members);

  const getMemberName = (userId: string) => {
    return members.find((m) => m.userId === userId)?.displayName || 'A member';
  };

  // Combine expenses and payments into a chronological activity feed
  const feed = [
    ...expenses.map((e) => ({
      id: e.id,
      type: 'expense' as const,
      title: `${getMemberName(e.paidBy)} paid for "${e.title}"`,
      amountMinor: e.amountMinor,
      currency: e.currency,
      subtitle: `${e.splits.length} people split this expense`,
    })),
    ...payments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      title: `${getMemberName(p.fromUser)} paid ${getMemberName(p.toUser)}`,
      amountMinor: p.amountMinor,
      currency: p.currency,
      subtitle: 'Debt settlement transfer',
    })),
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Recent Activity</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
          Live history of expenses and settlements
        </Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeIcon}>
                <Text style={{ fontSize: 18 }}>
                  {item.type === 'expense' ? '🧾' : '💸'}
                </Text>
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
                  {
                    color: item.type === 'expense' ? palette.text : colors.primary,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  activityCard: {
    marginVertical: 6,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
