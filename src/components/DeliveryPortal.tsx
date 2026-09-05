import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  RefreshCw, 
  Clock, 
  Package, 
  ArrowLeft, 
  ShieldCheck, 
  Crosshair, 
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import { calculateHaversineDistanceMeters, formatDistanceDisplay } from '../utils/haversine';
import { getSessionToken, getCurrentSession } from '../utils/authStore';
import { normalizeRole } from '../utils/rbac';
import { MarkAsDeliveredButton, LoadingStage } from './MarkAsDeliveredButton';

export interface DeliveryOrder {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCoords: { lat: number; lng: number };
  items: string[];
  totalAmount: number;
  status: 'Preparing' | 'Out for Delivery' | 'Delivered';
  driverId: string;
  driverName: string;
  etaMinutes: number;
  createdAt: string;
  deliveredAt?: string;
  deliveredDistanceMeters?: number;
}

interface DeliveryPortalProps {
  onBackToShop?: () => void;
}

export const DeliveryPortal: React.FC<DeliveryPortalProps> = ({ onBackToShop }) => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successOrderDistance, setSuccessOrderDistance] = useState<number | undefined>(undefined);
  const [errorOrderId, setErrorOrderId] = useState<string | null>(null);
  const [errorShakeTrigger, setErrorShakeTrigger] = useState<number>(0);
  
  // Geolocation feedback
  const [geoStatus, setGeoStatus] = useState<{
    orderId: string;
    type: 'success' | 'error' | 'info';
    message: string;
    distanceMeters?: number;
  } | null>(null);

  // Customer tracking query tester
  const [lookupOrderId, setLookupOrderId] = useState<string>('FL-91428');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Driver GPS info
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsWatchStatus, setGpsWatchStatus] = useState<string>('Ready');

  // Fetch orders assigned to driver
  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }

      // Check if custom cloudflare worker URL is configured
      const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
      const endpoint = cfUrl ? `${cfUrl}/api/delivery/orders` : '/api/delivery/orders';

      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.orders)) {
          // Normalize id/orderId
          const mapped = data.orders.map((o: any) => ({
            ...o,
            id: o.id || o.orderId,
            orderId: o.id || o.orderId,
          }));
          setOrders(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch delivery orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Query initial GPS coordinates if permitted
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsWatchStatus(`Accurate to ±${Math.round(pos.coords.accuracy || 10)}m`);
        },
        (err) => {
          console.warn('Initial GPS query:', err.message);
          setGpsWatchStatus('Permission prompt ready');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsWatchStatus('Geolocation unsupported');
    }
  }, []);

  /**
   * Feature 1: Mark as Delivered using HTML5 Geolocation API
   * Captures navigator.geolocation.getCurrentPosition and POSTs to /api/orders/:orderId/deliver
   */
  const handleMarkAsDelivered = (order: DeliveryOrder, simulatedCoords?: { lat: number; lng: number }) => {
    const targetOrderId = order.id || order.orderId || '';
    setActionLoadingId(targetOrderId);
    setLoadingStage('gps');
    setErrorOrderId(null);
    setSuccessOrderId(null);
    setGeoStatus(null);

    // If simulated coordinates provided for demonstration/testing
    if (simulatedCoords) {
      setTimeout(() => {
        setLoadingStage('measuring');
        setTimeout(() => {
          setLoadingStage('verifying');
          submitDeliveryCoords(targetOrderId, simulatedCoords.lat, simulatedCoords.lng);
        }, 350);
      }, 350);
      return;
    }

    if (!('geolocation' in navigator)) {
      setActionLoadingId(null);
      setLoadingStage('idle');
      setErrorOrderId(targetOrderId);
      setGeoStatus({
        orderId: targetOrderId,
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    // Capture driver's current coordinates using HTML5 Geolocation API
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentCoords({ lat, lng, accuracy: position.coords.accuracy });
        setLoadingStage('measuring');
        setTimeout(() => {
          setLoadingStage('verifying');
          submitDeliveryCoords(targetOrderId, lat, lng);
        }, 350);
      },
      (error) => {
        setActionLoadingId(null);
        setLoadingStage('idle');
        setErrorOrderId(targetOrderId);
        let errorMsg = 'Could not retrieve GPS coordinates.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please allow GPS access or use the simulation test button below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS signal is currently unavailable. Please verify GPS is enabled on your device.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'GPS request timed out. Retrying with device sensor...';
        }
        setGeoStatus({
          orderId: targetOrderId,
          type: 'error',
          message: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Sends captured coordinates to POST /api/orders/:orderId/deliver
   */
  const submitDeliveryCoords = async (orderId: string, latitude: number, longitude: number) => {
    try {
      const token = getSessionToken();
      const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
      const endpoint = cfUrl ? `${cfUrl}/api/delivery/orders/${orderId}/deliver` : `/api/delivery/orders/${orderId}/deliver`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await res.json();

      if (res.status === 403) {
        // Feature 3: 403 Forbidden when > 100 meters
        setErrorOrderId(orderId);
        setErrorShakeTrigger((prev) => prev + 1);
        setLoadingStage('idle');
        setActionLoadingId(null);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {}
        }
        setGeoStatus({
          orderId,
          type: 'error',
          message: data.error || 'You are too far from the delivery location to mark this as delivered.',
          distanceMeters: data.distanceMeters,
        });
      } else if (res.ok && data.success) {
        // Feature 3: Success within 100 meters with improved animated feedback
        const recordedDistance = data.order?.distanceMeters ?? data.distanceMeters ?? 15;
        setSuccessOrderId(orderId);
        setSuccessOrderDistance(recordedDistance);
        setLoadingStage('idle');
        setActionLoadingId(null);

        // Haptic feedback if supported on mobile devices
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 70, 50]);
          } catch {}
        }

        setGeoStatus({
          orderId,
          type: 'success',
          message: `Order verified within 100m (${recordedDistance}m away) and marked as Delivered!`,
          distanceMeters: recordedDistance,
        });

        // Immediately update local order to Delivered state
        setOrders((prev) =>
          prev.map((o) =>
            (o.id || o.orderId) === orderId
              ? {
                  ...o,
                  status: 'Delivered',
                  deliveredAt: new Date().toISOString(),
                  deliveredDistanceMeters: recordedDistance,
                }
              : o
          )
        );

        // Allow partner to experience celebration animation for 2.6s before sync
        setTimeout(() => {
          setSuccessOrderId((prev) => (prev === orderId ? null : prev));
          fetchOrders();
        }, 2600);
      } else {
        setErrorOrderId(orderId);
        setLoadingStage('idle');
        setActionLoadingId(null);
        setGeoStatus({
          orderId,
          type: 'error',
          message: data.error || 'Failed to update delivery status.',
        });
      }
    } catch (err: any) {
      setErrorOrderId(orderId);
      setLoadingStage('idle');
      setActionLoadingId(null);
      setGeoStatus({
        orderId,
        type: 'error',
        message: err.message || 'Network error communicating with order delivery API.',
      });
    }
  };

  /**
   * Feature 2: Customer Order Tracking API Tester (GET /api/orders/:orderId)
   */
  const handleLookupOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = lookupOrderId.trim();
    if (!cleanId) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
      const endpoint = cfUrl ? `${cfUrl}/api/orders/${cleanId}` : `/api/orders/${cleanId}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || `Order ${cleanId} not found (HTTP ${res.status})`);
      } else {
        setLookupResult(data);
      }
    } catch (err: any) {
      setLookupError(err.message || 'Failed to fetch order status');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Delivery Portal Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToShop && (
              <button
                onClick={() => {
                  const s = getCurrentSession();
                  const r = normalizeRole(s?.role);
                  if (r === 'delivery_partner') {
                    alert('Access Restricted: Delivery partners can ONLY access the /delivery portal.');
                    return;
                  }
                  onBackToShop();
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Back to Customer Shop / Admin Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-sky-900/40">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">FreshLane Delivery Portal</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  /delivery
                </span>
                {normalizeRole(getCurrentSession()?.role) === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Admin Master Key
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Delivery Partner Restricted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Assigned to <strong className="text-slate-200">{getCurrentSession()?.name || 'Arjun S.'}</strong> (DRV-101) · Tadepalligudem 15km Hub
              </p>
            </div>
          </div>

          {/* GPS telemetry status & Refresh */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-300 font-mono text-[11px]">GPS: {gpsWatchStatus}</span>
            </div>

            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-8">
        
        {/* Verification Rule Callout */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-800 to-slate-800/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Strict Geofence Proximity Validation Active
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Orders can only be marked as <strong className="text-emerald-400">Delivered</strong> when the delivery driver is within <strong className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">100 meters (0.1 km)</strong> of the customer&apos;s saved address.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700 shrink-0">
            Rule: <code className="text-emerald-400 font-mono">Haversine distance ≤ 100m</code>
          </div>
        </div>

        {/* Section 1: Assigned Active Orders */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Assigned Active Deliveries</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {orders.length} Orders
                </span>
              </h2>
              <p className="text-xs text-slate-400">Tap &quot;Mark as Delivered&quot; at the customer&apos;s doorstep to verify location.</p>
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-800/60 rounded-2xl p-12 text-center border border-slate-800">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-medium">Fetching assigned orders from API...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-slate-800/60 rounded-2xl p-10 text-center border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <h3 className="text-sm font-semibold text-white">No pending deliveries</h3>
              <p className="text-xs text-slate-400 mt-1">All assigned orders have been completed or none assigned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {orders.map((order) => {
                const isActionRunning = actionLoadingId === (order.id || order.orderId);
                const orderFeedback = geoStatus?.orderId === (order.id || order.orderId) ? geoStatus : null;
                const isDelivered = order.status === 'Delivered';

                // Distance calculation preview if device coords are available
                let liveDistanceEstimate: number | null = null;
                if (currentCoords && order.customerCoords) {
                  liveDistanceEstimate = calculateHaversineDistanceMeters(currentCoords, order.customerCoords);
                }

                return (
                  <div
                    key={order.id || order.orderId}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isDelivered
                        ? 'bg-slate-800/40 border-emerald-900/40 opacity-85'
                        : 'bg-slate-800/90 border-slate-700/80 shadow-md hover:border-slate-600'
                    }`}
                  >
                    {/* Order Card Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-700/60 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                            {order.id || order.orderId}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : order.status === 'Out for Delivery'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-2 flex items-center gap-2">
                          <span>{order.customerName}</span>
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total</span>
                        <span className="text-base font-extrabold text-emerald-400">₹{order.totalAmount}</span>
                      </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                      {/* Customer Phone */}
                      <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                        <span className="text-slate-400 text-xs flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Contact:</span>
                        </span>
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold font-mono text-xs flex items-center gap-1"
                        >
                          {order.customerPhone}
                        </a>
                      </div>

                      {/* Delivery Address */}
                      <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-[11px] font-medium text-slate-400 block">Delivery Address:</span>
                          <span className="text-slate-200 font-medium text-xs sm:text-[13px] leading-snug">
                            {order.customerAddress}
                          </span>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            Destination GPS: ({order.customerCoords.lat.toFixed(5)}, {order.customerCoords.lng.toFixed(5)})
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                          <Package className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Items ({order.items.length}):</span>
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {order.items.join(' · ')}
                        </p>
                      </div>

                      {/* Live Proximity Indicator */}
                      {liveDistanceEstimate !== null && !isDelivered && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/80 rounded-lg text-xs font-mono">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Crosshair className="w-3 h-3 text-emerald-400" />
                            <span>Current Device Distance:</span>
                          </span>
                          <span
                            className={`font-bold ${
                              liveDistanceEstimate <= 100 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {formatDistanceDisplay(liveDistanceEstimate)}
                            {liveDistanceEstimate <= 100 ? ' (In Range ✓)' : ' (>100m)'}
                          </span>
                        </div>
                      )}

                      {/* Delivery Completed Info */}
                      {isDelivered && (
                        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-semibold">Successfully Delivered</p>
                            <p className="text-[11px] text-emerald-300/80">
                              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : 'Verified'}{' '}
                              {order.deliveredDistanceMeters !== undefined ? `· Verified at ${order.deliveredDistanceMeters}m from doorstep` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Geolocation Feedback Message */}
                      {orderFeedback && (
                        <div
                          className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in ${
                            orderFeedback.type === 'error'
                              ? 'bg-rose-950/70 border-rose-600/50 text-rose-200'
                              : 'bg-emerald-950/70 border-emerald-600/50 text-emerald-200'
                          }`}
                        >
                          {orderFeedback.type === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold">{orderFeedback.message}</p>
                            {orderFeedback.distanceMeters !== undefined && (
                              <p className="text-[11px] mt-0.5 opacity-90">
                                Proximity recorded:{' '}
                                <span className="font-mono font-semibold underline">
                                  {orderFeedback.distanceMeters} meters away
                                </span>{' '}
                                (Max permitted: 100 meters).
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Button: Mark as Delivered with Animated Loading & Celebration Success States */}
                      <MarkAsDeliveredButton
                        order={order}
                        isLoading={actionLoadingId === (order.id || order.orderId)}
                        loadingStage={actionLoadingId === (order.id || order.orderId) ? loadingStage : 'idle'}
                        isSuccess={successOrderId === (order.id || order.orderId)}
                        successDistance={successOrderId === (order.id || order.orderId) ? successOrderDistance : order.deliveredDistanceMeters}
                        isError={errorOrderId === (order.id || order.orderId)}
                        errorMessage={orderFeedback?.type === 'error' ? orderFeedback.message : undefined}
                        errorDistance={orderFeedback?.type === 'error' ? orderFeedback.distanceMeters : undefined}
                        shakeTrigger={errorOrderId === (order.id || order.orderId) ? errorShakeTrigger : 0}
                        onMarkDelivered={(simCoords) => handleMarkAsDelivered(order, simCoords)}
                        onResetOrder={() => {
                          setOrders((prev) =>
                            prev.map((o) =>
                              (o.id || o.orderId) === (order.id || order.orderId)
                                ? { ...o, status: 'Out for Delivery', deliveredAt: undefined, deliveredDistanceMeters: undefined }
                                : o
                            )
                          );
                          setGeoStatus(null);
                          setSuccessOrderId(null);
                          setErrorOrderId(null);
                        }}
                        isDelivered={isDelivered}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Order Tracking API Interactive Explorer (Feature #2) */}
        <section className="bg-slate-800/80 rounded-2xl p-5 sm:p-6 border border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-400" />
                <span>Customer Order Tracking API Inspector</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tests the customer-facing endpoint <code className="text-emerald-400 font-mono">GET /api/orders/:orderId</code>
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
              Target: <span className="font-mono text-slate-200">GET /api/orders/:orderId</span>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleLookupOrder} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={lookupOrderId}
                onChange={(e) => setLookupOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. FL-91428, FL-91429, FL-91430)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={lookupLoading || !lookupOrderId.trim()}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch Status</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLookupOrderId('FL-91428');
                  handleLookupOrder();
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
              >
                FL-91428
              </button>
            </div>
          </form>

          {/* Lookup Error */}
          {lookupError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Lookup Result JSON / Card View */}
          {lookupResult && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Order ID:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{lookupResult.orderId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      lookupResult.status === 'Delivered'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : lookupResult.status === 'Out for Delivery'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {lookupResult.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Customer &amp; Address</span>
                  <span className="text-slate-200 font-semibold text-sm">{lookupResult.customerName}</span>
                  <p className="text-slate-300 text-xs mt-0.5">{lookupResult.customerAddress}</p>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Courier Assigned</span>
                  <span className="text-slate-200 font-semibold text-sm">{lookupResult.driverName}</span>
                  <p className="text-slate-300 text-xs mt-0.5">
                    ETA: <strong className="text-emerald-400">{lookupResult.etaMinutes} mins</strong> · {lookupResult.customerCoords ? `Coords: ${lookupResult.customerCoords.lat.toFixed(4)}, ${lookupResult.customerCoords.lng.toFixed(4)}` : ''}
                  </p>
                </div>
              </div>

              {/* Raw JSON payload preview */}
              <details className="text-[11px] text-slate-400">
                <summary className="cursor-pointer hover:text-slate-200 transition-colors">
                  View raw API response JSON
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(lookupResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};
