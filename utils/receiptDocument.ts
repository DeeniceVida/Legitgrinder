// Branded invoice/receipt PDF — generated client-side (html2canvas + jsPDF)
// and attached to the emailed invoice/receipt. Mirrors the manual print design
// (logo watermark, accent bar, teal totals) so the customer gets a clean,
// downloadable document.

const LOGO = 'https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg';

export interface DocumentData {
    kind: 'receipt' | 'invoice';
    invoiceNumber: string;
    clientName: string;
    productName?: string;
    items?: { name: string; quantity?: number; priceKES?: number }[];
    currency?: string;
    totalKES: number;
    amountPaidKES?: number;
    balanceKES?: number;
    reference?: string;
    dateStr?: string;
}

const money = (n: number, cur = 'KES') => `${cur} ${Math.round(n).toLocaleString('en-US')}`;
const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

/** Branded A4 document HTML (inline styles for reliable html2canvas rendering). */
export function buildDocumentHtml(d: DocumentData): string {
    const cur = d.currency || 'KES';
    const isReceipt = d.kind === 'receipt';
    const paid = d.amountPaidKES ?? (isReceipt ? d.totalKES : 0);
    const balance = d.balanceKES ?? Math.max((d.totalKES || 0) - paid, 0);
    const fullyPaid = balance <= 0;
    const date = d.dateStr || new Date().toLocaleDateString('en-GB');

    const rows = (d.items && d.items.length
        ? d.items.map((it) => ({ name: it.name, qty: it.quantity || 1, amt: it.priceKES || 0 }))
        : [{ name: d.productName || 'Order', qty: 1, amt: d.totalKES || 0 }]
    ).map((r) => `
      <tr>
        <td style="padding:14px 4px;border-bottom:1px solid #eef0ef;font-size:15px;color:#1a2223;">${esc(r.name)}</td>
        <td style="padding:14px 4px;border-bottom:1px solid #eef0ef;font-size:15px;color:#6b7677;text-align:center;">${r.qty}</td>
        <td style="padding:14px 4px;border-bottom:1px solid #eef0ef;font-size:15px;color:#1a2223;text-align:right;font-weight:700;">${r.amt ? money(r.amt, cur) : 'TBD'}</td>
      </tr>`).join('');

    return `
    <div style="width:794px;background:#fff;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#1a2223;position:relative;">
      <div style="height:10px;background:linear-gradient(90deg,#3D8593,#FF9900);"></div>
      <div style="padding:48px 56px;position:relative;">
        <img src="${LOGO}" crossorigin="anonymous" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);width:60%;opacity:0.04;" />
        <div style="position:relative;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <img src="${LOGO}" crossorigin="anonymous" style="width:56px;height:56px;border-radius:12px;object-fit:cover;" />
              <div>
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">LegitGrinder</div>
                <div style="font-size:9px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#3D8593;margin-top:2px;">Global Logistics</div>
              </div>
            </div>
            <div style="background:#0f1a1c;color:#fff;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:9px 22px;border-radius:999px;">${isReceipt ? 'Receipt' : 'Invoice'}</div>
          </div>

          <div style="display:flex;gap:24px;border-top:1px solid #eef0ef;border-bottom:1px solid #eef0ef;padding:12px 0;font-size:11px;font-weight:600;color:#6b7677;margin:20px 0 32px;">
            <div>mungaimports@gmail.com</div><div>@Legitgrinderimports</div><div>+254 791 873 538</div><div>www.legitgrinder.com</div>
          </div>

          <div style="display:flex;justify-content:space-between;margin-bottom:28px;">
            <div>
              <div style="font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;">Billed To</div>
              <div style="font-size:18px;font-weight:800;margin-top:4px;">${esc(d.clientName)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;">${isReceipt ? 'Receipt' : 'Invoice'} No &nbsp;·&nbsp; Date</div>
              <div style="font-size:18px;font-weight:800;margin-top:4px;">${isReceipt ? 'LG' : 'IG'}-${esc(d.invoiceNumber)} &nbsp;·&nbsp; ${esc(date)}</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>
              <th style="text-align:left;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:2px solid #0f1a1c;">Item</th>
              <th style="text-align:center;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:2px solid #0f1a1c;">Qty</th>
              <th style="text-align:right;font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:2px solid #0f1a1c;">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-top:24px;">
            <table style="width:300px;border-collapse:collapse;">
              <tr><td style="padding:8px 0;font-size:14px;color:#6b7677;">Total</td><td style="padding:8px 0;font-size:15px;font-weight:700;text-align:right;">${money(d.totalKES || 0, cur)}</td></tr>
              ${isReceipt ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7677;">Amount Paid</td><td style="padding:8px 0;font-size:15px;font-weight:700;text-align:right;color:#3D8593;">${money(paid, cur)}</td></tr>` : ''}
              <tr><td style="padding:12px 12px;font-size:15px;font-weight:800;background:#3D8593;color:#fff;border-radius:8px 0 0 8px;">${fullyPaid ? 'Balance' : 'Balance Due'}</td>
                  <td style="padding:12px 12px;font-size:17px;font-weight:900;text-align:right;background:#3D8593;color:#fff;border-radius:0 8px 8px 0;">${money(balance, cur)}</td></tr>
            </table>
          </div>

          ${d.reference ? `<div style="margin-top:20px;font-size:12px;color:#9aa4a4;">Reference: ${esc(d.reference)}</div>` : ''}

          <div style="margin-top:24px;background:#fff8ed;border:1px solid #fde4bf;border-radius:10px;padding:12px 16px;">
            <div style="font-size:11px;color:#a86b12;line-height:1.5;">Order processing: orders are placed 1 business day after payment is confirmed — the time it takes for funds to settle.</div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:56px;">
            <div style="font-size:11px;color:#9aa4a4;max-width:300px;line-height:1.6;">
              ${isReceipt ? 'Payment received with thanks. Keep this receipt for your records.' : 'Please pay using the link provided or contact us on WhatsApp. Thank you.'}
            </div>
            <div style="text-align:center;">
              <div style="border-top:2px solid #0f1a1c;width:200px;padding-top:8px;font-size:13px;font-weight:700;">Dennis Munga</div>
              <div style="font-size:10px;color:#9aa4a4;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${isReceipt ? 'Received / Approved By' : 'Authorised By'}</div>
            </div>
          </div>

          <div style="text-align:center;margin-top:44px;padding-top:20px;border-top:1px solid #eef0ef;font-size:11px;color:#9aa4a4;font-weight:600;">
            Thank you for choosing <span style="color:#3D8593;">LegitGrinder</span> — Authenticity Guaranteed
          </div>
        </div>
      </div>
    </div>`;
}

/** Build the branded PDF and return a Resend-ready attachment (or undefined on failure). */
export async function generateDocumentAttachment(d: DocumentData): Promise<{ filename: string; content: string } | undefined> {
    const content = await htmlToPdfBase64(buildDocumentHtml(d));
    if (!content) return undefined;
    const prefix = d.kind === 'receipt' ? 'Receipt-LG' : 'Invoice-IG';
    return { filename: `${prefix}-${d.invoiceNumber}.pdf`, content };
}

/**
 * Render document HTML to a single-page A4 PDF, returned as base64 (no data:
 * prefix — ready for a Resend attachment). Runs in the browser only.
 */
export async function htmlToPdfBase64(html: string): Promise<string | null> {
    try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.background = '#ffffff';
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
            // Wait for the logo images to load (or fail) so they aren't blank
            await Promise.all(Array.from(container.querySelectorAll('img')).map((img) =>
                img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = () => res(null); })
            ));

            const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            let w = pageW;
            let h = (canvas.height / canvas.width) * pageW;
            if (h > pageH) { h = pageH; w = (canvas.width / canvas.height) * pageH; }
            pdf.addImage(imgData, 'JPEG', (pageW - w) / 2, 0, w, h);

            const uri = pdf.output('datauristring');
            return uri.split(',')[1] || null;
        } finally {
            document.body.removeChild(container);
        }
    } catch (e) {
        console.error('PDF generation failed:', e);
        return null;
    }
}
