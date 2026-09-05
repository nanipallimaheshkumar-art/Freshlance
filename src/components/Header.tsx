import React from 'react';
import { ShoppingBag, User, LogOut, Store, Search, Clock, Package, CheckCircle2, Bike, Navigation, Lock, ShieldCheck, Zap } from 'lucide-react';
import { UserAccount } from '../types';
import { useFreeDeliveryPromotion } from '../utils/freeDeliveryPromo';

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
  onOpenContact,
  onNavigateToPortal,
}) => {
  const { isFreeDeliveryActive, formattedTime } = useFreeDeliveryPromotion();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top express banner with quick portal entry */}
      <div className={`${isFreeDeliveryActive ? 'bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-emerald-100' : 'bg-slate-900 text-slate-300'} text-[11px] sm:text-xs font-medium py-1.5 px-3 sm:px-4 transition-colors`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            {isFreeDeliveryActive ? (
              <>
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-slate-950 text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse">
                  ⚡ FLASH
                </span>
                <span className="text-white font-semibold truncate text-[11px] sm:text-xs">
                  FREE DELIVERY!
                </span>
                <span className="bg-emerald-400/20 text-emerald-300 font-mono font-bold text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border border-emerald-400/30 shrink-0">
                  ⏳ {formattedTime}
                </span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate text-[11px] sm:text-xs">⚡ Express in <strong className="text-white font-semibold">24–30 min</strong></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-slate-300 text-[10px] sm:text-[11px] shrink-0">
            <span className="hidden md:inline text-emerald-400 font-medium">📍 Tadepalligudem (534102)</span>
            {onNavigateToPortal && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:border-l border-slate-700">
                <button
                  onClick={() => onNavigateToPortal('/delivery')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Delivery Partner Login"
                >
                  <Bike className="w-3 h-3" />
                  <span className="hidden sm:inline">Driver Login</span>
                  <span className="sm:hidden">Driver</span>
                </button>
                <span className="text-slate-600">·</span>
                <button
                  onClick={() => onNavigateToPortal('/admin')}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Store Admin Login"
                >
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Admin Login</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <button
          onClick={() => {
            setCurrentTab('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 text-left cursor-pointer group shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-transform group-hover:scale-105">
            ✦
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
              freshlane
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                market
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none -mt-0.5 hidden xs:block">30-min farm to door</p>
          </div>
        </button>

        {/* Center Search (desktop) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search fruits, leafy bundles, boxes (e.g. pomegranate, dragon fruit, spinach)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentTab !== 'shop') setCurrentTab('shop');
              }}
              className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Customer Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              setCurrentTab('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hidden sm:inline-flex px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              currentTab === 'shop' && !searchQuery
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => {
              setCurrentTab('shop');
            }}
            className={`hidden md:inline-flex px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              currentTab === 'shop' && searchQuery
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Shop
          </button>

          {/* Customer Order History */}
          <button
            onClick={() => setCurrentTab('orders')}
            className={`hidden sm:inline-flex px-2.5 sm:px-3 py-2 text-xs font-bold rounded-xl items-center gap-1.5 transition-all cursor-pointer ${
              currentTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>

          {/* Customer Contact Link */}
          <button
            onClick={() => {
              if (onOpenContact) {
                onOpenContact();
              } else {
                const footer = document.querySelector('footer');
                footer?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hidden md:inline-flex px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Contact
          </button>

          {/* Customer Order Live Tracking (when on tracking tab or tracking an active order) */}
          {currentTab === 'tracking' && (
            <button
              onClick={() => setCurrentTab('tracking')}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 text-white shadow-xs"
              title="Track Your Order Live GPS"
            >
              <Navigation className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Tracking</span>
            </button>
          )}

          {/* User Profile / Customer Auth links */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 pl-1.5 sm:pl-2 pr-1 sm:pr-1.5 py-1 rounded-xl border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-bold text-slate-800 leading-tight max-w-[85px] truncate">
                  {user.name.split(' ')[0]}
                </p>
                <p className="text-[9px] text-slate-500 font-semibold uppercase leading-none">
                  {user.role}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-slate-200/60 cursor-pointer ml-0.5 sm:ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentTab('login')}
                className={`px-2 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                  currentTab === 'login'
                    ? 'text-emerald-700 bg-emerald-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
              <button
                onClick={() => setCurrentTab('register')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer hidden xs:inline-flex ${
                  currentTab === 'register'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Join</span>
              </button>
            </div>
          )}

          {/* Cart Icon Button */}
          <button
            onClick={openCart}
            aria-label="View Fresh Bag"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 flex items-center justify-center text-slate-700 hover:text-emerald-600 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center border-2 border-white shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search bar if on shop */}
      <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search produce, leafy bundles, boxes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentTab !== 'shop') setCurrentTab('shop');
            }}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>
    </header>
  );
};
