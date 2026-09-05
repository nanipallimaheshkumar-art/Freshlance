import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Edit3,
  Smartphone,
  Send,
  Check
} from 'lucide-react';
import { registerAccount, generateVerificationCode, verifyCode } from '../utils/authStore';
import { UserAccount } from '../types';

interface CreateAccountPageProps {
  onRegisterSuccess: (user: UserAccount) => void;
  onGoToLogin: () => void;
  onGoToShop: () => void;
}

// Indian Delivery Neighbourhoods within Tadepalligudem Hub (534102, West Godavari, AP, India)
const INDIAN_DELIVERY_ZONES = [
  { name: 'KN Road, Tadepalligudem', pincode: '534102', zone: 'Zone 1 · 15 min express' },
  { name: 'Subba Rao Peta, Tadepalligudem', pincode: '534102', zone: 'Zone 2 · 18 min express' },
  { name: 'Pentapadu Bazaar, West Godavari', pincode: '534166', zone: 'Zone 3 · 22 min express' },
  { name: 'Housing Board Colony, Tadepalligudem', pincode: '534101', zone: 'Zone 4 · 20 min express' },
  { name: 'Prathipadu Road, Tadepalligudem', pincode: '534102', zone: 'Zone 5 · 24 min express' },
  { name: 'Railway Station & Main Bazaar, Tadepalligudem', pincode: '534102', zone: 'Zone 6 · 15 min express' },
];

