import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Copy, Gift, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface ReferralProps {
  onBack: () => void;
}

export default function Referral({ onBack }: ReferralProps) {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, earnings: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, [user]);

  const loadReferrals = async () => {
    if (!user) return;

    const { data: referralData } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false });

    setReferrals(referralData || []);

    const { data: earningsData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'referral_bonus');

    const totalEarnings = earningsData?.reduce((sum, t) => sum + t.amount, 0) || 0;

    setStats({
      total: referralData?.length || 0,
      earnings: totalEarnings,
    });
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}?ref=${profile?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getReferralLink = () => {
    return `${window.location.origin}?ref=${profile?.referral_code}`;
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-full">
                <Users className="w-8 h-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Referral Program</h1>
                <p className="text-gray-400">Invite friends and earn rewards</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  <p className="text-sm text-gray-400">Total Referrals</p>
                </div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <p className="text-sm text-gray-400">Total Earnings</p>
                </div>
                <p className="text-3xl font-bold text-green-500">{formatCurrency(stats.earnings)}</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-500" />
                Your Referral Code
              </h3>
              <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between mb-4">
                <code className="text-2xl font-bold text-yellow-500">{profile?.referral_code}</code>
                <button
                  onClick={copyReferralCode}
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Referral Link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={getReferralLink()}
                    readOnly
                    className="flex-1 bg-gray-800 text-gray-300 px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-3">How It Works</h3>
              <ol className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <span>Share your referral code or link with friends</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <span>They sign up using your code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <span>When they make their first deposit, you both get bonuses!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                  <span>Earn ongoing commission from their betting activity</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Referrals</h2>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No referrals yet</p>
                <p className="text-gray-500 text-sm mt-2">Start inviting friends to earn rewards!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-semibold">{referral.full_name || 'User'}</p>
                      <p className="text-sm text-gray-400">{referral.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm text-gray-400">{formatDate(referral.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
