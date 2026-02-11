import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          full_name: string | null;
          referral_code: string;
          referred_by: string | null;
          is_agent: boolean;
          is_admin: boolean;
          is_active: boolean;
          kyc_verified: boolean;
          device_fingerprint: string | null;
          last_ip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          referral_code: string;
          referred_by?: string | null;
          is_agent?: boolean;
          is_admin?: boolean;
          is_active?: boolean;
          kyc_verified?: boolean;
          device_fingerprint?: string | null;
          last_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          referral_code?: string;
          referred_by?: string | null;
          is_agent?: boolean;
          is_admin?: boolean;
          is_active?: boolean;
          kyc_verified?: boolean;
          device_fingerprint?: string | null;
          last_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          main_balance: number;
          bonus_balance: number;
          total_deposited: number;
          total_withdrawn: number;
          total_wagered: number;
          total_won: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
