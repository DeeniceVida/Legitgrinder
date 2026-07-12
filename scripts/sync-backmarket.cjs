#!/usr/bin/env node
/**
 * LegitGrinder — Back Market Monthly Price Sync
 * =============================================
 * Fetches refurbished ("Good" condition) USD prices from backmarket.com
 * for every pricelist variant, applies the official LegitGrinder fee
 * formula, and updates Supabase (pricelist_variants).
 *
 * Design constraints:
 *  - GENTLE: randomized 25–55s delays between requests, hard monthly cadence.
 *  - RESUMABLE: state file lets an interrupted run continue where it left off.
 *  - RESPECTFUL: backs off 5 minutes on a 403/challenge, max 2 retries,
 *    then skips. Never hammers.
 *  - Variants flagged is_manual_override are NEVER touched.
 *
 * Usage:
 *   node scripts/sync-backmarket.cjs                 # full sync
 *   node scripts/sync-backmarket.cjs --dry-run       # fetch + calculate, no DB writes
 *   node scripts/sync-backmarket.cjs --limit 3       # only first 3 models (testing)
 *   node scripts/sync-backmarket.cjs --fast          # short delays (testing only!)
 *
 * Scheduled via Windows Task Scheduler (see scripts/README-sync.md).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(__dirname, 'backmarket-url-cache.json');
const STATE_FILE = path.join(__dirname, 'sync-state.json');
const LOG_FILE = path.join(__dirname, 'sync-log.txt');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FAST = ARGS.includes('--fast');
const LIMIT = ARGS.includes('--limit') ? parseInt(ARGS[ARGS.indexOf('--limit') + 1], 10) : Infinity;

const BASE = 'https://www.backmarket.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Delay window between Back Market requests (ms)
const DELAY_MIN = FAST ? 6000 : 25000;
const DELAY_MAX = FAST ? 12000 : 55000;

// Skip variants synced within this many days (monthly cadence + resume support)
const FRESH_DAYS = 20;

// Sanity bounds for a phone price in USD
const USD_MIN = 40;
const USD_MAX = 3500;

// ----------------------------------------------------------------------------
// Fee formula — MUST mirror utils/priceCalculations.ts + constants.ts
// ----------------------------------------------------------------------------
const KES_PER_USD = 135;
const FEES = { SHIPPING_FLAT_USD: 20, SHIPPING_PERCENT: 0.035, THRESHOLD_USD: 750, SERVICE_FEE_FIXED_USD: 30, SERVICE_FEE_PERCENT_LARGE: 0.045 };

function calculateKES(usd) {
  if (!usd || usd <= 0) return 0;
  const shipping = FEES.SHIPPING_FLAT_USD + usd * FEES.SHIPPING_PERCENT;
  const service = usd <= FEES.THRESHOLD_USD ? FEES.SERVICE_FEE_FIXED_USD : usd * FEES.SERVICE_FEE_PERCENT_LARGE;
  return Math.ceil((usd + shipping + service) * KES_PER_USD);
}

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitterDelay = () => sleep(DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN));

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    raw.split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  );
}

/**
 * Fetch via system curl (NOT Node fetch).
 * Back Market's bot protection (DataDome) fingerprints the TLS client:
 * Node/undici gets an instant 403 while curl's fingerprint passes.
 * Windows 10+ ships curl.exe natively.
 */
