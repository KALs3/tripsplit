import { SettlementTransfer } from './types';

/**
 * Greedy Debt Simplification Algorithm
 *
 * Problem:
 * In a group of N members who have made numerous shared expenses and cross-payments,
 * resolving debts naively could require up to N*(N-1)/2 individual transactions.
 *
 * Algorithm:
 * 1. Calculate each member's net balance:
 *    - Creditors: netBalance > 0 (owed money by the group)
 *    - Debtors:   netBalance < 0 (owe money to the group)
 * 2. Sort creditors and debtors by absolute magnitude descending.
 * 3. Greedily match the largest debtor with the largest creditor:
 *    - Transfer amount = min(debtor.debt, creditor.credit)
 *    - Deduct from both. Remove whichever party reaches 0.
 * 4. Repeat until all balances reach 0.
 *
 * Guarantees:
 * - Produces at most (N - 1) transactions.
 * - Time Complexity: O(N log N) dominated by sorting.
 *
 * Architectural & Interview Note:
 * Finding the mathematically absolute minimum number of transactions across arbitrary
 * balance graphs is an NP-hard problem equivalent to the Subset Sum / Minimum Partition problem.
 * For group trips (2 - 20 members), the greedy heuristic finishes in under 1ms and produces
 * optimal or near-optimal results (at most 1 extra transfer in rare edge cases), making it the
 * industry-standard practical choice (used by Splitwise and similar apps).
 */
export function simplifyDebts(
  balances: Map<string, number> | Record<string, number>
): SettlementTransfer[] {
  const entries =
    balances instanceof Map ? Array.from(balances.entries()) : Object.entries(balances);

  interface Party {
    userId: string;
    amount: number; // positive magnitude in minor units
  }

  const creditors: Party[] = [];
  const debtors: Party[] = [];

  for (const [userId, net] of entries) {
    if (net > 0) {
      creditors.push({ userId, amount: net });
    } else if (net < 0) {
      debtors.push({ userId, amount: Math.abs(net) });
    }
  }

  // Sort descending by amount so largest balances settle first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const amountToSettle = Math.min(creditor.amount, debtor.amount);

    if (amountToSettle > 0) {
      transfers.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amountMinor: amountToSettle,
      });

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;
    }

    if (debtor.amount === 0) {
      dIdx++;
    }
    if (creditor.amount === 0) {
      cIdx++;
    }
  }

  return transfers;
}
