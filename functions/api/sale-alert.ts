// Cloudflare Pages Function — tells the owner a shop order has been paid.
//
// The site already opens WhatsApp on the CUSTOMER's phone with a message
// addressed to the owner, which only arrives if they actually press send. A
// closed tab meant a silent sale. This fires server-side the moment payment
// clears, so the alert does not depend on the buyer doing anything.
//
// Uses the same RESEND_API_KEY as the invoice mailer.

interface Env {
    RESEND_API_KEY: string;
}

interface Payload {
    productName: string;
    variant?: string;
    quantity: number;
    totalKES: number;
    currency?: string;
    reference: string;
    customerName?: string;
    customerEmail?: string;
    trackUrl?: string;
    stockLeft?: number | null;
}

const FROM = 'LegitGrinder Shop <invoices@legitgrinder.com>';
const OWNER = 'orders@legitgrinder.com';

const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

function html(p: Payload): string {
    const cur = p.currency || 'KES';
    const money = (n: number) => `${cur} ${Math.round(n).toLocaleString('en-US')}`;
    const row = (k: string, v: string) =>
        `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-bottom:1px solid #eef0ef;width:150px;">${esc(k)}</td>
         <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;border-bottom:1px solid #eef0ef;">${v}</td></tr>`;

    return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e9e9;">
    <div style="background:#16a34a;padding:20px 28px;">
      <span style="color:#fff;font-size:16px;font-weight:800;">Paid order — ${esc(p.productName)}</span>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 18px;font-size:26px;font-weight:900;color:#0f1a1c;">${money(p.totalKES)}</p>
      <table width="100%" style="border-collapse:collapse;">
        ${row('Item', esc(p.productName))}
        ${p.variant ? row('Option', esc(p.variant)) : ''}
        ${row('Quantity', String(p.quantity))}
        ${row('Reference', esc(p.reference))}
        ${p.customerName ? row('Customer', esc(p.customerName)) : ''}
        ${p.customerEmail ? row('Email', `<a href="mailto:${esc(p.customerEmail)}" style="color:#3D8593;">${esc(p.customerEmail)}</a>`) : ''}
        ${typeof p.stockLeft === 'number' ? row('Stock left', `${p.stockLeft} pc${p.stockLeft === 1 ? '' : 's'}`) : ''}
      </table>
      ${p.trackUrl ? `<div style="margin-top:20px;">
        <a href="${esc(p.trackUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:12px 26px;border-radius:999px;">Open the order</a>
      </div>` : ''}
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
        if (!p.productName || !p.reference) {
            return new Response(JSON.stringify({ success: false, error: 'Missing product or reference' }), { status: 400, headers: cors });
        }

        const cur = p.currency || 'KES';
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: FROM,
                to: [OWNER],
                subject: `Paid · ${cur} ${Math.round(p.totalKES).toLocaleString('en-US')} · ${p.productName}`,
                html: html(p),
            }),
        });
        const data = await res.json() as any;
        if (!res.ok) {
            return new Response(JSON.stringify({ success: false, error: data?.message || 'Send failed' }), { status: 502, headers: cors });
        }
        return new Response(JSON.stringify({ success: true, id: data?.id }), { headers: cors });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
    }
};
