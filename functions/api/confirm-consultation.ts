// Cloudflare Pages Function — confirm a paid in-person consultation.
//
// The Paystack popup tells the BROWSER a payment succeeded, and a browser can
// be edited to say anything. So a consultation slot is locked only here, after
// this server has asked Paystack directly whether the money arrived, in shillings,
// for at least the fee, against this exact booking reference.
//
// POST /api/confirm-consultation   { reference: "LGC-XXXXXXXXXXXX" }
//
// Needs two Cloudflare secrets, deliberately NOT set until launch:
//   PAYSTACK_SECRET_KEY    — to ask Paystack about the payment
//   BOOKING_SERVER_TOKEN   — to prove to the database that this server is asking
// Without them this answers "not configured" rather than guessing.

interface Env {
    PAYSTACK_SECRET_KEY?: string;
    BOOKING_SERVER_TOKEN?: string;
    RESEND_API_KEY?: string;
}

// Public by design; already in the client bundle. See notify-rider.ts.
const SUPABASE_URL = 'https://okfrcfgcnjkindwbquic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0';

const OWNER_EMAIL = 'orders@legitgrinder.com';
const FROM = 'LegitGrinder <orders@legitgrinder.com>';

const REFERENCE = /^LGC-[A-Z0-9]{12}$/;

const esc = (s: unknown) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-US')}`;

/** 0712 345678 → 254712345678, for a wa.me link. */
const waDigits = (phone: string) => {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('254')) return d;
    if (d.startsWith('0')) return '254' + d.slice(1);
    if (d.length === 9) return '254' + d;
    return d;
};

const longDate = (iso: string) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return String(iso);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[dt.getUTCDay()]} ${d} ${months[m - 1]}`;
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const row = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;font-size:13px;color:#6b7677;vertical-align:top;width:38%;">${k}</td>
     <td style="padding:7px 0;font-size:13px;font-weight:700;color:#0f1a1c;">${v}</td></tr>`;

const shell = (badge: string, inner: string) => `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
    <div style="padding:28px 32px;">
      <span style="display:inline-block;background:#3D8593;color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${badge}</span>
      ${inner}
    </div>
  </div>
</body></html>`;

/** What the founder needs: who, when, and their answers, with a way to reply. */
export const ownerEmail = (b: any): string => shell(
    b.status === 'paid_conflict' ? 'Paid — slot clash' : 'Consultation booked',
    `<h1 style="margin:14px 0 4px;font-size:20px;color:#0f1a1c;">${esc(b.clientName)} — ${esc(longDate(b.slotDate))}</h1>
     <p style="margin:0 0 18px;color:#6b7677;font-size:14px;">${esc(b.slotLabel)} · ${money(b.paidKes)} paid · ref ${esc(b.reference)}</p>
     ${b.status === 'paid_conflict' ? `<p style="margin:0 0 18px;padding:12px 14px;border-radius:10px;background:#fff4e5;color:#8a4b00;font-size:13px;font-weight:600;">
       This person paid, but another booking confirmed this slot first. Contact them to move the meeting or refund.</p>` : ''}
     <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
       ${row('Importing', esc(b.products))}
       ${row('Quantity', esc(b.quantity))}
       ${row('Budget', esc(b.budget))}
       ${row('Phone', esc(b.clientPhone))}
       ${row('Email', esc(b.clientEmail))}
       ${row('Credit valid until', esc(b.creditExpires ? longDate(b.creditExpires) : '—'))}
     </table>
     <div style="text-align:center;margin:24px 0 4px;">
       <a href="https://wa.me/${esc(waDigits(b.clientPhone))}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;">WhatsApp ${esc(String(b.clientName).split(' ')[0])}</a>
     </div>`,
);

/** The client's booking pass: when, where, what it cost, and how the credit works. */
export const clientEmail = (b: any): string => shell(
    'Booking confirmed',
    `<h1 style="margin:14px 0 4px;font-size:20px;color:#0f1a1c;">See you ${esc(longDate(b.slotDate))}</h1>
     <p style="margin:0 0 18px;color:#6b7677;font-size:14px;">${esc(b.slotLabel)} · in person</p>
     <table width="100%" style="border-collapse:collapse;border-top:1px solid #eef0ef;">
       ${row('Where', esc([b.hubName, b.hubAddress].filter(Boolean).join(', ') || 'We will send the exact location before your meeting.'))}
       ${row('Booking reference', esc(b.reference))}
       ${row('Fee paid', money(b.paidKes))}
     </table>
     <p style="margin:18px 0 0;padding:14px 16px;border-radius:10px;background:#f2f9fa;color:#1d4d55;font-size:13px;line-height:1.6;">
       <strong>Your ${money(b.amountKes)} comes off your order.</strong> Place your procurement order within
       ${esc(b.creditDays)} days of the meeting${b.creditExpires ? ` (by ${esc(longDate(b.creditExpires))})` : ''} and the full fee is credited.
       The fee is not refundable in cash.
     </p>
     ${b.hubMapUrl ? `<div style="text-align:center;margin:24px 0 4px;">
       <a href="${esc(b.hubMapUrl)}" style="display:inline-block;background:#0f1a1c;color:#fff;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:14px 30px;border-radius:999px;">Open the location</a>
     </div>` : ''}`,
);

