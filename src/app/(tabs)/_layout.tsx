import { Tabs } from 'expo-router';
import { Compass, History, User } from 'lucide-react-native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
