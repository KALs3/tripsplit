import { ExpenseCategory } from '../domain/types';
import { colors } from './colors';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  emoji: string; // Retained for plain-text Share summaries
  color: string;
  colorDark: string;
  /** Distinct vibrant chart color reserved exclusively for the Insights tab */
  chartColor: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  {
    id: 'food',
    label: 'Food & Dining',
    shortLabel: 'Food',
    emoji: '🍜',
    color: colors.categories.food,
    colorDark: colors.categoriesDark.food,
    chartColor: '#F97316',
  },
  {
    id: 'transport',
    label: 'Transport',
    shortLabel: 'Transit',
    emoji: '🚄',
    color: colors.categories.transport,
    colorDark: colors.categoriesDark.transport,
    chartColor: '#2563EB',
  },
  {
    id: 'lodging',
    label: 'Lodging',
    shortLabel: 'Stay',
    emoji: '🏨',
    color: colors.categories.lodging,
    colorDark: colors.categoriesDark.lodging,
    chartColor: '#7C3AED',
  },
  {
    id: 'activities',
    label: 'Activities',
    shortLabel: 'Tickets',
    emoji: '🎟️',
    color: colors.categories.activities,
    colorDark: colors.categoriesDark.activities,
    chartColor: '#EC4899',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    shortLabel: 'Shop',
    emoji: '🛍️',
    color: colors.categories.shopping,
    colorDark: colors.categoriesDark.shopping,
    chartColor: '#10B981',
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    emoji: '🧾',
    color: colors.categories.other,
    colorDark: colors.categoriesDark.other,
    chartColor: '#64748B',
  },
];

export function getCategoryMeta(category?: ExpenseCategory): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === category) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
