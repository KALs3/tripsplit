import React from 'react';
import { Image, Text, View } from 'react-native';
import { tabularNums } from '../../constants/typography';
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
  ringColor?: string;
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
    <View className="flex-row items-center">
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
            style={sharedStyle}
            className="items-center justify-center bg-surface dark:bg-surface-dark"
          >
            <Text
              style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}
              className="font-bold text-ink dark:text-ink-dark"
            >
              {initials}
            </Text>
          </View>
        );
      })}

      {overflow > 0 &&
        (overflowTextColor ? (
          <Text
            style={[tabularNums, { color: overflowTextColor }]}
            className="font-semibold text-[12px] ml-1.5"
          >
            +{overflow}
          </Text>
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -Math.round(size * 0.28),
              borderWidth: 1.5,
              borderColor: borderCol,
            }}
            className="items-center justify-center bg-ink dark:bg-ink-dark"
          >
            <Text
              style={{ fontSize: Math.max(9, Math.round(size * 0.35)) }}
              className="font-bold text-ink-dark dark:text-ink"
            >
              +{overflow}
            </Text>
          </View>
        ))}
    </View>
  );
}
