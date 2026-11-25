import { ExpenseCategory } from '../domain/types';
import { colors } from './colors';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Food & Dining', emoji: '🍜', color: colors.categories.food },
  { id: 'transport', label: 'Transport', emoji: '🚄', color: colors.categories.transport },
  { id: 'lodging', label: 'Lodging', emoji: '🏨', color: colors.categories.lodging },
  { id: 'activities', label: 'Activities', emoji: '🎟️', color: colors.categories.activities },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: colors.categories.shopping },
  { id: 'other', label: 'Other', emoji: '🧾', color: colors.categories.other },
];

export function getCategoryMeta(category?: ExpenseCategory): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === category) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
