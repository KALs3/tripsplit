import { MockTrip, MockTripMember } from '../domain/mockData';
import { ExpenseCategory, ExpenseRecord, PaymentRecord } from '../domain/types';
import { supabase } from '../lib/supabase';
import { OutboxMutation } from './types';

/**
 * Checks whether Supabase environment variables are configured with real values
 * rather than local development placeholders.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes('placeholder.supabase.co') &&
      !key.includes('placeholder-anon-key')
  );
}

/**
 * Executes a single OutboxMutation idempotently against Supabase Postgres.
 * Because IDs are client-generated UUIDs, UPSERT guarantees at-least-once
 * delivery without creating duplicate records on retry.
 */
export async function executeSupabaseMutation(
  mutation: OutboxMutation
): Promise<void> {
  if (!isSupabaseConfigured()) {
    // No-op in unconfigured local environments
    return;
  }

  switch (mutation.type) {
    case 'CREATE_TRIP': {
      const { trip, ownerId } = mutation.payload;
      const { error: tripErr } = await supabase.from('trips').upsert(
        {
          id: trip.id,
          name: trip.name,
          cover_url: trip.coverUrl || null,
          base_currency: trip.baseCurrency,
          start_date: trip.startDate || null,
          end_date: trip.endDate || null,
          owner_id: ownerId,
          archived: trip.archived,
          invite_code: trip.inviteCode,
        } as never,
        { onConflict: 'id' }
      );
      if (tripErr) throw new Error(tripErr.message);

      const { error: memberErr } = await supabase.from('trip_members').upsert(
        {
          trip_id: trip.id,
          user_id: ownerId,
          role: 'owner',
        } as never,
        { onConflict: 'trip_id,user_id' }
      );
      if (memberErr) throw new Error(memberErr.message);
      break;
    }

    case 'UPSERT_EXPENSE': {
      const { expense, createdBy } = mutation.payload;
      const { error: expErr } = await supabase.from('expenses').upsert(
        {
          id: expense.id,
          trip_id: expense.tripId,
          title: expense.title,
          amount_minor: expense.amountMinor,
          currency: expense.currency,
          fx_rate_to_base: expense.fxRateToBase,
          category: expense.category || 'other',
          paid_by: expense.paidBy,
          spent_at: expense.spentAt || new Date().toISOString(),
          note: expense.note || null,
          created_by: createdBy,
          deleted_at: expense.deletedAt || null,
        } as never,
        { onConflict: 'id' }
      );
      if (expErr) throw new Error(expErr.message);

      // Replace splits atomically per expense
      const { error: delSplitsErr } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expense.id);
      if (delSplitsErr) throw new Error(delSplitsErr.message);

      if (expense.splits.length > 0) {
        const splitRows = expense.splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.userId,
          share_minor: s.shareMinor,
        }));
        const { error: splitsErr } = await supabase
          .from('expense_splits')
          .insert(splitRows as never);
        if (splitsErr) throw new Error(splitsErr.message);
      }
      break;
    }

    case 'DELETE_EXPENSE': {
      const { expenseId, deletedAt } = mutation.payload;
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: deletedAt } as never)
        .eq('id', expenseId);
      if (error) throw new Error(error.message);
      break;
    }

    case 'CREATE_PAYMENT': {
      const { payment, createdBy } = mutation.payload;
      const { error } = await supabase.from('payments').upsert(
        {
          id: payment.id,
          trip_id: payment.tripId,
          from_user: payment.fromUser,
          to_user: payment.toUser,
          amount_minor: payment.amountMinor,
          currency: payment.currency,
          fx_rate_to_base: payment.fxRateToBase,
          created_by: createdBy,
          deleted_at: payment.deletedAt || null,
        } as never,
        { onConflict: 'id' }
      );
      if (error) throw new Error(error.message);
      break;
    }

    case 'DELETE_PAYMENT': {
      const { paymentId, deletedAt } = mutation.payload;
      const { error } = await supabase
        .from('payments')
        .update({ deleted_at: deletedAt } as never)
        .eq('id', paymentId);
      if (error) throw new Error(error.message);
      break;
    }
  }
}

export interface RemoteTripsSnapshot {
  trips: MockTrip[];
  members: MockTripMember[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
}

/**
 * Fetches all trips and child records visible to the signed-in user.
 * PostgreSQL Row-Level Security (RLS) automatically scopes every query to
 * trips where auth.uid() is a member.
 */
export async function fetchUserTripsSnapshot(): Promise<RemoteTripsSnapshot> {
  const { data: tripsRows, error: tripsErr } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  if (tripsErr) throw new Error(tripsErr.message);

  const trips: MockTrip[] = (tripsRows || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    coverUrl: row.cover_url || '',
    baseCurrency: row.base_currency,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    ownerId: row.owner_id,
    archived: row.archived,
    inviteCode: row.invite_code,
  }));

  if (trips.length === 0) {
    return { trips: [], members: [], expenses: [], payments: [] };
  }

  const tripIds = trips.map((t) => t.id);

  const [membersRes, expensesRes, paymentsRes] = await Promise.all([
    supabase
      .from('trip_members')
      .select('trip_id, user_id, role, profiles(display_name, avatar_url)')
      .in('trip_id', tripIds),
    supabase
      .from('expenses')
      .select('*, expense_splits(user_id, share_minor)')
      .in('trip_id', tripIds)
      .order('spent_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .in('trip_id', tripIds)
      .order('paid_at', { ascending: false }),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const members: MockTripMember[] = (membersRes.data || []).map((row: any) => ({
    tripId: row.trip_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.profiles?.display_name || 'Traveler',
    avatarUrl: row.profiles?.avatar_url || '',
  }));

  const expenses: ExpenseRecord[] = (expensesRes.data || []).map((row: any) => ({
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    fxRateToBase: Number(row.fx_rate_to_base),
    category: row.category as ExpenseCategory,
    paidBy: row.paid_by,
    spentAt: row.spent_at,
    note: row.note || undefined,
    deletedAt: row.deleted_at,
    splits: (row.expense_splits || []).map((s: any) => ({
      userId: s.user_id,
      shareMinor: Number(s.share_minor),
    })),
  }));

  const payments: PaymentRecord[] = (paymentsRes.data || []).map((row: any) => ({
    id: row.id,
    tripId: row.trip_id,
    fromUser: row.from_user,
    toUser: row.to_user,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    fxRateToBase: Number(row.fx_rate_to_base),
    deletedAt: row.deleted_at,
  }));

  return { trips, members, expenses, payments };
}

/**
 * Subscribes to Supabase Realtime postgres_changes for a specific trip.
 * Triggers `onRemoteChange` when any trip member adds, edits, or settles.
 */
export function subscribeToTripRealtime(
  tripId: string,
  onRemoteChange: () => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel(`trip-sync-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `trip_id=eq.${tripId}`,
      },
      onRemoteChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `trip_id=eq.${tripId}`,
      },
      onRemoteChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_members',
        filter: `trip_id=eq.${tripId}`,
      },
      onRemoteChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
