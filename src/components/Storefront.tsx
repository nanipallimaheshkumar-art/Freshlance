import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Star,
  Clock,
  Plus,
  Minus,
  Info,
  Package,
  Layers,
  CheckCircle2,
  RefreshCw,
  Database,
} from 'lucide-react';
import { ProduceItem, BundleItem, CartItem } from '../types';
import { BUNDLE_ITEMS } from '../data/produceData';
import {
  getProduceCatalog,
  subscribeProduceCatalog,
  fetchRemoteCatalog,
} from '../utils/produceStore';

interface StorefrontProps {
  onAddToCart: (item: { id: string; name: string; price: number; unit: string; image: string }, qty?: number) => void;
  onUpdateQty?: (id: string, delta: number) => void;
  onSelectProduct: (item: ProduceItem) => void;
  onGoToOrderHistory?: () => void;
  searchQuery: string;
  onOpenAiChat?: () => void;
  onOpenNearbyMandis?: () => void;
  cartItems?: CartItem[];
}

export const Storefront: React.FC<StorefrontProps> = ({
  onAddToCart,
  onUpdateQty,
  onSelectProduct,
  onGoToOrderHistory,
  searchQuery,
  onOpenAiChat,
  onOpenNearbyMandis,
  cartItems = [],
}) => {
  const [products, setProducts] = useState<ProduceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const loadFreshProductsFromDb = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      // Direct call to fetch fresh data from backend database with cache bypass
      const fresh = await fetchRemoteCatalog(true);
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Could not fetch fresh catalog from database:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Immediate fresh fetch directly from backend database on page load
    loadFreshProductsFromDb();

    // 2. Real-time subscription to SSE updates, cross-tab broadcasts, and version polling
    const unsubscribe = subscribeProduceCatalog((updated) => {
      if (updated && updated.length > 0) {
        setProducts(updated);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    });

    // 3. Inactive device wake-up / tab switch auto-refresh directly from database
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadFreshProductsFromDb();
      }
    };
    const handleFocus = () => loadFreshProductsFromDb();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const categories = [
    { id: 'all', label: 'All Fresh Produce' },
    { id: 'fruit', label: 'Sweet Fruits 🍊' },
    { id: 'greens', label: 'Leafy Bundles 🥬' },
    { id: 'veg', label: 'Market Vegetables 🥕' },
    { id: 'exotic', label: 'Exotic Produce 🐉' },
    { id: 'organic', label: 'Organic Superfoods 🫐' },
    { id: 'under100', label: 'Under ₹100 🏷️' },
  ];

  const filteredProducts = products.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (activeCategory === 'all') return true;
    if (activeCategory === 'under100') return item.price <= 100;
    return item.category === activeCategory;
  });

  return (
    <div className="space-y-8 pb-16 pt-4 sm:pt-6">
      {/* Category Filter Pills */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Today's Fresh Harvest
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Database</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time farm prices &amp; availability loaded directly from backend database {lastSyncTime ? `(synced at ${lastSyncTime})` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadFreshProductsFromDb(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-[32px] bg-white border border-emerald-900/15 hover:border-emerald-500/50 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Fetch latest prices directly from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Fetching...' : 'Refresh Rates'}</span>
            </button>
            <span className="hidden sm:inline-block text-xs font-semibold text-emerald-800 bg-emerald-50/90 px-3 py-1 rounded-[32px] border border-emerald-200/80 shadow-2xs">
              🥬 Leafy vegetables sold in fresh bundles
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-[32px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'btn-unique-emerald text-white'
                  : 'bg-white/85 backdrop-blur-md border border-emerald-900/10 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 shadow-2xs'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Produce Grid */}
      <section className="max-w-6xl mx-auto px-4">
        {isLoading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/90 border border-emerald-900/10 rounded-[32px] p-3 sm:p-4 space-y-3 animate-pulse">
                <div className="aspect-4/3 rounded-[24px] bg-slate-200/70" />
                <div className="h-4 bg-slate-200/80 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200/60 rounded-md w-1/2" />
                <div className="h-8 bg-emerald-100/60 rounded-[32px] w-full mt-2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white/90 backdrop-blur-xl border border-emerald-900/10 rounded-[32px] p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-900">No produce found matching "{searchQuery}"</p>
            <p className="text-xs text-slate-500 mt-1">Try another search term or browse all fresh aisles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map((product) => {
              const isAvailable = product.isAvailableToday ?? true;
              const inCart = cartItems.find((c) => c.id === product.id);

              return (
                <div
                  key={product.id}
                  className={`group relative bg-white/90 backdrop-blur-xl border rounded-[32px] p-3 sm:p-4 transition-all flex flex-col justify-between ${
                    isAvailable
                      ? inCart
                        ? 'border-emerald-500/70 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-500/30'
                        : 'border-emerald-900/10 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-900/5'
                      : 'border-slate-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  {/* Image Container with Real Picture */}
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-4/3 rounded-[24px] overflow-hidden bg-slate-100 mb-3 cursor-pointer group-hover:opacity-95"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      width={320}
                      height={240}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Tag / Availability Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isAvailable ? (
                        <>
                          {inCart && inCart.qty > 0 && (
                            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-[32px] shadow-xs flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{inCart.qty} in bag</span>
                            </span>
                          )}
                          {product.tag && (
                            <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[32px] shadow-xs">
                              {product.tag}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-[32px] shadow-xs">
                          Sold Out Today
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-[32px] bg-white/95 text-slate-700 hover:text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      title="View details & nutrition"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-[32px] border border-emerald-200/50">
                        {product.category}
                      </span>
                      <span className="flex items-center gap-0.5 font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-current" /> {product.rating}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectProduct(product)}
                      className="text-sm font-bold text-slate-900 hover:text-emerald-600 cursor-pointer line-clamp-1 leading-tight transition-colors"
                    >
                      {product.name}
                    </h3>

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {product.unit} · {product.origin.split(',')[0]}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-base font-extrabold text-slate-900">
                          ₹{product.price}
                        </span>
                        <span className="text-[10px] text-slate-500"> / {product.unit}</span>
                      </div>

                      {inCart && inCart.qty > 0 ? (
                        <div className="flex items-center bg-emerald-50 rounded-[32px] p-0.5 border border-emerald-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty
                                ? onUpdateQty(product.id, -1)
                                : onAddToCart(
                                    {
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                      unit: product.unit,
                                      image: product.image,
                                    },
                                    -1
                                  )
                            }
                            className="w-7 h-7 rounded-[32px] bg-white text-slate-700 hover:text-slate-900 flex items-center justify-center hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
                            title={`Reduce ${product.name} quantity`}
                            aria-label={`Reduce ${product.name} quantity`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-extrabold text-emerald-900 min-w-[20px] text-center">
                            {inCart.qty}
                          </span>
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() =>
                              onUpdateQty
                                ? onUpdateQty(product.id, 1)
                                : onAddToCart(
                                    {
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                      unit: product.unit,
                                      image: product.image,
                                    },
                                    1
                                  )
                            }
                            className="w-7 h-7 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center cursor-pointer shadow-xs"
                            title={`Add more ${product.name}`}
                            aria-label={`Add more ${product.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={!isAvailable}
                          onClick={() =>
                            isAvailable &&
                            onAddToCart({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              unit: product.unit,
                              image: product.image,
                            })
                          }
                          className={`w-9 h-9 rounded-[32px] flex items-center justify-center shadow-md transition-all ${
                            isAvailable
                              ? 'btn-unique-emerald hover:scale-105 active:scale-95 cursor-pointer'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={isAvailable ? `Add ${product.name} to fresh bag` : 'Out of stock for today'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className={isAvailable ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                        {isAvailable ? '⚡ 24 min delivery' : 'Restocking tomorrow'}
                      </span>
                      <button
                        onClick={() => onSelectProduct(product)}
                        className="hover:underline text-slate-500 hover:text-slate-800 font-medium px-1 rounded-[32px]"
                      >
                        Inspect →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fresh Fruit & Vegetable Boxes (Bundles) */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50/90 px-2.5 py-0.5 rounded-[32px] border border-emerald-200/60 shadow-2xs">
              Better in a Box
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Curated Fruit &amp; Veg Market Boxes
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BUNDLE_ITEMS.map((bundle) => {
            const bundleInCart = cartItems.find((c) => c.id === bundle.id);

            return (
              <div
                key={bundle.id}
                className={`bg-white/90 backdrop-blur-xl border rounded-[32px] overflow-hidden p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl ${
                  bundleInCart
                    ? 'border-emerald-500/70 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-500/30'
                    : 'border-emerald-900/10 hover:border-emerald-500/40'
                }`}
              >
                <div className="relative aspect-16/10 rounded-[24px] overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={bundle.image}
                    alt={bundle.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    width={360}
                    height={225}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {bundleInCart && bundleInCart.qty > 0 && (
                      <span className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-[32px] shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{bundleInCart.qty} in bag</span>
                      </span>
                    )}
                    <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-bold px-2.5 py-0.5 rounded-[32px]">
                      {bundle.tag}
                    </span>
                  </div>
                  {bundle.savings && (
                    <span className="absolute top-2 right-2 btn-unique-emerald text-white text-[9px] font-bold px-2.5 py-0.5 rounded-[32px] shadow-sm">
                      {bundle.savings}
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">{bundle.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {bundle.description}
                  </p>

                  <div className="bg-slate-50/80 border border-slate-100 p-2.5 rounded-[24px] text-[11px] text-slate-600 space-y-0.5">
                    <div className="font-semibold text-slate-900">Box Contains:</div>
                    <div className="truncate">{bundle.itemsIncluded.join(' · ')}</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-extrabold text-slate-900">₹{bundle.price}</span>
                      {bundle.originalPrice && (
                        <span className="text-xs text-slate-400 line-through ml-1.5">
                          ₹{bundle.originalPrice}
                        </span>
                      )}
                    </div>

                    {bundleInCart && bundleInCart.qty > 0 ? (
                      <div className="flex items-center bg-emerald-50 rounded-[32px] p-0.5 border border-emerald-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty
                              ? onUpdateQty(bundle.id, -1)
                              : onAddToCart(
                                  {
                                    id: bundle.id,
                                    name: bundle.name,
                                    price: bundle.price,
                                    unit: 'box',
                                    image: bundle.image,
                                  },
                                  -1
                                )
                          }
                          className="w-7 h-7 rounded-[32px] bg-white text-slate-700 hover:text-slate-900 flex items-center justify-center hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
                          title={`Reduce ${bundle.name} quantity`}
                          aria-label={`Reduce ${bundle.name} quantity`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-extrabold text-emerald-900 min-w-[20px] text-center">
                          {bundleInCart.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQty
                              ? onUpdateQty(bundle.id, 1)
                              : onAddToCart(
                                  {
                                    id: bundle.id,
                                    name: bundle.name,
                                    price: bundle.price,
                                    unit: 'box',
                                    image: bundle.image,
                                  },
                                  1
                                )
                          }
                          className="w-7 h-7 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center cursor-pointer shadow-xs"
                          title={`Add more ${bundle.name}`}
                          aria-label={`Add more ${bundle.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          onAddToCart({
                            id: bundle.id,
                            name: bundle.name,
                            price: bundle.price,
                            unit: 'box',
                            image: bundle.image,
                          })
                        }
                        className="px-4 py-2 btn-unique-emerald text-white text-xs font-bold rounded-[32px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Box</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How FreshLane 30-Min Delivery Works */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#071d15] via-[#0d2a20] to-[#071912] text-white rounded-[32px] p-6 sm:p-10 border border-emerald-800/40 shadow-xl">
          <div className="max-w-2xl mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-[32px]">
              Direct &amp; Transparent
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              From our local market shelves straight to your door
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              We eliminate warehouse intermediaries and third-party courier delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c221a]/80 rounded-[28px] p-5 border border-emerald-800/30 shadow-sm">
              <div className="w-10 h-10 rounded-[32px] btn-unique-emerald text-white font-bold flex items-center justify-center text-sm mb-3 shadow-md">
                1
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Hand-Picked in 5 Minutes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trained produce specialists inspect skin texture, firmness, and natural ripeness before packaging.
              </p>
            </div>

            <div className="bg-[#0c221a]/80 rounded-[28px] p-5 border border-emerald-800/30 shadow-sm">
              <div className="w-10 h-10 rounded-[32px] btn-unique-emerald text-white font-bold flex items-center justify-center text-sm mb-3 shadow-md">
                2
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Our Dedicated Rider Fleet</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                FreshLane drivers stationed within 3km of your neighbourhood pick up temperature-insulated bags.
              </p>
            </div>

            <div className="bg-[#0c221a]/80 rounded-[28px] p-5 border border-emerald-800/30 shadow-sm">
              <div className="w-10 h-10 rounded-[32px] btn-unique-emerald text-white font-bold flex items-center justify-center text-sm mb-3 shadow-md">
                3
              </div>
              <h3 className="font-bold text-sm text-white mb-1">At Your Door in 24–30 Min</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Live rider tracking with zero contact or handover directly to your kitchen counter.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
