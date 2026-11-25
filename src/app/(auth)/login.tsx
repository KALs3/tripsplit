import { router } from 'expo-router';
import { ArrowRight, Compass, UserCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
import { TicketDivider } from '../../components/ui/TicketDivider';
import { useLocale } from '../../hooks/useLocale';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';

export default function LoginScreen() {
  const { palette } = useTheme();
  const { t, rtlContainerStyle, flipRtlStyle } = useLocale();

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
      setErrorMessage(t('auth.missingCredentials'));
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
      setErrorMessage(err.message || t('auth.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={rtlContainerStyle} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Minimal Monochrome Brand Header */}
          <View className="items-start mb-6">
            <View className="w-[52px] h-[52px] rounded-[10px] bg-ink dark:bg-ink-dark items-center justify-center mb-3.5">
              <Compass size={28} color={palette.accentText} strokeWidth={2} />
            </View>
            <Text className="font-bold text-[30px] tracking-tight text-ink dark:text-ink-dark">
              {t('auth.appName')}
            </Text>
            <Text className="font-sans text-[15px] mt-1 leading-[22px] text-muted dark:text-muted-dark">
              {t('auth.subtitle')}
            </Text>
          </View>

          {/* Demo Ticket Card */}
          <Card className="p-4 mb-2">
            <View className="flex-row items-center justify-between gap-2.5">
              <View className="flex-1">
                <Text className="font-semibold text-[16px] tracking-tight text-ink dark:text-ink-dark">
                  {t('auth.tryOfflineDemo')}
                </Text>
                <Text className="font-sans text-[13px] mt-0.5 text-muted dark:text-muted-dark">
                  {t('auth.demoHint')}
                </Text>
              </View>
              <Badge label="TOKYO26" variant="neutral" />
            </View>

            <TicketDivider />

            <Button
              title={t('auth.tryOfflineDemo')}
              onPress={handleGuestDemo}
              variant="primary"
              size="md"
              icon={<UserCheck size={17} color={palette.accentText} />}
            />
          </Card>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-hairline dark:bg-hairline-dark" />
            <Text className="font-medium text-[12px] px-2.5 text-muted dark:text-muted-dark">
              {t('auth.or')}
            </Text>
            <View className="flex-1 h-px bg-hairline dark:bg-hairline-dark" />
          </View>

          {/* Email / Password Form */}
          <Card className="p-4">
            {isSignUp && (
              <Input
                label={t('auth.yourName')}
                placeholder={t('auth.yourNamePlaceholder')}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}
            <Input
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {errorMessage ? (
              <Text className="font-medium text-[13px] mt-1.5 mb-1 text-debt dark:text-debt-dark">
                {errorMessage}
              </Text>
            ) : null}

            <Button
              title={isSignUp ? t('auth.createAccount') : t('auth.signIn')}
              onPress={handleEmailAuth}
              loading={loading}
              variant="outline"
              size="md"
              icon={
                <View style={flipRtlStyle}>
                  <ArrowRight size={16} color={palette.text} />
                </View>
              }
              className="mt-2.5"
            />

            <Button
              title={isSignUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              variant="ghost"
              size="sm"
              className="mt-1.5"
            />
          </Card>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
