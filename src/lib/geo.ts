/** Straight-line distance in metres between two points */
export function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "450 m" or "2.4 km" */
export function formatDistance(m: number) {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

/** Minutes, at least 1 */
export function etaMinutes(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}
