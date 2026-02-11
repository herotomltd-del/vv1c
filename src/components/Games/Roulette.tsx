import { useState } from 'react';
import { ArrowLeft, Circle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';

interface RouletteProps {
  game: any;
  onBack: () => void;
}

const NUMBERS = Array.from({ length: 37 }, (_, i) => i);
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';

interface Bet {
  type: BetType;
  value: number | string;
  amount: number;
  payout: number;
}

export default function Roulette({ game, onBack }: RouletteProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [activeBets, setActiveBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);

  const addBet = (type: BetType, value: number | string, payout: number) => {
    if (activeBets.length >= 10) {
      alert('Maximum 10 bets per spin');
      return;
    }
    soundManager.playClick();
    setActiveBets([...activeBets, { type, value, amount: betAmount, payout }]);
  };

  const removeBet = (index: number) => {
    setActiveBets(activeBets.filter((_, i) => i !== index));
  };

  const getTotalBet = () => activeBets.reduce((sum, bet) => sum + bet.amount, 0);

  const spin = async () => {
    if (!user || !wallet) return;
    if (activeBets.length === 0) {
      alert('Place at least one bet');
      return;
    }

    const totalBet = getTotalBet();
    if (wallet.main_balance < totalBet) {
      alert('Insufficient balance');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setLastWin(null);
    setResult(null);
    soundManager.playSpin();

    try {
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          game_id: game.id,
          bet_amount: totalBet,
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
        bet_amount: totalBet,
        status: 'pending',
      });

      await supabase
        .from('wallets')
        .update({
          main_balance: wallet.main_balance - totalBet,
          total_wagered: wallet.total_wagered + totalBet,
        })
        .eq('user_id', user.id);

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet',
        amount: -totalBet,
        balance_type: 'main',
        status: 'completed',
        description: `Bet on ${game.name}`,
      });

      await refreshWallet();

      setTimeout(async () => {
        const winningNumber = calculateWinningNumber();
        setResult(winningNumber);

        const totalPayout = calculatePayout(winningNumber);

        if (totalPayout > 0) {
          await supabase
            .from('game_sessions')
            .update({
              result: 'win',
              payout_amount: totalPayout,
              multiplier: totalPayout / totalBet,
            })
            .eq('id', session.id);

          await supabase
            .from('bets')
            .update({
              status: 'won',
              actual_payout: totalPayout,
            })
            .eq('session_id', session.id);

          await supabase
            .from('wallets')
            .update({
              main_balance: (wallet?.main_balance || 0) - totalBet + totalPayout,
              total_won: (wallet?.total_won || 0) + totalPayout,
            })
            .eq('user_id', user.id);

          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'win',
            amount: totalPayout,
            balance_type: 'main',
            status: 'completed',
            description: `Won on ${game.name}`,
          });

          setLastWin(totalPayout);

          if (totalPayout >= totalBet * 5) {
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
      }, 3000);
    } catch (error) {
      console.error('Spin error:', error);
      alert('Failed to spin');
      setIsSpinning(false);
    }
  };

  const calculateWinningNumber = (): number => {
    return Math.floor(Math.random() * 37);
  };

  const calculatePayout = (winningNumber: number): number => {
    let totalPayout = 0;
    activeBets.forEach((bet) => {
      if (checkWin(bet, winningNumber)) {
        totalPayout += bet.amount * bet.payout;
      }
    });
    return totalPayout;
  };

  const checkWin = (bet: Bet, winningNumber: number): boolean => {
    switch (bet.type) {
      case 'number':
        return bet.value === winningNumber;
      case 'red':
        return RED_NUMBERS.includes(winningNumber);
      case 'black':
        return BLACK_NUMBERS.includes(winningNumber);
      case 'even':
        return winningNumber !== 0 && winningNumber % 2 === 0;
      case 'odd':
        return winningNumber % 2 === 1;
      case 'low':
        return winningNumber >= 1 && winningNumber <= 18;
      case 'high':
        return winningNumber >= 19 && winningNumber <= 36;
      default:
        return false;
    }
  };

  const getNumberColor = (num: number): string => {
    if (num === 0) return 'bg-green-500';
    return RED_NUMBERS.includes(num) ? 'bg-red-500' : 'bg-gray-900';
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="container mx-auto max-w-7xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Games</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gradient-to-br from-green-900/30 to-gray-900 rounded-2xl border border-yellow-500/20 p-8">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <Circle
                    className={`w-48 h-48 text-yellow-500 ${isSpinning ? 'animate-spin' : ''}`}
                    strokeWidth={3}
                  />
                  {result !== null && !isSpinning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className={`w-32 h-32 rounded-full ${getNumberColor(
                          result
                        )} flex items-center justify-center border-4 border-yellow-500`}
                      >
                        <span className="text-5xl font-bold text-white">{result}</span>
                      </div>
                    </div>
                  )}
                  {isSpinning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white animate-pulse">
                        SPINNING...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {lastWin !== null && lastWin > 0 && (
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-green-500 animate-pulse">
                    WIN! {formatCurrency(lastWin)}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Betting Board</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Red', type: 'red' as BetType, payout: 2, color: 'bg-red-500' },
                  { label: 'Black', type: 'black' as BetType, payout: 2, color: 'bg-gray-900' },
                  { label: 'Even', type: 'even' as BetType, payout: 2, color: 'bg-blue-500' },
                  { label: 'Odd', type: 'odd' as BetType, payout: 2, color: 'bg-blue-600' },
                  { label: '1-18', type: 'low' as BetType, payout: 2, color: 'bg-purple-500' },
                  { label: '19-36', type: 'high' as BetType, payout: 2, color: 'bg-purple-600' },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => addBet(option.type, option.label, option.payout)}
                    disabled={isSpinning}
                    className={`${option.color} text-white py-3 rounded-lg font-bold hover:opacity-80 transition disabled:opacity-50`}
                  >
                    {option.label}
                    <span className="block text-xs">{option.payout}x</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-1">
                <button
                  onClick={() => addBet('number', 0, 36)}
                  disabled={isSpinning}
                  className="col-span-12 bg-green-500 text-white py-3 rounded-lg font-bold hover:opacity-80 transition disabled:opacity-50"
                >
                  0 <span className="text-xs">(36x)</span>
                </button>
                {NUMBERS.slice(1).map((num) => (
                  <button
                    key={num}
                    onClick={() => addBet('number', num, 36)}
                    disabled={isSpinning}
                    className={`${getNumberColor(
                      num
                    )} text-white py-3 rounded-lg font-bold text-sm hover:opacity-80 transition disabled:opacity-50 border border-gray-700`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Bet Amount</h3>

              <div className="space-y-4">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min={game.min_bet}
                  max={game.max_bet}
                  disabled={isSpinning}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                />

                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000].map((amount) => (
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
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Your Bets</h3>
              {activeBets.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No bets placed</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeBets.map((bet, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2 text-sm"
                    >
                      <div>
                        <span className="text-white font-semibold capitalize">
                          {bet.value}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {formatCurrency(bet.amount)} ({bet.payout}x)
                        </span>
                      </div>
                      <button
                        onClick={() => removeBet(i)}
                        disabled={isSpinning}
                        className="text-red-500 hover:text-red-400 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between text-white font-bold">
                  <span>Total:</span>
                  <span className="text-yellow-500">{formatCurrency(getTotalBet())}</span>
                </div>
              </div>
            </div>

            <button
              onClick={spin}
              disabled={isSpinning || activeBets.length === 0 || !wallet || wallet.main_balance < getTotalBet()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:from-green-400 hover:to-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </button>

            <button
              onClick={() => setActiveBets([])}
              disabled={isSpinning || activeBets.length === 0}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Bets
            </button>

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
