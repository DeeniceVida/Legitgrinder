// Cloudflare Pages Function — corporate quote request notifications.
// POST /api/corporate-quote
//
// Sends two emails: one to the procurement inbox with the full brief, and a
// branded auto-reply to the business so they know it landed.
// Low-quality leads (researchers / below MOQ) skip the admin email entirely and
// only get the self-serve reply — that's the whole point of the filter.

interface Env { RESEND_API_KEY: string; }

interface Payload {
  fullName: string;
  businessName: string;
  email: string;
  whatsapp?: string;
  location?: string;
  categories: string[];
  quantityBand?: string;
  budgetBand?: string;
  timeline?: string;
  notes?: string;
  estimateLow?: number;
  estimateHigh?: number;
  leadQuality: 'priority' | 'low';
  shopUrl?: string;
}

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const FROM = 'LegitGrinder Procurement <orders@legitgrinder.com>';
const ADMIN_INBOX = 'orders@legitgrinder.com';

const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const money = (n?: number) => (typeof n === 'number' && n > 0 ? `KES ${Math.round(n).toLocaleString('en-US')}` : '—');

const QTY_LABEL: Record<string, string> = {
  '5-10': '5 – 10 units', '10-25': '10 – 25 units', '25-50': '25 – 50 units', '50+': '50+ units',
};
const TIME_LABEL: Record<string, string> = {
  immediate: 'Immediate', '30days': 'Within 30 days', '1-3months': '1 – 3 months', researching: 'Just researching',
};

/** Internal brief — dense, scannable, no decoration. */
function adminHtml(p: Payload): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-bottom:1px solid #eef0ef;width:180px;">${esc(k)}</td>
         <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;border-bottom:1px solid #eef0ef;">${v}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e9e9;">
    <div style="background:#0f1a1c;padding:22px 30px;">
      <span style="color:#fff;font-size:16px;font-weight:800;">New corporate quote request</span>
      <span style="display:inline-block;margin-left:10px;background:${p.leadQuality === 'priority' ? '#16a34a' : '#94a3b8'};color:#fff;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">${p.leadQuality}</span>
    </div>
    <div style="padding:26px 30px;">
      <table width="100%" style="border-collapse:collapse;">
        ${row('Business', esc(p.businessName))}
        ${row('Contact', esc(p.fullName))}
        ${row('Email', `<a href="mailto:${esc(p.email)}" style="color:#3D8593;">${esc(p.email)}</a>`)}
        ${p.whatsapp ? row('WhatsApp', `<a href="https://wa.me/${esc(p.whatsapp)}" style="color:#25D366;">${esc(p.whatsapp)}</a>`) : ''}
        ${p.location ? row('Location', esc(p.location)) : ''}
        ${row('Categories', esc((p.categories || []).join(', ') || '—'))}
        ${row('Quantity', esc(QTY_LABEL[p.quantityBand || ''] || p.quantityBand || '—'))}
        ${row('Budget', esc(p.budgetBand || '—'))}
        ${row('Timeline', esc(TIME_LABEL[p.timeline || ''] || p.timeline || '—'))}
        ${row('Estimate shown', p.estimateLow ? `${money(p.estimateLow)} – ${money(p.estimateHigh)}` : '—')}
      </table>
      ${p.notes ? `<div style="margin-top:20px;background:#f8fafa;border:1px solid #eef0ef;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#9aa4a4;">Specifications</p>
        <p style="margin:0;font-size:13px;color:#3f4a4b;line-height:1.6;white-space:pre-line;">${esc(p.notes)}</p>
      </div>` : ''}
      <div style="margin-top:22px;">
        <a href="https://wa.me/${esc(p.whatsapp || '')}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:12px 26px;border-radius:999px;">Qualify on WhatsApp</a>
      </div>
    </div>
  </div>
</body></html>`;
}

/** What the business receives. Sober and reassuring — no emoji, no hype. */
function buyerHtml(p: Payload): string {
  const first = (p.fullName || 'there').trim().split(/\s+/)[0];
  const researching = p.timeline === 'researching' || p.leadQuality === 'low';
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:5px;background:#0f1a1c;"></div>
    <div style="padding:32px 36px 8px;">
      <img src="${LOGO}" width="42" height="42" style="border-radius:9px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:17px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder Procurement</span>
    </div>
    <div style="padding:14px 36px 0;">
      <h1 style="margin:8px 0 10px;font-size:21px;color:#0f1a1c;">Thank you, ${esc(first)} — we have your brief.</h1>
      ${researching ? `
        <p style="margin:0 0 16px;color:#4a5556;font-size:15px;line-height:1.6;">
          We've noted your requirements for <strong>${esc(p.businessName)}</strong>. Since you're still at the research stage,
          here's our indicative pricing to work from — when you're ready to move, reply to this email and we'll prepare a
          formal landed-cost quotation.
        </p>
        <div style="text-align:center;margin:24px 0 10px;">
          <a href="${esc(p.shopUrl || 'https://legitgrinder.com/shop')}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 34px;border-radius:999px;">Browse indicative pricing</a>
        </div>`
      : `
        <p style="margin:0 0 16px;color:#4a5556;font-size:15px;line-height:1.6;">
          Our procurement team will review your specifications for <strong>${esc(p.businessName)}</strong> and issue a formal
          landed-cost quotation <strong>within one business day</strong>.
        </p>
        <p style="margin:0 0 18px;color:#4a5556;font-size:15px;line-height:1.6;">
          That quotation covers factory-direct unit pricing, freight, customs clearing and delivery — one figure, no surprises
          at the port.
        </p>`}

      <div style="margin:20px 0 6px;background:#f8fafa;border:1px solid #eef0ef;border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#9aa4a4;">Your brief</p>
        <p style="margin:0;font-size:13px;color:#3f4a4b;line-height:1.7;">
          ${esc((p.categories || []).join(' · ') || 'Commercial equipment')}<br/>
          ${esc(QTY_LABEL[p.quantityBand || ''] || p.quantityBand || '')} ${p.timeline ? `· ${esc(TIME_LABEL[p.timeline] || p.timeline)}` : ''}
        </p>
      </div>
      <p style="margin:18px 0 0;font-size:12px;color:#9aa4a4;">Reply to this email to add anything to your specification.</p>
    </div>
    <div style="padding:24px 36px 30px;margin-top:16px;border-top:1px solid #eef0ef;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7677;font-weight:600;">LegitGrinder · Direct-from-factory procurement</p>
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
    if (!p.email || !p.businessName) {
      return new Response(JSON.stringify({ success: false, error: 'Missing business name or email' }), { status: 400, headers: cors });
    }

    const emails: any[] = [];

    // Only genuinely qualified leads interrupt the admin.
    if (p.leadQuality === 'priority') {
      emails.push({
        from: FROM, to: [ADMIN_INBOX], reply_to: p.email,
        subject: `[${p.leadQuality.toUpperCase()}] ${p.businessName} — ${(p.categories || [])[0] || 'bulk enquiry'} (${QTY_LABEL[p.quantityBand || ''] || p.quantityBand || 'qty ?'})`,
        html: adminHtml(p),
      });
    }

    emails.push({
      from: FROM, to: [p.email.trim()],
      subject: 'We have your procurement brief — LegitGrinder',
      html: buyerHtml(p),
    });

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails),
    });
    if (!res.ok) {
      console.error('Resend batch failed:', await res.text());
      return new Response(JSON.stringify({ success: false, error: 'Email send failed' }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ success: true, sent: emails.length }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
};
