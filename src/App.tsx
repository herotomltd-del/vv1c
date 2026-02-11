import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Header from './components/Layout/Header';
import WalletCard from './components/Wallet/WalletCard';
import GamesGrid from './components/Games/GamesGrid';
import Aviator from './components/Games/Aviator';
import Crash from './components/Games/Crash';
import Slots from './components/Games/Slots';
import Roulette from './components/Games/Roulette';
import Blackjack from './components/Games/Blackjack';
import Plinko from './components/Games/Plinko';
import SuperAce from './components/Games/SuperAce';
import CricketBetting from './components/Cricket/CricketBetting';
import Profile from './components/Profile/Profile';
import History from './components/Profile/History';
import Referral from './components/Referral/Referral';
import PromoCode from './components/Promo/PromoCode';
import AdminPanel from './components/Admin/AdminPanel';
import { User, Gift, Ticket, Wallet, History as HistoryIcon, TrendingUp } from 'lucide-react';

function AuthScreen() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyMDAsMCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>

      <div className="relative z-10">
        {showLogin ? (
          <Login onToggle={() => setShowLogin(false)} />
        ) : (
          <Register onToggle={() => setShowLogin(true)} />
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { loading } = useAuth();
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'cricket' | 'profile' | 'referral' | 'promo' | 'history'>('home');
  const [showAdmin, setShowAdmin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'cricket') {
    return <CricketBetting onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'profile') {
    return <Profile onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'referral') {
    return <Referral onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'promo') {
    return <PromoCode onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'history') {
    return <History onBack={() => setCurrentPage('home')} />;
  }

  if (selectedGame) {
    const gameComponents: { [key: string]: any } = {
      aviator: Aviator,
      crash: Crash,
      slots: Slots,
      roulette: Roulette,
      blackjack: Blackjack,
      plinko: Plinko,
      super_ace: SuperAce,
    };

    const GameComponent = gameComponents[selectedGame.type] || Aviator;
    return <GameComponent game={selectedGame} onBack={() => setSelectedGame(null)} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        <Header
          onNavigate={(page) => setCurrentPage(page)}
          onOpenAdmin={() => setShowAdmin(true)}
        />

        <div className="container mx-auto px-4 py-8 space-y-8">
          <WalletCard />

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              Quick Access
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setCurrentPage('profile')}
                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-xl transition flex flex-col items-center gap-2 shadow-lg hover:shadow-blue-500/20"
              >
                <User className="w-8 h-8" />
                <span className="font-semibold">Profile</span>
              </button>

              <button
                onClick={() => setCurrentPage('referral')}
                className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-4 rounded-xl transition flex flex-col items-center gap-2 shadow-lg hover:shadow-green-500/20"
              >
                <Gift className="w-8 h-8" />
                <span className="font-semibold">Referral</span>
              </button>

              <button
                onClick={() => setCurrentPage('promo')}
                className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-xl transition flex flex-col items-center gap-2 shadow-lg hover:shadow-purple-500/20"
              >
                <Ticket className="w-8 h-8" />
                <span className="font-semibold">Promo</span>
              </button>

              <button
                onClick={() => setCurrentPage('history')}
                className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-4 rounded-xl transition flex flex-col items-center gap-2 shadow-lg hover:shadow-orange-500/20"
              >
                <HistoryIcon className="w-8 h-8" />
                <span className="font-semibold">History</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-3xl">🏏</span>
              Sports Betting
            </h2>
            <button
              onClick={() => setCurrentPage('cricket')}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-3 text-lg shadow-lg"
            >
              <span className="text-2xl">🏏</span>
              Cricket Betting - Live Matches
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">LIVE</span>
            </button>
          </div>

          <GamesGrid onGameSelect={setSelectedGame} />
        </div>
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
