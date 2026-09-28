import React, { useState, useRef } from 'react';
import { ShoppingBag, User, Bike, Lock, ShieldCheck, MapPin, Settings, Search, ArrowLeft } from 'lucide-react';
import { UserAccount } from '../types';
import { safeScrollToTop } from '../utils/domUtils';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  currentTab: 'shop' | 'orders' | 'tracking' | 'login' | 'register';
  setCurrentTab: (tab: 'shop' | 'orders' | 'tracking' | 'login' | 'register') => void;
  cartCount: number;
  openCart: () => void;
  user: UserAccount | null;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenContact?: () => void;
  onNavigateToPortal?: (path: '/admin' | '/delivery') => void;
  onOpenAiChat?: () => void;
  onOpenNearbyMandis?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  openCart,
  user,
  onLogout,
  searchQuery,
  setSearchQuery,
  onNavigateToPortal,
  onOpenSettings,
}) => {
  const { mode } = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-40 bg-[#061510] text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.45)] border-b border-emerald-950">
      {/* ========================================================================= */}
      {/* 1. TOP BAR: Contains only a 'Settings' button aligned to the right.       */}
      {/* (Hidden on mobile screens: hidden sm:block)                               */}
      {/* ========================================================================= */}
      <div className="hidden sm:block w-full bg-[#040e0a] border-b border-emerald-900/40 px-3 sm:px-6 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-end">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1 rounded-[32px] bg-[#091b15] hover:bg-[#0f2c22] text-slate-200 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-800/50 hover:border-emerald-500/60 transition-all cursor-pointer shadow-xs group"
            title={`Settings & Display Modes (Active: ${mode.charAt(0).toUpperCase() + mode.slice(1)})`}
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            <span>Settings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 font-mono ml-0.5">
              {mode === 'dark' ? '🌙 Dark' : mode === 'light' ? '☀️ Light' : '💻 System'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MIDDLE BAR: Contains delivery info and login options only.              */}
      {/* (Hidden on mobile screens: hidden sm:block)                               */}
      {/* ========================================================================= */}
      <div className="hidden sm:block w-full bg-[#071d15] border-b border-emerald-800/30 text-emerald-100 text-xs py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Delivery info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>⚡ Express delivery in <strong className="text-white font-bold">24–30 min</strong></span>
            </div>
            <span className="text-emerald-800/70 hidden sm:inline">•</span>
            <div className="hidden xs:flex items-center gap-1 text-emerald-300 font-medium text-xs">
              <span>🎉 <strong className="text-emerald-200">FREE Delivery</strong> on all orders</span>
            </div>
            <span className="text-emerald-800/70 hidden md:inline">•</span>
            <div className="hidden md:flex items-center gap-1 text-emerald-300/90 text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tadepalligudem (534102)</span>
            </div>
          </div>

          {/* Login options only */}
          <div className="flex items-center gap-2 text-xs">
            {/* Customer login/account status and profile access */}
            {user ? (
              <div className="flex items-center gap-2 bg-[#05140e] px-2.5 py-1 rounded-[32px] border border-emerald-800/50">
                <button
                  type="button"
                  onClick={() => setCurrentTab('orders')}
                  className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-90 transition-opacity"
                  title="View Profile, Display Modes & Orders"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-200 max-w-[85px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 font-mono">
                    Profile
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[10px] text-slate-400 hover:text-rose-300 font-semibold cursor-pointer transition-colors ml-1"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentTab('login')}
                  className={`px-2.5 py-1 rounded-[32px] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    currentTab === 'login'
                      ? 'bg-emerald-800 text-white border border-emerald-600'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900/40'
                  }`}
                  title="Customer Sign In"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Customer Login</span>
                  <span className="xs:hidden">Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('orders')}
                  className={`px-2 py-1 rounded-[32px] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    currentTab === 'orders'
                      ? 'bg-emerald-800 text-white border border-emerald-600'
                      : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
                  }`}
                  title="Customer Profile, Display Modes & Orders"
                >
                  <span>Profile</span>
                </button>
              </div>
            )}

            <span className="text-emerald-900/80">|</span>

            {/* Driver Login */}
            <button
              type="button"
              onClick={() => onNavigateToPortal?.('/delivery')}
              className="px-2.5 py-1 rounded-[32px] bg-[#091f16] hover:bg-[#0e2f22] text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-emerald-700/40 transition-colors cursor-pointer"
              title="Delivery Partner Login"
            >
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Driver Login</span>
              <span className="sm:hidden">Driver</span>
            </button>

            {/* Admin Login */}
            <button
              type="button"
              onClick={() => onNavigateToPortal?.('/admin')}
              className="px-2.5 py-1 rounded-[32px] bg-[#1a1408] hover:bg-[#281f0d] text-amber-300 hover:text-amber-100 text-xs font-semibold flex items-center gap-1 border border-amber-600/40 transition-colors cursor-pointer"
              title="Store Admin Login"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM BAR: Features 'Freshlane Market' logo on the left,              */}
      {/*               a search bar, cart, and 'Mahesh ADMIN' button               */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#061610] text-white px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Freshlane Market logo on the left - Hides on mobile when search is clicked */}
          <button
            type="button"
            onClick={() => {
              setCurrentTab('shop');
              safeScrollToTop();
            }}
            className={`${
              isSearchFocused ? 'hidden sm:flex' : 'flex'
            } items-center gap-2 text-left cursor-pointer group shrink-0 rounded-[32px] py-1 px-1.5 hover:bg-emerald-900/30 transition-all`}
            title="Freshlane Market - Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center font-black text-sm shadow-md transition-transform group-hover:scale-105">
              ✦
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-tight">
                <span>Freshlane</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-[#04120c] px-2 py-0.5 rounded-[32px] shadow-xs">
                  Market
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium leading-none hidden sm:block">
                30-min farm to door
              </p>
            </div>
          </button>

          {/* Search icon and input - Expands width on mobile when search is clicked */}
          <div
            className={`flex-1 relative transition-all duration-200 ${
              isSearchFocused ? 'w-full mx-0 sm:mx-2 sm:max-w-md' : 'max-w-md mx-1 sm:mx-2'
            }`}
          >
            {/* Mobile-only back button when search is active to easily exit search */}
            {isSearchFocused && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsSearchFocused(false);
                  searchInputRef.current?.blur();
                }}
                className="sm:hidden absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-900/90 hover:bg-emerald-800 text-emerald-300 flex items-center justify-center cursor-pointer transition-colors z-10 border border-emerald-700/50"
                title="Back to home"
                aria-label="Close search"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none transition-all ${
                isSearchFocused ? 'left-9 sm:left-3.5' : 'left-3.5'
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isSearchFocused ? "Search fruits, leafy bundles, farm boxes..." : "Search fruits, leafy bundles..."}
              value={searchQuery}
              onFocus={() => {
                setIsSearchFocused(true);
                if (currentTab !== 'shop') setCurrentTab('shop');
              }}
              onClick={() => {
                setIsSearchFocused(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setIsSearchFocused(false);
                }, 180);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentTab !== 'shop') setCurrentTab('shop');
              }}
              className={`w-full h-9 sm:h-10 pr-7 text-xs bg-[#0b241b] border rounded-[32px] outline-none text-white placeholder:text-emerald-300/50 shadow-inner transition-all ${
                isSearchFocused
                  ? 'pl-15 sm:pl-9 border-emerald-400 ring-2 ring-emerald-500/20 shadow-lg'
                  : 'pl-9 border-emerald-700/40 hover:border-emerald-500/60 focus:border-emerald-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-white text-[10px] flex items-center justify-center cursor-pointer transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nav Items: Cart and 'Mahesh ADMIN' button on the far right */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Bag/Cart Button */}
            <button
              type="button"
              onClick={openCart}
              aria-label="View Fresh Bag"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-[32px] bg-[#0b241b] border border-emerald-700/40 hover:border-emerald-400 flex items-center justify-center text-emerald-200 hover:text-white transition-all cursor-pointer shadow-xs shrink-0"
              title="View Fresh Bag"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 btn-unique-emerald text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-[#061610] shadow-md animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Far Right: Button that reads 'Mahesh ADMIN' (Hidden on mobile) */}
            <button
              type="button"
              onClick={() => onNavigateToPortal?.('/admin')}
              className="hidden sm:flex px-3 sm:px-4 py-1.5 sm:py-2 rounded-[32px] bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide items-center gap-1.5 shadow-[0_2px_12px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.5)] transition-all cursor-pointer shrink-0 border border-amber-300 active:scale-95"
              title="Access Mahesh Admin Console"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Mahesh ADMIN</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
