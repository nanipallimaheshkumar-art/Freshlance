import React, { useState } from 'react';
import { X, Plus, Minus, Star, Heart, MapPin, Scale, Clock, ShieldCheck, ShoppingBag } from 'lucide-react';
import { ProduceItem } from '../types';

interface ProductDetailModalProps {
  item: ProduceItem | null;
  onClose: () => void;
  onAddToCart: (item: ProduceItem, qty: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  const [qty, setQty] = useState(1);

  if (!item) return null;

  const isAvailable = item.isAvailableToday ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] overflow-y-auto md:overflow-hidden shadow-2xl z-10 max-h-[92vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Real Produce Photo Side */}
        <div className="md:w-1/2 relative min-h-[200px] sm:min-h-[240px] md:min-h-full bg-slate-100 shrink-0">
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {item.tag && (
            <span className="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
              {item.tag}
            </span>
          )}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white p-2.5 rounded-xl text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.origin}
            </span>
            <span className="font-bold shrink-0 ml-2">
              {isAvailable ? `${item.inStockKg} ${item.unit.includes('bundle') ? 'bundles' : 'in stock'}` : 'Sold out'}
            </span>
          </div>
        </div>

        {/* Info & Purchase Side */}
        <div className="md:w-1/2 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                {item.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{item.rating}</span>
                <span className="text-slate-400 font-normal">({item.reviewCount})</span>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {item.name}
            </h2>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">₹{item.price}</span>
              <span className="text-xs text-slate-500">per {item.unit}</span>
              {!isAvailable && (
                <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Unavailable Today
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {item.description}
            </p>

            {/* Nutrition Highlights */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Nutritional Highlights ({item.calories})</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1">
                {item.nutritionalHighlights.map((n, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Storage Tip */}
            <div className="text-[11px] text-slate-600 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
              <strong className="text-emerald-800">Freshness Tip:</strong> {item.storageTip}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">Quantity:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    disabled={!isAvailable}
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-6 h-6 rounded bg-white text-xs font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-slate-800">{qty}</span>
                  <button
                    disabled={!isAvailable}
                    onClick={() => setQty(qty + 1)}
                    className="w-6 h-6 rounded bg-white text-xs font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-slate-500">Subtotal</div>
                <div className="text-base font-extrabold text-slate-900">₹{item.price * qty}</div>
              </div>
            </div>

            <button
              disabled={!isAvailable}
              onClick={() => {
                if (isAvailable) {
                  onAddToCart(item, qty);
                  onClose();
                }
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isAvailable
                  ? `Add to Fresh Bag · ₹${item.price * qty}`
                  : 'Sold Out for Today'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
