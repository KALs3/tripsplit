import { router } from 'expo-router';
import {
  DollarSign,
  Globe,
  LogOut,
  Moon,
  Sun,
  User,
  WifiOff,
} from 'lucide-react-native';
import React from 'react';
import { Image, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { tabularNums } from '../../../constants/typography';
import { useLocale } from '../../../hooks/useLocale';
import { useTheme } from '../../../hooks/useTheme';
import { LanguagePreference } from '../../../i18n';
import { ThemePreference, useAppStore } from '../../../store/useAppStore';

export default function ProfileScreen() {
  const { isDark, palette, colors, themePreference } = useTheme();
  const { t, languagePreference, needsRtlRestart, setLanguagePreference } = useLocale();

  const user = useAppStore((s) => s.user);
  const isGuestDemo = useAppStore((s) => s.isGuestDemo);
  const isOfflineSimulated = useAppStore((s) => s.isOfflineSimulated);
  const pendingMutationsCount = useAppStore((s) => s.pendingMutationsCount);
  const toggleSimulateOffline = useAppStore((s) => s.toggleSimulateOffline);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const signOut = useAppStore((s) => s.signOut);

  const themeOptions: { id: ThemePreference; label: string }[] = [
    { id: 'system', label: t('profile.themeSystem') },
    { id: 'light', label: t('profile.themeLight') },
    { id: 'dark', label: t('profile.themeDark') },
  ];

  const languageOptions: { id: LanguagePreference; label: string }[] = [
    { id: 'system', label: t('profile.langSystem') },
    { id: 'en', label: t('profile.langEn') },
    { id: 'ar', label: t('profile.langAr') },
  ];

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
      <View className="px-[18px] pt-2.5 pb-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[22px] tracking-tight text-ink dark:text-ink-dark">
          {t('profile.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {/* User Card */}
        <Card className="p-4">
          <View className="flex-row items-center">
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                className="w-14 h-14 rounded-full me-3.5"
              />
            ) : (
              <View className="w-14 h-14 rounded-full bg-surface dark:bg-surface-dark items-center justify-center me-3.5">
                <User size={26} color={palette.text} />
              </View>
            )}
            <View className="flex-1">
              <Text className="font-bold text-[18px] tracking-tight text-ink dark:text-ink-dark">
                {user?.displayName || t('common.member')}
              </Text>
              <Text className="font-sans text-[13px] mt-0.5 text-muted dark:text-muted-dark">
                {user?.email || (isGuestDemo ? 'guest.demo@tripsplit.app' : '')}
              </Text>
              <View className="mt-2 self-start">
                {isGuestDemo ? (
                  <Badge label={t('profile.guestDemo')} variant="neutral" />
                ) : (
                  <Badge label={t('profile.verifiedAccount')} variant="success" />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Preferences & Appearance */}
        <Card className="p-4 mt-1.5">
          {/* Theme Switcher */}
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2.5">
              {isDark ? (
                <Moon size={18} color={palette.textMuted} />
              ) : (
                <Sun size={18} color={palette.textMuted} />
              )}
              <Text className="font-semibold text-[15px] text-ink dark:text-ink-dark">
                {t('profile.appearance')}
              </Text>
            </View>

            <View className="flex-row rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-[3px]">
              {themeOptions.map((opt) => {
                const active = themePreference === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setThemePreference(opt.id)}
                    className={`flex-1 py-[7px] rounded-[6px] items-center ${
                      active ? 'bg-card dark:bg-card-dark' : ''
                    }`}
                  >
                    <Text
                      className={`text-[13px] ${
                        active
                          ? 'font-bold text-ink dark:text-ink-dark'
                          : 'font-medium text-muted dark:text-muted-dark'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Language Switcher (English / Arabic / System) */}
          <View className="gap-2.5 mt-3.5 pt-3.5 border-t border-hairline dark:border-hairline-dark">
            <View className="flex-row items-center gap-2.5">
              <Globe size={18} color={palette.textMuted} />
              <Text className="font-semibold text-[15px] text-ink dark:text-ink-dark">
                {t('profile.language')}
              </Text>
            </View>

            <View className="flex-row rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-[3px]">
              {languageOptions.map((opt) => {
                const active = languagePreference === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setLanguagePreference(opt.id)}
                    className={`flex-1 py-[7px] rounded-[6px] items-center ${
                      active ? 'bg-card dark:bg-card-dark' : ''
                    }`}
                  >
                    <Text
                      className={`text-[13px] ${
                        active
                          ? 'font-bold text-ink dark:text-ink-dark'
                          : 'font-medium text-muted dark:text-muted-dark'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {Platform.OS !== 'web' && needsRtlRestart ? (
              <Text className="font-sans text-[11px] text-muted dark:text-muted-dark">
                {t('profile.rtlRestartHint')}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between mt-3.5 pt-3.5 border-t border-hairline dark:border-hairline-dark">
            <View className="flex-row items-center gap-2.5">
              <DollarSign size={18} color={palette.textMuted} />
              <Text className="font-semibold text-[15px] text-ink dark:text-ink-dark">
                {t('trips.baseCurrency')}
              </Text>
            </View>
            <Badge label={user?.defaultCurrency || 'USD'} variant="neutral" />
          </View>

          <View className="flex-row items-center justify-between mt-3.5 pt-3.5 border-t border-hairline dark:border-hairline-dark">
            <View className="flex-row items-center gap-2.5 flex-1 me-2.5">
              <WifiOff size={18} color={palette.textMuted} />
              <View className="flex-1">
                <Text className="font-semibold text-[15px] text-ink dark:text-ink-dark">
                  {t('profile.simulateOffline')}
                </Text>
                <Text
                  style={tabularNums}
                  className="font-sans text-[12px] mt-0.5 leading-[17px] text-muted dark:text-muted-dark"
                >
                  {pendingMutationsCount > 0
                    ? t('profile.pendingStatus', { count: pendingMutationsCount })
                    : t('profile.simulateOfflineSub')}
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
          title={t('profile.signOut')}
          onPress={handleSignOut}
          variant="outline"
          size="md"
          icon={<LogOut size={16} color={palette.text} />}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
