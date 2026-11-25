import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoverPhotoField } from '../../components/trip/CoverPhotoField';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
import { CURRENCY_METADATA } from '../../domain';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';

export default function NewTripModal() {
  const { palette } = useTheme();

  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [coverUrl, setCoverUrl] = useState('');
  const [error, setError] = useState('');

  const addTrip = useAppStore((s) => s.addTrip);
  const user = useAppStore((s) => s.user);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Enter a trip name.');
      return;
    }

    const newTrip = addTrip({
      name: name.trim(),
      baseCurrency,
      coverUrl: coverUrl.trim(),
      ownerId: user?.id || 'user_me',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null as any,
    });

    router.replace({ pathname: '/trip/[id]', params: { id: newTrip.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[19px] tracking-tight text-ink dark:text-ink-dark">
          Create trip
        </Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Input
            label="Trip name"
            placeholder="Summer in Greece"
            value={name}
            onChangeText={(val) => {
              setName(val);
              setError('');
            }}
            error={error}
          />

          <Text className="font-semibold text-[13px] mt-3.5 mb-1 text-ink dark:text-ink-dark">
            Base currency
          </Text>
          <Text className="font-sans text-[12px] mb-2.5 leading-[17px] text-muted dark:text-muted-dark">
            All expenses and settlements are summarized in this currency.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {['USD', 'EUR', 'GBP', 'EGP', 'JPY', 'CAD'].map((curr) => {
              const isSelected = baseCurrency === curr;
              return (
                <Pressable
                  key={curr}
                  onPress={() => setBaseCurrency(curr)}
                  className={`px-3 py-[9px] rounded-lg border ${
                    isSelected
                      ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                      : 'bg-card dark:bg-card-dark border-hairline dark:border-hairline-dark'
                  }`}
                >
                  <Text
                    className={`font-semibold text-[13px] ${
                      isSelected
                        ? 'text-ink-dark dark:text-ink'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    {curr} ({CURRENCY_METADATA[curr]?.symbol || '$'})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <CoverPhotoField value={coverUrl} onChange={setCoverUrl} />

          <Button
            title="Create trip"
            onPress={handleCreate}
            variant="primary"
            size="lg"
            className="mt-6"
          />
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
