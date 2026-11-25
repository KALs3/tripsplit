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
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { colors } from '../../../constants/colors';
import { useAppStore } from '../../../store/useAppStore';

export default function TripMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: palette.text }]}>Trip not found</Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const inviteLink = `tripsplit://join/${trip.inviteCode}`;
  const isOwner = trip.ownerId === currentUserId;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(trip.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join my trip "${trip.name}" on TripSplit! Use invite code ${trip.inviteCode} or open: ${inviteLink}`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleAddFriend = () => {
    if (!newFriendName.trim()) {
      setNameError('Enter a name to add a traveler.');
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
      'Remove Member',
      `Remove ${displayName} from "${trip.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMemberFromTrip(trip.id, memberId),
        },
      ]
    );
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
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Members ({tripMembers.length})
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {/* Invite Link & QR Card */}
        <Card style={styles.inviteCard}>
          <Text style={[styles.inviteHeading, { color: palette.text }]}>
            Invite Friends via Code or QR
          </Text>
          <Text style={[styles.inviteSub, { color: palette.textMuted }]}>
            Anyone with this code can join &quot;{trip.name}&quot; and log shared expenses.
          </Text>

          {/* White backing ensures QR code scans reliably in both Light & Dark Mode */}
          <View style={styles.qrWrapper}>
            <QRCode value={inviteLink} size={136} color="#0F172A" backgroundColor="#FFFFFF" />
          </View>

          <View style={[styles.codePill, { backgroundColor: palette.surface }]}>
            <Text style={[styles.codeText, { color: palette.text }]}>
              {trip.inviteCode}
            </Text>
          </View>

          <View style={styles.inviteActions}>
            <Button
              title={copied ? 'Copied!' : 'Copy Code'}
              onPress={handleCopyCode}
              variant="outline"
              size="sm"
              icon={
                copied ? (
                  <Check size={15} color={colors.primary} />
                ) : (
                  <Copy size={15} color={colors.primary} />
                )
              }
              style={{ flex: 1 }}
            />
            <Button
              title="Share Link"
              onPress={handleShareInvite}
              variant="primary"
              size="sm"
              icon={<Share2 size={15} color="#FFFFFF" />}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Quick Add Friend */}
        <Card style={styles.addCard}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Add Traveler Directly
          </Text>
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Friend's name (e.g. Maya)"
                value={newFriendName}
                onChangeText={(val) => {
                  setNewFriendName(val);
                  setNameError('');
                }}
                error={nameError}
                containerStyle={{ marginVertical: 0 }}
              />
            </View>
            <Button
              title="Add"
              onPress={handleAddFriend}
              variant="primary"
              size="md"
              icon={<UserPlus size={16} color="#FFFFFF" />}
            />
          </View>
        </Card>

        {/* Members List */}
        <Text style={[styles.listHeading, { color: palette.text }]}>
          Current Group
        </Text>
        <Card style={styles.membersCard}>
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
                style={[
                  styles.memberRow,
                  idx < tripMembers.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Text style={[styles.initialsText, { color: colors.primaryDark }]}>
                      {initials}
                    </Text>
                  </View>
                )}

                <View style={styles.memberMeta}>
                  <Text style={[styles.memberName, { color: palette.text }]}>
                    {member.displayName} {isSelf ? '(You)' : ''}
                  </Text>
                  <Badge
                    label={member.role === 'owner' ? 'Owner' : 'Member'}
                    variant={member.role === 'owner' ? 'info' : 'neutral'}
                    style={{ marginTop: 4 }}
                  />
                </View>

                {isOwner && member.role !== 'owner' && (
                  <Pressable
                    onPress={() => handleRemoveMember(member.userId, member.displayName)}
                    style={[styles.trashBtn, { backgroundColor: palette.surface }]}
                    accessibilityLabel={`Remove ${member.displayName}`}
                  >
                    <Trash2 size={15} color={colors.danger} />
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  inviteCard: {
    alignItems: 'center',
    padding: 20,
  },
  inviteHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  inviteSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  codePill: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 16,
  },
  addCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
  },
  membersCard: {
    padding: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  trashBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
