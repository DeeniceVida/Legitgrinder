import { supabase } from '../lib/supabase';

/**
 * Ergonomic chair catalogue for /corporate.
 *
 * The supplier prices chairs one way only: per piece at full 40HC container
 * volume. Everything below a container therefore carries the owner's small-lot
 * uplift, which is where most orders land.
 *
 * Every rate lives in chair_settings so the whole catalogue reprices from the
 * dashboard without touching code — same contract as the monitor list.
 */

export interface ChairColor {
  id: string;
  label: string;
  /** What the factory charges for this finish. Grey is usually +USD 3. */
  upchargeUsd: number;
  imageUrl?: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface ChairModel {
  id: string;
  /** 'Ergonomic' today; office and other chair types get their own line. */
  line: string;
  modelCode: string;
  name: string;
  description?: string;
  cartonLcm?: number;
  cartonWcm?: number;
  cartonHcm?: number;
  weightKg?: number;
  /** Cubic metres per carton — what freight is actually charged on. */
  cbm: number;
  /** Per-piece price at full container volume, base colour. */
  containerUsd: number;
  moq: number;
  isActive: boolean;
  brand?: string;
  /** The factory's own brand means nothing to a buyer, so it stays off by default. */
  brandPublic: boolean;
  sortOrder: number;
  colors: ChairColor[];
}

export interface ChairSettings {
  usdToKes: number;
  /** Charged on the whole payment to the supplier, not just the goods. */
  txnPct: number;
  /** The USD freight component inside the supplier's invoice — not the landed
   *  shipping figure, which is kesPerCbm. */
  freightUsd: number;
  /** Added per piece on any order below a full container. */
  smallLotUsd: number;
  /** Zero by default: on /corporate the owner's cut is the visible handling
   *  fee, not a hidden per-chair margin. */
  marginUsd: number;
  /** Sea freight + duty + clearing, per cubic metre. null until the owner sets
   *  it, and while it is null no price is shown anywhere. */
  kesPerCbm: number | null;
  /** Usable volume of a 40ft high-cube. */
  containerCbm: number;
}

/** One step of the tapering procurement & handling fee. */
export interface HandlingBand {
  id: string;
  /** null on the top band — no ceiling. */
  upToKes: number | null;
  pct: number;
  minFeeKes: number;
  sortOrder: number;
}

export const DEFAULT_CHAIR_SETTINGS: ChairSettings = {
  usdToKes: 135,
  txnPct: 3,
  freightUsd: 5,
  smallLotUsd: 20,
  marginUsd: 0,
  kesPerCbm: null,
  containerCbm: 68,
};

const toColor = (d: any): ChairColor => ({
  id: d.id,
  label: d.label,
  upchargeUsd: Number(d.upcharge_usd || 0),
  imageUrl: d.image_url || undefined,
  isDefault: !!d.is_default,
  sortOrder: d.sort_order ?? 0,
});

const toModel = (d: any): ChairModel => ({
  id: d.id,
  line: d.line || 'Ergonomic',
  modelCode: d.model_code,
  name: d.name,
  description: d.description || undefined,
  cartonLcm: d.carton_l_cm != null ? Number(d.carton_l_cm) : undefined,
  cartonWcm: d.carton_w_cm != null ? Number(d.carton_w_cm) : undefined,
  cartonHcm: d.carton_h_cm != null ? Number(d.carton_h_cm) : undefined,
  weightKg: d.weight_kg != null ? Number(d.weight_kg) : undefined,
  cbm: Number(d.cbm || 0),
  containerUsd: Number(d.container_usd),
  moq: d.moq ?? 10,
  isActive: d.is_active !== false,
  brand: d.brand || undefined,
  brandPublic: d.brand_public === true,
  sortOrder: d.sort_order ?? 0,
  colors: Array.isArray(d.chair_colors)
    ? d.chair_colors.map(toColor).sort((a: ChairColor, b: ChairColor) => a.sortOrder - b.sortOrder)
    : [],
});

export const fetchChairModels = async (
  activeOnly = true,
  line = 'Ergonomic'
): Promise<ChairModel[]> => {
  try {
    let q = supabase
      .from('chair_models')
      .select('*, chair_colors(*)')
      .eq('line', line)
      .order('sort_order');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(toModel);
  } catch {
    return [];
  }
};

export const fetchChairSettings = async (): Promise<ChairSettings> => {
  try {
    const { data, error } = await supabase.from('chair_settings').select('*').eq('id', 1).single();
    if (error || !data) return DEFAULT_CHAIR_SETTINGS;
    return {
      usdToKes: Number(data.usd_to_kes),
      txnPct: Number(data.txn_pct),
      freightUsd: Number(data.freight_usd),
      smallLotUsd: Number(data.small_lot_usd),
      marginUsd: Number(data.margin_usd),
      // The one figure allowed to stay unset. Number(null) is 0, which would
      // quote free shipping, so it is checked explicitly.
      kesPerCbm: data.kes_per_cbm == null ? null : Number(data.kes_per_cbm),
      containerCbm: Number(data.container_cbm || DEFAULT_CHAIR_SETTINGS.containerCbm),
    };
  } catch {
    return DEFAULT_CHAIR_SETTINGS;
  }
};

export const fetchHandlingBands = async (): Promise<HandlingBand[]> => {
  try {
    const { data, error } = await supabase
      .from('corporate_handling_bands').select('*').order('sort_order');
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      upToKes: d.up_to_kes == null ? null : Number(d.up_to_kes),
      pct: Number(d.pct),
      minFeeKes: Number(d.min_fee_kes || 0),
      sortOrder: d.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
};

// ── Pricing ─────────────────────────────────────────────────────────────────

/** How many of this model fill a 40ft high-cube — the container-price threshold. */
export const containerQty = (m: ChairModel, s: ChairSettings): number =>
  m.cbm > 0 ? Math.floor(s.containerCbm / m.cbm) : 0;

export interface ChairPrice {
  /** null while the freight rate is unset — never invent a figure. */
  unitKES: number | null;
  /** The two per-unit lines a buyer sees. The handling fee is charged once per
   *  order, so it lives on the order total rather than here. */
  parts: { goodsKES: number; shippingKES: number };
  /** True when this quantity is below a container and carries the uplift. */
  smallLot: boolean;
  /** Internal only. Never render: it exposes the factory cost. */
  breakdown: {
    containerUsd: number;
    colorUsd: number;
    smallLotUsd: number;
    freightUsd: number;
    txnUsd: number;
    marginUsd: number;
  };
}

/**
 * What one chair costs, landed in Nairobi, at a given order quantity.
 *
 * The supplier's sheet quotes container volume only, so anything short of a
 * full container carries the small-lot uplift. The transaction fee is charged
 * on the whole supplier invoice — goods, uplift and the freight component —
 * because that is what actually passes through the platform.
 */
export const priceChair = (
  m: ChairModel,
  s: ChairSettings,
  qty: number,
  color?: ChairColor
): ChairPrice => {
  const colorUsd = color?.upchargeUsd || 0;
  const full = containerQty(m, s);
  const smallLot = full <= 0 || qty < full;
  const smallLotUsd = smallLot ? s.smallLotUsd : 0;

  const supplierUsd = m.containerUsd + colorUsd + smallLotUsd + s.freightUsd;
  const txnUsd = supplierUsd * (s.txnPct / 100);

  const breakdown = {
    containerUsd: m.containerUsd, colorUsd, smallLotUsd,
    freightUsd: s.freightUsd, txnUsd, marginUsd: s.marginUsd,
  };

  if (s.kesPerCbm == null) {
    return { unitKES: null, parts: { goodsKES: 0, shippingKES: 0 }, smallLot, breakdown };
  }

  // Goods: the chair itself, its finish, the small-lot uplift and the platform's
  // cut. Shipping: the carton's own volume plus the USD freight component.
  const goodsRaw = (m.containerUsd + colorUsd + smallLotUsd + txnUsd + s.marginUsd) * s.usdToKes;
  const shipRaw = m.cbm * s.kesPerCbm + s.freightUsd * s.usdToKes;

  // Each line rounds to the hundred so the parts always add up to the quoted
  // total — a breakdown that doesn't reconcile destroys trust.
  const goodsKES = Math.ceil(goodsRaw / 100) * 100;
  const shippingKES = Math.ceil(shipRaw / 100) * 100;

  return { unitKES: goodsKES + shippingKES, parts: { goodsKES, shippingKES }, smallLot, breakdown };
};

/**
 * Procurement & handling — the ONE fee a corporate quote adds.
 *
 * Charged on goods value only. Freight and duty are deliberately excluded:
 * taking a percentage of somebody's taxes reads badly and invites the buyer to
 * re-check every other figure. The rate tapers as the order grows.
 */
export const handlingFee = (goodsSubtotalKES: number, bands: HandlingBand[]): number => {
  if (goodsSubtotalKES <= 0 || !bands.length) return 0;
  const ordered = [...bands].sort((a, b) => a.sortOrder - b.sortOrder);
  const band = ordered.find(b => b.upToKes == null || goodsSubtotalKES <= b.upToKes)
    ?? ordered[ordered.length - 1];
  const fee = Math.max(goodsSubtotalKES * (band.pct / 100), band.minFeeKes);
  return Math.ceil(fee / 100) * 100;
};

/** The supplier's '/'-separated blob, as a list. */
export const chairFeatures = (m: ChairModel): string[] =>
  (m.description || '').split('/').map(s => s.trim()).filter(Boolean);

export const defaultColor = (m: ChairModel): ChairColor | undefined =>
  m.colors.find(c => c.isDefault) || m.colors[0];

export const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

// ── Admin writes ────────────────────────────────────────────────────────────

/** Save any subset of the rates. One edit reprices the whole catalogue. */
export const updateChairSettings = async (
  p: Partial<ChairSettings>
): Promise<{ success: boolean; error?: string }> => {
  const map: Record<keyof ChairSettings, string> = {
    usdToKes: 'usd_to_kes', txnPct: 'txn_pct', freightUsd: 'freight_usd',
    smallLotUsd: 'small_lot_usd', marginUsd: 'margin_usd',
    kesPerCbm: 'kes_per_cbm', containerCbm: 'container_cbm',
  };
  const row: any = { updated_at: new Date().toISOString() };
  (Object.keys(p) as (keyof ChairSettings)[]).forEach(k => {
    if (p[k] !== undefined && map[k]) row[map[k]] = p[k];
  });
  const { error } = await supabase.from('chair_settings').update(row).eq('id', 1);
  return { success: !error, error: error?.message };
};

export const updateChairModel = async (
  id: string,
  p: { containerUsd?: number; isActive?: boolean; moq?: number; name?: string; brandPublic?: boolean }
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {};
  if (p.containerUsd !== undefined) row.container_usd = p.containerUsd;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  if (p.moq !== undefined) row.moq = p.moq;
  if (p.name !== undefined) row.name = p.name;
  if (p.brandPublic !== undefined) row.brand_public = p.brandPublic;
  const { error } = await supabase.from('chair_models').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

export const updateChairColor = async (
  id: string,
  p: { upchargeUsd?: number; imageUrl?: string | null }
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {};
  if (p.upchargeUsd !== undefined) row.upcharge_usd = p.upchargeUsd;
  if (p.imageUrl !== undefined) row.image_url = p.imageUrl || null;
  const { error } = await supabase.from('chair_colors').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

export const updateHandlingBand = async (
  id: string,
  p: { pct?: number; upToKes?: number | null; minFeeKes?: number }
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {};
  if (p.pct !== undefined) row.pct = p.pct;
  if (p.upToKes !== undefined) row.up_to_kes = p.upToKes;
  if (p.minFeeKes !== undefined) row.min_fee_kes = p.minFeeKes;
  const { error } = await supabase.from('corporate_handling_bands').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};
