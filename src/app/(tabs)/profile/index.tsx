import { router } from 'expo-router';
import { DollarSign, LogOut, User, WifiOff } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { colors } from '../../../constants/colors';
import { useAppStore } from '../../../store/useAppStore';

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Profile & Settings</Text>
        </View>

        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                <User size={32} color={colors.primary} />
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
                  <Badge label="Guest Demo Mode" variant="info" />
                ) : (
                  <Badge label="Verified Account" variant="success" />
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
              <Text style={[styles.settingLabel, { color: palette.text }]}>Base Currency</Text>
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
                  Simulate Airplane Mode
                </Text>
                <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>
                  Queue expenses offline ({pendingMutationsCount} pending) and replay on reconnect
                </Text>
              </View>
            </View>
            <Switch
              value={isOfflineSimulated}
              onValueChange={toggleSimulateOffline}
              trackColor={{ false: palette.border, true: colors.warning }}
            />
          </View>
        </Card>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="md"
          icon={<LogOut size={16} color={colors.primary} />}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  userCard: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 8,
  },
  settingsCard: {
    padding: 16,
    marginTop: 10,
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
    fontSize: 15,
    fontWeight: '600',
  },
});
