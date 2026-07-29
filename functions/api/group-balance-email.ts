// Cloudflare Pages Function — "your group buy has arrived, here's your balance".
// POST /api/group-balance-email  { campaignTitle, imageUrl?, recipients: [...] }
//
// Each buyer gets their OWN email with their own figures and pay link, so no one
// ever sees another buyer's details.

interface Env { RESEND_API_KEY: string; }

interface Recipient {
  email: string;
  name?: string;
  orderCode: string;
  units?: number;
  color?: string;
  totalKES: number;
  paidKES: number;
  balanceKES: number;
  payUrl: string;
}

interface Payload {
  campaignTitle: string;
  imageUrl?: string;
  collectionNote?: string;      // e.g. "Ready for collection at Nairobi CBD from tomorrow 10am"
  recipients: Recipient[];
}

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const FROM = 'LegitGrinder <orders@legitgrinder.com>';

const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const money = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-US')}`;

function buildHtml(p: Payload, r: Recipient): string {
  const first = (r.name || 'there').trim().split(/\s+/)[0];
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:32px 36px 8px;">
      <img src="${LOGO}" width="44" height="44" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:18px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
    </div>
    <div style="padding:8px 36px 0;">
      <span style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">It has arrived</span>
      <h1 style="margin:16px 0 6px;font-size:23px;color:#0f1a1c;">Hi ${esc(first)}, your order is here 🎉</h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:15px;line-height:1.55;">
        The <strong style="color:#0f1a1c;">${esc(p.campaignTitle)}</strong> group buy has landed. Clear your balance below and it's ready for you to collect.
      </p>
      ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="" style="width:100%;max-height:230px;object-fit:cover;border-radius:14px;margin:0 0 18px;"/>` : ''}

      <table width="100%" style="border-collapse:collapse;margin-bottom:6px;">
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7677;">Order</td>
            <td style="padding:8px 0;font-size:13px;font-weight:800;color:#0f1a1c;text-align:right;">${esc(r.orderCode)}</td></tr>
        ${r.units ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Units</td>
            <td style="padding:8px 0;font-size:13px;font-weight:800;color:#0f1a1c;text-align:right;border-top:1px solid #eef0ef;">${esc(r.units)}</td></tr>` : ''}
        ${r.color ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Colour</td>
            <td style="padding:8px 0;font-size:13px;font-weight:800;color:#0f1a1c;text-align:right;border-top:1px solid #eef0ef;">${esc(r.color)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Order total</td>
            <td style="padding:8px 0;font-size:13px;font-weight:800;color:#0f1a1c;text-align:right;border-top:1px solid #eef0ef;">${money(r.totalKES)}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7677;">Deposit already paid</td>
            <td style="padding:8px 0;font-size:13px;font-weight:800;color:#3D8593;text-align:right;">− ${money(r.paidKES)}</td></tr>
        <tr><td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#0f1a1c;border-top:2px solid #0f1a1c;">Balance now due</td>
            <td style="padding:12px 0 0;font-size:20px;font-weight:900;color:#FF9900;text-align:right;border-top:2px solid #0f1a1c;">${money(r.balanceKES)}</td></tr>
      </table>

      <div style="text-align:center;margin:26px 0 8px;">
        <a href="${esc(r.payUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:16px 42px;border-radius:999px;">Pay balance — ${money(r.balanceKES)}</a>
      </div>

      ${p.collectionNote ? `<div style="margin:20px 0 4px;background:#fff8ed;border:1px solid #fde4bf;border-radius:12px;padding:14px 18px;">
        <p style="margin:0;font-size:12.5px;color:#a86b12;line-height:1.55;">📍 ${esc(p.collectionNote)}</p>
      </div>` : ''}

      <p style="margin:18px 0 0;font-size:12px;color:#9aa4a4;text-align:center;">Paid another way? Reply to this email and we'll mark it off.</p>
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
    const p = await request.json() as Payload;
    const list = (p.recipients || []).filter(r =>
      r && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((r.email || '').trim()) && r.balanceKES > 0 && r.payUrl
    );
    if (!p.campaignTitle || list.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nothing to send — no buyers with a valid email and an outstanding balance.' }), { status: 400, headers: cors });
    }

    const subject = `Your ${p.campaignTitle} has arrived — balance due`;
    let sent = 0;
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const batch = chunk.map(r => ({
        from: FROM, to: [r.email.trim()], subject, html: buildHtml(p, r),
      }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += chunk.length;
      else console.error('Resend batch failed:', await res.text());
    }

    return new Response(JSON.stringify({ success: sent > 0, sent, skipped: (p.recipients || []).length - list.length }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
};
