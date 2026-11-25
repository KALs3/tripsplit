import { router, useLocalSearchParams } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoverPhotoField } from '../../../components/trip/CoverPhotoField';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripSettingsModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const deleteTrip = useAppStore((s) => s.deleteTrip);

  const trip = trips.find((t) => t.id === id);

  const [name, setName] = useState(() => trip?.name ?? '');
  const [coverUrl, setCoverUrl] = useState(() => trip?.coverUrl ?? '');
  const [nameError, setNameError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            Trip not found
          </Text>
          <Button
            title="Back to trips"
            onPress={() => router.replace('/(tabs)/trips')}
            className="mt-3"
          />
        </View>
      </SafeAreaView>
    );
  }

  const debtColor = isDark ? colors.dangerDark : colors.danger;

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Enter a trip name.');
      return;
    }
    updateTrip(trip.id, {
      name: name.trim(),
      coverUrl: coverUrl.trim(),
    });
    router.back();
  };

  const handleConfirmDelete = () => {
    deleteTrip(trip.id);
    router.replace('/(tabs)/trips');
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[19px] tracking-tight text-ink dark:text-ink-dark">
          Trip settings
        </Text>
        <Pressable onPress={() => router.back()} className="p-1" accessibilityLabel="Close settings">
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Input
            label="Trip name"
            placeholder="Trip name"
            value={name}
            onChangeText={(val) => {
              setName(val);
              setNameError('');
            }}
            error={nameError}
          />

          <CoverPhotoField value={coverUrl} onChange={setCoverUrl} />

          <Button
            title="Save changes"
            onPress={handleSave}
            variant="primary"
            size="lg"
            className="mt-6"
          />

          {/* Danger Zone: Delete Trip */}
          <Card className="mt-7 p-4 border-debt/30 dark:border-debt-dark/30">
            <Text className="font-bold text-[15px] text-ink dark:text-ink-dark">
              Delete trip
            </Text>
            <Text className="font-sans text-[13px] leading-[18px] text-muted dark:text-muted-dark mt-1">
              Permanently remove this trip along with its expenses, settlements, and map pins.
            </Text>

            {confirmingDelete ? (
              <View className="mt-3.5 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-hairline dark:border-hairline-dark">
                <Text className="font-semibold text-[13px] text-ink dark:text-ink-dark mb-3">
                  Delete &ldquo;{trip.name}&rdquo;? This cannot be undone.
                </Text>
                <View className="flex-row gap-2.5">
                  <Button
                    title="Cancel"
                    onPress={() => setConfirmingDelete(false)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  />
                  <Button
                    title="Delete permanently"
                    onPress={handleConfirmDelete}
                    variant="danger"
                    size="sm"
                    className="flex-1"
                  />
                </View>
              </View>
            ) : (
              <Button
                title="Delete trip"
                onPress={() => setConfirmingDelete(true)}
                variant="danger"
                size="md"
                icon={<Trash2 size={16} color={debtColor} />}
                className="mt-3.5"
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
