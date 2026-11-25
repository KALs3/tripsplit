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