const send = async (key: string, to: string, subject: string, html: string) => {
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM, to: [to], subject, html }),
        });
        return r.ok;
    } catch {
        return false;
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { PAYSTACK_SECRET_KEY, BOOKING_SERVER_TOKEN, RESEND_API_KEY } = context.env;

    if (!PAYSTACK_SECRET_KEY || !BOOKING_SERVER_TOKEN) {
        return json({
            ok: false,
            notConfigured: true,
            error: 'Online payment confirmation is not switched on yet. If you have paid, your payment is safe — contact us on WhatsApp with your M-Pesa or card receipt and we will confirm your booking.',
        }, 503);
    }

    let reference = '';
    try {
        const body = await context.request.json() as { reference?: string };
        reference = String(body.reference || '').trim().toUpperCase();
    } catch { /* falls through to the format check */ }

    if (!REFERENCE.test(reference)) {
        return json({ ok: false, error: 'That booking reference is not valid.' }, 400);
    }

    // 1. Ask Paystack, not the browser.
    let tx: any;
    try {
        const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        const data = await r.json() as any;
        tx = data?.data;
        if (!data?.status || !tx) {
            return json({ ok: false, error: 'Paystack has no record of that payment yet. If you were charged, contact us and quote your reference.' }, 402);
        }
    } catch {
        return json({ ok: false, error: 'Could not reach Paystack to check the payment. Please try again in a moment.' }, 502);
    }

    if (tx.status !== 'success') {
        return json({ ok: false, error: 'That payment did not go through, so the slot has not been booked.' }, 402);
    }
    if (String(tx.currency).toUpperCase() !== 'KES') {
        return json({ ok: false, error: 'The payment was not in Kenyan shillings.' }, 402);
    }
    if (String(tx.reference).toUpperCase() !== reference) {
        return json({ ok: false, error: 'That payment belongs to a different booking.' }, 402);
    }

    // 2. Lock the slot. The database compares the amount against the fee and
    //    refuses a second confirmed booking for the same slot.
    let booking: any;
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_consultation_booking`, {
            method: 'POST',
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                p_reference: reference,
                p_paid_kes: Math.floor(Number(tx.amount || 0) / 100),
                p_paystack_id: String(tx.id ?? ''),
                p_token: BOOKING_SERVER_TOKEN,
            }),
        });
        booking = await r.json();
    } catch {
        return json({ ok: false, error: 'Payment received, but we could not save the booking. We will contact you to confirm.' }, 502);
    }

    if (!booking?.ok) {
        return json({ ok: false, error: booking?.error || booking?.message || 'Could not confirm the booking.' }, 409);
    }

    // 3. Tell both sides — once. A retried confirmation must not re-send.
    if (RESEND_API_KEY && !booking.alreadyDone) {
        const firstName = String(booking.clientName || '').split(' ')[0];
        await Promise.all([
            send(RESEND_API_KEY, OWNER_EMAIL,
                `${booking.status === 'paid_conflict' ? 'SLOT CLASH · ' : ''}Consultation · ${booking.clientName} · ${longDate(booking.slotDate)} ${booking.slotLabel}`,
                ownerEmail(booking)),
            booking.status === 'confirmed' && booking.clientEmail
                ? send(RESEND_API_KEY, booking.clientEmail,
                    `Your LegitGrinder consultation — ${longDate(booking.slotDate)}`,
                    clientEmail(booking))
                : Promise.resolve(true),
        ]);
        void firstName;
    }

    return json({
        ok: true,
        booking: {
            status: booking.status,
            reference: booking.reference,
            clientName: booking.clientName,
            slotDate: booking.slotDate,
            slotLabel: booking.slotLabel,
            amountKes: booking.amountKes,
            paidKes: booking.paidKes,
            creditExpires: booking.creditExpires,
            creditDays: booking.creditDays,
            hubName: booking.hubName,
            hubAddress: booking.hubAddress,
            hubMapUrl: booking.hubMapUrl,
        },
    });
};
