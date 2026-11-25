import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors } from '../../constants/colors';
import { CURRENCY_METADATA } from '../../domain';
import { useAppStore } from '../../store/useAppStore';

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800', // Tokyo
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', // Paris
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800', // Greece
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', // Beach
];

export default function NewTripModal() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0]);
  const [error, setError] = useState('');

  const addTrip = useAppStore((s) => s.addTrip);
  const user = useAppStore((s) => s.user);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please provide a trip name.');
      return;
    }

    const newTrip = addTrip({
      name: name.trim(),
      baseCurrency,
      coverUrl,
      ownerId: user?.id || 'user_me',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null as any,
    });

    router.replace({ pathname: '/trip/[id]', params: { id: newTrip.id } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>Create New Trip</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Input
          label="Trip Name"
          placeholder="e.g. Summer in Greece 🇬🇷"
          value={name}
          onChangeText={(val) => {
            setName(val);
            setError('');
          }}
          error={error}
        />

        <Text style={[styles.sectionLabel, { color: palette.text }]}>Base Currency</Text>
        <Text style={[styles.sectionHelp, { color: palette.textMuted }]}>
          All individual expenses and final settlements will be converted into this currency.
        </Text>
        <View style={styles.currencyRow}>
          {['USD', 'EUR', 'GBP', 'EGP', 'JPY', 'CAD'].map((curr) => {
            const isSelected = baseCurrency === curr;
            return (
              <Pressable
                key={curr}
                onPress={() => setBaseCurrency(curr)}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? palette.surface
                      : palette.card,
                    borderColor: isSelected ? colors.primary : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyChipText,
                    { color: isSelected ? '#FFFFFF' : palette.text },
                  ]}
                >
                  {curr} ({CURRENCY_METADATA[curr]?.symbol || '$'})
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 18 }]}>
          Trip Cover Photo
        </Text>
        <View style={styles.coverRow}>
          {PRESET_COVERS.map((url, index) => {
            const isSelected = coverUrl === url;
            return (
              <Pressable
                key={index}
                onPress={() => setCoverUrl(url)}
                style={[
                  styles.coverOption,
                  {
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isSelected ? 3 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.coverPlaceholder,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>
                    {index === 0 ? '🗼' : index === 1 ? '🥐' : index === 2 ? '🏛️' : '🏖️'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Create Trip"
          onPress={handleCreate}
          variant="primary"
          size="lg"
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
  },
  sectionHelp: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  coverRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coverOption: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPlaceholder: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
