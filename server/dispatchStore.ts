import { Response } from "express";

export interface LatLng {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface DriverEntity {
  id: string;
  name: string;
  email?: string;
  password?: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: "electric_scooter" | "bike" | "van";
  zone: string;
  isOnline: boolean;
  status: "available" | "busy" | "offline";
  rating: number;
  deliveriesToday: number;
  earningsToday: number;
  batteryLevel: number;
  currentCoords: LatLng;
  activeOrderId?: string;
  lastPingTime: number;
}

export interface OrderTrackingSnapshot {
  orderId: string;
  status: "placed" | "confirmed" | "picked_up" | "on_the_way" | "delivered";
  etaMinutes: number;
  distanceMeters: number;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    rating: number;
    batteryLevel: number;
    coords: LatLng;
  };
  customerAddress: string;
  customerCoords: LatLng;
  storeCoords: LatLng;
  geofenceArrived: boolean;
  deliveryOtp: string;
  photoProof?: string;
  timeline: {
    step: "placed" | "confirmed" | "picked_up" | "on_the_way" | "delivered";
    label: string;
    time?: string;
    completed: boolean;
  }[];
  rating?: {
    stars: number;
    tags: string[];
    comment?: string;
    submittedAt: string;
  };
}

// Hub coordinates: FreshLane Hub (Tadepalligudem, 534102, Andhra Pradesh)
export const FRESHLANE_HUB_COORDS: LatLng = {
  lat: 16.8131,
  lng: 81.5273,
};

export const DELIVERY_MAX_RADIUS_KM = 15.0;

// Initial Seed Drivers in Tadepalligudem (534102) 15km Zone
const driversDatabase: Map<string, DriverEntity> = new Map([
  [
    "DRV-101",
    {
      id: "DRV-101",
      name: "Arjun S.",
      phone: "+91 98450 12345",
      vehicleNumber: "AP-39-EQ-4421",
      vehicleType: "electric_scooter",
      zone: "KN Road, Tadepalligudem",
      isOnline: true,
      status: "busy",
      rating: 4.95,
      deliveriesToday: 9,
      earningsToday: 765,
      batteryLevel: 82,
      currentCoords: {
        lat: 16.8145,
        lng: 81.5285,
        heading: 110,
        speed: 24,
      },
      activeOrderId: "FL-91428",
      lastPingTime: Date.now(),
    },
  ],
  [
    "DRV-102",
    {
      id: "DRV-102",
      name: "Farah Khan",
      phone: "+91 97312 65432",
      vehicleNumber: "AP-39-MM-8921",
      vehicleType: "electric_scooter",
      zone: "Subba Rao Peta",
      isOnline: true,
      status: "available",
      rating: 4.91,
      deliveriesToday: 7,
      earningsToday: 595,
      batteryLevel: 94,
      currentCoords: {
        lat: 16.8172,
        lng: 81.5312,
        heading: 45,
        speed: 0,
      },
      lastPingTime: Date.now() - 15000,
    },
  ],
  [
    "DRV-103",
    {
      id: "DRV-103",
      name: "Vishal Patel",
      phone: "+91 98860 99881",
      vehicleNumber: "AP-39-AB-3319",
      vehicleType: "bike",
      zone: "Housing Board Colony",
      isOnline: true,
      status: "available",
      rating: 4.88,
      deliveriesToday: 6,
      earningsToday: 510,
      batteryLevel: 75,
      currentCoords: {
        lat: 16.8055,
        lng: 81.5218,
        heading: 270,
        speed: 18,
      },
      lastPingTime: Date.now() - 30000,
    },
  ],
  [
    "DRV-104",
    {
      id: "DRV-104",
      name: "Rahul Verma",
      phone: "+91 96111 22334",
      vehicleNumber: "AP-39-EJ-7723",
      vehicleType: "electric_scooter",
      zone: "Pentapadu",
      isOnline: false,
      status: "offline",
      rating: 4.82,
      deliveriesToday: 4,
      earningsToday: 340,
      batteryLevel: 62,
      currentCoords: {
        lat: 16.8365,
        lng: 81.5621,
        heading: 0,
        speed: 0,
      },
      lastPingTime: Date.now() - 3600000,
    },
  ],
]);

// Initial Orders Live Tracking Cache
const orderTrackingDatabase: Map<string, OrderTrackingSnapshot> = new Map([
  [
    "FL-91428",
    {
      orderId: "FL-91428",
      status: "on_the_way",
      etaMinutes: 8,
      distanceMeters: 850,
      driver: {
        id: "DRV-101",
        name: "Arjun S.",
        phone: "+91 98450 12345",
        vehicle: "EV Scooter (AP-39-EQ-4421)",
        rating: 4.95,
        batteryLevel: 82,
        coords: {
          lat: 16.8145,
          lng: 81.5285,
          heading: 110,
          speed: 24,
        },
      },
      customerAddress: "Flat 204, Sri Rama Residency, KN Road, Tadepalligudem, 534102",
      customerCoords: {
        lat: 16.8165,
        lng: 81.5295,
      },
      storeCoords: FRESHLANE_HUB_COORDS,
      geofenceArrived: false,
      deliveryOtp: "4829",
      timeline: [
        {
          step: "placed",
          label: "Order Placed & Paid",
          time: "18 min ago",
          completed: true,
        },
        {
          step: "confirmed",
          label: "Hub Confirmed & Packed",
          time: "14 min ago",
          completed: true,
        },
        {
          step: "picked_up",
          label: "Picked Up by Arjun S.",
          time: "9 min ago",
          completed: true,
        },
        {
          step: "on_the_way",
          label: "On the Way",
          time: "4 min ago",
          completed: true,
        },
        {
          step: "delivered",
          label: "Delivered to Doorstep",
          completed: false,
        },
      ],
    },
  ],
]);

