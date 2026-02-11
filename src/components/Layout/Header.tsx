import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Gift, Settings, Users } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface HeaderProps {
  onNavigate?: (page: 'profile' | 'referral' | 'promo') => void;
  onOpenAdmin?: () => void;
}

export default function Header({ onNavigate, onOpenAdmin }: HeaderProps) {
  const { user, profile, wallet, signOut } = useAuth();

  if (!user || !profile) return null;

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-yellow-500/20 sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-lg">
                <span className="text-xl font-bold text-gray-900">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Markozon
                </h1>
                <p className="text-xs text-gray-400">Betting Platform</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
              <div className="text-right">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-sm font-bold text-yellow-500">
                  {wallet ? formatCurrency(wallet.main_balance + wallet.bonus_balance) : '৳0'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.('profile')}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title="Profile"
              >
                <User className="w-5 h-5 text-gray-400" />
              </button>

              {profile.is_admin && (
                <button
                  onClick={onOpenAdmin}
                  className="p-2 hover:bg-gray-800 rounded-lg transition"
                  title="Admin Panel"
                >
                  <Settings className="w-5 h-5 text-yellow-500" />
                </button>
              )}

              <button
                onClick={() => onNavigate?.('referral')}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title="Referrals"
              >
                <Users className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => onNavigate?.('promo')}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title="Promo Codes"
              >
                <Gift className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={signOut}
                className="p-2 hover:bg-red-500/20 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="sm:hidden mt-3 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">Balance</span>
          <span className="text-sm font-bold text-yellow-500">
            {wallet ? formatCurrency(wallet.main_balance + wallet.bonus_balance) : '৳0'}
          </span>
        </div>
      </div>
    </header>
  );
}
