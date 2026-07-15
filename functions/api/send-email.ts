// Cloudflare Pages Function — sends branded invoice/receipt emails via Resend.
// Runs server-side (RESEND_API_KEY never reaches the browser).
// Available at POST /api/send-email once deployed.
//
// REQUIRED: add RESEND_API_KEY to Cloudflare Pages → Settings → Environment variables.

interface Env {
    RESEND_API_KEY: string;
}

interface LineItem { name: string; quantity?: number; priceKES?: number; }

interface EmailPayload {
    to: string;
    kind: 'receipt' | 'invoice';        // receipt = payment confirmation; invoice = bill / request to pay
    invoiceNumber: string;
    clientName: string;
    productName?: string;
    items?: LineItem[];
    currency?: string;                  // default KES
    totalKES: number;
    amountPaidKES?: number;
    balanceKES?: number;
    reference?: string;
    payUrl?: string;                    // for invoices with an outstanding balance
    trackUrl?: string;                  // deep link that auto-tracks this order
    attachment?: { filename: string; content: string };  // base64 PDF (no data: prefix)
}

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const FROM = 'LegitGrinder <invoices@legitgrinder.com>';
const REPLY_TO = 'mungaimports@gmail.com';

const money = (n: number, cur = 'KES') => `${cur} ${Math.round(n).toLocaleString('en-US')}`;
const esc = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

function buildHtml(p: EmailPayload): string {
    const cur = p.currency || 'KES';
    const paid = p.amountPaidKES ?? (p.kind === 'receipt' ? p.totalKES : 0);
    const balance = p.balanceKES ?? Math.max((p.totalKES || 0) - paid, 0);
    const isReceipt = p.kind === 'receipt';
    const fullyPaid = balance <= 0;

    const rows = (p.items && p.items.length
        ? p.items.map((it) => ({ name: it.name, qty: it.quantity || 1, amt: (it.priceKES || 0) }))
        : [{ name: p.productName || 'Order', qty: 1, amt: p.totalKES || 0 }]
    ).map((r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eef0ef;font-size:14px;color:#1a2223;">${esc(r.name)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eef0ef;font-size:14px;color:#6b7677;text-align:center;">${r.qty}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eef0ef;font-size:14px;color:#1a2223;text-align:right;font-weight:700;">${r.amt ? money(r.amt, cur) : 'TBD'}</td>
      </tr>`).join('');

    const heroLabel = isReceipt ? (fullyPaid ? 'Payment Received' : 'Deposit Received') : 'Invoice';
    const heroSub = isReceipt
        ? (fullyPaid ? 'Your payment is complete — thank you!' : 'Thank you. Here is your payment summary.')
        : 'Here are your order details and how to pay.';

    return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:32px 36px 8px;">
      <table width="100%"><tr>
        <td style="vertical-align:middle;">
          <img src="${LOGO}" width="44" height="44" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
          <span style="font-size:18px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <span style="display:inline-block;background:#0f1a1c;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${esc(heroLabel)}</span>
        </td>
      </tr></table>
    </div>

    <div style="padding:16px 36px 0;">
      <h1 style="margin:8px 0 4px;font-size:22px;color:#0f1a1c;">Hi ${esc(p.clientName || 'there')},</h1>
      <p style="margin:0 0 20px;color:#6b7677;font-size:14px;">${esc(heroSub)}</p>

      <table width="100%" style="margin-bottom:8px;">
        <tr>
          <td style="font-size:11px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;">Invoice</td>
          <td style="font-size:11px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;text-align:right;">Date</td>
        </tr>
        <tr>
          <td style="font-size:15px;font-weight:800;color:#0f1a1c;">IG-${esc(p.invoiceNumber)}</td>
          <td style="font-size:15px;font-weight:800;color:#0f1a1c;text-align:right;">${new Date().toLocaleDateString('en-GB')}</td>
        </tr>
      </table>

      <table width="100%" style="border-collapse:collapse;margin-top:16px;">
        <thead><tr>
          <th style="text-align:left;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #0f1a1c;">Item</th>
          <th style="text-align:center;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #0f1a1c;">Qty</th>
          <th style="text-align:right;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:2px solid #0f1a1c;">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <table width="100%" style="margin-top:20px;">
        <tr><td style="font-size:13px;color:#6b7677;padding:4px 0;">Total</td><td style="font-size:14px;font-weight:700;color:#0f1a1c;text-align:right;">${money(p.totalKES || 0, cur)}</td></tr>
        ${isReceipt ? `<tr><td style="font-size:13px;color:#6b7677;padding:4px 0;">Amount Paid</td><td style="font-size:14px;font-weight:700;color:#3D8593;text-align:right;">${money(paid, cur)}</td></tr>` : ''}
        <tr><td style="font-size:14px;font-weight:800;color:#0f1a1c;padding:10px 0 0;border-top:1px solid #eef0ef;">${fullyPaid ? 'Balance' : 'Balance Due'}</td>
            <td style="font-size:18px;font-weight:900;text-align:right;padding:10px 0 0;border-top:1px solid #eef0ef;color:${fullyPaid ? '#16a34a' : '#ef4444'};">${money(balance, cur)}</td></tr>
      </table>

      ${p.reference ? `<p style="margin:16px 0 0;font-size:12px;color:#9aa4a4;">Reference: ${esc(p.reference)}</p>` : ''}

      ${(!fullyPaid && p.payUrl) ? `
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${esc(p.payUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 32px;border-radius:999px;">${isReceipt ? 'Pay Balance' : 'Pay Now'} — ${money(balance, cur)}</a>
      </div>` : ''}

      ${p.trackUrl ? `
      <div style="text-align:center;margin:20px 0 4px;">
        <a href="${esc(p.trackUrl)}" style="display:inline-block;border:2px solid #3D8593;color:#3D8593;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:12px 30px;border-radius:999px;">📦 Track Your Order</a>
      </div>` : ''}

      <div style="margin:24px 0 4px;background:#fff8ed;border:1px solid #fde4bf;border-radius:12px;padding:14px 18px;">
        <p style="margin:0;font-size:12px;color:#a86b12;line-height:1.5;">⏱️ <strong>Order processing:</strong> orders are placed <strong>1 business day after payment is confirmed</strong> — the time it takes for funds to settle. We'll keep you updated the whole way.</p>
      </div>
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
            return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not set in Cloudflare env' }), { status: 500, headers: cors });
        }
        const p = await request.json() as EmailPayload;
        if (!p.to || !p.invoiceNumber) {
            return new Response(JSON.stringify({ success: false, error: 'Missing recipient or invoice number' }), { status: 400, headers: cors });
        }

        const subject = (p.kind === 'receipt' ? 'Payment Receipt' : 'Your Invoice') + ` · IG-${p.invoiceNumber} · LegitGrinder`;

        const emailBody: any = { from: FROM, to: [p.to], reply_to: REPLY_TO, subject, html: buildHtml(p) };
        if (p.attachment?.content && p.attachment?.filename) {
            emailBody.attachments = [{ filename: p.attachment.filename, content: p.attachment.content }];
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(emailBody),
        });
        const data = await res.json() as any;
        if (!res.ok) {
            return new Response(JSON.stringify({ success: false, error: data?.message || 'Resend send failed' }), { status: 502, headers: cors });
        }
        return new Response(JSON.stringify({ success: true, id: data?.id }), { headers: cors });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
    }
};
