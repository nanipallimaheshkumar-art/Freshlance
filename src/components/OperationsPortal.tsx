import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bike,
  Store,
  ArrowLeft,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Users,
  Compass,
  Radio,
  Lock
} from 'lucide-react';
import { OwnerDashboard } from './OwnerDashboard';
import { DriverApp } from './DriverApp';
import { UserAccount } from '../types';

interface OperationsPortalProps {
  user: UserAccount | null;
  onSwitchToCustomerWeb: () => void;
  defaultSubApp?: 'admin' | 'driver';
}

export const OperationsPortal: React.FC<OperationsPortalProps> = ({
  user,
  onSwitchToCustomerWeb,
  defaultSubApp = 'admin',
}) => {
  const [activeOpsView, setActiveOpsView] = useState<'admin' | 'driver'>(defaultSubApp);
  const [staffAuthorized, setStaffAuthorized] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Operations Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand & Portal Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  FreshLane Operations
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Admin &amp; Driver Web
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Internal Logistics, Daily Produce Pricing &amp; Fleet Telematics
              </p>
            </div>
          </div>

          {/* Ops View Switcher (Admin Desk vs Driver App) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveOpsView('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeOpsView === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </button>

            <button
              onClick={() => setActiveOpsView('driver')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeOpsView === 'driver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Driver App (Live GPS)</span>
            </button>
          </div>

          {/* Switch to Customer Web */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToCustomerWeb}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Customer Shopping Market"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Go to Customer Web</span>
              <span className="sm:hidden">Customer App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Operations Content Area */}
      <div className="flex-1 bg-[#F8FAFC]">
        {activeOpsView === 'admin' ? (
          <div className="py-6 px-4 max-w-7xl mx-auto">
            <OwnerDashboard
              user={user}
              onGoToShop={onSwitchToCustomerWeb}
            />
          </div>
        ) : (
          <div className="py-6 px-4 max-w-7xl mx-auto">
            <DriverApp onGoToShop={onSwitchToCustomerWeb} />
          </div>
        )}
      </div>

      {/* Operations Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Internal Operations Portal · Admin &amp; Driver Fleet Telematics Active</span>
          </div>
          <button
            onClick={onSwitchToCustomerWeb}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
          >
            ← Return to Customer Grocery Store
          </button>
        </div>
      </footer>
    </div>
  );
};
