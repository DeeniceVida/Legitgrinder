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
  imageUrl?: string;
  sortOrder: number;
}

export interface MonitorSettings {
  usdToKes: number;
  alibabaPct: number;
  /** Crate carries $5 of the owner's cut; freight carries the other $10. */
  crateUsd: number;
  freightUsd: number;
  marginUsd: number;
  speakersLowUsd: number;
  speakersHighUsd: number;
  rgbUsd: number;
  adjBaseUsd: number;
  certAdapterUsd: number;
  /** Added on top of the factory's own upcharge for a non-standard layout. */
  configMarkupKes: number;
  serviceFeePct: number;
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
  crateUsd: 30,
  freightUsd: 10,
  marginUsd: 0,
  speakersLowUsd: 3,
  speakersHighUsd: 1.5,
  rgbUsd: 2,
  adjBaseUsd: 7,
  certAdapterUsd: 2,
  configMarkupKes: 1900,
  serviceFeePct: 0,
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
  imageUrl: d.image_url || undefined,
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
  p: { factoryUsd?: number; imageUrl?: string | null; isActive?: boolean }
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {};
  if (p.factoryUsd !== undefined) row.factory_usd = p.factoryUsd;
  if (p.imageUrl !== undefined) row.image_url = p.imageUrl || null;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  const { error } = await supabase.from('monitor_models').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

/** Photos carved out of the supplier's PDF, served from public/monitors. */
export const STOCK_PHOTOS = Array.from({ length: 13 }, (_, i) =>
  `/monitors/photo-${String(i + 1).padStart(2, '0')}.jpg`);

export interface PriceResult {
  /** null when we have no shipping figure for this size — never invent one. */
  unitKES: number | null;
  /** Internal only. Never render this to a buyer: it exposes cost and margin. */
  breakdown: {
    factoryUsd: number;
    alibabaUsd: number;
    crateUsd: number;
    freightUsd: number;
    inclusionsUsd: number;
    marginUsd: number;
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
 */
export const priceMonitor = (
  m: MonitorModel,
  s: MonitorSettings,
  shipping: Record<string, number | null>,
  port?: PortOption
): PriceResult => {
  const factoryUsd = m.factoryUsd;
  const alibabaUsd = factoryUsd * (s.alibabaPct / 100);

  const speakers = (m.refreshHz || 0) >= 165 ? s.speakersHighUsd : s.speakersLowUsd;
  // A lifting base is already height-adjustable, so there's nothing to add.
  const adjBase = m.baseType === 'Fixed' ? s.adjBaseUsd : 0;
  const inclusionsUsd = speakers + s.rgbUsd + adjBase + s.certAdapterUsd;

  const portUsd = port && !port.isStandard ? port.upchargeUsd : 0;
  const goodsKES =
    (factoryUsd + alibabaUsd + s.crateUsd + s.freightUsd + inclusionsUsd + s.marginUsd + portUsd) * s.usdToKes;
  const shippingKES = shipping[sizeGroup(m.sizeInches)] ?? null;
  const configKES = port && !port.isStandard ? s.configMarkupKes : 0;

  const breakdown = {
    factoryUsd, alibabaUsd, crateUsd: s.crateUsd, freightUsd: s.freightUsd, inclusionsUsd,
    marginUsd: s.marginUsd, goodsKES, shippingKES, configKES, serviceFeeKES: 0,
  };

  if (shippingKES == null) return { unitKES: null, breakdown };

  const sub = goodsKES + shippingKES + configKES;
  const serviceFeeKES = sub * (s.serviceFeePct / 100);
  breakdown.serviceFeeKES = serviceFeeKES;

  // Rounded up to the nearest 100 — retail prices shouldn't end in odd shillings.
  return { unitKES: Math.ceil((sub + serviceFeeKES) / 100) * 100, breakdown };
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
