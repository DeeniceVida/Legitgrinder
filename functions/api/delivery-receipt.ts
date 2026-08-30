// Cloudflare Pages Function — the customer's copy of their courier receipt.
//
// Sent the moment the rider uploads it, so nobody has to forward a photograph
// through two WhatsApp conversations. The courier's charge is what the CUSTOMER
// paid at the counter — this is their record of it, not a bill from us.
//
// POST /api/delivery-receipt

interface Env { RESEND_API_KEY: string; }

const FROM = 'LegitGrinder <orders@legitgrinder.com>';
const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';
const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const money = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-US')}`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
        const p = await context.request.json() as any;
        if (!context.env.RESEND_API_KEY) {
            return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not set' }), { status: 500, headers: cors });
        }
        if (!p.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.to).trim())) {
            return new Response(JSON.stringify({ success: false, error: 'No valid address' }), { status: 400, headers: cors });
        }

        const first = String(p.customerName || 'there').trim().split(/\s+/)[0];
        const html = `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:30px 34px 8px;">
      <img src="${LOGO}" width="42" height="42" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:17px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
    </div>
    <div style="padding:8px 34px 0;">
      <span style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Handed to the courier</span>
      <h1 style="margin:15px 0 6px;font-size:21px;color:#0f1a1c;">Hi ${esc(first)}, here is your receipt</h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:14.5px;line-height:1.55;">
        Your${p.item ? ` <strong style="color:#0f1a1c;">${esc(p.item)}</strong>` : ' parcel'} has been handed to
        ${p.courierName ? `<strong style="color:#0f1a1c;">${esc(p.courierName)}</strong>` : 'the courier'}.
        Track it from here on with them.
      </p>

      <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
        ${p.courierName ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;">Courier</td>
          <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${esc(p.courierName)}</td></tr>` : ''}
        ${p.parcelRef ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Reference</td>
          <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${esc(p.parcelRef)}</td></tr>` : ''}
        ${p.parcelFeeKES != null ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">You paid the courier</td>
          <td style="padding:9px 0;font-size:15px;font-weight:800;color:#0f1a1c;text-align:right;">${money(p.parcelFeeKES)}</td></tr>` : ''}
      </table>

      ${p.receiptUrl ? `
      <div style="margin:20px 0 6px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#9aa4a4;">The receipt</p>
        <a href="${esc(p.receiptUrl)}"><img src="${esc(p.receiptUrl)}" alt="Courier receipt" style="width:100%;border-radius:12px;border:1px solid #eef0ef;"/></a>
        <p style="margin:8px 0 0;font-size:11.5px;color:#9aa4a4;">Tap the image to open or download the full copy.</p>
      </div>` : ''}

      ${p.trackUrl ? `
      <div style="text-align:center;margin:24px 0 6px;">
        <a href="${esc(p.trackUrl)}" style="display:inline-block;border:2px solid #3D8593;color:#3D8593;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:13px 30px;border-radius:999px;">View this delivery</a>
      </div>` : ''}
    </div>
    <div style="padding:22px 34px 30px;margin-top:14px;border-top:1px solid #eef0ef;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7677;font-weight:600;">LegitGrinder · Authenticity Guaranteed</p>
      <p style="margin:0;font-size:11px;color:#9aa4a4;">+254 791 873 538 &nbsp;·&nbsp; www.legitgrinder.com</p>
    </div>
  </div>
</body></html>`;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM,
                to: [String(p.to).trim()],
                subject: `Your delivery receipt${p.courierName ? ` · ${p.courierName}` : ''} · LegitGrinder`,
                html,
            }),
        });
        const data = await res.json() as any;
        if (!res.ok) {
            return new Response(JSON.stringify({ success: false, error: data?.message || 'Send failed' }), { status: 502, headers: cors });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e?.message }), { status: 500, headers: cors });
    }
};
