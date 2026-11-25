import { Tabs } from 'expo-router';
import { Compass, History, User } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';
import { useLocale } from '../../hooks/useLocale';
import { useTheme } from '../../hooks/useTheme';

export default function TabLayout() {
  const { palette } = useTheme();
  const { t, rtlContainerStyle } = useLocale();

  return (
    <View style={rtlContainerStyle} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: palette.background,
          },
        }}
      >
        <Tabs.Screen
          name="trips/index"
          options={{
            title: t('tabs.trips'),
            tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="activity/index"
          options={{
            title: t('tabs.activity'),
            tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
