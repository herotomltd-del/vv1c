import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Users, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

export default function FakeBettingManager() {
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [config, setConfig] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadBettingData();
    }
  }, [selectedGame]);

  const loadGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setGames(data || []);
  };

  const loadBettingData = async () => {
    setLoading(true);
    try {
      const [configRes, playersRes] = await Promise.all([
        supabase
          .from('fake_betting_config')
          .select('*')
          .eq('game_id', selectedGame)
          .maybeSingle(),
        supabase
          .from('fake_players')
          .select('*')
          .eq('game_id', selectedGame)
          .order('display_order')
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
      } else {
        setConfig({
          game_id: selectedGame,
          active_players_count: 0,
          total_bet_amount: 0,
          is_enabled: true
        });
      }

      setPlayers(playersRes.data || []);
    } catch (error) {
      console.error('Error loading betting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      const { data: existing } = await supabase
        .from('fake_betting_config')
        .select('id')
        .eq('game_id', selectedGame)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('fake_betting_config')
          .update({
            active_players_count: config.active_players_count,
            total_bet_amount: config.total_bet_amount,
            is_enabled: config.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('fake_betting_config')
          .insert({
            game_id: selectedGame,
            active_players_count: config.active_players_count,
            total_bet_amount: config.total_bet_amount,
            is_enabled: config.is_enabled
          });
      }

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const addPlayer = () => {
    const newPlayer = {
      game_id: selectedGame,
      player_name: `Player ${players.length + 1}`,
      bet_amount: 100,
      win_amount: 0,
      is_winner: false,
      display_order: players.length,
      isNew: true
    };
    setPlayers([...players, newPlayer]);
  };

  const updatePlayer = (index: number, field: string, value: any) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const deletePlayer = async (index: number) => {
    const player = players[index];
    if (player.id) {
      await supabase
        .from('fake_players')
        .delete()
        .eq('id', player.id);
    }
    setPlayers(players.filter((_, i) => i !== index));
  };

  const savePlayer = async (index: number) => {
    const player = players[index];

    try {
      if (player.isNew) {
        const { data } = await supabase
          .from('fake_players')
          .insert({
            game_id: player.game_id,
            player_name: player.player_name,
            bet_amount: player.bet_amount,
            win_amount: player.win_amount,
            is_winner: player.is_winner,
            display_order: player.display_order
          })
          .select()
          .single();

        const updated = [...players];
        updated[index] = { ...data, isNew: false };
        setPlayers(updated);
      } else {
        await supabase
          .from('fake_players')
          .update({
            player_name: player.player_name,
            bet_amount: player.bet_amount,
            win_amount: player.win_amount,
            is_winner: player.is_winner,
            display_order: player.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', player.id);
      }

      alert('Player saved successfully!');
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Failed to save player');
    }
  };

  if (loading) {
    return <div className="text-white text-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Fake Betting Manager</h3>
        <p className="text-gray-400 text-sm mb-4">
          Configure fake betting data to display on game screens for excitement
        </p>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Select Game</label>
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
          >
            <option value="">-- Select a Game --</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGame && config && (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Active Players Count
                </label>
                <input
                  type="number"
                  value={config.active_players_count}
                  onChange={(e) => setConfig({ ...config, active_players_count: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Total Bet Amount
                </label>
                <input
                  type="number"
                  value={config.total_bet_amount}
                  onChange={(e) => setConfig({ ...config, total_bet_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Status</label>
                <div className="flex items-center h-10">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.is_enabled}
                      onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
                      className="mr-2 w-5 h-5"
                    />
                    <span className="text-white">Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={saveConfig}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 font-bold px-6 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </>
        )}
      </div>

      {selectedGame && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Fake Players</h3>
            <button
              onClick={addPlayer}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add Player
            </button>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No players added yet. Click "Add Player" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <div className="grid md:grid-cols-5 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Player Name</label>
                      <input
                        type="text"
                        value={player.player_name}
                        onChange={(e) => updatePlayer(index, 'player_name', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500 focus:border-yellow-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Bet Amount</label>
                      <input
                        type="number"
                        value={player.bet_amount}
                        onChange={(e) => updatePlayer(index, 'bet_amount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500 focus:border-yellow-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Win Amount</label>
                      <input
                        type="number"
                        value={player.win_amount}
                        onChange={(e) => updatePlayer(index, 'win_amount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500 focus:border-yellow-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Order</label>
                      <input
                        type="number"
                        value={player.display_order}
                        onChange={(e) => updatePlayer(index, 'display_order', parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm border border-gray-500 focus:border-yellow-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Winner</label>
                      <label className="flex items-center cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={player.is_winner}
                          onChange={(e) => updatePlayer(index, 'is_winner', e.target.checked)}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-white text-sm">Is Winner</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => savePlayer(index)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm font-semibold flex items-center gap-1 transition"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => deletePlayer(index)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm font-semibold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