export const CreateAccountPage: React.FC<CreateAccountPageProps> = ({
  onRegisterSuccess,
  onGoToLogin,
  onGoToShop,
}) => {
  // Step: 'details' -> 'verify_otp'
  const [step, setStep] = useState<'details' | 'verify_otp'>('details');

  // Customer form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedZone, setSelectedZone] = useState(INDIAN_DELIVERY_ZONES[0].name);
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);

  // OTP Verification state
  const [otpCode, setOtpCode] = useState('');
  const [emailDeliveryInfo, setEmailDeliveryInfo] = useState<{
    checked: boolean;
    emailSent: boolean;
    hasResendKey: boolean;
    providerMessage?: string;
  } | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    let interval: any = null;
    if (step === 'verify_otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

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

  // Validate form details & generate verification code
  const handleProceedToVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    // Clean phone number and ensure Indian 10 digits
    const digits = phone.replace(/\D/g, '');
    const cleanDigits = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).');
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
      setError('Please accept FreshLane terms to continue.');
      return;
    }

    // Format Indian phone number
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;

    // Generate 6-digit OTP code in background for both email & phone lookup
    const code = generateVerificationCode(email.trim().toLowerCase());
    generateVerificationCode(cleanDigits);
    setEmailDeliveryInfo(null);

    const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
    const otpEndpoint = cfUrl ? `${cfUrl}/api/auth/send-email-otp` : '/api/auth/send-email-otp';

    // Dispatch Email OTP via Resend API on server
    fetch(otpEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        code,
        phone: formattedPhone,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setEmailDeliveryInfo({
          checked: true,
          emailSent: Boolean(data?.emailSent),
          hasResendKey: Boolean(data?.hasResendKey),
          providerMessage: data?.providerMessage,
        });
        if (data?.providerMessage) {
          console.log('[Resend OTP]', data.providerMessage);
        }
      })
      .catch((err) => {
        console.warn('Email OTP dispatch error:', err);
        setEmailDeliveryInfo({
          checked: true,
          emailSent: false,
          hasResendKey: false,
          providerMessage: 'Server email endpoint could not be reached',
        });
      });

    setOtpCode('');
    setResendTimer(30);
    setCanResend(false);
    setResendSuccessMsg(null);
    setStep('verify_otp');
  };

  // Handle Resending OTP to registered email via Resend
  const handleResendCode = () => {
    if (!canResend) return;
    const digits = phone.replace(/\D/g, '');
    const cleanDigits = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;

    const newCode = generateVerificationCode(email.trim().toLowerCase());
    generateVerificationCode(cleanDigits);
    setEmailDeliveryInfo(null);

    const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
    const otpEndpoint = cfUrl ? `${cfUrl}/api/auth/send-email-otp` : '/api/auth/send-email-otp';

    fetch(otpEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        code: newCode,
        phone: formattedPhone,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setEmailDeliveryInfo({
          checked: true,
          emailSent: Boolean(data?.emailSent),
          hasResendKey: Boolean(data?.hasResendKey),
          providerMessage: data?.providerMessage,
        });
        if (data?.providerMessage) {
          console.log('[Resend OTP]', data.providerMessage);
        }
      })
      .catch((err) => {
        console.warn('Email OTP resend error:', err);
        setEmailDeliveryInfo({
          checked: true,
          emailSent: false,
          hasResendKey: false,
          providerMessage: 'Server email endpoint could not be reached',
        });
      });

    setResendTimer(30);
    setCanResend(false);
    setError(null);
    setResendSuccessMsg(`A fresh 6-digit verification code has been dispatched to ${email.trim().toLowerCase()}`);
    setTimeout(() => setResendSuccessMsg(null), 6000);
  };

  // Complete Registration with OTP Code
  const handleVerifyAndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const vResult = verifyCode(email.trim().toLowerCase(), otpCode.trim());
      if (!vResult.valid) {
        setLoading(false);
        setError(vResult.error || 'Incorrect verification code. Please try again.');
        return;
      }

      // Format Indian phone number
      const digits = phone.replace(/\D/g, '');
      const cleanDigits = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
      const formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;

      const zoneObj = INDIAN_DELIVERY_ZONES.find((z) => z.name === selectedZone);

      const res = registerAccount({
        name,
        email,
        phone: formattedPhone,
        password,
        role: 'shopper',
        address: address.trim() || `${selectedZone}, Tadepalligudem, AP ${zoneObj?.pincode || '534102'}`,
        neighbourhood: selectedZone,
        pincode: zoneObj?.pincode || '534102',
        verificationCode: otpCode.trim(),
      });

      setLoading(false);

      if (res.success && res.user) {
        onRegisterSuccess(res.user);
      } else {
        setError(res.error || 'Failed to complete registration. Please try again.');
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
              <span className="text-base leading-none">🇮🇳</span>
              <span>India (Tadepalligudem 15km Express Hub)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {step === 'details' ? 'Create Customer Account' : 'Verify Mobile & Email'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {step === 'details'
                ? 'Join local food lovers getting farm-fresh produce delivered in 24–30 minutes.'
                : 'Security verification code required to activate your FreshLane account.'}
            </p>
          </div>

          {/* STEP 1: CUSTOMER DETAILS FORM */}
          {step === 'details' && (
            <form onSubmit={handleProceedToVerification} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2 animate-fadeIn">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-800">Email Address</label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Receives Resend Email OTP
                    </span>
                  </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-800">
                      Mobile Number <span className="text-emerald-600 font-bold">(India 🇮🇳)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Delivery Contact</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center gap-1 text-slate-500 text-xs font-bold pointer-events-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={14}
                      className="w-full h-10 pl-16 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Zone Selection (India - Tadepalligudem 15km Hub) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-800">
                    Delivery Zone (Andhra Pradesh, India)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    15 km Hub Radius
                  </span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 cursor-pointer transition-all font-medium"
                  >
                    {INDIAN_DELIVERY_ZONES.map((zone) => (
                      <option key={zone.name} value={zone.name}>
                        {zone.name} ({zone.zone} · PIN {zone.pincode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Door No / Flat / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Sri Rama Enclave, KN Road"
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
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-full flex-1 transition-colors ${
                          s <= strength.score ? strength.color : 'bg-slate-200'
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
                    I confirm my delivery location is in <strong>India 🇮🇳 (Tadepalligudem 15km zone)</strong> and agree to FreshLane's Freshness Guarantee.
                  </span>
                </label>
              </div>

              {/* Submit button -> proceeds to OTP code */}
              <button
                type="submit"
                className="w-full h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue to Email Verification (OTP)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: VERIFICATION CODE (OTP) STEP */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              {/* Destination Pill & Edit Button */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Verification code dispatched to:</p>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[210px] sm:max-w-[280px]">{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setError(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Email Delivery Card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-emerald-950 font-bold">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Verification Code Sent</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Check Inbox
                  </span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">
                  We have dispatched your 6-digit security code directly to your registered email address:
                </p>
                <div className="flex items-center justify-between px-3 py-2 bg-white border border-emerald-200/80 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {email}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shrink-0 ml-2">
                    Sent
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Please check your inbox (including Spam, Junk, or Promotions folders) and enter the 6 digits below. Valid for 10 minutes.</span>
                </p>
              </div>

              {/* Resend success notification if triggered */}
              {resendSuccessMsg && (
                <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{resendSuccessMsg}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                  <span>⚠️</span>
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative max-w-[240px] mx-auto">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtpCode(val);
                    }}
                    placeholder="• • • • • •"
                    autoFocus
                    className="w-full h-12 text-center text-xl font-mono tracking-[0.4em] bg-slate-50 border-2 border-slate-300 rounded-2xl outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 text-slate-900 font-black transition-all"
                  />
                </div>
              </div>

              {/* Resend Code Section */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <span className="text-slate-500 text-[11px]">Didn't receive the code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                ) : (
                  <span className="text-slate-400 font-medium text-[11px]">
                    Resend in <strong className="font-mono text-slate-600">{resendTimer}s</strong>
                  </span>
                )}
              </div>

              {/* Final Registration Button */}
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Verifying &amp; Creating Account...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code &amp; Activate Account</span>
                  </>
                )}
              </button>
            </form>
          )}

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
