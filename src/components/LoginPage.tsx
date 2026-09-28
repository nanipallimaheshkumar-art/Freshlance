import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Shield, CheckCircle2, UserPlus, Sparkles, Store, Bike, ShieldCheck } from 'lucide-react';
import { authenticateUser, setCurrentSession } from '../utils/authStore';
import { normalizeRole } from '../utils/rbac';
import { safeResponseJson } from '../utils/safeFetch';
import { UserAccount } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onGoToRegister: () => void;
  onGoToShop: () => void;
  onOpenOperationsPortal?: () => void;
  isAuthGate?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToRegister,
  onGoToShop,
  onOpenOperationsPortal,
  isAuthGate = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Primary: Server-side unified authentication
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data: any = await safeResponseJson(res, { success: false, error: 'Login service unavailable' });

      if (res.ok && data.success && data.user) {
        const userAccount: UserAccount = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          role: normalizeRole(data.user.role),
          token: data.token,
          registeredAt: new Date().toISOString(),
          isVerified: true,
        };

        setCurrentSession(userAccount, rememberMe);
        onLoginSuccess(userAccount);
        return;
      }

      // If backend returned specific credential rejection, check offline fallback or show error
      if (res.status === 401 || res.status === 403) {
        // Check offline store fallback
        const fallbackRes = authenticateUser(cleanEmail, cleanPassword);
        if (fallbackRes.success && fallbackRes.user) {
          setCurrentSession(fallbackRes.user, rememberMe);
          onLoginSuccess(fallbackRes.user);
          return;
        }
        setError(data.error || 'Invalid credentials. Please verify your email and password.');
        return;
      }

      // Non-auth error: Fallback to client-side store
      const fallbackRes = authenticateUser(cleanEmail, cleanPassword);
      if (fallbackRes.success && fallbackRes.user) {
        setCurrentSession(fallbackRes.user, rememberMe);
        onLoginSuccess(fallbackRes.user);
        return;
      }

      setError(fallbackRes.error || data.error || 'Authentication failed. Please verify credentials.');
    } catch {
      // Offline fallback
      const fallbackRes = authenticateUser(cleanEmail, cleanPassword);
      if (fallbackRes.success && fallbackRes.user) {
        setCurrentSession(fallbackRes.user, rememberMe);
        onLoginSuccess(fallbackRes.user);
        return;
      }
      setError(fallbackRes.error || 'Unable to connect to login service. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-xl border border-emerald-900/15 rounded-[32px] p-5 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-md">
              ✦
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[32px] bg-emerald-50/90 text-emerald-800 text-[11px] font-semibold mb-2 border border-emerald-200/60 shadow-2xs">
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-[24px] text-xs text-rose-700 font-medium flex items-start gap-2 shadow-2xs">
                <span>⚠️</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-[32px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all shadow-inner"
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
                  className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer px-2 py-0.5 rounded-[32px]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-[32px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all shadow-inner"
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
                onClick={() => alert('Password reset instructions sent to your registered email.')}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-semibold text-[11px] cursor-pointer px-1 rounded-[32px]"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 btn-unique-emerald text-white font-bold text-xs rounded-[32px] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-95"
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

          {/* Create an account option */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center bg-emerald-50/50 -mx-5 sm:-mx-8 -mb-5 sm:-mb-8 p-5 sm:p-6 rounded-b-[32px]">
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
              className="w-full py-3 px-4 btn-unique-dark text-white font-bold text-xs rounded-[32px] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Customer Account</span>
            </button>
          </div>
        </div>

        {/* Back to market & Staff portal link */}
        <div className="text-center mt-5 space-y-2">
          {!isAuthGate ? (
            <div>
              <button
                onClick={onGoToShop}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              >
                ← Return to FreshLane market
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sign in required to enter and browse Tadepalligudem produce market</span>
            </div>
          )}
          {onOpenOperationsPortal && (
            <div className="pt-2 flex items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={onOpenOperationsPortal}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 cursor-pointer transition-colors inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-amber-500" />
                <span>Admin Operations Portal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
