import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Users, CreditCard, Banknote, Gamepad2, TrendingUp, X, Trophy, Gift, BarChart3, Edit2, Save, Bot, Tag } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import FakeBettingManager from './FakeBettingManager';

interface AdminPanelProps {
  onClose: () => void;
}

type Tab = 'deposits' | 'withdrawals' | 'users' | 'games' | 'cricket' | 'settings' | 'stats' | 'bonuses' | 'analytics' | 'fake_betting' | 'payment_gateways';

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [games, setGames] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [bonusSettings, setBonusSettings] = useState<any>({});
  const [promoCodeSettings, setPromoCodeSettings] = useState<any>({});
  const [referralDomainSettings, setReferralDomainSettings] = useState<any>({});
  const [allReferralDomains, setAllReferralDomains] = useState<any[]>([]);
  const [cricketMatches, setCricketMatches] = useState<any[]>([]);
  const [cricketTeams, setCricketTeams] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [userEdits, setUserEdits] = useState<any>({});
  const [gameEdits, setGameEdits] = useState<any>({});
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [paymentGateways, setPaymentGateways] = useState<any[]>([]);
  const [editingGateway, setEditingGateway] = useState<string | null>(null);
  const [gatewayEdits, setGatewayEdits] = useState<any>({});
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [newGateway, setNewGateway] = useState({
    method: '',
    min_deposit: 100,
    max_deposit: 100000,
    min_withdrawal: 500,
    max_withdrawal: 50000,
    is_active: true,
    account_number: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'deposits') {
      const { data } = await supabase
        .from('deposit_requests')
        .select('*, user_profiles(full_name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(50);
      setDeposits(data || []);
    } else if (activeTab === 'withdrawals') {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*, user_profiles(full_name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(50);
      setWithdrawals(data || []);
    } else if (activeTab === 'users') {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        setUsers([]);
        return;
      }

      const usersWithWallets = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            ...profile,
            wallets: wallet
          };
        })
      );

      setUsers(usersWithWallets);
    } else if (activeTab === 'stats') {
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { data: walletsSum } = await supabase
        .from('wallets')
        .select('main_balance, bonus_balance, total_deposited, total_withdrawn, total_wagered, total_won');

      const totalMainBalance = walletsSum?.reduce((sum, w) => sum + (w.main_balance || 0), 0) || 0;
      const totalBonusBalance = walletsSum?.reduce((sum, w) => sum + (w.bonus_balance || 0), 0) || 0;
      const totalDeposited = walletsSum?.reduce((sum, w) => sum + (w.total_deposited || 0), 0) || 0;
      const totalWithdrawn = walletsSum?.reduce((sum, w) => sum + (w.total_withdrawn || 0), 0) || 0;
      const totalWagered = walletsSum?.reduce((sum, w) => sum + (w.total_wagered || 0), 0) || 0;
      const totalWon = walletsSum?.reduce((sum, w) => sum + (w.total_won || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalMainBalance,
        totalBonusBalance,
        totalBalance: totalMainBalance + totalBonusBalance,
        totalDeposited,
        totalWithdrawn,
        totalWagered,
        totalWon,
      });
    } else if (activeTab === 'games') {
      const { data } = await supabase
        .from('games')
        .select('*')
        .order('name');
      setGames(data || []);
    } else if (activeTab === 'bonuses') {
      const { data } = await supabase
        .from('bonus_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      setBonusSettings(data || {
        welcome_bonus_enabled: false,
        welcome_bonus_amount: 100,
        login_bonus_enabled: false,
        login_bonus_amount: 10,
        bonus_loss_percentage: 50
      });

      const { data: promoData } = await supabase
        .from('promo_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      setPromoCodeSettings(promoData || {
        user_creation_enabled: true,
        max_codes_per_user: 10,
        default_creator_commission_percentage: 5,
        default_user_commission_percentage: 3,
        default_discount_percentage: 5,
        default_referrer_percentage: 2,
      });

      const { data: domainData } = await supabase
        .from('referral_domain_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      setReferralDomainSettings(domainData || {
        custom_domains_enabled: true,
        max_domains_per_user: 5,
        require_domain_verification: false,
      });

      const { data: domainsData } = await supabase
        .from('referral_domains')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setAllReferralDomains(domainsData || []);
    } else if (activeTab === 'payment_gateways') {
      const { data: gatewaysData } = await supabase
        .from('payment_settings')
        .select('*')
        .order('created_at', { ascending: false });

      setPaymentGateways(gatewaysData || []);
    } else if (activeTab === 'analytics') {
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, referral_code')
        .order('created_at', { ascending: false });

      if (!usersData) {
        setAnalytics([]);
        return;
      }

      const analyticsData = await Promise.all(
        usersData.map(async (user) => {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('total_deposited, total_withdrawn, total_wagered, total_won')
            .eq('user_id', user.id)
            .maybeSingle();

          const { count: referralCount } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', user.referral_code);

          const { data: referralEarnings } = await supabase
            .from('referral_commissions')
            .select('commission_amount')
            .eq('user_id', user.id);

          const totalReferralEarnings = referralEarnings?.reduce(
            (sum, r) => sum + (r.commission_amount || 0),
            0
          ) || 0;

          return {
            ...user,
            wallets: wallet || { total_deposited: 0, total_withdrawn: 0, total_wagered: 0, total_won: 0 },
            referral_count: referralCount || 0,
            referral_earnings: totalReferralEarnings,
          };
        })
      );

      setAnalytics(analyticsData);
    } else if (activeTab === 'cricket') {
      const { data: teamsData } = await supabase
        .from('cricket_teams')
        .select('*')
        .order('name');
      setCricketTeams(teamsData || []);

      const { data: matchesData } = await supabase
        .from('cricket_matches')
        .select('*, team1:cricket_teams!team1_id(name, short_name), team2:cricket_teams!team2_id(name, short_name)')
        .order('start_time', { ascending: false });
      setCricketMatches(matchesData || []);
    } else if (activeTab === 'settings') {
      const { data } = await supabase
        .from('admin_settings')
        .select('*');

      const settingsObj: any = {};
      data?.forEach((setting) => {
        settingsObj[setting.key] = setting.value;
      });
      setSettings(settingsObj);
    }
  };

  const handleApproveDeposit = async (depositId: string, userId: string, amount: number) => {
    try {
      await supabase
        .from('deposit_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', depositId);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('main_balance, total_deposited')
        .eq('user_id', userId)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            main_balance: wallet.main_balance + amount,
            total_deposited: wallet.total_deposited + amount,
          })
          .eq('user_id', userId);
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount,
        balance_type: 'main',
        status: 'completed',
        description: 'Deposit approved by admin',
      });

      alert('Deposit approved successfully');
      loadData();
    } catch (error) {
      console.error('Error approving deposit:', error);
      alert('Failed to approve deposit');
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string, userId: string, amount: number) => {
    try {
      await supabase
        .from('withdrawal_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('total_withdrawn')
        .eq('user_id', userId)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            total_withdrawn: wallet.total_withdrawn + amount,
          })
          .eq('user_id', userId);
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'withdrawal',
        amount: -amount,
        balance_type: 'main',
        status: 'completed',
        description: 'Withdrawal approved by admin',
      });

      alert('Withdrawal approved successfully');
      loadData();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Failed to approve withdrawal');
    }
  };

  const handleReject = async (table: string, id: string) => {
    try {
      await supabase
        .from(table)
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', id);

      alert('Request rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const edits = userEdits[userId];
      if (!edits) return;

      if (edits.profile) {
        await supabase
          .from('user_profiles')
          .update(edits.profile)
          .eq('id', userId);
      }

      if (edits.wallet) {
        await supabase
          .from('wallets')
          .update(edits.wallet)
          .eq('user_id', userId);
      }

      alert('User updated successfully');
      setEditingUser(null);
      setUserEdits({});
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleSaveGame = async (gameId: string) => {
    try {
      const edits = gameEdits[gameId];
      if (!edits) return;

      await supabase
        .from('games')
        .update(edits)
        .eq('id', gameId);

      alert('Game updated successfully');
      setEditingGame(null);
      setGameEdits({});
      loadData();
    } catch (error) {
      console.error('Error updating game:', error);
      alert('Failed to update game');
    }
  };

  const handleSaveBonusSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from('bonus_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('bonus_settings')
          .update({
            ...bonusSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('bonus_settings')
          .insert(bonusSettings);
      }

      alert('Bonus settings saved successfully');
      loadData();
    } catch (error) {
      console.error('Error saving bonus settings:', error);
      alert('Failed to save bonus settings');
    }
  };

  const handleSavePromoCodeSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from('promo_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('promo_settings')
          .update({
            ...promoCodeSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('promo_settings')
          .insert(promoCodeSettings);
      }

      alert('Promo code settings saved successfully');
      loadData();
    } catch (error) {
      console.error('Error saving promo code settings:', error);
      alert('Failed to save promo code settings');
    }
  };

  const handleSaveReferralDomainSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from('referral_domain_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('referral_domain_settings')
          .update({
            ...referralDomainSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('referral_domain_settings')
          .insert(referralDomainSettings);
      }

      alert('Referral domain settings saved successfully');
      loadData();
    } catch (error) {
      console.error('Error saving referral domain settings:', error);
      alert('Failed to save referral domain settings');
    }
  };

  const handleToggleDomainStatus = async (domainId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('referral_domains')
        .update({ is_active: !currentStatus })
        .eq('id', domainId);

      alert('Domain status updated');
      loadData();
    } catch (error) {
      console.error('Error toggling domain:', error);
      alert('Failed to update domain status');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      await supabase
        .from('referral_domains')
        .delete()
        .eq('id', domainId);

      alert('Domain deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert('Failed to delete domain');
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      alert('Please enter a domain name');
      return;
    }

    try {
      const { error } = await supabase
        .from('referral_domains')
        .insert({
          domain: newDomain.trim(),
          is_active: true,
        });

      if (error) {
        if (error.message.includes('unique')) {
          alert('This domain already exists');
        } else {
          alert('Failed to add domain: ' + error.message);
        }
        return;
      }

      alert('Domain added successfully!');
      setNewDomain('');
      setShowAddDomain(false);
      loadData();
    } catch (error) {
      console.error('Error adding domain:', error);
      alert('Failed to add domain');
    }
  };

  const handleAddGateway = async () => {
    if (!newGateway.method.trim()) {
      alert('Please enter a gateway name');
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_settings')
        .insert(newGateway);

      if (error) {
        if (error.message.includes('unique')) {
          alert('This payment method already exists');
        } else {
          alert('Failed to add gateway: ' + error.message);
        }
        return;
      }

      alert('Payment gateway added successfully!');
      setNewGateway({
        method: '',
        min_deposit: 100,
        max_deposit: 100000,
        min_withdrawal: 500,
        max_withdrawal: 50000,
        is_active: true,
        account_number: '',
        notes: '',
      });
      setShowAddGateway(false);
      loadData();
    } catch (error) {
      console.error('Error adding gateway:', error);
      alert('Failed to add gateway');
    }
  };

  const handleToggleGatewayStatus = async (gatewayId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('payment_settings')
        .update({ is_active: !currentStatus })
        .eq('id', gatewayId);

      alert('Gateway status updated');
      loadData();
    } catch (error) {
      console.error('Error toggling gateway:', error);
      alert('Failed to update gateway status');
    }
  };

  const handleDeleteGateway = async (gatewayId: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) return;

    try {
      await supabase
        .from('payment_settings')
        .delete()
        .eq('id', gatewayId);

      alert('Gateway deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting gateway:', error);
      alert('Failed to delete gateway');
    }
  };

  const handleSaveGatewayEdit = async (gatewayId: string) => {
    try {
      const updates = gatewayEdits[gatewayId];
      await supabase
        .from('payment_settings')
        .update(updates)
        .eq('id', gatewayId);

      alert('Gateway updated successfully');
      setEditingGateway(null);
      setGatewayEdits({});
      loadData();
    } catch (error) {
      console.error('Error updating gateway:', error);
      alert('Failed to update gateway');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 flex-1 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-gray-900" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-800">Complete platform control</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-900 hover:bg-gray-800 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="border-b border-gray-700 overflow-x-auto flex-shrink-0">
            <div className="flex gap-2 p-4">
              {[
                { id: 'stats', label: 'Statistics', icon: TrendingUp },
                { id: 'deposits', label: 'Deposits', icon: CreditCard },
                { id: 'withdrawals', label: 'Withdrawals', icon: Banknote },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'games', label: 'Games', icon: Gamepad2 },
                { id: 'fake_betting', label: 'Fake Betting', icon: Bot },
                { id: 'bonuses', label: 'Bonuses', icon: Gift },
                { id: 'payment_gateways', label: 'Payment Gateways', icon: CreditCard },
                { id: 'cricket', label: 'Cricket', icon: Trophy },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-6 h-6 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">Total Users</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                    <h3 className="text-lg font-semibold text-white">Total Deposited</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-500">
                    {formatCurrency(stats.totalDeposited)}
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Banknote className="w-6 h-6 text-red-500" />
                    <h3 className="text-lg font-semibold text-white">Total Withdrawn</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-500">
                    {formatCurrency(stats.totalWithdrawn)}
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-white">User Balances</h3>
                  </div>
                  <p className="text-3xl font-bold text-yellow-500">
                    {formatCurrency(stats.totalBalance)}
                  </p>
                  <div className="mt-2 text-sm text-gray-400">
                    <div>Main: {formatCurrency(stats.totalMainBalance)}</div>
                    <div>Bonus: {formatCurrency(stats.totalBonusBalance)}</div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <Gamepad2 className="w-6 h-6 text-purple-500" />
                    <h3 className="text-lg font-semibold text-white">Total Wagered</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-500">
                    {formatCurrency(stats.totalWagered)}
                  </p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-white">Platform Profit</h3>
                  </div>
                  <p className="text-3xl font-bold text-emerald-500">
                    {formatCurrency(stats.totalDeposited - stats.totalWithdrawn)}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'deposits' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Deposit Requests</h2>
                {deposits.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No deposit requests</p>
                ) : (
                  <div className="space-y-3">
                    {deposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-white font-semibold">
                              {deposit.user_profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {deposit.user_profiles?.email}
                            </p>
                            {deposit.user_profiles?.phone && (
                              <p className="text-sm text-gray-400">
                                Phone: {deposit.user_profiles.phone}
                              </p>
                            )}
                            <p className="text-sm text-gray-400 mt-1">
                              {formatDate(deposit.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-500">
                              {formatCurrency(deposit.amount)}
                            </p>
                            <p className="text-sm text-gray-400 capitalize">
                              via {deposit.payment_method}
                            </p>
                            {deposit.transaction_id && (
                              <p className="text-xs text-gray-500">TxID: {deposit.transaction_id}</p>
                            )}
                          </div>
                          {deposit.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleApproveDeposit(
                                    deposit.id,
                                    deposit.user_id,
                                    deposit.amount
                                  )
                                }
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject('deposit_requests', deposit.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {deposit.status !== 'pending' && (
                            <span
                              className={`px-4 py-2 rounded-lg font-semibold capitalize ${
                                deposit.status === 'approved'
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-red-500/20 text-red-500'
                              }`}
                            >
                              {deposit.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'withdrawals' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Withdrawal Requests</h2>
                {withdrawals.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No withdrawal requests</p>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="text-white font-semibold">
                              {withdrawal.user_profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {withdrawal.user_profiles?.email}
                            </p>
                            {withdrawal.user_profiles?.phone && (
                              <p className="text-sm text-gray-400">
                                Phone: {withdrawal.user_profiles.phone}
                              </p>
                            )}
                            <p className="text-sm text-gray-400 mt-1">
                              {formatDate(withdrawal.created_at)}
                            </p>
                            {withdrawal.account_details && (
                              <p className="text-xs text-gray-500 mt-1">
                                Account: {withdrawal.account_details.account_number} (
                                {withdrawal.account_details.account_name})
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-yellow-500">
                              {formatCurrency(withdrawal.amount)}
                            </p>
                            <p className="text-sm text-gray-400 capitalize">
                              via {withdrawal.payment_method}
                            </p>
                          </div>
                          {withdrawal.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleApproveWithdrawal(
                                    withdrawal.id,
                                    withdrawal.user_id,
                                    withdrawal.amount
                                  )
                                }
                                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-semibold transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject('withdrawal_requests', withdrawal.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {withdrawal.status !== 'pending' && (
                            <span
                              className={`px-4 py-2 rounded-lg font-semibold capitalize ${
                                withdrawal.status === 'approved'
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-red-500/20 text-red-500'
                              }`}
                            >
                              {withdrawal.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
                {users.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => {
                      const isEditing = editingUser === user.id;
                      const wallet = user.wallets;

                      return (
                        <div
                          key={user.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Full Name</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      defaultValue={user.full_name}
                                      onChange={(e) =>
                                        setUserEdits({
                                          ...userEdits,
                                          [user.id]: {
                                            ...userEdits[user.id],
                                            profile: {
                                              ...userEdits[user.id]?.profile,
                                              full_name: e.target.value,
                                            },
                                          },
                                        })
                                      }
                                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                                    />
                                  ) : (
                                    <p className="text-white font-semibold">{user.full_name || 'N/A'}</p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                                  <p className="text-gray-300">{user.email || 'N/A'}</p>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Main Balance</label>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      defaultValue={wallet?.main_balance || 0}
                                      onChange={(e) =>
                                        setUserEdits({
                                          ...userEdits,
                                          [user.id]: {
                                            ...userEdits[user.id],
                                            wallet: {
                                              ...userEdits[user.id]?.wallet,
                                              main_balance: Number(e.target.value),
                                            },
                                          },
                                        })
                                      }
                                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                                    />
                                  ) : (
                                    <p className="text-yellow-500 font-bold">
                                      {wallet ? formatCurrency(wallet.main_balance) : '৳0'}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Bonus Balance</label>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      defaultValue={wallet?.bonus_balance || 0}
                                      onChange={(e) =>
                                        setUserEdits({
                                          ...userEdits,
                                          [user.id]: {
                                            ...userEdits[user.id],
                                            wallet: {
                                              ...userEdits[user.id]?.wallet,
                                              bonus_balance: Number(e.target.value),
                                            },
                                          },
                                        })
                                      }
                                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                                    />
                                  ) : (
                                    <p className="text-blue-500 font-bold">
                                      {wallet ? formatCurrency(wallet.bonus_balance) : '৳0'}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Total Deposited</label>
                                  <p className="text-green-500 font-semibold">
                                    {wallet ? formatCurrency(wallet.total_deposited) : '৳0'}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Total Withdrawn</label>
                                  <p className="text-red-500 font-semibold">
                                    {wallet ? formatCurrency(wallet.total_withdrawn) : '৳0'}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Total Wagered</label>
                                  <p className="text-purple-500 font-semibold">
                                    {wallet ? formatCurrency(wallet.total_wagered) : '৳0'}
                                  </p>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Status</label>
                                  {isEditing ? (
                                    <select
                                      defaultValue={user.is_active ? 'true' : 'false'}
                                      onChange={(e) =>
                                        setUserEdits({
                                          ...userEdits,
                                          [user.id]: {
                                            ...userEdits[user.id],
                                            profile: {
                                              ...userEdits[user.id]?.profile,
                                              is_active: e.target.value === 'true',
                                            },
                                          },
                                        })
                                      }
                                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                                    >
                                      <option value="true">Active</option>
                                      <option value="false">Inactive</option>
                                    </select>
                                  ) : (
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                        user.is_active
                                          ? 'bg-green-500/20 text-green-500'
                                          : 'bg-red-500/20 text-red-500'
                                      }`}
                                    >
                                      {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Admin</label>
                                  {isEditing ? (
                                    <select
                                      defaultValue={user.is_admin ? 'true' : 'false'}
                                      onChange={(e) =>
                                        setUserEdits({
                                          ...userEdits,
                                          [user.id]: {
                                            ...userEdits[user.id],
                                            profile: {
                                              ...userEdits[user.id]?.profile,
                                              is_admin: e.target.value === 'true',
                                            },
                                          },
                                        })
                                      }
                                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                                    >
                                      <option value="false">No</option>
                                      <option value="true">Yes</option>
                                    </select>
                                  ) : (
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                        user.is_admin
                                          ? 'bg-yellow-500/20 text-yellow-500'
                                          : 'bg-gray-600/20 text-gray-400'
                                      }`}
                                    >
                                      {user.is_admin ? 'Yes' : 'No'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {!isEditing ? (
                                <button
                                  onClick={() => setEditingUser(user.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSaveUser(user.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUser(null);
                                      setUserEdits({});
                                    }}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">User Analytics & Referrals</h2>
                {analytics.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Loading analytics...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-400 font-semibold p-3">User</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Referrals</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Ref. Earnings</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Deposited</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Withdrawn</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Wagered</th>
                          <th className="text-right text-gray-400 font-semibold p-3">Won</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.map((user) => (
                          <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                            <td className="p-3">
                              <div>
                                <p className="text-white font-semibold">{user.full_name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-3 text-right text-blue-500 font-semibold">
                              {user.referral_count}
                            </td>
                            <td className="p-3 text-right text-green-500 font-semibold">
                              {formatCurrency(user.referral_earnings)}
                            </td>
                            <td className="p-3 text-right text-emerald-500 font-semibold">
                              {user.wallets ? formatCurrency(user.wallets.total_deposited) : '৳0'}
                            </td>
                            <td className="p-3 text-right text-red-500 font-semibold">
                              {user.wallets ? formatCurrency(user.wallets.total_withdrawn) : '৳0'}
                            </td>
                            <td className="p-3 text-right text-purple-500 font-semibold">
                              {user.wallets ? formatCurrency(user.wallets.total_wagered) : '৳0'}
                            </td>
                            <td className="p-3 text-right text-yellow-500 font-semibold">
                              {user.wallets ? formatCurrency(user.wallets.total_won) : '৳0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Game Management</h2>
                {games.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No games found</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {games.map((game) => {
                      const isEditing = editingGame === game.id;

                      return (
                        <div
                          key={game.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-white">{game.name}</h3>
                              <p className="text-sm text-gray-400 capitalize">{game.type}</p>
                            </div>
                            <button
                              onClick={async () => {
                                const newStatus = !game.is_active;
                                await supabase
                                  .from('games')
                                  .update({ is_active: newStatus })
                                  .eq('id', game.id);
                                loadData();
                              }}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                game.is_active
                                  ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                  : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                              }`}
                            >
                              {game.is_active ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-gray-400 block mb-1">Min Bet:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={game.min_bet}
                                  onChange={(e) =>
                                    setGameEdits({
                                      ...gameEdits,
                                      [game.id]: {
                                        ...gameEdits[game.id],
                                        min_bet: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                                />
                              ) : (
                                <p className="text-white font-semibold">{formatCurrency(game.min_bet)}</p>
                              )}
                            </div>

                            <div>
                              <span className="text-gray-400 block mb-1">Max Bet:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={game.max_bet}
                                  onChange={(e) =>
                                    setGameEdits({
                                      ...gameEdits,
                                      [game.id]: {
                                        ...gameEdits[game.id],
                                        max_bet: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                                />
                              ) : (
                                <p className="text-white font-semibold">{formatCurrency(game.max_bet)}</p>
                              )}
                            </div>

                            <div>
                              <span className="text-gray-400 block mb-1">RTP %:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  defaultValue={game.rtp_percentage}
                                  onChange={(e) =>
                                    setGameEdits({
                                      ...gameEdits,
                                      [game.id]: {
                                        ...gameEdits[game.id],
                                        rtp_percentage: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                                />
                              ) : (
                                <p className="text-white font-semibold">{game.rtp_percentage}%</p>
                              )}
                            </div>

                            <div>
                              <span className="text-gray-400 block mb-1">Profit %:</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  defaultValue={game.profit_percentage || game.house_edge}
                                  onChange={(e) =>
                                    setGameEdits({
                                      ...gameEdits,
                                      [game.id]: {
                                        ...gameEdits[game.id],
                                        profit_percentage: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                                />
                              ) : (
                                <p className="text-white font-semibold">
                                  {game.profit_percentage || game.house_edge}%
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!isEditing ? (
                              <button
                                onClick={() => setEditingGame(game.id)}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveGame(game.id)}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingGame(null);
                                    setGameEdits({});
                                  }}
                                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bonuses' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Bonus Settings</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-green-500" />
                      Welcome Bonus
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Enable Welcome Bonus</label>
                        <button
                          onClick={() =>
                            setBonusSettings({
                              ...bonusSettings,
                              welcome_bonus_enabled: !bonusSettings.welcome_bonus_enabled,
                            })
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            bonusSettings.welcome_bonus_enabled
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {bonusSettings.welcome_bonus_enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Bonus Amount (৳)</label>
                        <input
                          type="number"
                          value={bonusSettings.welcome_bonus_amount || 0}
                          onChange={(e) =>
                            setBonusSettings({
                              ...bonusSettings,
                              welcome_bonus_amount: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-blue-500" />
                      Daily Login Bonus
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Enable Login Bonus</label>
                        <button
                          onClick={() =>
                            setBonusSettings({
                              ...bonusSettings,
                              login_bonus_enabled: !bonusSettings.login_bonus_enabled,
                            })
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            bonusSettings.login_bonus_enabled
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {bonusSettings.login_bonus_enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Bonus Amount (৳)</label>
                        <input
                          type="number"
                          value={bonusSettings.login_bonus_amount || 0}
                          onChange={(e) =>
                            setBonusSettings({
                              ...bonusSettings,
                              login_bonus_amount: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 md:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      Bonus Wagering Requirements
                    </h3>
                    <div>
                      <label className="text-sm text-gray-400 block mb-2">
                        Required Loss Percentage (%) - Users must lose this % of bonus to withdraw
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={bonusSettings.bonus_loss_percentage || 0}
                        onChange={(e) =>
                          setBonusSettings({
                            ...bonusSettings,
                            bonus_loss_percentage: Number(e.target.value),
                          })
                        }
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Example: If set to 50%, users must lose 50% of their bonus before they can withdraw
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveBonusSettings}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Bonus Settings
                </button>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/30 mt-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="w-6 h-6 text-yellow-500" />
                    Promo Code System Settings
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Enable User Code Creation</label>
                        <button
                          onClick={() =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              user_creation_enabled: !promoCodeSettings.user_creation_enabled,
                            })
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            promoCodeSettings.user_creation_enabled
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {promoCodeSettings.user_creation_enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Max Codes Per User</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={promoCodeSettings.max_codes_per_user || 10}
                          onChange={(e) =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              max_codes_per_user: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Default Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={promoCodeSettings.default_discount_percentage || 5}
                          onChange={(e) =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              default_discount_percentage: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Default Creator Commission (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={promoCodeSettings.default_creator_commission_percentage || 5}
                          onChange={(e) =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              default_creator_commission_percentage: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Commission earned by the promo code creator
                        </p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Default User Commission (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={promoCodeSettings.default_user_commission_percentage || 3}
                          onChange={(e) =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              default_user_commission_percentage: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Bonus earned by users who use the promo code
                        </p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Default Referrer (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={promoCodeSettings.default_referrer_percentage || 2}
                          onChange={(e) =>
                            setPromoCodeSettings({
                              ...promoCodeSettings,
                              default_referrer_percentage: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePromoCodeSettings}
                    className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Promo Code Settings
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-500/30 mt-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-500" />
                    Referral Domain System Settings
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Enable Custom Domains</label>
                        <button
                          onClick={() =>
                            setReferralDomainSettings({
                              ...referralDomainSettings,
                              custom_domains_enabled: !referralDomainSettings.custom_domains_enabled,
                            })
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            referralDomainSettings.custom_domains_enabled
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {referralDomainSettings.custom_domains_enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Max Domains Per User</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={referralDomainSettings.max_domains_per_user || 5}
                          onChange={(e) =>
                            setReferralDomainSettings({
                              ...referralDomainSettings,
                              max_domains_per_user: Number(e.target.value),
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Require Domain Verification</label>
                        <button
                          onClick={() =>
                            setReferralDomainSettings({
                              ...referralDomainSettings,
                              require_domain_verification: !referralDomainSettings.require_domain_verification,
                            })
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            referralDomainSettings.require_domain_verification
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {referralDomainSettings.require_domain_verification ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Allowed Domain Pattern</label>
                        <input
                          type="text"
                          value={referralDomainSettings.allowed_domain_pattern || '.*'}
                          onChange={(e) =>
                            setReferralDomainSettings({
                              ...referralDomainSettings,
                              allowed_domain_pattern: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                          placeholder=".*"
                        />
                        <p className="text-xs text-gray-500 mt-1">Regex pattern for domain validation</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveReferralDomainSettings}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Referral Domain Settings
                  </button>

                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Manage Referral Domains ({allReferralDomains.length})</h3>
                      <button
                        onClick={() => setShowAddDomain(!showAddDomain)}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-4 py-2 rounded-lg transition"
                      >
                        <Settings className="w-4 h-4" />
                        {showAddDomain ? 'Cancel' : 'Add Domain'}
                      </button>
                    </div>

                    {showAddDomain && (
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600">
                        <label className="text-sm text-gray-400 block mb-2">Domain Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="example.com or https://example.com"
                            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                          />
                          <button
                            onClick={handleAddDomain}
                            disabled={!newDomain.trim()}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Add domains that users can select for their referral links
                        </p>
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-white mb-4">All Referral Domains ({allReferralDomains.length})</h3>
                    {allReferralDomains.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No custom domains registered yet</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {allReferralDomains.map((domain) => (
                          <div
                            key={domain.id}
                            className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between border border-gray-600"
                          >
                            <div className="flex-1">
                              <p className="text-white font-semibold">{domain.domain}</p>
                              <p className="text-xs text-gray-500">Added: {formatDate(domain.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleDomainStatus(domain.id, domain.is_active)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                  domain.is_active
                                    ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                    : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                }`}
                              >
                                {domain.is_active ? 'Active' : 'Inactive'}
                              </button>
                              <button
                                onClick={() => handleDeleteDomain(domain.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment_gateways' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Payment Gateway Management</h2>
                  <button
                    onClick={() => setShowAddGateway(!showAddGateway)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-4 py-2 rounded-lg transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    {showAddGateway ? 'Cancel' : 'Add Gateway'}
                  </button>
                </div>

                {showAddGateway && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">Add New Payment Gateway</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Gateway Name</label>
                        <input
                          type="text"
                          value={newGateway.method}
                          onChange={(e) => setNewGateway({ ...newGateway, method: e.target.value.toLowerCase() })}
                          placeholder="e.g., bkash, nagad, rocket, upay"
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Status</label>
                        <select
                          value={newGateway.is_active ? 'active' : 'inactive'}
                          onChange={(e) => setNewGateway({ ...newGateway, is_active: e.target.value === 'active' })}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Min Deposit (৳)</label>
                        <input
                          type="number"
                          value={newGateway.min_deposit}
                          onChange={(e) => setNewGateway({ ...newGateway, min_deposit: Number(e.target.value) })}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Max Deposit (৳)</label>
                        <input
                          type="number"
                          value={newGateway.max_deposit}
                          onChange={(e) => setNewGateway({ ...newGateway, max_deposit: Number(e.target.value) })}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Min Withdrawal (৳)</label>
                        <input
                          type="number"
                          value={newGateway.min_withdrawal}
                          onChange={(e) => setNewGateway({ ...newGateway, min_withdrawal: Number(e.target.value) })}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">Max Withdrawal (৳)</label>
                        <input
                          type="number"
                          value={newGateway.max_withdrawal}
                          onChange={(e) => setNewGateway({ ...newGateway, max_withdrawal: Number(e.target.value) })}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-400 block mb-2">Account Number</label>
                        <input
                          type="text"
                          value={newGateway.account_number}
                          onChange={(e) => setNewGateway({ ...newGateway, account_number: e.target.value })}
                          placeholder="Enter account number or payment details"
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-400 block mb-2">Notes</label>
                        <textarea
                          value={newGateway.notes}
                          onChange={(e) => setNewGateway({ ...newGateway, notes: e.target.value })}
                          placeholder="Add any additional notes or instructions"
                          rows={3}
                          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-green-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddGateway}
                      disabled={!newGateway.method.trim()}
                      className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition disabled:cursor-not-allowed"
                    >
                      Add Payment Gateway
                    </button>
                  </div>
                )}

                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">All Payment Gateways ({paymentGateways.length})</h3>
                  {paymentGateways.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No payment gateways configured yet</p>
                      <p className="text-gray-500 text-sm mt-2">Add payment methods for deposits and withdrawals</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentGateways.map((gateway) => (
                        <div
                          key={gateway.id}
                          className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                        >
                          {editingGateway === gateway.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Gateway Name</label>
                                  <input
                                    type="text"
                                    value={gatewayEdits[gateway.id]?.method || gateway.method}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          method: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Status</label>
                                  <select
                                    value={
                                      gatewayEdits[gateway.id]?.is_active !== undefined
                                        ? gatewayEdits[gateway.id].is_active
                                          ? 'active'
                                          : 'inactive'
                                        : gateway.is_active
                                        ? 'active'
                                        : 'inactive'
                                    }
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          is_active: e.target.value === 'active',
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Min Deposit (৳)</label>
                                  <input
                                    type="number"
                                    value={gatewayEdits[gateway.id]?.min_deposit ?? gateway.min_deposit}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          min_deposit: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Max Deposit (৳)</label>
                                  <input
                                    type="number"
                                    value={gatewayEdits[gateway.id]?.max_deposit ?? gateway.max_deposit}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          max_deposit: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Min Withdrawal (৳)</label>
                                  <input
                                    type="number"
                                    value={gatewayEdits[gateway.id]?.min_withdrawal ?? gateway.min_withdrawal}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          min_withdrawal: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-gray-400 block mb-2">Max Withdrawal (৳)</label>
                                  <input
                                    type="number"
                                    value={gatewayEdits[gateway.id]?.max_withdrawal ?? gateway.max_withdrawal}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          max_withdrawal: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-sm text-gray-400 block mb-2">Account Number</label>
                                  <input
                                    type="text"
                                    value={gatewayEdits[gateway.id]?.account_number ?? gateway.account_number ?? ''}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          account_number: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="Enter account number or payment details"
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-sm text-gray-400 block mb-2">Notes</label>
                                  <textarea
                                    value={gatewayEdits[gateway.id]?.notes ?? gateway.notes ?? ''}
                                    onChange={(e) =>
                                      setGatewayEdits({
                                        ...gatewayEdits,
                                        [gateway.id]: {
                                          ...gatewayEdits[gateway.id],
                                          notes: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="Add any additional notes or instructions"
                                    rows={3}
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none resize-none"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveGatewayEdit(gateway.id)}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingGateway(null);
                                    setGatewayEdits({});
                                  }}
                                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-bold text-white capitalize">{gateway.method}</h4>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      gateway.is_active
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'bg-red-500/20 text-red-500'
                                    }`}
                                  >
                                    {gateway.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-400">Deposit Range</p>
                                    <p className="text-white font-semibold">
                                      ৳{gateway.min_deposit} - ৳{gateway.max_deposit}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Withdrawal Range</p>
                                    <p className="text-white font-semibold">
                                      ৳{gateway.min_withdrawal} - ৳{gateway.max_withdrawal}
                                    </p>
                                  </div>
                                </div>
                                {gateway.account_number && (
                                  <div className="mt-3">
                                    <p className="text-gray-400 text-sm">Account Number</p>
                                    <p className="text-white font-semibold">{gateway.account_number}</p>
                                  </div>
                                )}
                                {gateway.notes && (
                                  <div className="mt-3">
                                    <p className="text-gray-400 text-sm">Notes</p>
                                    <p className="text-gray-300 text-sm">{gateway.notes}</p>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Created: {formatDate(gateway.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => {
                                    setEditingGateway(gateway.id);
                                    setGatewayEdits({
                                      [gateway.id]: {
                                        method: gateway.method,
                                        min_deposit: gateway.min_deposit,
                                        max_deposit: gateway.max_deposit,
                                        min_withdrawal: gateway.min_withdrawal,
                                        max_withdrawal: gateway.max_withdrawal,
                                        is_active: gateway.is_active,
                                        account_number: gateway.account_number,
                                        notes: gateway.notes,
                                      },
                                    });
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleGatewayStatus(gateway.id, gateway.is_active)}
                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                    gateway.is_active
                                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                      : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                  }`}
                                >
                                  {gateway.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteGateway(gateway.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cricket' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Cricket Management</h2>
                  <button
                    onClick={() => {
                      const team1Id = prompt('Enter Team 1 ID (from teams list below):');
                      const team2Id = prompt('Enter Team 2 ID (from teams list below):');
                      const matchName = prompt('Enter Match Name (e.g., India vs Pakistan - T20):');
                      const venue = prompt('Enter Venue:');
                      const startTime = prompt('Enter Start Time (YYYY-MM-DD HH:MM):');
                      const matchType = prompt('Enter Match Type (T20/ODI/Test):', 'T20');

                      if (team1Id && team2Id && matchName && startTime) {
                        supabase
                          .from('cricket_matches')
                          .insert({
                            team1_id: team1Id,
                            team2_id: team2Id,
                            match_name: matchName,
                            venue: venue || 'TBA',
                            start_time: startTime,
                            match_type: matchType || 'T20',
                            status: 'upcoming',
                          })
                          .then(() => {
                            alert('Match created successfully!');
                            loadData();
                          })
                          .catch((err) => alert('Error: ' + err.message));
                      }
                    }}
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-semibold"
                  >
                    Add Match
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Available Teams</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {cricketTeams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded">
                          <div>
                            <p className="text-white font-semibold">{team.name}</p>
                            <p className="text-xs text-gray-400">{team.short_name}</p>
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{team.id.slice(0, 8)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          const name = prompt('Enter Team Name:');
                          const shortName = prompt('Enter Short Name (e.g., IND):');
                          if (name && shortName) {
                            supabase
                              .from('cricket_teams')
                              .insert({ name, short_name: shortName.toUpperCase() })
                              .then(() => {
                                alert('Team added!');
                                loadData();
                              })
                              .catch((err) => alert('Error: ' + err.message));
                          }
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-semibold"
                      >
                        Add New Team
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Matches</h3>
                  {cricketMatches.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No cricket matches</p>
                  ) : (
                    <div className="space-y-3">
                      {cricketMatches.map((match) => (
                        <div
                          key={match.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                        >
                          <div className="flex items-start justify-between flex-wrap gap-4">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-white mb-2">{match.match_name}</h4>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-sm text-gray-400">Team 1</p>
                                  <p className="text-white font-semibold">{match.team1?.name || 'Unknown'}</p>
                                  <p className="text-yellow-500 font-bold">{match.team1_score} ({match.team1_overs} ov)</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">Team 2</p>
                                  <p className="text-white font-semibold">{match.team2?.name || 'Unknown'}</p>
                                  <p className="text-yellow-500 font-bold">{match.team2_score} ({match.team2_overs} ov)</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm flex-wrap">
                                <span className="text-gray-400">Venue: {match.venue}</span>
                                <span className="text-gray-400">Type: {match.match_type}</span>
                                <span className={`capitalize font-semibold ${
                                  match.status === 'live' ? 'text-red-500' :
                                  match.status === 'completed' ? 'text-green-500' :
                                  'text-yellow-500'
                                }`}>
                                  {match.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {match.status !== 'completed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      const t1Score = prompt('Team 1 Score (e.g., 180/5):', match.team1_score);
                                      const t1Overs = prompt('Team 1 Overs:', match.team1_overs);
                                      const t2Score = prompt('Team 2 Score (e.g., 150/8):', match.team2_score);
                                      const t2Overs = prompt('Team 2 Overs:', match.team2_overs);
                                      const status = prompt('Status (upcoming/live/completed):', match.status);

                                      if (t1Score && t1Overs && t2Score && t2Overs) {
                                        supabase
                                          .from('cricket_matches')
                                          .update({
                                            team1_score: t1Score,
                                            team1_overs: parseFloat(t1Overs),
                                            team2_score: t2Score,
                                            team2_overs: parseFloat(t2Overs),
                                            status: status || match.status,
                                            updated_at: new Date().toISOString(),
                                          })
                                          .eq('id', match.id)
                                          .then(() => {
                                            alert('Score updated!');
                                            loadData();
                                          });
                                      }
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-gray-900 font-semibold whitespace-nowrap"
                                  >
                                    Update Score
                                  </button>
                                  <button
                                    onClick={() => {
                                      const winner = prompt('Winner Team ID (or cancel for draw):');
                                      const margin = prompt('Win Margin (e.g., "by 30 runs"):');

                                      supabase
                                        .from('cricket_matches')
                                        .update({
                                          status: 'completed',
                                          winner_team_id: winner || null,
                                          win_margin: margin,
                                          updated_at: new Date().toISOString(),
                                        })
                                        .eq('id', match.id)
                                        .then(async () => {
                                          const { data: bets } = await supabase
                                            .from('cricket_bets')
                                            .select('*')
                                            .eq('match_id', match.id)
                                            .eq('status', 'pending');

                                          for (const bet of bets || []) {
                                            const wonBet = winner && bet.bet_on === (winner === match.team1_id ? 'team1' : 'team2');

                                            if (wonBet) {
                                              await supabase
                                                .from('cricket_bets')
                                                .update({
                                                  status: 'won',
                                                  actual_payout: bet.potential_payout,
                                                  settled_at: new Date().toISOString(),
                                                })
                                                .eq('id', bet.id);

                                              const { data: wallet } = await supabase
                                                .from('wallets')
                                                .select('main_balance, total_won')
                                                .eq('user_id', bet.user_id)
                                                .maybeSingle();

                                              if (wallet) {
                                                await supabase
                                                  .from('wallets')
                                                  .update({
                                                    main_balance: wallet.main_balance + bet.potential_payout,
                                                    total_won: wallet.total_won + bet.potential_payout,
                                                  })
                                                  .eq('user_id', bet.user_id);

                                                await supabase.from('transactions').insert({
                                                  user_id: bet.user_id,
                                                  type: 'win',
                                                  amount: bet.potential_payout,
                                                  balance_type: 'main',
                                                  status: 'completed',
                                                  description: `Cricket bet won - ${match.match_name}`,
                                                });
                                              }
                                            } else {
                                              await supabase
                                                .from('cricket_bets')
                                                .update({
                                                  status: 'lost',
                                                  settled_at: new Date().toISOString(),
                                                })
                                                .eq('id', bet.id);
                                            }
                                          }

                                          alert('Match completed and bets settled!');
                                          loadData();
                                        });
                                    }}
                                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-semibold whitespace-nowrap"
                                  >
                                    Complete Match
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  const newOdds1 = prompt('Team 1 Odds:', match.team1_win_odds);
                                  const newOdds2 = prompt('Team 2 Odds:', match.team2_win_odds);

                                  if (newOdds1 && newOdds2) {
                                    supabase
                                      .from('cricket_matches')
                                      .update({
                                        team1_win_odds: parseFloat(newOdds1),
                                        team2_win_odds: parseFloat(newOdds2),
                                        updated_at: new Date().toISOString(),
                                      })
                                      .eq('id', match.id)
                                      .then(() => {
                                        alert('Odds updated!');
                                        loadData();
                                      });
                                  }
                                }}
                                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-semibold whitespace-nowrap"
                              >
                                Update Odds
                              </button>
                              <button
                                onClick={async () => {
                                  const newStatus = !match.is_active;
                                  await supabase
                                    .from('cricket_matches')
                                    .update({ is_active: newStatus })
                                    .eq('id', match.id);
                                  loadData();
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                                  match.is_active
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-red-500/20 text-red-500'
                                }`}
                              >
                                {match.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'fake_betting' && (
              <FakeBettingManager />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Platform Settings</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Platform Info</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Platform Name</label>
                        <input
                          type="text"
                          defaultValue={settings.platform_name || 'Markozon Betting'}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'platform_name', value: e.target.value });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Currency</label>
                        <input
                          type="text"
                          defaultValue={settings.default_currency || 'BDT'}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'default_currency', value: e.target.value });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Withdrawal Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Min Withdrawal (৳)</label>
                        <input
                          type="number"
                          defaultValue={settings.min_withdrawal_amount || 500}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'min_withdrawal_amount', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Max Withdrawal (৳)</label>
                        <input
                          type="number"
                          defaultValue={settings.max_withdrawal_amount || 50000}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'max_withdrawal_amount', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Withdrawal Fee (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={settings.withdrawal_fee_percentage || 0}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'withdrawal_fee_percentage', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Deposit Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Min Deposit (৳)</label>
                        <input
                          type="number"
                          defaultValue={settings.min_deposit_amount || 100}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'min_deposit_amount', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Max Deposit (৳)</label>
                        <input
                          type="number"
                          defaultValue={settings.max_deposit_amount || 100000}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'max_deposit_amount', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Referral Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Referral Bonus (৳)</label>
                        <input
                          type="number"
                          defaultValue={settings.referral_bonus || 50}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'referral_bonus', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">Referral Commission (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={settings.referral_commission || 5}
                          onBlur={async (e) => {
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'referral_commission', value: Number(e.target.value) });
                            loadData();
                          }}
                          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Maintenance</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-400">Maintenance Mode</label>
                        <button
                          onClick={async () => {
                            const currentMode = settings.maintenance_mode === 'true';
                            await supabase
                              .from('admin_settings')
                              .upsert({ key: 'maintenance_mode', value: !currentMode });
                            loadData();
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold ${
                            settings.maintenance_mode === 'true'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-green-500/20 text-green-500'
                          }`}
                        >
                          {settings.maintenance_mode === 'true' ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
