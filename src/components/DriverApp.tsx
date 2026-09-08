import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  Power,
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  AlertTriangle,
  Zap,
  DollarSign,
  Camera,
  Wifi,
  WifiOff,
  Bell,
  ChevronRight,
  ExternalLink,
  Store,
  Key,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Crosshair,
  Eye,
  RefreshCw,
  Package,
  Layers,
  ChevronDown
} from 'lucide-react';
import { DriverRecord, LocationCoords, UserAccount } from '../types';
import { LiveMap } from './LiveMap';
import { getRegisteredDrivers, getSessionToken } from '../utils/authStore';
import { calculateHaversineDistanceMeters, formatDistanceDisplay } from '../utils/haversine';
import { safeResponseJson } from '../utils/safeFetch';

export interface DriverAppProps {
  user?: UserAccount | null;
  onGoToShop?: () => void;
  orders?: any[];
  activeOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
  onViewAllOrders?: () => void;
}

export const DriverApp: React.FC<DriverAppProps> = ({
  user,
  onGoToShop,
  orders: propOrders,
  activeOrderId: propActiveOrderId,
  onSelectOrder,
  onViewAllOrders,
}) => {
  // Load admin-created driver accounts from auth store
  const [registeredDrivers, setRegisteredDrivers] = useState<DriverRecord[]>(() => {
    const list = getRegisteredDrivers();
    if (list.length > 0) {
      return list.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        vehicleNumber: d.vehicleNumber || 'AP-39-EQ-4421',
        vehicleType: d.vehicleType || 'electric_scooter',
        zone: d.zone || 'KN Road, Tadepalligudem',
        isOnline: true,
        status: 'available',
        rating: 5.0,
        deliveriesToday: 0,
        earningsToday: 0,
        batteryLevel: 98,
        currentCoords: { lat: 16.8145, lng: 81.5285, heading: 90, speed: 0 },
      }));
    }
    return [];
  });

  const getActiveDriver = (): DriverRecord => {
    if (user && (user.role === 'driver' || user.role === 'delivery_partner')) {
      const match = registeredDrivers.find((d) => d.id === user.id || d.email === user.email);
      if (match) return match;
      return {
        id: user.id || 'DRV-101',
        name: user.name || 'Arjun S.',
        email: user.email,
        phone: user.phone || '+91 98450 12345',
        vehicleNumber: user.vehicleNumber || 'AP-39-EQ-4421',
        vehicleType: user.vehicleType || 'electric_scooter',
        zone: user.zone || 'KN Road Hub, Tadepalligudem',
        isOnline: true,
        status: 'available',
        rating: 5.0,
        deliveriesToday: 0,
        earningsToday: 0,
        batteryLevel: 98,
        currentCoords: { lat: 16.8145, lng: 81.5285, heading: 90, speed: 0 },
      };
    }
    if (registeredDrivers.length > 0) {
      return registeredDrivers[0];
    }
    return {
      id: 'DRV-101',
      name: 'Arjun S.',
      email: 'arjun@freshlane.com',
      phone: '+91 98450 12345',
      vehicleNumber: 'AP-39-EQ-4421',
      vehicleType: 'electric_scooter',
      zone: 'KN Road Hub, Tadepalligudem',
      isOnline: true,
      status: 'available',
      rating: 5.0,
      deliveriesToday: 3,
      earningsToday: 255,
      batteryLevel: 88,
      currentCoords: { lat: 16.8145, lng: 81.5285, heading: 90, speed: 0 },
    };
  };

  const [currentDriver, setCurrentDriver] = useState<DriverRecord>(getActiveDriver);
  const [isOnline, setIsOnline] = useState(currentDriver.isOnline);
  
  // Local orders cache if not passed from parent
  const [internalOrders, setInternalOrders] = useState<any[]>([]);
  const ordersList = propOrders && propOrders.length > 0 ? propOrders : internalOrders;

  // Active Order selection
  const [activeOrderId, setActiveOrderId] = useState<string | null>(
    propActiveOrderId || currentDriver.activeOrderId || 'FL-91428'
  );

  // Sync propActiveOrderId changes
  useEffect(() => {
    if (propActiveOrderId) {
      setActiveOrderId(propActiveOrderId);
    }
  }, [propActiveOrderId]);

  // Fetch orders from backend if none provided
  useEffect(() => {
    if (!propOrders || propOrders.length === 0) {
      const token = getSessionToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }

      fetch('/api/delivery/orders', { headers })
        .then((res) => (res.ok ? safeResponseJson(res, null) : null))
        .then((data) => {
          if (data && data.orders) {
            setInternalOrders(data.orders);
            if (!activeOrderId && data.orders.length > 0) {
              setActiveOrderId(data.orders[0].id || data.orders[0].orderId);
            }
          }
        })
        .catch((err) => {
          console.warn('Delivery orders notice:', err?.message || err);
        });
    }
  }, [propOrders, activeOrderId]);

  // Derive active order details
  const activeOrder = ordersList.find(
    (o) => (o.id || o.orderId) === activeOrderId
  ) || (ordersList.length > 0 ? ordersList[0] : null) || {
    id: activeOrderId || 'FL-91428',
    customerName: 'Rajesh Varma',
    customerPhone: '+91 98765 43210',
    customerAddress: 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102',
    customerCoords: { lat: 16.8165, lng: 81.5295 },
    items: ['Express Farm Produce Bundle (4 items)', 'Alphonso Mangoes 1kg', 'Organic Baby Spinach 250g'],
    totalAmount: 485,
    status: 'Out for Delivery',
    driverName: 'Arjun S.',
  };

  // Order status mapping
  const resolveInitialStatus = (): 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' => {
    if (activeOrder.status === 'Delivered') return 'delivered';
    if (activeOrder.status === 'Out for Delivery') return 'on_the_way';
    if (activeOrder.status === 'Preparing') return 'assigned';
    return 'on_the_way';
  };

  const [orderStatus, setOrderStatus] = useState<'assigned' | 'picked_up' | 'on_the_way' | 'delivered'>(resolveInitialStatus);

  useEffect(() => {
    setOrderStatus(resolveInitialStatus());
  }, [activeOrder.id, activeOrder.status]);

  // Coordinates
  const storeCoords = { lat: 16.8131, lng: 81.5273 }; // FreshLane Hub Tadepalligudem
  const customerCoords = activeOrder.customerCoords || { lat: 16.8165, lng: 81.5295 };
  const customerAddress = activeOrder.customerAddress || 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102';
  const customerName = activeOrder.customerName || 'Rajesh Varma';
  const customerPhone = activeOrder.customerPhone || '+91 98765 43210';
  const orderItems: string[] = activeOrder.items || ['Express Produce Bag'];
  const payoutAmount = activeOrder.totalAmount ? Math.min(120, Math.round(activeOrder.totalAmount * 0.18) + 40) : 85;

  // Simulated GPS Coordinates
  const [currentCoords, setCurrentCoords] = useState<LocationCoords>(currentDriver.currentCoords || { lat: 16.8145, lng: 81.5285, heading: 90, speed: 0 });
  const [geofenceTriggered, setGeofenceTriggered] = useState(false);

  // Simulation controls
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [useRealDeviceGps, setUseRealDeviceGps] = useState(false);
  const [realGpsAccuracy, setRealGpsAccuracy] = useState<number | null>(null);

  // Network & Battery & Background Simulation State
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const [isAppBackgrounded, setIsAppBackgrounded] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const [lastPingStatus, setLastPingStatus] = useState<string>('Live Connected');
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<any | null>(null);
  const [showCustomerPreview, setShowCustomerPreview] = useState(false);

  // Delivery Completion Modal State
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDeliverySuccess, setIsDeliverySuccess] = useState(false);
  const [photoProof, setPhotoProof] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to driver store updates
  useEffect(() => {
    const handleUpdate = () => {
      const list = getRegisteredDrivers();
      if (list.length > 0) {
        const mapped: DriverRecord[] = list.map((d) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          vehicleNumber: d.vehicleNumber || 'AP-39-EQ-4421',
          vehicleType: d.vehicleType || 'electric_scooter',
          zone: d.zone || 'KN Road, Tadepalligudem',
          isOnline: true,
          status: 'available',
          rating: 5.0,
          deliveriesToday: 0,
          earningsToday: 0,
          batteryLevel: 98,
          currentCoords: { lat: 16.8145, lng: 81.5285, heading: 90, speed: 0 },
        }));
        setRegisteredDrivers(mapped);
      }
    };

    window.addEventListener('freshlane_drivers_updated', handleUpdate);
    return () => window.removeEventListener('freshlane_drivers_updated', handleUpdate);
  }, []);

  // Check geofence distance on coordinates change
  useEffect(() => {
    if (!customerCoords) return;
    const distanceMeters = calculateHaversineDistanceMeters(
      { lat: currentCoords.lat, lng: currentCoords.lng },
      customerCoords
    );
    // 70 meter geofence threshold
    setGeofenceTriggered(distanceMeters <= 70);
  }, [currentCoords, customerCoords]);

  // Clean up delivery success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Toggle Driver Online / Offline with backend API
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    setCurrentDriver((prev) => ({ ...prev, isOnline: nextState, status: nextState ? 'available' : 'offline' }));

    try {
      await fetch('/api/driver/toggle-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: currentDriver.id, isOnline: nextState }),
      });
    } catch (e) {
      console.error('Failed to toggle online:', e);
    }
  };

  // Real Device GPS Watcher
  useEffect(() => {
    if (!useRealDeviceGps || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setRealGpsAccuracy(Math.round(pos.coords.accuracy));
        setCurrentCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || 90,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 22,
        });
        setLastPingStatus(`Device GPS (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        console.warn('Real GPS error:', err.message);
        setUseRealDeviceGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useRealDeviceGps]);

  // Drive Simulation Loop
  useEffect(() => {
    if (!isSimulatingDrive || orderStatus === 'delivered' || !customerCoords) return;

    const interval = setInterval(() => {
      setCurrentCoords((prev) => {
        const dLat = customerCoords.lat - prev.lat;
        const dLng = customerCoords.lng - prev.lng;
        const dist = Math.hypot(dLat, dLng);

        if (dist < 0.0003) {
          // Arrived
          setIsSimulatingDrive(false);
          setGeofenceTriggered(true);
          return {
            lat: customerCoords.lat - 0.0001,
            lng: customerCoords.lng - 0.0001,
            heading: prev.heading,
            speed: 0,
          };
        }

        const step = 0.00025; // moderate forward step
        return {
          lat: prev.lat + (dLat / dist) * step,
          lng: prev.lng + (dLng / dist) * step,
          heading: Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI),
          speed: 28,
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulatingDrive, orderStatus, customerCoords]);

  // Battery-efficient location pinger (runs every 4 seconds when order active)
  useEffect(() => {
    if (!isOnline || orderStatus === 'delivered' || !activeOrderId) return;

    const interval = setInterval(async () => {
      const pingData = {
        driverId: currentDriver.id,
        orderId: activeOrderId,
        coords: currentCoords,
        timestamp: Date.now(),
        batteryLevel: Math.max(15, currentDriver.batteryLevel - 0.05),
      };

      if (!isNetworkOnline) {
        setOfflineQueue((prev) => [...prev, { lat: currentCoords.lat, lng: currentCoords.lng, timestamp: Date.now() }]);
        setLastPingStatus('Queued (Offline)');
        return;
      }

      try {
        const res = await fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pingData),
        });
        if (res.ok) {
          setLastPingStatus('Live Synced (4s)');
        }
      } catch (err) {
        setLastPingStatus('Syncing...');
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline, orderStatus, activeOrderId, currentDriver, currentCoords, isNetworkOnline]);

  // Teleport to doorstep (< 50m) to test doorstep OTP verification immediately
  const handleTeleportToDoorstep = () => {
    setIsSimulatingDrive(false);
    setCurrentCoords({
      lat: customerCoords.lat - 0.00015,
      lng: customerCoords.lng - 0.00015,
      heading: 105,
      speed: 0,
    });
    setGeofenceTriggered(true);
  };

  // Reset to FreshLane Hub
  const handleResetToHub = () => {
    setIsSimulatingDrive(false);
    setCurrentCoords({
      lat: storeCoords.lat,
      lng: storeCoords.lng,
      heading: 90,
      speed: 0,
    });
    setGeofenceTriggered(false);
  };

  // Status transitions: Picked Up -> On the way -> Delivered
  const handleUpdateStatus = async (newStatus: 'picked_up' | 'on_the_way' | 'delivered') => {
    if (!activeOrderId) return;

    if (newStatus === 'delivered') {
      setIsDeliverySuccess(false);
      setIsVerifyingOtp(false);
      setOtpError(null);
      setShowCompleteModal(true);
      return;
    }

    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentDriver.id,
          orderId: activeOrderId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        setOrderStatus(newStatus);
        // Refresh local orders list
        if (activeOrder) {
          activeOrder.status = newStatus === 'picked_up' ? 'Out for Delivery' : 'Out for Delivery';
        }
      }
    } catch (e) {
      console.error('Status update failed:', e);
    }
  };

  // Complete delivery with OTP / photo confirmation
  const handleConfirmDelivered = async () => {
    if (!otpInput.trim()) {
      setOtpError('Please enter the 4-digit Delivery PIN provided by customer');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentDriver.id,
          orderId: activeOrderId,
          status: 'delivered',
          otp: otpInput.trim(),
          photoProof: photoProof || undefined,
        }),
      });

      const data = await safeResponseJson(res, { error: 'Failed to update delivery status' });
      if (!res.ok) {
        setOtpError(data.error || 'Invalid OTP. Check customer live screen for 4829.');
        setIsVerifyingOtp(false);
        return;
      }

      // Success: Stop spinner, activate subtle green flash animation on button
      setIsVerifyingOtp(false);
      setIsDeliverySuccess(true);
      setOrderStatus('delivered');
      if (activeOrder) {
        activeOrder.status = 'Delivered';
      }

      // Automatically close modal after brief delay
      successTimeoutRef.current = setTimeout(() => {
        setShowCompleteModal(false);
        setIsDeliverySuccess(false);
        setOtpInput('');
        setPhotoProof(null);
        setCurrentDriver((prev) => ({
          ...prev,
          deliveriesToday: prev.deliveriesToday + 1,
          earningsToday: prev.earningsToday + payoutAmount,
        }));
      }, 1400);
    } catch (err) {
      setOtpError('Failed to verify delivery. Please retry.');
      setIsVerifyingOtp(false);
    }
  };

  // Google Maps navigation link (Production Turn-by-Turn requirement)
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${customerCoords.lat},${customerCoords.lng}`;

  // Calculate current distance to customer
  const currentDistanceMeters = calculateHaversineDistanceMeters(
    { lat: currentCoords.lat, lng: currentCoords.lng },
    customerCoords
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 font-sans">
      {/* Driver App Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              🛵
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                <span>FreshLane Partner Live Console</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  REAL-TIME GPS
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {currentDriver.name} · {currentDriver.vehicleNumber} · {currentDriver.zone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Online Toggle Button */}
            <button
              onClick={handleToggleOnline}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'ONLINE & ACTIVE' : 'OFFLINE'}</span>
            </button>

            {onViewAllOrders && (
              <button
                onClick={onViewAllOrders}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View all assigned orders in queue"
              >
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Orders Queue</span>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {ordersList.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
          <div className="bg-slate-800/80 rounded-xl p-2.5 text-center">
            <div className="text-slate-400 text-[10px]">EV Battery</div>
            <div className="font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{Math.round(currentDriver.batteryLevel)}%</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 text-center">
            <div className="text-slate-400 text-[10px]">Today's Completed</div>
            <div className="font-mono font-bold text-white mt-0.5">
              {currentDriver.deliveriesToday} trips done
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 text-center">
            <div className="text-slate-400 text-[10px]">Today's Earnings</div>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">
              ₹{currentDriver.earningsToday}
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2.5 text-center">
            <div className="text-slate-400 text-[10px]">Telemetry Status</div>
            <div className="font-mono font-bold text-sky-400 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{lastPingStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Delivery Layout */}
      {activeOrderId && orderStatus !== 'delivered' ? (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Live Interactive Route Map & GPS Simulation Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Live Turn-by-Turn Route</h3>
                    <p className="text-[11px] text-slate-500">Real-time driver location to customer doorstep</p>
                  </div>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-white" />
                  <span>Navigate to Customer (Google Maps)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                </a>
              </div>

              {/* Vector Live Map */}
              <LiveMap
                driverCoords={currentCoords}
                customerCoords={customerCoords}
                storeCoords={storeCoords}
                customerAddress={customerAddress}
                driverName={currentDriver.name}
                driverVehicle={currentDriver.vehicleNumber || 'EV Scooter'}
                etaMinutes={geofenceTriggered ? 1 : Math.max(2, Math.round(currentDistanceMeters / 300))}
                distanceMeters={currentDistanceMeters}
                isDelivered={orderStatus === 'delivered'}
                geofenceArrived={geofenceTriggered}
                heightClass="h-72 sm:h-80 lg:h-[400px]"
              />

              {/* Real-time Map Simulation Toolbar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live GPS &amp; Proximity Controls</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Distance: <strong className={geofenceTriggered ? 'text-emerald-600' : 'text-slate-800'}>{formatDistanceDisplay(currentDistanceMeters)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* Auto Drive Simulation Toggle */}
                  <button
                    onClick={() => setIsSimulatingDrive((prev) => !prev)}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isSimulatingDrive
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isSimulatingDrive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isSimulatingDrive ? 'Pause Drive' : 'Drive Sim'}</span>
                  </button>

                  {/* Teleport into Geofence (<50m) */}
                  <button
                    onClick={handleTeleportToDoorstep}
                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Jump within 50m of customer house to test PIN OTP verification"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>At Doorstep (&lt;50m)</span>
                  </button>

                  {/* Reset to FreshLane Hub */}
                  <button
                    onClick={handleResetToHub}
                    className="py-2 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Hub</span>
                  </button>

                  {/* Toggle Real Device GPS */}
                  <button
                    onClick={() => setUseRealDeviceGps((prev) => !prev)}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      useRealDeviceGps
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{useRealDeviceGps ? 'Using Phone GPS' : 'Use Phone GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Geofence Alert Banner */}
              {geofenceTriggered && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm">Arrived at Customer Doorstep!</div>
                      <div className="text-[11px] text-emerald-700">
                        Within 50m geofence radius. Collect 4-digit PIN (OTP) to complete delivery.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus('delivered')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shrink-0 transition-colors shadow-xs"
                  >
                    Enter PIN OTP
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Order Details & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Order Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              
              {/* Order Switcher Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-300">
                      Active Order #{activeOrderId}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {orderStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                    {orderItems[0] || 'Express Grocery Bag'}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400 block">Payout</span>
                  <span className="text-base font-black text-emerald-700">₹{payoutAmount}</span>
                </div>
              </div>

              {/* Order Switcher Dropdown (if multiple assigned) */}
              {ordersList.length > 1 && (
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Switch Active Delivery:
                  </label>
                  <select
                    value={activeOrderId || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setActiveOrderId(newId);
                      if (onSelectOrder) onSelectOrder(newId);
                    }}
                    className="w-full bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {ordersList.map((o) => {
                      const id = o.id || o.orderId;
                      return (
                        <option key={id} value={id}>
                          Order #{id} · {o.customerName} ({o.status})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Customer Contact & Dropoff Info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-slate-900 text-sm">{customerName}</div>
                  <a
                    href={`tel:${customerPhone}`}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 font-extrabold bg-emerald-100/70 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{customerPhone}</span>
                  </a>
                </div>

                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-medium">{customerAddress}</span>
                  </div>
                </div>

                {/* Items in Delivery */}
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Package Items ({orderItems.length})
                  </span>
                  <p className="text-slate-700 font-medium text-xs leading-relaxed">
                    {orderItems.join(' · ')}
                  </p>
                </div>
              </div>

              {/* Waypoints Route Progress */}
              <div className="space-y-3 pt-1 text-xs">
                {/* Step 1: FreshLane Hub */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">FreshLane Express Hub</div>
                    <div className="text-[11px] text-slate-500">KN Road, Tadepalligudem · Counter #2</div>
                  </div>
                  {orderStatus !== 'assigned' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Picked Up ✓
                    </span>
                  )}
                </div>

                {/* Step 2: Customer Doorstep */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Customer Doorstep</div>
                    <div className="text-[11px] text-slate-500">{customerAddress}</div>
                  </div>
                  {orderStatus === 'delivered' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Delivered ✓
                    </span>
                  ) : geofenceTriggered ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 animate-pulse">
                      In Geofence (&lt;50m)
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons based on Delivery State */}
              <div className="pt-2 space-y-2">
                {orderStatus === 'assigned' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('picked_up')}
                    className="w-full min-h-[48px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirm Picked Up at FreshLane Hub</span>
                  </button>
                )}

                {orderStatus === 'picked_up' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('on_the_way')}
                    className="w-full min-h-[48px] py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-extrabold text-sm rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <Bike className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Start Express Route (Out for Delivery)</span>
                  </button>
                )}

                {orderStatus === 'on_the_way' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('delivered')}
                    className="w-full min-h-[48px] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Mark as Delivered (Requires PIN OTP)</span>
                  </button>
                )}

                {/* Customer View Preview Button */}
                <button
                  type="button"
                  onClick={() => setShowCustomerPreview(true)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>Preview Customer's Live Screen &amp; PIN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standby / Delivery Finished View */
        <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">
              {orderStatus === 'delivered' ? 'Order Completed Successfully!' : 'You Are Online & Ready'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {orderStatus === 'delivered'
                ? `Order #${activeOrderId} has been verified at customer doorstep. Payout of ₹${payoutAmount} credited to today's earnings.`
                : 'Standing by in Tadepalligudem zone for express grocery and fresh fruit deliveries.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {ordersList.length > 1 && (
              <button
                onClick={() => {
                  const next = ordersList.find((o) => (o.id || o.orderId) !== activeOrderId && o.status !== 'Delivered');
                  if (next) {
                    setActiveOrderId(next.id || next.orderId);
                    setOrderStatus('on_the_way');
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Bike className="w-4 h-4" />
                <span>Take Next Assigned Order</span>
              </button>
            )}

            {onViewAllOrders && (
              <button
                onClick={onViewAllOrders}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>View Orders Queue ({ordersList.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Confirm Delivery with OTP & Photo Proof */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Doorstep Verification
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Complete Order #{activeOrderId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isVerifyingOtp && !isDeliverySuccess) {
                    setShowCompleteModal(false);
                  }
                }}
                disabled={isVerifyingOtp || isDeliverySuccess}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40 text-xs font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ask customer for their 4-digit Delivery PIN (OTP) displayed on their live tracking screen:
            </p>

            {/* OTP Input */}
            <div className="space-y-1.5">
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                disabled={isVerifyingOtp || isDeliverySuccess}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4829"
                className="w-full text-center tracking-widest text-2xl font-mono font-black py-3 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 disabled:opacity-60"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Customer PIN</span>
                <button
                  type="button"
                  onClick={() => setOtpInput('4829')}
                  disabled={isVerifyingOtp || isDeliverySuccess}
                  className="text-emerald-700 hover:text-emerald-800 disabled:opacity-40 font-semibold cursor-pointer underline text-[11px]"
                >
                  Quick Fill (4829)
                </button>
              </div>
              {otpError && (
                <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            {/* Doorstep Photo Proof */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Doorstep Delivery Photo (Optional)
              </span>
              {!photoProof ? (
                <button
                  type="button"
                  disabled={isVerifyingOtp || isDeliverySuccess}
                  onClick={() =>
                    setPhotoProof(
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23e2e8f0"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23475569">Doorstep Package Verified ✓</text></svg>'
                    )
                  }
                  className="w-full py-2.5 px-3 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Capture Doorstep Photo</span>
                </button>
              ) : (
                <div className="relative h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={photoProof} alt="Doorstep Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={isVerifyingOtp || isDeliverySuccess}
                    onClick={() => setPhotoProof(null)}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                  >
                    Retake
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={isVerifyingOtp || isDeliverySuccess}
                className="flex-1 min-h-[48px] py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm rounded-2xl cursor-pointer transition-colors flex items-center justify-center disabled:opacity-50 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivered}
                disabled={isVerifyingOtp || isDeliverySuccess}
                className={`relative overflow-hidden flex-1 min-h-[48px] py-3.5 px-4 font-extrabold text-sm rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 touch-manipulation active:scale-[0.99] ${
                  isDeliverySuccess
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-400/60 shadow-lg shadow-emerald-500/30 scale-[1.02]'
                    : isVerifyingOtp
                    ? 'bg-emerald-600/85 text-white cursor-wait opacity-90'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                }`}
              >
                {/* Subtle green flash animation ripple upon successful delivery update */}
                {isDeliverySuccess && (
                  <>
                    <span className="absolute inset-0 bg-emerald-400/40 rounded-2xl animate-ping pointer-events-none" />
                    <span className="absolute inset-0 bg-emerald-300/25 rounded-2xl animate-pulse pointer-events-none" />
                  </>
                )}

                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">Verifying...</span>
                  </>
                ) : isDeliverySuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-white animate-bounce" />
                    <span className="truncate">Delivered!</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">Confirm Delivery</span>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Tracking Preview Modal */}
      {showCustomerPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Customer Live Screen Preview
                </h3>
              </div>
              <button
                onClick={() => setShowCustomerPreview(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 text-white p-4 rounded-2xl space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">FreshLane Live Tracking</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  {orderStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="text-center py-2">
                <div className="text-2xl font-black text-white">
                  {geofenceTriggered ? 'Arriving Now!' : `${Math.max(2, Math.round(currentDistanceMeters / 300))} mins`}
                </div>
                <div className="text-xs text-slate-400">
                  {currentDriver.name} is on {currentDriver.vehicleNumber}
                </div>
              </div>

              {/* Customer PIN Banner */}
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-center space-y-1">
                <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                  Doorstep Delivery PIN (Share with Driver)
                </span>
                <div className="text-2xl font-mono font-black text-emerald-400 tracking-widest">
                  4829
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>Destination:</span>
                <span className="text-white font-medium truncate max-w-[200px]">{customerAddress}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCustomerPreview(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Return to Customer Shop / Back link */}
      {onGoToShop && (
        <div className="mt-6 text-center">
          <button
            onClick={onGoToShop}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1 transition-colors"
          >
            <span>Return to Customer Storefront</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
