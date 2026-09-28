import React, { useState } from 'react';
import { Navigation, Bike, MapPin, Store, ExternalLink, Zap, Layers, Satellite } from 'lucide-react';
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
  showDriverToDoorstepRoute?: boolean;
  defaultMapStyle?: 'streets' | 'satellite';
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
  showDriverToDoorstepRoute = true,
  defaultMapStyle = 'streets',
}) => {
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>(defaultMapStyle);

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
    // estimate progress between store (lat: 16.8131, lng: 81.5273) and customer (lat: 16.8165, lng: 81.5295)
    const totalDLat = customerCoords.lat - storeCoords.lat;
    const totalDLng = customerCoords.lng - storeCoords.lng;
    const currentDLat = driverCoords.lat - storeCoords.lat;
    const currentDLng = driverCoords.lng - storeCoords.lng;
    const prog = (currentDLat + currentDLng) / (totalDLat + totalDLng || 1);
    driverProgress = Math.max(0.05, Math.min(0.98, prog || 0.6));
  }

  // Smooth curved bezier points for full store-to-doorstep baseline route
  const w1X = 38;
  const w1Y = 24;
  const w2X = 52;
  const w2Y = 60;
  const w3X = 68;
  const w3Y = 48;

  // Driver coords on projection
  const driverX = isDelivered ? customerX : storeX + (customerX - storeX) * driverProgress;
  const driverY = isDelivered ? customerY : storeY + (customerY - storeY) * driverProgress + Math.sin(driverProgress * Math.PI) * -8;

  // Computed polyline waypoints connecting driver's current position directly to customer doorstep
  const polylineMid1X = Number((driverX + (customerX - driverX) * 0.44).toFixed(1));
  const polylineMid1Y = Number((driverY + (customerY - driverY) * 0.16).toFixed(1));
  const polylineMid2X = Number((driverX + (customerX - driverX) * 0.74).toFixed(1));
  const polylineMid2Y = Number((driverY + (customerY - driverY) * 0.82).toFixed(1));
  const polylinePointsStr = `${driverX.toFixed(1)},${driverY.toFixed(1)} ${polylineMid1X},${polylineMid1Y} ${polylineMid2X},${polylineMid2Y} ${customerX},${customerY}`;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeCoords.lat},${storeCoords.lng}&destination=${encodeURIComponent(
    customerAddress || `${customerCoords.lat},${customerCoords.lng}`
  )}&travelmode=driving`;

  return (
    <div className={`relative w-full ${heightClass} rounded-[32px] overflow-hidden border border-emerald-900/20 shadow-xl bg-slate-900 select-none`}>
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
          <linearGradient id="driverDoorstepRouteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="60%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Map Background Grid & City Blocks / Satellite Imagery */}
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
            {/* High-resolution Godavari Delta Satellite Imagery Base */}
            <rect width="100" height="100" fill="#0c1a11" />

            {/* Segmented Delta Agricultural Parcels (Paddy, Palm Orchards, Cultivated plots) */}
            <polygon points="0,0 35,0 32,25 0,22" fill="#143019" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="0,22 32,25 28,45 0,42" fill="#194021" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="0,42 28,45 25,65 0,68" fill="#112915" stroke="#0a160c" strokeWidth="0.5" />

            {/* Central agricultural plots (West Godavari paddy & plantation clusters) */}
            <polygon points="35,0 70,0 66,28 32,25" fill="#1b3920" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="32,25 66,28 62,55 28,45" fill="#132e18" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="28,45 62,55 58,80 25,65" fill="#24301e" stroke="#0a160c" strokeWidth="0.5" />

            {/* Banana & Coconut Plantations with deep canopy tones */}
            <polygon points="70,0 100,0 100,32 66,28" fill="#0d2412" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="66,28 100,32 100,60 62,55" fill="#15331b" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="62,55 100,60 100,90 58,80" fill="#1e3b23" stroke="#0a160c" strokeWidth="0.5" />

            {/* South plots & riverbed delta fields */}
            <polygon points="0,68 25,65 22,88 0,86" fill="#1e3a22" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="25,65 58,80 54,98 22,88" fill="#263520" stroke="#0a160c" strokeWidth="0.5" />
            <polygon points="58,80 100,90 100,100 54,100" fill="#132b17" stroke="#0a160c" strokeWidth="0.5" />

            {/* Godavari Irrigation Feeder Canal (Satellite Water Surface) */}
            <path
              d="M0 88 Q30 83 60 92 T100 85"
              stroke="#082f42"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M0 88 Q30 83 60 92 T100 85"
              stroke="#0ea5e9"
              strokeWidth="1.2"
              fill="none"
              opacity="0.65"
            />

            {/* Satellite Hybrid Road Network - High contrast with road markings */}
            {/* NH16 Highway Bypass */}
            <path
              d="M-10 30 Q40 25 110 50"
              stroke="#1e293b"
              strokeWidth="3.6"
              fill="none"
            />
            <path
              d="M-10 30 Q40 25 110 50"
              stroke="#475569"
              strokeWidth="2.8"
              fill="none"
            />
            <path
              d="M-10 30 Q40 25 110 50"
              stroke="#facc15"
              strokeWidth="0.5"
              strokeDasharray="2 1.5"
              fill="none"
              opacity="0.9"
            />

            {/* Main Arterial Roads */}
            <path
              d="M-10 70 Q60 55 110 85"
              stroke="#1e293b"
              strokeWidth="2.8"
              fill="none"
            />
            <path
              d="M-10 70 Q60 55 110 85"
              stroke="#475569"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M-10 70 Q60 55 110 85"
              stroke="#ffffff"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              fill="none"
              opacity="0.8"
            />

            {/* Cross feeder roads */}
            <path
              d="M30 -10 Q45 50 65 110"
              stroke="#334155"
              strokeWidth="1.8"
              fill="none"
            />
            <path
              d="M75 -10 Q70 40 85 110"
              stroke="#334155"
              strokeWidth="1.8"
              fill="none"
            />

            {/* Urban rooftop clusters & settlement footprints */}
            <rect x="15" y="24" width="5" height="4" fill="#474542" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />
            <rect x="22" y="26" width="4" height="5" fill="#3d404d" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />
            <rect x="17" y="32" width="6" height="4" fill="#524a45" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />
            <rect x="76" y="68" width="5" height="5" fill="#4a423e" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />
            <rect x="83" y="66" width="6" height="4" fill="#3d4450" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />
            <rect x="80" y="74" width="5" height="4" fill="#504540" stroke="#1f1e1d" strokeWidth="0.3" rx="0.3" />

            {/* Satellite Hybrid Landmark Labels */}
            <text x="36" y="22" fill="#FFFFFF" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" opacity="0.9" filter="drop-shadow(0px 1px 2px #000000)">
              NH16 Highway Bypass
            </text>
            <text x="6" y="94" fill="#7dd3fc" fontSize="2.0" fontFamily="sans-serif" fontWeight="bold" opacity="0.85" filter="drop-shadow(0px 1px 2px #000000)">
              Godavari Feeder Canal
            </text>
            <text x="74" y="64" fill="#FFFFFF" fontSize="2.0" fontFamily="sans-serif" opacity="0.85" filter="drop-shadow(0px 1px 2px #000000)">
              Subba Rao Peta
            </text>
            <text x="4" y="18" fill="#86efac" fontSize="1.9" fontFamily="sans-serif" opacity="0.8" filter="drop-shadow(0px 1px 2px #000000)">
              Paddy Cultivation Zone
            </text>
          </>
        )}

        {/* Baseline Store-to-Doorstep Dispatch Corridor (Muted) */}
        <path
          d={`M ${storeX} ${storeY} Q ${w1X} ${w1Y} ${w2X} ${w2Y} T ${w3X} ${w3Y} T ${customerX} ${customerY}`}
          fill="none"
          stroke="#065F46"
          strokeWidth="1.8"
          strokeDasharray="2 2"
          opacity="0.4"
        />

        {/* Visual Polyline Route Overlay between Driver's Current Coordinates and Customer's Doorstep */}
        {showDriverToDoorstepRoute && !isDelivered && (
          <g id="driver-doorstep-route-overlay">
            {/* Dark background contrast casing */}
            <polyline
              id="driver-doorstep-polyline-casing"
              points={polylinePointsStr}
              fill="none"
              stroke="#020617"
              strokeWidth="4.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            {/* Primary high-contrast visual polyline route */}
            <polyline
              id="driver-to-doorstep-polyline"
              points={polylinePointsStr}
              fill="none"
              stroke="url(#driverDoorstepRouteGradient)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#routeGlow)"
            />
            {/* Animated white directional dashes traveling toward customer doorstep */}
            <polyline
              id="driver-doorstep-polyline-dashes"
              points={polylinePointsStr}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeDasharray="2.5 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
              opacity="0.9"
            />
            {/* Waypoint nodes along the street grid corridor */}
            <circle
              cx={polylineMid1X}
              cy={polylineMid1Y}
              r="1.4"
              fill="#60A5FA"
              stroke="#0F172A"
              strokeWidth="0.5"
            />
            <circle
              cx={polylineMid2X}
              cy={polylineMid2Y}
              r="1.4"
              fill="#34D399"
              stroke="#0F172A"
              strokeWidth="0.5"
            />
          </g>
        )}

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
        <div className="btn-unique-emerald text-white text-[11px] font-black px-3 py-1 rounded-[32px] shadow-lg border border-white/80 flex items-center gap-1.5 animate-bounce">
          <Bike className="w-3 h-3 text-white" />
          <span>{isDelivered ? 'Arrived!' : `${driverName} (${etaMinutes}m)`}</span>
        </div>
      </div>

      {/* Map Controls Top Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-[32px] border border-emerald-500/30 text-white shadow-lg flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-bold text-emerald-400">Live GPS Stream</span>
          <span className="text-slate-400">·</span>
          <span className="text-[11px] text-slate-300 font-mono">
            {distanceMeters > 0 ? `${(distanceMeters / 1000).toFixed(1)} km away` : 'At location'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Standard Streets vs Satellite Imagery */}
          <div
            id="livemap-view-toggle"
            role="radiogroup"
            aria-label="Map view mode toggle"
            className="bg-slate-900/90 backdrop-blur-md p-1 rounded-[32px] border border-emerald-500/30 shadow-lg flex items-center gap-1"
          >
            <button
              type="button"
              id="livemap-toggle-streets"
              aria-pressed={mapStyle === 'streets'}
              onClick={() => setMapStyle('streets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[32px] text-[11px] font-bold transition-all cursor-pointer ${
                mapStyle === 'streets'
                  ? 'btn-unique-emerald text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Standard street map view"
            >
              <Layers className="w-3 h-3" />
              <span>Standard</span>
            </button>
            <button
              type="button"
              id="livemap-toggle-satellite"
              aria-pressed={mapStyle === 'satellite'}
              onClick={() => setMapStyle('satellite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[32px] text-[11px] font-bold transition-all cursor-pointer ${
                mapStyle === 'satellite'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Satellite imagery view for terrain & landmark accuracy"
            >
              <Satellite className="w-3 h-3" />
              <span>Satellite</span>
            </button>
          </div>

          {showGoogleMapsButton && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-[32px] border border-emerald-500/30 shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open turn-by-turn route in Google Maps"
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Satellite Imagery Active Badge */}
      {mapStyle === 'satellite' && (
        <div className="absolute top-14 left-3 bg-slate-950/85 backdrop-blur-md text-sky-300 text-[10px] font-semibold px-3 py-1 rounded-[32px] border border-sky-500/30 flex items-center gap-1.5 shadow-sm pointer-events-none animate-fade-in">
          <Satellite className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
          <span>Satellite Imagery Active · High Landmark Accuracy</span>
        </div>
      )}

      {/* Active Polyline Route Indicator Overlay */}
      {showDriverToDoorstepRoute && !isDelivered && !geofenceArrived && (
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-[32px] text-xs font-semibold flex items-center gap-2 shadow-lg border border-sky-500/30">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-sky-400 font-bold">Polyline Route:</span>
          <span className="text-slate-300">Driver ➔ Doorstep</span>
          <span className="text-[10px] text-slate-400 font-mono">({Math.round(distanceMeters)}m)</span>
        </div>
      )}

      {/* Geofence Alert Overlay */}
      {geofenceArrived && !isDelivered && (
        <div className="absolute bottom-3 left-3 right-3 btn-unique-emerald backdrop-blur-md text-white px-4 py-2.5 rounded-[32px] text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Geofence triggered: Driver is at your doorstep (&lt; 70m)</span>
          </div>
          <span className="text-[10px] bg-slate-900/80 px-2.5 py-0.5 rounded-[32px] text-emerald-300 font-mono">
            GET READY
          </span>
        </div>
      )}
    </div>
  );
};
