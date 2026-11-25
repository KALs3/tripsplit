import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface TicketDividerProps {
  /** Background color behind the card so semicircular cutouts match cleanly */
  cutoutBackground?: string;
}

/**
 * Transit-ticket perforated horizontal divider with side notches.
 */
export function TicketDivider({ cutoutBackground }: TicketDividerProps) {
  const { palette } = useTheme();
  const notchBg = cutoutBackground ?? palette.background;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.notchLeft,
          { backgroundColor: notchBg, borderColor: palette.border },
        ]}
      />
      <View style={[styles.dashedLine, { borderColor: palette.borderStrong }]} />
      <View
        style={[
          styles.notchRight,
          { backgroundColor: notchBg, borderColor: palette.border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 18,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
    marginHorizontal: -16,
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: 14,
  },
  notchLeft: {
    position: 'absolute',
    left: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  notchRight: {
    position: 'absolute',
    right: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
});
