import React from 'react';
import { View } from 'react-native';

interface TicketDividerProps {
  /** Optional explicit background class for side cutouts */
  cutoutClassName?: string;
}

/**
 * Transit-ticket perforated horizontal divider with side notches.
 */
export function TicketDivider({
  cutoutClassName = 'bg-canvas dark:bg-canvas-dark',
}: TicketDividerProps) {
  return (
    <View className="h-[18px] justify-center relative my-2.5 -mx-4">
      <View
        className={`absolute -left-[9px] w-[18px] h-[18px] rounded-full border border-hairline dark:border-hairline-dark ${cutoutClassName}`}
      />
      <View className="border-b border-dashed border-hairline dark:border-hairline-dark mx-3.5" />
      <View
        className={`absolute -right-[9px] w-[18px] h-[18px] rounded-full border border-hairline dark:border-hairline-dark ${cutoutClassName}`}
      />
    </View>
  );
}
