import {
  computeCategoryBreakdown,
  computeDailySpending,
  computeMemberSpending,
  parseQuickExpense,
} from '../../src/domain';
import { ExpenseRecord } from '../../src/domain/types';

describe('Trip Analytics (analytics.ts)', () => {
  const sampleExpenses: ExpenseRecord[] = [
    {
      id: 'e1',
      tripId: 't1',
      title: 'Ramen',
      amountMinor: 5000,
      currency: 'USD',
      fxRateToBase: 1.0,
      category: 'food',
      paidBy: 'alice',
      spentAt: '2026-11-10T12:00:00Z',
      splits: [
        { userId: 'alice', shareMinor: 2500 },
        { userId: 'bob', shareMinor: 2500 },
      ],
    },
    {
      id: 'e2',
      tripId: 't1',
      title: 'Train',
      amountMinor: 10000,
      currency: 'EUR',
      fxRateToBase: 1.1, // 11000 USD minor units
      category: 'transport',
      paidBy: 'bob',
      spentAt: '2026-11-11T09:00:00Z',
      splits: [
        { userId: 'alice', shareMinor: 5000 },
        { userId: 'bob', shareMinor: 5000 },
      ],
    },
    {
      id: 'e3',
      tripId: 't1',
      title: 'Deleted Expense',
      amountMinor: 99900,
      currency: 'USD',
      fxRateToBase: 1.0,
      category: 'other',
      paidBy: 'alice',
      spentAt: '2026-11-11T10:00:00Z',
      deletedAt: '2026-11-11T11:00:00Z',
      splits: [{ userId: 'alice', shareMinor: 99900 }],
    },
  ];

  it('computes category breakdown ignoring soft-deleted expenses and converting FX', () => {
    const breakdown = computeCategoryBreakdown(sampleExpenses);
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].category).toBe('transport');
    expect(breakdown[0].amountBaseMinor).toBe(11000);
    expect(breakdown[1].category).toBe('food');
    expect(breakdown[1].amountBaseMinor).toBe(5000);

    const totalPct = breakdown.reduce((s, b) => s + b.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 1);
  });

  it('computes per-member paid vs consumed spending', () => {
    const memberSpend = computeMemberSpending(['alice', 'bob'], sampleExpenses);
    const bob = memberSpend.find((m) => m.userId === 'bob');
    const alice = memberSpend.find((m) => m.userId === 'alice');

    expect(bob?.paidBaseMinor).toBe(11000);
    expect(bob?.consumedBaseMinor).toBe(8000); // 2500 + 5500
    expect(alice?.paidBaseMinor).toBe(5000);
    expect(alice?.consumedBaseMinor).toBe(8000);
  });

  it('aggregates daily spending chronologically', () => {
    const daily = computeDailySpending(sampleExpenses);
    expect(daily).toEqual([
      { date: '2026-11-10', amountBaseMinor: 5000 },
      { date: '2026-11-11', amountBaseMinor: 11000 },
    ]);
  });
});

describe('Quick-Add Natural Language Parser (quickAdd.ts)', () => {
  const members = [
    { userId: 'user_me', displayName: 'Alex Rivera' },
    { userId: 'user_kenji', displayName: 'Kenji Sato' },
    { userId: 'user_sarah', displayName: 'Sarah Chen' },
  ];

  it('extracts title, amount, category, and specific participants', () => {
    const parsed = parseQuickExpense(
      'Ramen dinner 48.50 split between me and Kenji',
      members,
      'user_me'
    );

    expect(parsed.title).toBe('Ramen dinner');
    expect(parsed.amountMajor).toBe(48.5);
    expect(parsed.category).toBe('food');
    expect(parsed.paidBy).toBe('user_me');
    expect(parsed.participantIds).toEqual(['user_me', 'user_kenji']);
  });

  it('detects paid by <member> and transport category', () => {
    const parsed = parseQuickExpense(
      'Uber to airport $35 paid by Sarah',
      members,
      'user_me'
    );

    expect(parsed.title).toBe('Uber to airport');
    expect(parsed.amountMajor).toBe(35);
    expect(parsed.category).toBe('transport');
    expect(parsed.paidBy).toBe('user_sarah');
    // Defaults to all members when only one person mentioned as payer
    expect(parsed.participantIds).toHaveLength(3);
  });

  it('parses Arabic numerals, food keywords, and Arabic payer/participant phrases', () => {
    const arMembers = [
      { userId: 'user_me', displayName: 'أحمد' },
      { userId: 'user_sara', displayName: 'سارة' },
      { userId: 'user_omar', displayName: 'عمر' },
    ];
    const parsed = parseQuickExpense(
      'عشاء بحري ٢٤٠.٥٠ بيني وبين سارة دفع عمر',
      arMembers,
      'user_me'
    );

    expect(parsed.title).toBe('عشاء بحري');
    expect(parsed.amountMajor).toBe(240.5);
    expect(parsed.category).toBe('food');
    expect(parsed.paidBy).toBe('user_omar');
    expect(parsed.participantIds).toEqual(['user_me', 'user_sara']);
  });
});
