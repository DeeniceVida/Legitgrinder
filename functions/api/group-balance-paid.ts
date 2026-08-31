// Cloudflare Pages Function — "someone just cleared their group-buy balance".
//
// The payment records itself correctly, but nothing used to say so: no email,
// no badge, no notification. With several pay links out at once that meant
// finding out by happening to reload the roster. This is the nudge.
//
// POST /api/group-balance-paid

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

        const settled = p.fullyPaid === true;
        const row = (k: string, v: string) =>
            `<tr><td style="padding:7px 0;font-size:13px;color:#6b7677;">${k}</td>
             <td style="padding:7px 0;font-size:13px;font-weight:700;color:#0f1a1c;text-align:right;">${v}</td></tr>`;

        const html = `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:540px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:${settled ? '#16a34a' : '#FF9900'};color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
        ${settled ? 'Balance cleared' : 'Part payment'}
      </span>
      <h1 style="margin:14px 0 4px;font-size:20px;color:#0f1a1c;">
        ${esc(p.clientName || 'A buyer')} paid ${money(p.amountKES)}
      </h1>
      <p style="margin:0 0 18px;color:#6b7677;font-size:14px;">
        ${settled
                ? 'They are square — ready to collect or have it delivered.'
                : `Still owing <strong style="color:#0f1a1c;">${money(p.balanceKES)}</strong>.`}
      </p>
      <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
        ${p.campaignTitle ? row('Campaign', esc(p.campaignTitle)) : ''}
        ${row('Order', esc(p.orderCode || '—'))}
        ${row('Paid now', money(p.amountKES))}
        ${row('Balance left', money(p.balanceKES))}
        ${p.reference ? row('Reference', esc(p.reference)) : ''}
      </table>
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #eef0ef;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9aa4a4;">LegitGrinder · Group buys</p>
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
                subject: `${settled ? 'Balance cleared' : 'Part payment'} · ${p.clientName || 'Buyer'} · ${money(p.amountKES)}`,
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
