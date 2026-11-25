import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ExternalLink,
  LocateFixed,
  Plus,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { EXPENSE_CATEGORIES } from '../../../constants/categories';
import { fonts, tabularNums } from '../../../constants/typography';
import { ExpenseCategory, PlaceRecord } from '../../../domain/types';
import { useTheme } from '../../../hooks/useTheme';
import { useAppStore } from '../../../store/useAppStore';

export default function TripMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, palette, colors } = useTheme();

  const trips = useAppStore((s) => s.trips);
  const places = useAppStore((s) => s.places);
  const user = useAppStore((s) => s.user);
  const addPlace = useAppStore((s) => s.addPlace);
  const deletePlace = useAppStore((s) => s.deletePlace);

  const trip = trips.find((t) => t.id === id);
  const currentUserId = user?.id || 'user_me';

  const tripPlaces = useMemo(
    () => places.filter((p) => p.tripId === id),
    [places, id]
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    tripPlaces[0]?.id ?? null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [placeNote, setPlaceNote] = useState('');
  const [placeCategory, setPlaceCategory] = useState<ExpenseCategory>('food');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const selectedPlace =
    tripPlaces.find((p) => p.id === selectedPlaceId) ?? tripPlaces[0] ?? null;

  const canvasWidth = 320;
  const canvasHeight = 190;
  const pad = 28;

  const plottedPins = useMemo(() => {
    if (tripPlaces.length === 0) return [];
    const lats = tripPlaces.map((p) => p.lat);
    const lngs = tripPlaces.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.02;
    const lngSpan = maxLng - minLng || 0.02;

    return tripPlaces.map((p) => {
      const x =
        tripPlaces.length === 1
          ? canvasWidth / 2
          : pad + ((p.lng - minLng) / lngSpan) * (canvasWidth - pad * 2);
      const y =
        tripPlaces.length === 1
          ? canvasHeight / 2
          : pad + (1 - (p.lat - minLat) / latSpan) * (canvasHeight - pad * 2);

      return { place: p, x, y };
    });
  }, [tripPlaces]);

  const handleCaptureGps = async () => {
    setGpsError('');
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission denied. Using sample trip coordinates.');
        setCoords({ lat: 35.6595, lng: 139.7004 });
        setShowAddForm(true);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: Number(loc.coords.latitude.toFixed(4)),
        lng: Number(loc.coords.longitude.toFixed(4)),
      });
      setShowAddForm(true);
    } catch {
      setGpsError('GPS unavailable on this device. Using default coordinates.');
      setCoords({ lat: 35.6595, lng: 139.7004 });
      setShowAddForm(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSavePlace = () => {
    if (!trip) return;
    if (!placeName.trim()) {
      setGpsError('Enter a place name.');
      return;
    }

    const baseCoords = coords ?? {
      lat: 35.66 + (Math.random() - 0.5) * 0.03,
      lng: 139.75 + (Math.random() - 0.5) * 0.03,
    };

    const created = addPlace({
      tripId: trip.id,
      name: placeName.trim(),
      lat: baseCoords.lat,
      lng: baseCoords.lng,
      category: placeCategory,
      note: placeNote.trim() || undefined,
      createdBy: currentUserId,
    });

    setSelectedPlaceId(created.id);
    setPlaceName('');
    setPlaceNote('');
    setCoords(null);
    setShowAddForm(false);
    setGpsError('');
  };

  const openExternalMaps = (place: PlaceRecord) => {
    const query = encodeURIComponent(place.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${place.lat},${place.lng}&q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    void Linking.openURL(url);
  };

  if (!trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: palette.text }]}>Trip not found</Text>
          <Button title="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const debtColor = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Trip map</Text>
        <Button
          title="Pin"
          onPress={() => setShowAddForm(!showAddForm)}
          variant="primary"
          size="sm"
          icon={<Plus size={15} color={palette.accentText} />}
        />
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Monochrome Coordinate Map Canvas */}
          <Card style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <Text style={[styles.mapTitle, { color: palette.text }]}>
                Pinned spots ({tripPlaces.length})
              </Text>
              <Button
                title={gpsLoading ? 'Locating...' : 'Pin GPS'}
                onPress={handleCaptureGps}
                loading={gpsLoading}
                variant="outline"
                size="sm"
                icon={<LocateFixed size={14} color={palette.text} />}
              />
            </View>

            <View
              style={[
                styles.canvasWrap,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Svg
                width="100%"
                height={canvasHeight}
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                {[1, 2, 3].map((i) => (
                  <Line
                    key={`h-${i}`}
                    x1="0"
                    y1={(canvasHeight / 4) * i}
                    x2={canvasWidth}
                    y2={(canvasHeight / 4) * i}
                    stroke={palette.border}
                    strokeWidth="1"
                  />
                ))}
                {[1, 2, 3, 4].map((i) => (
                  <Line
                    key={`v-${i}`}
                    x1={(canvasWidth / 5) * i}
                    y1="0"
                    x2={(canvasWidth / 5) * i}
                    y2={canvasHeight}
                    stroke={palette.border}
                    strokeWidth="1"
                  />
                ))}

                {plottedPins.map((pin, idx) => {
                  if (idx === 0) return null;
                  const prev = plottedPins[idx - 1];
                  return (
                    <Line
                      key={`path-${pin.place.id}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={pin.x}
                      y2={pin.y}
                      stroke={palette.textMuted}
                      strokeOpacity="0.45"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {plottedPins.map(({ place, x, y }) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <React.Fragment key={place.id}>
                      {isSelected && (
                        <Circle
                          cx={x}
                          cy={y}
                          r={15}
                          fill={palette.text}
                          fillOpacity="0.16"
                        />
                      )}
                      <Circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 8 : 6}
                        fill={isSelected ? palette.text : palette.textMuted}
                        stroke={palette.card}
                        strokeWidth="2"
                        onPress={() => setSelectedPlaceId(place.id)}
                      />
                    </React.Fragment>
                  );
                })}

                {tripPlaces.length === 0 && (
                  <Rect x="0" y="0" width="0" height="0" />
                )}
              </Svg>
            </View>

            {selectedPlace && (
              <View
                style={[
                  styles.selectedBanner,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedTitle, { color: palette.text }]}>
                    {selectedPlace.name}
                  </Text>
                  <Text style={[styles.selectedCoords, tabularNums, { color: palette.textMuted }]}>
                    {selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}
                    {selectedPlace.note ? `  ${selectedPlace.note}` : ''}
                  </Text>
                </View>
                <Button
                  title="Directions"
                  onPress={() => openExternalMaps(selectedPlace)}
                  variant="outline"
                  size="sm"
                  icon={<ExternalLink size={13} color={palette.text} />}
                />
              </View>
            )}
          </Card>

          {/* Add Pin Form */}
          {showAddForm && (
            <Card style={[styles.formCard, { borderColor: palette.text }]}>
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: palette.text }]}>
                  Add map pin
                </Text>
                {coords && (
                  <Badge
                    label={`${coords.lat}, ${coords.lng}`}
                    variant="success"
                  />
                )}
              </View>

              <Input
                label="Place name"
                placeholder="Senso-ji Temple"
                value={placeName}
                onChangeText={(val) => {
                  setPlaceName(val);
                  setGpsError('');
                }}
              />
              <Input
                label="Note (optional)"
                placeholder="Great spot for sunset photos"
                value={placeNote}
                onChangeText={setPlaceNote}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
              >
                {EXPENSE_CATEGORIES.map((c) => {
                  const active = placeCategory === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setPlaceCategory(c.id)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: active ? palette.accent : palette.surface,
                          borderColor: active ? palette.accent : palette.border,
                        },
                      ]}
                    >
                      <CategoryIcon
                        category={c.id}
                        size={13}
                        color={active ? palette.accentText : palette.text}
                      />
                      <Text
                        style={{
                          fontFamily: fonts.semibold,
                          fontSize: 12,
                          color: active ? palette.accentText : palette.text,
                        }}
                      >
                        {c.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {gpsError ? (
                <Text style={[styles.errorText, { color: debtColor }]}>{gpsError}</Text>
              ) : null}

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAddForm(false)}
                  variant="ghost"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save pin"
                  onPress={handleSavePlace}
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}

          {/* Saved Places List */}
          <Text style={[styles.listHeading, { color: palette.text }]}>
            Saved places
          </Text>
          <Card style={styles.placesListCard}>
            {tripPlaces.map((place, idx) => {
              const isSelected = selectedPlace?.id === place.id;
              return (
                <Pressable
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  style={[
                    styles.placeRow,
                    isSelected && { backgroundColor: palette.surface },
                    idx < tripPlaces.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pinBadge,
                      {
                        backgroundColor: isSelected ? palette.accent : palette.surface,
                      },
                    ]}
                  >
                    <CategoryIcon
                      category={place.category}
                      size={16}
                      color={isSelected ? palette.accentText : palette.text}
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.placeName, { color: palette.text }]}>
                      {place.name}
                    </Text>
                    {place.note ? (
                      <Text style={[styles.placeNote, { color: palette.textMuted }]}>
                        {place.note}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => deletePlace(place.id)}
                    style={[styles.trashBtn, { backgroundColor: palette.surface }]}
                    accessibilityLabel={`Delete ${place.name}`}
                  >
                    <Trash2 size={14} color={debtColor} />
                  </Pressable>
                </Pressable>
              );
            })}
          </Card>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: fonts.bold, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  mapCard: { padding: 14 },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mapTitle: { fontFamily: fonts.bold, fontSize: 15 },
  canvasWrap: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectedBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: { fontFamily: fonts.bold, fontSize: 14 },
  selectedCoords: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  formCard: { padding: 16 },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: { fontFamily: fonts.bold, fontSize: 16 },
  catRow: { gap: 8, paddingVertical: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  errorText: { fontFamily: fonts.semibold, fontSize: 12, marginTop: 4 },
  listHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  placesListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pinBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeName: { fontFamily: fonts.semibold, fontSize: 14 },
  placeNote: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
