export interface ProduceItem {
  id: string;
  name: string;
  category: 'fruit' | 'veg' | 'greens' | 'organic' | 'exotic';
  price: number;
  unit: string; // e.g. '1 bundle', '1 kg', '500g', '1 pc'
  image: string;
  tag?: string;
  rating: number;
  reviewCount: number;
  description: string;
  origin: string;
  inStockKg: number;
  calories: string;
  nutritionalHighlights: string[];
  storageTip: string;
  isAvailableToday?: boolean; // Owner daily availability toggle
  sampleScanImage?: string;
}

export interface ScanResult {
  name: string;
  category: string;
  confidence: number;
  ripeness: string;
  ripenessDescription: string;
  estimatedWeightKg: number;
  unitLabel: string;
  shelfLifeDays: number;
  nutritionalHighlights: string[];
  storageTip: string;
  matchedCatalogId: string;
  pricePerKg: number;
  culinaryNotes: string;
  scannedImage?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  qty: number;
  weightKg?: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'shopper' | 'owner' | 'driver';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  neighbourhood?: string;
  registeredAt: string;
  isVerified?: boolean;
}

export interface OrderItemRecord {
  id: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
  image: string;
}

export interface LocationCoords {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface DeliveryRating {
  stars: number;
  tags: string[];
  comment?: string;
  submittedAt: string;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  address: string;
  itemCount: number;
  weightKg?: number;
  amount: number;
  status: 'placed' | 'confirmed' | 'picking' | 'packing' | 'assigned' | 'picked_up' | 'on_route' | 'delivered';
  promiseMinutes: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverRating?: number;
  deliveryOtp?: string;
  photoProof?: string;
  timePlaced: string;
  formattedDate: string;
  itemsSummary: string;
  items?: OrderItemRecord[];
  paymentMethod: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  trackingStep?: number; // 1: Placed, 2: Confirmed, 3: Picked Up, 4: On the way, 5: Delivered
  customerCoords?: LocationCoords;
  storeCoords?: LocationCoords;
  driverCoords?: LocationCoords;
  rating?: DeliveryRating;
}

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: 'electric_scooter' | 'bike' | 'van';
  zone: string;
  isOnline: boolean;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  deliveriesToday: number;
  earningsToday: number;
  batteryLevel: number;
  currentCoords: LocationCoords;
  activeOrderId?: string;
  lastPingTime?: string;
}

export interface OrderLiveTrackingState {
  orderId: string;
  status: OrderRecord['status'];
  etaMinutes: number;
  distanceMeters: number;
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    rating: number;
    coords: LocationCoords;
    batteryLevel: number;
  };
  customerCoords: LocationCoords;
  storeCoords: LocationCoords;
  geofenceArrived: boolean;
  timeline: {
    step: 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered';
    label: string;
    time?: string;
    completed: boolean;
  }[];
}

export interface BundleItem {
  id: string;
  name: string;
  tag: string;
  price: number;
  originalPrice?: number;
  savings?: string;
  description: string;
  image: string;
  itemsIncluded: string[];
}
