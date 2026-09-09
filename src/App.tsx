import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, Clock, Navigation, User as UserIcon, Bike, Store, ShieldCheck, LogOut } from 'lucide-react';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { OrderHistory } from './components/OrderHistory';
import { LoginPage } from './components/LoginPage';
import { CreateAccountPage } from './components/CreateAccountPage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { LiveTrackingView } from './components/LiveTrackingView';
import { OperationsPortal } from './components/OperationsPortal';
import { DeliveryPortal } from './components/DeliveryPortal';
import { PortalLoginPage } from './components/PortalLoginPage';
import { ContactModal } from './components/ContactModal';
import { UserAccount, CartItem, ProduceItem } from './types';
import { getCurrentSession, clearCurrentSession } from './utils/authStore';
import { evaluateRouteGuard, parseCurrentRoute, normalizeRole, AppRole } from './utils/rbac';
import { initCatalogSync, subscribeProduceCatalog } from './utils/produceStore';

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => getCurrentSession());
  const [activeWeb, setActiveWeb] = useState<'customer' | 'admin' | 'delivery'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const initialRoute = parseCurrentRoute(path, hash);
      if (initialRoute === 'delivery') return 'delivery';
      if (initialRoute === 'admin') return 'admin';
    }
    return 'customer';
  });

  const [portalLoginError, setPortalLoginError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'shop' | 'orders' | 'tracking' | 'login' | 'register'>('shop');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('FL-91428');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('freshlane_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<ProduceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3500);
  };

  // Real-time catalog multi-device sync and cart auto-recalculation
  useEffect(() => {
    // 1. Initialize active polling & inactive device resume handlers
    const cleanupSync = initCatalogSync();

    // 2. Synchronize active shopping cart if any price/item changes
    const cleanupSubscribe = subscribeProduceCatalog((latestCatalog) => {
      setCartItems((prevCart) => {
        if (!prevCart || prevCart.length === 0) return prevCart;
        let hasChanges = false;
        const updated = prevCart.map((cartItem) => {
          const itemId = cartItem.id || (cartItem as any).produce?.id;
          if (!itemId) return cartItem;
          const matching = latestCatalog.find((p) => p.id === itemId);
          if (matching && (matching.price !== cartItem.price || matching.name !== cartItem.name)) {
            hasChanges = true;
            return {
              ...cartItem,
              id: matching.id,
              name: matching.name,
              price: matching.price,
              unit: matching.unit || cartItem.unit,
            };
          }
          return cartItem;
        });

        if (hasChanges) {
          try {
            localStorage.setItem('freshlane_cart', JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prevCart;
      });
    });

    return () => {
      cleanupSync();
      cleanupSubscribe();
    };
  }, []);

  // Centralized route navigation handler with strict RBAC Route Guard enforcement
  const navigateToRoute = (targetPath: string) => {
    setPortalLoginError(null);
    const role = normalizeRole(user?.role);
    const targetRoute = parseCurrentRoute(targetPath, '');

    // 1. Delivery Route
    if (targetRoute === 'delivery') {
      if (!user) {
        // Unauthenticated -> Show dedicated Delivery Partner Login
        setActiveWeb('delivery');
        try {
          window.history.pushState({}, '', '/delivery');
        } catch {}
        return;
      }
      if (role === 'delivery_partner' || role === 'admin') {
        setActiveWeb('delivery');
        try {
          window.history.pushState({}, '', '/delivery');
        } catch {}
        return;
      }
      // Logged in as customer -> Access Denied
      showToast('Access Denied: You do not have permission to access this portal.');
      setPortalLoginError('Access Denied: You do not have permission to access this portal.');
      setActiveWeb('delivery');
      return;
    }

    // 2. Admin Route
    if (targetRoute === 'admin') {
      if (!user) {
        // Unauthenticated -> Show dedicated Admin Portal Login
        setActiveWeb('admin');
        try {
          window.history.pushState({}, '', '/admin');
        } catch {}
        return;
      }
      if (role === 'admin') {
        setActiveWeb('admin');
        try {
          window.history.pushState({}, '', '/admin');
        } catch {}
        return;
      }
      // Logged in as customer or delivery_partner -> Access Denied
      showToast('Access Denied: You do not have permission to access this portal.');
      setPortalLoginError('Access Denied: You do not have permission to access this portal.');
      setActiveWeb('admin');
      return;
    }

    // 3. Customer Routes
    const guard = evaluateRouteGuard(role, targetRoute);
    if (!guard.allowed) {
      if (guard.notificationMessage) {
        showToast(guard.notificationMessage);
      }
      if (guard.redirectTo === '/delivery') {
        setActiveWeb('delivery');
        try {
          window.history.pushState({}, '', '/delivery');
        } catch {}
      } else if (guard.redirectTo === '/login') {
        // Enforce checkout route guard: Save return URL and route to login
        sessionStorage.setItem('freshlane_return_url', '/checkout');
        setActiveWeb('customer');
        setCurrentTab('login');
        setIsCheckoutOpen(false);
        try {
          window.history.pushState({}, '', '/login');
        } catch {}
      } else {
        sessionStorage.setItem('freshlane_return_url', targetPath);
        setActiveWeb('customer');
        setCurrentTab('login');
        try {
          window.history.pushState({}, '', '/login');
        } catch {}
      }
      return;
    }

    if (targetRoute === 'login') {
      setActiveWeb('customer');
      setCurrentTab('login');
      try {
        window.history.pushState({}, '', '/login');
      } catch {}
    } else if (targetRoute === 'checkout') {
      if (!user) {
        sessionStorage.setItem('freshlane_return_url', '/checkout');
        setActiveWeb('customer');
        setCurrentTab('login');
        showToast('Please log in with OTP to access checkout.');
        try {
          window.history.pushState({}, '', '/login');
        } catch {}
        return;
      }
      setActiveWeb('customer');
      setIsCheckoutOpen(true);
    } else {
      setActiveWeb('customer');
      setCurrentTab('shop');
      try {
        window.history.pushState({}, '', '/');
      } catch {}
    }
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('freshlane_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Support switching routes via browser back/forward or hash
  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const targetRoute = parseCurrentRoute(path, hash);

      if (targetRoute === 'delivery') {
        setActiveWeb('delivery');
        return;
      }

      if (targetRoute === 'admin') {
        setActiveWeb('admin');
        return;
      }

      // Customer routes
      setActiveWeb('customer');
      if (targetRoute === 'login') {
        setCurrentTab('login');
      } else if (targetRoute === 'checkout') {
        if (!user) {
          sessionStorage.setItem('freshlane_return_url', '/checkout');
          setCurrentTab('login');
          return;
        }
        setIsCheckoutOpen(true);
      } else {
        setCurrentTab('shop');
        setIsCheckoutOpen(false);
      }
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [user]);

  // Auth event listener
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setUser(e.detail);
    };
    window.addEventListener('freshlane-auth-change', handleAuthChange);
    return () => window.removeEventListener('freshlane-auth-change', handleAuthChange);
  }, []);

  const handleAddToCart = (
    item: { id: string; name: string; price: number; unit: string; image: string },
    qty = 1
  ) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + qty } : p
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          unit: item.unit,
          image: item.image,
          qty,
        },
      ];
    });
    showToast(`Added ${qty} ${item.unit || 'unit'} of ${item.name} to fresh bag!`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed item from fresh bag.');
  };

  const handleLogout = () => {
    clearCurrentSession();
    setUser(null);
    setPortalLoginError(null);
    showToast('Signed out of FreshLane.');
    setActiveWeb('customer');
    setCurrentTab('login');
    try {
      window.history.pushState({}, '', '/login');
    } catch {}
  };

  const handleCustomerLoginSuccess = (signedInUser: UserAccount) => {
    setUser(signedInUser);
    showToast(`Welcome back, ${signedInUser.name.split(' ')[0]}!`);

    // Seamless UX: Return to checkout if customer was forced to log in
    const returnUrl = sessionStorage.getItem('freshlane_return_url');
    if (
      returnUrl === '/checkout' ||
      returnUrl === '/payment' ||
      returnUrl === 'checkout' ||
      returnUrl === 'payment'
    ) {
      sessionStorage.removeItem('freshlane_return_url');
      setCurrentTab('shop');
      setIsCheckoutOpen(true);
      try {
        window.history.pushState({}, '', '/checkout');
      } catch {}
      return;
    }

    setCurrentTab('shop');
    try {
      window.history.pushState({}, '', '/');
    } catch {}
  };

  const handlePortalLoginSuccess = (signedInUser: UserAccount) => {
    setUser(signedInUser);
    setPortalLoginError(null);
    showToast(`Access Granted: Welcome ${signedInUser.name} (${signedInUser.role})`);
  };

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUser(newUser);
    showToast(`Account created! Welcome to FreshLane, ${newUser.name.split(' ')[0]}!`);

    // Seamless UX: Return to checkout if customer registered during checkout flow
    const returnUrl = sessionStorage.getItem('freshlane_return_url');
    if (
      returnUrl === '/checkout' ||
      returnUrl === '/payment' ||
      returnUrl === 'checkout' ||
      returnUrl === 'payment'
    ) {
      sessionStorage.removeItem('freshlane_return_url');
      setCurrentTab('shop');
      setIsCheckoutOpen(true);
      try {
        window.history.pushState({}, '', '/checkout');
      } catch {}
      return;
    }

    setCurrentTab('shop');
    try {
      window.history.pushState({}, '', '/');
    } catch {}
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const renderPortalSwitcherBar = () => (
    <div className="w-full bg-slate-950 text-slate-300 text-xs px-3 sm:px-4 py-1.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-2 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-bold text-[11px] sm:text-xs">FreshLane Multi-Portal</span>
        <span className="text-slate-400 text-[10px] hidden md:inline">· Active Live Sync</span>
      </div>
      <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveWeb('customer');
            setCurrentTab('shop');
            try { window.history.pushState({}, '', '/'); } catch {}
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeWeb === 'customer'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Customer Store</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveWeb('admin');
            try { window.history.pushState({}, '', '/admin'); } catch {}
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeWeb === 'admin'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin Ops</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveWeb('delivery');
            try { window.history.pushState({}, '', '/delivery'); } catch {}
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeWeb === 'delivery'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Delivery Hub</span>
        </button>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            <strong className="text-slate-200">{user.name}</strong> ({user.role})
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Sign out and reset session"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // 1. DELIVERY PORTAL ROUTING (/delivery)
  // ---------------------------------------------------------------------------
  if (activeWeb === 'delivery') {
    const role = normalizeRole(user?.role);
    const isAuthorized = role === 'delivery_partner' || role === 'admin';

    // Real Login Protection: require authentication & database role check
    if (!user || !isAuthorized) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
          {renderPortalSwitcherBar()}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <PortalLoginPage
              portalType="delivery"
              initialError={portalLoginError}
              onLoginSuccess={handlePortalLoginSuccess}
              onBackToShop={() => navigateToRoute('/')}
            />
          </div>
        </div>
      );
    }

    // Authenticated delivery partner or admin
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        {renderPortalSwitcherBar()}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        <DeliveryPortal
          user={user}
          onBackToShop={() => {
            setActiveWeb('customer');
            setCurrentTab('shop');
            try {
              window.history.pushState({}, '', '/');
            } catch {}
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ADMIN DASHBOARD ROUTING (/admin)
  // ---------------------------------------------------------------------------
  if (activeWeb === 'admin') {
    const role = normalizeRole(user?.role);
    const isAuthorized = role === 'admin';

    // Real Login Protection: require authentication & database role check
    if (!user || !isAuthorized) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
          {renderPortalSwitcherBar()}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <PortalLoginPage
              portalType="admin"
              initialError={portalLoginError}
              onLoginSuccess={handlePortalLoginSuccess}
              onBackToShop={() => navigateToRoute('/')}
            />
          </div>
        </div>
      );
    }

    // Authenticated Admin (Master Key)
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        {renderPortalSwitcherBar()}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        <OperationsPortal
          user={user}
          defaultSubApp="admin"
          onSwitchToCustomerWeb={() => navigateToRoute('/')}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. CUSTOMER STOREFRONT (Full access to all produce & features)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {renderPortalSwitcherBar()}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Customer Header: Clean, Customer-Focused Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        user={user}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenContact={() => setIsContactOpen(true)}
        onNavigateToPortal={(path) => navigateToRoute(path)}
      />

      {/* Customer View Router */}
      <main className="flex-1 pb-20 sm:pb-0">
        {currentTab === 'shop' && (
          <Storefront
            onAddToCart={handleAddToCart}
            onSelectProduct={(p) => setInspectingProduct(p)}
            onGoToOrderHistory={() => setCurrentTab('orders')}
            searchQuery={searchQuery}
          />
        )}

        {currentTab === 'orders' && (
          <OrderHistory
            user={user}
            onGoToShop={() => setCurrentTab('shop')}
            onReorder={(items) => {
              setCartItems(items);
              setIsCartOpen(true);
              showToast('Added items from past order into your fresh bag!');
            }}
            onOpenLiveTracking={(id) => {
              setActiveTrackingOrderId(id);
              setCurrentTab('tracking');
            }}
          />
        )}

        {currentTab === 'tracking' && (
          <LiveTrackingView
            orderId={activeTrackingOrderId}
            onBackToOrders={() => setCurrentTab('orders')}
            onGoToShop={() => setCurrentTab('shop')}
          />
        )}

        {currentTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleCustomerLoginSuccess}
            onGoToRegister={() => setCurrentTab('register')}
            onGoToShop={() => setCurrentTab('shop')}
            onOpenOperationsPortal={() => navigateToRoute('/admin')}
          />
        )}

        {currentTab === 'register' && (
          <CreateAccountPage
            onRegisterSuccess={handleRegisterSuccess}
            onGoToLogin={() => setCurrentTab('login')}
            onGoToShop={() => setCurrentTab('shop')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 px-4 mt-16 border-t border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-bold text-white tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-black shadow-xs">
                ✦
              </span>
              <span>freshlane market</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Tadepalligudem's premier instant fresh produce service. Harvested at dawn from local Andhra farms, quality checked, and delivered to your doorstep in 24–30 minutes.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Quick Links</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Fresh Veggies &amp; Fruits
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentTab('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Combo Fresh Boxes
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('orders')}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Track Past Orders
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="hover:text-white cursor-pointer transition-colors"
                >
                  Contact Helpdesk
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Customer &amp; Account</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <button onClick={() => setCurrentTab('login')} className="hover:text-white cursor-pointer transition-colors">
                  Customer Sign In
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('register')} className="hover:text-white cursor-pointer font-semibold text-white transition-colors">
                  Customer Registration
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('orders')} className="hover:text-white cursor-pointer transition-colors">
                  Order History &amp; Receipts
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Delivery Zones (India 🇮🇳)</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              KN Road · Subba Rao Peta · Pentapadu · Housing Board Colony · Prathipadu · Tadepalligudem Hub (534102, Andhra Pradesh, India).
            </p>
            <p className="text-[11px] text-emerald-400 font-medium pt-1">
              ⚡ 15 km Radius Strict Hub Restriction
            </p>
          </div>
        </div>

        {/* Bottom Footer Bar with Subtle Clean Portal Links */}
        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <div>© 2026 FreshLane Produce Market. All rights reserved.</div>

          {/* Subtle clean portal links in footer */}
          <div className="flex items-center gap-3 text-slate-500 font-medium text-[11px]">
            <button
              onClick={() => navigateToRoute('/delivery')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Delivery Partner Login
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => navigateToRoute('/admin')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Admin Access
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <button
              onClick={() => setIsContactOpen(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Contact Support
            </button>
            <span className="hover:text-slate-300">Fresh Guarantee</span>
            <span className="hover:text-slate-300">Privacy</span>
          </div>
        </div>
      </footer>

      {/* Cart Drawer Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        user={user}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onPromptLogin={() => {
          setIsCartOpen(false);
          setCurrentTab('login');
          showToast('Please log in with OTP to proceed to checkout.');
          try {
            window.history.pushState({}, '', '/login');
          } catch {}
        }}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Razorpay & Resend OTP Checkout Guard */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        user={user}
        onUserLoggedIn={(loggedInUser) => {
          setUser(loggedInUser);
          showToast(`Welcome back, ${loggedInUser.name.split(' ')[0]}!`);
        }}
        onOrderPlaced={(orderData) => {
          showToast(`Order #${orderData.id} placed successfully!`);
          setCartItems([]);
        }}
        onGoToOrderHistory={() => {
          setIsCheckoutOpen(false);
          setCurrentTab('orders');
        }}
        onTrackOrder={(id) => {
          setIsCheckoutOpen(false);
          setActiveTrackingOrderId(id);
          setCurrentTab('tracking');
        }}
        onClearCart={() => setCartItems([])}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={inspectingProduct}
        onClose={() => setInspectingProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Customer Contact Support Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Mobile Phone Bottom Navigation Bar (Active on phone devices: sm:hidden) */}
      <nav aria-label="Mobile Navigation" className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-xl">
        <button
          onClick={() => {
            setCurrentTab('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
            currentTab === 'shop' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>Shop</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('orders');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
            currentTab === 'orders' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 mb-0.5" />
          <span>Orders</span>
        </button>

        {activeTrackingOrderId ? (
          <button
            onClick={() => {
              setCurrentTab('tracking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
              currentTab === 'tracking' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-4 h-4 mb-0.5 text-emerald-600 animate-pulse" />
            <span className="text-emerald-700">Track</span>
          </button>
        ) : null}

        <button
          onClick={() => {
            if (user) {
              setCurrentTab('orders');
            } else {
              setCurrentTab('login');
            }
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
            currentTab === 'login' || currentTab === 'register' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4 mb-0.5" />
          <span>{user ? user.name.split(' ')[0] : 'Account'}</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold text-slate-700 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center border border-white">
                {totalCartCount}
              </span>
            )}
          </div>
          <span>Bag</span>
        </button>
      </nav>
    </div>
  );
}
