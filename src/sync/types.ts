import { MockTrip } from '../domain/mockData';
import { ExpenseRecord, PaymentRecord } from '../domain/types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type OutboxMutation =
  | {
      mutationId: string;
      createdAt: string;
      type: 'CREATE_TRIP';
      payload: { trip: MockTrip; ownerId: string };
    }
  | {
      mutationId: string;
      createdAt: string;
      type: 'UPSERT_EXPENSE';
      payload: { expense: ExpenseRecord; createdBy: string };
    }
  | {
      mutationId: string;
      createdAt: string;
      type: 'DELETE_EXPENSE';
      payload: { expenseId: string; tripId: string; deletedAt: string };
    }
  | {
      mutationId: string;
      createdAt: string;
      type: 'CREATE_PAYMENT';
      payload: { payment: PaymentRecord; createdBy: string };
    }
  | {
      mutationId: string;
      createdAt: string;
      type: 'DELETE_PAYMENT';
      payload: { paymentId: string; tripId: string; deletedAt: string };
    };
