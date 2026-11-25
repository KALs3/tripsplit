import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CategoryIcon } from '../../../../components/ui/CategoryIcon';
import { Input } from '../../../../components/ui/Input';
import { KeyboardAwareView } from '../../../../components/ui/KeyboardAwareView';
import { Text } from '../../../../components/ui/Text';
import { TextInput } from '../../../../components/ui/TextInput';
import { EXPENSE_CATEGORIES } from '../../../../constants/categories';
import { tabularNums } from '../../../../constants/typography';
import {
  calculateSplits,
  CURRENCY_METADATA,
  fetchLiveFxRate,
  fromMinorUnits,
  parseQuickExpense,
  SplitValidationError,
  toMinorUnits,
} from '../../../../domain';
import {
  ExpenseCategory,
  SplitInput,
  SplitMethod,
  SplitResult,
} from '../../../../domain/types';
import { useLocale } from '../../../../hooks/useLocale';
import { useTheme } from '../../../../hooks/useTheme';
import { useAppStore } from '../../../../store/useAppStore';

const SPLIT_TABS: SplitMethod[] = ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'];

export default function AddExpenseModal() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const { palette } = useTheme();
  const { t, isRTL, rtlContainerStyle, ltrTextStyle, formatCurrency } = useLocale();

  const trips = useAppStore((s) => s.trips);
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const user = useAppStore((s) => s.user);
  const addExpense = useAppStore((s) => s.addExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);

  const trip = trips.find((t) => t.id === id);
  const editingExpense = expenses.find((e) => e.id === expenseId && !e.deletedAt);
  const tripMembers = useMemo(
    () => members.filter((m) => m.tripId === id),
    [members, id]
  );

  const currentUserId = user?.id || 'user_me';
  const baseCurrency = trip?.baseCurrency || 'USD';

  const [quickInput, setQuickInput] = useState('');
  const [title, setTitle] = useState(() => editingExpense?.title ?? '');
  const [amountText, setAmountText] = useState(() =>
    editingExpense
      ? String(fromMinorUnits(editingExpense.amountMinor, editingExpense.currency))
      : ''
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    () => editingExpense?.receiptUrl ?? null
  );
  const [currency, setCurrency] = useState(
    () => editingExpense?.currency ?? baseCurrency
  );
  const [fxRateText, setFxRateText] = useState(() =>
    editingExpense ? String(editingExpense.fxRateToBase) : '1.0'
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    () => editingExpense?.category ?? 'food'
  );
  const [paidBy, setPaidBy] = useState(
    () =>
      editingExpense?.paidBy ||
      tripMembers.find((m) => m.userId === currentUserId)?.userId ||
      tripMembers[0]?.userId ||
      currentUserId
  );
  const [note, setNote] = useState(() => editingExpense?.note ?? '');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(() =>
    editingExpense ? 'EXACT' : 'EQUAL'
  );

  const [equalParticipants, setEqualParticipants] = useState<string[]>(() =>
    editingExpense
      ? editingExpense.splits.map((s) => s.userId)
      : tripMembers.map((m) => m.userId)
  );
  const [exactTexts, setExactTexts] = useState<Record<string, string>>(() => {
    if (!editingExpense) return {};
    const initial: Record<string, string> = {};
    editingExpense.splits.forEach((s) => {
      initial[s.userId] = String(
        fromMinorUnits(s.shareMinor, editingExpense.currency)
      );
    });
    return initial;
  });
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
      setFormError(t('expenses.errorTitle'));
      return;
    }
    if (totalMinor <= 0) {
      setFormError(t('expenses.errorPositiveAmount'));
      return;
    }

    const fxRate =
      currency === trip.baseCurrency
        ? 1.0
        : Number.parseFloat(fxRateText.replace(',', '.')) || 1.0;

    if (fxRate <= 0) {
      setFormError(t('expenses.errorFxRate'));
      return;
    }

    try {
      const finalSplits = calculateSplits(totalMinor, splitInput, paidBy);
      if (editingExpense) {
        updateExpense({
          ...editingExpense,
          title: title.trim(),
          amountMinor: totalMinor,
          currency,
          fxRateToBase: fxRate,
          category,
          paidBy,
          note: note.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
          splits: finalSplits,
        });
      } else {
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
      }
      router.back();
    } catch (err: any) {
      setFormError(err.message || t('expenses.errorCalc'));
    }
  };

  const handleSelectCurrency = async (nextCurrency: string) => {
    setCurrency(nextCurrency);
    if (!trip || nextCurrency === trip.baseCurrency) {
      setFxRateText('1.0');
      return;
    }
    const liveRate = await fetchLiveFxRate(nextCurrency, trip.baseCurrency);
    if (liveRate) {
      setFxRateText(liveRate.toFixed(4));
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
          setFormError(t('expenses.errorCameraPerm'));
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
      setFormError(t('expenses.errorPicker'));
    }
  };

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
    if (!m) return t('common.member');
    return m.userId === currentUserId ? t('common.you') : m.displayName.split(' ')[0];
  };

  const currSymbol = CURRENCY_METADATA[currency]?.symbol || currency;

  return (
    <SafeAreaView style={rtlContainerStyle} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-hairline dark:border-hairline-dark">
        <Text className="font-bold text-[19px] tracking-tight text-ink dark:text-ink-dark">
          {editingExpense ? t('expenses.editExpense') : t('expenses.logExpense')}
        </Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <X size={21} color={palette.text} />
        </Pressable>
      </View>

      <KeyboardAwareView>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 44 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Amount-First Hero */}
          <Card className="items-center py-[18px] mb-2.5">
            <Text className="font-medium text-[12px] mb-1 text-muted dark:text-muted-dark">
              {t('expenses.amountLabel')} ({currency})
            </Text>
            <View style={{ direction: 'ltr' }} className="flex-row items-center justify-center mb-3.5">
              <Text className="font-bold text-[28px] mr-1 text-muted dark:text-muted-dark">
                {currSymbol}
              </Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={palette.borderStrong}
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={(val) => {
                  setAmountText(val);
                  setFormError('');
                }}
                style={[tabularNums, ltrTextStyle]}
                className="font-bold text-[38px] tracking-tight min-w-[120px] text-center py-0.5 text-ink dark:text-ink-dark"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 8 }}
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'EGP', 'AED', 'SAR', 'CAD'].map((curr) => {
                const selected = currency === curr;
                return (
                  <Pressable
                    key={curr}
                    onPress={() => void handleSelectCurrency(curr)}
                    className={`px-3 py-2 rounded-lg border ${
                      selected
                        ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                        : 'bg-surface dark:bg-surface-dark border-hairline dark:border-hairline-dark'
                    }`}
                  >
                    <Text
                      className={`font-semibold text-[12px] ${
                        selected
                          ? 'text-ink-dark dark:text-ink'
                          : 'text-ink dark:text-ink-dark'
                      }`}
                    >
                      {curr}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>

          {trip && currency !== trip.baseCurrency && (
            <Input
              label={`${t('expenses.fxLabel', { from: currency })} ${trip.baseCurrency}`}
              placeholder="1.0"
              keyboardType="decimal-pad"
              value={fxRateText}
              onChangeText={setFxRateText}
            />
          )}

          {/* Smart Quick-Add Bar */}
          {!editingExpense && (
            <Card className="p-3 mb-2">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Sparkles size={13} color={palette.text} />
                <Text className="font-semibold text-[12px] text-ink dark:text-ink-dark">
                  {t('expenses.quickAddTitle')}
                </Text>
              </View>
              <View className="flex-row gap-2 items-center">
                <TextInput
                  placeholder={t('expenses.quickAddPlaceholder')}
                  placeholderTextColor={palette.textMuted}
                  value={quickInput}
                  onChangeText={setQuickInput}
                  textAlign={isRTL ? 'right' : 'left'}
                  className="flex-1 font-sans text-[13px] rounded-lg px-2.5 h-[38px] bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark"
                />
                <Button title={t('expenses.parse')} onPress={handleQuickParse} variant="primary" size="sm" />
              </View>
            </Card>
          )}

          <Input
            label={t('expenses.titleLabel')}
            placeholder={t('expenses.titlePlaceholder')}
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              setFormError('');
            }}
          />

          <Text className="font-semibold text-[13px] mt-3 mb-1.5 text-ink dark:text-ink-dark">
            {t('expenses.category')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {EXPENSE_CATEGORIES.map((cat) => {
              const selected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  className={`flex-row items-center gap-1.5 px-[11px] py-2 rounded-lg border ${
                    selected
                      ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                      : 'bg-card dark:bg-card-dark border-hairline dark:border-hairline-dark'
                  }`}
                >
                  <CategoryIcon
                    category={cat.id}
                    size={14}
                    color={selected ? palette.accentText : palette.text}
                  />
                  <Text
                    className={`font-semibold text-[12px] ${
                      selected
                        ? 'text-ink-dark dark:text-ink'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    {t(`categories.${cat.id}.shortLabel`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text className="font-semibold text-[13px] mt-3 mb-1.5 text-ink dark:text-ink-dark">
            {t('expenses.paidBy')}
          </Text>
          <View className="flex-row flex-wrap gap-2 py-1">
            {tripMembers.map((member) => {
              const selected = paidBy === member.userId;
              return (
                <Pressable
                  key={member.userId}
                  onPress={() => setPaidBy(member.userId)}
                  className={`px-3 py-2 rounded-lg border ${
                    selected
                      ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                      : 'bg-card dark:bg-card-dark border-hairline dark:border-hairline-dark'
                  }`}
                >
                  <Text
                    className={`font-semibold text-[12px] ${
                      selected
                        ? 'text-ink-dark dark:text-ink'
                        : 'text-ink dark:text-ink-dark'
                    }`}
                  >
                    {getMemberLabel(member.userId)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="font-semibold text-[13px] mt-4 mb-1.5 text-ink dark:text-ink-dark">
            {t('expenses.splitMethod')}
          </Text>
          <View className="flex-row rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-[3px] mb-2">
            {SPLIT_TABS.map((method) => {
              const active = splitMethod === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => setSplitMethod(method)}
                  className={`flex-1 py-2 rounded-[6px] items-center ${
                    active ? 'bg-card dark:bg-card-dark' : ''
                  }`}
                >
                  <Text
                    className={`text-[13px] ${
                      active
                        ? 'font-bold text-ink dark:text-ink-dark'
                        : 'font-medium text-muted dark:text-muted-dark'
                    }`}
                  >
                    {t(`expenses.splitMethods.${method}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card className="p-0 overflow-hidden">
            {splitMethod === 'EXACT' && totalMinor > 0 && (
              <View className="flex-row items-center justify-between px-3.5 py-2.5 border-b border-hairline dark:border-hairline-dark">
                <Text className="font-medium text-[12px] text-muted dark:text-muted-dark flex-1 me-2">
                  {t('expenses.exactSplitHint', {
                    currency,
                    remaining: formatCurrency(totalMinor - exactAllocatedMinor, currency),
                  })}
                </Text>
                <Badge
                  label={formatCurrency(totalMinor - exactAllocatedMinor, currency)}
                  variant={totalMinor - exactAllocatedMinor === 0 ? 'success' : 'danger'}
                />
              </View>
            )}

            {splitMethod === 'PERCENTAGE' && (
              <View className="flex-row items-center justify-between px-3.5 py-2.5 border-b border-hairline dark:border-hairline-dark">
                <Text className="font-medium text-[12px] text-muted dark:text-muted-dark flex-1 me-2">
                  {t('expenses.percentSplitHint', {
                    allocated: percentageAllocated.toFixed(1),
                  })}
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
                  className={`flex-row items-center justify-between px-3.5 py-[11px] ${
                    index < tripMembers.length - 1
                      ? 'border-b border-hairline dark:border-hairline-dark'
                      : ''
                  }`}
                >
                  <View className="flex-1 me-2.5">
                    <Text className="font-semibold text-[14px] text-ink dark:text-ink-dark">
                      {member.displayName}
                    </Text>
                    {previewItem && (
                      <Text
                        style={[tabularNums, ltrTextStyle]}
                        className="font-bold text-[12px] mt-0.5 self-start text-credit dark:text-credit-dark"
                      >
                        {formatCurrency(previewItem.shareMinor, currency)}
                      </Text>
                    )}
                  </View>

                  {splitMethod === 'EQUAL' && (
                    <Pressable
                      onPress={() => toggleEqualParticipant(member.userId)}
                      className={`w-6 h-6 rounded-lg border-[1.5px] items-center justify-center ${
                        isIncludedEqual
                          ? 'bg-ink dark:bg-ink-dark border-ink dark:border-ink-dark'
                          : 'bg-transparent border-hairline-dark/40 dark:border-hairline-dark'
                      }`}
                    >
                      {isIncludedEqual && <Check size={14} color={palette.accentText} />}
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
                      style={[tabularNums, ltrTextStyle]}
                      className="w-[84px] h-9 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-2.5 text-right font-semibold text-[14px] text-ink dark:text-ink-dark"
                    />
                  )}

                  {splitMethod === 'PERCENTAGE' && (
                    <View className="flex-row items-center gap-1.5">
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
                        style={[tabularNums, ltrTextStyle]}
                        className="w-[84px] h-9 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-2.5 text-right font-semibold text-[14px] text-ink dark:text-ink-dark"
                      />
                      <Text className="font-semibold text-[14px] text-muted dark:text-muted-dark">
                        %
                      </Text>
                    </View>
                  )}

                  {splitMethod === 'SHARES' && (
                    <View className="flex-row items-center gap-2.5">
                      <Pressable
                        onPress={() => adjustShareCount(member.userId, -1)}
                        className="w-[30px] h-[30px] rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
                      >
                        <Minus size={14} color={palette.text} />
                      </Pressable>
                      <Text
                        style={[tabularNums, ltrTextStyle]}
                        className="font-bold text-[14px] min-w-[26px] text-center text-ink dark:text-ink-dark"
                      >
                        {memberShares}x
                      </Text>
                      <Pressable
                        onPress={() => adjustShareCount(member.userId, 1)}
                        className="w-[30px] h-[30px] rounded-lg bg-surface dark:bg-surface-dark items-center justify-center"
                      >
                        <Plus size={14} color={palette.text} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {splitPreview.error && (
              <Text className="font-semibold text-[13px] px-3.5 pb-3 pt-2 text-debt dark:text-debt-dark">
                {splitPreview.error}
              </Text>
            )}
          </Card>

          <Input
            label={t('expenses.noteOptional')}
            placeholder={t('expenses.notePlaceholder')}
            value={note}
            onChangeText={setNote}
          />

          <Text className="font-semibold text-[13px] mt-3 mb-1.5 text-ink dark:text-ink-dark">
            {t('expenses.receiptAttachment')}
          </Text>
          {receiptUrl ? (
            <Card className="p-2">
              <Image
                source={{ uri: receiptUrl }}
                className="w-full h-[150px] rounded-lg"
                resizeMode="cover"
              />
              <Button
                title={t('expenses.removePhoto')}
                onPress={() => setReceiptUrl(null)}
                variant="ghost"
                size="sm"
                className="mt-1.5"
              />
            </Card>
          ) : (
            <View className="flex-row gap-2.5">
              <Button
                title={t('expenses.takePhoto')}
                onPress={() => void handlePickReceipt(true)}
                variant="outline"
                size="sm"
                icon={<Camera size={15} color={palette.text} />}
                className="flex-1"
              />
              <Button
                title={t('expenses.upload')}
                onPress={() => void handlePickReceipt(false)}
                variant="outline"
                size="sm"
                icon={<ImageIcon size={15} color={palette.text} />}
                className="flex-1"
              />
            </View>
          )}

          {formError ? (
            <Text className="font-semibold text-[13px] mt-2 text-debt dark:text-debt-dark">
              {formError}
            </Text>
          ) : null}

          <Button
            title={editingExpense ? t('expenses.updateExpense') : t('expenses.saveExpense')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            className="mt-5"
          />
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}
