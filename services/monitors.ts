import { supabase } from '../lib/supabase';

/**
 * Monitor catalogue for the /monitors storefront — single and small-quantity
 * buyers, priced off the supplier's 1–5pc sample sheet.
 *
 * Every rate lives in monitor_settings / monitor_shipping so the whole list
 * reprices from the dashboard without touching code.
 */

export interface MonitorModel {
  id: string;
  sizeInches: number;
  series?: string;
  modelCode: string;
  altCode?: string;
  widthPx?: number;
  heightPx?: number;
  resLabel?: string;
  refreshHz?: number;
  curved: boolean;
  baseType: 'Fixed' | 'Lifting';
  factoryUsd: number;
  /** IPS or VA, where the supplier states it. */
  panelType?: string;
  /** Off keeps a model out of the storefront entirely. */
  isActive: boolean;
  imageUrl?: string;
  /** Which colours this model can be had in. Black + White on nearly all. */
  availableColors: string[];
  sortOrder: number;
}

export interface MonitorColor {
  id: string;
  label: string;
  /** What the factory charges for the shell — pink is +USD 2. */
  upchargeUsd: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface MonitorSettings {
  usdToKes: number;
  alibabaPct: number;
  /** True supplier costs — the crate and the USD freight component. */
  crateUsd: number;
  freightUsd: number;
  /** The owner's cut. Internal only: it is never shown as a line, and it is
   *  excluded from Alibaba's 3% because Alibaba isn't paid on it. */
  marginUsd: number;
  speakersLowUsd: number;
  speakersHighUsd: number;
  rgbUsd: number;
  adjBaseUsd: number;
  certAdapterUsd: number;
  /** Added on top of the factory's own upcharge for a non-standard layout. */
  configMarkupKes: number;
  serviceFeePct: number;
  /** Service fee, per the How It Works page: from KES 3,000, becoming a
   *  percentage of the buying price once that passes the threshold. */
  serviceFeeKes: number;
  serviceFeePctOver: number;
  serviceFeeThresholdKes: number;
  /** Photo of the shipping crate. Any URL — a Cloudinary link or a path in
   *  public/. Blank hides the "how it's packed" prompt entirely. */
  cratePhotoUrl: string;
}

export interface PortOption {
  id: string;
  sizeGroup: string;
  label: string;
  /** What the factory charges for this layout — varies by size. */
  upchargeUsd: number;
  isStandard: boolean;
  sortOrder: number;
}

export const DEFAULT_SETTINGS: MonitorSettings = {
  usdToKes: 135,
  alibabaPct: 3,
  crateUsd: 25,
  freightUsd: 10,
  marginUsd: 15,
  speakersLowUsd: 3,
  speakersHighUsd: 1.5,
  rgbUsd: 2,
  adjBaseUsd: 7,
  certAdapterUsd: 2,
  configMarkupKes: 1900,
  serviceFeePct: 0,
  serviceFeeKes: 3000,
  // Zero on purpose: the fee is a flat 3,000. Set this above zero only if the
  // percentage rule should kick in for large orders.
  serviceFeePctOver: 0,
  serviceFeeThresholdKes: 100000,
  cratePhotoUrl: '',
};

/** Shipping is quoted per size band, not per model. */
export const sizeGroup = (inches: number): string =>
  inches < 22 ? '21'
    : inches < 26 ? '24'
      : inches < 30 ? '27'
        : inches < 33 ? '32'
          : inches < 36 ? '34'
            : inches < 45 ? '40'
              : '49';

const toModel = (d: any): MonitorModel => ({
  id: d.id,
  sizeInches: Number(d.size_inches),
  series: d.series || undefined,
  modelCode: d.model_code,
  altCode: d.alt_code || undefined,
  widthPx: d.width_px ?? undefined,
  heightPx: d.height_px ?? undefined,
  resLabel: d.res_label || undefined,
  refreshHz: d.refresh_hz ?? undefined,
  curved: !!d.curved,
  baseType: d.base_type === 'Lifting' ? 'Lifting' : 'Fixed',
  factoryUsd: Number(d.factory_usd),
  panelType: d.panel_type || undefined,
  isActive: d.is_active !== false,
  imageUrl: d.image_url || undefined,
  // Falls back to black/white so the page still works before the colour
  // migration has been run.
  availableColors: Array.isArray(d.available_colors) && d.available_colors.length
    ? d.available_colors
    : ['Black', 'White'],
  sortOrder: d.sort_order ?? 0,
});

export const fetchMonitorModels = async (activeOnly = true): Promise<MonitorModel[]> => {
  try {
    let q = supabase.from('monitor_models').select('*').order('size_inches').order('sort_order');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(toModel);
  } catch {
    return [];
  }
};

export const fetchMonitorSettings = async (): Promise<MonitorSettings> => {
  try {
    const { data, error } = await supabase.from('monitor_settings').select('*').eq('id', 1).single();
    if (error || !data) return DEFAULT_SETTINGS;
    return {
      usdToKes: Number(data.usd_to_kes),
      alibabaPct: Number(data.alibaba_pct),
      crateUsd: Number(data.crate_usd),
      freightUsd: Number(data.freight_usd ?? DEFAULT_SETTINGS.freightUsd),
      marginUsd: Number(data.margin_usd),
      speakersLowUsd: Number(data.speakers_low_usd),
      speakersHighUsd: Number(data.speakers_high_usd),
      rgbUsd: Number(data.rgb_usd),
      adjBaseUsd: Number(data.adj_base_usd),
      certAdapterUsd: Number(data.cert_adapter_usd),
      configMarkupKes: Number(data.config_markup_kes ?? DEFAULT_SETTINGS.configMarkupKes),
      serviceFeePct: Number(data.service_fee_pct),
      serviceFeeKes: Number(data.service_fee_kes ?? DEFAULT_SETTINGS.serviceFeeKes),
      serviceFeePctOver: Number(data.service_fee_pct_over ?? DEFAULT_SETTINGS.serviceFeePctOver),
      serviceFeeThresholdKes: Number(data.service_fee_threshold_kes ?? DEFAULT_SETTINGS.serviceFeeThresholdKes),
      cratePhotoUrl: data.crate_photo_url || '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/** size band -> KES per unit. A missing/null entry means "quote on request". */
export const fetchMonitorShipping = async (): Promise<Record<string, number | null>> => {
  try {
    const { data, error } = await supabase.from('monitor_shipping').select('*');
    if (error || !data) return {};
    const out: Record<string, number | null> = {};
    data.forEach((r: any) => {
      out[r.size_group] = r.shipping_kes == null ? null : Number(r.shipping_kes);
    });
    return out;
  } catch {
    return {};
  }
};

export const fetchPortOptions = async (): Promise<PortOption[]> => {
  try {
    const { data, error } = await supabase
      .from('monitor_port_options').select('*').order('size_group').order('sort_order');
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      sizeGroup: d.size_group,
      label: d.label,
      upchargeUsd: Number(d.upcharge_usd || 0),
      isStandard: !!d.is_standard,
      sortOrder: d.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
};

export const fetchMonitorColors = async (): Promise<MonitorColor[]> => {
  try {
    const { data, error } = await supabase.from('monitor_colors').select('*').order('sort_order');
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      label: d.label,
      upchargeUsd: Number(d.upcharge_usd || 0),
      isDefault: !!d.is_default,
      sortOrder: d.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
};

/** The colours one model can be had in, in catalogue order. */
export const colorsForModel = (m: MonitorModel, all: MonitorColor[]): MonitorColor[] =>
  all.filter(c => m.availableColors.includes(c.label))
    .sort((a, b) => a.sortOrder - b.sortOrder);

/** The layouts available for one monitor, standard first. */
export const optionsForModel = (m: MonitorModel, all: PortOption[]): PortOption[] =>
  all.filter(o => o.sizeGroup === sizeGroup(m.sizeInches))
    .sort((a, b) => a.sortOrder - b.sortOrder);

// ── Admin writes ────────────────────────────────────────────────────────────

/** Save any subset of the rates. One edit reprices the whole catalogue. */
export const updateMonitorSettings = async (
  p: Partial<MonitorSettings>
): Promise<{ success: boolean; error?: string }> => {
  const row: any = { updated_at: new Date().toISOString() };
  const map: Record<keyof MonitorSettings, string> = {
    usdToKes: 'usd_to_kes', alibabaPct: 'alibaba_pct', crateUsd: 'crate_usd',
    freightUsd: 'freight_usd', marginUsd: 'margin_usd',
    speakersLowUsd: 'speakers_low_usd', speakersHighUsd: 'speakers_high_usd',
    rgbUsd: 'rgb_usd', adjBaseUsd: 'adj_base_usd', certAdapterUsd: 'cert_adapter_usd',
    configMarkupKes: 'config_markup_kes', serviceFeePct: 'service_fee_pct',
    serviceFeeKes: 'service_fee_kes', serviceFeePctOver: 'service_fee_pct_over',
    serviceFeeThresholdKes: 'service_fee_threshold_kes',
    cratePhotoUrl: 'crate_photo_url',
  };
  (Object.keys(p) as (keyof MonitorSettings)[]).forEach(k => {
    if (p[k] !== undefined && map[k]) row[map[k]] = p[k];
  });
  const { error } = await supabase.from('monitor_settings').update(row).eq('id', 1);
  return { success: !error, error: error?.message };
};

/** null clears the figure, which makes that size read "quote on request". */
export const updateMonitorShipping = async (
  sizeGroup: string,
  shippingKes: number | null
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('monitor_shipping')
    .update({ shipping_kes: shippingKes, updated_at: new Date().toISOString() })
    .eq('size_group', sizeGroup);
  return { success: !error, error: error?.message };
};

export const updateMonitorModel = async (
  id: string,
  p: { factoryUsd?: number; imageUrl?: string | null; isActive?: boolean; availableColors?: string[] }
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {};
  if (p.factoryUsd !== undefined) row.factory_usd = p.factoryUsd;
  if (p.imageUrl !== undefined) row.image_url = p.imageUrl || null;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  if (p.availableColors !== undefined) row.available_colors = p.availableColors;
  const { error } = await supabase.from('monitor_models').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

/** Photos carved out of the supplier's PDF, served from public/monitors. */
export const STOCK_PHOTOS = Array.from({ length: 13 }, (_, i) =>
  `/monitors/photo-${String(i + 1).padStart(2, '0')}.jpg`);

export interface PriceResult {
  /** null when we have no shipping figure for this size — never invent one. */
  unitKES: number | null;
  /**
   * The two per-unit lines a buyer is shown. Buying price is everything about
   * the item itself, wooden crate included; shipping is what it costs to land
   * it. The third line — the service fee — is charged once per order, not per
   * unit, so it lives on the order total rather than here.
   */
  parts: {
    buyingKES: number;
    shippingKES: number;
  };
  /** Internal only. Never render this to a buyer: it exposes cost and margin. */
  breakdown: {
    factoryUsd: number;
    alibabaUsd: number;
    crateUsd: number;
    freightUsd: number;
    inclusionsUsd: number;
    marginUsd: number;
    colorUsd: number;
    goodsKES: number;
    shippingKES: number | null;
    configKES: number;
    serviceFeeKES: number;
  };
}

/**
 * What the buyer pays for one unit, landed in Nairobi.
 *
 * Every monitor ships fully specced — speakers, RGB, height-adjustable base and
 * a certified adapter — so the supplier's upcharges for those are costs baked
 * into the price rather than options presented to the buyer.
 *
 * `port` is the layout chosen. A non-standard one costs the factory's own
 * upcharge for that size (which is sometimes zero) plus the owner's markup.
 *
 * `color` is passed through at the factory's own cost with no markup — black
 * and white are free, pink is the supplier's USD 2.
 */
export const priceMonitor = (
  m: MonitorModel,
  s: MonitorSettings,
  shipping: Record<string, number | null>,
  port?: PortOption,
  color?: MonitorColor
): PriceResult => {
  const factoryUsd = m.factoryUsd;

  const speakers = (m.refreshHz || 0) >= 165 ? s.speakersHighUsd : s.speakersLowUsd;
  // A lifting base is already height-adjustable, so there's nothing to add.
  const adjBase = m.baseType === 'Fixed' ? s.adjBaseUsd : 0;
  const inclusionsUsd = speakers + s.rgbUsd + adjBase + s.certAdapterUsd;

  const portUsd = port && !port.isStandard ? port.upchargeUsd : 0;
  const colorUsd = color?.upchargeUsd || 0;
  const configKES = port && !port.isStandard ? s.configMarkupKes : 0;

  // Alibaba's cut is charged on the whole payment to the supplier, not just the
  // factory price — the crate, the freight, the speakers, the RGB, the base, the
  // adapter and any port or colour upcharge all go through the same invoice.
  const supplierUsd =
    factoryUsd + s.crateUsd + s.freightUsd + inclusionsUsd + portUsd + colorUsd;
  const alibabaUsd = supplierUsd * (s.alibabaPct / 100);

  // Buying price: the item, its crate, its options. The owner's cut is already
  // folded into the crate figure, so nothing here reads as margin.
  const goodsKES =
    (factoryUsd + alibabaUsd + s.crateUsd + inclusionsUsd + s.marginUsd + portUsd + colorUsd) * s.usdToKes
    + configKES;
  // Shipping: the per-size freight plus the USD freight component.
  const freightPartKES = s.freightUsd * s.usdToKes;
  const sizeFreight = shipping[sizeGroup(m.sizeInches)] ?? null;

  const breakdown = {
    factoryUsd, alibabaUsd, crateUsd: s.crateUsd, freightUsd: s.freightUsd, inclusionsUsd,
    marginUsd: s.marginUsd, colorUsd, goodsKES, shippingKES: sizeFreight, configKES, serviceFeeKES: 0,
  };

  if (sizeFreight == null) {
    return { unitKES: null, parts: { buyingKES: 0, shippingKES: 0 }, breakdown };
  }

  // Each line is rounded to the hundred so the parts always add up to the total
  // a buyer is quoted — a breakdown that doesn't reconcile destroys trust.
  const buyingKES = Math.ceil(goodsKES / 100) * 100;
  const shippingKES = Math.ceil((sizeFreight + freightPartKES) / 100) * 100;
  const legacyPct = (buyingKES + shippingKES) * (s.serviceFeePct / 100);

  return {
    unitKES: buyingKES + shippingKES + legacyPct,
    parts: { buyingKES, shippingKES },
    breakdown,
  };
};

/**
 * The service fee for an order. A flat figure — KES 3,000 — charged once per
 * order, never per unit and never a percentage.
 *
 * The percentage rule is opt-in: it only applies if serviceFeePctOver is set
 * above zero, which it isn't by default. (The How It Works page mentions 4%
 * above KES 100,000 for large orders — if that should apply here, set the
 * percentage in the dashboard and it takes over above the threshold.)
 */
export const serviceFeeFor = (buyingSubtotalKES: number, s: MonitorSettings): number => {
  if (buyingSubtotalKES <= 0) return 0;
  const usePct = s.serviceFeePctOver > 0 && buyingSubtotalKES > s.serviceFeeThresholdKes;
  const fee = usePct ? buyingSubtotalKES * (s.serviceFeePctOver / 100) : s.serviceFeeKes;
  return Math.ceil(fee / 100) * 100;
};

export const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

/** "27\" 2K 180Hz" — the buyer-facing name for a model. */
export const modelTitle = (m: MonitorModel) =>
  `${m.sizeInches}" ${m.resLabel || ''} ${m.refreshHz ? m.refreshHz + 'Hz' : ''}`.replace(/\s+/g, ' ').trim();

/**
 * The reference a buyer sees. The factory's "HP-" prefix is stripped, because
 * these are not Hewlett-Packard monitors and nobody should be able to read them
 * that way. The full code stays in the database for ordering.
 */
export const displayCode = (m: MonitorModel) => m.modelCode.replace(/^HP-/i, '');
