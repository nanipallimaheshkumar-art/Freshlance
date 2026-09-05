import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Navigation,
  Check,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Crosshair,
  Sparkles,
  ShieldCheck,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { DeliveryOrder } from './DeliveryPortal';

export type LoadingStage = 'idle' | 'gps' | 'measuring' | 'verifying';

interface MarkAsDeliveredButtonProps {
  order: DeliveryOrder;
  isLoading: boolean;
  loadingStage: LoadingStage;
  isSuccess: boolean;
  successDistance?: number;
  isError: boolean;
  errorMessage?: string;
  errorDistance?: number;
  shakeTrigger?: number;
  onMarkDelivered: (simulatedCoords?: { lat: number; lng: number }) => void;
  onResetOrder?: () => void;
  isDelivered: boolean;
}

// Particle explosion positions for celebration animation
const PARTICLES = [
  { id: 1, x: -38, y: -28, scale: 1.1, color: '#34d399', delay: 0 },
  { id: 2, x: 42, y: -26, scale: 1.2, color: '#6ee7b7', delay: 0.04 },
  { id: 3, x: -50, y: 0, scale: 0.9, color: '#10b981', delay: 0.08 },
  { id: 4, x: 52, y: -2, scale: 1.0, color: '#a7f3d0', delay: 0.06 },
  { id: 5, x: -32, y: 26, scale: 1.2, color: '#34d399', delay: 0.1 },
  { id: 6, x: 36, y: 28, scale: 1.1, color: '#6ee7b7', delay: 0.07 },
  { id: 7, x: -16, y: -38, scale: 0.8, color: '#fef08a', delay: 0.03 },
  { id: 8, x: 18, y: -36, scale: 0.8, color: '#fbbf24', delay: 0.05 },
  { id: 9, x: 0, y: -42, scale: 1.3, color: '#67e8f9', delay: 0.02 },
  { id: 10, x: -4, y: 36, scale: 0.9, color: '#38bdf8', delay: 0.09 },
];

