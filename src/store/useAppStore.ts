import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { calculateNetBalances, convertToBaseMinor, simplifyDebts } from '../domain';
import {
  DEMO_EXPENSES,
  DEMO_MEMBERS,
  DEMO_PAYMENTS,
  DEMO_PLACES,
  DEMO_TRIP,
  DEMO_USER,
  MockTrip,
  MockTripMember,
} from '../domain/mockData';
import {
  ExpenseRecord,
  NetBalance,
  PaymentRecord,
  PlaceRecord,
  SettlementTransfer,
} from '../domain/types';
import { generateClientUuid, OutboxQueue } from '../sync/outbox';
import {
  executeSupabaseMutation,
  fetchUserTripsSnapshot,
  isSupabaseConfigured,
} from '../sync/tripSync';
import { OutboxMutation, SyncStatus } from '../sync/types';

export interface UserSession {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  defaultCurrency: string;
}

const outbox = new OutboxQueue(AsyncStorage);

interface AppState {
  // Auth state
  user: UserSession | null;
  isGuestDemo: boolean;
  isLoading: boolean;

  // Sync & Offline state
  isNetworkOnline: boolean;
  isOfflineSimulated: boolean;
  syncStatus: SyncStatus;
  pendingMutationsCount: number;

  // Data state
  trips: MockTrip[];
  activeTripId: string | null;
  members: MockTripMember[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  places: PlaceRecord[];

  // Actions
  loginAsGuest: () => void;
  setUser: (user: UserSession | null) => void;
  signOut: () => void;
  setActiveTrip: (tripId: string) => void;
  setNetworkOnline: (online: boolean) => void;
  toggleSimulateOffline: () => void;
  hydrateFromRemote: () => Promise<void>;
  flushOutbox: () => Promise<void>;

  addTrip: (trip: Omit<MockTrip, 'id' | 'inviteCode' | 'archived'>) => MockTrip;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => ExpenseRecord;
  updateExpense: (expense: ExpenseRecord) => void;
  deleteExpense: (expenseId: string) => void;
  addPayment: (payment: Omit<PaymentRecord, 'id'>) => PaymentRecord;
  deletePayment: (paymentId: string) => void;
  addPlace: (place: Omit<PlaceRecord, 'id' | 'createdAt'>) => PlaceRecord;
  deletePlace: (placeId: string) => void;
  addMemberToTrip: (tripId: string, displayName: string) => MockTripMember;
  removeMemberFromTrip: (tripId: string, userId: string) => void;
  joinTripByCode: (inviteCode: string) => { trip?: MockTrip; error?: string };

  // Computed balance selectors
  getTripBalances: (tripId: string) => {
    balances: Map<string, number>;
    sortedBalances: NetBalance[];
    settlements: SettlementTransfer[];
    totalSpendMinor: number;
    userNetMinor: number;
  };
}

async function enqueueAndMaybeFlush(
  mutation: OutboxMutation,
  get: () => AppState,
  set: (partial: Partial<AppState>) => void
) {
  const { isGuestDemo, isOfflineSimulated, isNetworkOnline } = get();
  const shouldQueue = !isGuestDemo || isOfflineSimulated;

  if (!shouldQueue) {
    return;
  }

  const updated = await outbox.enqueue(mutation);
  const effectivelyOnline = isNetworkOnline && !isOfflineSimulated;

  set({
    pendingMutationsCount: updated.length,
    syncStatus: effectivelyOnline ? 'syncing' : 'offline',
  });

  if (effectivelyOnline) {
    await get().flushOutbox();
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isGuestDemo: false,
  isLoading: false,

  isNetworkOnline: true,
  isOfflineSimulated: false,
  syncStatus: 'synced',
  pendingMutationsCount: 0,

  trips: [],
  activeTripId: null,
  members: [],
  expenses: [],
  payments: [],
  places: [],

  loginAsGuest: () => {
    void outbox.clear();
    set({
      user: DEMO_USER,
      isGuestDemo: true,
      isOfflineSimulated: false,
      syncStatus: 'synced',
      pendingMutationsCount: 0,
      trips: [DEMO_TRIP],
      activeTripId: DEMO_TRIP.id,
      members: DEMO_MEMBERS,
      expenses: [...DEMO_EXPENSES],
      payments: [...DEMO_PAYMENTS],
      places: [...DEMO_PLACES],
    });
  },

  setUser: (user) => {
    set({ user, isGuestDemo: false });
    if (user && isSupabaseConfigured()) {
      void get().hydrateFromRemote();
    }
  },

  signOut: () => {
    void outbox.clear();
    set({
      user: null,
      isGuestDemo: false,
      isOfflineSimulated: false,
      syncStatus: 'synced',
      pendingMutationsCount: 0,
      trips: [],
      activeTripId: null,
      members: [],
      expenses: [],
      payments: [],
      places: [],
    });
  },

  setActiveTrip: (tripId: string) => {
    set({ activeTripId: tripId });
  },

  setNetworkOnline: (online: boolean) => {
    const prev = get();
    const effectivelyOnline = online && !prev.isOfflineSimulated;
    set({
      isNetworkOnline: online,
      syncStatus: effectivelyOnline
        ? prev.pendingMutationsCount > 0
          ? 'syncing'
          : 'synced'
        : 'offline',
    });

    if (effectivelyOnline && prev.pendingMutationsCount > 0) {
      void get().flushOutbox();
    }
  },

  toggleSimulateOffline: () => {
    const prev = get();
    const nextSimulated = !prev.isOfflineSimulated;
    const effectivelyOnline = prev.isNetworkOnline && !nextSimulated;

    set({
      isOfflineSimulated: nextSimulated,
      syncStatus: effectivelyOnline
        ? prev.pendingMutationsCount > 0
          ? 'syncing'
          : 'synced'
        : 'offline',
    });

    if (effectivelyOnline && prev.pendingMutationsCount > 0) {
      void get().flushOutbox();
    }
  },

  hydrateFromRemote: async () => {
    const { isGuestDemo, user } = get();
    if (isGuestDemo || !user || !isSupabaseConfigured()) return;

    set({ isLoading: true, syncStatus: 'syncing' });
    try {
      const snapshot = await fetchUserTripsSnapshot();
      const pending = await outbox.load();
      set({
        trips: snapshot.trips,
        members: snapshot.members,
        expenses: snapshot.expenses,
        payments: snapshot.payments,
        places: snapshot.places,
        pendingMutationsCount: pending.length,
        syncStatus: pending.length > 0 ? 'offline' : 'synced',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, syncStatus: 'error' });
    }
  },

  flushOutbox: async () => {
    const { isNetworkOnline, isOfflineSimulated, isGuestDemo } = get();
    if (!isNetworkOnline || isOfflineSimulated) {
      const pending = await outbox.load();
      set({ syncStatus: 'offline', pendingMutationsCount: pending.length });
      return;
    }

    set({ syncStatus: 'syncing' });

    const result = await outbox.flush(async (mutation) => {
      if (!isGuestDemo) {
        await executeSupabaseMutation(mutation);
      }
    });

    if (result.error) {
      set({
        syncStatus: 'error',
        pendingMutationsCount: result.remaining.length,
      });
    } else {
      set({
        syncStatus: 'synced',
        pendingMutationsCount: 0,
      });
    }
  },

  addTrip: (tripData) => {
    const state = get();
    const newTrip: MockTrip = {
      ...tripData,
      id: generateClientUuid(),
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      archived: false,
    };

    const ownerId = state.user?.id || 'user_me';
    const ownerMember: MockTripMember = {
      tripId: newTrip.id,
      userId: ownerId,
      role: 'owner',
      displayName: state.user?.displayName || 'You',
      avatarUrl:
        state.user?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };

    set({
      trips: [newTrip, ...state.trips],
      members: [...state.members, ownerMember],
      activeTripId: newTrip.id,
    });

    void enqueueAndMaybeFlush(
      {
        mutationId: generateClientUuid(),
        createdAt: new Date().toISOString(),
        type: 'CREATE_TRIP',
        payload: { trip: newTrip, ownerId },
      },
      get,
      set
    );

    return newTrip;
  },

  addExpense: (expenseData) => {
    const state = get();
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: generateClientUuid(),
    };

    set({
      expenses: [newExpense, ...state.expenses],
    });

    void enqueueAndMaybeFlush(
      {
        mutationId: generateClientUuid(),
        createdAt: new Date().toISOString(),
        type: 'UPSERT_EXPENSE',
        payload: {
          expense: newExpense,
          createdBy: state.user?.id || 'user_me',
        },
      },
      get,
      set
    );

    return newExpense;
  },

  updateExpense: (updatedExpense) => {
    const state = get();
    set({
      expenses: state.expenses.map((e) =>
        e.id === updatedExpense.id ? updatedExpense : e
      ),
    });

    void enqueueAndMaybeFlush(
      {
        mutationId: generateClientUuid(),
        createdAt: new Date().toISOString(),
        type: 'UPSERT_EXPENSE',
        payload: {
          expense: updatedExpense,
          createdBy: state.user?.id || 'user_me',
        },
      },
      get,
      set
    );
  },

  deleteExpense: (expenseId: string) => {
    const state = get();
    const deletedAt = new Date().toISOString();
    const target = state.expenses.find((e) => e.id === expenseId);

    set({
      expenses: state.expenses.map((e) =>
        e.id === expenseId ? { ...e, deletedAt } : e
      ),
    });

    if (target) {
      void enqueueAndMaybeFlush(
        {
          mutationId: generateClientUuid(),
          createdAt: deletedAt,
          type: 'DELETE_EXPENSE',
          payload: { expenseId, tripId: target.tripId, deletedAt },
        },
        get,
        set
      );
    }
  },

  addPayment: (paymentData) => {
    const state = get();
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: generateClientUuid(),
    };

    set({
      payments: [newPayment, ...state.payments],
    });

    void enqueueAndMaybeFlush(
      {
        mutationId: generateClientUuid(),
        createdAt: new Date().toISOString(),
        type: 'CREATE_PAYMENT',
        payload: {
          payment: newPayment,
          createdBy: state.user?.id || 'user_me',
        },
      },
      get,
      set
    );

    return newPayment;
  },

