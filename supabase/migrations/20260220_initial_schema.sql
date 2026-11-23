-- ==============================================================================
-- TripSplit Database Schema & Row Level Security (RLS) Policies
-- PostgreSQL Migration for Supabase
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- Mirrors Supabase auth.users, stores public profile info & preferences
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  default_currency text not null default 'USD',
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to automatically create a profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, default_currency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'default_currency', 'USD')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. TRIPS
-- Core group entities
-- ------------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cover_url text,
  base_currency text not null default 'USD',
  start_date date,
  end_date date,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  archived boolean not null default false,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 3. TRIP MEMBERS
-- Association table mapping users to trips with specific roles
-- ------------------------------------------------------------------------------
create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. EXPENSES
-- Individual expenditures inside a trip
-- ------------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'USD',
  fx_rate_to_base numeric(14, 6) not null default 1.0,
  category text not null check (category in ('food', 'transport', 'lodging', 'activities', 'shopping', 'other')) default 'other',
  paid_by uuid not null references public.profiles(id) on delete restrict,
  spent_at timestamptz not null default now(),
  note text,
  receipt_url text,
  place_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 5. EXPENSE SPLITS
-- Breakdown of who owes what for each expense (in original expense currency)
-- ------------------------------------------------------------------------------
create table if not exists public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_minor bigint not null check (share_minor >= 0),
  primary key (expense_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 6. PAYMENTS (SETTLEMENTS)
-- Peer-to-peer debt settlements recorded between trip members
-- ------------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete restrict,
  to_user uuid not null references public.profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'USD',
  fx_rate_to_base numeric(14, 6) not null default 1.0,
  paid_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (from_user <> to_user)
);

-- ------------------------------------------------------------------------------
-- 7. PLACES (SHARED MAP PINS)
-- Geolocation markers associated with a trip or expense
-- ------------------------------------------------------------------------------
create table if not exists public.places (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  category text not null check (category in ('food', 'transport', 'lodging', 'activities', 'shopping', 'other')) default 'other',
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Add foreign key constraint back from expenses.place_id to places.id
alter table public.expenses
  add constraint fk_expenses_places
  foreign key (place_id) references public.places(id) on delete set null;

-- ------------------------------------------------------------------------------
-- 8. ACTIVITY LOG
-- Immutable audit log of all mutations inside a trip
-- ------------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, -- e.g. 'created_expense', 'updated_expense', 'recorded_payment', 'joined_trip'
  entity_type text not null, -- 'expense', 'payment', 'trip_member', 'place'
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- Optimize foreign key lookups and real-time query channels
-- ------------------------------------------------------------------------------
create index if not exists idx_trip_members_user on public.trip_members(user_id);
create index if not exists idx_expenses_trip on public.expenses(trip_id);
create index if not exists idx_expenses_paid_by on public.expenses(paid_by);
create index if not exists idx_expense_splits_user on public.expense_splits(user_id);
create index if not exists idx_payments_trip on public.payments(trip_id);
create index if not exists idx_places_trip on public.places(trip_id);
create index if not exists idx_activity_log_trip on public.activity_log(trip_id, created_at desc);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- High performance security barrier isolating data per trip
-- ------------------------------------------------------------------------------

-- Helper security-definer function to avoid recursive RLS checks
create or replace function public.is_trip_member(lookup_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = lookup_trip_id
      and user_id = auth.uid()
  );
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.payments enable row level security;
alter table public.places enable row level security;
alter table public.activity_log enable row level security;

-- PROFILES POLICIES
create policy "Users can view their own profile and members of shared trips" on public.profiles
  for select using (
    id = auth.uid() or
    exists (
      select 1 from public.trip_members tm1
      join public.trip_members tm2 on tm1.trip_id = tm2.trip_id
      where tm1.user_id = auth.uid() and tm2.user_id = profiles.id
    )
  );

create policy "Users can update their own profile" on public.profiles
  for update using (id = auth.uid());

-- TRIPS POLICIES
create policy "Members can view trips" on public.trips
  for select using (public.is_trip_member(id) or owner_id = auth.uid());

create policy "Authenticated users can create trips" on public.trips
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update trips" on public.trips
  for update using (auth.uid() = owner_id);

create policy "Owners can delete trips" on public.trips
  for delete using (auth.uid() = owner_id);

-- TRIP MEMBERS POLICIES
create policy "Members can view other members of their trips" on public.trip_members
  for select using (public.is_trip_member(trip_id));

create policy "Users can join trips via invite code or owners can add members" on public.trip_members
  for insert with check (
    auth.uid() = user_id or
    exists (
      select 1 from public.trips
      where trips.id = trip_members.trip_id and trips.owner_id = auth.uid()
    )
  );

create policy "Owners can remove members or members can leave" on public.trip_members
  for delete using (
    user_id = auth.uid() or
    exists (
      select 1 from public.trips
      where trips.id = trip_members.trip_id and trips.owner_id = auth.uid()
    )
  );

-- EXPENSES POLICIES
create policy "Members can view expenses" on public.expenses
  for select using (public.is_trip_member(trip_id));

create policy "Members can create expenses" on public.expenses
  for insert with check (public.is_trip_member(trip_id) and auth.uid() = created_by);

create policy "Members can update expenses" on public.expenses
  for update using (public.is_trip_member(trip_id));

create policy "Members can delete expenses" on public.expenses
  for delete using (public.is_trip_member(trip_id));

-- EXPENSE SPLITS POLICIES
create policy "Members can view expense splits" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "Members can insert expense splits" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "Members can update expense splits" on public.expense_splits
  for update using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "Members can delete expense splits" on public.expense_splits
  for delete using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_trip_member(expenses.trip_id)
    )
  );

-- PAYMENTS POLICIES
create policy "Members can view payments" on public.payments
  for select using (public.is_trip_member(trip_id));

create policy "Members can record payments" on public.payments
  for insert with check (public.is_trip_member(trip_id) and auth.uid() = created_by);

create policy "Members can update payments" on public.payments
  for update using (public.is_trip_member(trip_id));

create policy "Members can delete payments" on public.payments
  for delete using (public.is_trip_member(trip_id));

-- PLACES POLICIES
create policy "Members can view places" on public.places
  for select using (public.is_trip_member(trip_id));

create policy "Members can add places" on public.places
  for insert with check (public.is_trip_member(trip_id) and auth.uid() = created_by);

create policy "Members can update places" on public.places
  for update using (public.is_trip_member(trip_id));

create policy "Members can delete places" on public.places
  for delete using (public.is_trip_member(trip_id));

-- ACTIVITY LOG POLICIES
create policy "Members can view activity log" on public.activity_log
  for select using (public.is_trip_member(trip_id));

create policy "Members can create activity log entries" on public.activity_log
  for insert with check (public.is_trip_member(trip_id) and auth.uid() = actor_id);

-- ------------------------------------------------------------------------------
-- REALTIME REPLICATION ENABLEMENT
-- Allows Supabase Realtime WebSocket listeners for collaborative live sync
-- ------------------------------------------------------------------------------
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.places;
alter publication supabase_realtime add table public.trip_members;
alter publication supabase_realtime add table public.activity_log;
