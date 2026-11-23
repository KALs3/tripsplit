/**
 * TypeScript definitions for Supabase Database tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'lodging'
  | 'activities'
  | 'shopping'
  | 'other';

export type TripMemberRole = 'owner' | 'member';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          default_currency: string;
          push_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          default_currency?: string;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          default_currency?: string;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          name: string;
          cover_url: string | null;
          base_currency: string;
          start_date: string | null;
          end_date: string | null;
          owner_id: string;
          archived: boolean;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cover_url?: string | null;
          base_currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          owner_id: string;
          archived?: boolean;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cover_url?: string | null;
          base_currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          owner_id?: string;
          archived?: boolean;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trip_members: {
        Row: {
          trip_id: string;
          user_id: string;
          role: TripMemberRole;
          joined_at: string;
        };
        Insert: {
          trip_id: string;
          user_id: string;
          role?: TripMemberRole;
          joined_at?: string;
        };
        Update: {
          trip_id?: string;
          user_id?: string;
          role?: TripMemberRole;
          joined_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          amount_minor: number;
          currency: string;
          fx_rate_to_base: number;
          category: ExpenseCategory;
          paid_by: string;
          spent_at: string;
          note: string | null;
          receipt_url: string | null;
          place_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          amount_minor: number;
          currency?: string;
          fx_rate_to_base?: number;
          category?: ExpenseCategory;
          paid_by: string;
          spent_at?: string;
          note?: string | null;
          receipt_url?: string | null;
          place_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          title?: string;
          amount_minor?: number;
          currency?: string;
          fx_rate_to_base?: number;
          category?: ExpenseCategory;
          paid_by?: string;
          spent_at?: string;
          note?: string | null;
          receipt_url?: string | null;
          place_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      expense_splits: {
        Row: {
          expense_id: string;
          user_id: string;
          share_minor: number;
        };
        Insert: {
          expense_id: string;
          user_id: string;
          share_minor: number;
        };
        Update: {
          expense_id?: string;
          user_id?: string;
          share_minor?: number;
        };
      };
      payments: {
        Row: {
          id: string;
          trip_id: string;
          from_user: string;
          to_user: string;
          amount_minor: number;
          currency: string;
          fx_rate_to_base: number;
          paid_at: string;
          created_by: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          from_user: string;
          to_user: string;
          amount_minor: number;
          currency?: string;
          fx_rate_to_base?: number;
          paid_at?: string;
          created_by: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          trip_id?: string;
          from_user?: string;
          to_user?: string;
          amount_minor?: number;
          currency?: string;
          fx_rate_to_base?: number;
          paid_at?: string;
          created_by?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
      };
      places: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          lat: number;
          lng: number;
          category: ExpenseCategory;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          lat: number;
          lng: number;
          category?: ExpenseCategory;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          category?: ExpenseCategory;
          note?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          trip_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          actor_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
      };
    };
  };
}