  deletePayment: (paymentId: string) => {
    const state = get();
    const deletedAt = new Date().toISOString();
    const target = state.payments.find((p) => p.id === paymentId);

    set({
      payments: state.payments.map((p) =>
        p.id === paymentId ? { ...p, deletedAt } : p
      ),
    });

    if (target) {
      void enqueueAndMaybeFlush(
        {
          mutationId: generateClientUuid(),
          createdAt: deletedAt,
          type: 'DELETE_PAYMENT',
          payload: { paymentId, tripId: target.tripId, deletedAt },
        },
        get,
        set
      );
    }
  },

  addPlace: (placeData) => {
    const state = get();
    const newPlace: PlaceRecord = {
      ...placeData,
      id: generateClientUuid(),
      createdAt: new Date().toISOString(),
    };

    set({
      places: [newPlace, ...state.places],
    });

    void enqueueAndMaybeFlush(
      {
        mutationId: generateClientUuid(),
        createdAt: newPlace.createdAt,
        type: 'CREATE_PLACE',
        payload: { place: newPlace },
      },
      get,
      set
    );

    return newPlace;
  },

  deletePlace: (placeId: string) => {
    const state = get();
    const target = state.places.find((p) => p.id === placeId);
    set({
      places: state.places.filter((p) => p.id !== placeId),
    });

    if (target) {
      void enqueueAndMaybeFlush(
        {
          mutationId: generateClientUuid(),
          createdAt: new Date().toISOString(),
          type: 'DELETE_PLACE',
          payload: { placeId, tripId: target.tripId },
        },
        get,
        set
      );
    }
  },

