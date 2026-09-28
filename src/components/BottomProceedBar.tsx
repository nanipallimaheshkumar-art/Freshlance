import React from 'react';
import { ShoppingBag, ArrowRight, X, Sparkles } from 'lucide-react';
import { CartItem } from '../types';

interface BottomProceedBarProps {
  item: CartItem | null;
  totalCount: number;
  totalAmount: number;
  onProceed: () => void;
  onOpenCart: () => void;
  onDismiss: () => void;
}

export const BottomProceedBar: React.FC<BottomProceedBarProps> = ({
  item,
  totalCount,
  totalAmount,
  onProceed,
  onOpenCart,
  onDismiss,
}) => {
  if (!item || totalCount <= 0) return null;

  return (
    <aside
      role="region"
      aria-label="Item added to cart notification and checkout shortcut"
      className="fixed z-40 left-3 right-3 sm:left-auto sm:right-6 bottom-16 sm:bottom-6 sm:max-w-md w-auto"
    >
      <div className="bg-[#071d15]/95 backdrop-blur-xl border border-emerald-500/40 text-white rounded-[28px] p-3 sm:p-3.5 shadow-2xl shadow-emerald-950/40 flex items-center justify-between gap-3 animate-fade-in ring-1 ring-white/10">
        {/* Left: Added Item Thumbnail & Details */}
        <div
          onClick={onOpenCart}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          title="Click to view full bag"
        >
          {item.image ? (
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-emerald-950 border border-emerald-500/30 shrink-0">
              <img
                src={item.image}
                alt={item.name}
                referrerPolicy="no-referrer"
                loading="lazy"
                width={44}
                height={44}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-[#071d15]">
                {item.qty}
              </span>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-emerald-200" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>Added to Bag</span>
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
              {item.name}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="font-semibold text-emerald-300">₹{item.price * item.qty}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 truncate">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} (₹{totalAmount})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Proceed Button with Symbol & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onProceed}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-[32px] btn-unique-emerald text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all group"
            title="Proceed to checkout"
          >
            <span>Proceed</span>
            <span
              aria-hidden="true"
              className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform"
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss bottom bar"
            aria-label="Dismiss bottom bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
