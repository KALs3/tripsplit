import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, tabularNums } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';
import { SyncStatus } from '../../sync/types';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  pendingCount: number;
}

export function SyncStatusBadge({ status, pendingCount }: SyncStatusBadgeProps) {
  const { isDark, palette, colors } = useTheme();

  const config = (() => {
    if (status === 'offline' || pendingCount > 0) {
      return {
        label: pendingCount > 0 ? `Offline (${pendingCount} queued)` : 'Offline',
        bg: isDark ? 'rgba(217, 119, 6, 0.16)' : colors.warningLight,
        fg: isDark ? '#FBBF24' : '#B45309',
        border: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(217, 119, 6, 0.25)',
        icon: <CloudOff size={12} color={isDark ? '#FBBF24' : '#B45309'} />,
      };
    }

    if (status === 'syncing') {
      return {
        label: 'Syncing...',
        bg: palette.surface,
        fg: palette.text,
        border: palette.borderStrong,
        icon: <RefreshCw size={12} color={palette.text} />,
      };
    }

    if (status === 'error') {
      return {
        label: 'Retry pending',
        bg: isDark ? 'rgba(248, 113, 113, 0.14)' : colors.dangerLight,
        fg: isDark ? colors.dangerDark : colors.danger,
        border: isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(220, 38, 38, 0.2)',
        icon: <CloudOff size={12} color={isDark ? colors.dangerDark : colors.danger} />,
      };
    }

    return {
      label: 'Synced',
      bg: palette.surface,
      fg: palette.textMuted,
      border: palette.border,
      icon: <Cloud size={12} color={isDark ? colors.successDark : colors.success} />,
    };
  })();

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      {config.icon}
      <Text style={[styles.label, tabularNums, { color: config.fg }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
});