  addMemberToTrip: (tripId: string, displayName: string) => {
    const state = get();
    const newMember: MockTripMember = {
      tripId,
      userId: generateClientUuid(),
      role: 'member',
      displayName: displayName.trim(),
      avatarUrl: '',
    };

    set({
      members: [...state.members, newMember],
    });

    return newMember;
  },

  removeMemberFromTrip: (tripId: string, userId: string) => {
    const state = get();
    set({
      members: state.members.filter(
        (m) => !(m.tripId === tripId && m.userId === userId)
      ),
    });
  },

  joinTripByCode: (inviteCode: string) => {
    const state = get();
    const normalized = inviteCode.trim().toUpperCase();
    if (!normalized) {
      return { error: 'Please enter an invite code.' };
    }

    const existing = state.trips.find(
      (t) => t.inviteCode.toUpperCase() === normalized
    );
    if (existing) {
      set({ activeTripId: existing.id });
      return { trip: existing };
    }

    if (state.isGuestDemo && normalized === 'PARIS26') {
      const currentUserId = state.user?.id || 'user_me';
      const parisTrip: MockTrip = {
        id: generateClientUuid(),
        name: 'Paris Weekend 🥐',
        coverUrl:
          'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
        baseCurrency: 'EUR',
        startDate: '2026-12-05',
        endDate: '2026-12-08',
        ownerId: 'user_claire',
        archived: false,
        inviteCode: 'PARIS26',
      };

      const parisMembers: MockTripMember[] = [
        {
          tripId: parisTrip.id,
          userId: 'user_claire',
          role: 'owner',
          displayName: 'Claire Moreau',
          avatarUrl: '',
        },
        {
          tripId: parisTrip.id,
          userId: currentUserId,
          role: 'member',
          displayName: state.user?.displayName || 'Alex Rivera (You)',
          avatarUrl: state.user?.avatarUrl || '',
        },
      ];

      const parisExpense: ExpenseRecord = {
        id: generateClientUuid(),
        tripId: parisTrip.id,
        title: 'Le Marais Bistro Dinner',
        amountMinor: 9200, // €92.00
        currency: 'EUR',
        fxRateToBase: 1.0,
        category: 'food',
        paidBy: 'user_claire',
        spentAt: new Date().toISOString(),
        splits: [
          { userId: 'user_claire', shareMinor: 4600 },
          { userId: currentUserId, shareMinor: 4600 },
        ],
      };

      set({
        trips: [parisTrip, ...state.trips],
        members: [...state.members, ...parisMembers],
        expenses: [parisExpense, ...state.expenses],
        activeTripId: parisTrip.id,
      });

      return { trip: parisTrip };
    }

    return {
      error: `No trip found with code "${normalized}". Try "PARIS26" in Demo Mode.`,
    };
  },

  getTripBalances: (tripId: string) => {
    const state = get();
    const tripExpenses = state.expenses.filter(
      (e) => e.tripId === tripId && !e.deletedAt
    );
    const tripPayments = state.payments.filter(
      (p) => p.tripId === tripId && !p.deletedAt
    );
    const tripMemberIds = state.members
      .filter((m) => m.tripId === tripId)
      .map((m) => m.userId);

    const balances = calculateNetBalances(
      tripMemberIds,
      tripExpenses,
      tripPayments
    );

    const settlements = simplifyDebts(balances);

    const sortedBalances: NetBalance[] = [];
    for (const [userId, netMinor] of balances.entries()) {
      sortedBalances.push({ userId, netMinor });
    }
    sortedBalances.sort((a, b) => b.netMinor - a.netMinor);

    const totalSpendMinor = tripExpenses.reduce(
      (sum, e) => sum + convertToBaseMinor(e.amountMinor, e.fxRateToBase),
      0
    );

    const currentUserId = state.user?.id || 'user_me';
    const userNetMinor = balances.get(currentUserId) || 0;

    return {
      balances,
      sortedBalances,
      settlements,
      totalSpendMinor,
      userNetMinor,
    };
  },
}));
