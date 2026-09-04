import { OrderRecord, OrderItemRecord, CartItem } from '../types';

const ORDERS_STORAGE_KEY = 'freshlane_customer_orders_v2';
const ORDERS_EVENT = 'freshlane_orders_updated';

const SEED_ORDERS: OrderRecord[] = [
  {
    id: 'FL-91428',
    customerName: 'Priyanka Sharma',
    customerEmail: 'priyanka.s@gmail.com',
    address: 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102',
    itemCount: 4,
    weightKg: 2.5,
    amount: 512,
    status: 'on_route',
    promiseMinutes: 14,
    driverName: 'Arjun S. (Rider #1)',
    timePlaced: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    formattedDate: 'Today, 24 min ago',
    itemsSummary: 'Ruby Red Pomegranates (1kg), Tender Baby Spinach (1 bundle), Farm Fresh Vine Tomatoes (1kg), Coriander Bunch (1 bundle)',
    paymentMethod: 'Razorpay Secure',
    razorpayPaymentId: 'pay_Nq98xK198a2',
    trackingStep: 3,
    items: [
      {
        id: 'ruby-pomegranate',
        name: 'Ruby Red Pomegranates',
        price: 189,
        unit: '1 kg',
        qty: 1,
        image: 'https://images.unsplash.com/photo-1541344999736-83eca872f242?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'baby-spinach',
        name: 'Tender Baby Spinach',
        price: 45,
        unit: '1 bundle',
        qty: 2,
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'vine-tomatoes',
        name: 'Farm Fresh Vine Tomatoes',
        price: 79,
        unit: '1 kg',
        qty: 2,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'fresh-coriander',
        name: 'Fragrant Coriander Bunch (Dhaniya)',
        price: 25,
        unit: '1 bundle',
        qty: 1,
        image: 'https://images.unsplash.com/photo-1599818817688-66112ff7f12e?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'FL-89315',
    customerName: 'Priyanka Sharma',
    customerEmail: 'priyanka.s@gmail.com',
    address: 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102',
    itemCount: 3,
    weightKg: 2,
    amount: 477,
    status: 'delivered',
    promiseMinutes: 0,
    driverName: 'Farah K. (Rider #3)',
    timePlaced: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    formattedDate: 'Yesterday, 04:15 PM',
    itemsSummary: 'Alphonso Honey Mangoes (2kg), Fresh Exotic Dragon Fruit (1 pc)',
    paymentMethod: 'Razorpay UPI',
    razorpayPaymentId: 'pay_Nm43jL913c1',
    trackingStep: 4,
    items: [
      {
        id: 'honey-mangoes',
        name: 'Alphonso Honey Mangoes',
        price: 169,
        unit: '1 kg',
        qty: 2,
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
      },
      {
        id: 'fresh-dragon-fruit',
        name: 'Fresh Exotic Dragon Fruit',
        price: 149,
        unit: '1 pc',
        qty: 1,
        image: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'FL-82109',
    customerName: 'Priyanka Sharma',
    customerEmail: 'priyanka.s@gmail.com',
    address: 'Flat 402, Sri Rama Residency, KN Road, Tadepalligudem, 534102',
    itemCount: 4,
    weightKg: 3.5,
    amount: 649,
    status: 'delivered',
    promiseMinutes: 0,
    driverName: 'Vishal P. (Rider #5)',
    timePlaced: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    formattedDate: '3 days ago, 10:30 AM',
    itemsSummary: 'Weeknight Dinner Staples Box (1 box)',
    paymentMethod: 'Razorpay NetBanking',
    razorpayPaymentId: 'pay_Kk88zQ332p7',
    trackingStep: 4,
    items: [
      {
        id: 'weeknight-veg-box',
        name: 'Weeknight Dinner Staples Box',
        price: 649,
        unit: 'box',
        qty: 1,
        image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
      },
    ],
  },
];

export function getUserOrders(): OrderRecord[] {
  if (typeof window === 'undefined') return SEED_ORDERS;

  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(SEED_ORDERS));
      return SEED_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load user orders:', err);
  }
  return SEED_ORDERS;
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
