import { useState } from 'react';
import { ArrowLeft, Spade, Heart, Diamond, Club } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';

interface SuperAceProps {
  game: any;
  onBack: () => void;
}

type Card = {
  rank: string;
  suit: string;
  multiplier: number;
};

const CARDS: Card[] = [
  { rank: 'A', suit: 'spades', multiplier: 50 },
  { rank: 'A', suit: 'hearts', multiplier: 50 },
  { rank: 'A', suit: 'diamonds', multiplier: 50 },
  { rank: 'A', suit: 'clubs', multiplier: 50 },
  { rank: 'K', suit: 'spades', multiplier: 20 },
  { rank: 'K', suit: 'hearts', multiplier: 20 },
  { rank: 'K', suit: 'diamonds', multiplier: 20 },
  { rank: 'K', suit: 'clubs', multiplier: 20 },
  { rank: 'Q', suit: 'spades', multiplier: 10 },
  { rank: 'Q', suit: 'hearts', multiplier: 10 },
  { rank: 'Q', suit: 'diamonds', multiplier: 10 },
  { rank: 'Q', suit: 'clubs', multiplier: 10 },
  { rank: 'J', suit: 'spades', multiplier: 5 },
  { rank: 'J', suit: 'hearts', multiplier: 5 },
  { rank: 'J', suit: 'diamonds', multiplier: 5 },
  { rank: 'J', suit: 'clubs', multiplier: 5 },
  { rank: '10', suit: 'spades', multiplier: 2 },
  { rank: '10', suit: 'hearts', multiplier: 2 },
  { rank: '10', suit: 'diamonds', multiplier: 2 },
  { rank: '10', suit: 'clubs', multiplier: 2 },
];

