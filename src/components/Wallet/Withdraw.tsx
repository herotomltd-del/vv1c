import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Banknote, Check } from 'lucide-react';

interface PaymentMethod {
  method: string;
  is_active: boolean;
  min_withdrawal: number;
  max_withdrawal: number;
}

export default function Withdraw({ onClose }: { onClose: () => void }) {
  const { user, wallet } = useAuth();
  const [amount, setAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<string>('bkash');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadPaymentMethods();
    checkPinStatus();
  }, []);

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('is_active', true);

    if (data) setPaymentMethods(data);
  };

  const checkPinStatus = async () => {
    const { data } = await supabase
      .from('user_withdrawal_pins')
      .select('is_active')
      .eq('user_id', user!.id)
      .maybeSingle();

    setHasPinSet(data?.is_active || false);
  };

  const hashPIN = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyPIN = async (inputPin: string): Promise<boolean> => {
    const pinHash = await hashPIN(inputPin);
    const { data } = await supabase
      .from('user_withdrawal_pins')
      .select('pin_hash')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle();

    return data?.pin_hash === pinHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!wallet || wallet.main_balance < amount) {
      setError('Insufficient balance');
      return;
    }

    if (hasPinSet && !showPinInput) {
      setShowPinInput(true);
      return;
    }

    if (hasPinSet && pin.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setLoading(true);

    try {
      if (hasPinSet) {
        const isValidPIN = await verifyPIN(pin);
        if (!isValidPIN) {
          setError('Invalid PIN');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user!.id,
        amount,
        payment_method: paymentMethod,
        account_details: {
          account_number: accountNumber,
          account_name: accountName,
        },
        status: 'pending',
      });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'withdrawal_requested',
        entity_type: 'withdrawal',
        description: `Requested withdrawal of ৳${amount} via ${paymentMethod}`,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Withdrawal error:', error);
      setError('Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const currentMethod = paymentMethods.find((m) => m.method === paymentMethod);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-4 sm:p-6 max-w-md w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-full">
            <Banknote className="w-6 h-6 text-gray-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
            <p className="text-sm text-gray-400">Withdraw money from your wallet</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
            <p className="text-gray-400">Your withdrawal will be processed within 24-48 hours</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-sm text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-yellow-500">
                ৳{wallet?.main_balance.toFixed(2) || '0.00'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.method}
                    type="button"
                    onClick={() => setPaymentMethod(method.method)}
                    className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold capitalize transition text-sm sm:text-base ${
                      paymentMethod === method.method
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {method.method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={currentMethod?.min_withdrawal || 500}
                max={Math.min(currentMethod?.max_withdrawal || 50000, wallet?.main_balance || 0)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                required
              />
              {currentMethod && (
                <p className="text-xs text-gray-500 mt-1">
                  Min: ৳{currentMethod.min_withdrawal} | Max: ৳{currentMethod.max_withdrawal}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="01XXXXXXXXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="Your name as per account"
                required
              />
            </div>

            {showPinInput && hasPinSet && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter Withdrawal PIN
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
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                Withdrawal requests are processed within 24-48 hours. Please ensure your account details are correct.
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
                disabled={loading || !wallet || wallet.main_balance < amount}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 py-3 rounded-lg font-bold hover:from-yellow-400 hover:to-orange-400 transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : (showPinInput ? 'Confirm Withdrawal' : (hasPinSet ? 'Continue' : 'Submit Request'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
