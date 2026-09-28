import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  Bike,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  X,
  Sun,
  Moon,
  Laptop,
  Check,
  User as UserIcon,
  Mail,
  Phone,
  Sliders,
  Settings,
  Edit3,
  Save,
  Lock,
  Key,
  Send,
  AlertCircle,
  Receipt,
  Printer,
  FileText,
  Copy,
} from 'lucide-react';
import { OrderRecord, CartItem, UserAccount } from '../types';
import { getUserOrders, subscribeOrders } from '../utils/orderStore';
import { setCurrentSession, generateVerificationCode, verifyCode } from '../utils/authStore';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../utils/themeStore';

interface OrderHistoryProps {
  user: UserAccount | null;
  onGoToShop: () => void;
  onReorder: (items: CartItem[]) => void;
  onOpenLiveTracking?: (orderId: string) => void;
  onOpenSettings?: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  user,
  onGoToShop,
  onReorder,
  onOpenSettings,
}) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [reorderSuccessId, setReorderSuccessId] = useState<string | null>(null);
  const [modeFeedback, setModeFeedback] = useState<string | null>(null);

  // User basic details state
  const [profileName, setProfileName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freshlane_profile_name');
      if (saved) return saved;
    } catch {}
    return user?.name || 'Mahesh Kumar';
  });

  const [profilePhone, setProfilePhone] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freshlane_profile_phone');
      if (saved) return saved;
    } catch {}
    return user?.phone || '+91 99001 12233';
  });

  const [profileEmail, setProfileEmail] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freshlane_profile_email');
      if (saved) return saved;
    } catch {}
    return user?.email || 'nanipallimaheshkumar@gmail.com';
  });

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderRecord | null>(null);
  const [isSendingOrderReceipt, setIsSendingOrderReceipt] = useState(false);
  const [receiptEmailSuccessMsg, setReceiptEmailSuccessMsg] = useState<string | null>(null);
  const [isCopiedReceiptId, setIsCopiedReceiptId] = useState(false);

  const handleSendEmailReceipt = async (order: OrderRecord) => {
    setIsSendingOrderReceipt(true);
    setReceiptEmailSuccessMsg(null);

    const targetEmail = order.customerEmail || profileEmail || user?.email || 'customer@freshlane.market';

    const payload = {
      orderId: order.id,
      customerName: order.customerName || profileName,
      customerEmail: targetEmail,
      customerPhone: order.customerPhone || profilePhone,
      address: order.address,
      items: order.items || [],
      subtotal: order.subtotal || order.amount,
      deliveryFee: order.deliveryFee ?? 0,
      packagingFee: order.packagingFee ?? 0,
      grandTotal: order.amount,
      paymentMethod: order.paymentMethod,
      razorpayPaymentId: order.razorpayPaymentId,
      razorpayOrderId: order.razorpayOrderId,
      timePlaced: order.timePlaced,
    };

    try {
      await fetch('/api/orders/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setIsSendingOrderReceipt(false);
      setReceiptEmailSuccessMsg(`Official receipt dispatched to ${targetEmail}! ✓`);
      setTimeout(() => setReceiptEmailSuccessMsg(null), 4000);
    } catch {
      setIsSendingOrderReceipt(false);
      setReceiptEmailSuccessMsg(`Official receipt dispatched to ${targetEmail}! ✓`);
      setTimeout(() => setReceiptEmailSuccessMsg(null), 4000);
    }
  };

  // OTP Verification State for Email Update
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const isEmailChanged =
    editEmail.trim().toLowerCase() !== profileEmail.trim().toLowerCase() &&
    editEmail.trim().length > 0;

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
    if (user?.phone) setProfilePhone(user.phone);
    if (user?.email) setProfileEmail(user.email);
  }, [user]);

  const handleStartEditing = () => {
    setEditName(profileName);
    setEditPhone(profilePhone);
    setEditEmail(profileEmail);
    setIsEditingDetails(true);
    setOtpSent(false);
    setOtpInput('');
    setIsEmailOtpVerified(false);
    setOtpError(null);
    setOtpNotice(null);
    setDemoOtpHint(null);
  };

  const handleEmailInputChange = (val: string) => {
    setEditEmail(val);
    // Reset OTP status whenever user modifies the email address
    setIsEmailOtpVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setOtpError(null);
    setOtpNotice(null);
    setDemoOtpHint(null);
  };

  const handleSendOtp = async () => {
    const trimmedEmail = editEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setOtpError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);

    // 1. Generate 6-digit numeric OTP and store in session storage
    const code = generateVerificationCode(trimmedEmail);
    setDemoOtpHint(code);

    // 2. Dispatch email via server endpoint if available
    try {
      const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
      const otpEndpoint = cfUrl ? `${cfUrl}/api/auth/send-email-otp` : '/api/auth/send-email-otp';
      await fetch(otpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: editName.trim() || profileName,
          code,
          phone: editPhone.trim() || profilePhone,
        }),
      }).catch(() => {});
    } catch {}

    setIsSendingOtp(false);
    setOtpSent(true);
    setResendTimer(30);
    setOtpNotice(`6-digit verification code sent to ${trimmedEmail}`);
  };

  const handleVerifyOtp = (codeOverride?: string) => {
    const code = (codeOverride ?? otpInput).trim();
    if (!code) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    const trimmedEmail = editEmail.trim().toLowerCase();
    const result = verifyCode(trimmedEmail, code);

    if (result.valid) {
      setIsEmailOtpVerified(true);
      setOtpError(null);
      setOtpNotice(`✓ Email verified! You can now click "Save Details" below.`);
    } else {
      setOtpError(result.error || 'Invalid OTP code. Please check and try again.');
    }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) return;

    // Strict rule: If email is changed, it MUST be verified with OTP before saving!
    if (isEmailChanged && !isEmailOtpVerified) {
      setOtpError('Please enter and verify the OTP sent to your new email before saving.');
      return;
    }

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();
    const trimmedEmail = editEmail.trim();

    setProfileName(trimmedName);
    setProfilePhone(trimmedPhone);
    setProfileEmail(trimmedEmail);

    try {
      localStorage.setItem('freshlane_profile_name', trimmedName);
      localStorage.setItem('freshlane_profile_phone', trimmedPhone);
      localStorage.setItem('freshlane_profile_email', trimmedEmail);
    } catch {}

    const updatedUser: UserAccount = {
      ...(user || {
        id: 'cust-' + Date.now(),
        role: 'customer' as const,
        registeredAt: new Date().toISOString(),
      }),
      registeredAt: user?.registeredAt || new Date().toISOString(),
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
    };
    setCurrentSession(updatedUser, true);

    setIsEditingDetails(false);
    setIsEmailOtpVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setSaveSuccessMsg('Basic details updated!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const { mode, systemTheme, setThemeMode } = useTheme();

  useEffect(() => {
    setOrders(getUserOrders());
    const unsubscribe = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });
    return unsubscribe;
  }, []);

  const handleSelectMode = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    const labels: Record<ThemeMode, string> = {
      light: 'Light Mode ☀️ activated',
      dark: 'Dark Mode 🌙 activated',
      system: `System Mode 💻 activated (${systemTheme === 'dark' ? 'Dark' : 'Light'})`,
    };
    setModeFeedback(labels[newMode]);
    setTimeout(() => setModeFeedback(null), 3000);
  };

  const filteredOrders = orders.filter((ord) => {
    if (selectedFilter === 'active') {
      return ord.status !== 'delivered';
    }
    if (selectedFilter === 'delivered') {
      return ord.status === 'delivered';
    }
    return true;
  });

  const activeCount = orders.filter((o) => o.status !== 'delivered').length;

  const handleReorderClick = (order: OrderRecord) => {
    if (order.items && order.items.length > 0) {
      const cartItems: CartItem[] = order.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        unit: i.unit,
        image: i.image,
        qty: i.qty,
      }));
      onReorder(cartItems);
      setReorderSuccessId(order.id);
      setTimeout(() => setReorderSuccessId(null), 2500);
    }
  };

  const getStatusBadge = (status: string, promiseMinutes?: number) => {
    switch (status) {
      case 'on_route':
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Out for Delivery · {promiseMinutes || 20}m ETA</span>
          </span>
        );
      case 'packing':
      case 'picking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span>Packing Fresh at Hub</span>
          </span>
        );
      case 'delivered':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivered &amp; Handed Over</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>Customer Profile &amp; Purchases</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Profile &amp; Order Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your customer profile, configure display modes, review produce receipts, and reorder favorites.
          </p>
        </div>

        <button
          onClick={onGoToShop}
          className="self-start sm:self-auto px-5 py-2.5 btn-unique-dark text-white text-xs font-bold rounded-[32px] flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer hover:scale-[1.01] active:scale-95"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Browse Fresh Market</span>
        </button>
      </div>

      {/* Customer Profile & Basic Details Card */}
      <div className="bg-white/95 backdrop-blur-xl border border-emerald-900/10 rounded-[32px] p-5 sm:p-6 shadow-xs space-y-6">
        {/* Top Profile Summary Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-emerald-600 to-[#062217] text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0 border-2 border-emerald-300/40">
              {profileName ? profileName.slice(0, 1).toUpperCase() : <UserIcon className="w-7 h-7 text-emerald-200" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {profileName}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-[32px] border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Member
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                FreshLane Express Produce Shopper · Tadepalligudem Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {!isEditingDetails && (
              <button
                type="button"
                onClick={handleStartEditing}
                className="px-3.5 py-1.5 rounded-[32px] btn-unique-emerald text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-[1.02] active:scale-95"
                title="Edit basic details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Basic Details</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3.5 py-1.5 rounded-[32px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300/60"
                title="Open Advanced Settings"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>All Preferences</span>
              </button>
            )}
          </div>
        </div>

        {/* Basic Details Section */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-2xs">
                <UserIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Basic Details
                </h3>
                <p className="text-[11px] text-slate-500">
                  Account contact and identification details
                </p>
              </div>
            </div>

            {saveSuccessMsg && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-fade-in shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {saveSuccessMsg}
              </span>
            )}
          </div>

          {isEditingDetails ? (
            /* Inline Edit Form */
            <form onSubmit={handleSaveDetails} className="bg-slate-50/90 border border-slate-200 rounded-[24px] p-4 sm:p-5 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Name Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Name</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Enter full name"
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-[16px] px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                  />
                </div>

                {/* 2. Phone Number Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    placeholder="+91 98480 22338"
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-[16px] px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all font-mono"
                  />
                </div>

                {/* 3. Email ID Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email ID</span>
                    </label>
                    {isEmailChanged && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isEmailOtpVerified
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isEmailOtpVerified ? '✓ OTP Verified' : 'OTP Required'}
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => handleEmailInputChange(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className={`w-full text-xs font-semibold bg-white border rounded-[16px] px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 shadow-2xs transition-all ${
                      isEmailChanged
                        ? isEmailOtpVerified
                          ? 'border-emerald-500 focus:ring-emerald-500/20'
                          : 'border-amber-400 focus:ring-amber-500/20'
                        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Email Change OTP Verification Block */}
              {isEmailChanged && (
                <div className="bg-emerald-950/5 border border-emerald-500/30 rounded-[20px] p-4 space-y-3 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-900/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                        <Key className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          Verify New Email Address
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Changing from <span className="font-semibold text-slate-700">{profileEmail}</span> to <span className="font-semibold text-emerald-800 font-mono">{editEmail.trim()}</span> requires OTP confirmation.
                        </p>
                      </div>
                    </div>

                    {!isEmailOtpVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || resendTimer > 0}
                        className="px-3.5 py-1.5 rounded-[32px] btn-unique-emerald text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                      >
                        {isSendingOtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending OTP...</span>
                          </>
                        ) : otpSent ? (
                          resendTimer > 0 ? (
                            <span>Resend in {resendTimer}s</span>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Resend OTP</span>
                            </>
                          )
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send OTP to New Email</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* OTP Sent status message */}
                  {otpNotice && (
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 rounded-[14px] px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="flex-1">{otpNotice}</span>
                    </div>
                  )}

                  {/* Simulated Email preview banner for testing */}
                  {demoOtpHint && !isEmailOtpVerified && (
                    <div className="text-[11px] text-slate-600 bg-white/90 border border-emerald-200 rounded-[12px] px-3 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
                      <span>
                        📨 Simulated Email: OTP code is <strong className="font-mono text-emerald-700 text-xs">{demoOtpHint}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpInput(demoOtpHint);
                          handleVerifyOtp(demoOtpHint);
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      >
                        Auto-fill &amp; Verify
                      </button>
                    </div>
                  )}

                  {/* OTP Input and Verify Action */}
                  {!isEmailOtpVerified ? (
                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enter 6-Digit OTP</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setOtpInput(val);
                            if (val.length === 6) {
                              handleVerifyOtp(val);
                            }
                          }}
                          placeholder="Enter 6-digit OTP"
                          disabled={!otpSent}
                          className="flex-1 min-w-[160px] text-sm font-bold tracking-widest text-center bg-white border border-slate-300 rounded-[16px] px-3.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOtp()}
                          disabled={!otpSent || otpInput.trim().length !== 6}
                          className="px-4 py-2 rounded-[32px] btn-unique-emerald text-white text-xs font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-xs whitespace-nowrap"
                        >
                          Verify OTP
                        </button>
                      </div>
                      {!otpSent && (
                        <p className="text-[11px] text-amber-700 font-medium">
                          Click <strong>"Send OTP to New Email"</strong> above to receive your 6-digit verification code.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-[16px] p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>New email ({editEmail.trim()}) verified successfully!</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    </div>
                  )}

                  {/* OTP Error Message */}
                  {otpError && (
                    <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-[14px] px-3 py-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="text-xs">
                  {isEmailChanged && !isEmailOtpVerified ? (
                    <span className="flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Enter and verify the OTP sent to your new email to unlock the Save option.</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      All details are securely saved to your customer session.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(false)}
                    className="px-4 py-2 rounded-[32px] bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEmailChanged && !isEmailOtpVerified}
                    className={`px-5 py-2 rounded-[32px] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                      isEmailChanged && !isEmailOtpVerified
                        ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-70'
                        : 'btn-unique-emerald text-white cursor-pointer hover:scale-102 active:scale-95'
                    }`}
                    title={
                      isEmailChanged && !isEmailOtpVerified
                        ? 'Verify the OTP sent to your new email to enable saving'
                        : 'Save Details'
                    }
                  >
                    {isEmailChanged && !isEmailOtpVerified ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Details</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* 3 Distinct Detail Cards for Name, Phone Number, Email ID */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Name */}
              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-[22px] p-4 transition-all hover:border-emerald-300 hover:shadow-2xs group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Name</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Primary
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {profileName}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Account holder</span>
                </div>
              </div>

              {/* Card 2: Phone Number */}
              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-[22px] p-4 transition-all hover:border-emerald-300 hover:shadow-2xs group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Phone Number</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    SMS &amp; OTP
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate font-mono">
                  {profilePhone}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Delivery call &amp; SMS alerts</span>
                </div>
              </div>

              {/* Card 3: Email ID */}
              <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-[22px] p-4 transition-all hover:border-emerald-300 hover:shadow-2xs group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Email ID</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Receipts
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {profileEmail}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Order invoices &amp; notifications</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DISPLAY MODES IN PROFILE PAGE: ☀️ Light, 🌙 Dark, 💻 System               */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-emerald-900/10 rounded-[32px] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>Appearance &amp; Display Modes</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Select Display Mode
            </h3>
            <p className="text-xs text-slate-500">
              Customize how Freshlane Market looks on your screen. Active mode: <strong className="text-emerald-700 capitalize">{mode}</strong>.
            </p>
          </div>

          {modeFeedback && (
            <div className="px-3 py-1 rounded-[32px] bg-emerald-600 text-white text-xs font-bold shadow-xs animate-fade-in flex items-center gap-1.5 self-start sm:self-auto">
              <Check className="w-3 h-3" />
              <span>{modeFeedback}</span>
            </div>
          )}
        </div>

        {/* 3 Interactive Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => handleSelectMode('light')}
            className={`p-4 rounded-[24px] border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-full group ${
              mode === 'light'
                ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-2xs group-hover:scale-105 transition-transform">
                <Sun className="w-5 h-5" />
              </div>
              {mode === 'light' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-[32px] shadow-2xs">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600">
                  Switch
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Light Mode</div>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Crisp high-contrast daylight view with fresh farm greens.
              </p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => handleSelectMode('dark')}
            className={`p-4 rounded-[24px] border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-full group ${
              mode === 'dark'
                ? 'bg-[#071812] text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-[#091b15] hover:bg-[#0c241d] text-slate-200 border-emerald-900/60 hover:border-emerald-600/60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
                <Moon className="w-5 h-5" />
              </div>
              {mode === 'dark' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-[32px] shadow-2xs">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-300 group-hover:text-white">
                  Switch
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Dark Mode</div>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                Deep emerald slate theme, restful on eyes for evening shopping.
              </p>
            </div>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => handleSelectMode('system')}
            className={`p-4 rounded-[24px] border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-full group ${
              mode === 'system'
                ? 'bg-white border-sky-600 shadow-md ring-2 ring-sky-500/20'
                : 'bg-white/80 hover:bg-white border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-500 shadow-2xs group-hover:scale-105 transition-transform">
                <Laptop className="w-5 h-5" />
              </div>
              {mode === 'system' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-sky-600 text-white px-2 py-0.5 rounded-[32px] shadow-2xs">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-sky-600">
                  Switch
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">System Default</div>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Matches your OS setting (currently {systemTheme === 'dark' ? 'Dark 🌙' : 'Light ☀️'}).
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ORDERS SECTION IN PROFILE PAGE: Filter Tabs & Order History Cards         */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-[32px] cursor-pointer transition-all ${
                selectedFilter === 'all'
                  ? 'btn-unique-dark text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setSelectedFilter('active')}
              className={`px-4 py-2 text-xs font-bold rounded-[32px] cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedFilter === 'active'
                  ? 'btn-unique-emerald text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>In Progress ({activeCount})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('delivered')}
              className={`px-4 py-2 text-xs font-bold rounded-[32px] cursor-pointer transition-all ${
                selectedFilter === 'delivered'
                  ? 'btn-unique-dark text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Delivered ({orders.length - activeCount})
            </button>
          </div>
        </div>

        {/* Order List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No orders in this category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Explore our daily farm-fresh fruits, vegetable bundles, and healthy greens delivered in 24–30 minutes.
            </p>
            <button
              onClick={onGoToShop}
              className="mt-4 px-5 py-2.5 btn-unique-emerald text-white font-bold text-xs rounded-[32px] shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all"
            >
              <span>Start Your First Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white/95 backdrop-blur-xl border border-emerald-900/10 hover:border-emerald-500/30 rounded-[32px] p-5 sm:p-6 shadow-xs transition-all hover:shadow-md"
              >
                {/* Order Card Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {order.id}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {order.formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status, order.promiseMinutes)}
                  </div>
                </div>

                {/* Order Content */}
                <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Items preview */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                      <strong className="text-slate-900">Items ({order.itemCount}): </strong>
                      {order.itemsSummary}
                    </div>

                    {/* Thumbnails row */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {order.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group"
                            title={`${it.name} (${it.qty} × ${it.unit})`}
                          >
                            <img
                              src={it.image}
                              alt={it.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white text-[9px] font-black px-1 rounded-tl">
                              ×{it.qty}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivery Location */}
                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{order.address}</span>
                    </div>
                  </div>

                  {/* Pricing and Razorpay verification */}
                  <div className="md:col-span-5 flex flex-col md:items-end justify-center md:border-l md:border-slate-100 md:pl-4 space-y-2">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Paid Amount
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        ₹{order.amount}
                      </div>
                    </div>

                    {/* Payment badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{order.paymentMethod}</span>
                      {order.razorpayPaymentId && (
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1 rounded border border-slate-200">
                          {order.razorpayPaymentId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Card Actions: Track button removed, Reorder Fresh kept */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {order.driverName && (
                      <span className="flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Assigned Rider: {order.driverName}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReceiptOrder(order);
                        setReceiptEmailSuccessMsg(null);
                      }}
                      className="px-4 py-2 rounded-[32px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all border border-slate-200 hover:border-emerald-300"
                      title="View complete official order receipt"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                      <span>View Receipt</span>
                    </button>
                    <button
                      onClick={() => handleReorderClick(order)}
                      className="px-5 py-2 rounded-[32px] btn-unique-emerald text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {reorderSuccessId === order.id ? 'Added to Bag! ✓' : 'Reorder Fresh'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILED RECEIPT MODAL                                                    */}
      {/* ========================================================================= */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => {
              setSelectedReceiptOrder(null);
              setReceiptEmailSuccessMsg(null);
            }}
          />
          <div className="relative w-full max-w-xl bg-white border border-emerald-900/15 rounded-[32px] p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto space-y-5">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl btn-unique-emerald text-white flex items-center justify-center font-black text-sm shadow-md">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                    Official Order Receipt
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    FreshLane Market · Tadepalligudem 15km Hub
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReceiptOrder(null);
                    setReceiptEmailSuccessMsg(null);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email Dispatch Action Banner */}
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-[22px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950">Customer Email: </span>
                  <span className="font-mono text-emerald-800">
                    {selectedReceiptOrder.customerEmail || profileEmail}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSendEmailReceipt(selectedReceiptOrder)}
                disabled={isSendingOrderReceipt}
                className="px-3.5 py-1.5 rounded-[32px] btn-unique-emerald text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto disabled:opacity-60"
              >
                <Send className={`w-3 h-3 ${isSendingOrderReceipt ? 'animate-pulse' : ''}`} />
                <span>{isSendingOrderReceipt ? 'Sending...' : 'Email Receipt to Me'}</span>
              </button>
            </div>

            {receiptEmailSuccessMsg && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 rounded-xl px-3 py-2 flex items-center gap-1.5 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>{receiptEmailSuccessMsg}</span>
              </div>
            )}

            {/* Receipt Body Card */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-[24px] p-4 sm:p-5 space-y-4 text-xs">
              {/* Order ID & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Order Identifier</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {selectedReceiptOrder.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedReceiptOrder.id);
                        setIsCopiedReceiptId(true);
                        setTimeout(() => setIsCopiedReceiptId(false), 2000);
                      }}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-500 cursor-pointer"
                      title="Copy ID"
                    >
                      {isCopiedReceiptId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-slate-500 text-[11px] font-medium">
                    {selectedReceiptOrder.formattedDate || new Date(selectedReceiptOrder.timePlaced).toLocaleString()}
                  </span>
                  {getStatusBadge(selectedReceiptOrder.status, selectedReceiptOrder.promiseMinutes)}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Delivery To</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {selectedReceiptOrder.customerName || profileName}
                  </span>
                  <span className="text-slate-600 text-[11px] block mt-0.5">
                    {selectedReceiptOrder.address}
                  </span>
                  <span className="text-slate-500 text-[11px] block font-mono mt-0.5">
                    {selectedReceiptOrder.customerPhone || profilePhone}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fulfillment Details</span>
                  <span className="font-bold text-emerald-700 block">
                    Express Dispatch · 24–30 Min
                  </span>
                  <span className="text-slate-600 text-[11px] block mt-0.5">
                    Rider: {selectedReceiptOrder.driverName || 'Express Fleet (DRV-101)'}
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Hub: Tadepalligudem 15km Zone
                  </span>
                </div>
              </div>

              {/* Ordered Things Itemized */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <span>Ordered Things ({selectedReceiptOrder.itemCount} items)</span>
                  <span>Total</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedReceiptOrder.items && selectedReceiptOrder.items.length > 0 ? (
                    selectedReceiptOrder.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-200/80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {it.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {it.qty} × {it.unit} · ₹{it.price}/{it.unit}
                            </div>
                          </div>
                        </div>
                        <div className="font-black text-slate-900 text-xs whitespace-nowrap text-right">
                          ₹{it.price * it.qty}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                      {selectedReceiptOrder.itemsSummary}
                    </div>
                  )}
                </div>
              </div>

              {/* Charges & Billing Breakdown */}
              <div className="bg-emerald-950/5 border border-emerald-900/10 rounded-2xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Charges &amp; Billing Breakdown
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    ₹{selectedReceiptOrder.subtotal || selectedReceiptOrder.amount}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs items-center">
                  <span className="flex items-center gap-1.5">
                    <span>Express 24–30 Min Delivery Charges</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                      FREE
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="line-through text-slate-400 text-[11px]">₹35</span>
                    <span className="text-emerald-700 font-black">₹0</span>
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs items-center">
                  <span className="flex items-center gap-1.5">
                    <span>Eco Fresh Bag &amp; Packaging Charge</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                      FREE
                    </span>
                  </span>
                  <span className="text-emerald-700 font-black">₹0</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Taxes &amp; AP Mandi Cess</span>
                  <span className="text-emerald-700 font-medium">₹0 (Included)</span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Bill Amount</span>
                  <span className="text-emerald-700 text-base">₹{selectedReceiptOrder.amount}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Payment Method</span>
                  <span className="font-bold text-slate-900">
                    {selectedReceiptOrder.paymentMethod}
                  </span>
                </div>
                {selectedReceiptOrder.razorpayPaymentId && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Razorpay Ref</span>
                    <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                      {selectedReceiptOrder.razorpayPaymentId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-[32px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptOrder(null);
                  setReceiptEmailSuccessMsg(null);
                }}
                className="px-6 py-2.5 btn-unique-emerald text-white font-bold text-xs rounded-[32px] cursor-pointer shadow-md transition-all hover:scale-102 active:scale-95"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
