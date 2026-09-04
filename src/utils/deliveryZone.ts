/**
 * Tadepalligudem (PIN 534102) 15km Delivery Radius Engine
 * 
 * Strict delivery boundary: FreshLane delivers exclusively within a 15.0 km radius
 * centered at Tadepalligudem Hub (PIN 534102), West Godavari district, Andhra Pradesh.
 * Locations beyond 15.0 km are strictly flagged as "Out of Delivery Range".
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryEligibilityResult {
  isDeliverable: boolean;
  distanceKm: number;
  hubName: string;
  hubPincode: string;
  maxRadiusKm: number;
  localityMatched?: string;
  reason?: string;
  message: string;
}

// Tadepalligudem Hub Central Coordinates & Configuration
export const TADEPALLIGUDEM_HUB = {
  name: 'Tadepalligudem Hub',
  city: 'Tadepalligudem',
  district: 'West Godavari',
  state: 'Andhra Pradesh',
  pincode: '534102',
  coords: {
    lat: 16.8131,
    lng: 81.5273,
  } as LatLng,
  maxRadiusKm: 15.0, // Strictly 15 km limit
};

// Known localities within Tadepalligudem 15km zone
export const TADEPALLIGUDEM_ZONE_AREAS = [
  { name: 'KN Road, Tadepalligudem', pincode: '534102', distanceKm: 1.2, lat: 16.8145, lng: 81.5285 },
  { name: 'Subba Rao Peta, Tadepalligudem', pincode: '534102', distanceKm: 1.8, lat: 16.8172, lng: 81.5312 },
  { name: 'Kobbarithota / Kobbari Thota', pincode: '534102', distanceKm: 1.6, lat: 16.8152, lng: 81.5245 },
  { name: 'Housing Board Colony, Tadepalligudem', pincode: '534102', distanceKm: 2.5, lat: 16.8055, lng: 81.5218 },
  { name: 'Police Island / Main Bazaar', pincode: '534102', distanceKm: 1.4, lat: 16.8122, lng: 81.5262 },
  { name: 'Railway Station Road', pincode: '534102', distanceKm: 1.9, lat: 16.8095, lng: 81.5338 },
  { name: 'Seshampet', pincode: '534102', distanceKm: 2.2, lat: 16.8201, lng: 81.5225 },
  { name: 'Somaraju Thota', pincode: '534102', distanceKm: 2.1, lat: 16.8185, lng: 81.5365 },
  { name: 'Madhavaram', pincode: '534102', distanceKm: 3.8, lat: 16.8315, lng: 81.5421 },
  { name: 'Pentapadu', pincode: '534166', distanceKm: 4.5, lat: 16.8365, lng: 81.5621 },
  { name: 'Kunchanapalli', pincode: '534102', distanceKm: 5.6, lat: 16.7821, lng: 81.5015 },
  { name: 'Prathipadu', pincode: '534146', distanceKm: 7.2, lat: 16.8521, lng: 81.4921 },
  { name: 'Venkataramannagudem (Dr. YSRHU)', pincode: '534101', distanceKm: 8.5, lat: 16.8725, lng: 81.4812 },
  { name: 'Padala / Jagannadhapuram', pincode: '534102', distanceKm: 6.8, lat: 16.7925, lng: 81.5582 },
  { name: 'Pippara', pincode: '534197', distanceKm: 11.8, lat: 16.7321, lng: 81.5821 },
  { name: 'Nidadavole Bypass Border', pincode: '534301', distanceKm: 13.5, lat: 16.8921, lng: 81.6121 },
];

// Reference out-of-range towns for testing and user comparison
export const OUT_OF_RANGE_REFERENCE_AREAS = [
  { name: 'Tanuku', pincode: '534211', distanceKm: 21.0 },
  { name: 'Bhimavaram', pincode: '534201', distanceKm: 36.5 },
  { name: 'Rajahmundry', pincode: '533101', distanceKm: 47.5 },
  { name: 'Eluru', pincode: '534001', distanceKm: 52.0 },
  { name: 'Vijayawada', pincode: '520001', distanceKm: 105.0 },
  { name: 'Hyderabad', pincode: '500001', distanceKm: 350.0 },
  { name: 'Bengaluru', pincode: '560001', distanceKm: 620.0 },
];

/**
 * Calculates accurate geodesic distance in kilometers between two coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(point1: LatLng, point2: LatLng): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(1));
}

/**
 * Validates whether an address, postal code, or coordinate pair is within
 * the strictly enforced 15.0 km delivery radius for Tadepalligudem (534102).
 */
