// Cloudflare Pages Function — emails "back in stock" alerts via Resend.
// POST /api/notify-restock  { productName, productUrl, imageUrl?, priceKES?, currency?, recipients[] }
// Each recipient gets their own email (single `to`), so addresses stay private.

interface Env { RESEND_API_KEY: string; }

interface RestockPayload {
  productName: string;
  productUrl: string;
  imageUrl?: string;
  priceKES?: number;
  currency?: string;
  recipients: string[];
}

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const FROM = 'LegitGrinder <invoices@legitgrinder.com>';
const REPLY_TO = 'mungaimports@gmail.com';

const esc = (s: string) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

function buildHtml(p: RestockPayload): string {
  const price = typeof p.priceKES === 'number' && p.priceKES > 0
    ? `${p.currency || 'KES'} ${Math.round(p.priceKES).toLocaleString('en-US')}` : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:32px 36px 8px;">
      <img src="${LOGO}" width="44" height="44" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:18px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
    </div>
    <div style="padding:8px 36px 0;">
      <span style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Back in stock</span>
      <h1 style="margin:16px 0 6px;font-size:24px;color:#0f1a1c;">Good news — it's back! 🎉</h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:15px;line-height:1.5;">
        The item you wanted, <strong style="color:#0f1a1c;">${esc(p.productName)}</strong>, is back in stock.
        These move fast — grab yours before it sells out again.
      </p>
      ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.productName)}" style="width:100%;max-height:280px;object-fit:cover;border-radius:14px;margin:4px 0 18px;"/>` : ''}
      ${price ? `<p style="margin:0 0 18px;font-size:18px;font-weight:900;color:#0f1a1c;">${price}</p>` : ''}
      <div style="text-align:center;margin:8px 0 4px;">
        <a href="${esc(p.productUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:15px 40px;border-radius:999px;">Shop it now →</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;color:#9aa4a4;text-align:center;">You asked us to let you know when this was available. Reply to this email if you have any questions.</p>
    </div>
    <div style="padding:24px 36px 32px;margin-top:16px;border-top:1px solid #eef0ef;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7677;font-weight:600;">LegitGrinder · Authenticity Guaranteed</p>
      <p style="margin:0;font-size:11px;color:#9aa4a4;">+254 791 873 538 &nbsp;·&nbsp; www.legitgrinder.com</p>
    </div>
  </div>
</body></html>`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not set' }), { status: 500, headers: cors });
    }
    const p = await request.json() as RestockPayload;
    const recipients = Array.isArray(p.recipients)
      ? [...new Set(p.recipients.map((e) => (e || '').trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
      : [];
    if (!p.productName || !p.productUrl || recipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Missing product or recipients' }), { status: 400, headers: cors });
    }

    const subject = `${p.productName} is back in stock — LegitGrinder`;
    const html = buildHtml(p);

    // Resend batch endpoint sends up to 100 at once; chunk for safety.
    let sent = 0;
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100);
      const batch = chunk.map((to) => ({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += chunk.length;
      else console.error('Resend batch failed:', await res.text());
    }

    return new Response(JSON.stringify({ success: sent > 0, sent }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
};
