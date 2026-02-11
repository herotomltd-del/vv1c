import { useState, useEffect } from 'react';
import { ArrowLeft, History as HistoryIcon, TrendingUp, TrendingDown, Gift, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface HistoryProps {
  onBack: () => void;
}

type TabType = 'deposits' | 'withdrawals' | 'bets' | 'bonuses';

export default function History({ onBack }: HistoryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (activeTab === 'deposits') {
        const { data } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setDeposits(data || []);
      } else if (activeTab === 'withdrawals') {
        const { data } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setWithdrawals(data || []);
      } else if (activeTab === 'bets') {
        const { data } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        setBets(data || []);
      } else if (activeTab === 'bonuses') {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('type', ['referral_bonus', 'promo_bonus', 'welcome_bonus', 'deposit_bonus'])
          .order('created_at', { ascending: false })
          .limit(50);
        setBonuses(data || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'won':
        return 'text-green-500 bg-green-500/20';
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/20';
      case 'rejected':
      case 'cancelled':
      case 'lost':
        return 'text-red-500 bg-red-500/20';
      default:
        return 'text-gray-500 bg-gray-500/20';
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
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-full">
                <HistoryIcon className="w-6 sm:w-8 h-6 sm:h-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Transaction History</h1>
                <p className="text-sm text-gray-400">View all your transactions</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('deposits')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'deposits'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Deposits
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'withdrawals'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Withdrawals
              </button>
              <button
                onClick={() => setActiveTab('bets')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'bets'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                Bets
              </button>
              <button
                onClick={() => setActiveTab('bonuses')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'bonuses'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Gift className="w-4 h-4" />
                Bonuses
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTab === 'deposits' && (
                  <>
                    {deposits.length === 0 ? (
                      <div className="text-center py-12">
                        <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No deposits yet</p>
                        <p className="text-gray-500 text-sm mt-2">Your deposit history will appear here</p>
                      </div>
                    ) : (
                      deposits.map((deposit) => (
                        <div
                          key={deposit.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-white font-semibold text-lg">
                                  {formatCurrency(deposit.amount)}
                                </p>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                                    deposit.status
                                  )}`}
                                >
                                  {deposit.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 capitalize">
                                Via {deposit.payment_method}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(deposit.created_at)}
                              </p>
                            </div>
                            {deposit.transaction_id && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Transaction ID</p>
                                <p className="text-sm text-gray-300 font-mono">
                                  {deposit.transaction_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'withdrawals' && (
                  <>
                    {withdrawals.length === 0 ? (
                      <div className="text-center py-12">
                        <TrendingDown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No withdrawals yet</p>
                        <p className="text-gray-500 text-sm mt-2">Your withdrawal history will appear here</p>
                      </div>
                    ) : (
                      withdrawals.map((withdrawal) => (
                        <div
                          key={withdrawal.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-white font-semibold text-lg">
                                  {formatCurrency(withdrawal.amount)}
                                </p>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                                    withdrawal.status
                                  )}`}
                                >
                                  {withdrawal.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 capitalize">
                                Via {withdrawal.payment_method}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(withdrawal.created_at)}
                              </p>
                            </div>
                            {withdrawal.account_details && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Account</p>
                                <p className="text-sm text-gray-300 font-mono">
                                  {withdrawal.account_details.account_number}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'bets' && (
                  <>
                    {bets.length === 0 ? (
                      <div className="text-center py-12">
                        <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No bets yet</p>
                        <p className="text-gray-500 text-sm mt-2">Your betting history will appear here</p>
                      </div>
                    ) : (
                      bets.map((bet) => (
                        <div
                          key={bet.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-white font-semibold">
                                  {bet.game_type || 'Game'}
                                </p>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                                    bet.status
                                  )}`}
                                >
                                  {bet.status}
                                </span>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs">Bet</p>
                                  <p className="text-gray-300">
                                    {formatCurrency(bet.bet_amount)}
                                  </p>
                                </div>
                                {bet.win_amount > 0 && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Won</p>
                                    <p className="text-green-500 font-semibold">
                                      {formatCurrency(bet.win_amount)}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(bet.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'bonuses' && (
                  <>
                    {bonuses.length === 0 ? (
                      <div className="text-center py-12">
                        <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No bonuses yet</p>
                        <p className="text-gray-500 text-sm mt-2">Your bonus history will appear here</p>
                      </div>
                    ) : (
                      bonuses.map((bonus) => (
                        <div
                          key={bonus.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold mb-1">
                                {bonus.type.replace('_', ' ').toUpperCase()}
                              </p>
                              <p className="text-sm text-gray-400">{bonus.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(bonus.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-500">
                                +{formatCurrency(bonus.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
