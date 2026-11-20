import { SplitInput, SplitResult } from './types';

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitValidationError';
  }
}

/**
 * Calculates individual participant splits for an expense.
 * Guarantees that the sum of split amounts EXACTLY equals totalMinor.
 * Any remainder pennies/minor units from division are deterministically allocated.
 *
 * @param totalMinor Total expense amount in minor units (integer >= 0)
 * @param input Split configuration (Equal, Exact, Percentage, Shares)
 * @param payerId Optional user id of the person who paid (can be prioritized for remainder)
 */
export function calculateSplits(
  totalMinor: number,
  input: SplitInput,
  payerId?: string
): SplitResult[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new SplitValidationError(`Total amount must be a non-negative integer, got ${totalMinor}`);
  }

  switch (input.method) {
    case 'EQUAL': {
      const participants = Array.from(new Set(input.participants));
      const count = participants.length;

      if (count === 0) {
        throw new SplitValidationError('Equal split requires at least one participant.');
      }

      if (totalMinor === 0) {
        return participants.map((userId) => ({ userId, shareMinor: 0 }));
      }

      const baseShare = Math.floor(totalMinor / count);
      const remainder = totalMinor % count;

      // Deterministic remainder distribution:
      // If payer is among participants, give the first leftover minor unit to payer,
      // then to subsequent sorted participants until remainder is exhausted.
      const sortedParticipants = [...participants].sort((a, b) => {
        if (payerId && a === payerId) return -1;
        if (payerId && b === payerId) return 1;
        return a.localeCompare(b);
      });

      const results: SplitResult[] = sortedParticipants.map((userId, idx) => ({
        userId,
        shareMinor: baseShare + (idx < remainder ? 1 : 0),
      }));

      validateSum(results, totalMinor);
      return results;
    }

    case 'EXACT': {
      const entries = Object.entries(input.amountsMinor);
      if (entries.length === 0) {
        throw new SplitValidationError('Exact split requires at least one participant.');
      }

      let sum = 0;
      const results: SplitResult[] = [];

      for (const [userId, shareMinor] of entries) {
        if (!Number.isInteger(shareMinor) || shareMinor < 0) {
          throw new SplitValidationError(
            `Share for user ${userId} must be a non-negative integer, got ${shareMinor}`
          );
        }
        sum += shareMinor;
        results.push({ userId, shareMinor });
      }

      if (sum !== totalMinor) {
        throw new SplitValidationError(
          `Sum of exact splits (${sum}) does not equal total amount (${totalMinor}). Difference: ${
            totalMinor - sum
          }`
        );
      }

      return results;
    }

    case 'PERCENTAGE': {
      const entries = Object.entries(input.percentages);
      if (entries.length === 0) {
        throw new SplitValidationError('Percentage split requires at least one participant.');
      }

      // Sum of percentages must equal 100 within a tiny epsilon for float typing
      const totalPct = entries.reduce((acc, [, pct]) => acc + pct, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        throw new SplitValidationError(
          `Percentages must sum to 100%, currently sums to ${totalPct}%`
        );
      }

      // Sort by percentage descending so rounding adjustments happen on largest holders
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);

      let allocatedMinor = 0;
      const preliminary: { userId: string; shareMinor: number; pct: number }[] = [];

      for (const [userId, pct] of sorted) {
        if (pct < 0) {
          throw new SplitValidationError(`Percentage cannot be negative: user ${userId}`);
        }
        const share = Math.round((pct / 100) * totalMinor);
        allocatedMinor += share;
        preliminary.push({ userId, shareMinor: share, pct });
      }

      // Adjust rounding discrepancy (e.g. 33.33% of 100 cents = 33 + 33 + 33 = 99 -> diff of +1)
      const diff = totalMinor - allocatedMinor;
      if (diff !== 0 && preliminary.length > 0) {
        // Distribute 1 unit adjustments to the top contributors
        const sign = diff > 0 ? 1 : -1;
        let remainingDiff = Math.abs(diff);
        let idx = 0;
        while (remainingDiff > 0 && idx < preliminary.length) {
          preliminary[idx].shareMinor += sign;
          remainingDiff -= 1;
          idx++;
        }
      }

      const results = preliminary.map(({ userId, shareMinor }) => ({ userId, shareMinor }));
      validateSum(results, totalMinor);
      return results;
    }

    case 'SHARES': {
      const entries = Object.entries(input.shares);
      if (entries.length === 0) {
        throw new SplitValidationError('Shares split requires at least one participant.');
      }

      let totalShares = 0;
      for (const [userId, share] of entries) {
        if (!Number.isInteger(share) || share <= 0) {
          throw new SplitValidationError(
            `Share for user ${userId} must be a positive integer, got ${share}`
          );
        }
        totalShares += share;
      }

      // Compute base shares and fractional remainders
      // We use the Largest Remainder Method (Hamilton-Hare method)
      const computed: { userId: string; shareMinor: number; fractionalRemainder: number }[] = [];
      let allocated = 0;

      for (const [userId, share] of entries) {
        const exactFraction = (share / totalShares) * totalMinor;
        const integerPart = Math.floor(exactFraction);
        const fractionalPart = exactFraction - integerPart;

        allocated += integerPart;
        computed.push({
          userId,
          shareMinor: integerPart,
          fractionalRemainder: fractionalPart,
        });
      }

      let remaining = totalMinor - allocated;
      // Sort by largest fractional remainder descending
      computed.sort((a, b) => b.fractionalRemainder - a.fractionalRemainder);

      for (let i = 0; i < remaining; i++) {
        computed[i % computed.length].shareMinor += 1;
      }

      const results = computed.map(({ userId, shareMinor }) => ({ userId, shareMinor }));
      validateSum(results, totalMinor);
      return results;
    }

    default:
      throw new SplitValidationError(`Unsupported split method: ${(input as any).method}`);
  }
}

function validateSum(results: SplitResult[], expectedTotal: number): void {
  const actualSum = results.reduce((acc, r) => acc + r.shareMinor, 0);
  if (actualSum !== expectedTotal) {
    throw new SplitValidationError(
      `Internal invariant violated: splits sum (${actualSum}) !== expected total (${expectedTotal})`
    );
  }
}
