import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Copy,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { Text } from '../../../components/ui/Text';
import { TicketDivider } from '../../../components/ui/TicketDivider';
import { tabularNums } from '../../../constants/typography';
import { useLocale } from '../../../hooks/useLocale';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();
  const { t, flipRtlStyle, ltrTextStyle } = useLocale();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const user = useAppStore((s) => s.user);
  const addMemberToTrip = useAppStore((s) => s.addMemberToTrip);
  const removeMemberFromTrip = useAppStore((s) => s.removeMemberFromTrip);

  const [newFriendName, setNewFriendName] = useState('');
  const [nameError, setNameError] = useState('');
  const [copied, setCopied] = useState(false);

  const trip = trips.find((t) => t.id === id);
  const currentUserId = user?.id || 'user_me';

  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            {t('common.tripNotFound')}
          </Text>
          <Button title={t('common.back')} onPress={() => router.back()} className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  const inviteLink = `tripsplit://join/${trip.inviteCode}`;
  const isOwner = trip.ownerId === currentUserId;
  const debtColor = isDark ? colors.dangerDark : colors.danger;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(trip.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: t('members.shareMessage', {
          tripName: trip.name,
          code: trip.inviteCode,
          link: inviteLink,
        }),
      });
    } catch {
      // Dismissed
    }
  };

  const handleAddFriend = () => {
    if (!newFriendName.trim()) {
      setNameError(t('members.addTravelerError'));
      return;
    }
    addMemberToTrip(trip.id, newFriendName);
    setNewFriendName('');
    setNameError('');
  };

  const handleRemoveMember = (memberId: string, displayName: string) => {
    if (Platform.OS === 'web') {
      removeMemberFromTrip(trip.id, memberId);
      return;
    }
    Alert.alert(
      t('members.removeTitle'),
      t('members.removeBody', { name: displayName, tripName: trip.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => removeMemberFromTrip(trip.id, memberId),
        },
      ]
    );
  };

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
          {t('members.title', { count: tripMembers.length })}
        </Text>
        <View className="w-9" />
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Boarding Pass QR Invite Ticket */}
          <Card className="items-center p-4">
            <Text className="font-bold text-[17px] text-ink dark:text-ink-dark">
              {t('members.inviteCodeTitle')}
            </Text>
            <Text className="font-sans text-[13px] text-center mt-0.5 mb-3.5 text-muted dark:text-muted-dark">
              {t('members.inviteSubtitle')}
            </Text>

            <View className="p-3 bg-white rounded-[10px] border border-hairline dark:border-hairline-dark">
              <QRCode
                value={inviteLink}
                size={136}
                color="#09090B"
                backgroundColor="#FFFFFF"
              />
            </View>

            <TicketDivider />

            <View className="px-[18px] py-2 rounded-lg bg-surface dark:bg-surface-dark">
              <Text
                style={[tabularNums, ltrTextStyle]}
                className="font-bold text-[18px] tracking-[2px] text-ink dark:text-ink-dark"
              >
                {trip.inviteCode}
              </Text>
            </View>

            <View className="flex-row gap-2.5 w-full mt-3.5">
              <Button
                title={copied ? t('members.copied') : t('members.copyCode')}
                onPress={handleCopyCode}
                variant="outline"
                size="sm"
                icon={
                  copied ? (
                    <Check size={15} color={palette.text} />
                  ) : (
                    <Copy size={15} color={palette.text} />
                  )
                }
                className="flex-1"
              />
              <Button
                title={t('members.shareLink')}
                onPress={handleShareInvite}
                variant="primary"
                size="sm"
                icon={<Share2 size={15} color={palette.accentText} />}
                className="flex-1"
              />
            </View>
          </Card>

          {/* Add Traveler */}
          <Card className="p-4">
            <Text className="font-bold text-[15px] mb-2.5 text-ink dark:text-ink-dark">
              {t('members.addTravelerTitle')}
            </Text>
            <View className="flex-row items-start gap-2.5">
              <View className="flex-1">
                <Input
                  placeholder={t('members.addTravelerPlaceholder')}
                  value={newFriendName}
                  onChangeText={(val) => {
                    setNewFriendName(val);
                    setNameError('');
                  }}
                  error={nameError}
                  containerClassName="my-0"
                />
              </View>
              <Button
                title={t('common.add')}
                onPress={handleAddFriend}
                variant="primary"
                size="md"
                icon={<UserPlus size={16} color={palette.accentText} />}
              />
            </View>
          </Card>

          {/* Members List */}
          <Text className="font-bold text-[16px] mt-3.5 mb-1.5 text-ink dark:text-ink-dark">
            {t('members.currentGroup')}
          </Text>
          <Card className="p-0 overflow-hidden">
            {tripMembers.map((member, idx) => {
              const isSelf = member.userId === currentUserId;
              const initials = member.displayName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <View
                  key={member.userId}
                  className={`flex-row items-center px-3.5 py-3 ${
                    idx < tripMembers.length - 1
                      ? 'border-b border-hairline dark:border-hairline-dark'
                      : ''
                  }`}
                >
                  {member.avatarUrl ? (
                    <Image
                      source={{ uri: member.avatarUrl }}
                      className="w-10 h-10 rounded-full me-3"
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center me-3">
                      <Text className="font-bold text-[14px] text-ink dark:text-ink-dark">
                        {initials}
                      </Text>
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                      {member.displayName} {isSelf ? `(${t('common.you')})` : ''}
                    </Text>
                    <View className="mt-1 self-start">
                      <Badge
                        label={
                          member.role === 'owner' ? t('common.owner') : t('common.member')
                        }
                        variant="neutral"
                      />
                    </View>
                  </View>

                  {isOwner && member.role !== 'owner' && (
                    <Pressable
                      onPress={() => handleRemoveMember(member.userId, member.displayName)}
                      className="w-8 h-8 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
                      accessibilityLabel={t('members.removeTitle')}
                    >
                      <Trash2 size={15} color={debtColor} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </Card>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
