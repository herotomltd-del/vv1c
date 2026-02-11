import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CreditCard, Check } from 'lucide-react';

interface PaymentMethod {
  method: string;
  is_active: boolean;
  min_deposit: number;
  max_deposit: number;
}

export default function Deposit({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<string>('bkash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [userNotes, setUserNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('is_active', true);

    if (data) setPaymentMethods(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user!.id,
        amount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        account_number: accountNumber,
        user_notes: userNotes,
        status: 'pending',
      });

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user!.id,
        action: 'deposit_requested',
        entity_type: 'deposit',
        description: `Requested deposit of ৳${amount} via ${paymentMethod}`,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Failed to submit deposit request');
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
            <CreditCard className="w-6 h-6 text-gray-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
            <p className="text-sm text-gray-400">Add money to your wallet</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
            <p className="text-gray-400">Your deposit request is pending approval</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                min={currentMethod?.min_deposit || 100}
                max={currentMethod?.max_deposit || 100000}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                required
              />
              {currentMethod && (
                <p className="text-xs text-gray-500 mt-1">
                  Min: ৳{currentMethod.min_deposit} | Max: ৳{currentMethod.max_deposit}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition"
                >
                  ৳{amt}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="Enter your transaction ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                placeholder="Enter your account/phone number"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The account number you sent money from
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 resize-none"
                placeholder="Any additional information about your payment..."
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                Please send ৳{amount} to our {paymentMethod} account and enter the transaction ID above. Your request will be processed within 24 hours.
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
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
