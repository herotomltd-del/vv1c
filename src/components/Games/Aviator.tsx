import { useState, useEffect, useRef } from 'react';
import { Plane, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';
import LiveBettingInfo from './LiveBettingInfo';

interface AviatorProps {
  game: any;
  onBack: () => void;
}

type GameState = 'waiting' | 'flying' | 'crashed';

export default function Aviator({ game, onBack }: AviatorProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadHistory();
    startNewRound();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('multiplier')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setHistory(data.map((s) => s.multiplier));
    }
  };

  const startNewRound = () => {
    setGameState('waiting');
    setMultiplier(1.0);
    setHasActiveBet(false);
    setCurrentSessionId(null);
    setCashoutMultiplier(null);

    let count = 5;
    setCountdown(count);

    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(countdownInterval);
        startFlying();
      }
    }, 1000);
  };

  const startFlying = () => {
    setGameState('flying');
    setCountdown(0);

    const crashPoint = calculateCrashPoint();
    let currentMultiplier = 1.0;
    const increment = 0.01;
    const speed = 50;

    intervalRef.current = setInterval(() => {
      currentMultiplier += increment;
      setMultiplier(Number(currentMultiplier.toFixed(2)));

      if (currentMultiplier >= crashPoint) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        crash(crashPoint);
      }
    }, speed);
  };

  const calculateCrashPoint = (): number => {
    const rtpPercentage = game.rtp_percentage;
    const random = Math.random();

    if (random < (100 - rtpPercentage) / 100) {
      return 1.0 + Math.random() * 0.5;
    }

    const min = 1.5;
    const max = 50;
    return min + Math.random() * (max - min) * (random ** 2);
  };

  const crash = async (finalMultiplier: number) => {
    setGameState('crashed');
    setMultiplier(Number(finalMultiplier.toFixed(2)));
    soundManager.playCrash();

    if (hasActiveBet && currentSessionId) {
      if (!cashoutMultiplier) {
        await supabase
          .from('game_sessions')
          .update({ result: 'loss', multiplier: finalMultiplier })
          .eq('id', currentSessionId);

        await supabase
          .from('bets')
          .update({ status: 'lost', actual_payout: 0 })
          .eq('session_id', currentSessionId);
      }
    }

    await loadHistory();
    await refreshWallet();

    setTimeout(() => {
      startNewRound();
    }, 3000);
  };

  const placeBet = async () => {
    if (!user || !wallet || betAmount < game.min_bet || betAmount > game.max_bet) return;
    if (wallet.main_balance < betAmount) {
      alert('Insufficient balance');
      return;
    }

    soundManager.playBet();

    try {
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          game_id: game.id,
          bet_amount: betAmount,
          result: 'pending',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: betError } = await supabase.from('bets').insert({
        user_id: user.id,
        game_id: game.id,
        session_id: session.id,
        bet_type: 'casino',
        bet_amount: betAmount,
        status: 'pending',
      });

      if (betError) throw betError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          main_balance: wallet.main_balance - betAmount,
          total_wagered: wallet.total_wagered + betAmount,
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet',
        amount: -betAmount,
        balance_type: 'main',
        status: 'completed',
        description: `Bet on ${game.name}`,
      });

      setHasActiveBet(true);
      setCurrentSessionId(session.id);
      await refreshWallet();
    } catch (error) {
      console.error('Bet error:', error);
      alert('Failed to place bet');
    }
  };

  const cashout = async () => {
    if (!hasActiveBet || !currentSessionId || gameState !== 'flying') return;

    soundManager.playCashout();

    try {
      const payout = betAmount * multiplier;

      await supabase
        .from('game_sessions')
        .update({
          result: 'win',
          payout_amount: payout,
          multiplier: multiplier,
        })
        .eq('id', currentSessionId);

      await supabase
        .from('bets')
        .update({
          status: 'won',
          actual_payout: payout,
        })
        .eq('session_id', currentSessionId);

      await supabase
        .from('wallets')
        .update({
          main_balance: (wallet?.main_balance || 0) + payout,
          total_won: (wallet?.total_won || 0) + payout,
        })
        .eq('user_id', user!.id);

      await supabase.from('transactions').insert({
        user_id: user!.id,
        type: 'win',
        amount: payout,
        balance_type: 'main',
        status: 'completed',
        description: `Won on ${game.name} at ${multiplier}x`,
      });

      setCashoutMultiplier(multiplier);
      setHasActiveBet(false);
      await refreshWallet();
    } catch (error) {
      console.error('Cashout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-2 sm:p-4 overflow-x-hidden">
      <div className="container mx-auto max-w-6xl w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Games</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 w-full">
          <div className="lg:col-span-2 w-full">
            <div className="bg-gradient-to-br from-blue-900/30 to-gray-900 rounded-2xl border border-yellow-500/20 p-4 sm:p-8 relative overflow-hidden h-64 sm:h-80 lg:h-96 w-full max-w-full">
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex gap-1 sm:gap-2 flex-wrap max-w-full overflow-x-auto no-scrollbar">
                {history.slice(0, 5).map((mult, i) => (
                  <div
                    key={i}
                    className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold ${
                      mult >= 2 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {mult.toFixed(2)}x
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center h-full">
                {gameState === 'waiting' && (
                  <div className="text-center">
                    <p className="text-6xl font-bold text-white mb-4">{countdown}</p>
                    <p className="text-gray-400">Starting soon...</p>
                  </div>
                )}

                {gameState === 'flying' && (
                  <div className="text-center">
                    <div className="relative">
                      <Plane className="w-16 h-16 sm:w-24 sm:h-24 text-yellow-500 animate-bounce" />
                      <div className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 px-3 py-2 sm:px-6 sm:py-3 rounded-lg font-bold text-2xl sm:text-4xl whitespace-nowrap">
                          {multiplier.toFixed(2)}x
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {gameState === 'crashed' && (
                  <div className="text-center">
                    <div className="text-6xl font-bold text-red-500 mb-4">
                      CRASHED!
                    </div>
                    <div className="text-3xl text-white">{multiplier.toFixed(2)}x</div>
                    {cashoutMultiplier && (
                      <div className="mt-4 text-green-500 text-2xl font-semibold">
                        You won at {cashoutMultiplier.toFixed(2)}x!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Place Bet</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    min={game.min_bet}
                    max={game.max_bet}
                    disabled={hasActiveBet || gameState === 'flying'}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: ৳{game.min_bet} | Max: ৳{game.max_bet}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      disabled={hasActiveBet || gameState === 'flying'}
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition disabled:opacity-50"
                    >
                      ৳{amount}
                    </button>
                  ))}
                </div>

                {!hasActiveBet && gameState === 'waiting' && (
                  <button
                    onClick={placeBet}
                    disabled={!wallet || wallet.main_balance < betAmount}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:from-green-400 hover:to-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Place Bet
                  </button>
                )}

                {hasActiveBet && gameState === 'flying' && (
                  <button
                    onClick={cashout}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-orange-400 transition animate-pulse"
                  >
                    Cash Out - {formatCurrency(betAmount * multiplier)}
                  </button>
                )}

                {gameState === 'crashed' && (
                  <div className="text-center text-gray-400 py-3">
                    Next round starting...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Game Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">RTP:</span>
                  <span className="text-white font-semibold">{game.rtp_percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="text-yellow-500 font-semibold">
                    {wallet ? formatCurrency(wallet.main_balance) : '৳0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6">
          <LiveBettingInfo gameId={game.id} />
        </div>
      </div>
    </div>
  );
}