// Active SSE Connections by orderId
const sseConnections: Map<string, Set<Response>> = new Map();

// Haversine distance in meters
function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Broadcast updated snapshot to SSE subscribers
export function broadcastOrderUpdate(orderId: string, snapshot: OrderTrackingSnapshot) {
  const clients = sseConnections.get(orderId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Add client to SSE channel
export function registerSSEClient(orderId: string, res: Response) {
  if (!sseConnections.has(orderId)) {
    sseConnections.set(orderId, new Set());
  }
  sseConnections.get(orderId)!.add(res);

  res.on("close", () => {
    const set = sseConnections.get(orderId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        sseConnections.delete(orderId);
      }
    }
  });
}

// Driver Location Ping
export function handleDriverLocationPing(payload: {
  driverId: string;
  orderId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  batteryLevel?: number;
  accuracy?: number;
  isQueuedOffline?: boolean;
}): { success: boolean; geofenceTriggered: boolean; tracking?: OrderTrackingSnapshot } {
  const { driverId, orderId, lat, lng, heading = 0, speed = 20, batteryLevel = 80 } = payload;
  const driver = driversDatabase.get(driverId);
  if (!driver) {
    return { success: false, geofenceTriggered: false };
  }

  // Update Driver in fast memory
  driver.currentCoords = { lat, lng, heading, speed };
  driver.batteryLevel = batteryLevel;
  driver.lastPingTime = Date.now();
  if (orderId) driver.activeOrderId = orderId;

  let geofenceTriggered = false;
  let updatedSnapshot: OrderTrackingSnapshot | undefined;

  const targetOrderId = orderId || driver.activeOrderId;
  if (targetOrderId && orderTrackingDatabase.has(targetOrderId)) {
    const snapshot = orderTrackingDatabase.get(targetOrderId)!;
    snapshot.driver = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicle: `${driver.vehicleType === "electric_scooter" ? "EV Scooter" : "Bike"} (${driver.vehicleNumber})`,
      rating: driver.rating,
      batteryLevel: driver.batteryLevel,
      coords: { lat, lng, heading, speed },
    };

    // Recalculate distance to customer
    const dist = calculateDistanceMeters({ lat, lng }, snapshot.customerCoords);
    snapshot.distanceMeters = dist;

    // Geofencing: if within 70m, mark arrived
    if (dist <= 70 && !snapshot.geofenceArrived && snapshot.status === "on_the_way") {
      snapshot.geofenceArrived = true;
      geofenceTriggered = true;
    }

    // Estimate ETA (average 20 km/h in city = 333 m/min)
    const minutes = Math.max(1, Math.round(dist / 333));
    snapshot.etaMinutes = snapshot.status === "delivered" ? 0 : minutes;

    updatedSnapshot = snapshot;
    broadcastOrderUpdate(targetOrderId, snapshot);
  }

  return { success: true, geofenceTriggered, tracking: updatedSnapshot };
}

// Get or Create Order Tracking
export function getOrCreateOrderTracking(orderId: string): OrderTrackingSnapshot {
  if (orderTrackingDatabase.has(orderId)) {
    return orderTrackingDatabase.get(orderId)!;
  }

  // Default fallback if order newly created
  const newSnapshot: OrderTrackingSnapshot = {
    orderId,
    status: "confirmed",
    etaMinutes: 24,
    distanceMeters: 2800,
    driver: {
      id: "DRV-101",
      name: "Arjun S.",
      phone: "+91 98450 12345",
      vehicle: "EV Scooter (AP-39-EQ-4421)",
      rating: 4.95,
      batteryLevel: 85,
      coords: { ...FRESHLANE_HUB_COORDS },
    },
    customerAddress: "KN Road, Tadepalligudem, 534102",
    customerCoords: {
      lat: 16.8165,
      lng: 81.5295,
    },
    storeCoords: FRESHLANE_HUB_COORDS,
    geofenceArrived: false,
    deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
    timeline: [
      {
        step: "placed",
        label: "Order Placed & Paid",
        time: "Just now",
        completed: true,
      },
      {
        step: "confirmed",
        label: "Hub Confirmed & Packed",
        time: "Just now",
        completed: true,
      },
      {
        step: "picked_up",
        label: "Picked Up by Rider",
        completed: false,
      },
      {
        step: "on_the_way",
        label: "On the Way",
        completed: false,
      },
      {
        step: "delivered",
        label: "Delivered to Doorstep",
        completed: false,
      },
    ],
  };

  orderTrackingDatabase.set(orderId, newSnapshot);
  return newSnapshot;
}

