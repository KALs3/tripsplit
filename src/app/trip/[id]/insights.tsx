import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BarChart3, PieChart, Share2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { getCategoryMeta } from '../../../constants/categories';
import { colors } from '../../../constants/colors';
import {
  computeCategoryBreakdown,
  computeDailySpending,
  computeMemberSpending,
  convertToBaseMinor,
  formatMoney,
} from '../../../domain';
import { useAppStore } from '../../../store/useAppStore';

export default function TripInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const user = useAppStore((s) => s.user);

  const trip = trips.find((t) => t.id === id);
  const currentUserId = user?.id || 'user_me';

  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.tripId === id && !e.deletedAt),
    [expenses, id]
  );

  const totalSpendMinor = useMemo(
    () =>
      tripExpenses.reduce(
        (sum, e) => sum + convertToBaseMinor(e.amountMinor, e.fxRateToBase),
        0
      ),
    [tripExpenses]
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(tripExpenses),
    [tripExpenses]
  );

  const memberSpending = useMemo(
    () =>
      computeMemberSpending(
        tripMembers.map((m) => m.userId),
        tripExpenses
      ),
    [tripMembers, tripExpenses]
  );

  const dailySpending = useMemo(
    () => computeDailySpending(tripExpenses),
    [tripExpenses]
  );

  const getMemberName = (userId: string) => {
    const m = tripMembers.find((member) => member.userId === userId);
    if (!m) return 'Member';
    return m.userId === currentUserId ? 'You' : m.displayName.split(' ')[0];
  };

  // Donut chart geometry
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    return categoryBreakdown.reduce<
      {
        segments: {
          category: string;
          color: string;
          strokeDasharray: string;
          strokeDashoffset: number;
        }[];
        cumulativePercent: number;
      }
    >(
      (acc, item) => {
        const meta = getCategoryMeta(item.category);
        const segmentLength = (item.percentage / 100) * circumference;
        const strokeDashoffset = -((acc.cumulativePercent / 100) * circumference);

        return {
          segments: [
            ...acc.segments,
            {
              category: item.category,
              color: meta.color,
              strokeDasharray: `${segmentLength} ${circumference}`,
              strokeDashoffset,
            },
          ],
          cumulativePercent: acc.cumulativePercent + item.percentage,
        };
      },
      { segments: [], cumulativePercent: 0 }
    ).segments;
  }, [categoryBreakdown, circumference]);

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: palette.text }]}>Trip not found</Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const maxMemberSpend = memberSpending.reduce(
    (max, m) => Math.max(max, m.paidBaseMinor, m.consumedBaseMinor),
    1
  );

  const maxDailySpend = dailySpending.reduce(
    (max, d) => Math.max(max, d.amountBaseMinor),
    1
  );

  const handleShareSummary = async () => {
    const topCategories = categoryBreakdown
      .slice(0, 3)
      .map((c) => {
        const meta = getCategoryMeta(c.category);
        return `• ${meta.emoji} ${meta.label}: ${formatMoney(
          c.amountBaseMinor,
          trip.baseCurrency
        )} (${c.percentage.toFixed(0)}%)`;
      })
      .join('\n');

    const message = [
      `✈️ ${trip.name} — TripSplit Summary`,
      `Total Spent: ${formatMoney(totalSpendMinor, trip.baseCurrency)} across ${tripExpenses.length} expenses`,
      `Travelers: ${tripMembers.length}`,
      topCategories ? `\nTop Categories:\n${topCategories}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message });
    } catch {
      // Dismissed
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Trip Insights</Text>
        <Pressable
          onPress={handleShareSummary}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
          accessibilityLabel="Share trip summary"
        >
          <Share2 size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Category Donut Chart */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleIcon}>
              <PieChart size={17} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Spending by Category
              </Text>
            </View>
            <Badge label={`${tripExpenses.length} expenses`} variant="neutral" />
          </View>

          {categoryBreakdown.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Add expenses to unlock category analytics.
            </Text>
          ) : (
            <>
              <View style={styles.donutContainer}>
                <Svg width={size} height={size}>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={palette.surface}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {donutSegments.map((seg) => (
                    <Circle
                      key={seg.category}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="butt"
                      fill="none"
                      rotation="-90"
                      origin={`${size / 2}, ${size / 2}`}
                    />
                  ))}
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutLabel, { color: palette.textMuted }]}>
                    Total
                  </Text>
                  <Text style={[styles.donutTotal, { color: palette.text }]}>
                    {formatMoney(totalSpendMinor, trip.baseCurrency)}
                  </Text>
                </View>
              </View>

              <View style={styles.legendList}>
                {categoryBreakdown.map((item, idx) => {
                  const meta = getCategoryMeta(item.category);
                  return (
                    <View
                      key={item.category}
                      style={[
                        styles.legendRow,
                        idx < categoryBreakdown.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: palette.border,
                        },
                      ]}
                    >
                      <View style={styles.legendLeft}>
                        <View
                          style={[styles.colorDot, { backgroundColor: meta.color }]}
                        />
                        <Text style={[styles.legendName, { color: palette.text }]}>
                          {meta.emoji} {meta.label}
                        </Text>
                      </View>
                      <View style={styles.legendRight}>
                        <Text style={[styles.legendAmount, { color: palette.text }]}>
                          {formatMoney(item.amountBaseMinor, trip.baseCurrency)}
                        </Text>
                        <Text style={[styles.legendPct, { color: palette.textMuted }]}>
                          {item.percentage.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Card>

        {/* Spending by Member */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleIcon}>
              <BarChart3 size={17} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Paid vs. Share by Member
              </Text>
            </View>
          </View>

          <View style={styles.subLegendRow}>
            <View style={styles.subLegendItem}>
              <View style={[styles.miniDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.subLegendText, { color: palette.textMuted }]}>
                Paid upfront
              </Text>
            </View>
            <View style={styles.subLegendItem}>
              <View style={[styles.miniDot, { backgroundColor: colors.info }]} />
              <Text style={[styles.subLegendText, { color: palette.textMuted }]}>
                Actual share
              </Text>
            </View>
          </View>

          {memberSpending.map((m) => {
            const paidPct = Math.round((m.paidBaseMinor / maxMemberSpend) * 100);
            const consumedPct = Math.round(
              (m.consumedBaseMinor / maxMemberSpend) * 100
            );

            return (
              <View key={m.userId} style={styles.memberBarBlock}>
                <View style={styles.memberBarHeader}>
                  <Text style={[styles.memberName, { color: palette.text }]}>
                    {getMemberName(m.userId)}
                  </Text>
                  <Text style={[styles.memberValues, { color: palette.textMuted }]}>
                    Paid {formatMoney(m.paidBaseMinor, trip.baseCurrency)} • Share{' '}
                    {formatMoney(m.consumedBaseMinor, trip.baseCurrency)}
                  </Text>
                </View>

                <View style={[styles.barTrack, { backgroundColor: palette.surface }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${m.paidBaseMinor === 0 ? 0 : Math.max(4, paidPct)}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: palette.surface, marginTop: 4 },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${m.consumedBaseMinor === 0 ? 0 : Math.max(4, consumedPct)}%`,
                        backgroundColor: colors.info,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>

        {/* Daily Spending Timeline */}
        {dailySpending.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: palette.text, marginBottom: 12 }]}>
              Spending Over Time
            </Text>
            {dailySpending.map((day) => {
              const widthPct = Math.round(
                (day.amountBaseMinor / maxDailySpend) * 100
              );
              return (
                <View key={day.date} style={styles.dayRow}>
                  <Text style={[styles.dayLabel, { color: palette.textMuted }]}>
                    {day.date.slice(5)}
                  </Text>
                  <View style={[styles.dayTrack, { backgroundColor: palette.surface }]}>
                    <View
                      style={[
                        styles.dayFill,
                        {
                          width: `${Math.max(8, widthPct)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayAmount, { color: palette.text }]}>
                    {formatMoney(day.amountBaseMinor, trip.baseCurrency)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        <Button
          title="Share Trip Summary"
          onPress={handleShareSummary}
          variant="primary"
          size="md"
          icon={<Share2 size={16} color="#FFFFFF" />}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontWeight: '700' },
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  donutTotal: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  legendList: {
    marginTop: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  subLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  subLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subLegendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberBarBlock: {
    marginBottom: 14,
  },
  memberBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberValues: {
    fontSize: 11,
    fontWeight: '600',
  },
  barTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dayLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: '600',
  },
  dayTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayFill: {
    height: '100%',
    borderRadius: 4,
  },
  dayAmount: {
    width: 68,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});
