import { useState } from 'react';
import { ArrowLeft, Circle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';

interface PlinkoProps {
  game: any;
  onBack: () => void;
}

const MULTIPLIERS = [50, 25, 10, 5, 3, 1.5, 1, 0.5, 1, 1.5, 3, 5, 10, 25, 50];
const ROWS = 12;

export default function Plinko({ game, onBack }: PlinkoProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isDropping, setIsDropping] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const dropBall = async () => {
    if (!user || !wallet || betAmount < game.min_bet || betAmount > game.max_bet) return;
    if (wallet.main_balance < betAmount) {
      alert('Insufficient balance');
      return;
    }
    if (isDropping) return;

    setIsDropping(true);
    setLastResult(null);
    soundManager.playDrop();

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

      await supabase.from('bets').insert({
        user_id: user.id,
        game_id: game.id,
        session_id: session.id,
        bet_type: 'casino',
        bet_amount: betAmount,
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
        description: `Bet on ${game.name}`,
      });

      await refreshWallet();

      const path: number[] = [7];
      for (let i = 0; i < ROWS; i++) {
        const lastPos = path[path.length - 1];
        const direction = Math.random() < 0.5 ? -1 : 1;
        const newPos = Math.max(0, Math.min(14, lastPos + direction));
        path.push(newPos);

        setCurrentPath([...path]);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const finalPos = path[path.length - 1];
      const multiplier = MULTIPLIERS[finalPos];
      const payout = betAmount * multiplier;

      setLastResult({ multiplier, payout });
      setHistory([multiplier, ...history.slice(0, 9)]);

      if (multiplier >= 10) {
        soundManager.playBigWin();
      } else if (multiplier >= 1) {
        soundManager.playWin();
      } else {
        soundManager.playLose();
      }

      if (payout > 0) {
        await supabase
          .from('game_sessions')
          .update({
            result: 'win',
            payout_amount: payout,
            multiplier: multiplier,
          })
          .eq('id', session.id);

        await supabase
          .from('bets')
          .update({
            status: 'won',
            actual_payout: payout,
          })
          .eq('session_id', session.id);

        await supabase
          .from('wallets')
          .update({
            main_balance: (wallet?.main_balance || 0) - betAmount + payout,
            total_won: (wallet?.total_won || 0) + payout,
          })
          .eq('user_id', user.id);

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'win',
          amount: payout,
          balance_type: 'main',
          status: 'completed',
          description: `Won on ${game.name} at ${multiplier}x`,
        });
      } else {
        await supabase
          .from('game_sessions')
          .update({ result: 'loss', multiplier: 0 })
          .eq('id', session.id);

        await supabase
          .from('bets')
          .update({ status: 'lost', actual_payout: 0 })
          .eq('session_id', session.id);
      }

      await refreshWallet();
      setIsDropping(false);
      setCurrentPath([]);
    } catch (error) {
      console.error('Drop error:', error);
      alert('Failed to drop ball');
      setIsDropping(false);
    }
  };

  const getMultiplierColor = (multiplier: number): string => {
    if (multiplier >= 25) return 'bg-purple-500';
    if (multiplier >= 10) return 'bg-red-500';
    if (multiplier >= 5) return 'bg-orange-500';
    if (multiplier >= 3) return 'bg-yellow-500';
    if (multiplier >= 1.5) return 'bg-green-500';
    if (multiplier >= 1) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="container mx-auto max-w-6xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Games</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 rounded-2xl border border-yellow-500/20 p-8">
              <div className="flex gap-2 mb-6 flex-wrap">
                {history.map((mult, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      mult >= 10
                        ? 'bg-purple-500/20 text-purple-500'
                        : mult >= 3
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {mult}x
                  </div>
                ))}
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 mb-6 relative overflow-hidden">
                <div className="flex justify-center mb-4">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full animate-bounce" />
                </div>

                <div className="space-y-4">
                  {Array.from({ length: ROWS }).map((_, row) => (
                    <div key={row} className="flex justify-center gap-8">
                      {Array.from({ length: row + 2 }).map((_, col) => (
                        <Circle
                          key={col}
                          className="w-3 h-3 text-gray-600 fill-gray-600"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-15 gap-1">
                {MULTIPLIERS.map((mult, i) => (
                  <div
                    key={i}
                    className={`${getMultiplierColor(
                      mult
                    )} text-white py-3 rounded-lg text-center font-bold text-xs`}
                  >
                    {mult}x
                  </div>
                ))}
              </div>

              {lastResult && (
                <div className="mt-6 text-center">
                  <div className="text-4xl font-bold text-green-500 animate-pulse mb-2">
                    {lastResult.multiplier}x
                  </div>
                  <div className="text-2xl text-white">
                    {formatCurrency(lastResult.payout)}
                  </div>
                </div>
              )}
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
                    disabled={isDropping}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: ৳{game.min_bet} | Max: ৳{game.max_bet}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      disabled={isDropping}
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                      ৳{amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={dropBall}
                  disabled={isDropping || !wallet || wallet.main_balance < betAmount}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:from-purple-400 hover:to-pink-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDropping ? 'DROPPING...' : 'DROP BALL'}
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Multipliers</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-gray-400">25x-50x</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-400">10x-25x</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-gray-400">5x-10x</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-400">3x-5x</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-400">1.5x-3x</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-400">1x-1.5x</span>
                </div>
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
      </div>
    </div>
  );
}