// Update Driver Order Status (Picked up -> On the way -> Delivered)
export function updateOrderStatusByDriver(
  orderId: string,
  newStatus: "picked_up" | "on_the_way" | "delivered",
  otp?: string,
  photoProof?: string
): { success: boolean; error?: string; snapshot?: OrderTrackingSnapshot } {
  const snapshot = getOrCreateOrderTracking(orderId);

  if (newStatus === "delivered") {
    if (otp && otp !== snapshot.deliveryOtp) {
      return { success: false, error: "Invalid Delivery OTP PIN" };
    }
    snapshot.status = "delivered";
    snapshot.etaMinutes = 0;
    snapshot.distanceMeters = 0;
    if (photoProof) snapshot.photoProof = photoProof;

    // Update timeline
    snapshot.timeline = snapshot.timeline.map((t) =>
      t.step === "delivered" ? { ...t, completed: true, time: "Just now" } : t
    );

    // Free up driver
    if (snapshot.driver?.id && driversDatabase.has(snapshot.driver.id)) {
      const drv = driversDatabase.get(snapshot.driver.id)!;
      drv.status = "available";
      drv.deliveriesToday += 1;
      drv.earningsToday += 85;
      drv.activeOrderId = undefined;
    }

    broadcastOrderUpdate(orderId, snapshot);

    // After delivered, close connections after small delay
    setTimeout(() => {
      const set = sseConnections.get(orderId);
      if (set) {
        for (const res of set) {
          try {
            res.end();
          } catch {}
        }
        sseConnections.delete(orderId);
      }
    }, 5000);

    return { success: true, snapshot };
  }

  snapshot.status = newStatus;
  const stepMap: Record<string, string> = {
    picked_up: "picked_up",
    on_the_way: "on_the_way",
  };
  const targetStep = stepMap[newStatus];

  snapshot.timeline = snapshot.timeline.map((t) => {
    if (t.step === targetStep) {
      return { ...t, completed: true, time: "Just now" };
    }
    if (newStatus === "on_the_way" && t.step === "picked_up") {
      return { ...t, completed: true };
    }
    return t;
  });

  broadcastOrderUpdate(orderId, snapshot);
  return { success: true, snapshot };
}

// Update driver online / offline toggle
export function setDriverOnline(driverId: string, isOnline: boolean): DriverEntity | null {
  const drv = driversDatabase.get(driverId);
  if (!drv) return null;
  drv.isOnline = isOnline;
  drv.status = isOnline ? (drv.activeOrderId ? "busy" : "available") : "offline";
  return drv;
}

// List all drivers for admin
export function getAllDrivers(): DriverEntity[] {
  return Array.from(driversDatabase.values());
}

// Add or update driver
export function addDriver(driver: Omit<DriverEntity, "id" | "lastPingTime">): DriverEntity {
  const id = `DRV-${100 + driversDatabase.size + 1}`;
  const newDrv: DriverEntity = {
    ...driver,
    id,
    lastPingTime: Date.now(),
  };
  driversDatabase.set(id, newDrv);
  return newDrv;
}

// Delete driver
export function deleteDriver(id: string): boolean {
  return driversDatabase.delete(id);
}

// Submit Customer Rating & Feedback
export function submitOrderRating(
  orderId: string,
  rating: { stars: number; tags: string[]; comment?: string }
): OrderTrackingSnapshot | null {
  const snapshot = orderTrackingDatabase.get(orderId);
  if (!snapshot) return null;

  snapshot.rating = {
    ...rating,
    submittedAt: new Date().toISOString(),
  };

  // If driver associated, slightly weight their score
  if (snapshot.driver?.id && driversDatabase.has(snapshot.driver.id)) {
    const drv = driversDatabase.get(snapshot.driver.id)!;
    drv.rating = Number(((drv.rating * 19 + rating.stars) / 20).toFixed(2));
  }

  broadcastOrderUpdate(orderId, snapshot);
  return snapshot;
}

// Basic Admin Analytics
export function getDispatchAnalytics() {
  const drivers = Array.from(driversDatabase.values());
  const onlineDrivers = drivers.filter((d) => d.isOnline).length;
  const busyDrivers = drivers.filter((d) => d.status === "busy").length;
  const totalDeliveriesToday = drivers.reduce((sum, d) => sum + d.deliveriesToday, 0) + 12;

  return {
    ordersToday: totalDeliveriesToday + 4,
    deliveredToday: totalDeliveriesToday,
    inProgress: busyDrivers,
    avgDeliveryMinutes: 23.4,
    onTimeRatePercent: 98.2,
    onlineDrivers,
    totalFleetSize: drivers.length,
    customerSatisfactionAvg: 4.92,
    greenKilometersEV: 148.5,
    co2SavedKg: 18.2,
  };
}
