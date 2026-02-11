import { Plane, TrendingUp, Target, Sparkles, Dices, Spade, CircleDot } from 'lucide-react';

interface GameCardProps {
  game: {
    id: string;
    name: string;
    slug: string;
    type: string;
    min_bet: number;
    max_bet: number;
    rtp_percentage: number;
    is_active: boolean;
  };
  onClick: () => void;
}

const gameIcons: Record<string, any> = {
  aviator: Plane,
  crash: TrendingUp,
  plinko: Target,
  super_ace: Sparkles,
  slots: Dices,
  blackjack: Spade,
  roulette: CircleDot,
};

export default function GameCard({ game, onClick }: GameCardProps) {
  const Icon = gameIcons[game.type] || Dices;

  return (
    <button
      onClick={onClick}
      className="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20"
    >
      <div className="absolute top-3 right-3">
        <span className="bg-green-500/20 text-green-500 text-xs font-semibold px-2 py-1 rounded-full">
          {game.rtp_percentage}% RTP
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
          <Icon className="w-8 h-8 text-gray-900" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <div>
            <p className="text-xs">Min Bet</p>
            <p className="font-semibold text-white">৳{game.min_bet}</p>
          </div>
          <div className="w-px h-8 bg-gray-700"></div>
          <div>
            <p className="text-xs">Max Bet</p>
            <p className="font-semibold text-white">৳{game.max_bet}</p>
          </div>
        </div>

        <div className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 py-2 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          Play Now
        </div>
      </div>
    </button>
  );
}
