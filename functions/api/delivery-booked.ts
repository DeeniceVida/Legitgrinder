// Cloudflare Pages Function — the customer's own tracking link, emailed the
// moment they book a delivery.
//
// Their link used to live only on the screen in front of them: close the tab,
// switch phones, and the owner had to dig the link out of the dashboard and
// send it by hand. This is the copy that survives all of that.
//
// It is not a receipt and not a bill. The delivery fee named here is the one
// they agreed on the page and pay the rider at the door.
//
// POST /api/delivery-booked

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
        if (!p.trackUrl) {
            return new Response(JSON.stringify({ success: false, error: 'No tracking link to send' }), { status: 400, headers: cors });
        }

        const first = String(p.customerName || 'there').trim().split(/\s+/)[0] || 'there';
        const isParcel = p.deliveryType === 'parcel';
        // Doorstep and parcel are different promises — say the right one.
        const whatHappens = isParcel
            ? `A rider takes your${p.item ? ` <strong style="color:#0f1a1c;">${esc(p.item)}</strong>` : ' parcel'} to
               ${p.courierName ? `<strong style="color:#0f1a1c;">${esc(p.courierName)}</strong>` : 'the courier'} and photographs
               the receipt. It appears on your tracking page, and we email you a copy.`
            : `A rider brings your${p.item ? ` <strong style="color:#0f1a1c;">${esc(p.item)}</strong>` : ' order'} to the pin you
               dropped. Their name and how far off they are show on your tracking page as they go.`;

        const html = `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,26,28,0.08);">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:30px 34px 8px;">
      <img src="${LOGO}" width="42" height="42" style="border-radius:10px;vertical-align:middle;" alt="LegitGrinder"/>
      <span style="font-size:17px;font-weight:800;color:#0f1a1c;vertical-align:middle;margin-left:10px;">LegitGrinder</span>
    </div>
    <div style="padding:8px 34px 0;">
      <span style="display:inline-block;background:#3D8593;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Delivery booked</span>
      <h1 style="margin:15px 0 6px;font-size:21px;color:#0f1a1c;">Hi ${esc(first)}, your delivery is booked</h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:14.5px;line-height:1.55;">${whatHappens}</p>

      <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
        ${p.reference ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;">Order</td>
          <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${esc(p.reference)}</td></tr>` : ''}
        ${p.dropLabel ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Going to</td>
          <td style="padding:9px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${esc(p.dropLabel)}</td></tr>` : ''}
        ${p.feeKES != null ? `<tr><td style="padding:9px 0;font-size:13px;color:#6b7677;border-top:1px solid #eef0ef;">Delivery fee
          <span style="display:block;font-size:11.5px;color:#9aa4a4;">Paid to the rider on delivery — cash or M-Pesa</span></td>
          <td style="padding:9px 0;font-size:15px;font-weight:800;color:#0f1a1c;text-align:right;">${money(p.feeKES)}</td></tr>` : ''}
      </table>

      <div style="text-align:center;margin:24px 0 6px;">
        <a href="${esc(p.trackUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 32px;border-radius:999px;">Track your order</a>
      </div>
      <p style="margin:6px 0 0;font-size:11.5px;color:#9aa4a4;text-align:center;">
        Keep this email — the link above is your delivery, and it works on any device.
      </p>
      ${isParcel ? `<p style="margin:14px 0 0;font-size:12.5px;color:#6b7677;line-height:1.5;">
        Whatever the courier charges to send it onward is paid by you at their counter. The rider only records it.
      </p>` : ''}
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
                subject: `Your delivery is booked${p.reference ? ` · ${p.reference}` : ''} · LegitGrinder`,
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
