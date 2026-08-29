// Cloudflare Pages Function — tell the owner a customer has booked a delivery.
//
// The job already exists in the database by the time this runs, and the rider
// already has it on their phone. This is the nudge so it isn't sitting there
// unnoticed; a failure here must never look like a failed booking.
//
// POST /api/delivery-request

interface Env { RESEND_API_KEY: string; }

const FROM = 'LegitGrinder <orders@legitgrinder.com>';
const TO = 'orders@legitgrinder.com';
const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const money = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-US')}`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
        const p = await context.request.json() as any;
        if (!context.env.RESEND_API_KEY) {
            return new Response(JSON.stringify({ success: false, error: 'RESEND_API_KEY not set' }), { status: 500, headers: cors });
        }

        const row = (k: string, v: string) =>
            `<tr><td style="padding:6px 0;font-size:13px;color:#6b7677;">${k}</td>
             <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${v}</td></tr>`;

        const html = `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#FF9900;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Delivery booked</span>
      <h1 style="margin:14px 0 4px;font-size:20px;color:#0f1a1c;">${esc(p.customerName || 'A customer')} wants it delivered</h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:14px;">
        ${p.assigned ? 'It is already on your rider&rsquo;s dashboard.' : '<strong style="color:#ef4444;">No active rider — assign one in the dashboard.</strong>'}
      </p>
      <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
        ${p.reference ? row('Order', esc(p.reference)) : ''}
        ${p.item ? row('Item', esc(p.item)) : ''}
        ${row('Phone', esc(p.customerPhone || '—'))}
        ${row('Collect from', esc(p.origin || '—'))}
        ${row('Distance', `~${esc(p.km)} km${p.bulky ? ' · bulky' : ''}`)}
        ${row('Rider fee', money(p.feeKES))}
      </table>
      <div style="text-align:center;margin:24px 0 6px;">
        <a href="${esc(p.mapUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;">Open their pin</a>
      </div>
      ${p.trackUrl ? `<p style="margin:14px 0 0;font-size:12px;color:#9aa4a4;text-align:center;">Their link: ${esc(p.trackUrl)}</p>` : ''}
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
                from: FROM, to: [TO],
                subject: `Delivery booked · ${p.customerName || 'Customer'} · ${money(p.feeKES)}`,
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
