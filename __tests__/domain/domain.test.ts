import {
  calculateNetBalances,
  calculateSplits,
  convertToBaseMinor,
  formatMoney,
  fromMinorUnits,
  getCurrencyDecimals,
  simplifyDebts,
  SplitValidationError,
  toMinorUnits,
} from '../../src/domain';

describe('Financial Math & Minor Units (money.ts)', () => {
  it('correctly maps currency decimals', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(getCurrencyDecimals('JPY')).toBe(0);
    expect(getCurrencyDecimals('KWD')).toBe(3);
  });

  it('converts major to minor units without floating-point drift', () => {
    expect(toMinorUnits(14.99, 'USD')).toBe(1499);
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30); // 0.1 + 0.2 === 0.30000000000000004 in JS
    expect(toMinorUnits(500, 'JPY')).toBe(500);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
  });

  it('converts minor units back to major units', () => {
    expect(fromMinorUnits(1499, 'USD')).toBe(14.99);
    expect(fromMinorUnits(500, 'JPY')).toBe(500);
    expect(fromMinorUnits(1234, 'KWD')).toBe(1.234);
  });

  it('formats minor units accurately into currency strings', () => {
    const formattedUsd = formatMoney(1499, 'USD');
    expect(formattedUsd).toContain('14.99');
  });

  it('converts to base currency with rounding', () => {
    // 100 EUR at rate 1.0825 to USD => 10000 * 1.0825 = 10825 minor units
    expect(convertToBaseMinor(10000, 1.0825)).toBe(10825);
    expect(convertToBaseMinor(10000, 1.0)).toBe(10000);
  });
});

describe('Split Calculations (splits.ts)', () => {
  describe('EQUAL splits', () => {
    it('splits evenly with no remainder', () => {
      const splits = calculateSplits(1000, {
        method: 'EQUAL',
        participants: ['alice', 'bob'],
      });
      expect(splits).toEqual([
        { userId: 'alice', shareMinor: 500 },
        { userId: 'bob', shareMinor: 500 },
      ]);
      expect(splits.reduce((s, p) => s + p.shareMinor, 0)).toBe(1000);
    });

    it('allocates remainder cent deterministically to payer', () => {
      // 1000 cents divided among 3 people => 333, 333, 333 + 1 remainder
      const splits = calculateSplits(
        1000,
        {
          method: 'EQUAL',
          participants: ['alice', 'bob', 'payer_user'],
        },
        'payer_user'
      );

      expect(splits).toEqual([
        { userId: 'payer_user', shareMinor: 334 },
        { userId: 'alice', shareMinor: 333 },
        { userId: 'bob', shareMinor: 333 },
      ]);
      expect(splits.reduce((s, p) => s + p.shareMinor, 0)).toBe(1000);
    });

    it('throws error if participants list is empty', () => {
      expect(() =>
        calculateSplits(1000, { method: 'EQUAL', participants: [] })
      ).toThrow(SplitValidationError);
    });
  });

  describe('EXACT splits', () => {
    it('accepts exact splits that match total', () => {
      const splits = calculateSplits(1500, {
        method: 'EXACT',
        amountsMinor: { alice: 700, bob: 800 },
      });
      expect(splits).toHaveLength(2);
      expect(splits.reduce((s, p) => s + p.shareMinor, 0)).toBe(1500);
    });

    it('throws SplitValidationError if exact splits do not match total', () => {
      expect(() =>
        calculateSplits(1500, {
          method: 'EXACT',
          amountsMinor: { alice: 700, bob: 700 }, // sum 1400 != 1500
        })
      ).toThrow(SplitValidationError);
    });
  });

  describe('PERCENTAGE splits', () => {
    it('adjusts rounding discrepancies to match total', () => {
      // 3-way 33.333% split of 10000 cents ($100)
      const splits = calculateSplits(10000, {
        method: 'PERCENTAGE',
        percentages: {
          alice: 33.33,
          bob: 33.33,
          charlie: 33.34,
        },
      });

      const totalCalculated = splits.reduce((s, p) => s + p.shareMinor, 0);
      expect(totalCalculated).toBe(10000);
    });

    it('throws if percentages do not sum to 100%', () => {
      expect(() =>
        calculateSplits(10000, {
          method: 'PERCENTAGE',
          percentages: { alice: 50, bob: 40 },
        })
      ).toThrow(SplitValidationError);
    });
  });

  describe('SHARES splits', () => {
    it('calculates proportional shares with Largest Remainder distribution', () => {
      // Alice: 2 shares, Bob: 1 share of $10.00 (1000 cents)
      // Alice = 666.666..., Bob = 333.333...
      // Largest remainder gives Alice 667, Bob 333
      const splits = calculateSplits(1000, {
        method: 'SHARES',
        shares: { alice: 2, bob: 1 },
      });

      expect(splits.find((s) => s.userId === 'alice')?.shareMinor).toBe(667);
      expect(splits.find((s) => s.userId === 'bob')?.shareMinor).toBe(333);
      expect(splits.reduce((s, p) => s + p.shareMinor, 0)).toBe(1000);
    });
  });
});

