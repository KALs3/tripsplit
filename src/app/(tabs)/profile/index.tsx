import { router } from 'expo-router';
import { Award, DollarSign, LogOut, User } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
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
  const signOut = useAppStore((s) => s.signOut);

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
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

        {/* Recruiter / Portfolio Architecture Card */}
        <Card style={[styles.portfolioCard, { borderColor: colors.primary }]}>
          <View style={styles.portfolioHeader}>
            <Award size={20} color={colors.primary} />
            <Text style={[styles.portfolioTitle, { color: colors.primary }]}>
              Technical Highlights (Portfolio)
            </Text>
          </View>
          <Text style={[styles.portfolioText, { color: palette.text }]}>
            • <Text style={{ fontWeight: '700' }}>Zero Floating-Point Math:</Text> Currencies stored as integer minor units (cents).
          </Text>
          <Text style={[styles.portfolioText, { color: palette.text }]}>
            • <Text style={{ fontWeight: '700' }}>Greedy Debt Simplification:</Text> O(N log N) bipartite algorithm minimizing transfers.
          </Text>
          <Text style={[styles.portfolioText, { color: palette.text }]}>
            • <Text style={{ fontWeight: '700' }}>PostgreSQL RLS:</Text> Engine-level security guaranteeing multi-tenant isolation.
          </Text>
          <Text style={[styles.portfolioText, { color: palette.text }]}>
            • <Text style={{ fontWeight: '700' }}>Offline-First Ready:</Text> Client UUID idempotency for robust mutation replays.
          </Text>
        </Card>

        {/* Preferences */}
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconTitle}>
              <DollarSign size={18} color={palette.textMuted} />
              <Text style={[styles.settingLabel, { color: palette.text }]}>Base Currency</Text>
            </View>
            <Badge label={user?.defaultCurrency || 'USD'} variant="neutral" />
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
  portfolioCard: {
    borderWidth: 1.5,
    marginVertical: 14,
    padding: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  portfolioTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  portfolioText: {
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 2,
  },
  settingsCard: {
    padding: 16,
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
