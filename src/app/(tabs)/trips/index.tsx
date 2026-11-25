import { router } from 'expo-router';
import { Compass, Plus, QrCode } from 'lucide-react-native';
import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { Button } from '../../../components/ui/Button';
import { SyncStatusBadge } from '../../../components/ui/SyncStatusBadge';
import { tabularNums } from '../../../constants/typography';
import { formatMoney } from '../../../domain';
import { MockTrip } from '../../../domain/mockData';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripsListScreen() {
  const { palette } = useTheme();

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

  const renderTripCard = ({ item }: { item: MockTrip }) => {
    const tripMembers = members.filter((m) => m.tripId === item.id);
    const { userNetMinor } = getTripBalances(item.id);

    const isOwed = userNetMinor > 0;
    const isDebt = userNetMinor < 0;

    const pillBgClass = isOwed
      ? 'bg-credit dark:bg-credit-dark'
      : isDebt
      ? 'bg-debt dark:bg-debt-dark'
      : 'bg-white';

    const pillTextClass = isOwed || isDebt ? 'text-white' : 'text-ink';

    return (
      <Pressable
        onPress={() => handleOpenTrip(item.id)}
        className="h-[168px] rounded-[12px] overflow-hidden border border-hairline dark:border-hairline-dark relative justify-end active:opacity-95"
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <View className="absolute inset-0 bg-zinc-900 items-center justify-center">
            <Compass size={28} color="#A1A1AA" />
          </View>
        )}

        {/* Dark readability scrim */}
        <View className="absolute inset-0 bg-black/35" />

        {/* Overlaid Bottom Content */}
        <View className="p-3.5">
          <Text
            className="font-bold text-[21px] text-white tracking-tight mb-2"
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <View className="flex-row items-center justify-between">
            <AvatarStack
              members={tripMembers}
              maxVisible={3}
              size={26}
              ringColor="#09090B"
              overflowTextColor="#FFFFFF"
            />

            <View className={`px-3 py-[5px] rounded-full ${pillBgClass}`}>
              <Text
                style={tabularNums}
                className={`font-bold text-[13px] ${pillTextClass}`}
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
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
      {/* Pure Monochrome Header */}
      <View className="flex-row items-center justify-between px-[18px] pt-2.5 pb-3">
        <View>
          <Text className="font-bold text-[30px] tracking-tight text-ink dark:text-ink-dark">
            Trips
          </Text>
          {(syncStatus !== 'synced' || pendingMutationsCount > 0) && (
            <View className="mt-1">
              <SyncStatusBadge
                status={syncStatus}
                pendingCount={pendingMutationsCount}
              />
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push('/trip/join')}
            className="w-[38px] h-[38px] rounded-full border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark items-center justify-center active:opacity-80"
            accessibilityLabel="Join trip with code"
          >
            <QrCode size={17} color={palette.text} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/trip/new')}
            className="w-[38px] h-[38px] rounded-full bg-ink dark:bg-ink-dark items-center justify-center active:opacity-85"
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 110,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-[60px] px-7">
            <Text className="font-bold text-[18px] mb-1.5 text-ink dark:text-ink-dark">
              No trips yet
            </Text>
            <Text className="font-sans text-[14px] text-center leading-5 text-muted dark:text-muted-dark">
              Create a trip with friends or join an existing trip with an invite code.
            </Text>
            <Button
              title="Create first trip"
              onPress={() => router.push('/trip/new')}
              variant="primary"
              size="md"
              className="mt-4"
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}
