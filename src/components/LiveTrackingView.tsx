import React, { useState, useEffect } from 'react';
import {
  Bike,
  Clock,
  MapPin,
  CheckCircle2,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Package,
  AlertCircle,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { OrderRecord, OrderLiveTrackingState, DeliveryRating } from '../types';
import { LiveMap } from './LiveMap';
import { getUserOrders } from '../utils/orderStore';
import { safeResponseJson } from '../utils/safeFetch';

interface LiveTrackingViewProps {
  orderId: string;
  onBackToOrders: () => void;
  onGoToShop: () => void;
}

export const LiveTrackingView: React.FC<LiveTrackingViewProps> = ({
  orderId,
  onBackToOrders,
  onGoToShop,
}) => {
  const [trackingData, setTrackingData] = useState<OrderLiveTrackingState | null>(null);
  const [localOrder, setLocalOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Rating & Feedback State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Super fresh greens', 'On-time delivery']);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Available feedback tags
  const feedbackTags = [
    'Super fresh greens',
    'On-time delivery',
    'Polite rider',
    'Carefully packed',
    'Cold insulation intact',
    'Contactless doorstep drop',
  ];

  // Load local order details
  useEffect(() => {
    const orders = getUserOrders();
    const found = orders.find((o) => o.id === orderId) || orders[0];
    if (found) {
      setLocalOrder(found);
      if (found.rating) {
        setRatingSubmitted(true);
      }
    }
  }, [orderId]);

  // Connect to SSE stream and fallback poller
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    const cleanId = (orderId || 'FL-91428').trim();

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/order/${cleanId}/location`);
        if (res.ok) {
          const data = await safeResponseJson(res, null);
          if (data) {
            setTrackingData(data);
            setIsConnected(true);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn('Order tracking snapshot notice:', err);
      }
    };

    fetchSnapshot();

    // Setup Server-Sent Events for real-time live location push
    try {
      eventSource = new EventSource(`/api/order/${cleanId}/stream`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          if (event.data && typeof event.data === 'string' && event.data.trim().startsWith('{')) {
            const parsed = JSON.parse(event.data);
            setTrackingData(parsed);
            setIsConnected(true);
            setIsLoading(false);

            // Auto-prompt rating when status switches to delivered
            if (parsed.status === 'delivered' && !ratingSubmitted) {
              setShowRatingModal(true);
            }
          }
        } catch (e) {
          console.warn('SSE payload warning:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        // Fallback polling if SSE is interrupted
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchSnapshot, 3000);
        }
      };
    } catch (e) {
      console.warn('SSE not supported or failed, starting polling', e);
      fallbackInterval = setInterval(fetchSnapshot, 3000);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [orderId, ratingSubmitted]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleRatingSubmit = async () => {
    setIsSubmittingRating(true);
    const cleanId = (orderId || 'FL-91428').trim();
    try {
      const res = await fetch(`/api/order/${cleanId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: selectedStars,
          tags: selectedTags,
          comment: reviewComment,
        }),
      });

      if (res.ok) {
        setRatingSubmitted(true);
        setShowRatingModal(false);
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Default coordinate fallbacks
  const storeCoords = trackingData?.storeCoords || { lat: 12.9784, lng: 77.6408 };
  const customerCoords = trackingData?.customerCoords || { lat: 12.9698, lng: 77.6499 };
  const driverCoords = trackingData?.driver?.coords;
  const isDelivered = trackingData?.status === 'delivered';
  const etaMinutes = trackingData?.etaMinutes ?? 16;
  const distanceMeters = trackingData?.distanceMeters ?? 1400;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToOrders}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[32px] bg-white/90 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer shadow-2xs hover:shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[32px] bg-white/80 border border-emerald-200/60 shadow-2xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-xs font-semibold text-slate-700">
            {isConnected ? 'Real-Time GPS Connected' : 'Syncing...'}
          </span>
        </div>
      </div>

      {/* Main ETA Hero Banner */}
      <div className="bg-gradient-to-br from-[#0b241c] via-[#081d16] to-[#040f0b] text-white rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-emerald-500/25">
        {/* Subtle background glow */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[32px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-wider backdrop-blur-sm">
              <Bike className="w-3.5 h-3.5" />
              <span>Express 30-Min Produce Drop</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {isDelivered ? (
                <span className="text-emerald-400">Order Delivered!</span>
              ) : (
                <span>Arriving in ~{etaMinutes} Minutes</span>
              )}
            </h1>

            <p className="text-sm text-slate-300 max-w-lg">
              {isDelivered
                ? 'Your farm-fresh bundle has been safely delivered to your doorstep. Thank you for shopping local with FreshLane!'
                : `Your express rider is navigating the optimal fresh produce route to ${
                    localOrder?.address || 'your doorstep'
                  }.`}
            </p>
          </div>

          {/* Delivery OTP Badge */}
          {!isDelivered && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] p-5 text-center w-full sm:w-auto sm:min-w-[180px] shadow-lg">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Delivery PIN (OTP)
              </div>
              <div className="text-3xl font-mono font-black text-emerald-400 tracking-widest my-1">
                {trackingData?.deliveryOtp || '4829'}
              </div>
              <div className="text-[10px] text-slate-300">
                Share with rider upon arrival
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Live Map Component */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Live Rider Navigation (Tadepalligudem 534102 Hub)</span>
          </span>
          <span className="text-slate-500 font-mono">
            {isDelivered
              ? 'Status: Completed'
              : `${(distanceMeters / 1000).toFixed(1)} km remaining`}
          </span>
        </div>

        <LiveMap
          driverCoords={driverCoords}
          customerCoords={customerCoords}
          storeCoords={storeCoords}
          customerAddress={localOrder?.address || 'KN Road, Tadepalligudem, 534102'}
          driverName={trackingData?.driver?.name || 'Arjun S.'}
          driverVehicle={trackingData?.driver?.vehicle || 'Ather EV'}
          etaMinutes={etaMinutes}
          distanceMeters={distanceMeters}
          isDelivered={isDelivered}
          geofenceArrived={trackingData?.geofenceArrived}
          heightClass="h-80 sm:h-96"
        />
      </div>

      {/* Rider Info Card */}
      {trackingData?.driver && (
        <div className="bg-white/95 backdrop-blur-xl border border-emerald-900/10 rounded-[32px] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[28px] bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 font-extrabold text-xl shadow-xs">
              <Bike className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  {trackingData.driver.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[32px] bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span>{trackingData.driver.rating.toFixed(1)}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {trackingData.driver.vehicle} · Verified FreshLane Express Rider
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span>{trackingData.driver.batteryLevel}% EV Battery</span>
                </span>
                <span>•</span>
                <span>Insulated Produce Bag #2</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${trackingData.driver.phone}`}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-[32px] flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-slate-600" />
              <span>Call Rider</span>
            </a>
            <button
              onClick={() => alert(`Messaging rider at ${trackingData.driver.phone}: "Please leave at door if doorbell not answered"`)}
              className="px-5 py-2.5 btn-unique-emerald text-white text-xs font-bold rounded-[32px] flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </button>
          </div>
        </div>
      )}

      {/* 5-Stage Order Status Timeline */}
      <div className="bg-white/95 backdrop-blur-xl border border-emerald-900/10 rounded-[32px] p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Delivery Milestones</span>
        </h3>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {(trackingData?.timeline || [
            { step: 'placed', label: 'Order Placed & Confirmed', completed: true, time: '18 min ago' },
            { step: 'confirmed', label: 'Hub Confirmed & Packed', completed: true, time: '14 min ago' },
            { step: 'picked_up', label: 'Picked Up by Rider', completed: true, time: '8 min ago' },
            { step: 'on_the_way', label: 'On the Way (Express Delivery)', completed: true, time: 'Now' },
            { step: 'delivered', label: 'Delivered to Doorstep', completed: false },
          ]).map((item, idx) => (
            <div key={idx} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                  item.completed
                    ? 'btn-unique-emerald text-white ring-4 ring-emerald-50'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {item.completed ? '✓' : idx + 1}
              </div>

              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <div
                    className={`text-xs sm:text-sm font-bold ${
                      item.completed ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </div>
                  {item.step === 'on_the_way' && !isDelivered && (
                    <div className="text-[11px] text-emerald-600 font-semibold animate-pulse mt-0.5">
                      Rider is currently on the move · GPS live updating
                    </div>
                  )}
                </div>

                {item.time && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.time}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Ratings & Feedback Card (if delivered) */}
      {isDelivered && (
        <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-[32px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-emerald-950">
                {ratingSubmitted ? 'Feedback Received · Thank You!' : 'Rate Your Express Delivery'}
              </h3>
            </div>
            {ratingSubmitted && (
              <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-[32px] border border-emerald-200">
                5-Star Verified
              </span>
            )}
          </div>

          {!ratingSubmitted ? (
            <div className="space-y-4">
              <p className="text-xs text-emerald-800">
                How was the produce quality and rider speed today? Your review directly rewards your driver!
              </p>

              {/* Star selection */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedStars(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= selectedStars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">
                  {selectedStars === 5
                    ? 'Super Fast & Farm Fresh!'
                    : selectedStars === 4
                    ? 'Great Service'
                    : `${selectedStars} Stars`}
                </span>
              </div>

              {/* Feedback tags */}
              <div className="flex flex-wrap gap-2 pt-1">
                {feedbackTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3.5 py-1.5 rounded-[32px] text-xs font-semibold cursor-pointer transition-all ${
                      selectedTags.includes(tag)
                        ? 'btn-unique-emerald text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {tag} {selectedTags.includes(tag) ? '✓' : '+'}
                  </button>
                ))}
              </div>

              {/* Comment text */}
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional notes: e.g. Pomegranates were sweet and deep red!"
                className="w-full bg-white border border-emerald-200 rounded-[32px] px-5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleRatingSubmit}
                  disabled={isSubmittingRating}
                  className="px-6 py-3 btn-unique-dark text-white text-xs font-bold rounded-[32px] shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>{isSubmittingRating ? 'Saving...' : 'Submit Rider Feedback'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-800 space-y-2">
              <p>
                Thanks for supporting Arjun S.! ₹20 platform bonus has been credited to the rider's weekly performance payout.
              </p>
              <button
                onClick={onGoToShop}
                className="mt-2 btn-unique-emerald text-white px-5 py-2.5 rounded-[32px] font-bold text-xs shadow-md inline-flex items-center gap-1.5 transition-all"
              >
                <span>Order more fresh groceries</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Item Summary */}
      {localOrder && (
        <div className="bg-white/95 backdrop-blur-xl border border-emerald-900/10 rounded-[32px] p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Bag Contents ({localOrder.itemCount} items)</span>
            </span>
            <span className="text-xs font-extrabold text-slate-900">
              ₹{localOrder.amount} Paid ({localOrder.paymentMethod})
            </span>
          </div>

          <div className="text-xs text-slate-600 font-medium">
            {localOrder.itemsSummary}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{localOrder.address}</span>
          </div>
        </div>
      )}
    </div>
  );
};
