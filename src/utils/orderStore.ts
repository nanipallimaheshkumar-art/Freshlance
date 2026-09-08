import { OrderRecord, OrderItemRecord, CartItem } from '../types';

const ORDERS_STORAGE_KEY = 'freshlane_customer_orders_v2';
const ORDERS_EVENT = 'freshlane_orders_updated';

// In Live Production mode, no mock dummy orders are pre-seeded. Orders are created live by customers.
const SEED_ORDERS: OrderRecord[] = [];

export function getUserOrders(): OrderRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load user orders:', err);
  }
  return [];
}

export function saveUserOrder(newOrder: {
  id: string;
  items: CartItem[];
  total: number;
  address: string;
  paymentMethod: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  customerName?: string;
  customerEmail?: string;
}): OrderRecord {
  const currentOrders = getUserOrders();

  const formattedDate = 'Just now · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const record: OrderRecord = {
    id: newOrder.id,
    customerName: newOrder.customerName || 'Customer',
    customerEmail: newOrder.customerEmail,
    address: newOrder.address,
    itemCount: newOrder.items.reduce((sum, item) => sum + item.qty, 0),
    amount: newOrder.total,
    status: 'assigned',
    promiseMinutes: 24,
    driverName: 'Rider Assigned (Express Fleet)',
    timePlaced: new Date().toISOString(),
    formattedDate,
    itemsSummary: newOrder.items.map((i) => `${i.name} (${i.qty} × ${i.unit})`).join(', '),
    items: newOrder.items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      unit: i.unit,
      qty: i.qty,
      image: i.image,
    })),
    paymentMethod: newOrder.paymentMethod,
    razorpayPaymentId: newOrder.razorpayPaymentId,
    razorpayOrderId: newOrder.razorpayOrderId,
    trackingStep: 2, // Packing & assigning driver
  };

  const updated = [record, ...currentOrders];
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(ORDERS_EVENT, { detail: updated }));
  } catch (err) {
    console.error('Failed to save order to localStorage:', err);
  }

  return record;
}

export function saveOrders(orders: OrderRecord[]): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(ORDERS_EVENT, { detail: orders }));
  } catch (err) {
    console.error('Failed to save orders:', err);
  }
}

export function updateOrderDriver(orderId: string, driverName: string): OrderRecord[] {
  const current = getUserOrders();
  const updated = current.map((ord) => (ord.id === orderId ? { ...ord, driverName } : ord));
  saveOrders(updated);
  return updated;
}

export function subscribeOrders(callback: (orders: OrderRecord[]) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<OrderRecord[]>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getUserOrders());
    }
  };

  window.addEventListener(ORDERS_EVENT, handler);
  return () => window.removeEventListener(ORDERS_EVENT, handler);
}
