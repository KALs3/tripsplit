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
    words: [
      'dinner', 'lunch', 'breakfast', 'ramen', 'sushi', 'coffee', 'cafe', 'food', 'pizza', 'drinks', 'bar', 'restaurant', 'bistro',
      'عشاء', 'غداء', 'فطور', 'قهوة', 'مطعم', 'طعام', 'مشروبات', 'أكل', 'اكل',
    ],
  },
  {
    category: 'transport',
    words: [
      'uber', 'taxi', 'train', 'shinkansen', 'bus', 'flight', 'metro', 'subway', 'cab', 'gas', 'fuel', 'parking',
      'أوبر', 'اوبر', 'تاكسي', 'قطار', 'مواصلات', 'طيران', 'مترو', 'باص', 'بنزين',
    ],
  },
  {
    category: 'lodging',
    words: [
      'hotel', 'airbnb', 'hostel', 'villa', 'stay', 'room', 'resort', 'lodging',
      'فندق', 'إقامة', 'اقامة', 'غرفة', 'شقة', 'منتجع',
    ],
  },
  {
    category: 'activities',
    words: [
      'ticket', 'tickets', 'museum', 'tour', 'park', 'cinema', 'show', 'teamlab', 'concert',
      'تذكرة', 'تذاكر', 'متحف', 'جولة', 'سينما', 'حديقة', 'حفل',
    ],
  },
  {
    category: 'shopping',
    words: [
      'shop', 'shopping', 'souvenir', 'store', 'mall', 'clothes', 'market', 'groceries',
      'تسوق', 'هدايا', 'مول', 'سوق', 'ملابس', 'بقالة',
    ],
  },
];

function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g, '.');
}

/**
 * Deterministic offline natural-language expense parser.
 * Handles English and Arabic inputs like:
 * - "Ramen dinner 48.50 split between me and Kenji"
 * - "عشاء بحري 240 بيني وبين سارة"
 * - "Hotel 240 paid by Sarah"
 */
export function parseQuickExpense(
  input: string,
  members: QuickAddMember[],
  currentUserId: string
): ParsedQuickExpense {
  const trimmed = normalizeDigits(input.trim());
  const lower = trimmed.toLowerCase();

  // 1. Extract amount (first numeric token, optionally prefixed by currency symbol)
  const amountMatch = trimmed.match(/(?:[$€£¥]\s*)?(\d+(?:[.,]\d{1,2})?)/);
  const amountMajor = amountMatch
    ? Number.parseFloat(amountMatch[1].replace(',', '.'))
    : null;

  // 2. Infer category from keywords (supports Latin word boundaries and Arabic substring tokens)
  let category: ExpenseCategory = 'other';
  for (const entry of CATEGORY_KEYWORDS) {
    if (
      entry.words.some((w) =>
        /^[a-z]+$/i.test(w) ? new RegExp(`\\b${w}\\b`, 'i').test(lower) : lower.includes(w)
      )
    ) {
      category = entry.category;
      break;
    }
  }

  // 3. Detect explicit "paid by <name>" or "دفع <name>"
  let paidBy = currentUserId;
  const paidByRegex = /(?:paid by|دفع(?:ه)?|بواسطة)\s+([\p{L}]+)/iu;
  const paidByMatch = lower.match(paidByRegex);
  if (paidByMatch) {
    const targetName = paidByMatch[1].toLowerCase();
    if (targetName === 'me' || targetName === 'i' || targetName === 'أنا' || targetName === 'انا') {
      paidBy = currentUserId;
    } else {
      const matched = members.find((m) =>
        m.displayName.toLowerCase().includes(targetName)
      );
      if (matched) paidBy = matched.userId;
    }
  }

  // 4. Detect mentioned participants outside the "paid by" clause (defaults to all members)
  const participantsScope = lower.replace(paidByRegex, '').trim();
  const mentionedIds = new Set<string>();
  if (
    /\b(me|myself|i)\b/i.test(participantsScope) ||
    /(?:^|\s)(أنا|انا|بيني)(?:\s|$)/.test(participantsScope)
  ) {
    mentionedIds.add(currentUserId);
  }
  for (const m of members) {
    const firstName = m.displayName.split(' ')[0].toLowerCase();
    if (firstName.length >= 2) {
      const matchedName = /^[a-z]+$/i.test(firstName)
        ? new RegExp(`\\b${firstName}\\b`, 'i').test(participantsScope)
        : participantsScope.includes(firstName);
      if (matchedName) {
        mentionedIds.add(m.userId);
      }
    }
  }

  const participantIds =
    mentionedIds.size >= 2 ||
    (mentionedIds.size === 1 && (/\b(only|just)\b/i.test(lower) || lower.includes('فقط')))
      ? Array.from(mentionedIds)
      : members.map((m) => m.userId);

  // 5. Clean title by stripping amount and trailing split/payer clauses
  let title = trimmed
    .replace(/(?:[$€£¥]\s*)?\d+(?:[.,]\d{1,2})?/g, '')
    .replace(/\b(split|between|with|paid by|for)\b.*$/i, '')
    .replace(/(?:مقس[مّ]?|بين(?:ي)?|مع|دفع(?:ه)?|بواسطة).*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    title = trimmed.slice(0, 32) || 'Quick Expense';
  } else if (/^[a-z]/i.test(title)) {
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
