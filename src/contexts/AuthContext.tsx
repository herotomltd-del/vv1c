import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { generateReferralCode, getDeviceFingerprint } from '../lib/utils';

interface UserProfile {
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
  created_at: string;
  updated_at: string;
}

interface Wallet {
  id: string;
  user_id: string;
  main_balance: number;
  bonus_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_wagered: number;
  total_won: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  wallet: Wallet | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setProfile(null);
          setWallet(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      let [profileRes, walletRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      // Handle profile
      if (!profileRes.data && authUser) {
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: userId,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          referral_code: generateReferralCode(),
          device_fingerprint: getDeviceFingerprint(),
        });

        if (profileError) {
          console.error('Profile insert error:', profileError);
        }

        // Always try to fetch profile after insert attempt (it might exist from registration)
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (newProfile) setProfile(newProfile);
      } else if (profileRes.data) {
        if (!profileRes.data.referral_code) {
          const newReferralCode = generateReferralCode();
          await supabase
            .from('user_profiles')
            .update({ referral_code: newReferralCode })
            .eq('id', userId);
          profileRes.data.referral_code = newReferralCode;
        }
        setProfile(profileRes.data);
      }

      // Handle wallet
      if (!walletRes.data) {
        const { error: walletError } = await supabase.from('wallets').insert({
          user_id: userId,
        });

        if (walletError) {
          console.error('Wallet insert error:', walletError);
        }

        // Always try to fetch wallet after insert attempt (it might exist from registration)
        const { data: newWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (newWallet) setWallet(newWallet);
      } else {
        setWallet(walletRes.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshWallet = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setWallet(data);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    try {
      const referralCodeToUse = generateReferralCode();
      const referredById = referralCode
        ? (await supabase.from('user_profiles').select('id').eq('referral_code', referralCode).maybeSingle())?.data?.id
        : null;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        referral_code: referralCodeToUse,
        referred_by: referredById || null,
        device_fingerprint: getDeviceFingerprint(),
      });

      if (profileError) throw profileError;

      const { error: walletError } = await supabase.from('wallets').insert({
        user_id: authData.user.id,
      });

      if (walletError) throw walletError;

      if (referredById) {
        await supabase.from('referrals').insert({
          referrer_id: referredById,
          referred_id: authData.user.id,
        });
      }

      await supabase.from('activity_logs').insert({
        user_id: authData.user.id,
        action: 'user_registered',
        entity_type: 'user',
        entity_id: authData.user.id,
      });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallet,
        loading,
        signUp,
        signIn,
        signOut,
        refreshWallet,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
