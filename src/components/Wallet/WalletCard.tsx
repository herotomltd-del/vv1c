import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote, Lock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import Deposit from './Deposit';
import Withdraw from './Withdraw';
import SetWithdrawalPIN from './SetWithdrawalPIN';

export default function WalletCard() {
  const { wallet } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSetPIN, setShowSetPIN] = useState(false);

  if (!wallet) return null;

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-full">
              <Wallet className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">My Wallet</h3>
              <p className="text-sm text-gray-400">Available Balance</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-400 hover:to-emerald-400 transition"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Deposit</span>
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:from-yellow-400 hover:to-orange-400 transition"
            >
              <Banknote className="w-4 h-4" />
              <span className="hidden sm:inline">Withdraw</span>
            </button>
            <button
              onClick={() => setShowSetPIN(true)}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
              title="Set Withdrawal PIN"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Main Balance</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(wallet.main_balance)}
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Bonus Balance</p>
          <p className="text-2xl font-bold text-yellow-500">
            {formatCurrency(wallet.bonus_balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-400">Deposited</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(wallet.total_deposited)}
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-400">Withdrawn</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(wallet.total_withdrawn)}
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-400">Wagered</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(wallet.total_wagered)}
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-gray-400">Won</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(wallet.total_won)}
          </p>
        </div>
      </div>
    </div>

      {showDeposit && <Deposit onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <Withdraw onClose={() => setShowWithdraw(false)} />}
      {showSetPIN && <SetWithdrawalPIN onClose={() => setShowSetPIN(false)} onSuccess={() => {}} />}
    </>
  );
}