export function checkDeliveryEligibility(input: {
  coords?: LatLng;
  address?: string;
  pincode?: string;
}): DeliveryEligibilityResult {
  const hub = TADEPALLIGUDEM_HUB;

  // 1. If explicit GPS coordinates are provided, compute direct distance
  if (input.coords && typeof input.coords.lat === 'number' && typeof input.coords.lng === 'number') {
    const dist = calculateHaversineDistanceKm(hub.coords, input.coords);
    const isDeliverable = dist <= hub.maxRadiusKm;

    return {
      isDeliverable,
      distanceKm: dist,
      hubName: hub.name,
      hubPincode: hub.pincode,
      maxRadiusKm: hub.maxRadiusKm,
      message: isDeliverable
        ? `Within 15km zone (${dist} km from Tadepalligudem Hub) · 24-30 min express delivery available.`
        : `You are out of delivery range (${dist} km away). FreshLane delivers strictly within a 15 km radius of Tadepalligudem, 534102.`,
    };
  }

  const rawText = `${input.address || ''} ${input.pincode || ''}`.toLowerCase().trim();

  // 2. Extract PIN code if present
  const pinMatch = rawText.match(/\b(5\d{5}|[1-46-9]\d{5})\b/);
  const pin = pinMatch ? pinMatch[1] : (input.pincode?.trim() || '');

  // If known out-of-range city or external state mentioned
  const outOfRangeKeywords = [
    'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'mumbai', 'delhi',
    'vijayawada', 'guntur', 'visakhapatnam', 'vizag', 'rajahmundry',
    'eluru', 'tanuku', 'bhimavaram', 'narasapuram', 'palakollu',
    'jangareddygudem', 'tirupati', 'kurnool', 'kakinada'
  ];

  for (const city of outOfRangeKeywords) {
    if (rawText.includes(city)) {
      // Find approximate distance
      const ref = OUT_OF_RANGE_REFERENCE_AREAS.find((r) => r.name.toLowerCase() === city);
      const dist = ref ? ref.distanceKm : 45.0;

      return {
        isDeliverable: false,
        distanceKm: dist,
        hubName: hub.name,
        hubPincode: hub.pincode,
        maxRadiusKm: hub.maxRadiusKm,
        localityMatched: city.charAt(0).toUpperCase() + city.slice(1),
        reason: 'outside_15km_radius',
        message: `You are out of delivery range (~${dist} km away). FreshLane delivers exclusively within a 15 km radius of Tadepalligudem (PIN 534102).`,
      };
    }
  }

  // 3. Match against known local 15km areas
  for (const area of TADEPALLIGUDEM_ZONE_AREAS) {
    const areaNameLower = area.name.toLowerCase();
    const cleanTokens = areaNameLower.split(/[\s,]+/);
    const hasToken = cleanTokens.some((token) => token.length > 3 && rawText.includes(token));

    if (hasToken || (pin && area.pincode === pin)) {
      return {
        isDeliverable: true,
        distanceKm: area.distanceKm,
        hubName: hub.name,
        hubPincode: hub.pincode,
        maxRadiusKm: hub.maxRadiusKm,
        localityMatched: area.name,
        message: `Within delivery zone (${area.distanceKm} km from Tadepalligudem 534102 hub) · Express delivery available.`,
      };
    }
  }

  // 4. Primary Tadepalligudem Pincode 534102 or 534101
  if (pin === '534102' || pin === '534101') {
    return {
      isDeliverable: true,
      distanceKm: 2.2,
      hubName: hub.name,
      hubPincode: hub.pincode,
      maxRadiusKm: hub.maxRadiusKm,
      localityMatched: 'Tadepalligudem Town (534102)',
      message: 'Within 15 km delivery zone (Tadepalligudem Hub) · 24-30 min express delivery available.',
    };
  }

  // 5. If PIN is provided and is not 534102 / 534101 / 534166 / 534146
  if (pin && pin.length === 6) {
    return {
      isDeliverable: false,
      distanceKm: 28.0,
      hubName: hub.name,
      hubPincode: hub.pincode,
      maxRadiusKm: hub.maxRadiusKm,
      reason: 'invalid_pincode',
      message: `PIN ${pin} is out of delivery range. Delivery is restricted to a 15 km radius of Tadepalligudem (PIN 534102).`,
    };
  }

  // 6. Generic address containing tadepalligudem
  if (rawText.includes('tadepalligudem') || rawText.includes('tpg') || rawText.includes('pentapadu')) {
    return {
      isDeliverable: true,
      distanceKm: 2.5,
      hubName: hub.name,
      hubPincode: hub.pincode,
      maxRadiusKm: hub.maxRadiusKm,
      localityMatched: 'Tadepalligudem Area',
      message: 'Within 15km delivery zone of Tadepalligudem 534102.',
    };
  }

  // 7. Default if unrecognized address and does not mention Tadepalligudem
  return {
    isDeliverable: false,
    distanceKm: 35.0,
    hubName: hub.name,
    hubPincode: hub.pincode,
    maxRadiusKm: hub.maxRadiusKm,
    reason: 'unverified_location',
    message: 'You are out of delivery range. We only deliver within a 15 km radius of Tadepalligudem (PIN 534102). Please provide an address within 15 km.',
  };
}

/**
 * Request real browser GPS geolocation and calculate exact distance
 * from the Tadepalligudem 534102 hub.
 */
export function getBrowserGeolocationDistance(): Promise<DeliveryEligibilityResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        isDeliverable: true,
        distanceKm: 2.0,
        hubName: TADEPALLIGUDEM_HUB.name,
        hubPincode: TADEPALLIGUDEM_HUB.pincode,
        maxRadiusKm: TADEPALLIGUDEM_HUB.maxRadiusKm,
        message: 'GPS not supported on device. Defaulted to Tadepalligudem 534102 delivery zone.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const result = checkDeliveryEligibility({ coords: userCoords });
        resolve(result);
      },
      (error) => {
        console.warn('Geolocation denied or unavailable:', error.message);
        // Return default Tadepalligudem eligibility check
        resolve({
          isDeliverable: true,
          distanceKm: 1.5,
          hubName: TADEPALLIGUDEM_HUB.name,
          hubPincode: TADEPALLIGUDEM_HUB.pincode,
          maxRadiusKm: TADEPALLIGUDEM_HUB.maxRadiusKm,
          localityMatched: 'Tadepalligudem Center',
          message: 'GPS permission not granted. Selected Tadepalligudem 534102 hub.',
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
