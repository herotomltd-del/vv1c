import { useState, useEffect } from 'react';
import { Users, DollarSign, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface LiveBettingInfoProps {
  gameId: string;
}

export default function LiveBettingInfo({ gameId }: LiveBettingInfoProps) {
  const [config, setConfig] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBettingInfo();
    const interval = setInterval(loadBettingInfo, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const loadBettingInfo = async () => {
    try {
      const [configRes, playersRes] = await Promise.all([
        supabase
          .from('fake_betting_config')
          .select('*')
          .eq('game_id', gameId)
          .maybeSingle(),
        supabase
          .from('fake_players')
          .select('*')
          .eq('game_id', gameId)
          .order('display_order', { ascending: true })
      ]);

      setConfig(configRes.data);
      setPlayers(playersRes.data || []);
    } catch (error) {
      console.error('Error loading betting info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !config || !config.is_enabled) {
    return null;
  }

  const winners = players.filter(p => p.is_winner);
  const totalWinAmount = winners.reduce((sum, p) => sum + (p.win_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-400">Active Players</span>
          </div>
          <p className="text-2xl font-bold text-white">{config.active_players_count}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-gray-400">Total Bets</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(config.total_bet_amount)}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-green-400" />
            <span className="text-xs text-gray-400">Winners</span>
          </div>
          <p className="text-2xl font-bold text-white">{winners.length}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-gray-400">Total Wins</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalWinAmount)}</p>
        </div>
      </div>

      {players.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-yellow-500/20 p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-500" />
            Live Players
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  player.is_winner
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-gray-800/50 border border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      player.is_winner
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {player.player_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold ${player.is_winner ? 'text-green-400' : 'text-white'}`}>
                      {player.player_name}
                      {player.is_winner && (
                        <Trophy className="w-4 h-4 inline ml-2 text-yellow-500" />
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Bet: {formatCurrency(player.bet_amount)}
                    </p>
                  </div>
                </div>
                {player.is_winner && (
                  <div className="text-right">
                    <p className="text-green-400 font-bold">
                      +{formatCurrency(player.win_amount)}
                    </p>
                    <p className="text-xs text-gray-400">Won</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
