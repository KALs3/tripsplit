import { router } from 'expo-router';
import { Compass, Sparkles, UserCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

export default function LoginScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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
      setErrorMessage('Please enter both email and password.');
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
      // In development or if Supabase keys are placeholders, offer clear feedback
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primaryLight }]}>
              <Compass size={36} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: palette.text }]}>TripSplit</Text>
            <Text style={[styles.brandSubtitle, { color: palette.textMuted }]}>
              Effortless group expense splitting & shared trip planner
            </Text>
          </View>

          {/* Quick Demo Callout (Primary recruiter action) */}
          <Card
            style={[
              styles.demoCard,
              {
                borderColor: colors.primary,
                backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5',
              },
            ]}
          >
            <View style={styles.demoCardHeader}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.demoCardTitle, { color: colors.primary }]}>
                Recruiter & Demo Mode
              </Text>
              <Badge label="Instant" variant="success" />
            </View>
            <Text style={[styles.demoCardText, { color: palette.text }]}>
              Explore a pre-loaded trip to Tokyo with 4 travelers, real expenses, and greedy debt simplification. No signup required.
            </Text>
            <Button
              title="Try 1-Tap Guest Demo"
              onPress={handleGuestDemo}
              variant="primary"
              size="md"
              icon={<UserCheck size={18} color="#FFFFFF" />}
              style={styles.demoButton}
            />
          </Card>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textMuted }]}>
              or sign in with email
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          </View>

          {/* Email / Password Form */}
          <Card style={styles.formCard}>
            {isSignUp && (
              <Input
                label="Full Name"
                placeholder="e.g. Jane Doe"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <Input
              label="Email Address"
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
              <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            <Button
              title={isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleEmailAuth}
              loading={loading}
              variant="primary"
              size="md"
              style={{ marginTop: 12 }}
            />

            <Button
              title={
                isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"
              }
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              variant="ghost"
              size="sm"
              style={{ marginTop: 8 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  demoCard: {
    borderWidth: 1.5,
    marginBottom: 20,
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  demoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  demoCardText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  demoButton: {
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  formCard: {
    padding: 18,
  },
  errorBanner: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
  },
});
