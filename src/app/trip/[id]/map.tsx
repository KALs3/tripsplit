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
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import { Input } from '../../../components/ui/Input';
import { KeyboardAwareView } from '../../../components/ui/KeyboardAwareView';
import { EXPENSE_CATEGORIES } from '../../../constants/categories';
import { tabularNums } from '../../../constants/typography';
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
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-1 items-center justify-center">
          <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
            Trip not found
          </Text>
          <Button title="Back" onPress={() => router.back()} className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  const debtColor = isDark ? colors.dangerDark : colors.danger;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-hairline dark:border-hairline-dark">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
        >
          <ArrowLeft size={19} color={palette.text} />
        </Pressable>
        <Text className="font-bold text-[17px] tracking-tight text-ink dark:text-ink-dark">
          Trip map
        </Text>
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
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Monochrome Coordinate Map Canvas */}
          <Card className="p-3.5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-bold text-[15px] text-ink dark:text-ink-dark">
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

            <View className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark overflow-hidden">
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
              <View className="mt-3 p-3 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark flex-row items-center gap-2">
                <View className="flex-1">
                  <Text className="font-bold text-[14px] text-ink dark:text-ink-dark">
                    {selectedPlace.name}
                  </Text>
                  <Text
                    style={tabularNums}
                    className="font-sans text-[12px] mt-0.5 text-muted dark:text-muted-dark"
                  >
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
            <Card className="p-4 border-ink dark:border-ink-dark">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-[16px] text-ink dark:text-ink-dark">
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
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {EXPENSE_CATEGORIES.map((c) => {
                  const active = placeCategory === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setPlaceCategory(c.id)}
                      className={`flex-row items-center gap-[5px] px-[11px] py-1.5 rounded-lg border ${
                        active
                          ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                          : 'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark'
                      }`}
                    >
                      <CategoryIcon
                        category={c.id}
                        size={13}
                        color={active ? palette.accentText : palette.text}
                      />
                      <Text
                        className={`font-semibold text-[12px] ${
                          active
                            ? 'text-ink-dark dark:text-ink'
                            : 'text-ink dark:text-ink-dark'
                        }`}
                      >
                        {c.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {gpsError ? (
                <Text className="font-semibold text-[12px] mt-1 text-debt dark:text-debt-dark">
                  {gpsError}
                </Text>
              ) : null}

              <View className="flex-row gap-2.5 mt-2.5">
                <Button
                  title="Cancel"
                  onPress={() => setShowAddForm(false)}
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                />
                <Button
                  title="Save pin"
                  onPress={handleSavePlace}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                />
              </View>
            </Card>
          )}

          {/* Saved Places List */}
          <Text className="font-bold text-[16px] mt-3.5 mb-1.5 text-ink dark:text-ink-dark">
            Saved places
          </Text>
          <Card className="p-0 overflow-hidden">
            {tripPlaces.map((place, idx) => {
              const isSelected = selectedPlace?.id === place.id;
              return (
                <Pressable
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`flex-row items-center px-3.5 py-3 ${
                    isSelected ? 'bg-surface dark:bg-surface-dark' : ''
                  } ${
                    idx < tripPlaces.length - 1
                      ? 'border-b border-hairline dark:border-hairline-dark'
                      : ''
                  }`}
                >
                  <View
                    className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
                      isSelected
                        ? 'bg-ink dark:bg-ink-dark'
                        : 'bg-surface dark:bg-surface-dark'
                    }`}
                  >
                    <CategoryIcon
                      category={place.category}
                      size={16}
                      color={isSelected ? palette.accentText : palette.text}
                    />
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                      {place.name}
                    </Text>
                    {place.note ? (
                      <Text className="font-sans text-[12px] mt-0.5 text-muted dark:text-muted-dark">
                        {place.note}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => deletePlace(place.id)}
                    className="w-8 h-8 rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
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
