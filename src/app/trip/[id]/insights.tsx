import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BarChart3, PieChart, Share2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { getCategoryMeta } from '../../../constants/categories';
import { tabularNums } from '../../../constants/typography';
import {
  computeCategoryBreakdown,
  computeDailySpending,
  computeMemberSpending,
  convertToBaseMinor,
  formatMoney,
} from '../../../domain';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();

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

  // Reserved chart color Donut geometry (starts at 12 o'clock without SVG rotation/origin)
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
        const strokeDashoffset = ((25 - acc.cumulativePercent) / 100) * circumference;

        return {
          segments: [
            ...acc.segments,
            {
              category: item.category,
              color: meta.chartColor,
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
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            Trip not found
          </Text>
          <Button title="Back" onPress={() => router.back()} className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  const paidChartColor = isDark ? colors.successDark : colors.success;
  const shareChartColor = isDark ? '#60A5FA' : '#2563EB';
  const dailyChartColor = isDark ? '#A78BFA' : '#7C3AED';

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
        return `• ${meta.label}: ${formatMoney(
          c.amountBaseMinor,
          trip.baseCurrency
        )} (${c.percentage.toFixed(0)}%)`;
      })
      .join('\n');

    const message = [
      `${trip.name} — TripSplit Summary`,
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
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline-dark">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text className="font-bold text-[17px] tracking-tight text-ink dark:text-ink-dark">
          Insights
        </Text>
        <Pressable
          onPress={handleShareSummary}
          className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
          accessibilityLabel="Share trip summary"
        >
          <Share2 size={17} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Reserved Color Category Donut Chart */}
        <Card className="p-4 mb-2.5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-[7px]">
              <PieChart size={16} color={palette.text} />
              <Text className="font-bold text-[15px] text-ink dark:text-ink-dark">
                Spending by category
              </Text>
            </View>
            <Badge label={`${tripExpenses.length} expenses`} variant="neutral" />
          </View>

          {categoryBreakdown.length === 0 ? (
            <Text className="font-sans text-[13px] text-center py-5 text-muted dark:text-muted-dark">
              Add expenses to view category analytics.
            </Text>
          ) : (
            <>
              <View className="items-center justify-center my-2.5 relative">
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
                    />
                  ))}
                </Svg>
                <View className="absolute items-center justify-center">
                  <Text className="font-medium text-[11px] text-muted dark:text-muted-dark">
                    Total
                  </Text>
                  <Text
                    style={tabularNums}
                    className="font-bold text-[16px] mt-0.5 text-ink dark:text-ink-dark"
                  >
                    {formatMoney(totalSpendMinor, trip.baseCurrency)}
                  </Text>
                </View>
              </View>

              <View className="mt-2.5">
                {categoryBreakdown.map((item, idx) => {
                  const meta = getCategoryMeta(item.category);
                  const sliceColor = meta.chartColor;
                  return (
                    <View
                      key={item.category}
                      className={`flex-row items-center justify-between py-2.5 ${
                        idx < categoryBreakdown.length - 1
                          ? 'border-b border-hairline dark:border-hairline-dark'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-2">
                        <View
                          style={{ backgroundColor: sliceColor }}
                          className="w-2.5 h-2.5 rounded-[2px]"
                        />
                        <CategoryIcon category={item.category} size={15} color={sliceColor} />
                        <Text className="font-semibold text-[13px] text-ink dark:text-ink-dark">
                          {meta.label}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          style={tabularNums}
                          className="font-bold text-[13px] text-ink dark:text-ink-dark"
                        >
                          {formatMoney(item.amountBaseMinor, trip.baseCurrency)}
                        </Text>
                        <Text
                          style={tabularNums}
                          className="font-medium text-[11px] text-muted dark:text-muted-dark"
                        >
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
        <Card className="p-4 mb-2.5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-[7px]">
              <BarChart3 size={16} color={palette.text} />
              <Text className="font-bold text-[15px] text-ink dark:text-ink-dark">
                Paid vs. share by member
              </Text>
            </View>
          </View>

          <View className="flex-row gap-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <View
                style={{ backgroundColor: paidChartColor }}
                className="w-2 h-2 rounded-[2px]"
              />
              <Text className="font-medium text-[12px] text-muted dark:text-muted-dark">
                Paid upfront
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View
                style={{ backgroundColor: shareChartColor }}
                className="w-2 h-2 rounded-[2px]"
              />
              <Text className="font-medium text-[12px] text-muted dark:text-muted-dark">
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
              <View key={m.userId} className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="font-bold text-[13px] text-ink dark:text-ink-dark">
                    {getMemberName(m.userId)}
                  </Text>
                  <Text
                    style={tabularNums}
                    className="font-medium text-[11px] text-muted dark:text-muted-dark"
                  >
                    Paid {formatMoney(m.paidBaseMinor, trip.baseCurrency)} / Share{' '}
                    {formatMoney(m.consumedBaseMinor, trip.baseCurrency)}
                  </Text>
                </View>

                <View className="h-1.5 rounded-[3px] bg-surface dark:bg-surface-dark overflow-hidden">
                  <View
                    style={{
                      width: `${m.paidBaseMinor === 0 ? 0 : Math.max(4, paidPct)}%`,
                      backgroundColor: paidChartColor,
                    }}
                    className="h-full rounded-[3px]"
                  />
                </View>
                <View className="h-1.5 rounded-[3px] bg-surface dark:bg-surface-dark overflow-hidden mt-1">
                  <View
                    style={{
                      width: `${m.consumedBaseMinor === 0 ? 0 : Math.max(4, consumedPct)}%`,
                      backgroundColor: shareChartColor,
                    }}
                    className="h-full rounded-[3px]"
                  />
                </View>
              </View>
            );
          })}
        </Card>

        {/* Daily Spending Timeline */}
        {dailySpending.length > 0 && (
          <Card className="p-4 mb-2.5">
            <Text className="font-bold text-[15px] mb-3 text-ink dark:text-ink-dark">
              Daily spend
            </Text>
            {dailySpending.map((day) => {
              const widthPct = Math.round(
                (day.amountBaseMinor / maxDailySpend) * 100
              );
              return (
                <View key={day.date} className="flex-row items-center gap-2.5 mb-2.5">
                  <Text
                    style={tabularNums}
                    className="w-11 font-medium text-[12px] text-muted dark:text-muted-dark"
                  >
                    {day.date.slice(5)}
                  </Text>
                  <View className="flex-1 h-[7px] rounded-[3px] bg-surface dark:bg-surface-dark overflow-hidden">
                    <View
                      style={{
                        width: `${Math.max(8, widthPct)}%`,
                        backgroundColor: dailyChartColor,
                      }}
                      className="h-full rounded-[3px]"
                    />
                  </View>
                  <Text
                    style={tabularNums}
                    className="w-[68px] text-right font-bold text-[12px] text-ink dark:text-ink-dark"
                  >
                    {formatMoney(day.amountBaseMinor, trip.baseCurrency)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        <Button
          title="Share trip summary"
          onPress={handleShareSummary}
          variant="primary"
          size="md"
          icon={<Share2 size={16} color={palette.accentText} />}
          className="mt-2"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
