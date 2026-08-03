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
  crateUsd: number;
  marginUsd: number;
  speakersLowUsd: number;
  speakersHighUsd: number;
  rgbUsd: number;
  adjBaseUsd: number;
  certAdapterUsd: number;
  altConfigKes: number;
  serviceFeePct: number;
}

export interface PortConfig {
  id: string;
  label: string;
  isStandard: boolean;
  sortOrder: number;
}

export const DEFAULT_SETTINGS: MonitorSettings = {
  usdToKes: 130,
  alibabaPct: 3,
  crateUsd: 25,
  marginUsd: 15,
  speakersLowUsd: 3,
  speakersHighUsd: 1.5,
  rgbUsd: 2,
  adjBaseUsd: 7,
  certAdapterUsd: 2,
  altConfigKes: 1900,
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
      marginUsd: Number(data.margin_usd),
      speakersLowUsd: Number(data.speakers_low_usd),
      speakersHighUsd: Number(data.speakers_high_usd),
      rgbUsd: Number(data.rgb_usd),
      adjBaseUsd: Number(data.adj_base_usd),
      certAdapterUsd: Number(data.cert_adapter_usd),
      altConfigKes: Number(data.alt_config_kes),
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

export const fetchPortConfigs = async (): Promise<PortConfig[]> => {
  try {
    const { data, error } = await supabase.from('monitor_port_configs').select('*').order('sort_order');
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id, label: d.label, isStandard: !!d.is_standard, sortOrder: d.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
};

export interface PriceResult {
  /** null when we have no shipping figure for this size — never invent one. */
  unitKES: number | null;
  /** Internal only. Never render this to a buyer: it exposes cost and margin. */
  breakdown: {
    factoryUsd: number;
    alibabaUsd: number;
    crateUsd: number;
    inclusionsUsd: number;
    marginUsd: number;
    goodsKES: number;
    shippingKES: number | null;
    altConfigKES: number;
    serviceFeeKES: number;
  };
}

/**
 * What the buyer pays for one unit, landed in Nairobi.
 *
 * Every monitor ships fully specced — speakers, RGB, height-adjustable base and
 * a certified adapter — so the supplier's upcharges for those are costs baked
 * into the price rather than options presented to the buyer.
 */
export const priceMonitor = (
  m: MonitorModel,
  s: MonitorSettings,
  shipping: Record<string, number | null>,
  altConfig = false
): PriceResult => {
  const factoryUsd = m.factoryUsd;
  const alibabaUsd = factoryUsd * (s.alibabaPct / 100);

  const speakers = (m.refreshHz || 0) >= 165 ? s.speakersHighUsd : s.speakersLowUsd;
  // A lifting base is already height-adjustable, so there's nothing to add.
  const adjBase = m.baseType === 'Fixed' ? s.adjBaseUsd : 0;
  const inclusionsUsd = speakers + s.rgbUsd + adjBase + s.certAdapterUsd;

  const goodsKES = (factoryUsd + alibabaUsd + s.crateUsd + inclusionsUsd + s.marginUsd) * s.usdToKes;
  const shippingKES = shipping[sizeGroup(m.sizeInches)] ?? null;
  const altConfigKES = altConfig ? s.altConfigKes : 0;

  const breakdown = {
    factoryUsd, alibabaUsd, crateUsd: s.crateUsd, inclusionsUsd,
    marginUsd: s.marginUsd, goodsKES, shippingKES, altConfigKES, serviceFeeKES: 0,
  };

  if (shippingKES == null) return { unitKES: null, breakdown };

  const sub = goodsKES + shippingKES + altConfigKES;
  const serviceFeeKES = sub * (s.serviceFeePct / 100);
  breakdown.serviceFeeKES = serviceFeeKES;

  // Rounded up to the nearest 100 — retail prices shouldn't end in odd shillings.
  return { unitKES: Math.ceil((sub + serviceFeeKES) / 100) * 100, breakdown };
};

export const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

/** "27\" 2K 180Hz" — the buyer-facing name for a model. */
export const modelTitle = (m: MonitorModel) =>
  `${m.sizeInches}" ${m.resLabel || ''} ${m.refreshHz ? m.refreshHz + 'Hz' : ''}`.replace(/\s+/g, ' ').trim();