export default function SuperAce({ game, onBack }: SuperAceProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [totalWin, setTotalWin] = useState<number>(0);

  const getSuitIcon = (suit: string) => {
    switch (suit) {
      case 'hearts':
        return Heart;
      case 'diamonds':
        return Diamond;
      case 'clubs':
        return Club;
      case 'spades':
        return Spade;
      default:
        return Spade;
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-900';
  };

  const startGame = async () => {
    if (!user || !wallet || betAmount < game.min_bet || betAmount > game.max_bet) return;
    if (wallet.main_balance < betAmount) {
      alert('Insufficient balance');
      return;
    }

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

      const cards: Card[] = [];
      for (let i = 0; i < 3; i++) {
        const random = Math.random() * 100;
        let selectedCard: Card;

        if (random < 5) {
          selectedCard = CARDS.filter((c) => c.rank === 'A')[Math.floor(Math.random() * 4)];
        } else if (random < 15) {
          selectedCard = CARDS.filter((c) => c.rank === 'K')[Math.floor(Math.random() * 4)];
        } else if (random < 30) {
          selectedCard = CARDS.filter((c) => c.rank === 'Q')[Math.floor(Math.random() * 4)];
        } else if (random < 50) {
          selectedCard = CARDS.filter((c) => c.rank === 'J')[Math.floor(Math.random() * 4)];
        } else {
          selectedCard = CARDS.filter((c) => c.rank === '10')[Math.floor(Math.random() * 4)];
        }

        cards.push(selectedCard);
      }

      setSelectedCards(cards);
      setRevealedCards([false, false, false]);
      setGameStarted(true);
      setGameOver(false);
      setTotalWin(0);
    } catch (error) {
      console.error('Start game error:', error);
      alert('Failed to start game');
    }
  };

  const revealCard = async (index: number) => {
    if (revealedCards[index] || gameOver) return;

    soundManager.playCardFlip();

    const newRevealed = [...revealedCards];
    newRevealed[index] = true;
    setRevealedCards(newRevealed);

    if (newRevealed.every((r) => r)) {
      const totalMultiplier = selectedCards.reduce((sum, card) => sum + card.multiplier, 0);
      const payout = betAmount * (totalMultiplier / 10);

      setTotalWin(payout);
      setGameOver(true);

      if (totalMultiplier >= 50) {
        soundManager.playBigWin();
      } else if (payout > betAmount) {
        soundManager.playWin();
      } else {
        soundManager.playLose();
      }

      const sessionId = await getLatestSessionId();
      if (sessionId) {
        if (payout > 0) {
          await supabase
            .from('game_sessions')
            .update({
              result: 'win',
              payout_amount: payout,
              multiplier: totalMultiplier / 10,
            })
            .eq('id', sessionId);

          await supabase
            .from('bets')
            .update({
              status: 'won',
              actual_payout: payout,
            })
            .eq('session_id', sessionId);

          await supabase
            .from('wallets')
            .update({
              main_balance: (wallet?.main_balance || 0) - betAmount + payout,
              total_won: (wallet?.total_won || 0) + payout,
            })
            .eq('user_id', user!.id);

          await supabase.from('transactions').insert({
            user_id: user!.id,
            type: 'win',
            amount: payout,
            balance_type: 'main',
            status: 'completed',
            description: `Won on ${game.name}`,
          });
        } else {
          await supabase
            .from('game_sessions')
            .update({ result: 'loss', multiplier: 0 })
            .eq('id', sessionId);

          await supabase
            .from('bets')
            .update({ status: 'lost', actual_payout: 0 })
            .eq('session_id', sessionId);
        }

        await refreshWallet();
      }
    }
  };

  const getLatestSessionId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('user_id', user!.id)
      .eq('game_id', game.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.id || null;
  };

  const resetGame = () => {
    setGameStarted(false);
    setSelectedCards([]);
    setRevealedCards([false, false, false]);
    setGameOver(false);
    setTotalWin(0);
  };

  const renderCard = (card: Card | null, revealed: boolean, index: number) => {
    if (!card || !revealed) {
      return (
        <button
          onClick={() => card && revealCard(index)}
          disabled={!card || revealed || gameOver}
          className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 w-40 h-56 flex items-center justify-center border-4 border-blue-900 shadow-2xl hover:scale-105 transition disabled:hover:scale-100 cursor-pointer disabled:cursor-default"
        >
          <div className="text-white text-6xl font-bold">?</div>
        </button>
      );
    }

    const SuitIcon = getSuitIcon(card.suit);
    const color = getSuitColor(card.suit);

    return (
      <div className="bg-white rounded-xl p-6 w-40 h-56 flex flex-col justify-between border-4 border-yellow-500 shadow-2xl animate-pulse">
        <div className="flex items-start justify-between">
          <span className={`text-4xl font-bold ${color}`}>{card.rank}</span>
          <SuitIcon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex items-center justify-center flex-col">
          <SuitIcon className={`w-16 h-16 ${color}`} />
          <div className="text-yellow-500 font-bold text-2xl mt-2">{card.multiplier}x</div>
        </div>
        <div className="flex items-end justify-between">
          <SuitIcon className={`w-6 h-6 ${color}`} />
          <span className={`text-4xl font-bold ${color}`}>{card.rank}</span>
        </div>
      </div>
    );
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
            <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 rounded-2xl border border-yellow-500/20 p-8 min-h-[600px]">
              {!gameStarted ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-white mb-4">Super Ace</h2>
                    <p className="text-gray-400 mb-8">Pick 3 cards and reveal big multipliers!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-center gap-6 flex-wrap">
                    {selectedCards.map((card, i) => (
                      <div key={i}>{renderCard(card, revealedCards[i], i)}</div>
                    ))}
                  </div>

                  {gameOver && (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-500 animate-pulse mb-4">
                        {totalWin > 0
                          ? `WIN! ${formatCurrency(totalWin)}`
                          : 'Better luck next time!'}
                      </div>
                      <button
                        onClick={resetGame}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 px-8 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-orange-400 transition"
                      >
                        PLAY AGAIN
                      </button>
                    </div>
                  )}

                  {!gameOver && (
                    <div className="text-center">
                      <p className="text-gray-400">Click cards to reveal them</p>
                    </div>
                  )}
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
                    disabled={gameStarted}
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
                      disabled={gameStarted}
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                      ৳{amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={startGame}
                  disabled={gameStarted || !wallet || wallet.main_balance < betAmount}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-orange-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  DRAW CARDS
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Card Values</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ace (A):</span>
                  <span className="text-purple-500 font-bold">50x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">King (K):</span>
                  <span className="text-red-500 font-bold">20x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Queen (Q):</span>
                  <span className="text-blue-500 font-bold">10x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Jack (J):</span>
                  <span className="text-green-500 font-bold">5x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ten (10):</span>
                  <span className="text-yellow-500 font-bold">2x</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Total multiplier is divided by 10 for payout
              </p>
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