function curlFetch(url) {
  const tmp = path.join(os.tmpdir(), `bm_sync_${process.pid}_${Date.now()}.html`);
  try {
    const status = execFileSync('curl', [
      '-s', '-L', '--max-time', '45',
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-o', tmp,
      '-w', '%{http_code}',
      url,
    ], { encoding: 'utf8', timeout: 60000 });
    const code = parseInt(String(status).trim(), 10) || 0;
    const body = fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '';
    return { code, body };
  } catch (e) {
    return { code: 0, body: '', err: e.message };
  } finally {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

/** Polite fetch with 403/429 backoff. Returns HTML string or null. */
async function politeFetch(url, attempt = 1) {
  const { code, body, err } = curlFetch(url);
  if (err) {
    log(`  ! Fetch error on ${url}: ${err}`);
    if (attempt <= 2) { await sleep(20000); return politeFetch(url, attempt + 1); }
    return null;
  }
  if (code === 403 || code === 429) {
    if (attempt > 2) { log(`  ! ${code} on ${url} — giving up after ${attempt} attempts`); return null; }
    const wait = FAST ? 30000 : 300000; // 5 min cooldown (30s in fast mode)
    log(`  ! ${code} on ${url} — cooling down ${wait / 1000}s (attempt ${attempt})`);
    await sleep(wait);
    return politeFetch(url, attempt + 1);
  }
  if (code < 200 || code >= 300) { log(`  ! HTTP ${code} on ${url}`); return null; }
  return body;
}

// ----------------------------------------------------------------------------
// Parsing
// ----------------------------------------------------------------------------
/** Extract schema.org Product JSON-LD from a product page. */
function parseProductLD(html) {
  const blocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const b of blocks) {
    try {
      const json = JSON.parse(b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
      const arr = Array.isArray(json) ? json : [json];
      for (const d of arr) {
        if (d['@type'] === 'Product' && d.offers) {
          const offer = Array.isArray(d.offers) ? d.offers[0] : d.offers;
          const price = parseFloat(offer.price);
          if (offer.priceCurrency === 'USD' && price > 0) return { name: d.name, priceUSD: price };
        }
      }
    } catch { /* next block */ }
  }
  return null;
}

/** Normalize capacity from a slug fragment: "128-gb" → "128GB", "1-tb"/"1000-gb" → "1TB" */
function normCapacity(num, unit) {
  const n = parseInt(num, 10);
  if (unit === 'tb') return `${n}TB`;
  if (n >= 1000) return `${n / 1000}TB`;
  return `${n}GB`;
}

/** Extract full-UUID product links + capacity from any BM page HTML. */
function extractProductLinks(html) {
  const links = [...new Set(html.match(/\/en-us\/p\/[a-z0-9-]+\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g) || [])];
  const out = [];
  for (const l of links) {
    const slug = l.split('/')[3];
    const m = slug.match(/-(\d+)-?(gb|tb)\b|-(\d+)-?(gb|tb)-/) || slug.match(/(\d+)-?(gb|tb)/);
    if (m) {
      const num = m[1] || m[3];
      const unit = (m[2] || m[4] || 'gb').toLowerCase();
      out.push({ url: BASE + l, slug, capacity: normCapacity(num, unit) });
    }
  }
  return out;
}

/** Special-case model names whose Back Market slug differs from a naive slugify. */
const SLUG_OVERRIDES = {
  'iphone se (2nd gen)': 'iphone-se-2020',
  'iphone se (3rd gen)': 'iphone-se-2022',
};

/** Candidate landing slugs for a model, by brand. */
function slugCandidates(modelName, brand) {
  const key = modelName.toLowerCase().trim();
  if (SLUG_OVERRIDES[key]) return [SLUG_OVERRIDES[key]];
  const base = key.replace(/\+/g, '-plus').replace(/[()]/g, '').replace(/\s+/g, '-');
  const c = [];
  if (brand === 'iphone') {
    c.push(base, `apple-${base}`, `unlocked-${base}`, `and-unlocked-${base}`);
  } else if (brand === 'samsung') {
    c.push(`galaxy-${base}`, `samsung-galaxy-${base}`, base, `samsung-${base}`, `unlocked-galaxy-${base}`);
  } else if (brand === 'pixel') {
    c.push(base, `google-${base}`, `google-pixel-${base.replace(/^pixel-/, '')}`);
  } else {
    c.push(base);
  }
  return c;
}

/** Product-page slug prefix for a model (used to match links on brand category pages). */
function productSlugPrefixes(modelName, brand) {
  const key = modelName.toLowerCase().trim();
  if (SLUG_OVERRIDES[key]) return [SLUG_OVERRIDES[key]];
  const base = key.replace(/\+/g, '-plus').replace(/[()]/g, '').replace(/\s+/g, '-');
  if (brand === 'samsung') return [`galaxy-${base}`, `samsung-galaxy-${base}`];
  if (brand === 'pixel') return [`google-${base}`, base];
  return [base];
}

/** "128GB" → "128", "1TB" → "1000" (sitemap slugs use -1000-gb for 1TB) */
function capToSlugNum(capacity) {
  const m = String(capacity).toUpperCase().match(/^(\d+)\s*(GB|TB)$/);
  if (!m) return null;
  return m[2] === 'TB' ? String(parseInt(m[1], 10) * 1000) : m[1];
}

/** Pick the best product link for a capacity: prefer fully-unlocked, avoid carrier-locked. */
function pickProductLink(links, capacity) {
  const matching = links.filter((p) => p.capacity === capacity);
  if (matching.length === 0) return null;
  const unlocked = matching.find((p) => p.slug.includes('fully-unlocked'))
    || matching.find((p) => p.slug.includes('unlocked'))
    || matching.find((p) => !/att|verizon|t-mobile|tmobile|sprint/.test(p.slug));
  return (unlocked || matching[0]).url;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  log(`=== Back Market Sync starting ${DRY_RUN ? '(DRY RUN)' : ''}${FAST ? ' (FAST)' : ''} ===`);

  const env = loadEnv();
  const { createClient } = require(path.join(ROOT, 'node_modules', '@supabase/supabase-js'));
  // RLS blocks anon-key WRITES silently (0 rows, no error) — the service role key is required.
  const dbKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !DRY_RUN) {
    log('⚠️  SUPABASE_SERVICE_ROLE_KEY missing from .env.local — price UPDATES WILL NOT PERSIST (RLS). Add it from Supabase Dashboard → Settings → API.');
  }
  const supabase = createClient(env.VITE_SUPABASE_URL, dbKey);

  // 1. Load models + variants
  const { data: models, error: mErr } = await supabase.from('pricelist_models').select('*').order('name');
  if (mErr) throw new Error(`DB models: ${mErr.message}`);
  const { data: variants, error: vErr } = await supabase.from('pricelist_variants').select('*');
  if (vErr) throw new Error(`DB variants: ${vErr.message}`);
  log(`Loaded ${models.length} models, ${variants.length} variants from Supabase`);

  const cache = loadJSON(CACHE_FILE, {});
  const state = loadJSON(STATE_FILE, {});
  const now = Date.now();
  const freshMs = FRESH_DAYS * 24 * 3600 * 1000;

  // 2. Discovery — landings sitemap (only if a model lacks cached landing URLs)
  const modelsToProcess = models.slice(0, LIMIT);
  const variantsByModel = (m) => variants.filter((v) => v.model_id === m.id && v.status !== 'archived');
  const needDiscovery = modelsToProcess.filter((m) => {
    const entry = cache[m.name];
    if (!entry) return true;
    // Needs discovery if any capacity has neither a product URL nor a capacity-landing URL
    return variantsByModel(m).some((v) => !entry.capacities?.[v.capacity] && !entry.capLandings?.[v.capacity]) && !entry.landingUrl;
  });

  if (needDiscovery.length > 0) {
    log(`Discovery needed for ${needDiscovery.length} models — fetching landings sitemap`);
    const xml = await politeFetch(`${BASE}/sitemap_landings.xml`);
    if (xml) {
      const landingSlugMap = {};
      for (const loc of xml.match(/<loc>([^<]+)<\/loc>/g) || []) {
        const url = loc.slice(5, -6);
        const m = url.match(/\/en-us\/l\/([a-z0-9-]+)\/[a-f0-9-]{36}$/);
        if (m) landingSlugMap[m[1]] = url;
      }
      log(`Sitemap: ${Object.keys(landingSlugMap).length} landing slugs indexed`);

      for (const model of needDiscovery) {
        const entry = cache[model.name] || {};
        entry.capLandings = entry.capLandings || {};
        const candidates = slugCandidates(model.name, model.brand);

        // 2a. Capacity-specific landing pages (best: page is exactly model+capacity)
        for (const v of variantsByModel(model)) {
          if (entry.capLandings[v.capacity]) continue;
          const num = capToSlugNum(v.capacity);
          if (!num) continue;
          for (const cand of candidates) {
            const slug = `${cand}-${num}-gb`;
            if (landingSlugMap[slug]) { entry.capLandings[v.capacity] = landingSlugMap[slug]; break; }
          }
        }

        // 2b. Model-level landing page (fallback source of product links)
        if (!entry.landingUrl) {
          for (const cand of candidates) {
            if (landingSlugMap[cand]) { entry.landingUrl = landingSlugMap[cand]; entry.slug = cand; break; }
          }
        }

        const capsFound = Object.keys(entry.capLandings).length;
        if (capsFound === 0 && !entry.landingUrl) {
          log(`  ? No landing pages found for "${model.name}" (${model.brand})`);
        } else {
          log(`  + "${model.name}": ${capsFound} capacity landings${entry.landingUrl ? ' + model landing' : ''}`);
        }
        cache[model.name] = entry;
      }
      saveJSON(CACHE_FILE, cache);

      // 2c. Brand category-page fallback — models absent from the landings sitemap
      // (newer iPhones, Galaxy S-series, Pixels) often appear on brand category pages.
      const stillLacking = needDiscovery.filter((m) => {
        const e = cache[m.name] || {};
        return !e.landingUrl && Object.keys(e.capLandings || {}).length === 0
          && variantsByModel(m).some((v) => !e.capacities?.[v.capacity]);
      });
      if (stillLacking.length > 0) {
        const CATEGORY_SLUGS = {
          iphone: ['iphone', 'unlocked-iphone'],
          samsung: ['samsung', 'android-smartphones'],
          pixel: ['google-pixel', 'android-smartphones'],
        };
        for (const brand of [...new Set(stillLacking.map((m) => m.brand))]) {
          const catUrls = (CATEGORY_SLUGS[brand] || []).map((s) => landingSlugMap[s]).filter(Boolean);
          const brandModels = stillLacking.filter((m) => m.brand === brand);
          const prefixPairs = brandModels.flatMap((m) =>
            productSlugPrefixes(m.name, m.brand).map((p) => ({ model: m, prefix: p })));

          for (const catUrl of catUrls) {
            log(`[discovery] scanning ${brand} category page for ${brandModels.length} unresolved models…`);
            await jitterDelay();
            const html = await politeFetch(catUrl);
            if (!html) continue;
            let matched = 0;
            for (const link of extractProductLinks(html)) {
              const candidates = prefixPairs.filter(({ prefix }) => link.slug.startsWith(prefix + '-'));
              if (candidates.length === 0) continue;
              // Longest prefix wins, and reject links that belong to a longer model variant
              const best = candidates.sort((a, b) => b.prefix.length - a.prefix.length)[0];
              const after = link.slug.slice(best.prefix.length + 1);
              if (/^(pro|plus|max|ultra|mini|fe|edge|fold|xl|a)\b/.test(after)) continue;
              const entry = (cache[best.model.name] = cache[best.model.name] || {});
              entry.capacities = entry.capacities || {};
              if (!entry.capacities[link.capacity]) { entry.capacities[link.capacity] = link.url; matched++; }
            }
            if (matched > 0) log(`[discovery] ${brand} category page resolved ${matched} product URLs`);
          }
        }
        saveJSON(CACHE_FILE, cache);
      }
    } else {
      log('  ! Could not fetch landings sitemap — proceeding with cached URLs only');
    }
  }

  // 3. Sync each model
  const summary = { updated: 0, skippedFresh: 0, skippedManual: 0, noUrl: 0, failed: 0 };

  for (const model of modelsToProcess) {
    const modelVariants = variants.filter((v) => v.model_id === model.id && v.status !== 'archived');
    if (modelVariants.length === 0) continue;

    const pending = modelVariants.filter((v) => {
      if (v.is_manual_override) { summary.skippedManual++; return false; }
      const st = state[v.id];
      if (st?.syncedAt && now - st.syncedAt < freshMs) { summary.skippedFresh++; return false; }
      return true;
    });
    if (pending.length === 0) continue;

    const entry = cache[model.name] || {};
    entry.capacities = entry.capacities || {};
    entry.capLandings = entry.capLandings || {};

    // 3a. Resolve product URLs for pending capacities (cached across runs)
    for (const v of pending) {
      if (entry.capacities[v.capacity]) continue;

      // Preferred: the capacity-specific landing page for this exact model+capacity
      if (entry.capLandings[v.capacity]) {
        log(`[${model.name} ${v.capacity}] resolving product URL from capacity landing…`);
        await jitterDelay();
        const html = await politeFetch(entry.capLandings[v.capacity]);
        if (html) {
          const url = pickProductLink(extractProductLinks(html), v.capacity);
          if (url) { entry.capacities[v.capacity] = url; saveJSON(CACHE_FILE, { ...cache, [model.name]: entry }); }
        }
      }
    }

    // Fallback: one model-level landing fetch can resolve several capacities at once
    const stillMissing = pending.filter((v) => !entry.capacities[v.capacity]);
    if (stillMissing.length > 0 && entry.landingUrl && !entry.modelLandingTried) {
      log(`[${model.name}] fetching model landing page for remaining capacities…`);
      await jitterDelay();
      const html = await politeFetch(entry.landingUrl);
      if (html) {
        entry.modelLandingTried = true; // only mark tried on a successful fetch
        const links = extractProductLinks(html).filter((p) => p.slug.startsWith(entry.slug || '###'));
        for (const v of stillMissing) {
          const url = pickProductLink(links.length ? links : extractProductLinks(html), v.capacity);
          if (url) entry.capacities[v.capacity] = url;
        }
      }
      cache[model.name] = entry;
      saveJSON(CACHE_FILE, cache);
    }

    // 3b. Fetch product page per pending variant
    for (const v of pending) {
      const url = entry.capacities[v.capacity];
      if (!url) { log(`[${model.name} ${v.capacity}] no product URL — skipping`); summary.noUrl++; continue; }

      await jitterDelay();
      const html = await politeFetch(url);
      if (!html) { summary.failed++; continue; }

      const ld = parseProductLD(html);
      if (!ld) { log(`[${model.name} ${v.capacity}] no JSON-LD price found`); summary.failed++; continue; }
      if (ld.priceUSD < USD_MIN || ld.priceUSD > USD_MAX) {
        log(`[${model.name} ${v.capacity}] price $${ld.priceUSD} outside sanity bounds — skipping`);
        summary.failed++; continue;
      }

      const newKES = calculateKES(ld.priceUSD);
      const delta = v.price_kes ? (((newKES - v.price_kes) / v.price_kes) * 100).toFixed(1) : 'n/a';
      log(`[${model.name} ${v.capacity}] "${ld.name}" $${ld.priceUSD} → KES ${newKES.toLocaleString()} (was ${Number(v.price_kes || 0).toLocaleString()}, ${delta}%)`);

      if (!DRY_RUN) {
        // .select() is essential: RLS-blocked updates return NO error but touch 0 rows
        const { data: updated, error } = await supabase.from('pricelist_variants').update({
          price_usd: ld.priceUSD,
          previous_price_kes: v.price_kes || 0,
          price_kes: newKES,
          last_updated: new Date().toISOString(),
        }).eq('id', v.id).select('id');
        if (error) { log(`  ! DB update failed: ${error.message}`); summary.failed++; continue; }
        if (!updated || updated.length === 0) {
          log(`  ! DB update SILENTLY BLOCKED (RLS) — add SUPABASE_SERVICE_ROLE_KEY to .env.local. Aborting run.`);
          summary.failed++;
          break;
        }
      }
      if (!DRY_RUN) {
        state[v.id] = { syncedAt: Date.now(), usd: ld.priceUSD };
        saveJSON(STATE_FILE, state);
      }
      summary.updated++;
    }
  }

  log(`=== Sync complete: ${JSON.stringify(summary)} ===`);
}

main().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
