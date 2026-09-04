import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Shield, CheckCircle2, UserPlus, Sparkles, Store } from 'lucide-react';
import { authenticateUser } from '../utils/authStore';
import { UserAccount } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onGoToRegister: () => void;
  onGoToShop: () => void;
  onOpenOperationsPortal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToRegister,
  onGoToShop,
  onOpenOperationsPortal,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = authenticateUser(email, password, 'shopper');
      setLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials or create an account.');
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setEmail('riya@example.com');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-xs">
              ✦
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold mb-2 border border-emerald-200/60">
              <span>🇮🇳</span>
              <span>Customer Portal · India (Tadepalligudem Hub)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Customer Sign In
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sign in to order fresh fruits, veggies &amp; leafy bundles in 30 minutes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                <span>⚠️</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-800">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 accent-emerald-600 w-3.5 h-3.5"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to demo registered email!')}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold text-[11px] cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to FreshLane</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-medium text-slate-500 mb-2">Quick test with customer demo account:</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fill Customer Demo (Riya Sharma)</span>
              </button>
            </div>
          </div>

          {/* Create an account option */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center bg-slate-50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 rounded-b-[2rem]">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 mb-1">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Don't have a customer account?</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Register now to save your delivery addresses, track drivers in real-time, and get exclusive market discounts.
            </p>
            <button
              type="button"
              onClick={onGoToRegister}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Customer Account</span>
            </button>
          </div>
        </div>

        {/* Back to market & Staff portal link */}
        <div className="text-center mt-5 space-y-2">
          <div>
            <button
              onClick={onGoToShop}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            >
              ← Return to FreshLane market
            </button>
          </div>
          {onOpenOperationsPortal && (
            <div>
              <button
                onClick={onOpenOperationsPortal}
                className="text-[11px] font-medium text-slate-400 hover:text-emerald-600 cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Authorized Staff Portal (Store Admin &amp; Driver Authentication) ↗</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
