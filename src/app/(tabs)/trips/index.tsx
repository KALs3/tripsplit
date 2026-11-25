import { router } from 'expo-router';
import { Calendar, Plus, QrCode, Users } from 'lucide-react-native';
import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { colors } from '../../../constants/colors';
import { formatMoney } from '../../../domain';
import { MockTrip } from '../../../domain/mockData';
import { useAppStore } from '../../../store/useAppStore';

export default function TripsListScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
    const { userNetMinor } = getTripBalances(item.id);

    const isOwed = userNetMinor > 0;
    const isDebt = userNetMinor < 0;

    return (
      <Pressable onPress={() => handleOpenTrip(item.id)}>
        <Card style={styles.tripCard}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: palette.surface }]}>
              <Text style={styles.coverFallbackText}>✈️</Text>
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.tripName, { color: palette.text }]} numberOfLines={1}>
                {item.name}
              </Text>
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

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Users size={14} color={palette.textMuted} />
                <Text style={[styles.metaText, { color: palette.textMuted }]}>
                  {tripMembers.length || 1} members
                </Text>
              </View>

              {item.startDate && (
                <View style={styles.metaItem}>
                  <Calendar size={14} color={palette.textMuted} />
                  <Text style={[styles.metaText, { color: palette.textMuted }]}>
                    {new Date(item.startDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Top App Bar */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: palette.text }]}>
              Hi, {user?.displayName?.split(' ')[0] || 'Traveler'} 👋
            </Text>
            {isGuestDemo && (
              <Badge label="Demo" variant="info" style={{ marginLeft: 6 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <SyncStatusBadge status={syncStatus} pendingCount={pendingMutationsCount} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Join"
            onPress={() => router.push('/trip/join')}
            variant="outline"
            size="sm"
            icon={<QrCode size={15} color={colors.primary} />}
          />
          <Button
            title="New Trip"
            onPress={() => router.push('/trip/new')}
            variant="primary"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
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
              title="Create First Trip"
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  tripCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E2E8F0',
  },
  coverFallback: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackText: {
    fontSize: 36,
  },
  cardContent: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
