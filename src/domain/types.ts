/**
 * TripSplit Domain Types
 * Core financial and calculation types used across the app.
 */

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'EGP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'AED'
  | 'SAR'
  | string;

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  name: string;
}

export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface SplitResult {
  userId: string;
  shareMinor: number; // in expense currency minor units (e.g. cents)
}

export interface EqualSplitInput {
  method: 'EQUAL';
  participants: string[];
}

export interface ExactSplitInput {
  method: 'EXACT';
  amountsMinor: Record<string, number>; // userId -> amount in minor units
}

export interface PercentageSplitInput {
  method: 'PERCENTAGE';
  percentages: Record<string, number>; // userId -> percentage (0 - 100, sum must be 100)
}

export interface SharesSplitInput {
  method: 'SHARES';
  shares: Record<string, number>; // userId -> positive integer shares (e.g., 2 for Alice, 1 for Bob)
}

export type SplitInput =
  | EqualSplitInput
  | ExactSplitInput
  | PercentageSplitInput
  | SharesSplitInput;

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'lodging'
  | 'activities'
  | 'shopping'
  | 'other';

export interface ExpenseRecord {
  id: string;
  tripId: string;
  title: string;
  amountMinor: number;
  currency: CurrencyCode;
  fxRateToBase: number; // e.g. 1.0 if same currency, or rate where base_amount = amount * fxRateToBase
  category?: ExpenseCategory;
  paidBy: string;
  spentAt?: string;
  note?: string;
  receiptUrl?: string;
  placeId?: string;
  splits: SplitResult[];
  deletedAt?: string | null;
}

export interface PlaceRecord {
  id: string;
  tripId: string;
  name: string;
  lat: number;
  lng: number;
  category: ExpenseCategory;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  tripId: string;
  fromUser: string;
  toUser: string;
  amountMinor: number;
  currency: CurrencyCode;
  fxRateToBase: number;
  deletedAt?: string | null;
}

export interface NetBalance {
  userId: string;
  netMinor: number; // Positive = is owed money (creditor), Negative = owes money (debtor)
}

export interface SettlementTransfer {
  fromUser: string;
  toUser: string;
  amountMinor: number;
}
