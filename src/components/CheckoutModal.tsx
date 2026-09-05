import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  ExternalLink,
  Settings,
  Navigation,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { CartItem, UserAccount } from '../types';
import { saveUserOrder } from '../utils/orderStore';
import { checkDeliveryEligibility, DeliveryEligibilityResult, TADEPALLIGUDEM_ZONE_AREAS } from '../utils/deliveryZone';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  user: UserAccount | null;
  onOrderPlaced: (orderData: any) => void;
  onGoToOrderHistory?: () => void;
  onTrackOrder?: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  user,
  onOrderPlaced,
  onGoToOrderHistory,
  onTrackOrder,
}) => {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'cod'>('razorpay');
  const [address, setAddress] = useState(
    user?.address || 'Flat 204, Sri Rama Residency, KN Road, Tadepalligudem, 534102'
  );
  const [rangeStatus, setRangeStatus] = useState<DeliveryEligibilityResult>(() =>
    checkDeliveryEligibility({
      address: user?.address || 'Flat 204, Sri Rama Residency, KN Road, Tadepalligudem, 534102',
    })
  );
  const [contactPhone, setContactPhone] = useState(user?.phone || '9876543210');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [razorpayPaymentId, setRazorpayPaymentId] = useState<string>('');
  const [razorpayOrderId, setRazorpayOrderId] = useState<string>('');
  const [customKeyOpen, setCustomKeyOpen] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>(() => {
    return (
      localStorage.getItem('freshlane_razorpay_key') ||
      (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
      'rzp_live_TYCJiSOV0TpCse'
    );
  });
  const [cloudflareWorkerUrl, setCloudflareWorkerUrl] = useState<string>(() => {
    return localStorage.getItem('freshlane_cloudflare_url') || '';
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress);
    const result = checkDeliveryEligibility({ address: newAddress });
    setRangeStatus(result);
    if (!result.isDeliverable) {
      setPaymentError(
        `You are out of delivery range (~${result.distanceKm} km away). FreshLane delivers exclusively within a 15 km radius of Tadepalligudem (PIN 534102).`
      );
    } else {
      setPaymentError(null);
    }
  };

  const handleUseMyLocation = () => {
    setIsDetectingLocation(true);
    setLocationSuccessMsg(null);
    setPaymentError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsDetectingLocation(false);
      setPaymentError('Geolocation is not supported on this browser or device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const userCoords = { lat, lng };

        // Check delivery eligibility strictly against Tadepalligudem 15km Hub
        const eligibility = checkDeliveryEligibility({ coords: userCoords });
        setRangeStatus(eligibility);

        let resolvedAddress = '';

        // Reverse Geocode using OpenStreetMap Nominatim for human-readable street/locality address
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
          );
          clearTimeout(timeoutId);

          if (geoRes.ok) {
            const data = await geoRes.json();
            if (data && data.address) {
              const addr = data.address;
              const parts = [
                addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
                addr.residential || addr.city_district || addr.village || addr.town || addr.city,
                addr.state_district || addr.county,
                addr.postcode || (eligibility.isDeliverable ? '534102' : ''),
                addr.state || 'Andhra Pradesh'
              ].filter(Boolean);

              if (parts.length > 0) {
                resolvedAddress = parts.join(', ');
              }
            }
          }
        } catch (err) {
          console.warn('Reverse geocode request timed out or was blocked:', err);
        }

        // Fallback address formatting with exact GPS coordinates and closest locality
        if (!resolvedAddress) {
          if (eligibility.isDeliverable) {
            const matchedArea = TADEPALLIGUDEM_ZONE_AREAS.find(a =>
              eligibility.localityMatched && a.name.toLowerCase().includes(eligibility.localityMatched.toLowerCase())
            ) || TADEPALLIGUDEM_ZONE_AREAS[0];
            resolvedAddress = `${matchedArea.name}, Tadepalligudem, 534102 (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          } else {
            resolvedAddress = `Current GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} (~${eligibility.distanceKm} km from Tadepalligudem Hub)`;
          }
        }

        setAddress(resolvedAddress);
        setIsDetectingLocation(false);

        if (eligibility.isDeliverable) {
          setLocationSuccessMsg(`Exact location detected (~${eligibility.distanceKm} km from Hub)`);
          setPaymentError(null);
          setTimeout(() => setLocationSuccessMsg(null), 5000);
        } else {
          setPaymentError(
            `You are out of delivery range (~${eligibility.distanceKm} km away). FreshLane delivers strictly within a 15 km radius of Tadepalligudem (PIN 534102).`
          );
        }
      },
      (geoError) => {
        console.warn('Geolocation error:', geoError);
        setIsDetectingLocation(false);
        let msg = 'Could not detect your exact location. Please ensure location access is allowed in your browser.';
        if (geoError.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser or enter your delivery address.';
        } else if (geoError.code === 2) {
          msg = 'Location unavailable on your device. Please enter your delivery address manually.';
        } else if (geoError.code === 3) {
          msg = 'Location detection timed out. Please try again or enter your delivery address.';
        }
        setPaymentError(msg);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal >= 299 || subtotal === 0 ? 0 : 35;
  const grandTotal = subtotal + deliveryFee;

  const handleSaveCustomKey = (key: string, cfUrl?: string) => {
    setRazorpayKeyId(key.trim());
    localStorage.setItem('freshlane_razorpay_key', key.trim());
    if (cfUrl !== undefined) {
      setCloudflareWorkerUrl(cfUrl.trim());
      localStorage.setItem('freshlane_cloudflare_url', cfUrl.trim());
    }
    setCustomKeyOpen(false);
  };

  const completeOrder = (payMethod: string, rzpPaymentId?: string, rzpOrderId?: string) => {
    const generatedId = `FL-${Math.floor(100000 + Math.random() * 900000)}`;

    setOrderId(generatedId);
    if (rzpPaymentId) setRazorpayPaymentId(rzpPaymentId);
    if (rzpOrderId) setRazorpayOrderId(rzpOrderId);
    setOrderComplete(true);
    setIsSubmitting(false);
    setIsVerifying(false);

    // Save to durable Order History store
    saveUserOrder({
      id: generatedId,
      items,
      total: grandTotal,
      address,
      paymentMethod: payMethod === 'razorpay' ? 'Razorpay Secure' : payMethod === 'upi' ? 'Direct UPI' : 'Cash on Delivery',
      razorpayPaymentId: rzpPaymentId,
      razorpayOrderId: rzpOrderId,
      customerName: user?.name || 'Customer',
      customerEmail: user?.email || 'customer@freshlane.com',
    });

    onOrderPlaced({
      id: generatedId,
      items,
      total: grandTotal,
      address,
      paymentMethod: payMethod,
      razorpayPaymentId: rzpPaymentId,
      razorpayOrderId: rzpOrderId,
    });
  };

  const handleRazorpayCheckout = async () => {
    setIsSubmitting(true);
    setPaymentError(null);

    // Enforce Tadepalligudem 15km Delivery Radius Check before payment
    if (!rangeStatus.isDeliverable) {
      setPaymentError(
        `You are out of delivery range (~${rangeStatus.distanceKm} km away). Delivery is restricted to a 15 km radius of Tadepalligudem (PIN 534102).`
      );
      setIsSubmitting(false);
      return;
    }

    // Verify checkout.js is loaded
    const hasRazorpay = typeof window !== 'undefined' && (window as any).Razorpay;
    if (!hasRazorpay) {
      setPaymentError('Razorpay Checkout SDK is not available yet. Please reload or check your connection.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Call Backend to Create Order (amount in paise, minimum 100 paise)
      const amountPaise = Math.round(grandTotal * 100);
      if (amountPaise < 100) {
        setPaymentError('Order amount must be at least ₹1.00 (100 paise) to process via Razorpay.');
        setIsSubmitting(false);
        return;
      }

      // Supports direct Cloudflare Worker endpoint or internal Express API
      const apiBase = cloudflareWorkerUrl.trim().replace(/\/$/, '');
      const createOrderEndpoint = apiBase ? `${apiBase}/api/create-order` : '/api/create-order';
      const verifyPaymentEndpoint = apiBase ? `${apiBase}/api/verify-payment` : '/api/verify-payment';

      const createOrderRes = await fetch(createOrderEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now().toString().slice(-10)}`,
          address,
        }),
      });

      if (!createOrderRes.ok) {
        const errJson = await createOrderRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${createOrderRes.status} creating order`);
      }

      const orderData = await createOrderRes.json();
      const { order_id, amount: orderAmountPaise, currency: orderCurrency, key_id: serverKeyId } = orderData;

      if (!order_id) {
        throw new Error('Razorpay order ID was not received from the server.');
      }

      // Step 2: Open Standard Razorpay Checkout Modal (using live server key)
      const activeKey = serverKeyId || razorpayKeyId || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_live_TYCJiSOV0TpCse';

      const options = {
        key: activeKey,
        amount: orderAmountPaise,
        currency: orderCurrency || 'INR',
        name: 'FreshLane Produce Market',
        description: `30-Min Fresh Delivery · Tadepalligudem 15km Zone`,
        order_id: order_id,
        image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=128&auto=format&fit=crop&q=80',
        prefill: {
          name: user?.name || 'Shopper',
          email: user?.email || 'shopper@freshlane.com',
          contact: contactPhone,
        },
        notes: {
          delivery_address: address,
          hub: 'Tadepalligudem (534102)',
        },
        theme: {
          color: '#059669', // Emerald-600
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setIsSubmitting(true);
          setIsVerifying(true);
          setPaymentError(null);

          try {
            // Step 3: Backend signature verification endpoint
            const verifyRes = await fetch(verifyPaymentEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            setIsVerifying(false);

            if (verifyRes.ok && verifyData.success) {
              // Verified! Signature matches
              completeOrder('razorpay', response.razorpay_payment_id, response.razorpay_order_id);
            } else {
              // Verification failed: do NOT mark as paid
              console.error('Razorpay signature mismatch on backend:', verifyData);
              setPaymentError(verifyData.error || 'Payment signature verification failed. The payment was not marked as paid.');
              setIsSubmitting(false);
            }
          } catch (verifyErr: any) {
            console.error('Verify payment request error:', verifyErr);
            setIsVerifying(false);
            setIsSubmitting(false);
            setPaymentError(verifyErr?.message || 'Failed to verify payment with server. Please reach customer care.');
          }
        },
        modal: {
          ondismiss: function () {
            console.log('Customer cancelled or dismissed the Razorpay checkout modal');
            setIsSubmitting(false);
            setIsVerifying(false);
            setPaymentError('Payment window closed. You can retry when you are ready.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      // Listen for payment failure
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response);
        const reason = response.error?.description || response.error?.reason || 'Payment could not be completed';
        setPaymentError(`Payment Failed: ${reason}`);
        setIsSubmitting(false);
        setIsVerifying(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Razorpay checkout initialization error:', err);
      setPaymentError(err?.message || 'Could not initialize Razorpay checkout. Please try again.');
      setIsSubmitting(false);
      setIsVerifying(false);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'razorpay') {
      handleRazorpayCheckout();
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        completeOrder(paymentMethod);
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {!orderComplete ? (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                  Express Checkout
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Confirm 30-Min Delivery
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Delivery Address */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Delivery Address</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isDetectingLocation}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
                    title="Detect exact GPS location to deliver"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 text-white" />
                        <span>Use My Location</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  {rangeStatus.isDeliverable ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>⚡ 24–30 min ETA ({rangeStatus.distanceKm} km from 534102 Hub)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>⛔ Out of Range ({rangeStatus.distanceKm} km away)</span>
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Enter full address, colony, and PIN code..."
                  className={`w-full text-xs p-2 bg-white border rounded-lg outline-none transition-all ${
                    !rangeStatus.isDeliverable
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/20 text-slate-900'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900'
                  }`}
                  required
                />

                {/* Location Detection Success Confirmation */}
                {locationSuccessMsg && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{locationSuccessMsg}</span>
                  </div>
                )}

                {/* Out of range alert message */}
                {!rangeStatus.isDeliverable && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2.5 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 text-[11px] leading-relaxed">
                        <p className="font-bold text-rose-800">You are out of delivery range</p>
                        <p className="text-rose-700 mt-0.5">
                          FreshLane operates exclusively within a <strong>15 km radius of Tadepalligudem (PIN 534102)</strong>. Your specified address is ~{rangeStatus.distanceKm} km away. Orders cannot be fulfilled outside this zone.
                        </p>
                      </div>
                    </div>

                    {/* Prominent Use My Location button for mobile users */}
                    <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-100/70 p-2.5 rounded-lg">
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-900 font-semibold">
                        <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Are you currently in Tadepalligudem?</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={isDetectingLocation}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
                        title="Detect exact GPS location using mobile phone location"
                      >
                        {isDetectingLocation ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            <span>Detecting Mobile Location...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3.5 h-3.5 text-white fill-white/20" />
                            <span>Use My Location</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Area Test Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                  <span className="text-slate-400 text-[10px] font-medium mr-1">Locations:</span>
                  <button
                    type="button"
                    onClick={() => handleAddressChange('Flat 204, Sri Rama Residency, KN Road, Tadepalligudem, 534102')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] cursor-pointer"
                  >
                    KN Road (1.2km)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddressChange('Kobbarithota, Tadepalligudem, 534102')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] cursor-pointer"
                  >
                    Kobbarithota (1.6km)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddressChange('Plot 15, Subba Rao Peta, Tadepalligudem, 534102')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] cursor-pointer"
                  >
                    Subba Rao Peta (1.8km)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddressChange('Main Bazaar, Pentapadu, 534166')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] cursor-pointer"
                  >
                    Pentapadu (4.5km)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddressChange('Opposite Bus Stand, Tanuku, 534211')}
                    className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-medium cursor-pointer"
                    title="Test out of range address"
                  >
                    Tanuku (21km · Out of Range)
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Contact:</span>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone number"
                    className="flex-1 text-xs p-1.5 bg-white border border-slate-200 rounded-md outline-none focus:border-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-800">
                    Choose Payment Method
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomKeyOpen(!customKeyOpen)}
                    className="text-[10px] text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Razorpay &amp; Cloudflare ({razorpayKeyId ? 'Configured' : 'Default'})</span>
                  </button>
                </div>

                {/* Razorpay Key Configuration collapse */}
                {customKeyOpen && (
                  <div className="mb-3 p-3 bg-slate-900 text-white rounded-xl text-xs space-y-2.5">
                    <div className="font-bold flex items-center justify-between">
                      <span>Direct Razorpay &amp; Cloudflare</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Custom API</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Use your direct Razorpay Key ID and optional Cloudflare Worker URL to process transactions via your Cloudflare worker:
                    </p>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Razorpay Key ID (Live)</label>
                        <input
                          type="text"
                          defaultValue={razorpayKeyId}
                          id="razorpay-key-input"
                          placeholder="rzp_live_..."
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Cloudflare Worker URL (optional, leave blank to use built-in backend)</label>
                        <input
                          type="text"
                          defaultValue={cloudflareWorkerUrl}
                          id="cloudflare-url-input"
                          placeholder="https://your-razorpay-worker.workers.dev"
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono outline-none"
                        />
                      </div>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const keyInput = document.getElementById('razorpay-key-input') as HTMLInputElement;
                            const cfInput = document.getElementById('cloudflare-url-input') as HTMLInputElement;
                            if (keyInput) handleSaveCustomKey(keyInput.value, cfInput?.value || '');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Save Credentials
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Option Selector */}
                <div className="space-y-2">
                  {/* Option 1: Razorpay (Primary) */}
                  <div
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === 'razorpay'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          ₹
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Razorpay Secure Gateway</span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              Recommended
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            UPI (GPay / PhonePe / Paytm), Credit/Debit Cards, NetBanking, Wallets
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                        className="w-4 h-4 text-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Secondary Payment Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'upi'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold leading-tight truncate">Direct UPI VPA</div>
                        <div className="text-[10px] text-slate-500 truncate">Manual VPA transfer</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'cod'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold leading-tight truncate">Cash on Delivery</div>
                        <div className="text-[10px] text-slate-500 truncate">Pay to driver</div>
                      </div>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'upi' && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Enter UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Order Summary list */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="font-semibold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Items Summary ({items.length})</span>
                  <span className="text-[11px] text-emerald-600 font-bold">Free 30-min Delivery</span>
                </div>
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-slate-600">
                    <span className="truncate pr-2">
                      {item.name} ({item.qty} × {item.unit})
                    </span>
                    <span className="font-medium text-slate-900 whitespace-nowrap">₹{item.price * item.qty}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-[11px] text-slate-500 italic">+ {items.length - 3} more fresh items</p>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
                  <span>Grand Total</span>
                  <span className="text-emerald-600">₹{grandTotal}</span>
                </div>
              </div>

              {/* Security Assurance */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-bit Encrypted Payments</span>
                </span>
                <span className="text-slate-400">Powered by Razorpay</span>
              </div>

              {/* Payment Error Alert */}
              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{paymentError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentError(null)}
                    className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !rangeStatus.isDeliverable}
                className={`w-full py-3.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
                  !rangeStatus.isDeliverable
                    ? 'bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
                }`}
              >
                {!rangeStatus.isDeliverable ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>⛔ Out of Delivery Range (15 km Tadepalligudem Limit)</span>
                  </>
                ) : isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>
                      {isVerifying
                        ? 'Verifying Payment with Server...'
                        : 'Contacting Razorpay Gateway...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {paymentMethod === 'razorpay'
                        ? `Pay with Razorpay · ₹${grandTotal}`
                        : `Place Order · ₹${grandTotal}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Order Confirmed Screen */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-2xl shadow-md">
              ✓
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Order Confirmed · {orderId}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
                Fresh Produce Is On The Way!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Assigned to FreshLane driver <strong>Arjun S. (Indiranagar Zone)</strong>.
                Your items have been hand-picked and will arrive in approx. <strong>26 minutes</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[220px]">{address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery Time:</span>
                <span className="font-bold text-emerald-600">
                  Today by {new Date(Date.now() + 28 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900">
                  ₹{grandTotal} ({paymentMethod === 'razorpay' ? 'Razorpay Secure' : paymentMethod.toUpperCase()})
                </span>
              </div>
              {razorpayPaymentId && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Razorpay Payment ID:</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                    {razorpayPaymentId}
                  </span>
                </div>
              )}
              {razorpayOrderId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Razorpay Order ID:</span>
                  <span className="font-mono text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {razorpayOrderId}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {onTrackOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTrackOrder(orderId);
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-white" />
                  <span>Track Live Delivery (30m) →</span>
                </button>
              )}
              {onGoToOrderHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToOrderHistory();
                  }}
                  className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200/80 cursor-pointer transition-colors"
                >
                  View in Order History
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
