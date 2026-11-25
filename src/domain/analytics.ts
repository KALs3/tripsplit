import { convertToBaseMinor } from './money';
import { ExpenseCategory, ExpenseRecord } from './types';

export interface CategorySpend {
  category: ExpenseCategory;
  amountBaseMinor: number;
  percentage: number;
  count: number;
}

export interface MemberSpendSummary {
  userId: string;
  paidBaseMinor: number;
  consumedBaseMinor: number;
}

export interface DailySpend {
  date: string; // YYYY-MM-DD
  amountBaseMinor: number;
}

/**
 * Aggregates non-deleted expenses by category in base currency.
 */
export function computeCategoryBreakdown(
  expenses: ExpenseRecord[]
): CategorySpend[] {
  const active = expenses.filter((e) => !e.deletedAt);
  const totalBase = active.reduce(
    (sum, e) => sum + convertToBaseMinor(e.amountMinor, e.fxRateToBase),
    0
  );

  if (totalBase === 0) return [];

  const buckets = new Map<ExpenseCategory, { amount: number; count: number }>();

  for (const exp of active) {
    const cat: ExpenseCategory = exp.category || 'other';
    const base = convertToBaseMinor(exp.amountMinor, exp.fxRateToBase);
    const prev = buckets.get(cat) ?? { amount: 0, count: 0 };
    buckets.set(cat, { amount: prev.amount + base, count: prev.count + 1 });
  }

  const results: CategorySpend[] = [];
  for (const [category, data] of buckets.entries()) {
    results.push({
      category,
      amountBaseMinor: data.amount,
      percentage: (data.amount / totalBase) * 100,
      count: data.count,
    });
  }

  return results.sort((a, b) => b.amountBaseMinor - a.amountBaseMinor);
}

/**
 * Computes how much each member paid upfront vs actually consumed across expenses.
 */
export function computeMemberSpending(
  memberIds: string[],
  expenses: ExpenseRecord[]
): MemberSpendSummary[] {
  const active = expenses.filter((e) => !e.deletedAt);
  const map = new Map<string, { paid: number; consumed: number }>();

  for (const id of memberIds) {
    map.set(id, { paid: 0, consumed: 0 });
  }

  for (const exp of active) {
    const totalBase = convertToBaseMinor(exp.amountMinor, exp.fxRateToBase);
    const payer = map.get(exp.paidBy) ?? { paid: 0, consumed: 0 };
    payer.paid += totalBase;
    map.set(exp.paidBy, payer);

    for (const split of exp.splits) {
      const shareBase = convertToBaseMinor(split.shareMinor, exp.fxRateToBase);
      const consumer = map.get(split.userId) ?? { paid: 0, consumed: 0 };
      consumer.consumed += shareBase;
      map.set(split.userId, consumer);
    }
  }

  return Array.from(map.entries())
    .map(([userId, data]) => ({
      userId,
      paidBaseMinor: data.paid,
      consumedBaseMinor: data.consumed,
    }))
    .sort((a, b) => b.paidBaseMinor - a.paidBaseMinor);
}

/**
 * Aggregates active expenses by calendar day (YYYY-MM-DD) sorted chronologically.
 */
export function computeDailySpending(expenses: ExpenseRecord[]): DailySpend[] {
  const active = expenses.filter((e) => !e.deletedAt);
  const daily = new Map<string, number>();

  for (const exp of active) {
    const dateKey = (exp.spentAt || new Date().toISOString()).slice(0, 10);
    const base = convertToBaseMinor(exp.amountMinor, exp.fxRateToBase);
    daily.set(dateKey, (daily.get(dateKey) ?? 0) + base);
  }

  return Array.from(daily.entries())
    .map(([date, amountBaseMinor]) => ({ date, amountBaseMinor }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
