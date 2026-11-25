import { router } from 'expo-router';
import { Calendar, Compass, Plus, QrCode } from 'lucide-react-native';
import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { fonts, tabularNums } from '../../../constants/typography';
import { formatMoney } from '../../../domain';
import { MockTrip } from '../../../domain/mockData';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripsListScreen() {
  const { palette } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const user = useAppStore((s) => s.user);
  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const getTripBalances = useAppStore((s) => s.getTripBalances);

  const handleOpenTrip = (tripId: string) => {
    setActiveTrip(tripId);
    router.push({ pathname: '/trip/[id]', params: { id: tripId } });
  };

  const renderTripCard = ({ item }: { item: MockTrip }) => {
    const tripMembers = members.filter((m) => m.tripId === item.id);
    const { userNetMinor, totalSpendMinor } = getTripBalances(item.id);

    const isOwed = userNetMinor > 0;
    const isDebt = userNetMinor < 0;

    return (
      <Pressable onPress={() => handleOpenTrip(item.id)}>
        <Card style={styles.tripCard}>
          {/* Cover Header with Scrim */}
          <View style={styles.coverWrap}>
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: palette.surface }]}>
                <Compass size={28} color={palette.textMuted} />
              </View>
            )}
            <View style={styles.coverScrim} />
            <View style={styles.coverOverlay}>
              <Text style={styles.coverTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.coverDateRow}>
                {item.startDate ? (
                  <View style={styles.datePill}>
                    <Calendar size={12} color="#E4E4E7" />
                    <Text style={styles.coverDateText}>
                      {new Date(item.startDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.coverDateText}>{item.inviteCode}</Text>
              </View>
            </View>
          </View>

          {/* Structured Footer Strip */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <AvatarStack members={tripMembers} size={26} />
              <Text style={[styles.spendText, tabularNums, { color: palette.textMuted }]}>
                Total {formatMoney(totalSpendMinor, item.baseCurrency)}
              </Text>
            </View>

            <Badge
              label={
                isOwed
                  ? `+${formatMoney(userNetMinor, item.baseCurrency)}`
                  : isDebt
                  ? formatMoney(userNetMinor, item.baseCurrency)
                  : 'Settled'
              }
              variant={isOwed ? 'success' : isDebt ? 'danger' : 'neutral'}
            />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {/* Minimal Monochrome Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: palette.text }]} numberOfLines={1}>
              {user?.displayName?.split(' ')[0] || 'Traveler'}&apos;s trips
            </Text>
            {isGuestDemo && (
              <Badge label="Demo" variant="neutral" style={{ marginLeft: 8 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <SyncStatusBadge status={syncStatus} pendingCount={pendingMutationsCount} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Join"
            onPress={() => router.push('/trip/join')}
            variant="outline"
            size="sm"
            icon={<QrCode size={15} color={palette.text} />}
          />
          <Button
            title="New trip"
            onPress={() => router.push('/trip/new')}
            variant="primary"
            size="sm"
            icon={<Plus size={15} color={palette.accentText} />}
          />
        </View>
      </View>

      {/* Trips FlatList */}
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No trips yet</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
              Create a trip with friends or join an existing trip with an invite code.
            </Text>
            <Button
              title="Create first trip"
              onPress={() => router.push('/trip/new')}
              variant="primary"
              size="md"
              style={{ marginTop: 16 }}
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
  coverWrap: {
    height: 136,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.42)',
  },
  coverOverlay: {
    padding: 14,
  },
  coverTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  coverDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverDateText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#E4E4E7',
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spendText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
