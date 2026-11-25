import { Tabs } from 'expo-router';
import { Compass, History, User } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';

export default function TabLayout() {
  const { palette } = useTheme();

  return (
    <View className="flex-1 bg-canvas dark:bg-canvas-dark">
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
    </View>
  );
}
