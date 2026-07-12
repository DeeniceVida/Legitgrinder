# Back Market Monthly Price Sync

Automatically refreshes the phone Pricelist (`pricelist_variants` in Supabase)
with current refurbished prices from backmarket.com, once a month.

## How it works

1. **Discovery** (cached in `backmarket-url-cache.json`):
   - Fetches Back Market's public `sitemap_landings.xml` (bot-friendly, 1 request)
   - Maps each model+capacity to its landing page (e.g. `iphone-13-128-gb`)
   - Extracts the *fully-unlocked* product page URL per capacity
2. **Pricing** (one request per variant, cached URLs after month 1):
   - Reads the schema.org JSON-LD from each product page → USD price
   - Applies the official LegitGrinder formula (same as `utils/priceCalculations.ts`):
     `USD + ($20 + 3.5% shipping) + ($30 or 4.5% service) × 135 KES`
   - Updates `price_usd`, `price_kes`, `previous_price_kes`, `last_updated`
   - The public Pricelist page then shows green (drop) / red (rise) automatically
3. **Politeness / safety**:
   - Uses system **curl** (Node fetch is fingerprint-blocked by DataDome)
   - Randomized 25–55s delays between requests (~2–3h total for 180 variants)
   - 5-minute cooldown + 2 retries on 403/429, then skips gracefully
   - Variants with `is_manual_override = true` are **never touched**
   - Resumable: `sync-state.json` skips variants synced in the last 20 days,
     so an interrupted run continues where it stopped

## Commands

```powershell
node scripts/sync-backmarket.cjs              # full production sync
node scripts/sync-backmarket.cjs --dry-run    # fetch + log, no DB writes
node scripts/sync-backmarket.cjs --limit 3    # first 3 models only
node scripts/sync-backmarket.cjs --fast       # short delays (testing ONLY)
```

Logs append to `scripts/sync-log.txt`.

## Schedule

A Windows Task Scheduler job **"LegitGrinder BackMarket Price Sync"** runs the
script monthly on the **16th at 10:00**. Manage it:

```powershell
schtasks /query /tn "LegitGrinder BackMarket Price Sync"   # inspect
schtasks /run  /tn "LegitGrinder BackMarket Price Sync"    # run now
schtasks /delete /tn "LegitGrinder BackMarket Price Sync"  # remove
```

⚠️ The PC must be on (and you logged in) at the scheduled time; if it is
missed, run manually with the first command above. Thanks to the state file,
running it twice in a month is harmless — fresh variants are skipped.

## Known gaps

- A few variants have no Back Market landing page (older/rarer capacities) —
  they keep their current price and are listed in the log as `no product URL`.
  Set those few manually in the Admin dashboard, or mark them
  `is_manual_override` to silence them.
- Prices use the "Good" refurbished condition (Back Market's default offer).
