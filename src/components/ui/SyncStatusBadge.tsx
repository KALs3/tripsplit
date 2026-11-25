import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { colors } from '../../constants/colors';
import { SyncStatus } from '../../sync/types';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  pendingCount: number;
}

export function SyncStatusBadge({ status, pendingCount }: SyncStatusBadgeProps) {
  const isDark = useColorScheme() === 'dark';

  const config = (() => {
    if (status === 'offline' || pendingCount > 0) {
      return {
        label: pendingCount > 0 ? `Offline • ${pendingCount} queued` : 'Offline',
        bg: isDark ? 'rgba(245, 158, 11, 0.16)' : colors.warningLight,
        fg: isDark ? '#FBBF24' : '#B45309',
        icon: <CloudOff size={12} color={isDark ? '#FBBF24' : '#B45309'} />,
      };
    }

    if (status === 'syncing') {
      return {
        label: 'Syncing...',
        bg: isDark ? 'rgba(59, 130, 246, 0.16)' : colors.infoLight,
        fg: isDark ? '#60A5FA' : '#1D4ED8',
        icon: <RefreshCw size={12} color={isDark ? '#60A5FA' : '#1D4ED8'} />,
      };
    }

    if (status === 'error') {
      return {
        label: 'Sync retry pending',
        bg: isDark ? 'rgba(225, 29, 72, 0.16)' : colors.dangerLight,
        fg: isDark ? '#FB7185' : '#BE123C',
        icon: <CloudOff size={12} color={isDark ? '#FB7185' : '#BE123C'} />,
      };
    }

    return {
      label: 'Synced',
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.successLight,
      fg: isDark ? '#34D399' : '#047857',
      icon: <Cloud size={12} color={isDark ? '#34D399' : '#047857'} />,
    };
  })();

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.label, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
