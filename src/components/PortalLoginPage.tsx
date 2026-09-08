import React, { useState } from 'react';
import { Shield, Bike, Lock, Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';
import { setCurrentSession } from '../utils/authStore';
import { normalizeRole } from '../utils/rbac';
import { safeResponseJson } from '../utils/safeFetch';

interface PortalLoginPageProps {
  portalType: 'admin' | 'delivery';
  onLoginSuccess: (user: UserAccount) => void;
  onBackToShop: () => void;
  initialError?: string | null;
}

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({
  portalType,
  onLoginSuccess,
  onBackToShop,
  initialError = null,
}) => {
  const isAdmin = portalType === 'admin';

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address first to receive an OTP.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data: any = await safeResponseJson(res, { success: false, error: 'Network or response error' });
      if (data.success) {
        setOtpSent(true);
        setOtpNotice(data.message || `Verification code sent to ${email}.`);
        if (data.code) {
          setOtp(data.code);
        }
      } else {
        setError(data.error || 'Failed to send verification code.');
      }
    } catch {
      // Offline fallback
      setOtpSent(true);
      const demoCode = '123456';
      setOtp(demoCode);
      setOtpNotice(`Verification code sent to ${email} (Demo code: ${demoCode})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (authMode === 'password' && !password.trim()) {
      setError('Please enter your account password or security passcode.');
      return;
    }

    if (authMode === 'otp' && !otp.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: authMode === 'password' ? password.trim() : undefined,
          otp: authMode === 'otp' ? otp.trim() : undefined,
          targetPortal: portalType,
        }),
      });

      const data: any = await safeResponseJson(res, { success: false, error: 'Login service unavailable' });

      if (!res.ok || !data.success) {
        // Backend rejection (e.g. 403 Forbidden for customer role)
        const errorMsg = data.error || 'Access Denied: You do not have permission to access this portal.';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Successful verification
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

      setCurrentSession(userAccount, true);
      onLoginSuccess(userAccount);
    } catch (err: any) {
      console.error('Backend login request error:', err);
      setError(err?.message || 'Authentication failed. Please verify your credentials and network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-8 px-3 sm:px-4 selection:bg-emerald-500 selection:text-white font-sans w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-md">
        {/* Top Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToShop}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to FreshLane Store</span>
          </button>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            {isAdmin ? 'Zone 534102 Admin' : 'Fleet Telematics'}
          </span>
        </div>

        {/* Portal Authentication Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle accent glow */}
          <div
            className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
              isAdmin ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />

          {/* Header */}
          <div className="text-center mb-6">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-lg border ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isAdmin ? <Shield className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${
                isAdmin
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>{isAdmin ? 'Administrator Access' : 'Delivery Partner Portal'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'Admin Portal Login' : 'Delivery Driver Login'}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {isAdmin
                ? 'Authorized access for FreshLane store managers to monitor sales, control stock, and track fleet drivers.'
                : 'Authorized access for registered fleet couriers to view assigned orders, update status, and manage dispatches.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-600/60 rounded-2xl text-xs text-rose-200 font-medium flex items-start gap-2.5 shadow-lg animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <p className="font-bold text-rose-100">{error}</p>
                {error.includes('Access Denied') && (
                  <p className="text-[11px] text-rose-300/90 mt-1">
                    Standard customer accounts cannot access staff portals. Please sign in with registered staff credentials.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* OTP Sent Notice */}
          {otpNotice && (
            <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="flex-1">{otpNotice}</span>
            </div>
          )}

          {/* Auth Method Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password / Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'otp'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email OTP</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdmin ? 'nanipallimaheshkumar@gmail.com' : 'arjun@freshlane.com'}
                  className="w-full h-11 pl-10 pr-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-600 transition-all font-mono"
                  required
                />
              </div>
            </div>

            {authMode === 'password' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isAdmin ? 'Security Passcode / Password' : 'Driver Account Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAdmin ? '•••••• (Security Code)' : '••••••••'}
                    className="w-full h-11 pl-10 pr-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-600 transition-all font-mono"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    6-Digit Email OTP
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer disabled:opacity-50"
                  >
                    {otpSent ? 'Resend Code' : 'Send Code'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full h-11 pl-10 pr-3 text-xs bg-slate-950 border border-slate-700/80 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-600 tracking-widest font-mono transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-11 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2 ${
                isAdmin
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </span>
              ) : (
                <>
                  <span>Authenticate &amp; Open Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>FreshLane Produce Market · Tadepalligudem 534102 Hub</p>
        </div>
      </div>
    </div>
  );
};
