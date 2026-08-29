/**
 * What a rider delivery costs.
 *
 * The old answer was "the rider's fee is agreed between you and them" — which
 * tells a customer there is a cost, refuses to say what it is, and leaves them
 * to negotiate with a stranger. These are the agreed rules instead.
 *
 * Kept pure and free of any UI or network so the arithmetic can be tested and
 * so the estimator, the admin side and any future rider view cannot drift.
 */

/** KES per kilometre of road distance. */
export const RATE_PER_KM = 50;

/**
 * The floor, regardless of distance. Without it a 2km hop to Ngara quotes at
 * KES 100, which no rider in Nairobi accepts — and a quote that gets refused in
 * front of the customer is worse than no quote at all.
 */
export const MINIMUM_FEE = 300;

/** Flat extra for anything that won't sit comfortably on a boda. */
export const BULKY_SURCHARGE = 150;

export interface Origin {
  id: 'cbd' | 'industrial';
  name: string;
  detail: string;
  lat: number;
  lng: number;
}

/**
 * Where a rider starts from. Coordinates are approximate to the block — they
 * set the fee, not the navigation, and the rider gets a real map link.
 */
export const ORIGINS: Origin[] = [
  {
    id: 'cbd',
    name: 'Nairobi CBD',
    detail: 'Dynamic Mall, Tom Mboya Street — where in-stock items are collected',
    lat: -1.2836,
    lng: 36.8267,
  },
  {
    id: 'industrial',
    name: 'Industrial Area',
    detail: 'For goods coming out of clearing',
    lat: -1.3080,
    lng: 36.8500,
  },
];

export const originById = (id: string): Origin =>
  ORIGINS.find(o => o.id === id) || ORIGINS[0];

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Straight-line kilometres between two points. */
export const straightLineKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
};

/**
 * Nairobi's roads are not straight lines. When real routing is unavailable we
 * inflate the crow-flies distance rather than quoting a figure we know is too
 * low — under-quoting every delivery is the one outcome we can't have.
 */
export const ROAD_FACTOR = 1.4;

export const estimatedRoadKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => straightLineKm(a, b) * ROAD_FACTOR;

export interface Quote {
  km: number;
  distanceFee: number;
  surcharge: number;
  total: number;
  /** True when the floor set the price rather than the distance. */
  atMinimum: boolean;
}

/**
 * The fee for a given road distance. Rounded up to the nearest 10 shillings —
 * nobody settles a boda fare in single shillings.
 */
export const quoteDelivery = (km: number, bulky = false): Quote => {
  const safeKm = Math.max(0, Number.isFinite(km) ? km : 0);
  const raw = safeKm * RATE_PER_KM;
  const distanceFee = Math.max(Math.ceil(raw / 10) * 10, MINIMUM_FEE);
  const surcharge = bulky ? BULKY_SURCHARGE : 0;
  return {
    km: Math.round(safeKm * 10) / 10,
    distanceFee,
    surcharge,
    total: distanceFee + surcharge,
    atMinimum: raw < MINIMUM_FEE,
  };
};

/**
 * Road distance from a free routing service, falling back to the inflated
 * straight line when it can't be reached.
 *
 * A quote must always appear: a routing outage that showed the customer an
 * error would cost a sale, and the figure is presented as an estimate the
 * rider confirms either way.
 */
export const fetchRoadKm = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<{ km: number; routed: boolean }> => {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    const metres = data?.routes?.[0]?.distance;
    if (typeof metres === 'number' && metres > 0) {
      return { km: metres / 1000, routed: true };
    }
  } catch {
    // Fall through to the estimate.
  }
  return { km: estimatedRoadKm(from, to), routed: false };
};

/** Nairobi's rough bounding box — a sanity check, not a service area. */
export const isNearNairobi = (p: { lat: number; lng: number }): boolean =>
  p.lat > -1.55 && p.lat < -1.10 && p.lng > 36.60 && p.lng < 37.15;
