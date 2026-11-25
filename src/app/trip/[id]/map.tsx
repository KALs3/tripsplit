import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ExternalLink,
  LocateFixed,
  MapPin,
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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { EXPENSE_CATEGORIES, getCategoryMeta } from '../../../constants/categories';
import { colors } from '../../../constants/colors';
import { ExpenseCategory, PlaceRecord } from '../../../domain/types';
import { useAppStore } from '../../../store/useAppStore';

export default function TripMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

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

  // Normalize lat/lng onto a responsive SVG canvas
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
        setGpsError(
          'Location permission denied. Using sample trip coordinates instead.'
        );
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: palette.surface }]}
        >
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Shared Trip Map
        </Text>
        <Button
          title="Pin"
          onPress={() => setShowAddForm(!showAddForm)}
          variant="primary"
          size="sm"
          icon={<Plus size={15} color="#FFFFFF" />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Coordinate Map Canvas */}
        <Card style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <Text style={[styles.mapTitle, { color: palette.text }]}>
              Pinned Spots ({tripPlaces.length})
            </Text>
            <Button
              title={gpsLoading ? 'Locating...' : 'Pin My GPS'}
              onPress={handleCaptureGps}
              loading={gpsLoading}
              variant="outline"
              size="sm"
              icon={<LocateFixed size={14} color={colors.primary} />}
            />
          </View>

          <View
            style={[
              styles.canvasWrap,
              {
                backgroundColor: isDark ? '#0F172A' : '#EFF6FF',
                borderColor: palette.border,
              },
            ]}
          >
            <Svg width="100%" height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
              {/* Subtle Coordinate Grid */}
              {[1, 2, 3].map((i) => (
                <Line
                  key={`h-${i}`}
                  x1="0"
                  y1={(canvasHeight / 4) * i}
                  x2={canvasWidth}
                  y2={(canvasHeight / 4) * i}
                  stroke={isDark ? '#1E293B' : '#DBEAFE'}
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
                  stroke={isDark ? '#1E293B' : '#DBEAFE'}
                  strokeWidth="1"
                />
              ))}

              {/* Route Connector */}
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
                    stroke={colors.primary}
                    strokeOpacity="0.35"
                    strokeDasharray="4,4"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Pin Dots */}
              {plottedPins.map(({ place, x, y }) => {
                const cat = getCategoryMeta(place.category);
                const isSelected = selectedPlace?.id === place.id;
                return (
                  <React.Fragment key={place.id}>
                    {isSelected && (
                      <Circle
                        cx={x}
                        cy={y}
                        r={16}
                        fill={cat.color}
                        fillOpacity="0.22"
                      />
                    )}
                    <Circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 9 : 7}
                      fill={cat.color}
                      stroke="#FFFFFF"
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
                  {getCategoryMeta(selectedPlace.category).emoji} {selectedPlace.name}
                </Text>
                <Text style={[styles.selectedCoords, { color: palette.textMuted }]}>
                  {selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}
                  {selectedPlace.note ? ` • ${selectedPlace.note}` : ''}
                </Text>
              </View>
              <Button
                title="Directions"
                onPress={() => openExternalMaps(selectedPlace)}
                variant="ghost"
                size="sm"
                icon={<ExternalLink size={14} color={colors.primary} />}
              />
            </View>
          )}
        </Card>

        {/* Add Pin Form */}
        {showAddForm && (
          <Card style={[styles.formCard, { borderColor: colors.primary }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: palette.text }]}>
                Add Map Pin
              </Text>
              {coords && (
                <Badge
                  label={`GPS: ${coords.lat}, ${coords.lng}`}
                  variant="success"
                />
              )}
            </View>

            <Input
              label="Place Name"
              placeholder="e.g. Senso-ji Temple"
              value={placeName}
              onChangeText={(val) => {
                setPlaceName(val);
                setGpsError('');
              }}
            />
            <Input
              label="Note (Optional)"
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
                        backgroundColor: active ? colors.primary : palette.surface,
                        borderColor: active ? colors.primary : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? '#FFFFFF' : palette.text,
                      }}
                    >
                      {c.emoji} {c.label.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {gpsError ? <Text style={styles.errorText}>{gpsError}</Text> : null}

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                onPress={() => setShowAddForm(false)}
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
              />
              <Button
                title="Save Pin"
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
          Saved Places
        </Text>
        {tripPlaces.map((place) => {
          const cat = getCategoryMeta(place.category);
          const isSelected = selectedPlace?.id === place.id;
          return (
            <Pressable
              key={place.id}
              onPress={() => setSelectedPlaceId(place.id)}
            >
              <Card
                style={[
                  styles.placeCard,
                  isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                ]}
              >
                <View style={styles.placeRow}>
                  <View
                    style={[styles.pinBadge, { backgroundColor: `${cat.color}20` }]}
                  >
                    <MapPin size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.placeName, { color: palette.text }]}>
                      {cat.emoji} {place.name}
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
                    <Trash2 size={14} color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  mapCard: { padding: 14 },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mapTitle: { fontSize: 15, fontWeight: '700' },
  canvasWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectedBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: { fontSize: 14, fontWeight: '700' },
  selectedCoords: { fontSize: 12, marginTop: 2 },
  formCard: {
    padding: 16,
    borderWidth: 1.5,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: { fontSize: 16, fontWeight: '700' },
  catRow: { gap: 8, paddingVertical: 8 },
  catChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  listHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  placeCard: { padding: 13 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeName: { fontSize: 14, fontWeight: '700' },
  placeNote: { fontSize: 12, marginTop: 2 },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
