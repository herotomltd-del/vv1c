import { useState } from 'react';
import { ArrowLeft, Spade, Heart, Diamond, Club } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { soundManager } from '../../lib/sounds';

interface BlackjackProps {
  game: any;
  onBack: () => void;
}

type Card = {
  rank: string;
  suit: string;
  value: number;
};

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
];

export default function Blackjack({ game, onBack }: BlackjackProps) {
  const { user, wallet, refreshWallet } = useAuth();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);

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

  const createDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (let i = 0; i < 6; i++) {
      SUITS.forEach((suit) => {
        RANKS.forEach(({ rank, value }) => {
          newDeck.push({ rank, suit, value });
        });
      });
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces = 0;

    hand.forEach((card) => {
      value += card.value;
      if (card.rank === 'A') aces++;
    });

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
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

      const newDeck = createDeck();
      const player = [newDeck.pop()!, newDeck.pop()!];
      const dealer = [newDeck.pop()!, newDeck.pop()!];

      soundManager.playCardFlip();
      setTimeout(() => soundManager.playCardFlip(), 100);
      setTimeout(() => soundManager.playCardFlip(), 200);
      setTimeout(() => soundManager.playCardFlip(), 300);

      setDeck(newDeck);
      setPlayerHand(player);
      setDealerHand(dealer);
      setGameStarted(true);
      setGameOver(false);
      setResult('');
      setCurrentSessionId(session.id);

      if (calculateHandValue(player) === 21) {
        endGame('Blackjack!', 2.5, session.id);
      }
    } catch (error) {
      console.error('Start game error:', error);
      alert('Failed to start game');
    }
  };

  const hit = () => {
    if (!gameStarted || gameOver) return;

    soundManager.playCardFlip();

    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];

    setDeck(newDeck);
    setPlayerHand(newHand);

    const handValue = calculateHandValue(newHand);
    if (handValue > 21) {
      endGame('Bust! You lose', 0, currentSessionId!);
    } else if (handValue === 21) {
      stand();
    }
  };

  const stand = async () => {
    if (!gameStarted || gameOver) return;

    let newDeck = [...deck];
    let newDealerHand = [...dealerHand];

    while (calculateHandValue(newDealerHand) < 17) {
      const newCard = newDeck.pop()!;
      newDealerHand.push(newCard);
    }

    setDeck(newDeck);
    setDealerHand(newDealerHand);

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(newDealerHand);

    if (dealerValue > 21) {
      endGame('Dealer busts! You win', 2, currentSessionId!);
    } else if (playerValue > dealerValue) {
      endGame('You win!', 2, currentSessionId!);
    } else if (playerValue < dealerValue) {
      endGame('Dealer wins', 0, currentSessionId!);
    } else {
      endGame('Push (tie)', 1, currentSessionId!);
    }
  };

  const endGame = async (message: string, multiplier: number, sessionId: string) => {
    setGameOver(true);
    setResult(message);

    const payout = betAmount * multiplier;

    if (payout > betAmount) {
      if (multiplier >= 2.5) {
        soundManager.playBigWin();
      } else {
        soundManager.playWin();
      }
    } else if (payout === betAmount) {
      soundManager.playClick();
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
  };

  const newHand = () => {
    setGameStarted(false);
    setPlayerHand([]);
    setDealerHand([]);
    setDeck([]);
  };

  const renderCard = (card: Card, hidden: boolean = false) => {
    const SuitIcon = getSuitIcon(card.suit);
    const color = getSuitColor(card.suit);

    if (hidden) {
      return (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 w-24 h-32 flex items-center justify-center border-2 border-blue-900 shadow-lg">
          <div className="text-white text-4xl">?</div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-4 w-24 h-32 flex flex-col justify-between border-2 border-gray-300 shadow-lg">
        <div className="flex items-start justify-between">
          <span className={`text-2xl font-bold ${color}`}>{card.rank}</span>
          <SuitIcon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="flex items-center justify-center">
          <SuitIcon className={`w-8 h-8 ${color}`} />
        </div>
        <div className="flex items-end justify-between">
          <SuitIcon className={`w-4 h-4 ${color}`} />
          <span className={`text-2xl font-bold ${color}`}>{card.rank}</span>
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
            <div className="bg-gradient-to-br from-green-900/30 to-gray-900 rounded-2xl border border-yellow-500/20 p-8 min-h-[600px]">
              {!gameStarted ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-white mb-4">Ready to Play?</h2>
                    <p className="text-gray-400 mb-8">Place your bet and deal the cards</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        Dealer: {gameOver ? calculateHandValue(dealerHand) : '?'}
                      </h3>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {dealerHand.map((card, i) => (
                        <div key={i}>{renderCard(card, i === 1 && !gameOver)}</div>
                      ))}
                    </div>
                  </div>

                  {result && (
                    <div className="text-center">
                      <div
                        className={`text-4xl font-bold ${
                          result.includes('win') || result.includes('Blackjack')
                            ? 'text-green-500'
                            : result.includes('Push')
                            ? 'text-yellow-500'
                            : 'text-red-500'
                        }`}
                      >
                        {result}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        You: {calculateHandValue(playerHand)}
                      </h3>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {playerHand.map((card, i) => (
                        <div key={i}>{renderCard(card)}</div>
                      ))}
                    </div>
                  </div>

                  {gameStarted && !gameOver && (
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={hit}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-400 hover:to-blue-500 transition"
                      >
                        HIT
                      </button>
                      <button
                        onClick={stand}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-lg font-bold hover:from-red-400 hover:to-red-500 transition"
                      >
                        STAND
                      </button>
                    </div>
                  )}

                  {gameOver && (
                    <div className="flex justify-center">
                      <button
                        onClick={newHand}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg font-bold hover:from-green-400 hover:to-emerald-400 transition"
                      >
                        NEW HAND
                      </button>
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
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:from-green-400 hover:to-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  DEAL
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">How to Play</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>• Get closer to 21 than the dealer</p>
                <p>• Hit to get another card</p>
                <p>• Stand to keep your hand</p>
                <p>• Blackjack pays 2.5x</p>
                <p>• Regular win pays 2x</p>
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
