// Cloudflare Pages Function — emails an order-status update to a client.
// POST /api/order-status-email
//
// Order-status messages (arrived / shipped / ready / thanks) send from
// orders@legitgrinder.com; money messages (payment reminders) send from
// invoices@legitgrinder.com. Both are Cloudflare-routed to the owner's inbox,
// so replies come back to him without exposing a personal address.

interface Env { RESEND_API_KEY: string; }

type StatusIntent = 'reminder' | 'ready' | 'shipped' | 'thanks' | 'review' | 'custom';

interface StatusEmailPayload {
  to: string;
  intent: StatusIntent;
  clientName?: string;
  productName?: string;
  invoiceNumber?: string;
  message: string;          // the AI-written body (plain text, newlines allowed)
  trackUrl?: string;
  payUrl?: string;
  reviewUrl?: string;
  balanceKES?: number;
  currency?: string;
}

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const FROM_ORDERS = 'LegitGrinder <orders@legitgrinder.com>';
const FROM_INVOICES = 'LegitGrinder <invoices@legitgrinder.com>';

const esc = (s: string) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const BADGE: Record<StatusIntent, { label: string; color: string; subject: (p: StatusEmailPayload) => string }> = {
  ready:    { label: 'Ready for collection', color: '#16a34a', subject: (p) => `Your order has arrived — ready for collection${p.productName ? ` · ${p.productName}` : ''}` },
  shipped:  { label: 'On the way',           color: '#3D8593', subject: (p) => `Your order is on the way${p.productName ? ` · ${p.productName}` : ''}` },
  reminder: { label: 'Payment reminder',     color: '#FF9900', subject: (p) => `Payment reminder${p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''} · LegitGrinder` },
  thanks:   { label: 'Thank you',            color: '#3D8593', subject: () => 'Thank you from LegitGrinder' },
  review:   { label: 'How did we do?',       color: '#FF9900', subject: (p) => `How was your order${p.productName ? ` — ${p.productName}` : ''}?` },
  custom:   { label: 'Order update',         color: '#3D8593', subject: (p) => `Update on your order${p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''}` },
};

function buildHtml(p: StatusEmailPayload, badge: { label: string; color: string }): string {
  // The AI writes plain text; render newlines as paragraph breaks.
  const body = esc(p.message)
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;color:#3f4a4b;font-size:15px;line-height:1.6;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const buttons: string[] = [];
  if (p.payUrl) {
    const amt = typeof p.balanceKES === 'number' && p.balanceKES > 0
      ? ` — ${p.currency || 'KES'} ${Math.round(p.balanceKES).toLocaleString('en-US')}` : '';
    buttons.push(`<a href="${esc(p.payUrl)}" style="display:inline-block;margin:0 8px 10px 0;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;">Pay now${esc(amt)}</a>`);
  }
  if (p.reviewUrl) {
    buttons.push(`<a href="${esc(p.reviewUrl)}" style="display:inline-block;margin:0 8px 10px 0;background:#FF9900;color:#0f1a1c;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;">Leave a review</a>`);
  }
  if (p.trackUrl) {
    buttons.push(`<a href="${esc(p.trackUrl)}" style="display:inline-block;margin:0 8px 10px 0;border:2px solid #3D8593;color:#3D8593;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:12px 28px;border-radius:999px;">📦 Track your order</a>`);
  }

  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:32px 36px 8px;">
      <img src="${LOGO}" width="44" height="44" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:18px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
    </div>
    <div style="padding:8px 36px 0;">
      <span style="display:inline-block;background:${badge.color};color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${esc(badge.label)}</span>
      ${p.productName ? `<h1 style="margin:16px 0 4px;font-size:21px;color:#0f1a1c;">${esc(p.productName)}</h1>` : '<div style="height:12px;"></div>'}
      ${p.invoiceNumber ? `<p style="margin:0 0 16px;font-size:12px;color:#9aa4a4;font-weight:700;letter-spacing:1px;">ORDER ${esc(p.invoiceNumber)}</p>` : ''}
      ${body}
      ${buttons.length ? `<div style="margin:20px 0 4px;">${buttons.join('')}</div>` : ''}
    </div>
    <div style="padding:24px 36px 32px;margin-top:16px;border-top:1px solid #eef0ef;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7677;font-weight:600;">LegitGrinder · Authenticity Guaranteed</p>
      <p style="margin:0;font-size:11px;color:#9aa4a4;">+254 791 873 538 &nbsp;·&nbsp; www.legitgrinder.com &nbsp;·&nbsp; Reply to this email to reach us</p>
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
    const p = await request.json() as StatusEmailPayload;
    const to = (p.to || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ success: false, error: 'A valid recipient email is required.' }), { status: 400, headers: cors });
    }
    if (!p.message || !p.message.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'The message body is empty.' }), { status: 400, headers: cors });
    }

    const intent: StatusIntent = BADGE[p.intent] ? p.intent : 'custom';
    const badge = BADGE[intent];
    // Money talk goes out under invoices@; everything else under orders@.
    const from = intent === 'reminder' ? FROM_INVOICES : FROM_ORDERS;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: badge.subject(p), html: buildHtml(p, badge) }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, error: data?.message || 'Resend send failed' }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ success: true, id: data?.id, from }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
};
