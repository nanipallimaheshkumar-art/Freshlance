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
  X
} from 'lucide-react';
import { OrderRecord, CartItem, UserAccount } from '../types';
import { getUserOrders, subscribeOrders } from '../utils/orderStore';
import { LiveMap } from './LiveMap';

interface OrderHistoryProps {
  user: UserAccount | null;
  onGoToShop: () => void;
  onReorder: (items: CartItem[]) => void;
  onOpenLiveTracking?: (orderId: string) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  user,
  onGoToShop,
  onReorder,
  onOpenLiveTracking,
}) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [trackingOrder, setTrackingOrder] = useState<OrderRecord | null>(null);
  const [reorderSuccessId, setReorderSuccessId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(getUserOrders());
    const unsubscribe = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });
    return unsubscribe;
  }, []);

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
  const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);

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
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>My Account &amp; Purchases</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Order History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track active 30-minute deliveries, review past produce receipts, and reorder favorites.
          </p>
        </div>

        <button
          onClick={onGoToShop}
          className="self-start sm:self-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Browse Fresh Market</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 font-bold">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{orders.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Market Orders</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{activeCount}</div>
            <div className="text-xs font-medium text-slate-500">Active Express Deliveries</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
            <CreditCard className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">₹{totalSpent}</div>
            <div className="text-xs font-medium text-slate-500">Total Produce Value</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
            selectedFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setSelectedFilter('active')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
            selectedFilter === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>In Progress ({activeCount})</span>
        </button>
        <button
          onClick={() => setSelectedFilter('delivered')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
            selectedFilter === 'delivered'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Delivered ({orders.length - activeCount})
        </button>
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
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm"
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

              {/* Order Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {order.driverName && (
                    <span className="flex items-center gap-1">
                      <Bike className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{order.driverName}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTrackingOrder(order)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <span>Track Live Delivery</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleReorderClick(order)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
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

      {/* Live Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Express Tracking
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Order {trackingOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setTrackingOrder(null)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Estimated Arrival Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-semibold">
                  {trackingOrder.status === 'delivered' ? 'Delivery Completed' : 'Estimated Arrival'}
                </div>
                <div className="text-xl font-extrabold text-white mt-0.5">
                  {trackingOrder.status === 'delivered'
                    ? 'Delivered on time'
                    : `In ~${trackingOrder.promiseMinutes || 18} Minutes`}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  Rider: {trackingOrder.driverName || 'Arjun S. (Indiranagar Hub)'}
                </div>
              </div>

              {/* Delivery OTP Badge */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">PIN (OTP)</div>
                <div className="text-lg font-mono font-black text-emerald-400">
                  {trackingOrder.deliveryOtp || '4829'}
                </div>
              </div>
            </div>

            {/* Interactive Live Map in Modal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
                <span className="flex items-center gap-1 text-emerald-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-Time GPS Route Map</span>
                </span>
                <span className="text-slate-400 font-mono">Indiranagar Sector 2</span>
              </div>

              <LiveMap
                driverCoords={{ lat: 12.9735, lng: 77.6442 }}
                customerCoords={{ lat: 12.9698, lng: 77.6499 }}
                storeCoords={{ lat: 12.9784, lng: 77.6408 }}
                customerAddress={trackingOrder.address}
                driverName={trackingOrder.driverName || 'Arjun S.'}
                driverVehicle="Ather EV"
                etaMinutes={trackingOrder.promiseMinutes || 18}
                distanceMeters={1200}
                isDelivered={trackingOrder.status === 'delivered'}
                heightClass="h-44"
              />
            </div>

            {/* Timeline Steps */}
            <div className="space-y-3 py-1">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Order Confirmed &amp; Paid</div>
                  <div className="text-[11px] text-slate-500">
                    Paid via {trackingOrder.paymentMethod} · Receipt verified
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    (trackingOrder.trackingStep ?? 2) >= 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {(trackingOrder.trackingStep ?? 2) >= 2 ? '✓' : '2'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Hand-Inspected &amp; Packed</div>
                  <div className="text-[11px] text-slate-500">
                    Inspected for firmness, freshness, and sealed in temperature-controlled bag
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    (trackingOrder.trackingStep ?? 2) >= 3
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {(trackingOrder.trackingStep ?? 2) >= 3 ? '✓' : '3'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Out for Delivery · {trackingOrder.driverName || 'Rider Assigned'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rider is en route to {trackingOrder.address}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    trackingOrder.status === 'delivered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {trackingOrder.status === 'delivered' ? '✓' : '4'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Delivered to Doorstep</div>
                  <div className="text-[11px] text-slate-500">
                    {trackingOrder.status === 'delivered'
                      ? 'Successfully delivered and confirmed'
                      : 'Zero-contact doorstep drop upon arrival'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {onOpenLiveTracking && (
                <button
                  onClick={() => {
                    const id = trackingOrder.id;
                    setTrackingOrder(null);
                    onOpenLiveTracking(id);
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                >
                  <span>Open Fullscreen Telematics View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setTrackingOrder(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
