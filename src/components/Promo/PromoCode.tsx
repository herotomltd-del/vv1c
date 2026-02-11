import { useState, useEffect } from 'react';
import { ArrowLeft, Gift, Tag, Check, X, Plus, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface PromoCodeProps {
  onBack: () => void;
}

export default function PromoCode({ onBack }: PromoCodeProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [myPromoCodes, setMyPromoCodes] = useState<any[]>([]);
  const [usedPromoCodes, setUsedPromoCodes] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    creator_commission_percentage: 5,
    user_commission_percentage: 3,
  });
  const [promoSettings, setPromoSettings] = useState<any>(null);

  useEffect(() => {
    loadPromoCodes();
    loadPromoSettings();
  }, [user]);

  const loadPromoSettings = async () => {
    const { data } = await supabase
      .from('promo_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setPromoSettings(data);
      setNewCodeData({
        code: '',
        creator_commission_percentage: data.default_creator_commission_percentage || 5,
        user_commission_percentage: data.default_user_commission_percentage || 3,
      });
    }
  };

  const loadPromoCodes = async () => {
    if (!user) return;

    const { data: myPromos } = await supabase
      .from('user_promo_codes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMyPromoCodes(myPromos || []);

    const { data: usedPromos } = await supabase
      .from('promo_usage')
      .select('*, promo:promo_codes(code, discount_percentage, bonus_amount)')
      .eq('user_id', user.id)
      .order('used_at', { ascending: false });

    setUsedPromoCodes(usedPromos || []);
  };

  const createPromoCode = async () => {
    if (!user || !newCodeData.code.trim()) {
      alert('Please enter a promo code');
      return;
    }

    if (newCodeData.code.length < 6 || newCodeData.code.length > 20) {
      alert('Promo code must be between 6 and 20 characters');
      return;
    }

    if (!promoSettings?.user_creation_enabled) {
      alert('User promo code creation is currently disabled');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_promo_codes')
        .insert({
          user_id: user.id,
          code: newCodeData.code.toUpperCase(),
          creator_commission_percentage: newCodeData.creator_commission_percentage,
          user_commission_percentage: newCodeData.user_commission_percentage,
        });

      if (error) {
        if (error.message.includes('unique')) {
          alert('This promo code already exists. Please choose a different one.');
        } else {
          alert('Failed to create promo code: ' + error.message);
        }
        setLoading(false);
        return;
      }

      alert('Promo code created successfully!');
      setShowCreateForm(false);
      setNewCodeData({
        code: '',
        creator_commission_percentage: promoSettings.default_creator_commission_percentage || 5,
        user_commission_percentage: promoSettings.default_user_commission_percentage || 3,
      });
      await loadPromoCodes();
    } catch (error) {
      console.error('Error creating promo code:', error);
      alert('Failed to create promo code');
    } finally {
      setLoading(false);
    }
  };

  const redeemPromoCode = async () => {
    if (!user || !wallet || !promoCode.trim()) {
      alert('Please enter a promo code');
      return;
    }

    setLoading(true);

    try {
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promoError || !promo) {
        alert('Invalid or expired promo code');
        setLoading(false);
        return;
      }

      if (new Date(promo.expiry_date) < new Date()) {
        alert('This promo code has expired');
        setLoading(false);
        return;
      }

      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        alert('This promo code has reached its usage limit');
        setLoading(false);
        return;
      }

      const { data: existingUsage } = await supabase
        .from('promo_usage')
        .select('id')
        .eq('user_id', user.id)
        .eq('promo_code_id', promo.id)
        .single();

      if (existingUsage) {
        alert('You have already used this promo code');
        setLoading(false);
        return;
      }

      const bonusAmount = promo.bonus_amount || 0;

      await supabase.from('promo_usage').insert({
        user_id: user.id,
        promo_code_id: promo.id,
        bonus_received: bonusAmount,
      });

      await supabase
        .from('promo_codes')
        .update({ current_uses: promo.current_uses + 1 })
        .eq('id', promo.id);

      if (bonusAmount > 0) {
        await supabase
          .from('wallets')
          .update({
            bonus_balance: wallet.bonus_balance + bonusAmount,
          })
          .eq('user_id', user.id);

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'promo_bonus',
          amount: bonusAmount,
          balance_type: 'bonus',
          status: 'completed',
          description: `Promo code bonus: ${promo.code}`,
        });
      }

      alert(`Promo code redeemed successfully! You received ${formatCurrency(bonusAmount)} bonus`);
      setPromoCode('');
      await refreshWallet();
      await loadPromoCodes();
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      alert('Failed to redeem promo code');
    } finally {
      setLoading(false);
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
                <Gift className="w-8 h-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
                <p className="text-gray-400">Redeem codes for bonuses and rewards</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Redeem Code</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none uppercase text-sm sm:text-base"
                />
                <button
                  onClick={redeemPromoCode}
                  disabled={loading || !promoCode.trim()}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold px-6 sm:px-8 py-3 rounded-lg transition disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Tag className="w-5 h-5" />
                  {loading ? 'Redeeming...' : 'Redeem'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Redeemed Promo Codes</h2>
            {usedPromoCodes.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No promo codes redeemed yet</p>
                <p className="text-gray-500 text-sm mt-2">Enter a promo code above to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usedPromoCodes.map((usage) => (
                  <div
                    key={usage.id}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="w-4 h-4 text-yellow-500" />
                        <p className="text-white font-bold">{usage.promo?.code}</p>
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-400">
                        Bonus: {formatCurrency(usage.bonus_received)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Redeemed</p>
                      <p className="text-sm text-gray-400">{formatDate(usage.used_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">My Promo Codes</h2>
              {promoSettings?.user_creation_enabled && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 font-bold px-4 py-2 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Create Code
                </button>
              )}
            </div>

            {showCreateForm && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-4">
                <h3 className="text-lg font-bold text-white mb-4">Create New Promo Code</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Code (6-20 characters)</label>
                    <input
                      type="text"
                      value={newCodeData.code}
                      onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                      placeholder="MYCODE123"
                      maxLength={20}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">Your Commission (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={newCodeData.creator_commission_percentage}
                        onChange={(e) => setNewCodeData({ ...newCodeData, creator_commission_percentage: Number(e.target.value) })}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max: {promoSettings?.default_creator_commission_percentage || 5}%
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-2">User Commission (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={newCodeData.user_commission_percentage}
                        onChange={(e) => setNewCodeData({ ...newCodeData, user_commission_percentage: Number(e.target.value) })}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max: {promoSettings?.default_user_commission_percentage || 3}%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={createPromoCode}
                      disabled={loading || !newCodeData.code.trim()}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold px-6 py-3 rounded-lg transition disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Code'}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {myPromoCodes.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No promo codes created yet</p>
                <p className="text-gray-500 text-sm mt-2">Create your first code to start earning commissions!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myPromoCodes.map((promo) => (
                  <div
                    key={promo.id}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-yellow-500" />
                        <p className="text-white font-bold text-lg">{promo.code}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        promo.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Your Commission
                        </p>
                        <p className="text-green-500 font-semibold">{promo.creator_commission_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          User Commission
                        </p>
                        <p className="text-blue-500 font-semibold">{promo.user_commission_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Uses</p>
                        <p className="text-white font-semibold">{promo.uses || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Earnings</p>
                        <p className="text-yellow-500 font-semibold">{formatCurrency(promo.total_earnings || 0)}</p>
                      </div>
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
