import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Star,
  MapPin,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Info,
  Package,
  Layers,
  AlertTriangle,
  Navigation,
  Loader2,
} from 'lucide-react';
import { ProduceItem, BundleItem } from '../types';
import { BUNDLE_ITEMS } from '../data/produceData';
import { getProduceCatalog, subscribeProduceCatalog } from '../utils/produceStore';
import {
  checkDeliveryEligibility,
  getBrowserGeolocationDistance,
  DeliveryEligibilityResult,
  TADEPALLIGUDEM_HUB,
} from '../utils/deliveryZone';

interface StorefrontProps {
  onAddToCart: (item: { id: string; name: string; price: number; unit: string; image: string }, qty?: number) => void;
  onSelectProduct: (item: ProduceItem) => void;
  onGoToOrderHistory?: () => void;
  searchQuery: string;
}

export const Storefront: React.FC<StorefrontProps> = ({
  onAddToCart,
  onSelectProduct,
  onGoToOrderHistory,
  searchQuery,
}) => {
  const [products, setProducts] = useState<ProduceItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [userLocation, setUserLocation] = useState('KN Road, Tadepalligudem (PIN 534102)');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryEligibilityResult>(() =>
    checkDeliveryEligibility({ address: 'KN Road, Tadepalligudem 534102' })
  );

  useEffect(() => {
    setProducts(getProduceCatalog());
    const unsubscribe = subscribeProduceCatalog((updated) => {
      setProducts(updated);
    });
    return unsubscribe;
  }, []);

  const handleCheckLocation = (locationQuery?: string) => {
    const loc = locationQuery !== undefined ? locationQuery : userLocation;
    const result = checkDeliveryEligibility({ address: loc });
    setDeliveryStatus(result);
  };

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    const result = await getBrowserGeolocationDistance();
    setDeliveryStatus(result);
    if (result.isDeliverable) {
      setUserLocation(`GPS Location (${result.distanceKm} km from Tadepalligudem Hub)`);
    } else {
      setUserLocation(`GPS Location (${result.distanceKm} km away - Out of Range)`);
    }
    setIsDetectingGps(false);
  };

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
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-6">
        <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm min-h-[380px] sm:min-h-[440px] flex flex-col justify-center p-6 sm:p-12">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Background real produce decorative photo on right */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1200&auto=format&fit=crop&q=80"
              alt="Fresh organic fruits and vegetables"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-slate-200 text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Tadepalligudem Hub (534102) · 15km Strict Delivery Radius</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Farm-fresh harvest, <br />
              <span className="text-emerald-600">delivered right to your door.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
              Crisp leafy bundles, sweet pomegranates, ripe exotic fruits, and dinner essentials delivered in <strong className="text-slate-900 font-semibold">24–30 minutes</strong> within a 15 km radius of Tadepalligudem, 534102.
            </p>

            {/* Quick Location & 15km Delivery Radius Check */}
            <div className="pt-2 space-y-2 max-w-lg">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => {
                      setUserLocation(e.target.value);
                      handleCheckLocation(e.target.value);
                    }}
                    placeholder="Enter locality, colony, or PIN (e.g. KN Road, 534102)..."
                    className="w-full h-11 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCheckLocation()}
                    className="h-11 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-colors"
                  >
                    <span>Check Range</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    title="Detect Current GPS Location"
                    className="h-11 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    {isDetectingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span className="hidden sm:inline">GPS</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {deliveryStatus.isDeliverable ? (
                <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">
                    <strong className="font-bold text-emerald-800">Within 15km Delivery Zone:</strong>{' '}
                    <span>{deliveryStatus.message}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">
                    <p className="font-bold text-rose-800">You are out of delivery range</p>
                    <p className="text-rose-700 mt-0.5">
                      Delivery is currently available <strong>strictly within a 15 km radius</strong> of Tadepalligudem (PIN 534102). Your entered location is ~{deliveryStatus.distanceKm} km away.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Area Test Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400 font-medium mr-1">Quick check:</span>
                <button
                  type="button"
                  onClick={() => {
                    const loc = 'KN Road, Tadepalligudem 534102';
                    setUserLocation(loc);
                    handleCheckLocation(loc);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
                >
                  KN Road (1.2km)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loc = 'Subba Rao Peta, Tadepalligudem 534102';
                    setUserLocation(loc);
                    handleCheckLocation(loc);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
                >
                  Subba Rao Peta (1.8km)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loc = 'Pentapadu, AP 534166';
                    setUserLocation(loc);
                    handleCheckLocation(loc);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] transition-colors cursor-pointer"
                >
                  Pentapadu (4.5km)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loc = 'Tanuku, West Godavari 534211';
                    setUserLocation(loc);
                    handleCheckLocation(loc);
                  }}
                  className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-[10px] transition-colors cursor-pointer"
                  title="Test Out of Range behavior"
                >
                  Tanuku (21km · Out of Range)
                </button>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Quality Inspected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Razorpay Secured Gateway</span>
              </div>
              {onGoToOrderHistory && (
                <button
                  onClick={onGoToOrderHistory}
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  View Past Orders →
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Today's Fresh Harvest
            </h2>
            <p className="text-xs text-slate-500">Live prices &amp; daily availability updated this morning</p>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            🥬 Leafy vegetables sold in fresh bundles
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Produce Grid */}
      <section className="max-w-6xl mx-auto px-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <p className="text-sm font-bold text-slate-900">No produce found matching "{searchQuery}"</p>
            <p className="text-xs text-slate-500 mt-1">Try another search term or browse all fresh aisles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map((product) => {
              const isAvailable = product.isAvailableToday ?? true;

              return (
                <div
                  key={product.id}
                  className={`group relative bg-white border rounded-2xl p-3 sm:p-3.5 transition-all flex flex-col justify-between ${
                    isAvailable
                      ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  {/* Image Container with Real Picture */}
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-3 cursor-pointer group-hover:opacity-95"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Tag / Availability Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {isAvailable ? (
                        product.tag && (
                          <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                            {product.tag}
                          </span>
                        )
                      ) : (
                        <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                          Sold Out Today
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/95 text-slate-700 hover:text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                      title="View details & nutrition"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
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
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs transition-transform ${
                          isAvailable
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        title={isAvailable ? `Add ${product.name} to fresh bag` : 'Out of stock for today'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className={isAvailable ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                        {isAvailable ? '⚡ 24 min delivery' : 'Restocking tomorrow'}
                      </span>
                      <button
                        onClick={() => onSelectProduct(product)}
                        className="hover:underline text-slate-500 hover:text-slate-800"
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              Better in a Box
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Curated Fruit &amp; Veg Market Boxes
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BUNDLE_ITEMS.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden p-4 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
            >
              <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-100 mb-3">
                <img
                  src={bundle.image}
                  alt={bundle.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded">
                  {bundle.tag}
                </span>
                {bundle.savings && (
                  <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs">
                    {bundle.savings}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm text-slate-900 leading-tight">{bundle.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {bundle.description}
                </p>

                <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                  <div className="font-semibold text-slate-900">Box Contains:</div>
                  <div className="truncate">{bundle.itemsIncluded.join(' · ')}</div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-slate-900">₹{bundle.price}</span>
                  {bundle.originalPrice && (
                    <span className="text-xs text-slate-400 line-through ml-1.5">
                      ₹{bundle.originalPrice}
                    </span>
                  )}
                </div>

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
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Box</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How FreshLane 30-Min Delivery Works */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-sm">
          <div className="max-w-2xl mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              Direct &amp; Transparent
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              From our local market shelves straight to your door
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              We eliminate warehouse intermediaries and third-party courier delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/60 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-3 shadow-xs">
                1
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Hand-Picked in 5 Minutes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trained produce specialists inspect skin texture, firmness, and natural ripeness before packaging.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/60 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-3 shadow-xs">
                2
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Our Dedicated Rider Fleet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                FreshLane drivers stationed within 3km of your neighbourhood pick up temperature-insulated bags.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/60 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm mb-3 shadow-xs">
                3
              </div>
              <h3 className="font-bold text-sm text-white mb-1">At Your Door in 24–30 Min</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live rider tracking with zero contact or handover directly to your kitchen counter.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
