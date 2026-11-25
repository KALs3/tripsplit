import { ExpenseCategory } from './types';

export interface QuickAddMember {
  userId: string;
  displayName: string;
}

export interface ParsedQuickExpense {
  title: string;
  amountMajor: number | null;
  category: ExpenseCategory;
  paidBy: string;
  participantIds: string[];
}

const CATEGORY_KEYWORDS: { category: ExpenseCategory; words: string[] }[] = [
  {
    category: 'food',
    words: ['dinner', 'lunch', 'breakfast', 'ramen', 'sushi', 'coffee', 'cafe', 'food', 'pizza', 'drinks', 'bar', 'restaurant', 'bistro'],
  },
  {
    category: 'transport',
    words: ['uber', 'taxi', 'train', 'shinkansen', 'bus', 'flight', 'metro', 'subway', 'cab', 'gas', 'fuel', 'parking'],
  },
  {
    category: 'lodging',
    words: ['hotel', 'airbnb', 'hostel', 'villa', 'stay', 'room', 'resort', 'lodging'],
  },
  {
    category: 'activities',
    words: ['ticket', 'tickets', 'museum', 'tour', 'park', 'cinema', 'show', 'teamlab', 'concert'],
  },
  {
    category: 'shopping',
    words: ['shop', 'shopping', 'souvenir', 'store', 'mall', 'clothes', 'market', 'groceries'],
  },
];

/**
 * Deterministic offline natural-language expense parser.
 * Handles inputs like:
 * - "Ramen dinner 48.50 split between me and Kenji"
 * - "Uber to airport 35"
 * - "Hotel 240 paid by Sarah"
 */
export function parseQuickExpense(
  input: string,
  members: QuickAddMember[],
  currentUserId: string
): ParsedQuickExpense {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Extract amount (first numeric token, optionally prefixed by currency symbol)
  const amountMatch = trimmed.match(/(?:[$€£¥]\s*)?(\d+(?:[.,]\d{1,2})?)/);
  const amountMajor = amountMatch
    ? Number.parseFloat(amountMatch[1].replace(',', '.'))
    : null;

  // 2. Infer category from keywords
  let category: ExpenseCategory = 'other';
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))) {
      category = entry.category;
      break;
    }
  }

  // 3. Detect explicit "paid by <name>"
  let paidBy = currentUserId;
  const paidByMatch = lower.match(/paid by\s+([a-z]+)/i);
  if (paidByMatch) {
    const targetName = paidByMatch[1].toLowerCase();
    if (targetName === 'me' || targetName === 'i') {
      paidBy = currentUserId;
    } else {
      const matched = members.find((m) =>
        m.displayName.toLowerCase().includes(targetName)
      );
      if (matched) paidBy = matched.userId;
    }
  }

  // 4. Detect mentioned participants (defaults to all members if none named)
  const mentionedIds = new Set<string>();
  if (/\b(me|myself|i)\b/i.test(lower)) {
    mentionedIds.add(currentUserId);
  }
  for (const m of members) {
    const firstName = m.displayName.split(' ')[0].toLowerCase();
    if (firstName.length >= 2 && new RegExp(`\\b${firstName}\\b`, 'i').test(lower)) {
      mentionedIds.add(m.userId);
    }
  }

  const participantIds =
    mentionedIds.size >= 2 || (mentionedIds.size === 1 && /\b(only|just)\b/i.test(lower))
      ? Array.from(mentionedIds)
      : members.map((m) => m.userId);

  // 5. Clean title by stripping amount and trailing split/payer clauses
  let title = trimmed
    .replace(/(?:[$€£¥]\s*)?\d+(?:[.,]\d{1,2})?/g, '')
    .replace(/\b(split|between|with|paid by|for)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    title = trimmed.slice(0, 32) || 'Quick Expense';
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title,
    amountMajor: amountMajor && amountMajor > 0 ? amountMajor : null,
    category,
    paidBy,
    participantIds,
  };
}
