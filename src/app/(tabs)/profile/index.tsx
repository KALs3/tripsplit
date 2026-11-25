import { router } from 'expo-router';
import { DollarSign, LogOut, User, WifiOff } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { fonts, tabularNums } from '../../../constants/typography';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function ProfileScreen() {
  const { palette, colors } = useTheme();

  const user = useAppStore((s) => s.user);
  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const isOfflineSimulated = useAppStore((s) => s.isOfflineSimulated);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const toggleSimulateOffline = useAppStore((s) => s.toggleSimulateOffline);
  const signOut = useAppStore((s) => s.signOut);

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Profile & settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: palette.surface }]}>
                <User size={26} color={palette.text} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: palette.text }]}>
                {user?.displayName || 'Traveler'}
              </Text>
              <Text style={[styles.userEmail, { color: palette.textMuted }]}>
                {user?.email || (isGuestDemo ? 'guest.demo@tripsplit.app' : '')}
              </Text>
              <View style={styles.badgeRow}>
                {isGuestDemo ? (
                  <Badge label="Guest demo" variant="neutral" />
                ) : (
                  <Badge label="Verified account" variant="success" />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Preferences & Offline Outbox Simulator */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconTitle}>
              <DollarSign size={18} color={palette.textMuted} />
              <Text style={[styles.settingLabel, { color: palette.text }]}>Base currency</Text>
            </View>
            <Badge label={user?.defaultCurrency || 'USD'} variant="neutral" />
          </View>

          <View
            style={[
              styles.settingRow,
              {
                marginTop: 14,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: palette.border,
              },
            ]}
          >
            <View style={[styles.settingIconTitle, { flex: 1, marginRight: 10 }]}>
              <WifiOff size={18} color={palette.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: palette.text }]}>
                  Simulate airplane mode
                </Text>
                <Text style={[styles.settingSub, tabularNums, { color: palette.textMuted }]}>
                  Queue expenses offline ({pendingMutationsCount} pending) and replay on reconnect
                </Text>
              </View>
            </View>
            <Switch
              value={isOfflineSimulated}
              onValueChange={toggleSimulateOffline}
              trackColor={{ false: palette.borderStrong, true: colors.warning }}
            />
          </View>
        </Card>

        <Button
          title="Sign out"
          onPress={handleSignOut}
          variant="outline"
          size="md"
          icon={<LogOut size={16} color={palette.text} />}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 8,
  },
  settingsCard: {
    padding: 16,
    marginTop: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  settingSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
});
