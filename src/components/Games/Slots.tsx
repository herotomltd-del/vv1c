import { useState } from 'react';
import { ArrowLeft, Cherry, Gem, Star, DollarSign, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';
import LiveBettingInfo from './LiveBettingInfo';

interface SlotsProps {
  game: any;
  onBack: () => void;
}

const SYMBOLS = [
  { icon: Cherry, name: 'cherry', multiplier: 2, color: 'text-red-500' },
  { icon: Gem, name: 'gem', multiplier: 5, color: 'text-blue-500' },
  { icon: Star, name: 'star', multiplier: 10, color: 'text-yellow-500' },
  { icon: DollarSign, name: 'dollar', multiplier: 20, color: 'text-green-500' },
  { icon: Crown, name: 'crown', multiplier: 50, color: 'text-purple-500' },
];

export default function Slots({ game, onBack }: SlotsProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(50);
  const [reels, setReels] = useState<number[]>([0, 1, 2]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);

  const spin = async () => {
    if (!user || !wallet || betAmount < game.min_bet || betAmount > game.max_bet) return;
    if (wallet.main_balance < betAmount) {
      alert('Insufficient balance');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setLastWin(null);
    soundManager.playSpin();

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

      const spinDuration = 2000;
      const interval = setInterval(() => {
        setReels([
          Math.floor(Math.random() * SYMBOLS.length),
          Math.floor(Math.random() * SYMBOLS.length),
          Math.floor(Math.random() * SYMBOLS.length),
        ]);
      }, 100);

      setTimeout(async () => {
        clearInterval(interval);

        const finalReels = calculateResult();
        setReels(finalReels);

        const multiplier = calculateMultiplier(finalReels);
        const payout = multiplier > 0 ? betAmount * multiplier : 0;

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

          setLastWin(payout);

          if (multiplier >= 20) {
            soundManager.playBigWin();
          } else {
            soundManager.playWin();
          }
        } else {
          await supabase
            .from('game_sessions')
            .update({ result: 'loss', multiplier: 0 })
            .eq('id', session.id);

          await supabase
            .from('bets')
            .update({ status: 'lost', actual_payout: 0 })
            .eq('session_id', session.id);

          soundManager.playLose();
        }

        await refreshWallet();
        setIsSpinning(false);
      }, spinDuration);
    } catch (error) {
      console.error('Spin error:', error);
      alert('Failed to spin');
      setIsSpinning(false);
    }
  };

  const calculateResult = (): number[] => {
    const random = Math.random() * 100;
    const rtpPercentage = game.rtp_percentage;

    if (random < rtpPercentage) {
      const winType = Math.random();
      if (winType < 0.7) {
        const symbol = Math.floor(Math.random() * SYMBOLS.length);
        return [symbol, symbol, symbol];
      } else {
        const symbol = Math.floor(Math.random() * SYMBOLS.length);
        const other = (symbol + 1 + Math.floor(Math.random() * (SYMBOLS.length - 1))) % SYMBOLS.length;
        return [symbol, symbol, other];
      }
    }

    return [
      Math.floor(Math.random() * SYMBOLS.length),
      Math.floor(Math.random() * SYMBOLS.length),
      Math.floor(Math.random() * SYMBOLS.length),
    ];
  };

  const calculateMultiplier = (reels: number[]): number => {
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      return SYMBOLS[reels[0]].multiplier;
    }
    if (reels[0] === reels[1] || reels[1] === reels[2]) {
      return Math.floor(SYMBOLS[reels[1]].multiplier / 2);
    }
    return 0;
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
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-8 mb-6">
                <div className="flex justify-center gap-4">
                  {reels.map((reelIndex, i) => {
                    const Symbol = SYMBOLS[reelIndex].icon;
                    const color = SYMBOLS[reelIndex].color;
                    return (
                      <div
                        key={i}
                        className={`bg-white rounded-xl p-8 shadow-2xl ${
                          isSpinning ? 'animate-bounce' : ''
                        }`}
                      >
                        <Symbol className={`w-24 h-24 ${color}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {lastWin !== null && lastWin > 0 && (
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-green-500 animate-pulse">
                    WIN! {formatCurrency(lastWin)}
                  </div>
                  <p className="text-gray-400 mt-2">
                    {calculateMultiplier(reels)}x multiplier
                  </p>
                </div>
              )}

              {lastWin === 0 && !isSpinning && (
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-red-500">
                    Better luck next time!
                  </div>
                </div>
              )}

              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Paytable</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SYMBOLS.map((symbol) => {
                    const Icon = symbol.icon;
                    return (
                      <div key={symbol.name} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-6 h-6 ${symbol.color}`} />
                          <span className="text-white font-semibold capitalize">{symbol.name}</span>
                        </div>
                        <span className="text-yellow-500 font-bold">{symbol.multiplier}x</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Match 3 for full multiplier, 2 for half multiplier
                </p>
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
                    disabled={isSpinning}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: ৳{game.min_bet} | Max: ৳{game.max_bet}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      disabled={isSpinning}
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                      ৳{amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={spin}
                  disabled={isSpinning || !wallet || wallet.main_balance < betAmount}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:from-purple-400 hover:to-pink-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpinning ? 'SPINNING...' : 'SPIN'}
                </button>
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
