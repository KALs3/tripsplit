import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { tabularNums } from '../../constants/typography';
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
        containerClass:
          'bg-amber-100 dark:bg-amber-500/15 border-amber-600/25 dark:border-amber-400/30',
        textClass: 'text-amber-700 dark:text-amber-400',
        icon: <CloudOff size={12} color={isDark ? '#FBBF24' : '#B45309'} />,
      };
    }

    if (status === 'syncing') {
      return {
        label: 'Syncing...',
        containerClass:
          'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark',
        textClass: 'text-ink dark:text-ink-dark',
        icon: <RefreshCw size={12} color={palette.text} />,
      };
    }

    if (status === 'error') {
      return {
        label: 'Retry pending',
        containerClass:
          'bg-red-100 dark:bg-red-500/15 border-red-600/20 dark:border-red-400/30',
        textClass: 'text-debt dark:text-debt-dark',
        icon: (
          <CloudOff
            size={12}
            color={isDark ? colors.dangerDark : colors.danger}
          />
        ),
      };
    }

    return {
      label: 'Synced',
      containerClass:
        'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark',
      textClass: 'text-muted dark:text-muted-dark',
      icon: (
        <Cloud
          size={12}
          color={isDark ? colors.successDark : colors.success}
        />
      ),
    };
  })();

  return (
    <View
      className={`flex-row items-center gap-1.5 px-2 py-[3px] rounded-lg border ${config.containerClass}`}
    >
      {config.icon}
      <Text
        style={tabularNums}
        className={`font-medium text-[11px] ${config.textClass}`}
      >
        {config.label}
      </Text>
    </View>
  );
}
