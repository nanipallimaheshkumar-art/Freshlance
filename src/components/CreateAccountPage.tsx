import React, { useState } from 'react';
import { User, Lock, Mail, Phone, MapPin, ArrowRight, ShieldCheck, CheckCircle2, Store, Sparkles } from 'lucide-react';
import { registerAccount } from '../utils/authStore';
import { UserAccount } from '../types';

interface CreateAccountPageProps {
  onRegisterSuccess: (user: UserAccount) => void;
  onGoToLogin: () => void;
  onGoToShop: () => void;
}

const NEIGHBOURHOODS = [
  'Indiranagar (Zone 1 · 22 min)',
  'Koramangala (Zone 2 · 24 min)',
  'HSR Layout (Zone 3 · 26 min)',
  'Whitefield (Zone 4 · 28 min)',
  'Jayanagar (Zone 5 · 25 min)',
  'Malleshwaram (Zone 6 · 27 min)',
  'Bellandur (Zone 7 · 28 min)',
];

export const CreateAccountPage: React.FC<CreateAccountPageProps> = ({
  onRegisterSuccess,
  onGoToLogin,
  onGoToShop,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [neighbourhood, setNeighbourhood] = useState(NEIGHBOURHOODS[0]);
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Compute password strength
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-gray-200' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-400' };
    if (score === 2) return { label: 'Fair', score: 2, color: 'bg-amber-400' };
    if (score === 3) return { label: 'Good', score: 3, color: 'bg-emerald-400' };
    return { label: 'Strong', score: 4, color: 'bg-[#245c3e]' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (!agreed) {
      setError('Please accept the FreshLane Terms of Service to continue.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = registerAccount({
        name,
        email,
        phone,
        password,
        role: 'shopper',
        address,
        neighbourhood: neighbourhood.split(' (')[0],
      });

      setLoading(false);

      if (res.success && res.user) {
        onRegisterSuccess(res.user);
      } else {
        setError(res.error || 'Failed to create account. Please try again.');
      }
    }, 450);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Card Container */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold mb-2 border border-emerald-200/60">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customer Registration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Customer Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Join thousands of neighbours who get farm-fresh produce delivered in 30 minutes.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                <span>⚠️</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priyanka Sharma"
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priyanka@example.com"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Mobile Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Area Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Preferred Delivery Zone / Neighbourhood
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={neighbourhood}
                  onChange={(e) => setNeighbourhood(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 cursor-pointer transition-all"
                >
                  {NEIGHBOURHOODS.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                House / Flat, Street Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Flat 304, Green Palms, 4th Cross"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password strength bar */}
            {password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Password strength:</span>
                  <span className="font-semibold text-slate-900">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full flex-1 transition-colors ${
                        step <= strength.score ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-[11px] text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="rounded border-slate-300 accent-emerald-600 w-3.5 h-3.5 mt-0.5"
                />
                <span>
                  I agree to FreshLane's <strong>Freshness Guarantee</strong> and Privacy Policy. My data is stored securely.
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>Create FreshLane Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account? Sign in */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                Sign in here →
              </button>
            </p>
          </div>
        </div>

        {/* Back to market link */}
        <div className="text-center mt-5">
          <button
            onClick={onGoToShop}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
          >
            ← Back to FreshLane produce market
          </button>
        </div>
      </div>
    </div>
  );
};
