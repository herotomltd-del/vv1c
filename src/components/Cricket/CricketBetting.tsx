import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Clock, MapPin, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';

interface CricketBettingProps {
  onBack: () => void;
}

export default function CricketBetting({ onBack }: CricketBettingProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMatches();
    loadMyBets();
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    const { data } = await supabase
      .from('cricket_matches')
      .select('*, team1:cricket_teams!team1_id(name, short_name), team2:cricket_teams!team2_id(name, short_name)')
      .eq('is_active', true)
      .in('status', ['upcoming', 'live'])
      .order('start_time', { ascending: true });

    setMatches(data || []);
  };

  const loadMyBets = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('cricket_bets')
      .select('*, match:cricket_matches(match_name, status, team1:cricket_teams!team1_id(name), team2:cricket_teams!team2_id(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setMyBets(data || []);
  };

  const placeBet = async () => {
    if (!user || !wallet || !selectedMatch || !selectedTeam || betAmount < 50) {
      alert('Please select a team and enter valid bet amount (min ৳50)');
      return;
    }

    if (wallet.main_balance < betAmount) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    soundManager.playBet();

    try {
      const odds = selectedTeam === 'team1' ? selectedMatch.team1_win_odds : selectedMatch.team2_win_odds;
      const potentialPayout = betAmount * odds;

      await supabase.from('cricket_bets').insert({
        user_id: user.id,
        match_id: selectedMatch.id,
        bet_type: 'match_winner',
        bet_on: selectedTeam,
        bet_amount: betAmount,
        odds: odds,
        potential_payout: potentialPayout,
        status: 'pending',
      });

      await supabase
        .from('wallets')
        .update({
          main_balance: wallet.main_balance - betAmount,
          total_wagered: wallet.total_wagered + betAmount,
        })
        .eq('user_id', user.id);

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet',
        amount: -betAmount,
        balance_type: 'main',
        status: 'completed',
        description: `Cricket bet on ${selectedMatch.match_name}`,
      });

      await refreshWallet();
      await loadMyBets();
      alert('Bet placed successfully!');
      setSelectedMatch(null);
      setSelectedTeam(null);
      setBetAmount(100);
    } catch (error) {
      console.error('Bet error:', error);
      alert('Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  if (selectedMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="container mx-auto p-4">
          <button
            onClick={() => {
              setSelectedMatch(null);
              setSelectedTeam(null);
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Matches
          </button>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedMatch.match_name}</h2>
                <div className="flex gap-4 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedMatch.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(selectedMatch.start_time)}
                  </span>
                  <span className={`capitalize font-semibold ${
                    selectedMatch.status === 'live' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {selectedMatch.status === 'live' && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                    {selectedMatch.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <button
                onClick={() => setSelectedTeam('team1')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedTeam === 'team1'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-yellow-500/50'
                }`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{selectedMatch.team1?.name}</h3>
                <p className="text-3xl font-bold text-yellow-500 mb-2">{selectedMatch.team1_score}</p>
                <p className="text-sm text-gray-400 mb-3">Overs: {selectedMatch.team1_overs}</p>
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xl font-bold">{selectedMatch.team1_win_odds}x</span>
                </div>
              </button>

              <button
                onClick={() => setSelectedTeam('team2')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  selectedTeam === 'team2'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-yellow-500/50'
                }`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{selectedMatch.team2?.name}</h3>
                <p className="text-3xl font-bold text-yellow-500 mb-2">{selectedMatch.team2_score}</p>
                <p className="text-sm text-gray-400 mb-3">Overs: {selectedMatch.team2_overs}</p>
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xl font-bold">{selectedMatch.team2_win_odds}x</span>
                </div>
              </button>
            </div>

            <div className="mt-6 bg-gray-800/50 rounded-xl p-6">
              <label className="text-sm font-semibold text-gray-400 block mb-2">Bet Amount</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                min={50}
                max={wallet?.main_balance || 0}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none text-lg font-semibold mb-4"
              />

              <div className="flex gap-2 mb-4">
                {[100, 500, 1000, 5000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
                  >
                    ৳{amount}
                  </button>
                ))}
              </div>

              {selectedTeam && (
                <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Betting On:</span>
                    <span className="text-white font-semibold">
                      {selectedTeam === 'team1' ? selectedMatch.team1?.name : selectedMatch.team2?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Odds:</span>
                    <span className="text-green-500 font-semibold">
                      {selectedTeam === 'team1' ? selectedMatch.team1_win_odds : selectedMatch.team2_win_odds}x
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Potential Win:</span>
                    <span className="text-yellow-500 font-bold text-lg">
                      {formatCurrency(betAmount * (selectedTeam === 'team1' ? selectedMatch.team1_win_odds : selectedMatch.team2_win_odds))}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={placeBet}
                disabled={loading || !selectedTeam || betAmount < 50}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold py-4 rounded-xl transition disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Bet...' : 'Place Bet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Cricket Betting</h1>
              <p className="text-gray-400">Live matches and betting</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Available Matches</h2>
            {matches.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No matches available at the moment</p>
                <p className="text-gray-500 text-sm mt-2">Check back later for upcoming matches</p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 hover:border-yellow-500/50 transition p-6 cursor-pointer"
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{match.match_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      match.status === 'live'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {match.status === 'live' && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>}
                      {match.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{match.team1?.name}</p>
                      <p className="text-xl font-bold text-yellow-500">{match.team1_score}</p>
                      <p className="text-xs text-gray-500">Overs: {match.team1_overs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">{match.team2?.name}</p>
                      <p className="text-xl font-bold text-yellow-500">{match.team2_score}</p>
                      <p className="text-xs text-gray-500">Overs: {match.team2_overs}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4 text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {match.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(match.start_time)}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-green-500 font-semibold">{match.team1_win_odds}x</span>
                      <span className="text-green-500 font-semibold">{match.team2_win_odds}x</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">My Bets</h2>
            {myBets.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center">
                <p className="text-gray-400">No bets placed yet</p>
              </div>
            ) : (
              myBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                >
                  <p className="text-white font-semibold mb-2">{bet.match?.match_name}</p>
                  <p className="text-sm text-gray-400 mb-1">
                    Betting on: {bet.bet_on === 'team1' ? bet.match?.team1?.name : bet.match?.team2?.name}
                  </p>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">{formatCurrency(bet.bet_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Potential Win:</span>
                    <span className="text-yellow-500 font-semibold">{formatCurrency(bet.potential_payout)}</span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    bet.status === 'won' ? 'bg-green-500/20 text-green-500' :
                    bet.status === 'lost' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {bet.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
