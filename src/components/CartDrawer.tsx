import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, Sparkles, Clock, ShieldCheck, Zap, Lock } from 'lucide-react';
import { CartItem, UserAccount } from '../types';
import { useFreeDeliveryPromotion } from '../utils/freeDeliveryPromo';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  user?: UserAccount | null;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  onPromptLogin?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  user,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
  onPromptLogin,
}) => {
  const { isFreeDeliveryActive, formattedTime, calculateDeliveryFee } = useFreeDeliveryPromotion();

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const grandTotal = subtotal + deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const handleProceedToCheckout = () => {
    // Generate or read persistent checkout order ID
    const currentOrderId =
      (typeof window !== 'undefined' && sessionStorage.getItem('freshlane_current_order_id')) ||
      `FL-${Math.floor(100000 + Math.random() * 900000)}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('freshlane_current_order_id', currentOrderId);
    }

    if (!user) {
      // 1. Save intended destination to session storage for post-login return
      sessionStorage.setItem('freshlane_return_url', '/checkout');
      // 2. Close cart drawer
      onClose();
      // 3. Prompt user to authenticate
      if (onPromptLogin) {
        onPromptLogin();
      }
      return;
    }
    // 4. Authenticated user proceeds directly to checkout and payment
    onCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-full sm:w-[420px] max-w-full bg-white/95 backdrop-blur-2xl border-l border-emerald-900/15 shadow-2xl flex flex-col rounded-l-[32px]">
          {/* Header */}
          <div className="p-5 border-b border-emerald-900/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">Your Fresh Bag</h2>
              <p className="text-xs text-slate-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} selected · 30 min delivery
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[32px] border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Express Delivery Badge */}
          <div className="bg-emerald-50/90 px-4 py-2 border-b border-emerald-100/80 flex items-center justify-between text-xs text-emerald-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Arrives in <strong>24–30 min</strong></span>
            </span>
            <span className="text-[11px] bg-white text-emerald-700 px-2.5 py-0.5 rounded-[32px] border border-emerald-200 font-bold shadow-2xs">
              ⚡ Live Drivers
            </span>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f6faf7]/60">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-[32px] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl border border-emerald-200/80 shadow-inner">
                  🧺
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">Your bag is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Add hand-picked farm fruits and vegetables or scan your produce to start filling your bag.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-5 py-2.5 btn-unique-emerald text-white text-xs font-bold rounded-[32px] cursor-pointer shadow-md transition-all hover:scale-105"
                >
                  Browse Fresh Produce
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/95 border border-emerald-900/10 rounded-[24px] p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-[20px] object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {item.unit} · ₹{item.price}
                    </p>
                    <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                      ₹{item.price * item.qty}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[32px] p-1">
                    <button
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-[32px] bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-extrabold px-1.5 text-slate-800">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-[32px] btn-unique-emerald text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-[32px] hover:bg-rose-50 cursor-pointer transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer with Subtotal & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-emerald-900/10 bg-white/95 space-y-3">
              {/* 15-Min Free Delivery Flash Banner */}
              {isFreeDeliveryActive && (
                <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-[24px] flex items-center justify-between text-xs animate-fadeIn shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      ⚡
                    </span>
                    <div>
                      <div className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                        <span>Free Delivery Flash Offer</span>
                        <span className="bg-emerald-200/80 text-emerald-900 text-[9px] px-2 py-0.5 rounded-[32px] font-mono font-bold">
                          {formattedTime}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700">₹0 delivery charge on all orders</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-[32px] border border-emerald-300">
                    SAVE ₹35
                  </span>
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500 items-center">
                  <span className="flex items-center gap-1">
                    <span>Delivery (FreshLane Fleet)</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-[32px]">
                      FREE
                    </span>
                  </span>
                  <span className="text-emerald-600 font-bold">
                    <span className="flex items-center gap-1">
                      <span className="line-through text-slate-400 font-normal text-[11px]">₹35</span>
                      <span className="text-emerald-600 font-black">FREE (₹0)</span>
                    </span>
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold py-1.5 px-3 rounded-[32px] flex items-center gap-1 border border-emerald-200/60">
                  <span>🎉</span>
                  <span>Free 24–30 min delivery applied to your order!</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-emerald-700">₹{grandTotal}</span>
                </div>
              </div>

              <button
                id="cart-proceed-checkout-btn"
                onClick={handleProceedToCheckout}
                className="w-full py-4 px-4 btn-unique-emerald text-white font-bold text-xs rounded-[32px] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                {user ? (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign In to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {!user && (
                <p className="text-[10px] text-center text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Sign in required before payment. Your bag will be saved.</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
