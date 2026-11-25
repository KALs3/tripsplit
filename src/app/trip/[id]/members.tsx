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
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { TicketDivider } from '../../../components/ui/TicketDivider';
import { fonts, tabularNums } from '../../../constants/typography';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();

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
  const debtColor = isDark ? colors.dangerDark : colors.danger;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(trip.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join "${trip.name}" on TripSplit! Use code ${trip.inviteCode} or open: ${inviteLink}`,
      });
    } catch {
      // Dismissed
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
      'Remove member',
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
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Travelers ({tripMembers.length})
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Boarding Pass QR Invite Ticket */}
          <Card style={styles.inviteCard}>
            <Text style={[styles.inviteHeading, { color: palette.text }]}>
              Trip invite pass
            </Text>
            <Text style={[styles.inviteSub, { color: palette.textMuted }]}>
              Scan or share this code to join {trip.name}.
            </Text>

            <View style={[styles.qrWrapper, { borderColor: palette.border }]}>
              <QRCode
                value={inviteLink}
                size={136}
                color="#09090B"
                backgroundColor="#FFFFFF"
              />
            </View>

            <TicketDivider />

            <View style={[styles.codePill, { backgroundColor: palette.surface }]}>
              <Text style={[styles.codeText, tabularNums, { color: palette.text }]}>
                {trip.inviteCode}
              </Text>
            </View>

            <View style={styles.inviteActions}>
              <Button
                title={copied ? 'Copied' : 'Copy code'}
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
                style={{ flex: 1 }}
              />
              <Button
                title="Share link"
                onPress={handleShareInvite}
                variant="primary"
                size="sm"
                icon={<Share2 size={15} color={palette.accentText} />}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {/* Add Traveler */}
          <Card style={styles.addCard}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Add traveler directly
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
                icon={<UserPlus size={16} color={palette.accentText} />}
              />
            </View>
          </Card>

          {/* Members List */}
          <Text style={[styles.listHeading, { color: palette.text }]}>
            Current group
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
                        { backgroundColor: palette.surface },
                      ]}
                    >
                      <Text style={[styles.initialsText, { color: palette.text }]}>
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
                      variant="neutral"
                      style={{ marginTop: 4 }}
                    />
                  </View>

                  {isOwner && member.role !== 'owner' && (
                    <Pressable
                      onPress={() => handleRemoveMember(member.userId, member.displayName)}
                      style={[styles.trashBtn, { backgroundColor: palette.surface }]}
                      accessibilityLabel={`Remove ${member.displayName}`}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: fonts.bold, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  inviteCard: {
    alignItems: 'center',
    padding: 16,
  },
  inviteHeading: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  inviteSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
  },
  codePill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 14,
  },
  addCard: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginBottom: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  membersCard: {
    padding: 0,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
