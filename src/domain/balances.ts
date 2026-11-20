import { convertToBaseMinor } from './money';
import { ExpenseRecord, NetBalance, PaymentRecord } from './types';

/**
 * Calculates net balances in the trip's base currency for each member.
 *
 * Invariant guaranteed:
 * Sum of all net balances across all members is ALWAYS 0.
 *
 * Net balance interpretation:
 * - Positive (> 0): Creditor. The user is owed money by the group.
 * - Negative (< 0): Debtor. The user owes money to the group.
 * - Zero (= 0): Fully settled.
 */
export function calculateNetBalances(
  members: string[],
  expenses: ExpenseRecord[],
  payments: PaymentRecord[]
): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize all members with 0 balance
  for (const memberId of members) {
    balances.set(memberId, 0);
  }

  // Process all active (non-deleted) expenses
  for (const expense of expenses) {
    if (expense.deletedAt) continue;

    // Total expense amount converted to base currency
    const totalBaseMinor = convertToBaseMinor(expense.amountMinor, expense.fxRateToBase);

    // Convert splits to base currency while guaranteeing the sum matches totalBaseMinor
    const convertedSplits = convertSplitsToBase(
      expense.splits,
      expense.amountMinor,
      totalBaseMinor,
      expense.fxRateToBase
    );

    // The payer covered the whole expense upfront
    const currentPayerBal = balances.get(expense.paidBy) ?? 0;
    balances.set(expense.paidBy, currentPayerBal + totalBaseMinor);

    // Each participant owes their share
    for (const split of convertedSplits) {
      const currentParticipantBal = balances.get(split.userId) ?? 0;
      balances.set(split.userId, currentParticipantBal - split.shareMinor);
    }
  }

  // Process all active (non-deleted) payments / settlements
  for (const payment of payments) {
    if (payment.deletedAt) continue;

    const paymentBaseMinor = convertToBaseMinor(payment.amountMinor, payment.fxRateToBase);

    // fromUser paid money to toUser:
    // fromUser's net balance increases (debt reduced or credit increased)
    const fromBal = balances.get(payment.fromUser) ?? 0;
    balances.set(payment.fromUser, fromBal + paymentBaseMinor);

    // toUser received reimbursement:
    // toUser's net balance decreases (collected what was owed to them)
    const toBal = balances.get(payment.toUser) ?? 0;
    balances.set(payment.toUser, toBal - paymentBaseMinor);
  }

  return balances;
}

/**
 * Converts a list of expense splits into base currency minor units.
 * Guarantees that sum(splits in base) === totalBaseMinor, preventing
 * multi-currency float/rounding drift.
 */
function convertSplitsToBase(
  splits: { userId: string; shareMinor: number }[],
  originalTotalMinor: number,
  totalBaseMinor: number,
  fxRateToBase: number
): { userId: string; shareMinor: number }[] {
  if (splits.length === 0) return [];
  if (originalTotalMinor === 0) {
    return splits.map((s) => ({ userId: s.userId, shareMinor: 0 }));
  }

  // If fx rate is 1.0, shares are already in base
  if (fxRateToBase === 1.0) {
    return splits;
  }

  // Compute proportional base shares
  let allocated = 0;
  const converted = splits.map((s) => {
    // Proportional share of the converted base total
    const shareBase = Math.round((s.shareMinor / originalTotalMinor) * totalBaseMinor);
    allocated += shareBase;
    return { userId: s.userId, shareMinor: shareBase, originalShare: s.shareMinor };
  });

  // Reconcile rounding discrepancy to keep total invariant intact
  const diff = totalBaseMinor - allocated;
  if (diff !== 0) {
    // Adjust on the largest contributor
    converted.sort((a, b) => b.originalShare - a.originalShare);
    converted[0].shareMinor += diff;
  }

  return converted.map(({ userId, shareMinor }) => ({ userId, shareMinor }));
}

/**
 * Returns a sorted list of NetBalance objects (creditors first, debtors last).
 */
export function getSortedNetBalances(balancesMap: Map<string, number>): NetBalance[] {
  const list: NetBalance[] = [];
  for (const [userId, netMinor] of balancesMap.entries()) {
    list.push({ userId, netMinor });
  }

  // Sort descending: largest creditors first (+), debtors last (-)
  return list.sort((a, b) => b.netMinor - a.netMinor);
}