describe('Net Balances & Multi-Currency (balances.ts)', () => {
  it('computes net balances for simple expense and verifies sum is 0', () => {
    const members = ['alice', 'bob', 'charlie'];
    const expenses = [
      {
        id: 'exp1',
        tripId: 'trip1',
        title: 'Dinner',
        amountMinor: 6000, // $60.00
        currency: 'USD',
        fxRateToBase: 1.0,
        paidBy: 'alice',
        splits: [
          { userId: 'alice', shareMinor: 2000 },
          { userId: 'bob', shareMinor: 2000 },
          { userId: 'charlie', shareMinor: 2000 },
        ],
      },
    ];

    const balances = calculateNetBalances(members, expenses, []);

    // Alice paid 6000, owes 2000 => net +4000
    // Bob owes 2000 => net -2000
    // Charlie owes 2000 => net -2000
    expect(balances.get('alice')).toBe(4000);
    expect(balances.get('bob')).toBe(-2000);
    expect(balances.get('charlie')).toBe(-2000);

    const sum = Array.from(balances.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('updates balances when a settlement payment is recorded', () => {
    const members = ['alice', 'bob', 'charlie'];
    const expenses = [
      {
        id: 'exp1',
        tripId: 'trip1',
        title: 'Dinner',
        amountMinor: 6000,
        currency: 'USD',
        fxRateToBase: 1.0,
        paidBy: 'alice',
        splits: [
          { userId: 'alice', shareMinor: 2000 },
          { userId: 'bob', shareMinor: 2000 },
          { userId: 'charlie', shareMinor: 2000 },
        ],
      },
    ];

    // Bob settles his $20 debt directly to Alice
    const payments = [
      {
        id: 'pay1',
        tripId: 'trip1',
        fromUser: 'bob',
        toUser: 'alice',
        amountMinor: 2000,
        currency: 'USD',
        fxRateToBase: 1.0,
      },
    ];

    const balances = calculateNetBalances(members, expenses, payments);

    expect(balances.get('bob')).toBe(0); // Bob is fully settled
    expect(balances.get('alice')).toBe(2000); // Alice still owed 2000 (by Charlie)
    expect(balances.get('charlie')).toBe(-2000);

    const sum = Array.from(balances.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('preserves zero-sum invariant with foreign currency conversion and rounding', () => {
    const members = ['alice', 'bob', 'charlie'];
    // 100.00 EUR split 3 ways at 1.0825 rate
    const expenses = [
      {
        id: 'exp_eur',
        tripId: 'trip1',
        title: 'Paris Museum',
        amountMinor: 10000, // 100.00 EUR
        currency: 'EUR',
        fxRateToBase: 1.0825,
        paidBy: 'alice',
        splits: [
          { userId: 'alice', shareMinor: 3334 },
          { userId: 'bob', shareMinor: 3333 },
          { userId: 'charlie', shareMinor: 3333 },
        ],
      },
    ];

    const balances = calculateNetBalances(members, expenses, []);
    const sum = Array.from(balances.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

describe('Greedy Debt Simplification (debt.ts)', () => {
  it('returns empty transfers if all balances are 0', () => {
    const balances = new Map([
      ['alice', 0],
      ['bob', 0],
    ]);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('resolves circular debt (A owes B, B owes C, C owes A) with 0 transactions', () => {
    // If net balances are 0 for everyone, no transfers are made
    const balances = new Map([
      ['alice', 0],
      ['bob', 0],
      ['charlie', 0],
    ]);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('simplifies a multi-person debt network into at most N - 1 transactions', () => {
    // Alice is owed $40 (+4000)
    // Bob owes $20 (-2000)
    // Charlie owes $20 (-2000)
    const balances = new Map([
      ['alice', 4000],
      ['bob', -2000],
      ['charlie', -2000],
    ]);

    const transfers = simplifyDebts(balances);

    // Guaranteed <= (3 - 1) = 2 transfers
    expect(transfers.length).toBeLessThanOrEqual(2);

    // Verify all debts were settled by transfers
    const simulated = new Map(balances);
    for (const t of transfers) {
      simulated.set(t.fromUser, (simulated.get(t.fromUser) ?? 0) + t.amountMinor);
      simulated.set(t.toUser, (simulated.get(t.toUser) ?? 0) - t.amountMinor);
    }

    for (const [, net] of simulated.entries()) {
      expect(net).toBe(0);
    }
  });

  it('simplifies an asymmetric 5-person group', () => {
    // Invariant: sum of balances = 0
    // Alice: +100
    // Bob: +50
    // Charlie: -70
    // Dave: -50
    // Eve: -30
    const balances = new Map([
      ['alice', 10000],
      ['bob', 5000],
      ['charlie', -7000],
      ['dave', -5000],
      ['eve', -3000],
    ]);

    const transfers = simplifyDebts(balances);

    // Must be at most 5 - 1 = 4 transfers
    expect(transfers.length).toBeLessThanOrEqual(4);

    // Verify all balances are zeroed out after executing transfers
    const remaining = new Map(balances);
    for (const t of transfers) {
      remaining.set(t.fromUser, (remaining.get(t.fromUser) ?? 0) + t.amountMinor);
      remaining.set(t.toUser, (remaining.get(t.toUser) ?? 0) - t.amountMinor);
    }

    for (const [, balance] of remaining) {
      expect(balance).toBe(0);
    }
  });
});
