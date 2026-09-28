import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ShoppingBag, Sparkles, Clock, Navigation, User as UserIcon, Bike, Store, ShieldCheck, LogOut, ExternalLink, Layers, Monitor, Smartphone, CheckCircle2, Loader2, Settings } from 'lucide-react';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { BottomProceedBar } from './components/BottomProceedBar';
import { GeminiChatLauncher } from './components/GeminiChatLauncher';
import { UserAccount, CartItem, ProduceItem } from './types';
import { getCurrentSession, clearCurrentSession } from './utils/authStore';
import { evaluateRouteGuard, parseCurrentRoute, normalizeRole, AppRole } from './utils/rbac';
import { initCatalogSync, subscribeProduceCatalog, fetchRemoteCatalog } from './utils/produceStore';
import { initTheme } from './utils/themeStore';
import { safeScrollToTop } from './utils/domUtils';

// Code-split dynamic chunks to minimize first-party entry JS bundle
const OrderHistory = lazy(() => import('./components/OrderHistory').then(m => ({ default: m.OrderHistory })));
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const CreateAccountPage = lazy(() => import('./components/CreateAccountPage').then(m => ({ default: m.CreateAccountPage })));
const CheckoutModal = lazy(() => import('./components/CheckoutModal').then(m => ({ default: m.CheckoutModal })));
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));
const LiveTrackingView = lazy(() => import('./components/LiveTrackingView').then(m => ({ default: m.LiveTrackingView })));
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const DeliveryPortal = lazy(() => import('./components/DeliveryPortal').then(m => ({ default: m.DeliveryPortal })));
const PortalLoginPage = lazy(() => import('./components/PortalLoginPage').then(m => ({ default: m.PortalLoginPage })));
const ContactModal = lazy(() => import('./components/ContactModal').then(m => ({ default: m.ContactModal })));
const WebSuiteModal = lazy(() => import('./components/WebSuiteModal').then(m => ({ default: m.WebSuiteModal })));
const GeminiChatModal = lazy(() => import('./components/GeminiChatModal').then(m => ({ default: m.GeminiChatModal })));
const NearbyMandisModal = lazy(() => import('./components/NearbyMandisModal').then(m => ({ default: m.NearbyMandisModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));

const ViewFallback: React.FC<{ message?: string; dark?: boolean }> = ({ message = 'Loading...', dark = false }) => (
  <div className={`flex-1 flex flex-col items-center justify-center min-h-[340px] p-8 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
    <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3 ${dark ? 'border-sky-400' : 'border-emerald-600'}`} />
    <p className="text-xs font-medium tracking-wide">{message}</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => getCurrentSession());
  const [activeWeb, setActiveWeb] = useState<'customer' | 'admin' | 'delivery'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const initialRoute = parseCurrentRoute(path, hash, search);
      if (initialRoute === 'delivery') return 'delivery';
      if (initialRoute === 'admin') return 'admin';
    }
    return 'customer';
  });

  const [portalLoginError, setPortalLoginError] = useState<string | null>(null);
  const [isWebSuiteModalOpen, setIsWebSuiteModalOpen] = useState(false);
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
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isNearbyMandisModalOpen, setIsNearbyMandisModalOpen] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState<ProduceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const [isProceedBarDismissed, setIsProceedBarDismissed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize theme mode (dark, light, or system preference listener)
  useEffect(() => {
    const cleanupTheme = initTheme();
    return cleanupTheme;
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3500);
  };

  // Real-time catalog multi-device sync and cart auto-recalculation
  useEffect(() => {
    // 1. Immediately fetch latest products from backend database on page load
    fetchRemoteCatalog(true);

    // 2. Initialize active polling & inactive device resume handlers
    const cleanupSync = initCatalogSync();

    // 3. Synchronize active shopping cart if any price/item changes
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

      // 3. Synchronize open product inspection modal if price or info changes
      setInspectingProduct((prev) => {
        if (!prev) return null;
        const matching = latestCatalog.find((p) => p.id === prev.id);
        return matching ? { ...prev, ...matching } : prev;
      });
    });

    return () => {
      cleanupSync();
      cleanupSubscribe();
    };
  }, []);

  // Centralized route navigation handler with single unified RBAC Route Guard enforcement
  const navigateToRoute = (targetPath: string, options?: { skipHistoryPush?: boolean }) => {
    setPortalLoginError(null);
    const role = user ? normalizeRole(user.role) : null;
    const targetRoute = parseCurrentRoute(targetPath, '');

    // Unified single evaluation
    const guard = evaluateRouteGuard(role, targetRoute);

    if (!guard.allowed) {
      if (guard.notificationMessage) {
        showToast(guard.notificationMessage);
      }
      if (guard.redirectTo === '/delivery') {
        setActiveWeb('delivery');
        if (!options?.skipHistoryPush) {
          try {
            window.history.pushState({}, '', '/delivery');
          } catch {}
        }
      } else if (guard.redirectTo === '/login') {
        sessionStorage.setItem('freshlane_return_url', targetPath);
        setActiveWeb('customer');
        setCurrentTab('login');
        setIsCheckoutOpen(false);
        if (!options?.skipHistoryPush) {
          try {
            window.history.pushState({}, '', '/login');
          } catch {}
        }
      } else {
        sessionStorage.setItem('freshlane_return_url', targetPath);
        setActiveWeb('customer');
        setCurrentTab('shop');
        setIsCheckoutOpen(false);
        if (!options?.skipHistoryPush) {
          try {
            window.history.pushState({}, '', '/');
          } catch {}
        }
      }
      return;
    }

    if (targetRoute === 'admin') {
      setActiveWeb('admin');
      if (!options?.skipHistoryPush) {
        try {
          window.history.pushState({}, '', '/admin');
        } catch {}
      }
      return;
    }

    if (targetRoute === 'delivery') {
      setActiveWeb('delivery');
      if (!options?.skipHistoryPush) {
        try {
          window.history.pushState({}, '', '/delivery');
        } catch {}
      }
      return;
    }

    if (targetRoute === 'login') {
      setActiveWeb('customer');
      setCurrentTab('login');
      setIsCheckoutOpen(false);
      if (!options?.skipHistoryPush) {
        try {
          window.history.pushState({}, '', '/login');
        } catch {}
      }
      return;
    }

    if (targetRoute === 'checkout') {
      if (!user) {
        sessionStorage.setItem('freshlane_return_url', '/checkout');
        setActiveWeb('customer');
        setCurrentTab('login');
        setIsCheckoutOpen(false);
        showToast('Please log in first to access the payment and checkout page.');
        if (!options?.skipHistoryPush) {
          try {
            window.history.pushState({}, '', '/login');
          } catch {}
        }
        return;
      }
      setActiveWeb('customer');
      setCurrentTab('shop');
      setIsCheckoutOpen(true);
      if (!options?.skipHistoryPush) {
        try {
          window.history.pushState({}, '', '/checkout');
        } catch {}
      }
      return;
    }

    // Default: storefront / shop
    setActiveWeb('customer');
    setCurrentTab('shop');
    setIsCheckoutOpen(false);
    if (!options?.skipHistoryPush) {
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

  // Unified browser back/forward and URL change listener using the single centralized router
  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const targetRoute = parseCurrentRoute(path, hash, search);
      const targetPath =
        targetRoute === 'admin'
          ? '/admin'
          : targetRoute === 'delivery'
          ? '/delivery'
          : targetRoute === 'login'
          ? '/login'
          : targetRoute === 'checkout'
          ? '/checkout'
          : '/';
      navigateToRoute(targetPath, { skipHistoryPush: true });
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [user]);

  // Strict checkout auth guard: prevent any unauthenticated access to checkout or payment
  useEffect(() => {
    if (isCheckoutOpen && !user) {
      setIsCheckoutOpen(false);
      sessionStorage.setItem('freshlane_return_url', '/checkout');
      setActiveWeb('customer');
      setCurrentTab('login');
      showToast('Please log in first to access the payment and checkout page.');
      try {
        window.history.pushState({}, '', '/login');
      } catch {}
    }
  }, [isCheckoutOpen, user]);

  // Synchronize document title to match active web
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (activeWeb === 'admin') {
        document.title = 'FreshLane Admin | Operations & Inventory Web';
      } else if (activeWeb === 'delivery') {
        document.title = 'FreshLane Delivery | Fleet Driver & Dispatch Web';
      } else {
        document.title = 'FreshLane Produce & AI Grocery Scanner';
      }
    }
  }, [activeWeb]);

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
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + qty } : p
        );
      } else {
        updated = [
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
      }
      const addedOrUpdated = updated.find((p) => p.id === item.id);
      if (addedOrUpdated) {
        setLastAddedItem(addedOrUpdated);
        setIsProceedBarDismissed(false);
      }
      return updated;
    });
    showToast(`Added ${qty} ${item.unit || 'unit'} of ${item.name} to fresh bag!`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      const matched = updated.find((p) => p.id === id);
      if (matched && delta > 0) {
        setLastAddedItem(matched);
        setIsProceedBarDismissed(false);
      } else if (updated.length === 0) {
        setLastAddedItem(null);
      } else if (lastAddedItem?.id === id) {
        setLastAddedItem(matched || updated[updated.length - 1] || null);
      }

      return updated;
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (lastAddedItem?.id === id) {
        setLastAddedItem(updated.length > 0 ? updated[updated.length - 1] : null);
      }
      return updated;
    });
    showToast('Removed item from fresh bag.');
  };

  const handleProceedFromBottomBar = () => {
    if (!user) {
      sessionStorage.setItem('freshlane_return_url', '/checkout');
      setCurrentTab('login');
      showToast('Please log in first to proceed to checkout and payment.');
      try {
        window.history.pushState({}, '', '/login');
      } catch {}
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleLogout = () => {
    clearCurrentSession();
    setUser(null);
    setPortalLoginError(null);
    setActiveWeb('customer');
    setCurrentTab('shop');
    setIsCheckoutOpen(false);
    showToast('Signed out of FreshLane.');
    try {
      window.history.pushState({}, '', '/');
    } catch {}
  };

  const handleCustomerLoginSuccess = (signedInUser: UserAccount) => {
    setUser(signedInUser);
    const role = normalizeRole(signedInUser.role);

    // If Admin: immediately transition to Admin Web without secondary prompt
    if (role === 'admin') {
      setActiveWeb('admin');
      try {
        window.history.pushState({}, '', '/admin');
      } catch {}
      showToast(`Access Granted: Welcome ${signedInUser.name} (${role})`);
      return;
    }

    // If Delivery Partner: immediately transition to Delivery Web
    if (role === 'delivery_partner') {
      setActiveWeb('delivery');
      try {
        window.history.pushState({}, '', '/delivery');
      } catch {}
      showToast(`Access Granted: Welcome ${signedInUser.name} (${role})`);
      return;
    }

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
    const role = normalizeRole(signedInUser.role);

    if (role === 'admin') {
      setActiveWeb('admin');
      try {
        window.history.pushState({}, '', '/admin');
      } catch {}
    } else if (role === 'delivery_partner') {
      setActiveWeb('delivery');
      try {
        window.history.pushState({}, '', '/delivery');
      } catch {}
    } else {
      setActiveWeb('customer');
      try {
        window.history.pushState({}, '', '/');
      } catch {}
    }

    showToast(`Access Granted: Welcome ${signedInUser.name} (${role})`);
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
  const totalCartAmount = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const renderPortalSwitcherBar = () => {
    return (
      <div className="hidden sm:block w-full bg-[#040e0a] border-b border-emerald-900/40 px-3 sm:px-6 py-1.5 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1 rounded-[32px] bg-[#091b15] hover:bg-[#0f2c22] text-slate-200 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-800/50 hover:border-emerald-500/60 transition-all cursor-pointer shadow-xs"
            title="Settings & Display Modes"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () =>
    isSettingsOpen ? (
      <Suspense fallback={null}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onClearCart={() => setCartItems([])}
          onShowToast={showToast}
        />
      </Suspense>
    ) : null;

  // ---------------------------------------------------------------------------
  // 1. DELIVERY PORTAL ROUTING (/delivery)
  // ---------------------------------------------------------------------------
  if (activeWeb === 'delivery') {
    const role = normalizeRole(user?.role);
    const isAuthorized = role === 'delivery_partner' || role === 'admin';

    // Real Login Protection: require authentication & database role check
    if (!user || !isAuthorized) {
      return (
        <div className="min-h-screen bg-[#06120e] text-slate-100 flex flex-col font-sans">
          {renderPortalSwitcherBar()}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#091b15] text-white text-xs font-semibold px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2.5 border border-emerald-500/30 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <Suspense fallback={<ViewFallback message="Loading delivery login..." dark />}>
              <PortalLoginPage
                portalType="delivery"
                initialError={portalLoginError}
                onLoginSuccess={handlePortalLoginSuccess}
                onBackToShop={() => navigateToRoute('/')}
                onSwitchPortal={(target) => navigateToRoute(`/${target}`)}
              />
            </Suspense>
          </div>
          {isWebSuiteModalOpen && (
            <Suspense fallback={null}>
              <WebSuiteModal
                isOpen={isWebSuiteModalOpen}
                onClose={() => setIsWebSuiteModalOpen(false)}
                activeWeb={activeWeb}
                onSelectWeb={(web) => {
                  if (web === 'admin') navigateToRoute('/admin');
                  else if (web === 'delivery') navigateToRoute('/delivery');
                  else navigateToRoute('/');
                }}
                user={user}
              />
            </Suspense>
          )}
          {renderSettingsModal()}
        </div>
      );
    }

    // Authenticated delivery partner or admin
    return (
      <div className="min-h-screen bg-[#06120e] text-slate-100 flex flex-col font-sans">
        {renderPortalSwitcherBar()}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#091b15] text-white text-xs font-semibold px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2.5 border border-sky-500/30 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        <Suspense fallback={<ViewFallback message="Loading delivery dispatch hub..." dark />}>
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
        </Suspense>
        {isWebSuiteModalOpen && (
          <Suspense fallback={null}>
            <WebSuiteModal
              isOpen={isWebSuiteModalOpen}
              onClose={() => setIsWebSuiteModalOpen(false)}
              activeWeb={activeWeb}
              onSelectWeb={(web) => {
                if (web === 'admin') navigateToRoute('/admin');
                else if (web === 'delivery') navigateToRoute('/delivery');
                else navigateToRoute('/');
              }}
              user={user}
            />
          </Suspense>
        )}
        {renderSettingsModal()}
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
            <Suspense fallback={<ViewFallback message="Loading admin login..." dark />}>
              <PortalLoginPage
                portalType="admin"
                initialError={portalLoginError}
                onLoginSuccess={handlePortalLoginSuccess}
                onBackToShop={() => navigateToRoute('/')}
                onSwitchPortal={(target) => navigateToRoute(`/${target}`)}
              />
            </Suspense>
          </div>
          {isWebSuiteModalOpen && (
            <Suspense fallback={null}>
              <WebSuiteModal
                isOpen={isWebSuiteModalOpen}
                onClose={() => setIsWebSuiteModalOpen(false)}
                activeWeb={activeWeb}
                onSelectWeb={(web) => {
                  if (web === 'admin') navigateToRoute('/admin');
                  else if (web === 'delivery') navigateToRoute('/delivery');
                  else navigateToRoute('/');
                }}
                user={user}
              />
            </Suspense>
          )}
          {renderSettingsModal()}
        </div>
      );
    }

    // Authenticated Admin (Master Key) -> Full Merchant Operations Web
    return (
      <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-900">
        {renderPortalSwitcherBar()}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#091b15] text-white text-xs font-semibold px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2.5 border border-amber-500/30 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="flex-1">
          <Suspense fallback={<ViewFallback message="Loading merchant dashboard..." />}>
            <OwnerDashboard
              user={user}
              onGoToShop={() => navigateToRoute('/')}
            />
          </Suspense>
        </div>
        {isWebSuiteModalOpen && (
          <Suspense fallback={null}>
            <WebSuiteModal
              isOpen={isWebSuiteModalOpen}
              onClose={() => setIsWebSuiteModalOpen(false)}
              activeWeb={activeWeb}
              onSelectWeb={(web) => {
                if (web === 'admin') navigateToRoute('/admin');
                else if (web === 'delivery') navigateToRoute('/delivery');
                else navigateToRoute('/');
              }}
              user={user}
            />
          </Suspense>
        )}
        {renderSettingsModal()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. CUSTOMER STOREFRONT (Full access to all produce & features)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#091b15] text-white text-xs font-semibold px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2.5 border border-emerald-500/30 animate-fade-in">
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
        onOpenAiChat={() => setIsAiChatOpen(true)}
        onOpenNearbyMandis={() => setIsNearbyMandisModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Customer View Router */}
      <main className="flex-1 pb-20 sm:pb-0">
        {currentTab === 'shop' && (
          <Storefront
            onAddToCart={handleAddToCart}
            onUpdateQty={handleUpdateQty}
            onSelectProduct={(p) => setInspectingProduct(p)}
            onGoToOrderHistory={() => setCurrentTab('orders')}
            searchQuery={searchQuery}
            onOpenAiChat={() => setIsAiChatOpen(true)}
            onOpenNearbyMandis={() => setIsNearbyMandisModalOpen(true)}
            cartItems={cartItems}
          />
        )}

        {currentTab === 'orders' && (
          <Suspense fallback={<ViewFallback message="Loading your orders..." />}>
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
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </Suspense>
        )}

        {currentTab === 'tracking' && (
          <Suspense fallback={<ViewFallback message="Connecting to live delivery route..." />}>
            <LiveTrackingView
              orderId={activeTrackingOrderId}
              onBackToOrders={() => setCurrentTab('orders')}
              onGoToShop={() => setCurrentTab('shop')}
            />
          </Suspense>
        )}

        {currentTab === 'login' && (
          <Suspense fallback={<ViewFallback message="Loading customer sign in..." />}>
            <LoginPage
              onLoginSuccess={handleCustomerLoginSuccess}
              onGoToRegister={() => setCurrentTab('register')}
              onGoToShop={() => setCurrentTab('shop')}
              onOpenOperationsPortal={() => navigateToRoute('/admin')}
            />
          </Suspense>
        )}

        {currentTab === 'register' && (
          <Suspense fallback={<ViewFallback message="Loading account registration..." />}>
            <CreateAccountPage
              onRegisterSuccess={handleRegisterSuccess}
              onGoToLogin={() => setCurrentTab('login')}
              onGoToShop={() => setCurrentTab('shop')}
            />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#081813] via-[#05110d] to-[#030907] text-slate-300 py-14 px-4 mt-16 border-t border-emerald-900/40 shadow-2xl">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xl font-bold text-white tracking-tight">
              <span className="w-8 h-8 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center text-sm font-black shadow-md">
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
                    safeScrollToTop();
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
                    safeScrollToTop();
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
              <li>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <span>Display Modes (Dark / Light / System)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded-[12px] bg-emerald-900/60 text-emerald-300 font-mono">
                    3 Modes
                  </span>
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
          sessionStorage.setItem('freshlane_return_url', '/checkout');
          setIsCartOpen(false);
          setCurrentTab('login');
          showToast('Please log in first to access the payment and checkout page.');
          try {
            window.history.pushState({}, '', '/login');
          } catch {}
        }}
        onCheckout={() => {
          if (!user) {
            sessionStorage.setItem('freshlane_return_url', '/checkout');
            setIsCartOpen(false);
            setCurrentTab('login');
            showToast('Please log in first to access the payment and checkout page.');
            try {
              window.history.pushState({}, '', '/login');
            } catch {}
            return;
          }
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Razorpay */}
      {isCheckoutOpen && user && (
        <Suspense fallback={null}>
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            items={cartItems}
            user={user}
            onOpenLogin={() => {
              setIsCheckoutOpen(false);
              sessionStorage.setItem('freshlane_return_url', '/checkout');
              setCurrentTab('login');
              showToast('Please log in first to access the payment and checkout page.');
              try {
                window.history.pushState({}, '', '/login');
              } catch {}
            }}
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
        </Suspense>
      )}

      {/* Product Detail Modal */}
      {inspectingProduct && (
        <Suspense fallback={null}>
          <ProductDetailModal
            product={inspectingProduct}
            onClose={() => setInspectingProduct(null)}
            onAddToCart={handleAddToCart}
          />
        </Suspense>
      )}

      {/* Customer Contact Support Modal */}
      {isContactOpen && (
        <Suspense fallback={null}>
          <ContactModal
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
          />
        </Suspense>
      )}

      {/* Web Suite Launcher Modal */}
      {isWebSuiteModalOpen && (
        <Suspense fallback={null}>
          <WebSuiteModal
            isOpen={isWebSuiteModalOpen}
            onClose={() => setIsWebSuiteModalOpen(false)}
            activeWeb={activeWeb}
            onSelectWeb={(web) => {
              if (web === 'admin') navigateToRoute('/admin');
              else if (web === 'delivery') navigateToRoute('/delivery');
              else navigateToRoute('/');
            }}
            user={user}
          />
        </Suspense>
      )}

      {/* Gemini AI Produce Sommelier Launcher Button */}
      {activeWeb === 'customer' && (
        <GeminiChatLauncher
          onClick={() => setIsAiChatOpen(true)}
          isOpen={isAiChatOpen}
        />
      )}

      {/* Gemini AI Produce Sommelier Multi-Turn Chat Modal */}
      {isAiChatOpen && (
        <Suspense fallback={null}>
          <GeminiChatModal
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            onAddToCart={(prod) => {
              handleAddToCart({
                id: prod.id,
                name: prod.name,
                price: prod.price,
                unit: prod.unit,
                image: prod.image
              });
            }}
            onInspectProduct={(prod) => setInspectingProduct(prod)}
          />
        </Suspense>
      )}

      {/* Nearby Mandis Google Maps Grounded Modal */}
      {isNearbyMandisModalOpen && (
        <Suspense fallback={null}>
          <NearbyMandisModal
            isOpen={isNearbyMandisModalOpen}
            onClose={() => setIsNearbyMandisModalOpen(false)}
            onOpenAiChat={() => setIsAiChatOpen(true)}
          />
        </Suspense>
      )}

      {/* Mobile Phone Bottom Navigation Bar (Active on phone devices: sm:hidden) */}
      <nav aria-label="Mobile Navigation" className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-xl">
        <button
          onClick={() => {
            setCurrentTab('shop');
            safeScrollToTop();
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
            if (user) {
              setCurrentTab('orders');
            } else {
              setCurrentTab('login');
            }
            safeScrollToTop();
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
            currentTab === 'orders' || currentTab === 'login' || currentTab === 'register'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          title="My Profile, Orders & Display Modes"
        >
          <UserIcon className="w-5 h-5 mb-0.5" />
          <span>{user ? user.name.split(' ')[0] : 'Profile'}</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-4 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
            totalCartCount > 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-700'
          }`}
          title="Open bag"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center border border-white animate-pulse">
                {totalCartCount}
              </span>
            )}
          </div>
          <span>Bag</span>
        </button>
      </nav>

      {/* Floating Bottom Proceed Bar for Added Item */}
      {activeWeb === 'customer' &&
        !isProceedBarDismissed &&
        (lastAddedItem || (cartItems.length > 0 ? cartItems[cartItems.length - 1] : null)) &&
        totalCartCount > 0 &&
        !isCartOpen &&
        !isCheckoutOpen && (
          <BottomProceedBar
            item={lastAddedItem || cartItems[cartItems.length - 1]}
            totalCount={totalCartCount}
            totalAmount={totalCartAmount}
            onProceed={handleProceedFromBottomBar}
            onOpenCart={() => setIsCartOpen(true)}
            onDismiss={() => setIsProceedBarDismissed(true)}
          />
        )}

      {renderSettingsModal()}
    </div>
  );
}
