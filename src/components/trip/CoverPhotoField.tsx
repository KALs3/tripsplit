import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useLocale } from '../../hooks/useLocale';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

export const PRESET_COVERS = [
  {
    id: 'Tokyo' as const,
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
  },
  {
    id: 'Paris' as const,
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  },
  {
    id: 'Greece' as const,
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  },
  {
    id: 'Coast' as const,
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  },
];

interface CoverPhotoFieldProps {
  value: string;
  onChange: (nextUri: string) => void;
}

/**
 * Optional trip cover photo selector supporting device library/camera upload and presets.
 */
export function CoverPhotoField({ value, onChange }: CoverPhotoFieldProps) {
  const { palette } = useTheme();
  const { t } = useLocale();
  const [pickerError, setPickerError] = useState('');

  const handlePickPhoto = async (fromCamera: boolean) => {
    setPickerError('');
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPickerError(t('cover.cameraPermissionError'));
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.75,
        });
        if (!res.canceled && res.assets[0]) {
          onChange(res.assets[0].uri);
        }
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.75,
        });
        if (!res.canceled && res.assets[0]) {
          onChange(res.assets[0].uri);
        }
      }
    } catch {
      setPickerError(t('cover.pickerUnavailable'));
    }
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mt-4 mb-1.5">
        <Text className="font-semibold text-[13px] text-ink dark:text-ink-dark">
          {t('cover.title')}
        </Text>
        <Text className="font-sans text-[12px] text-muted dark:text-muted-dark">
          {t('common.optional')}
        </Text>
      </View>

      {/* Live Preview */}
      <View className="h-[132px] rounded-[12px] overflow-hidden border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark relative items-center justify-center">
        {value ? (
          <>
            <Image
              source={{ uri: value }}
              resizeMode="cover"
              className="absolute inset-0"
            />
            <View className="absolute inset-0 bg-black/25" />
            <Pressable
              onPress={() => onChange('')}
              className="absolute top-2.5 end-2.5 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 active:opacity-80"
              accessibilityLabel={t('cover.removeA11y')}
            >
              <X size={13} color="#FFFFFF" />
              <Text className="font-semibold text-[11px] text-white">
                {t('common.remove')}
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="items-center px-4">
            <ImageIcon size={22} color={palette.textMuted} />
            <Text className="font-medium text-[12px] text-muted dark:text-muted-dark mt-1.5 text-center">
              {t('cover.empty')}
            </Text>
          </View>
        )}
      </View>

      {/* Attach from Device */}
      <View className="flex-row gap-2 mt-2.5">
        <Button
          title={t('cover.choosePhoto')}
          onPress={() => handlePickPhoto(false)}
          variant="secondary"
          size="sm"
          icon={<ImageIcon size={15} color={palette.text} />}
          className="flex-1"
        />
        <Button
          title={t('cover.takePhoto')}
          onPress={() => handlePickPhoto(true)}
          variant="secondary"
          size="sm"
          icon={<Camera size={15} color={palette.text} />}
          className="flex-1"
        />
      </View>

      {pickerError ? (
        <Text className="font-medium text-[12px] text-debt dark:text-debt-dark mt-1.5">
          {pickerError}
        </Text>
      ) : null}

      {/* Quick Presets */}
      <Text className="font-medium text-[11px] text-muted dark:text-muted-dark mt-3 mb-1.5">
        {t('cover.presetsTitle')}
      </Text>
      <View className="flex-row gap-2">
        {PRESET_COVERS.map((item) => {
          const isSelected = value === item.url;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(isSelected ? '' : item.url)}
              className={`flex-1 rounded-lg overflow-hidden items-center pb-1.5 bg-card dark:bg-card-dark ${
                isSelected
                  ? 'border-2 border-ink dark:border-ink-dark'
                  : 'border border-hairline dark:border-hairline-dark'
              }`}
            >
              <Image
                source={{ uri: item.url }}
                resizeMode="cover"
                className="w-full h-[46px] mb-1"
              />
              <Text className="font-medium text-[11px] text-ink dark:text-ink-dark">
                {t(`cover.presets.${item.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
