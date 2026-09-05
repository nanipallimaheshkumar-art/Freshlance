import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Package,
  Bike,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  ShieldCheck,
  CreditCard,
  Layers,
  ArrowUpRight,
  Filter,
  Check,
  X,
  Sliders,
  Settings,
  Users,
  BarChart3,
  MapPin,
  UserCheck
} from 'lucide-react';
import { UserAccount, ProduceItem, OrderRecord } from '../types';
import {
  getProduceCatalog,
  updateDailyPrice,
  toggleDailyAvailability,
  addDailyProduce,
  deleteProduceItem,
  updateStock,
  resetCatalogToDefault,
  subscribeProduceCatalog
} from '../utils/produceStore';
import { getUserOrders, updateOrderDriver } from '../utils/orderStore';
import { AdminFleetView } from './AdminFleetView';
import { AdminAnalyticsView } from './AdminAnalyticsView';

interface OwnerDashboardProps {
  user: UserAccount | null;
  onGoToShop: () => void;
}

// Preset photo choices for quick owner addition
const PRODUCE_PHOTO_PRESETS = [
  {
    name: 'Ruby Pomegranate',
    url: 'https://images.unsplash.com/photo-1541344999736-83eca872f242?w=800&auto=format&fit=crop&q=80',
    category: 'fruit',
  },
  {
    name: 'Dragon Fruit',
    url: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=800&auto=format&fit=crop&q=80',
    category: 'exotic',
  },
  {
    name: 'Spinach / Palak Bundle',
    url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    category: 'greens',
  },
  {
    name: 'Coriander / Dhaniya Bunch',
    url: 'https://images.unsplash.com/photo-1599818817688-66112ff7f12e?w=800&auto=format&fit=crop&q=80',
    category: 'greens',
  },
  {
    name: 'Alphonso Mango',
    url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
    category: 'fruit',
  },
  {
    name: 'Vine Tomatoes',
    url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    category: 'veg',
  },
  {
    name: 'Tender Carrots',
    url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=800&auto=format&fit=crop&q=80',
    category: 'veg',
  },
  {
    name: 'Bell Peppers',
    url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop&q=80',
    category: 'veg',
  },
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, onGoToShop }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'drivers' | 'analytics' | 'razorpay'>('inventory');
  const [produceList, setProduceList] = useState<ProduceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Item Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'fruit' | 'veg' | 'greens' | 'organic' | 'exotic'>('fruit');
  const [newItemPrice, setNewItemPrice] = useState<number>(120);
  const [newItemUnit, setNewItemUnit] = useState('1 kg');
  const [newItemStock, setNewItemStock] = useState<number>(40);
  const [newItemOrigin, setNewItemOrigin] = useState('Bangalore Rural Green Belt');
  const [newItemImage, setNewItemImage] = useState(PRODUCE_PHOTO_PRESETS[0].url);
  const [newItemDescription, setNewItemDescription] = useState('');

  // Razorpay settings state (Strictly Live Key)
  const [razorpayKey, setRazorpayKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('freshlane_razorpay_key');
      if (stored && stored.startsWith('rzp_test_')) {
        localStorage.removeItem('freshlane_razorpay_key');
      } else if (stored && stored.startsWith('rzp_live_')) {
        return stored;
      }
    }
    return import.meta.env.VITE_RAZORPAY_KEY_ID || '';
  });
  const [razorpaySaved, setRazorpaySaved] = useState(false);

  // Order management state
  const [orders, setOrders] = useState(() => getUserOrders());

  const handleReassignDriver = (orderId: string, newDriverName: string) => {
    updateOrderDriver(orderId, newDriverName);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, driverName: newDriverName } : o))
    );
    showToast(`Order ${orderId} reassigned to ${newDriverName}`);
  };

  useEffect(() => {
    setProduceList(getProduceCatalog());
    const unsub = subscribeProduceCatalog((items) => {
      setProduceList(items);
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePriceUpdate = (id: string, price: number) => {
    updateDailyPrice(id, price);
    setEditingPriceId(null);
    showToast(`Updated today's market price to ₹${price}`);
  };

  const handleToggleAvailability = (id: string, currentVal?: boolean) => {
    const nextVal = !(currentVal ?? true);
    toggleDailyAvailability(id, nextVal);
    showToast(nextVal ? 'Item marked Available Today' : 'Item marked Out of Stock for Today');
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Remove ${name} from today's market display?`)) {
      deleteProduceItem(id);
      showToast(`Removed ${name} from catalog`);
    }
  };

  const handleSaveRazorpayKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('freshlane_razorpay_key', razorpayKey.trim());
    setRazorpaySaved(true);
    showToast('Razorpay Key ID saved successfully!');
    setTimeout(() => setRazorpaySaved(false), 3000);
  };

  const handleAddNewProduce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const slug = newItemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newProduce: ProduceItem = {
      id: `custom-${slug}-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      price: newItemPrice,
      unit: newItemUnit,
      image: newItemImage,
      tag: 'Fresh Arrival Today',
      rating: 4.9,
      reviewCount: 12,
      description:
        newItemDescription.trim() ||
        `Farm-inspected fresh ${newItemName.toLowerCase()} sourced directly from ${newItemOrigin} for today's market delivery.`,
      origin: newItemOrigin.trim(),
      inStockKg: newItemStock,
      calories: '45 kcal / 100g',
      nutritionalHighlights: ['Rich in natural vitamins', 'Farm-fresh enzymes', 'Zero chemical polish'],
      storageTip: 'Keep in refrigerator crisper drawer or well-ventilated fruit basket.',
      isAvailableToday: true,
    };

    addDailyProduce(newProduce);
    setIsAddModalOpen(false);
    showToast(`Added ${newProduce.name} to today's catalog!`);

    // Reset form defaults
    setNewItemName('');
    setNewItemDescription('');
  };

  const filteredProduce = produceList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.origin.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Store Operations Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            FreshLane Merchant Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage today's market rates, toggle fruit/veg availability, configure Razorpay, and track express orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Produce for Today</span>
          </button>
          <button
            onClick={onGoToShop}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <span>View Storefront →</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Daily Prices &amp; Availability ({produceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Live Express Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'drivers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Fleet &amp; Live Map</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Dispatch Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('razorpay')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'razorpay'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Razorpay Gateway</span>
        </button>
      </div>

      {/* TAB 1: DAILY PRICING & AVAILABILITY MANAGER */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Categories */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter fruits, leafy bundles, vegetables..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'fruit', label: 'Fruits' },
                { id: 'veg', label: 'Vegetables' },
                { id: 'greens', label: 'Leafy Bundles 🥬' },
                { id: 'exotic', label: 'Exotic' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}

              <button
                onClick={() => {
                  if (confirm('Reset catalogue back to standard defaults?')) {
                    resetCatalogToDefault();
                    showToast('Catalogue reset to defaults');
                  }
                }}
                className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-rose-600 font-medium rounded-lg hover:bg-slate-100 cursor-pointer ml-auto"
                title="Reset to original default catalog"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* Table / List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Produce Item</th>
                    <th className="py-3 px-4">Category &amp; Unit</th>
                    <th className="py-3 px-4">Today's Price</th>
                    <th className="py-3 px-4">Daily Availability</th>
                    <th className="py-3 px-4">Stock on Hand</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProduce.map((item) => {
                    const isAvailable = item.isAvailableToday ?? true;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isAvailable ? 'opacity-65 bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Item info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {!isAvailable && (
                                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                    Unavailable Today
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.origin}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Unit */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="inline-block uppercase font-bold text-[9px] tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {item.unit}
                            </div>
                          </div>
                        </td>

                        {/* Today's Price (Editable) */}
                        <td className="py-3 px-4">
                          {editingPriceId === item.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">₹</span>
                              <input
                                type="number"
                                min={1}
                                autoFocus
                                value={tempPrice}
                                onChange={(e) => setTempPrice(Number(e.target.value))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePriceUpdate(item.id, tempPrice);
                                  if (e.key === 'Escape') setEditingPriceId(null);
                                }}
                                className="w-20 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-xs font-bold text-slate-900 outline-none"
                              />
                              <button
                                onClick={() => handlePriceUpdate(item.id, tempPrice)}
                                className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center cursor-pointer"
                                title="Save price"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingPriceId(null)}
                                className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPriceId(item.id);
                                setTempPrice(item.price);
                              }}
                              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-200 cursor-pointer transition-colors"
                              title="Click to edit today's market price"
                            >
                              <span className="font-extrabold text-sm text-slate-900">
                                ₹{item.price}
                              </span>
                              <span className="text-[10px] text-slate-400">/{item.unit}</span>
                              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-60 group-hover:opacity-100 ml-1" />
                            </button>
                          )}
                        </td>

                        {/* Daily Availability Switch */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleAvailability(item.id, isAvailable)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            <span>{isAvailable ? 'Available Today' : 'Sold Out for Day'}</span>
                          </button>
                        </td>

                        {/* Stock on hand */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">
                              {item.inStockKg} {item.unit.includes('bundle') ? 'bundles' : item.unit.includes('pc') ? 'pcs' : 'kg'}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  updateStock(item.id, Math.max(0, item.inStockKg - 5));
                                  showToast(`Adjusted stock for ${item.name}`);
                                }}
                                className="w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={() => {
                                  updateStock(item.id, item.inStockKg + 5);
                                  showToast(`Added +5 stock for ${item.name}`);
                                }}
                                className="w-5 h-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete item from market"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Express Orders &amp; Dispatch</h2>
              <p className="text-xs text-slate-500">Live 30-minute packing, delivery status, and partner reassignment</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              ⚡ 100% On-Time Target
            </span>
          </div>

          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">{ord.id}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-700">{ord.customerName}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-[11px] text-slate-500">{ord.formattedDate}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      OTP: {ord.deliveryOtp || '4829'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{ord.itemsSummary}</p>
                  <div className="text-[11px] text-slate-400">
                    {ord.address} · <span className="font-bold text-slate-700">₹{ord.amount}</span> ({ord.paymentMethod})
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end sm:self-auto">
                  {/* Rider Assignment & Reassign Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                    <Bike className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-slate-500 font-medium">Rider:</span>
                    <select
                      value={ord.driverName || 'Arjun S.'}
                      onChange={(e) => handleReassignDriver(ord.id, e.target.value)}
                      className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
                      title="Reassign express delivery partner"
                    >
                      <option value="Arjun S.">Arjun S. (Indiranagar)</option>
                      <option value="Farah Khan">Farah Khan (Koramangala)</option>
                      <option value="Vishal Patel">Vishal Patel (HSR)</option>
                      <option value="Sunil Reddy">Sunil Reddy (Whitefield)</option>
                    </select>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {ord.status === 'delivered' ? 'Delivered ✓' : `Out for Delivery (${ord.promiseMinutes}m)`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLEET & LIVE DRIVER TELEMATICS MAP */}
      {activeTab === 'drivers' && (
        <AdminFleetView orders={orders} onReassignDriver={handleReassignDriver} />
      )}

      {/* TAB 4: DISPATCH & FULFILLMENT ANALYTICS */}
      {activeTab === 'analytics' && <AdminAnalyticsView />}

      {/* TAB 3: RAZORPAY GATEWAY CONFIGURATION */}
      {activeTab === 'razorpay' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              ₹
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                Official Gateway
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Razorpay Payment Gateway Setup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Connect your real Razorpay Merchant account to accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, Net Banking, and wallet payments directly from your shoppers.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRazorpayKey} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                placeholder="rzp_live_..."
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Found on your Razorpay Dashboard under <strong className="text-slate-700">Settings → API Keys</strong>. Both live keys and test keys are fully supported.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Payment Features</span>
              </div>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li>✓ Instant customer checkout with standard Razorpay SDK modal</li>
                <li>✓ Automatic capture of payment reference ID in order history</li>
                <li>✓ Direct settlement to your registered bank account</li>
                <li>✓ Fallback testing sandbox for preview verification</li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {razorpaySaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Razorpay Key Saved!</span>
                </>
              ) : (
                <span>Save Razorpay Settings</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ADD NEW PRODUCE ITEM FOR THE DAY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Daily Inventory
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Add Fruit or Vegetable Available Today
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewProduce} className="space-y-4 text-xs">
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Produce Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruby Red Pomegranate"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Category *
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setNewItemCategory(cat);
                      if (cat === 'greens') setNewItemUnit('1 bundle');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                  >
                    <option value="fruit">Sweet Fruit 🍊</option>
                    <option value="veg">Market Vegetable 🥕</option>
                    <option value="greens">Leafy Green (1 bundle) 🥬</option>
                    <option value="exotic">Exotic Superfruit 🐉</option>
                    <option value="organic">Organic Superfood 🫐</option>
                  </select>
                </div>
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Today's Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Selling Unit *
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                  >
                    <option value="1 bundle">1 bundle (Leafy greens)</option>
                    <option value="1 kg">1 kg</option>
                    <option value="500g">500g</option>
                    <option value="1 pc">1 pc (Dragon fruit, etc.)</option>
                    <option value="250g">250g</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Available Stock *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Origin */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Origin Farm / Region
                </label>
                <input
                  type="text"
                  value={newItemOrigin}
                  onChange={(e) => setNewItemOrigin(e.target.value)}
                  placeholder="e.g. Solapur Orchards, Maharashtra"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                />
              </div>

              {/* Photo Preset Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Select Real Produce Photo Preset
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRODUCE_PHOTO_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setNewItemImage(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        newItemImage === preset.url
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] font-bold p-0.5 truncate text-center">
                        {preset.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Or custom URL */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Or Custom Image URL
                </label>
                <input
                  type="url"
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 text-slate-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Short Quality Description
                </label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="e.g. Crisp ruby arils with bursting natural sweetness, harvest freshness guaranteed."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Add to Today's Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
