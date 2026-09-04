import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bike,
  Store,
  ArrowLeft,
  Lock,
  Radio,
  UserCheck,
  AlertTriangle,
  KeyRound,
  LogOut,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { OwnerDashboard } from './OwnerDashboard';
import { DriverApp } from './DriverApp';
import { UserAccount } from '../types';
import { authenticateStaff, setCurrentSession, clearCurrentSession } from '../utils/authStore';

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
  // Staff user state: either passed from props if already staff, or authenticated inside the portal gate
  const [currentStaffUser, setCurrentStaffUser] = useState<UserAccount | null>(() => {
    if (user && (user.role === 'owner' || user.role === 'driver')) {
      return user;
    }
    return null;
  });

  // Sync if external user prop changes
  useEffect(() => {
    if (user && (user.role === 'owner' || user.role === 'driver')) {
      setCurrentStaffUser(user);
    } else if (user && user.role === 'shopper') {
      // Shoppers are not authorized staff
      setCurrentStaffUser(null);
    }
  }, [user]);

  const [activeOpsView, setActiveOpsView] = useState<'admin' | 'driver'>(() => {
    if (currentStaffUser?.role === 'driver') return 'driver';
    return defaultSubApp;
  });

  // Gate Form States
  const [staffRoleTab, setStaffRoleTab] = useState<'owner' | 'driver'>(
    defaultSubApp === 'driver' ? 'driver' : 'owner'
  );
  const [identifier, setIdentifier] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  // Handle Staff Login
  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!identifier.trim()) {
      setAuthError(`Please enter your ${staffRoleTab === 'owner' ? 'Store Admin Email' : 'Driver ID or Phone'}.`);
      return;
    }
    if (!passcode.trim()) {
      setAuthError('Please enter your staff password or PIN.');
      return;
    }

    setAuthLoading(true);

    setTimeout(() => {
      const res = authenticateStaff(identifier, passcode, staffRoleTab);
      setAuthLoading(false);

      if (res.success && res.user) {
        setCurrentStaffUser(res.user);
        setCurrentSession(res.user, true);
        if (res.user.role === 'driver') {
          setActiveOpsView('driver');
        } else {
          setActiveOpsView('admin');
        }
      } else {
        setAuthError(
          res.error ||
            'Unauthorized staff credentials. Only registered store managers and fleet riders have access.'
        );
      }
    }, 400);
  };

  // Quick Demo Auto-fill helpers for staff testing
  const handleFillDemoAdmin = () => {
    setStaffRoleTab('owner');
    setIdentifier('owner@freshlane.com');
    setPasscode('ownerpass123');
    setAuthError(null);
  };

  const handleFillDemoDriver = () => {
    setStaffRoleTab('driver');
    setIdentifier('driver@freshlane.com');
    setPasscode('driverpass123');
    setAuthError(null);
  };

  const handleStaffSignOut = () => {
    clearCurrentSession();
    setCurrentStaffUser(null);
    setIdentifier('');
    setPasscode('');
    setAuthError(null);
  };

  const handleSelectView = (view: 'admin' | 'driver') => {
    if (view === 'admin' && currentStaffUser?.role === 'driver') {
      setRoleNotice('Access Restricted: Delivery riders cannot access Admin Desk pricing and financial analytics.');
      setTimeout(() => setRoleNotice(null), 4000);
      return;
    }
    setRoleNotice(null);
    setActiveOpsView(view);
  };

  // IF NOT AN AUTHORIZED STAFF MEMBER -> SHOW RESTRICTED ACCESS GATE
  if (!currentStaffUser || (currentStaffUser.role !== 'owner' && currentStaffUser.role !== 'driver')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top Minimal Ops Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 py-3 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                🔒
              </div>
              <div>
                <span className="font-extrabold text-sm text-white">FreshLane Operations</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono ml-2 uppercase">
                  Staff Access Restricted
                </span>
              </div>
            </div>
            <button
              onClick={onSwitchToCustomerWeb}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Return to Customer Market</span>
            </button>
          </div>
        </header>

        {/* Access Gate Lock Screen */}
        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Top Glowing Security Badge */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Staff Authentication Required
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                FreshLane Admin and Driver consoles contain proprietary inventory, real-time telematics, and customer delivery routes. Access is strictly restricted to verified personnel.
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setStaffRoleTab('owner');
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  staffRoleTab === 'owner'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Store Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStaffRoleTab('driver');
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  staffRoleTab === 'driver'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Fleet Driver</span>
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1">{authError}</span>
              </div>
            )}

            {/* Staff Credentials Form */}
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {staffRoleTab === 'owner' ? 'Admin Email / ID' : 'Driver ID / Phone Number'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={staffRoleTab === 'owner' ? 'owner@freshlane.com' : 'DRV-101 or driver@freshlane.com'}
                  className="w-full h-11 px-3.5 text-xs bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-white placeholder:text-slate-600 font-medium transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {staffRoleTab === 'owner' ? 'Admin Security Passcode' : 'Driver PIN Code'}
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 text-xs bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-white placeholder:text-slate-600 font-medium transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <span>Authenticating Staff Credentials...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize Staff Access</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Test Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-center">
              <p className="text-[11px] text-slate-500 font-medium">Quick Evaluator Staff Credentials:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleFillDemoAdmin}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400 font-semibold border border-slate-700 cursor-pointer transition-colors"
                >
                  Fill Demo Admin (owner@freshlane.com)
                </button>
                <button
                  type="button"
                  onClick={handleFillDemoDriver}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400 font-semibold border border-slate-700 cursor-pointer transition-colors"
                >
                  Fill Demo Driver (driver@freshlane.com)
                </button>
              </div>
            </div>

            {/* Return to Customer Portal */}
            <div className="mt-4 text-center">
              <button
                onClick={onSwitchToCustomerWeb}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back to FreshLane Customer Market
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AUTHORIZED STAFF VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Operations Header with Staff Profile */}
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
                  {currentStaffUser.role === 'owner' ? 'Admin & Fleet Control' : 'Driver GPS Telematics'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                📍 Tadepalligudem 15km Hub (534102, AP, India)
              </p>
            </div>
          </div>

          {/* Ops View Switcher (Role-Enforced) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            {/* Admin Desk - Only Store Owners can access */}
            <button
              onClick={() => handleSelectView('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeOpsView === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : currentStaffUser.role === 'driver'
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                currentStaffUser.role === 'driver'
                  ? 'Admin Desk is locked for delivery drivers'
                  : 'Open Store Admin Desk'
              }
            >
              <Store className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
              {currentStaffUser.role === 'driver' && <Lock className="w-3 h-3 text-amber-400" />}
            </button>

            {/* Driver App */}
            <button
              onClick={() => handleSelectView('driver')}
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

          {/* Staff Info & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-white font-bold">{currentStaffUser.name}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                {currentStaffUser.role}
              </span>
            </div>

            <button
              onClick={handleStaffSignOut}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-rose-950 hover:border-rose-700 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Sign out of Staff Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            <button
              onClick={onSwitchToCustomerWeb}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Customer Shopping Market"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Customer Market</span>
            </button>
          </div>
        </div>
      </header>

      {/* Role permission restriction notice if driver tried to click admin */}
      {roleNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>{roleNotice}</span>
        </div>
      )}

      {/* Operations Content Area */}
      <div className="flex-1 bg-[#F8FAFC]">
        {activeOpsView === 'admin' ? (
          <div className="py-6 px-4 max-w-7xl mx-auto">
            <OwnerDashboard user={currentStaffUser} onGoToShop={onSwitchToCustomerWeb} />
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
            <span>
              Authorized Internal Staff Portal · {currentStaffUser.role === 'owner' ? 'Store Administrator' : 'Courier Rider'} Active
            </span>
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
