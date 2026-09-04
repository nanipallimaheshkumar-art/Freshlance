import React, { useState } from 'react';
import { Navigation, Bike, MapPin, Store, Compass, ExternalLink, Zap } from 'lucide-react';
import { LocationCoords } from '../types';

interface LiveMapProps {
  driverCoords?: LocationCoords;
  customerCoords: LocationCoords;
  storeCoords: LocationCoords;
  customerAddress: string;
  driverName?: string;
  driverVehicle?: string;
  etaMinutes?: number;
  distanceMeters?: number;
  isDelivered?: boolean;
  geofenceArrived?: boolean;
  heightClass?: string;
  showGoogleMapsButton?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  driverCoords,
  customerCoords,
  storeCoords,
  customerAddress,
  driverName = 'Express Rider',
  driverVehicle = 'EV Scooter',
  etaMinutes = 12,
  distanceMeters = 1200,
  isDelivered = false,
  geofenceArrived = false,
  heightClass = 'h-72 sm:h-96',
  showGoogleMapsButton = true,
}) => {
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  // Relative coordinate projection to SVG canvas (0 to 100% space)
  // Store is top-left quadrant, customer is bottom-right quadrant
  const storeX = 18;
  const storeY = 30;
  const customerX = 82;
  const customerY = 72;

  // Compute driver position along route
  // If no driverCoords or delivered, place at destination
  let driverProgress = 0.55;
  if (isDelivered) {
    driverProgress = 1.0;
  } else if (geofenceArrived) {
    driverProgress = 0.94;
  } else if (driverCoords) {
    // estimate progress between store (lat: 12.9784, lng: 77.6408) and customer (lat: 12.9698, lng: 77.6499)
    const totalDLat = customerCoords.lat - storeCoords.lat;
    const totalDLng = customerCoords.lng - storeCoords.lng;
    const currentDLat = driverCoords.lat - storeCoords.lat;
    const currentDLng = driverCoords.lng - storeCoords.lng;
    const prog = (currentDLat + currentDLng) / (totalDLat + totalDLng || 1);
    driverProgress = Math.max(0.1, Math.min(0.95, prog || 0.6));
  }

  // Smooth curved bezier points for route
  // Store -> Waypoint 1 -> Waypoint 2 -> Customer
  const w1X = 38;
  const w1Y = 24;
  const w2X = 52;
  const w2Y = 60;
  const w3X = 68;
  const w3Y = 48;

  // Driver coords on spline
  const driverX = storeX + (customerX - storeX) * driverProgress;
  const driverY = storeY + (customerY - storeY) * driverProgress + Math.sin(driverProgress * Math.PI) * -8;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeCoords.lat},${storeCoords.lng}&destination=${encodeURIComponent(
    customerAddress || `${customerCoords.lat},${customerCoords.lng}`
  )}&travelmode=driving`;

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900 select-none`}>
      {/* Map Vector Canvas */}
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Map Background Grid & City Blocks */}
        {mapStyle === 'streets' ? (
          <>
            <rect width="100" height="100" fill="#0F172A" />
            {/* Grid street layout */}
            <path
              d="M0 20 H100 M0 40 H100 M0 60 H100 M0 80 H100 M20 0 V100 M40 0 V100 M60 0 V100 M80 0 V100"
              stroke="#1E293B"
              strokeWidth="0.8"
            />
            {/* Secondary arterial avenues */}
            <path
              d="M-10 30 Q40 25 110 50 M-10 70 Q60 55 110 85 M30 -10 Q45 50 65 110 M75 -10 Q70 40 85 110"
              stroke="#334155"
              strokeWidth="1.6"
              fill="none"
            />
            {/* Green park zones */}
            <rect x="5" y="65" width="22" height="18" rx="2" fill="#064E3B" opacity="0.4" />
            <text x="7" y="74" fill="#34D399" fontSize="2.2" fontFamily="sans-serif" opacity="0.6">
              Indiranagar Park
            </text>
            <rect x="62" y="10" width="18" height="14" rx="2" fill="#064E3B" opacity="0.3" />
            <text x="64" y="18" fill="#34D399" fontSize="2" fontFamily="sans-serif" opacity="0.5">
              Defence Colony
            </text>
            {/* Water canal */}
            <path
              d="M0 90 Q30 85 60 95 T100 88"
              stroke="#0284C7"
              strokeWidth="2.5"
              fill="none"
              opacity="0.3"
            />
          </>
        ) : (
          <>
            <rect width="100" height="100" fill="#0B1320" />
            <path
              d="M-10 30 Q40 25 110 50 M-10 70 Q60 55 110 85 M30 -10 Q45 50 65 110"
              stroke="#1E293B"
              strokeWidth="2"
              fill="none"
            />
          </>
        )}

        {/* Route Path Polyline */}
        <path
          d={`M ${storeX} ${storeY} Q ${w1X} ${w1Y} ${w2X} ${w2Y} T ${w3X} ${w3Y} T ${customerX} ${customerY}`}
          fill="none"
          stroke="#059669"
          strokeWidth="2.8"
          strokeDasharray="2 1.5"
          className="animate-pulse"
          opacity="0.9"
        />

        {/* Store Hub Marker */}
        <g transform={`translate(${storeX}, ${storeY})`}>
          <circle r="4" fill="#10B981" opacity="0.3" className="animate-ping" />
          <circle r="2.8" fill="#059669" stroke="#ffffff" strokeWidth="0.6" />
        </g>

        {/* Customer Destination Marker */}
        <g transform={`translate(${customerX}, ${customerY})`}>
          <circle r="4.5" fill="#EF4444" opacity="0.25" className="animate-ping" />
          <circle r="3" fill="#DC2626" stroke="#ffffff" strokeWidth="0.6" />
        </g>

        {/* Geofence Ring around Customer (70m radius representation) */}
        <circle
          cx={customerX}
          cy={customerY}
          r="8.5"
          fill={geofenceArrived ? '#10B981' : '#3B82F6'}
          fillOpacity={geofenceArrived ? '0.25' : '0.08'}
          stroke={geofenceArrived ? '#10B981' : '#60A5FA'}
          strokeWidth="0.4"
          strokeDasharray={geofenceArrived ? 'none' : '1.5 1'}
        />

        {/* Moving Driver Marker */}
        <g
          transform={`translate(${driverX}, ${driverY})`}
          filter="url(#glow)"
        >
          <circle r="5" fill="#10B981" opacity="0.35" className="animate-ping" />
          <circle r="3.6" fill="#10B981" stroke="#ffffff" strokeWidth="0.8" />
        </g>
      </svg>

      {/* HTML Overlays on Map */}
      {/* Store Label */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-full mb-1 pointer-events-none"
        style={{ left: `${storeX}%`, top: `${storeY}%` }}
      >
        <div className="bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md border border-emerald-500/50 flex items-center gap-1">
          <Store className="w-2.5 h-2.5 text-emerald-400" />
          <span>FreshLane Hub</span>
        </div>
      </div>

      {/* Customer Label */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-full mb-1 pointer-events-none"
        style={{ left: `${customerX}%`, top: `${customerY}%` }}
      >
        <div className="bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md border border-rose-500/50 flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 text-rose-400" />
          <span>Your Doorstep</span>
        </div>
      </div>

      {/* Moving Driver Vehicle Pin Tooltip */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-full mb-2 pointer-events-none transition-all duration-700 ease-out"
        style={{ left: `${driverX}%`, top: `${driverY}%` }}
      >
        <div className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white/80 flex items-center gap-1.5 animate-bounce">
          <Bike className="w-3 h-3 text-white" />
          <span>{isDelivered ? 'Arrived!' : `${driverName} (${etaMinutes}m)`}</span>
        </div>
      </div>

      {/* Map Controls Top Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-white shadow-lg flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-bold text-emerald-400">Live GPS Stream</span>
          <span className="text-slate-400">·</span>
          <span className="text-[11px] text-slate-300 font-mono">
            {distanceMeters > 0 ? `${(distanceMeters / 1000).toFixed(1)} km away` : 'At location'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showGoogleMapsButton && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open turn-by-turn route in Google Maps"
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          )}

          <button
            onClick={() => setMapStyle((s) => (s === 'streets' ? 'satellite' : 'streets'))}
            className="bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-semibold px-2 py-1.5 rounded-xl border border-slate-700/60 shadow-lg cursor-pointer transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Geofence Alert Overlay */}
      {geofenceArrived && !isDelivered && (
        <div className="absolute bottom-3 left-3 right-3 bg-emerald-500/95 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Geofence triggered: Driver is at your doorstep (&lt; 70m)</span>
          </div>
          <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-mono">
            GET READY
          </span>
        </div>
      )}
    </div>
  );
};
