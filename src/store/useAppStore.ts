import { create } from 'zustand';
import { calculateNetBalances, convertToBaseMinor, simplifyDebts } from '../domain';
import {
  DEMO_EXPENSES,
  DEMO_MEMBERS,
  DEMO_PAYMENTS,
  DEMO_TRIP,
  DEMO_USER,
  MockTrip,
  MockTripMember,
} from '../domain/mockData';
import { ExpenseRecord, NetBalance, PaymentRecord, SettlementTransfer } from '../domain/types';

export interface UserSession {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  defaultCurrency: string;
}

interface AppState {
  // Auth state
  user: UserSession | null;
  isGuestDemo: boolean;
  isLoading: boolean;

  // Data state
  trips: MockTrip[];
  activeTripId: string | null;
  members: MockTripMember[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];

  // Actions
  loginAsGuest: () => void;
  setUser: (user: UserSession | null) => void;
  signOut: () => void;
  setActiveTrip: (tripId: string) => void;
  addTrip: (trip: Omit<MockTrip, 'id' | 'inviteCode' | 'archived'>) => MockTrip;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => ExpenseRecord;
  updateExpense: (expense: ExpenseRecord) => void;
  deleteExpense: (expenseId: string) => void;
  addPayment: (payment: Omit<PaymentRecord, 'id'>) => PaymentRecord;
  deletePayment: (paymentId: string) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isGuestDemo: false,
  isLoading: false,

  trips: [],
  activeTripId: null,
  members: [],
  expenses: [],
  payments: [],

  loginAsGuest: () => {
    set({
      user: DEMO_USER,
      isGuestDemo: true,
      trips: [DEMO_TRIP],
      activeTripId: DEMO_TRIP.id,
      members: DEMO_MEMBERS,
      expenses: [...DEMO_EXPENSES],
      payments: [...DEMO_PAYMENTS],
    });
  },

  setUser: (user) => {
    set({ user, isGuestDemo: false });
  },

  signOut: () => {
    set({
      user: null,
      isGuestDemo: false,
      trips: [],
      activeTripId: null,
      members: [],
      expenses: [],
      payments: [],
    });
  },

  setActiveTrip: (tripId: string) => {
    set({ activeTripId: tripId });
  },

  addTrip: (tripData) => {
    const state = get();
    const newTrip: MockTrip = {
      ...tripData,
      id: `trip_${Date.now()}`,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      archived: false,
    };

    const ownerMember: MockTripMember = {
      tripId: newTrip.id,
      userId: state.user?.id || 'user_me',
      role: 'owner',
      displayName: state.user?.displayName || 'You',
      avatarUrl: state.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };

    set({
      trips: [newTrip, ...state.trips],
      members: [...state.members, ownerMember],
      activeTripId: newTrip.id,
    });

    return newTrip;
  },

  addExpense: (expenseData) => {
    const state = get();
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp_${Date.now()}`,
    };

    set({
      expenses: [newExpense, ...state.expenses],
    });

    return newExpense;
  },

  updateExpense: (updatedExpense) => {
    const state = get();
    set({
      expenses: state.expenses.map((e) =>
        e.id === updatedExpense.id ? updatedExpense : e
      ),
    });
  },

  deleteExpense: (expenseId: string) => {
    const state = get();
    // Soft delete
    set({
      expenses: state.expenses.map((e) =>
        e.id === expenseId ? { ...e, deletedAt: new Date().toISOString() } : e
      ),
    });
  },

  addPayment: (paymentData) => {
    const state = get();
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay_${Date.now()}`,
    };

    set({
      payments: [newPayment, ...state.payments],
    });

    return newPayment;
  },

  deletePayment: (paymentId: string) => {
    const state = get();
    set({
      payments: state.payments.map((p) =>
        p.id === paymentId ? { ...p, deletedAt: new Date().toISOString() } : p
      ),
    });
  },

  addMemberToTrip: (tripId: string, displayName: string) => {
    const state = get();
    const newMember: MockTripMember = {
      tripId,
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    // In Demo Mode, allow joining sample invite code PARIS26 for instant evaluation
    if (state.isGuestDemo && normalized === 'PARIS26') {
      const currentUserId = state.user?.id || 'user_me';
      const parisTrip: MockTrip = {
        id: `trip_paris_${Date.now()}`,
        name: 'Paris Weekend 🥐',
        coverUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
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
        id: `exp_paris_${Date.now()}`,
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
