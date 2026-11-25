import { router } from 'expo-router';
import { DollarSign, LogOut, Moon, Sun, User, WifiOff } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Pressable,
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
import { ThemePreference, useAppStore } from '../../../store/useAppStore';

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const { isDark, palette, colors, themePreference } = useTheme();

  const user = useAppStore((s) => s.user);
  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const isOfflineSimulated = useAppStore((s) => s.isOfflineSimulated);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const toggleSimulateOffline = useAppStore((s) => s.toggleSimulateOffline);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
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

        {/* Preferences & Appearance */}
        <Card style={styles.settingsCard}>
          {/* Theme Switcher */}
          <View style={styles.appearanceBlock}>
            <View style={styles.settingIconTitle}>
              {isDark ? (
                <Moon size={18} color={palette.textMuted} />
              ) : (
                <Sun size={18} color={palette.textMuted} />
              )}
              <Text style={[styles.settingLabel, { color: palette.text }]}>Appearance</Text>
            </View>

            <View
              style={[
                styles.themeSegment,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              {THEME_OPTIONS.map((opt) => {
                const active = themePreference === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setThemePreference(opt.id)}
                    style={[
                      styles.themeSegmentBtn,
                      active && { backgroundColor: palette.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeSegmentText,
                        {
                          color: active ? palette.text : palette.textMuted,
                          fontFamily: active ? fonts.bold : fonts.medium,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
    paddingBottom: 110,
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
  appearanceBlock: {
    gap: 10,
  },
  themeSegment: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  themeSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  themeSegmentText: {
    fontSize: 13,
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
