import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Check, Image as ImageIcon, Minus, Plus, Sparkles, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { KeyboardAwareView } from '../../../../components/ui/KeyboardAwareView';
import { EXPENSE_CATEGORIES } from '../../../../constants/categories';
import { colors } from '../../../../constants/colors';
import {
  calculateSplits,
  CURRENCY_METADATA,
  formatMoney,
  parseQuickExpense,
  SplitValidationError,
  toMinorUnits,
} from '../../../../domain';
import { ExpenseCategory, SplitInput, SplitMethod, SplitResult } from '../../../../domain/types';
import { useAppStore } from '../../../../store/useAppStore';

const SPLIT_TABS: { id: SplitMethod; label: string }[] = [
  { id: 'EQUAL', label: 'Equal' },
  { id: 'EXACT', label: 'Exact' },
  { id: 'PERCENTAGE', label: '%' },
  { id: 'SHARES', label: 'Shares' },
];

export default function AddExpenseModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const user = useAppStore((s) => s.user);
  const addExpense = useAppStore((s) => s.addExpense);

  const trip = trips.find((t) => t.id === id);
  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const currentUserId = user?.id || 'user_me';
  const baseCurrency = trip?.baseCurrency || 'USD';

  // Form fields
  const [quickInput, setQuickInput] = useState('');
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxRateText, setFxRateText] = useState('1.0');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(
    tripMembers.find((m) => m.userId === currentUserId)?.userId ||
      tripMembers[0]?.userId ||
      currentUserId
  );
  const [note, setNote] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');

  // Split method states
  const [equalParticipants, setEqualParticipants] = useState<string[]>(() =>
    tripMembers.map((m) => m.userId)
  );
  const [exactTexts, setExactTexts] = useState<Record<string, string>>({});
  const [percentageTexts, setPercentageTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (tripMembers.length > 0) {
      const evenPct = (100 / tripMembers.length).toFixed(2);
      tripMembers.forEach((m) => {
        initial[m.userId] = evenPct;
      });
    }
    return initial;
  });
  const [shareCounts, setShareCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    tripMembers.forEach((m) => {
      initial[m.userId] = 1;
    });
    return initial;
  });

  const [formError, setFormError] = useState('');

  const parsedMajorAmount = Number.parseFloat(amountText.replace(',', '.')) || 0;
  const totalMinor = parsedMajorAmount > 0 ? toMinorUnits(parsedMajorAmount, currency) : 0;

  // Build SplitInput from active tab state
  const splitInput = useMemo<SplitInput>(() => {
    switch (splitMethod) {
      case 'EQUAL':
        return { method: 'EQUAL', participants: equalParticipants };
      case 'EXACT': {
        const amountsMinor: Record<string, number> = {};
        tripMembers.forEach((m) => {
          const val = Number.parseFloat((exactTexts[m.userId] || '0').replace(',', '.')) || 0;
          if (val > 0) {
            amountsMinor[m.userId] = toMinorUnits(val, currency);
          }
        });
        return { method: 'EXACT', amountsMinor };
      }
      case 'PERCENTAGE': {
        const percentages: Record<string, number> = {};
        tripMembers.forEach((m) => {
          const val = Number.parseFloat((percentageTexts[m.userId] || '0').replace(',', '.')) || 0;
          if (val > 0) {
            percentages[m.userId] = val;
          }
        });
        return { method: 'PERCENTAGE', percentages };
      }
      case 'SHARES': {
        const shares: Record<string, number> = {};
        tripMembers.forEach((m) => {
          const count = shareCounts[m.userId] ?? 0;
          if (count > 0) {
            shares[m.userId] = count;
          }
        });
        return { method: 'SHARES', shares };
      }
    }
  }, [
    splitMethod,
    equalParticipants,
    exactTexts,
    percentageTexts,
    shareCounts,
    tripMembers,
    currency,
  ]);

  // Live preview computed directly by our domain engine
  const splitPreview = useMemo<{ splits: SplitResult[]; error: string | null }>(() => {
    if (totalMinor <= 0) {
      return { splits: [], error: null };
    }
    try {
      const splits = calculateSplits(totalMinor, splitInput, paidBy);
      return { splits, error: null };
    } catch (err) {
      if (err instanceof SplitValidationError) {
        return { splits: [], error: err.message };
      }
      return { splits: [], error: 'Invalid split configuration.' };
    }
  }, [totalMinor, splitInput, paidBy]);

  const toggleEqualParticipant = (userId: string) => {
    setEqualParticipants((prev) =>
      prev.includes(userId) ? prev.filter((idItem) => idItem !== userId) : [...prev, userId]
    );
  };

  const adjustShareCount = (userId: string, delta: number) => {
    setShareCounts((prev) => ({
      ...prev,
      [userId]: Math.max(0, (prev[userId] ?? 1) + delta),
    }));
  };

  const handleSave = () => {
    if (!trip) return;
    if (!title.trim()) {
      setFormError('Please enter an expense title.');
      return;
    }
    if (totalMinor <= 0) {
      setFormError('Please enter an amount greater than 0.');
      return;
    }

    const fxRate =
      currency === trip.baseCurrency
        ? 1.0
        : Number.parseFloat(fxRateText.replace(',', '.')) || 1.0;

    if (fxRate <= 0) {
      setFormError('Exchange rate must be positive.');
      return;
    }

    try {
      const finalSplits = calculateSplits(totalMinor, splitInput, paidBy);
      addExpense({
        tripId: trip.id,
        title: title.trim(),
        amountMinor: totalMinor,
        currency,
        fxRateToBase: fxRate,
        category,
        paidBy,
        spentAt: new Date().toISOString(),
        note: note.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        splits: finalSplits,
      });
      router.back();
    } catch (err: any) {
      setFormError(err.message || 'Could not calculate splits.');
    }
  };

  const handleQuickParse = () => {
    if (!quickInput.trim()) return;
    const parsed = parseQuickExpense(quickInput, tripMembers, currentUserId);
    setTitle(parsed.title);
    if (parsed.amountMajor) {
      setAmountText(String(parsed.amountMajor));
    }
    setCategory(parsed.category);
    setPaidBy(parsed.paidBy);
    setSplitMethod('EQUAL');
    setEqualParticipants(parsed.participantIds);
    setFormError('');
  };

  const handlePickReceipt = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setFormError('Camera permission is needed to snap a receipt.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!res.canceled && res.assets[0]) {
          setReceiptUrl(res.assets[0].uri);
        }
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!res.canceled && res.assets[0]) {
          setReceiptUrl(res.assets[0].uri);
        }
      }
    } catch {
      setFormError('Receipt picker is unavailable on this simulator.');
    }
  };

  // Remaining indicators for Exact & Percentage modes
  const exactAllocatedMinor = useMemo(() => {
    return tripMembers.reduce((sum, m) => {
      const val = Number.parseFloat((exactTexts[m.userId] || '0').replace(',', '.')) || 0;
      return sum + toMinorUnits(val, currency);
    }, 0);
  }, [exactTexts, tripMembers, currency]);

  const percentageAllocated = useMemo(() => {
    return tripMembers.reduce((sum, m) => {
      const val = Number.parseFloat((percentageTexts[m.userId] || '0').replace(',', '.')) || 0;
      return sum + val;
    }, 0);
  }, [percentageTexts, tripMembers]);

  const getMemberLabel = (userId: string) => {
    const m = tripMembers.find((member) => member.userId === userId);
    if (!m) return 'Member';
    return m.userId === currentUserId ? 'You' : m.displayName.split(' ')[0];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Add Expense</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Smart Quick-Add Bar */}
          <Card
            style={{
              padding: 12,
              marginBottom: 14,
              borderColor: isDark ? colors.primaryDark : colors.primaryLight,
              borderWidth: 1.5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                Quick-Add Helper
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                placeholder='e.g. "Ramen 48 split between me and Kenji"'
                placeholderTextColor={palette.textMuted}
                value={quickInput}
                onChangeText={setQuickInput}
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: palette.text,
                  backgroundColor: palette.surface,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  height: 38,
                }}
              />
              <Button title="Fill" onPress={handleQuickParse} variant="primary" size="sm" />
            </View>
          </Card>

          {/* Basic Details */}
          <Input
            label="What was this for?"
            placeholder="e.g. Sushi Dinner, Airport Taxi"
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              setFormError('');
            }}
          />

          <View style={styles.amountCurrencyRow}>
            <View style={{ flex: 1 }}>
              <Input
                label={`Amount (${CURRENCY_METADATA[currency]?.symbol || currency})`}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={(val) => {
                  setAmountText(val);
                  setFormError('');
                }}
              />
            </View>
          </View>

          {/* Currency Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {['USD', 'EUR', 'GBP', 'JPY', 'EGP', 'CAD'].map((curr) => {
              const selected = currency === curr;
              return (
                <Pressable
                  key={curr}
                  onPress={() => setCurrency(curr)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : palette.card,
                      borderColor: selected ? colors.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {curr}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {trip && currency !== trip.baseCurrency && (
            <Input
              label={`Exchange Rate (1 ${currency} → ${trip.baseCurrency})`}
              placeholder="1.0"
              keyboardType="decimal-pad"
              value={fxRateText}
              onChangeText={setFxRateText}
            />
          )}

          {/* Category Picker */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {EXPENSE_CATEGORIES.map((cat) => {
              const selected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : palette.card,
                      borderColor: selected ? colors.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {cat.emoji} {cat.label.split(' ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Paid By Selector */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Paid by</Text>
          <View style={styles.payerRow}>
            {tripMembers.map((member) => {
              const selected = paidBy === member.userId;
              return (
                <Pressable
                  key={member.userId}
                  onPress={() => setPaidBy(member.userId)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : palette.card,
                      borderColor: selected ? colors.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {getMemberLabel(member.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Split Method Tabs */}
          <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 18 }]}>
            Split Method
          </Text>
          <View
            style={[
              styles.segmentedControl,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {SPLIT_TABS.map((tab) => {
              const active = splitMethod === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setSplitMethod(tab.id)}
                  style={[
                    styles.segmentBtn,
                    active && { backgroundColor: palette.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: active ? colors.primary : palette.textMuted,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Split Details Card */}
          <Card style={styles.splitCard}>
            {splitMethod === 'EXACT' && totalMinor > 0 && (
              <View style={styles.statusBanner}>
                <Text style={[styles.statusText, { color: palette.textMuted }]}>
                  Remaining to allocate:
                </Text>
                <Badge
                  label={formatMoney(totalMinor - exactAllocatedMinor, currency)}
                  variant={totalMinor - exactAllocatedMinor === 0 ? 'success' : 'danger'}
                />
              </View>
            )}

            {splitMethod === 'PERCENTAGE' && (
              <View style={styles.statusBanner}>
                <Text style={[styles.statusText, { color: palette.textMuted }]}>
                  Allocated total:
                </Text>
                <Badge
                  label={`${percentageAllocated.toFixed(1)}% / 100%`}
                  variant={Math.abs(percentageAllocated - 100) <= 0.01 ? 'success' : 'danger'}
                />
              </View>
            )}

            {tripMembers.map((member, index) => {
              const previewItem = splitPreview.splits.find(
                (s) => s.userId === member.userId
              );
              const isIncludedEqual = equalParticipants.includes(member.userId);
              const memberShares = shareCounts[member.userId] ?? 0;

              return (
                <View
                  key={member.userId}
                  style={[
                    styles.memberSplitRow,
                    index < tripMembers.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.memberNameWrap}>
                    <Text style={[styles.memberName, { color: palette.text }]}>
                      {member.displayName}
                    </Text>
                    {previewItem && (
                      <Text style={[styles.previewShare, { color: colors.primary }]}>
                        {formatMoney(previewItem.shareMinor, currency)}
                      </Text>
                    )}
                  </View>

                  {splitMethod === 'EQUAL' && (
                    <Pressable
                      onPress={() => toggleEqualParticipant(member.userId)}
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: isIncludedEqual
                            ? colors.primary
                            : 'transparent',
                          borderColor: isIncludedEqual
                            ? colors.primary
                            : palette.borderStrong,
                        },
                      ]}
                    >
                      {isIncludedEqual && <Check size={14} color="#FFFFFF" />}
                    </Pressable>
                  )}

                  {splitMethod === 'EXACT' && (
                    <TextInput
                      placeholder="0.00"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="decimal-pad"
                      value={exactTexts[member.userId] || ''}
                      onChangeText={(val) =>
                        setExactTexts((prev) => ({ ...prev, [member.userId]: val }))
                      }
                      style={[
                        styles.inlineInput,
                        {
                          color: palette.text,
                          borderColor: palette.border,
                          backgroundColor: palette.surface,
                        },
                      ]}
                    />
                  )}

                  {splitMethod === 'PERCENTAGE' && (
                    <View style={styles.pctWrap}>
                      <TextInput
                        placeholder="0"
                        placeholderTextColor={palette.textMuted}
                        keyboardType="decimal-pad"
                        value={percentageTexts[member.userId] || ''}
                        onChangeText={(val) =>
                          setPercentageTexts((prev) => ({
                            ...prev,
                            [member.userId]: val,
                          }))
                        }
                        style={[
                          styles.inlineInput,
                          {
                            color: palette.text,
                            borderColor: palette.border,
                            backgroundColor: palette.surface,
                          },
                        ]}
                      />
                      <Text style={[styles.unitText, { color: palette.textMuted }]}>%</Text>
                    </View>
                  )}

                  {splitMethod === 'SHARES' && (
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => adjustShareCount(member.userId, -1)}
                        style={[styles.stepBtn, { backgroundColor: palette.surface }]}
                      >
                        <Minus size={14} color={palette.text} />
                      </Pressable>
                      <Text style={[styles.shareCountText, { color: palette.text }]}>
                        {memberShares}x
                      </Text>
                      <Pressable
                        onPress={() => adjustShareCount(member.userId, 1)}
                        style={[styles.stepBtn, { backgroundColor: palette.surface }]}
                      >
                        <Plus size={14} color={palette.text} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {splitPreview.error && (
              <Text style={styles.errorText}>{splitPreview.error}</Text>
            )}
          </Card>

          <Input
            label="Note (Optional)"
            placeholder="Add receipt details or context..."
            value={note}
            onChangeText={setNote}
          />

          {/* Receipt Photo Attachment */}
          <Text style={[styles.sectionLabel, { color: palette.text }]}>
            Receipt Photo (Optional)
          </Text>
          {receiptUrl ? (
            <Card style={{ padding: 10 }}>
              <Image
                source={{ uri: receiptUrl }}
                style={{ width: '100%', height: 150, borderRadius: 10 }}
                resizeMode="cover"
              />
              <Button
                title="Remove Receipt"
                onPress={() => setReceiptUrl(null)}
                variant="ghost"
                size="sm"
                style={{ marginTop: 8 }}
              />
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Snap Receipt"
                onPress={() => void handlePickReceipt(true)}
                variant="outline"
                size="sm"
                icon={<Camera size={15} color={colors.primary} />}
                style={{ flex: 1 }}
              />
              <Button
                title="Choose Photo"
                onPress={() => void handlePickReceipt(false)}
                variant="outline"
                size="sm"
                icon={<ImageIcon size={15} color={colors.primary} />}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <Button
            title="Save Expense"
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={{ marginTop: 18 }}
          />
        </ScrollView>
      </KeyboardAwareView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    padding: 18,
    paddingBottom: 44,
  },
  amountCurrencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 6,
  },
  payerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  splitCard: {
    padding: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  memberNameWrap: {
    flex: 1,
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewShare: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInput: {
    width: 84,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
  },
  pctWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCountText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
