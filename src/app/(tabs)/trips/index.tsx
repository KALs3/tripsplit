import { router } from 'expo-router';
import { Compass, Plus, QrCode } from 'lucide-react-native';
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
import { Button } from '../../../components/ui/Button';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { fonts, tabularNums } from '../../../constants/typography';
import { formatMoney } from '../../../domain';
import { MockTrip } from '../../../domain/mockData';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripsListScreen() {
  const { isDark, palette, colors } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const getTripBalances = useAppStore((s) => s.getTripBalances);

  const handleOpenTrip = (tripId: string) => {
    setActiveTrip(tripId);
    router.push({ pathname: '/trip/[id]', params: { id: tripId } });
  };

  const creditBg = isDark ? colors.successDark : colors.success;
  const debtBg = isDark ? colors.dangerDark : colors.danger;

  const renderTripCard = ({ item }: { item: MockTrip }) => {
    const tripMembers = members.filter((m) => m.tripId === item.id);
    const { userNetMinor } = getTripBalances(item.id);

    const isOwed = userNetMinor > 0;
    const isDebt = userNetMinor < 0;

    return (
      <Pressable
        onPress={() => handleOpenTrip(item.id)}
        style={({ pressed }) => [
          styles.tripCard,
          { borderColor: palette.border, opacity: pressed ? 0.94 : 1 },
        ]}
      >
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: '#18181B' }]}>
            <Compass size={28} color="#A1A1AA" />
          </View>
        )}

        {/* Dark readability gradient scrim */}
        <View style={styles.coverScrim} />

        {/* Overlaid Bottom Content */}
        <View style={styles.overlayContent}>
          <Text style={styles.coverTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.overlayBottomRow}>
            <AvatarStack
              members={tripMembers}
              maxVisible={3}
              size={26}
              ringColor="#09090B"
              overflowTextColor="#FFFFFF"
            />

            <View
              style={[
                styles.balancePill,
                {
                  backgroundColor: isOwed
                    ? creditBg
                    : isDebt
                    ? debtBg
                    : '#FFFFFF',
                },
              ]}
            >
              <Text
                style={[
                  styles.balancePillText,
                  tabularNums,
                  {
                    color: isOwed || isDebt ? '#FFFFFF' : '#09090B',
                  },
                ]}
              >
                {isOwed
                  ? `+${formatMoney(userNetMinor, item.baseCurrency)}`
                  : isDebt
                  ? formatMoney(userNetMinor, item.baseCurrency)
                  : 'Settled'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {/* Pure Monochrome Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Trips</Text>
          {(syncStatus !== 'synced' || pendingMutationsCount > 0) && (
            <View style={{ marginTop: 4 }}>
              <SyncStatusBadge
                status={syncStatus}
                pendingCount={pendingMutationsCount}
              />
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/trip/join')}
            style={[
              styles.joinIconBtn,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            accessibilityLabel="Join trip with code"
          >
            <QrCode size={17} color={palette.text} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/trip/new')}
            style={[styles.addCircleBtn, { backgroundColor: palette.accent }]}
            accessibilityLabel="Create new trip"
          >
            <Plus size={20} color={palette.accentText} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      {/* Full-Bleed Photo Trip Cards */}
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 14,
  },
  tripCard: {
    height: 168,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
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
    backgroundColor: 'rgba(9, 9, 11, 0.36)',
  },
  overlayContent: {
    padding: 14,
  },
  coverTitle: {
    fontFamily: fonts.bold,
    fontSize: 21,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  overlayBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balancePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  balancePillText: {
    fontFamily: fonts.bold,
    fontSize: 13,
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
