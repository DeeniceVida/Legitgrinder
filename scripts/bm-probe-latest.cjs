/**
 * Which recent generations does Back Market actually list today?
 *
 * One fetch of the landings sitemap, then group the capacity-specific landing
 * slugs by generation. Answers "is the iPhone 17 / Pixel 10 / S26 there yet,
 * and is anything newer there" without guessing from memory.
 *
 * curl, never Node fetch — see sync-backmarket.cjs.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function curlFetch(url) {
  const tmp = path.join(os.tmpdir(), `bm_probe_${process.pid}_${Date.now()}.xml`);
  try {
    const status = execFileSync('curl', [
      '-s', '-L', '--max-time', '60', '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-o', tmp, '-w', '%{http_code}', url,
    ], { encoding: 'utf8', timeout: 90000 });
    return { code: parseInt(String(status).trim(), 10) || 0, body: fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8') : '' };
  } catch (e) {
    return { code: 0, body: '', err: e.message };
  } finally {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

const { code, body, err } = curlFetch('https://www.backmarket.com/sitemap_landings.xml');
console.log('HTTP', code, err || '', 'bytes', body.length);
if (code !== 200) process.exit(1);

const slugs = [...new Set((body.match(/\/en-us\/l\/[a-z0-9-]+/g) || []).map((s) => s.split('/')[3]))];
console.log('landing slugs:', slugs.length);

const groups = {
  'iPhone 15/16/17/18': /^(apple-|unlocked-)?iphone-1[5-8]\b/,
  'iPhone Air/Fold': /^(apple-|unlocked-)?iphone-(air|fold)/,
  'Pixel 9/10/11': /pixel-(9|10|11)\b/,
  'Galaxy S24/25/26/27': /galaxy-s2[4-7]\b/,
};
for (const [label, re] of Object.entries(groups)) {
  const hits = slugs.filter((s) => re.test(s)).sort();
  console.log(`\n== ${label} (${hits.length})`);
  // Strip the capacity suffix to show one line per distinct model.
  const models = [...new Set(hits.map((s) => s.replace(/-\d+-(gb|tb)$/, '')))].sort();
  console.log(models.join('\n'));
}
