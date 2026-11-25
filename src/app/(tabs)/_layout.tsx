import { Tabs } from 'expo-router';
import { Compass, History, User } from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

export default function TabLayout() {
  const { isDark, palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(insets.bottom, 12),
          height: 62,
          borderRadius: 999,
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: palette.border,
          paddingBottom: 6,
          paddingTop: 6,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
          letterSpacing: -0.1,
        },
      }}
    >
      <Tabs.Screen
        name="trips/index"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity/index"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
