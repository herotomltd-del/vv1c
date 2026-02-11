import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import GameCard from './GameCard';
import { Gamepad2 } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  slug: string;
  type: string;
  min_bet: number;
  max_bet: number;
  rtp_percentage: number;
  is_active: boolean;
}

interface GamesGridProps {
  onGameSelect: (game: Game) => void;
}

export default function GamesGrid({ onGameSelect }: GamesGridProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2 rounded-lg">
          <Gamepad2 className="w-6 h-6 text-gray-900" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Casino Games</h2>
          <p className="text-gray-400 text-sm">Choose your game and start winning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onGameSelect(game)} />
        ))}
      </div>

      {games.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">No games available at the moment</p>
        </div>
      )}
    </div>
  );
}
