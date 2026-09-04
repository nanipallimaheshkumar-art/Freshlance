import React, { useState, useEffect } from 'react';
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
import { UserAccount, CartItem, ProduceItem } from './types';
import { getCurrentSession, clearCurrentSession } from './utils/authStore';

export default function App() {
  const [activeWeb, setActiveWeb] = useState<'customer' | 'operations'>('customer');
  const [opsSubApp, setOpsSubApp] = useState<'admin' | 'driver'>('admin');
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
  const [inspectingProduct, setInspectingProduct] = useState<ProduceItem | null>(null);
  const [user, setUser] = useState<UserAccount | null>(getCurrentSession());
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('freshlane_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Support switching between Customer Web and Operations Web via hash or toggle
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#operations' || hash === '#ops' || hash === '#admin') {
        setActiveWeb('operations');
        setOpsSubApp('admin');
      } else if (hash === '#driver' || hash === '#fleet') {
        setActiveWeb('operations');
        setOpsSubApp('driver');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Auth event listener
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setUser(e.detail);
    };
    window.addEventListener('freshlane-auth-change', handleAuthChange);
    return () => window.removeEventListener('freshlane-auth-change', handleAuthChange);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 2800);
  };

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
    showToast('Signed out of FreshLane.');
    setCurrentTab('shop');
  };

  const handleLoginSuccess = (signedInUser: UserAccount) => {
    setUser(signedInUser);
    showToast(`Welcome back, ${signedInUser.name.split(' ')[0]}!`);
    if (signedInUser.role === 'owner') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('shop');
    }
  };

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUser(newUser);
    showToast(`Account created! Welcome to FreshLane, ${newUser.name.split(' ')[0]}!`);
    if (newUser.role === 'owner') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('shop');
    }
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Separate Admin and Driver Operations Web App
  if (activeWeb === 'operations') {
    return (
      <OperationsPortal
        user={user}
        defaultSubApp={opsSubApp}
        onSwitchToCustomerWeb={() => {
          window.location.hash = '';
          setActiveWeb('customer');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700/50 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Customer Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
        user={user}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenOperationsPortal={() => {
          window.location.hash = '#operations';
          setOpsSubApp('admin');
          setActiveWeb('operations');
        }}
      />

      {/* Customer View router */}
      <main className="flex-1">
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
            onLoginSuccess={handleLoginSuccess}
            onGoToRegister={() => setCurrentTab('register')}
            onGoToShop={() => setCurrentTab('shop')}
            onOpenOperationsPortal={() => {
              window.location.hash = '#operations';
              setOpsSubApp('admin');
              setActiveWeb('operations');
            }}
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
              <span>freshlane</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              30-minute express local market for hand-picked fruits, leafy greens in fresh bundles, and curated farm produce.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-medium">
              <span>✓ Daily Market Rates</span>
              <span>•</span>
              <span>✓ Razorpay Checkout</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Produce Market</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <button onClick={() => setCurrentTab('shop')} className="hover:text-white cursor-pointer transition-colors">
                  Sweet Fruits &amp; Pomegranates
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('shop')} className="hover:text-white cursor-pointer transition-colors">
                  Leafy Greens (Fresh Bundles)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('shop')} className="hover:text-white cursor-pointer transition-colors">
                  Exotic Dragon Fruit
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('orders')} className="hover:text-emerald-400 cursor-pointer text-emerald-400 transition-colors">
                  Track Past Orders
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
              <li className="pt-1.5 border-t border-slate-800">
                <button
                  onClick={() => {
                    window.location.hash = '#operations';
                    setOpsSubApp('admin');
                    setActiveWeb('operations');
                  }}
                  className="text-slate-400 hover:text-emerald-400 font-medium cursor-pointer transition-colors flex items-center gap-1.5 text-[11px]"
                >
                  <span>🔒 Staff Operations Portal (Restricted) ↗</span>
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

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <div>© 2026 FreshLane Produce Market. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300">Fresh Produce Guarantee</span>
            <span className="hover:text-slate-300">Privacy Policy</span>
            <span className="hover:text-slate-300">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Cart Drawer Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Razorpay */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        user={user}
        onGoToOrderHistory={() => {
          setIsCheckoutOpen(false);
          setCurrentTab('orders');
        }}
        onTrackOrder={(id) => {
          setIsCheckoutOpen(false);
          setActiveTrackingOrderId(id);
          setCurrentTab('tracking');
        }}
        onOrderPlaced={(order) => {
          setCartItems([]);
          if (order && order.id) {
            setActiveTrackingOrderId(order.id);
          }
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={inspectingProduct}
        onClose={() => setInspectingProduct(null)}
        onAddToCart={(item, qty) => handleAddToCart(item, qty)}
      />
    </div>
  );
}
