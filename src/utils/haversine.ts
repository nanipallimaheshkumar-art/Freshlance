/**
 * Haversine Distance Utility
 * Calculates the great-circle distance between two GPS coordinates in meters.
 * Earth's mean radius is taken as 6,371,000 meters.
 */

export interface LatLngCoords {
  lat: number;
  lng: number;
}

/**
 * Calculates the distance in meters between two coordinates.
 * @param p1 Point 1 { lat, lng } in degrees
 * @param p2 Point 2 { lat, lng } in degrees
 * @returns Distance in meters (floating point)
 */
export function calculateHaversineDistanceMeters(
  p1: LatLngCoords,
  p2: LatLngCoords
): number {
  const R = 6371000; // Radius of Earth in meters
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convenience helper to format distance for human display (e.g. "45 m" or "1.2 km")
 */
export function formatDistanceDisplay(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
