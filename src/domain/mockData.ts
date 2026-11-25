import { ExpenseRecord, PaymentRecord } from './types';

export interface MockProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  defaultCurrency: string;
}

export interface MockTrip {
  id: string;
  name: string;
  coverUrl: string;
  baseCurrency: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  archived: boolean;
  inviteCode: string;
}

export interface MockTripMember {
  tripId: string;
  userId: string;
  role: 'owner' | 'member';
  displayName: string;
  avatarUrl: string;
}

export const DEMO_USER: MockProfile = {
  id: 'user_me',
  displayName: 'Alex Rivera (You)',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  defaultCurrency: 'USD',
};

export const DEMO_MEMBERS: MockTripMember[] = [
  {
    tripId: 'trip_tokyo',
    userId: 'user_me',
    role: 'owner',
    displayName: 'Alex Rivera (You)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    tripId: 'trip_tokyo',
    userId: 'user_kenji',
    role: 'member',
    displayName: 'Kenji Sato',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    tripId: 'trip_tokyo',
    userId: 'user_sarah',
    role: 'member',
    displayName: 'Sarah Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    tripId: 'trip_tokyo',
    userId: 'user_marcus',
    role: 'member',
    displayName: 'Marcus Bell',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
];

export const DEMO_TRIP: MockTrip = {
  id: 'trip_tokyo',
  name: 'Tokyo & Kyoto 🇯🇵',
  coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
  baseCurrency: 'USD',
  startDate: '2026-11-10',
  endDate: '2026-11-20',
  ownerId: 'user_me',
  archived: false,
  inviteCode: 'TOKYO26',
};

export const DEMO_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp_shinkansen',
    tripId: 'trip_tokyo',
    title: 'Bullet Train to Kyoto',
    amountMinor: 32000, // $320.00
    currency: 'USD',
    fxRateToBase: 1.0,
    category: 'transport',
    paidBy: 'user_me',
    spentAt: '2026-11-12T09:30:00Z',
    note: 'Nozomi express reserved seats',
    splits: [
      { userId: 'user_me', shareMinor: 8000 },
      { userId: 'user_kenji', shareMinor: 8000 },
      { userId: 'user_sarah', shareMinor: 8000 },
      { userId: 'user_marcus', shareMinor: 8000 },
    ],
  },
  {
    id: 'exp_ramen',
    tripId: 'trip_tokyo',
    title: 'Ichiran Ramen Dinner',
    amountMinor: 5600, // $56.00
    currency: 'USD',
    fxRateToBase: 1.0,
    category: 'food',
    paidBy: 'user_kenji',
    spentAt: '2026-11-11T20:15:00Z',
    splits: [
      { userId: 'user_me', shareMinor: 1400 },
      { userId: 'user_kenji', shareMinor: 1400 },
      { userId: 'user_sarah', shareMinor: 1400 },
      { userId: 'user_marcus', shareMinor: 1400 },
    ],
  },
  {
    id: 'exp_airbnb',
    tripId: 'trip_tokyo',
    title: 'Kyoto Machiya Villa',
    amountMinor: 64000, // $640.00
    currency: 'USD',
    fxRateToBase: 1.0,
    category: 'lodging',
    paidBy: 'user_sarah',
    spentAt: '2026-11-12T15:00:00Z',
    note: '2 nights near Gion district',
    splits: [
      { userId: 'user_me', shareMinor: 16000 },
      { userId: 'user_kenji', shareMinor: 16000 },
      { userId: 'user_sarah', shareMinor: 16000 },
      { userId: 'user_marcus', shareMinor: 16000 },
    ],
  },
  {
    id: 'exp_teamlab',
    tripId: 'trip_tokyo',
    title: 'teamLab Planets Tickets',
    amountMinor: 14000, // $140.00
    currency: 'USD',
    fxRateToBase: 1.0,
    category: 'activities',
    paidBy: 'user_marcus',
    spentAt: '2026-11-10T14:00:00Z',
    splits: [
      { userId: 'user_me', shareMinor: 3500 },
      { userId: 'user_kenji', shareMinor: 3500 },
      { userId: 'user_sarah', shareMinor: 3500 },
      { userId: 'user_marcus', shareMinor: 3500 },
    ],
  },
];

export const DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay_1',
    tripId: 'trip_tokyo',
    fromUser: 'user_kenji',
    toUser: 'user_me',
    amountMinor: 5000, // $50.00 partial settlement
    currency: 'USD',
    fxRateToBase: 1.0,
  },
];
