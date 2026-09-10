import React from 'react';
import { X, ExternalLink, Store, ShieldCheck, Bike, ArrowRight, CheckCircle2, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { UserAccount } from '../types';

interface WebSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWeb: 'customer' | 'admin' | 'delivery';
  onSelectWeb: (web: 'customer' | 'admin' | 'delivery') => void;
  user: UserAccount | null;
}

export const WebSuiteModal: React.FC<WebSuiteModalProps> = ({
  isOpen,
  onClose,
  activeWeb,
  onSelectWeb,
  user,
}) => {
  if (!isOpen) return null;

  const handleLaunchNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  FreshLane Web Applications Suite
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  3 Independent Webs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between webs or launch them in separate browser tabs to run side-by-side.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Webs Cards Grid */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* 1. Admin Operations Web */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              activeWeb === 'admin'
                ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      FreshLane Admin Web
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-900/40 text-amber-300 border border-amber-800/40">
                      /admin
                    </span>
                    {activeWeb === 'admin' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                        Current View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Store manager &amp; merchant desk. Control live daily wholesale rates, toggle stock availability, assign pending orders to couriers, monitor delivery telematics, and review revenue reports.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-slate-400 font-medium">Access:</span>
                    <span className="text-slate-300">Authorized Store Administrators</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWeb('admin');
                    onClose();
                  }}
                  className={`w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeWeb === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{activeWeb === 'admin' ? 'Active Here' : 'Open in View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchNewTab('/admin')}
                  className="w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Open Admin Web in a separate browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Window ↗</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Delivery Partner Web */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              activeWeb === 'delivery'
                ? 'bg-sky-950/20 border-sky-500/60 ring-1 ring-sky-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      FreshLane Delivery Web
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-900/40 text-sky-300 border border-sky-800/40">
                      /delivery
                    </span>
                    {activeWeb === 'delivery' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500 text-slate-950">
                        Current View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Fleet companion web for riders on electric scooters and bikes. Live GPS turn-by-turn routing simulation, proximity geofence arrival alerts (&lt;50m), customer contact shortcuts, and secure doorstep OTP confirmation.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-slate-400 font-medium">Access:</span>
                    <span className="text-slate-300">Registered Delivery Partners &amp; Couriers</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWeb('delivery');
                    onClose();
                  }}
                  className={`w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeWeb === 'delivery'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-950/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{activeWeb === 'delivery' ? 'Active Here' : 'Open in View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchNewTab('/delivery')}
                  className="w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Open Delivery Web in a separate browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Window ↗</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Customer Storefront Web */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              activeWeb === 'customer'
                ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      FreshLane Customer Store Web
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-800/40">
                      /
                    </span>
                    {activeWeb === 'customer' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                        Current View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Customer grocery storefront. Browse fresh farm fruits, tender vegetables, and leafy bundles. Instant 24–30 min express delivery, live cart sync, Razorpay checkout, and live driver tracking.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWeb('customer');
                    onClose();
                  }}
                  className={`w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeWeb === 'customer'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{activeWeb === 'customer' ? 'Active Here' : 'Open in View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchNewTab('/')}
                  className="w-full sm:w-36 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Open Customer Store in a separate browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>New Window ↗</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-between px-6">
          <span>FreshLane Multi-Web Ecosystem · Real-time WebSocket &amp; SSE sync</span>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
