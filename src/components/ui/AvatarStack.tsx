import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fonts, tabularNums } from '../../constants/typography';
import { useTheme } from '../../hooks/useTheme';

export interface AvatarPerson {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

interface AvatarStackProps {
  members: AvatarPerson[];
  maxVisible?: number;
  size?: number;
  /** Border color separating overlapping avatars */
  ringColor?: string;
  /** Optional text color for "+N" overflow label rendered beside the stack */
  overflowTextColor?: string;
}

/**
 * Overlapping circular member avatars with monochrome monogram fallbacks.
 */
export function AvatarStack({
  members,
  maxVisible = 3,
  size = 26,
  ringColor,
  overflowTextColor,
}: AvatarStackProps) {
  const { palette } = useTheme();
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;
  const borderCol = ringColor ?? palette.card;

  return (
    <View style={styles.row}>
      {visible.map((member, index) => {
        const initials = member.displayName
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        const sharedStyle = {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: index === 0 ? 0 : -Math.round(size * 0.28),
          borderWidth: 1.5,
          borderColor: borderCol,
        };

        return member.avatarUrl ? (
          <Image
            key={member.userId}
            source={{ uri: member.avatarUrl }}
            style={sharedStyle}
          />
        ) : (
          <View
            key={member.userId}
            style={[
              sharedStyle,
              styles.fallback,
              { backgroundColor: palette.surface },
            ]}
          >
            <Text
              style={[
                styles.initials,
                { color: palette.text, fontSize: Math.max(9, Math.round(size * 0.36)) },
              ]}
            >
              {initials}
            </Text>
          </View>
        );
      })}

      {overflow > 0 && (
        overflowTextColor ? (
          <Text
            style={[
              styles.overflowText,
              tabularNums,
              { color: overflowTextColor },
            ]}
          >
            +{overflow}
          </Text>
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: -Math.round(size * 0.28),
                borderWidth: 1.5,
                borderColor: borderCol,
                backgroundColor: palette.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.initials,
                {
                  color: palette.accentText,
                  fontSize: Math.max(9, Math.round(size * 0.35)),
                },
              ]}
            >
              +{overflow}
            </Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bold,
  },
  overflowText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    marginLeft: 6,
  },
});
