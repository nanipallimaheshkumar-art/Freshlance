import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, Sparkles, Clock, ShieldCheck, Zap } from 'lucide-react';
import { CartItem } from '../types';
import { useFreeDeliveryPromotion } from '../utils/freeDeliveryPromo';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}) => {
  const { isFreeDeliveryActive, formattedTime, calculateDeliveryFee } = useFreeDeliveryPromotion();

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const grandTotal = subtotal + deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">Your Fresh Bag</h2>
              <p className="text-xs text-slate-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} selected · 30 min delivery
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Express Delivery Badge */}
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Arrives in <strong>24–30 min</strong></span>
            </span>
            <span className="text-[11px] bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold shadow-xs">
              ⚡ Live Drivers
            </span>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl border border-slate-200">
                  🧺
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">Your bag is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Add hand-picked farm fruits and vegetables or scan your produce to start filling your bag.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  Browse Fresh Produce
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-xs"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {item.unit} · ₹{item.price}
                    </p>
                    <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                      ₹{item.price * item.qty}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1">
                    <button
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-extrabold px-1.5 text-slate-800">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
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
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              {/* 15-Min Free Delivery Flash Banner */}
              {isFreeDeliveryActive && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      ⚡
                    </span>
                    <div>
                      <div className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                        <span>Free Delivery Flash Offer</span>
                        <span className="bg-emerald-200/80 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                          {formattedTime}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700">₹0 delivery charge on all orders</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
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
                    {isFreeDeliveryActive && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        15-MIN FLASH
                      </span>
                    )}
                  </span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-900'}>
                    {deliveryFee === 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="line-through text-slate-400 font-normal text-[11px]">₹35</span>
                        <span className="text-emerald-600 font-black">FREE</span>
                      </span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                {!isFreeDeliveryActive && deliveryFee > 0 && (
                  <p className="text-[10px] text-emerald-600 italic">
                    Add ₹{299 - subtotal} more for Free Delivery
                  </p>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-emerald-600">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Proceed to 30-Min Delivery Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