export const MarkAsDeliveredButton: React.FC<MarkAsDeliveredButtonProps> = ({
  order,
  isLoading,
  loadingStage,
  isSuccess,
  successDistance,
  isError,
  errorMessage,
  errorDistance,
  shakeTrigger,
  onMarkDelivered,
  onResetOrder,
  isDelivered,
}) => {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeIteration, setShakeIteration] = useState(0);

  // Trigger CSS shake animation on validation failures
  useEffect(() => {
    if (isError || (shakeTrigger !== undefined && shakeTrigger > 0)) {
      setIsShaking(true);
      setShakeIteration((prev) => prev + 1);
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isError, shakeTrigger, errorMessage, errorDistance]);

  // If order is already completed and delivered
  if (isDelivered && !isSuccess) {
    return (
      <div className="space-y-2 pt-1">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 text-xs text-emerald-200 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Doorstep Delivery Confirmed</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 font-semibold">
              ≤100m GPS Verified
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            Completed at {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'doorstep'}
            {order.deliveredDistanceMeters !== undefined && (
              <span className="font-mono text-emerald-400 font-medium"> · Verified {order.deliveredDistanceMeters}m from address</span>
            )}
          </p>
        </div>

        {onResetOrder && (
          <div className="text-center pt-1">
            <button
              onClick={onResetOrder}
              className="text-[11px] text-slate-400 hover:text-emerald-400 underline cursor-pointer transition-colors"
            >
              Reset to &apos;Out for Delivery&apos; for re-testing
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {/* Primary Animated Button */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* STATE 1: SUCCESS CELEBRATION */}
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: [0.92, 1.03, 1], opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className="relative overflow-hidden w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-extrabold shadow-xl shadow-emerald-500/30 border border-emerald-300/60 flex flex-col items-center justify-center gap-1 text-center"
            >
              {/* Animated Background Glow Pulse */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.98, 1.05, 0.98],
                }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="absolute inset-0 bg-white/25 blur-md pointer-events-none"
              />

              {/* Particle Explosion Effects */}
              {PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    scale: [0, p.scale, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.9,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                  style={{ backgroundColor: p.color }}
                  className="absolute w-2 h-2 rounded-full shadow-xs pointer-events-none z-20"
                />
              ))}

              {/* Sparkle Icons */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: [0, 1.3, 1], rotate: [0, 15, 0] }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center shadow-md">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, delay: 0.15 }}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </motion.div>
                </div>
                <span className="text-sm tracking-tight text-slate-950 font-black flex items-center gap-1.5">
                  <span>Location Verified &amp; Delivered!</span>
                  <Sparkles className="w-4 h-4 text-emerald-900 animate-pulse" />
                </span>
              </motion.div>

              {/* Verified Proximity Tag */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[11px] font-semibold text-slate-900/90 flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                <span>
                  Doorstep proximity:{' '}
                  <strong className="underline font-mono">
                    {successDistance !== undefined ? `${successDistance}m` : '≤15m'} away
                  </strong>{' '}
                  (Permitted: ≤100m)
                </span>
              </motion.div>
            </motion.div>
          ) : isLoading ? (
            /* STATE 2: ANIMATED SCANNING & VALIDATING STATE */
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative overflow-hidden w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/50 shadow-xl shadow-emerald-500/10 text-emerald-300 flex flex-col items-center justify-center gap-1.5"
            >
              {/* Animated Progress Laser Scanline */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent skew-x-12 pointer-events-none"
              />

              {/* Glowing animated border glow */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 animate-pulse" />

              {/* Radar & Stage Feedback */}
              <div className="flex items-center gap-2.5 z-10">
                <div className="relative flex items-center justify-center">
                  {/* Concentric GPS Sonar Rings */}
                  <motion.span
                    animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                    className="absolute w-4 h-4 rounded-full bg-emerald-400/50"
                  />
                  <motion.span
                    animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                    className="absolute w-4 h-4 rounded-full bg-emerald-400/30"
                  />

                  {loadingStage === 'gps' && (
                    <Crosshair className="w-5 h-5 text-emerald-400 animate-spin" />
                  )}
                  {loadingStage === 'measuring' && (
                    <Compass className="w-5 h-5 text-teal-300 animate-pulse" />
                  )}
                  {loadingStage === 'verifying' && (
                    <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  )}
                  {loadingStage === 'idle' && (
                    <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  )}
                </div>

                <div className="text-left">
                  <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    {loadingStage === 'gps' && 'Acquiring GPS Satellite Fix...'}
                    {loadingStage === 'measuring' && 'Measuring Distance to Doorstep...'}
                    {loadingStage === 'verifying' && 'Validating ≤100m Geofence...'}
                    {loadingStage === 'idle' && 'Verifying Location Coordinates...'}
                  </span>
                  <p className="text-[10px] text-emerald-400/80 font-mono">
                    High-accuracy HTML5 geolocation active
                  </p>
                </div>
              </div>

              {/* Subtle animated step dots */}
              <div className="flex items-center gap-1.5 mt-0.5 z-10">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    loadingStage === 'gps' || loadingStage === 'measuring' || loadingStage === 'verifying'
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    loadingStage === 'measuring' || loadingStage === 'verifying'
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    loadingStage === 'verifying' ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </div>
            </motion.div>
          ) : isError ? (
            /* STATE 3: LOCATION VALIDATION FAILED WITH TACTILE CSS SHAKE ANIMATION */
            <div key={`error-state-${shakeIteration}`} className="space-y-2">
              {/* Detailed Geofence Warning Notice */}
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 shadow-md flex items-start gap-2.5 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">Doorstep Geofence Exceeded</span>
                    {errorDistance !== undefined && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-300 font-semibold border border-rose-700/60">
                        {errorDistance}m &gt; 100m limit
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-tight">
                    {errorMessage || `You are too far from the customer's delivery address (${errorDistance || 118}m). Stand within 100 meters of the doorstep to mark as delivered.`}
                  </p>
                </div>
              </div>

              {/* The Tactile 'Mark as Delivered' Button with CSS 'shake' animation */}
              <button
                key={`shaking-btn-${shakeIteration}`}
                type="button"
                onClick={() => onMarkDelivered()}
                className={`group relative overflow-hidden w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:from-rose-700 active:to-amber-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-rose-950/40 border border-rose-300/50 cursor-pointer transition-all duration-200 ${
                  isShaking ? 'animate-shake ring-4 ring-rose-500/50' : ''
                }`}
                title="Location check failed: Tap to re-capture GPS coordinates"
              >
                {/* Subtle hover shine sweep */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                </div>

                <span className="tracking-tight font-black">
                  Mark as Delivered (Location Failed — Retry)
                </span>

                <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 text-rose-100 border border-white/20">
                  {errorDistance !== undefined ? `${errorDistance}m away` : 'Too Far (>100m)'}
                </span>
              </button>
            </div>
          ) : (
            /* STATE 4: DEFAULT IDLE 'MARK AS DELIVERED' BUTTON */
            <motion.button
              key={`idle-${shakeIteration}`}
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMarkDelivered()}
              className={`group relative overflow-hidden w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:from-emerald-600 active:to-teal-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 border border-emerald-300/40 cursor-pointer transition-all duration-200 ${
                isShaking ? 'animate-shake ring-4 ring-rose-500/50' : ''
              }`}
            >
              {/* Subtle hover shine sweep */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Glowing Pulse Ring behind icon */}
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950/20 group-hover:bg-slate-950/30 transition-colors mr-0.5" />
                <Navigation className="w-4 h-4 fill-slate-950 stroke-slate-950 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>

              <span className="tracking-tight font-black">
                Mark as Delivered (Capture GPS)
              </span>

              <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/15 text-slate-950 border border-slate-950/10">
                ≤100m Hub Rule
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Simulation Helper Buttons for Quick Evaluation & Testing */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/50 text-[11px]">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-slate-400" />
          <span>Simulation Tests:</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Within 100 meters (e.g. ~15m from customer doorstep)
              const nearCoords = {
                lat: order.customerCoords.lat + 0.0001,
                lng: order.customerCoords.lng + 0.0001,
              };
              onMarkDelivered(nearCoords);
            }}
            disabled={isLoading || isSuccess}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold cursor-pointer transition-colors text-[11px] disabled:opacity-40 flex items-center gap-1"
            title="Simulate driver at customer doorstep (15m offset) to see successful animation"
          >
            <span>Test ≤100m (Success)</span>
          </button>
          <button
            onClick={() => {
              // Far away (>100m, e.g. ~450m offset)
              const farCoords = {
                lat: order.customerCoords.lat + 0.004,
                lng: order.customerCoords.lng + 0.003,
              };
              onMarkDelivered(farCoords);
            }}
            disabled={isLoading || isSuccess}
            className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold cursor-pointer transition-colors text-[11px] disabled:opacity-40 flex items-center gap-1"
            title="Simulate driver 450m away to see 403 Forbidden geofence error animation"
          >
            <span>Test &gt;100m (403 Err)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
