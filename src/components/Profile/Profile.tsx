import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Shield, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../lib/utils';

interface ProfileProps {
  onBack: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user, profile, wallet, loading: authLoading, refreshProfile, refreshWallet } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'profile_updated',
        entity_type: 'user',
        entity_id: user.id,
        description: 'User updated profile information',
      });

      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setEditing(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([refreshProfile(), refreshWallet()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Profile</h2>
          <p className="text-gray-400 mb-6">
            Unable to load your profile data. This might be a temporary issue.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold px-6 py-3 rounded-xl transition disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Try Again'}
            </button>
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-xl transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4 rounded-full">
                  <User className="w-8 h-8 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">My Profile</h1>
                  <p className="text-gray-400">Manage your account information</p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title="Refresh Profile"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-lg mb-4 text-sm">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                    placeholder="Enter your full name"
                    required
                  />
                ) : (
                  <p className="text-white font-semibold">{profile.full_name || 'Not set'}</p>
                )}
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-white font-semibold">{profile.email || 'Not set'}</p>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-white font-semibold">{profile.phone || 'Not set'}</p>
                )}
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  Referral Code
                </label>
                <p className="text-yellow-500 font-bold text-lg">{profile.referral_code}</p>
                <p className="text-xs text-gray-500 mt-1">Share this code to earn referral bonuses</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  Member Since
                </label>
                <p className="text-white font-semibold">{formatDate(profile.created_at || '')}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <label className="text-sm text-gray-400 flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  Account Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    profile.is_active
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {profile.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {profile.is_admin && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-500">
                      Admin
                    </span>
                  )}
                  {profile.is_agent && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-500">
                      Agent
                    </span>
                  )}
                  {profile.kyc_verified && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">
                      KYC Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold py-3 rounded-xl transition disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFullName(profile.full_name || '');
                      setPhone(profile.phone || '');
                      setError('');
                    }}
                    disabled={loading}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setEditing(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 font-bold py-3 rounded-xl transition"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-yellow-500/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Account Statistics</h2>
            {!wallet ? (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-500 font-semibold mb-1">Wallet Data Unavailable</p>
                  <p className="text-sm text-gray-400">
                    Your wallet information couldn't be loaded. Try refreshing the page or contact support if this persists.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Deposited</p>
                  <p className="text-xl font-bold text-green-500">
                    {formatCurrency(wallet.total_deposited)}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Withdrawn</p>
                  <p className="text-xl font-bold text-red-500">
                    {formatCurrency(wallet.total_withdrawn)}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Wagered</p>
                  <p className="text-xl font-bold text-blue-500">
                    {formatCurrency(wallet.total_wagered)}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Total Won</p>
                  <p className="text-xl font-bold text-yellow-500">
                    {formatCurrency(wallet.total_won)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
