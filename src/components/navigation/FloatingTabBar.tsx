import type { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../ui/Text';

export type FloatingTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * Floating pill bottom tab bar styled with NativeWind utilities.
 */
export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: FloatingTabBarProps) {
  const { palette } = useTheme();

  return (
    <View
      className="absolute left-5 right-5 h-[62px] rounded-full bg-card dark:bg-card-dark border border-hairline dark:border-hairline-dark flex-row items-center px-2 py-1.5 shadow-lg shadow-black/10 dark:shadow-black/40"
      style={{
        bottom: Math.max(insets.bottom, 12),
        elevation: 8,
      }}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const options = descriptor?.options ?? {};
        if (options.hidden || (options as { href?: string | null }).href === null) {
          return null;
        }

        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        const iconColor = focused ? palette.tabIconSelected : palette.tabIconDefault;

        const handlePress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        const handleLongPress = () => {
          emitter.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={handlePress}
            onLongPress={handleLongPress}
            className="flex-1 h-full items-center justify-center rounded-full active:opacity-70"
          >
            {options.tabBarIcon?.({ focused, color: iconColor, size: 22 })}
            <Text
              className={`font-semibold text-[11px] tracking-tight mt-0.5 ${
                focused ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'
              }`}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
