import { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SetWithdrawalPINProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetWithdrawalPIN({ onClose, onSuccess }: SetWithdrawalPINProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hashPIN = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError('PIN must contain only numbers');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const pinHash = await hashPIN(pin);

      const { error: upsertError } = await supabase
        .from('user_withdrawal_pins')
        .upsert({
          user_id: user!.id,
          pin_hash: pinHash,
          is_active: true,
        });

      if (upsertError) throw upsertError;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'withdrawal_pin_set',
        description: 'User set withdrawal PIN',
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error setting PIN:', error);
      setError('Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-full">
            <Lock className="w-6 h-6 text-gray-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Set Withdrawal PIN</h2>
            <p className="text-sm text-gray-400">Secure your withdrawals</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">PIN Set Successfully!</h3>
            <p className="text-gray-400">You can now use your PIN for withdrawals</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter 4-Digit PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.slice(0, 4))}
                  maxLength={4}
                  pattern="\d*"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-yellow-500"
                  placeholder="••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.slice(0, 4))}
                  maxLength={4}
                  pattern="\d*"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-yellow-500"
                  placeholder="••••"
                  required
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  Your PIN will be required for all withdrawal requests. Keep it secure and don't share it with anyone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-orange-400 transition disabled:opacity-50"
                >
                  {loading ? 'Setting...' : 'Set PIN'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
