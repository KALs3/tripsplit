import { router } from 'expo-router';
import { ArrowRight, Compass, UserCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
import { TicketDivider } from '../../components/ui/TicketDivider';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

export default function LoginScreen() {
  const { palette, colors } = useTheme();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loginAsGuest = useAppStore((s) => s.loginAsGuest);
  const setUser = useAppStore((s) => s.setUser);

  const handleGuestDemo = () => {
    loginAsGuest();
    router.replace('/(tabs)/trips');
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setErrorMessage('Enter both email and password.');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            displayName: displayName || email.split('@')[0],
            defaultCurrency: 'USD',
          });
          router.replace('/(tabs)/trips');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.full_name || email.split('@')[0],
            defaultCurrency: 'USD',
          });
          router.replace('/(tabs)/trips');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Minimal Monochrome Brand Header */}
          <View style={styles.brandContainer}>
            <View
              style={[
                styles.logoBox,
                { backgroundColor: palette.accent },
              ]}
            >
              <Compass size={28} color={palette.accentText} strokeWidth={2} />
            </View>
            <Text style={[styles.brandTitle, { color: palette.text }]}>
              TripSplit
            </Text>
            <Text style={[styles.brandSubtitle, { color: palette.textMuted }]}>
              Shared trip ledger and instant debt settlement
            </Text>
          </View>

          {/* Demo Ticket Card */}
          <Card style={styles.demoTicket}>
            <View style={styles.demoHeader}>
              <View>
                <Text style={[styles.demoTitle, { color: palette.text }]}>
                  Tokyo & Kyoto sample trip
                </Text>
                <Text style={[styles.demoMeta, { color: palette.textMuted }]}>
                  4 travelers, live ledger, offline sync
                </Text>
              </View>
              <Badge label="TOKYO26" variant="neutral" />
            </View>

            <TicketDivider />

            <Button
              title="Try demo trip"
              onPress={handleGuestDemo}
              variant="primary"
              size="md"
              icon={<UserCheck size={17} color={palette.accentText} />}
            />
          </Card>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textMuted }]}>
              or continue with email
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          </View>

          {/* Email / Password Form */}
          <Card style={styles.formCard}>
            {isSignUp && (
              <Input
                label="Full name"
                placeholder="Jane Doe"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <Input
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {errorMessage ? (
              <Text style={[styles.errorBanner, { color: colors.danger }]}>
                {errorMessage}
              </Text>
            ) : null}

            <Button
              title={isSignUp ? 'Create account' : 'Sign in'}
              onPress={handleEmailAuth}
              loading={loading}
              variant="outline"
              size="md"
              icon={<ArrowRight size={16} color={palette.text} />}
              style={{ marginTop: 10 }}
            />

            <Button
              title={
                isSignUp
                  ? 'Already have an account? Sign in'
                  : 'New here? Create an account'
              }
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              variant="ghost"
              size="sm"
              style={{ marginTop: 6 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    marginTop: 4,
    lineHeight: 22,
  },
  demoTicket: {
    padding: 16,
    marginBottom: 8,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  demoTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  demoMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    paddingHorizontal: 10,
  },
  formCard: {
    padding: 16,
  },
  errorBanner: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
  },
});
