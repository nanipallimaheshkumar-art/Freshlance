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
  TrendingUp,
  ShieldCheck,
  Camera,
  RotateCcw,
  Wifi,
  WifiOff,
  Bell,
  ChevronRight,
  ExternalLink,
  Store,
  User,
  Key
} from 'lucide-react';
import { DriverRecord, LocationCoords, OrderRecord } from '../types';
import { LiveMap } from './LiveMap';
import { getUserOrders } from '../utils/orderStore';

interface DriverAppProps {
  onGoToShop: () => void;
}

export const DriverApp: React.FC<DriverAppProps> = ({ onGoToShop }) => {
  // Available Drivers for Admin Issued Credentials
  const initialDrivers: DriverRecord[] = [
    {
      id: 'DRV-101',
      name: 'Arjun Sharma',
      phone: '+91 98450 12345',
      vehicleNumber: 'KA-01-EQ-4421',
      vehicleType: 'electric_scooter',
      zone: 'Indiranagar Hub',
      isOnline: true,
      status: 'busy',
      rating: 4.95,
      deliveriesToday: 9,
      earningsToday: 765,
      batteryLevel: 84,
      currentCoords: { lat: 12.9735, lng: 77.6442, heading: 110, speed: 24 },
      activeOrderId: 'FL-91428',
    },
    {
      id: 'DRV-102',
      name: 'Farah Khan',
      phone: '+91 97312 65432',
      vehicleNumber: 'KA-03-MM-8921',
      vehicleType: 'electric_scooter',
      zone: 'Koramangala Hub',
      isOnline: true,
      status: 'available',
      rating: 4.91,
      deliveriesToday: 7,
      earningsToday: 595,
      batteryLevel: 92,
      currentCoords: { lat: 12.9352, lng: 77.6245, heading: 45, speed: 0 },
    },
    {
      id: 'DRV-103',
      name: 'Vishal Patel',
      phone: '+91 98860 99881',
      vehicleNumber: 'KA-05-AB-3319',
      vehicleType: 'bike',
      zone: 'HSR Layout Hub',
      isOnline: false,
      status: 'offline',
      rating: 4.88,
      deliveriesToday: 6,
      earningsToday: 510,
      batteryLevel: 76,
      currentCoords: { lat: 12.9121, lng: 77.6445, heading: 0, speed: 0 },
    },
  ];

  const [currentDriver, setCurrentDriver] = useState<DriverRecord>(initialDrivers[0]);
  const [activeTab, setActiveTab] = useState<'delivery' | 'earnings' | 'settings'>('delivery');
  const [isOnline, setIsOnline] = useState(currentDriver.isOnline);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(currentDriver.activeOrderId || 'FL-91428');
  const [orderStatus, setOrderStatus] = useState<'assigned' | 'picked_up' | 'on_the_way' | 'delivered'>('on_the_way');

  // Network & Battery & Background Simulation State
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const [isAppBackgrounded, setIsAppBackgrounded] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const [lastPingStatus, setLastPingStatus] = useState<string>('Connected (3s interval)');
  const [geofenceTriggered, setGeofenceTriggered] = useState(false);

  // Incoming Order Assignment Alert
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{
    id: string;
    itemsSummary: string;
    dropAddress: string;
    payout: number;
    distanceKm: number;
  } | null>(null);

  // Delivery Completion State
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [photoProof, setPhotoProof] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Simulated GPS Coordinates
  const [currentCoords, setCurrentCoords] = useState<LocationCoords>(currentDriver.currentCoords);

  // Hub & Customer coordinates (Tadepalligudem 534102)
  const storeCoords = { lat: 16.8131, lng: 81.5273 };
  const customerCoords = { lat: 16.8165, lng: 81.5295 };
  const customerAddress = 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102';

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

  // Battery-efficient location pinger (runs every 3-5 seconds when order active)
  useEffect(() => {
    if (!isOnline || orderStatus === 'delivered' || !activeOrderId) return;

    const interval = setInterval(async () => {
      // Simulate realistic driver motion progressing towards customer
      setCurrentCoords((prev) => {
        const step = 0.0004; // small delta
        const dLat = customerCoords.lat - prev.lat;
        const dLng = customerCoords.lng - prev.lng;
        const distance = Math.hypot(dLat, dLng);

        let newLat = prev.lat + (dLat / (distance || 1)) * step;
        let newLng = prev.lng + (dLng / (distance || 1)) * step;

        // Check if arrived at geofence (< 70m)
        if (distance < 0.001) {
          setGeofenceTriggered(true);
        }

        const newCoords: LocationCoords = {
          lat: newLat,
          lng: newLng,
          heading: 115,
          speed: 24,
        };

        // If network is offline, queue update for later retry
        if (!isNetworkOnline) {
          setOfflineQueue((q) => [...q, { lat: newLat, lng: newLng, timestamp: Date.now() }]);
          setLastPingStatus(`Offline: ${offlineQueue.length + 1} pings queued`);
          return newCoords;
        }

        // Send to backend POST /api/driver/location
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: currentDriver.id,
            orderId: activeOrderId,
            lat: newLat,
            lng: newLng,
            heading: 115,
            speed: 24,
            batteryLevel: currentDriver.batteryLevel,
            accuracy: 4.2,
            isQueuedOffline: false,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.geofenceTriggered) {
              setGeofenceTriggered(true);
            }
            setLastPingStatus(`Ping Sent (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`);
          })
          .catch((err) => {
            console.error('Ping error:', err);
            setLastPingStatus('Retrying connection...');
          });

        return newCoords;
      });
    }, 4000); // 4-second battery-efficient cadence as requested in spec

    return () => clearInterval(interval);
  }, [isOnline, orderStatus, activeOrderId, isNetworkOnline, currentDriver.id]);

  // When network comes back online, flush offline queue
  useEffect(() => {
    if (isNetworkOnline && offlineQueue.length > 0) {
      // Flush queued pings
      const queueToSend = [...offlineQueue];
      setOfflineQueue([]);
      setLastPingStatus(`Reconnected: Flushed ${queueToSend.length} queued GPS pings!`);

      // Send latest coordinates
      if (activeOrderId) {
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: currentDriver.id,
            orderId: activeOrderId,
            lat: currentCoords.lat,
            lng: currentCoords.lng,
            heading: 115,
            speed: 24,
            batteryLevel: currentDriver.batteryLevel,
            accuracy: 4.2,
            isQueuedOffline: true,
          }),
        }).catch(console.error);
      }
    }
  }, [isNetworkOnline, offlineQueue.length, activeOrderId, currentDriver, currentCoords]);

  // Status transitions: Picked Up -> On the way -> Delivered
  const handleUpdateStatus = async (newStatus: 'picked_up' | 'on_the_way' | 'delivered') => {
    if (!activeOrderId) return;

    if (newStatus === 'delivered') {
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

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Invalid OTP. Please check with customer.');
        setIsVerifyingOtp(false);
        return;
      }

      // Success
      setOrderStatus('delivered');
      setShowCompleteModal(false);
      setCurrentDriver((prev) => ({
        ...prev,
        deliveriesToday: prev.deliveriesToday + 1,
        earningsToday: prev.earningsToday + 85,
        status: 'available',
        activeOrderId: undefined,
      }));
    } catch (err) {
      setOtpError('Failed to verify delivery. Please retry.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Google Maps navigation link
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeCoords.lat},${storeCoords.lng}&destination=${encodeURIComponent(
    customerAddress
  )}&travelmode=driving`;

  return (
    <div className="max-w-md mx-auto px-4 py-6 font-sans">
      {/* Driver App Frame Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
              🛵
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>FreshLane Partner</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  DRIVER v2.4
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {currentDriver.name} · {currentDriver.zone}
              </div>
            </div>
          </div>

          {/* Online Toggle Button */}
          <button
            onClick={handleToggleOnline}
            className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>

        {/* System Diagnostics & Telemetry Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
          <div className="bg-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-slate-400 text-[10px]">EV Battery</div>
            <div className="font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{currentDriver.batteryLevel}%</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-slate-400 text-[10px]">Today's Trips</div>
            <div className="font-mono font-bold text-white mt-0.5">
              {currentDriver.deliveriesToday} done
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-2 text-center">
            <div className="text-slate-400 text-[10px]">Earnings</div>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">
              ₹{currentDriver.earningsToday}
            </div>
          </div>
        </div>

        {/* Diagnostic Toggle Strip (Testing Features: Network, Background, Driver Switch) */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl text-[10px] text-slate-400 border border-slate-800/60">
          {/* Network Simulator */}
          <button
            onClick={() => setIsNetworkOnline((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
              isNetworkOnline
                ? 'text-emerald-400 hover:bg-slate-800'
                : 'text-amber-400 bg-amber-950/40'
            }`}
            title="Toggle network offline mode to test queued location delivery"
          >
            {isNetworkOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isNetworkOnline ? '4G LTE' : 'Offline Queue'}</span>
          </button>

          {/* Backgrounding Simulator */}
          <button
            onClick={() => setIsAppBackgrounded((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
              isAppBackgrounded
                ? 'text-purple-300 bg-purple-950/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Simulate driver backgrounding the app while GPS foreground worker continues"
          >
            <span>{isAppBackgrounded ? 'Screen Locked' : 'Foreground'}</span>
          </button>

          {/* Driver Switcher */}
          <select
            value={currentDriver.id}
            onChange={(e) => {
              const selected = initialDrivers.find((d) => d.id === e.target.value);
              if (selected) {
                setCurrentDriver(selected);
                setIsOnline(selected.isOnline);
                setActiveOrderId(selected.activeOrderId || null);
              }
            }}
            className="bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none cursor-pointer"
          >
            {initialDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name.split(' ')[0]} ({d.zone.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GPS Interval Banner */}
      <div className="mt-3 flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-slate-800">Battery-Efficient GPS (4s)</span>
        </span>
        <span className="font-mono text-slate-500 text-[10px]">{lastPingStatus}</span>
      </div>

      {/* Incoming Order Simulation Alert Modal / Banner */}
      {incomingOrderAlert && (
        <div className="mt-4 bg-emerald-600 text-white rounded-2xl p-4 shadow-xl animate-bounce space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-white animate-spin" />
              <span className="font-black text-xs uppercase tracking-wider">
                New Order Nearby! (₹{incomingOrderAlert.payout})
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
              30s timeout
            </span>
          </div>

          <div className="text-xs text-emerald-50">
            <p className="font-bold">{incomingOrderAlert.itemsSummary}</p>
            <p className="text-[11px] opacity-90 mt-0.5 truncate">
              To: {incomingOrderAlert.dropAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setIncomingOrderAlert(null)}
              className="px-3 py-2 bg-emerald-700/80 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => {
                setActiveOrderId(incomingOrderAlert.id);
                setOrderStatus('picked_up');
                setIncomingOrderAlert(null);
              }}
              className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
            >
              Accept Order ✓
            </button>
          </div>
        </div>
      )}

      {/* Main Delivery View */}
      {activeOrderId && orderStatus !== 'delivered' ? (
        <div className="mt-4 space-y-4">
          {/* Active Order Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-200">
                  Active Delivery #{activeOrderId}
                </span>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  Express Farm Produce Bundle (4 items)
                </div>
              </div>
              <span className="text-sm font-black text-emerald-700">₹85 payout</span>
            </div>

            {/* Turn-by-turn Navigation Map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Route to Customer</span>
                </span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <span>Google Maps Turn-by-Turn</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <LiveMap
                driverCoords={currentCoords}
                customerCoords={customerCoords}
                storeCoords={storeCoords}
                customerAddress={customerAddress}
                driverName={currentDriver.name}
                driverVehicle="Ather 450X"
                etaMinutes={8}
                distanceMeters={geofenceTriggered ? 45 : 850}
                isDelivered={false}
                geofenceArrived={geofenceTriggered}
                heightClass="h-56"
              />
            </div>

            {/* Geofence Alert Banner for Driver */}
            {geofenceTriggered && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  <div>
                    <div className="font-extrabold">Arrived at Customer Doorstep</div>
                    <div className="text-[11px] text-emerald-700">
                      Within 50m geofence radius. Collect 4-digit PIN!
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black bg-emerald-600 text-white px-2 py-1 rounded-lg">
                  AT PIN
                </span>
              </div>
            )}

            {/* Step-by-Step Waypoints */}
            <div className="space-y-3 pt-1 text-xs">
              {/* Pickup location */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">FreshLane Hub (Indiranagar)</div>
                  <div className="text-[11px] text-slate-500">Pick-up counter #3 · Insulated bag ready</div>
                </div>
                {orderStatus !== 'assigned' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Picked Up ✓
                  </span>
                )}
              </div>

              {/* Customer Dropoff */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">Customer Doorstep</div>
                  <div className="text-[11px] text-slate-500">{customerAddress}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href="tel:+919876543210"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call Customer</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar based on Delivery State */}
            <div className="pt-2 space-y-2">
              {orderStatus === 'assigned' && (
                <button
                  onClick={() => handleUpdateStatus('picked_up')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Picked Up at FreshLane Hub</span>
                </button>
              )}

              {orderStatus === 'picked_up' && (
                <button
                  onClick={() => handleUpdateStatus('on_the_way')}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Bike className="w-4 h-4 text-emerald-400" />
                  <span>Start Express Route (Out for Delivery)</span>
                </button>
              )}

              {orderStatus === 'on_the_way' && (
                <button
                  onClick={() => handleUpdateStatus('delivered')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Delivery with Customer PIN (OTP)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Standby / No Active Order View */
        <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              {isOnline ? 'You Are Online & Ready' : 'You Are Currently Offline'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {isOnline
                ? 'Standing by in Indiranagar zone for express 30-minute vegetable and fruit orders.'
                : 'Switch toggle to Online in the top header to start receiving dispatch alerts.'}
            </p>
          </div>

          {isOnline && (
            <button
              onClick={() => {
                setIncomingOrderAlert({
                  id: 'FL-99410',
                  itemsSummary: '2kg Honey Mangoes, 2x Baby Spinach, 1kg Vine Tomatoes',
                  dropAddress: 'Flat 201, Shanthi Apts, 100ft Road, Indiranagar',
                  payout: 85,
                  distanceKm: 1.4,
                });
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Incoming Order Alert</span>
            </button>
          )}
        </div>
      )}

      {/* Driver Earnings & History Summary Card */}
      <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h4 className="font-extrabold text-xs text-slate-900">
              Today's Payout &amp; History
            </h4>
          </div>
          <span className="text-[11px] font-bold text-emerald-600">
            Daily Target: 12 Trips
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-slate-400 text-[10px]">Net Earnings</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              ₹{currentDriver.earningsToday}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              + ₹120 Weekly Fuel Bonus
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-slate-400 text-[10px]">Rider Rating</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              ⭐ {currentDriver.rating} / 5.0
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Based on 148 verified drops
            </div>
          </div>
        </div>
      </div>

      {/* Back to Customer Web App link */}
      <div className="mt-6 text-center">
        <button
          onClick={onGoToShop}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1"
        >
          <span>Return to Customer Storefront</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Modal: Confirm Delivery with OTP & Photo Proof */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Delivery Confirmation
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Complete Order #{activeOrderId}
                </h3>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ask customer for their 4-digit Delivery PIN (OTP) displayed on their live tracking screen:
            </p>

            {/* OTP Input */}
            <div className="space-y-1">
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4829"
                className="w-full text-center tracking-widest text-2xl font-mono font-black py-3 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
              {otpError && (
                <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            {/* Optional Photo Proof of Delivery */}
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Doorstep Photo Proof (Optional)</span>
                {photoProof && (
                  <span className="text-[10px] text-emerald-600 font-bold">Attached ✓</span>
                )}
              </div>

              {!photoProof ? (
                <button
                  type="button"
                  onClick={() => {
                    // Quick simulated doorstep photo capture
                    setPhotoProof(
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
                    );
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 rounded-2xl text-xs font-semibold text-slate-600 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Take Doorstep Package Photo</span>
                </button>
              ) : (
                <div className="relative h-24 rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={photoProof}
                    alt="Doorstep Proof"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setPhotoProof(null)}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleConfirmDelivered}
                disabled={isVerifyingOtp}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isVerifyingOtp ? 'Verifying...' : 'Confirm Delivery'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
