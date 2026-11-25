import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyboardAwareView } from '../../components/ui/KeyboardAwareView';
import { fonts } from '../../constants/typography';
import { CURRENCY_METADATA } from '../../domain';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';

const PRESET_COVERS = [
  {
    label: 'Tokyo',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
  },
  {
    label: 'Paris',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  },
  {
    label: 'Greece',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  },
  {
    label: 'Coast',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  },
];

export default function NewTripModal() {
  const { palette } = useTheme();

  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
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
        <Text style={[styles.title, { color: palette.text }]}>Create trip</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
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

          <Text style={[styles.sectionLabel, { color: palette.text }]}>
            Base currency
          </Text>
          <Text style={[styles.sectionHelp, { color: palette.textMuted }]}>
            All expenses and settlements are summarized in this currency.
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
                      backgroundColor: isSelected ? palette.accent : palette.card,
                      borderColor: isSelected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      { color: isSelected ? palette.accentText : palette.text },
                    ]}
                  >
                    {curr} ({CURRENCY_METADATA[curr]?.symbol || '$'})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 18 }]}>
            Cover photo
          </Text>
          <View style={styles.coverRow}>
            {PRESET_COVERS.map((item) => {
              const isSelected = coverUrl === item.url;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => setCoverUrl(item.url)}
                  style={[
                    styles.coverOption,
                    {
                      borderColor: isSelected ? palette.accent : palette.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Image source={{ uri: item.url }} style={styles.coverThumb} />
                  <Text style={[styles.coverLabel, { color: palette.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            title="Create trip"
            onPress={handleCreate}
            variant="primary"
            size="lg"
            style={{ marginTop: 26 }}
          />
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    letterSpacing: -0.3,
  },
  closeBtn: { padding: 4 },
  scroll: { padding: 18, paddingBottom: 40 },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionHelp: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  coverRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  coverOption: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 6,
  },
  coverThumb: {
    width: '100%',
    height: 54,
    marginBottom: 4,
  },
  coverLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
});
