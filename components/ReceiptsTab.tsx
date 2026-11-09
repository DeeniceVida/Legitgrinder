import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, MagnifyingGlass, PaperPlaneTilt, CheckCircle, WarningCircle, ArrowsClockwise, Envelope } from '@phosphor-icons/react';
import { Invoice } from '../types';
import { sendInvoiceEmail } from '../services/supabaseData';
import { fetchSentEmails, SentEmail } from '../services/sentEmails';
import { generateDocumentAttachment } from '../utils/receiptDocument';
import { collectedKES } from '../utils/invoiceMoney';

/**
 * Admin → Receipts.
 *
 * The ✉ on an order row already emails a receipt once that order is paid, but
 * it is one icon among six and it changes meaning with the payment status —
 * so there was no way to see which customers actually have their receipt, and
 * no obvious place to send one after the fact.
 *
 * This is that place: every paid order, what has been emailed and when, and a
 * button to send or send again. Nothing here changes an order — a receipt is a
 * record of money already taken.
 */

interface Props {
  invoices: Invoice[];
}

const money = (inv: Invoice, n: number) => `${inv.currency || 'KES'} ${Math.round(n).toLocaleString()}`;

const when = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ReceiptsTab: React.FC<Props> = ({ invoices }) => {
  const [search, setSearch] = useState('');
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetchSentEmails(500)
      .then(list => setSent(list.filter(e => e.kind === 'receipt')))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  /** The last receipt email for each order number, successful or not. */
  const lastByRef = useMemo(() => {
    const map: Record<string, SentEmail> = {};
    for (const e of sent) {
      const ref = e.reference;
      if (!ref) continue;
      const prev = map[ref];
      if (!prev || new Date(e.createdAt) > new Date(prev.createdAt)) map[ref] = e;
    }
    return map;
  }, [sent]);

  /**
   * A receipt belongs to money actually taken. Part-paid orders are left out —
   * what they need is a balance invoice, which the order row already sends.
   */
  const paid = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter(inv => inv.isPaid)
      .filter(inv => !q
        || inv.invoiceNumber?.toLowerCase().includes(q)
        || inv.clientName?.toLowerCase().includes(q)
        || inv.clientEmail?.toLowerCase().includes(q)
        || inv.productName?.toLowerCase().includes(q))
      .filter(inv => !onlyUnsent || lastByRef[inv.invoiceNumber]?.status !== 'sent')
      .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }, [invoices, search, onlyUnsent, lastByRef]);

  const neverSent = useMemo(
    () => invoices.filter(inv => inv.isPaid && lastByRef[inv.invoiceNumber]?.status !== 'sent').length,
    [invoices, lastByRef]
  );

  const emailReceipt = async (inv: Invoice, resend: boolean) => {
    const to = inv.clientEmail
      || window.prompt(`No email on file for ${inv.invoiceNumber}. Send the receipt to which address?`, '')?.trim();
    if (!to) return;
    if (resend && !window.confirm(`Send ${inv.clientName} another copy of the receipt for ${inv.invoiceNumber}?`)) return;

    setBusy(inv.id);
    setNote(null);
    const docData = {
      kind: 'receipt' as const,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      productName: inv.productName,
      items: inv.items,
      currency: inv.currency,
      totalKES: inv.totalKES || 0,
      // A receipt says the money is in. Anything else is an invoice.
      amountPaidKES: inv.totalKES || 0,
      balanceKES: 0,
      reference: inv.paystackReference,
      deliveryNote: inv.deliveryNote,
    };
    try {
      const attachment = await generateDocumentAttachment(docData);
      const res = await sendInvoiceEmail({ ...docData, to, attachment });
      setNote(res.success
        ? { ok: true, text: `Receipt for ${inv.invoiceNumber} emailed to ${to}, with the PDF attached.` }
        : { ok: false, text: `Could not email ${inv.invoiceNumber}: ${res.error || 'unknown error'}` });
    } catch (e: any) {
      setNote({ ok: false, text: `Could not email ${inv.invoiceNumber}: ${e?.message || 'the PDF failed to build'}` });
    }
    setBusy(null);
    load();
  };

  const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors placeholder:text-neutral-300';

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt size={18} weight="duotone" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Receipts <span className="text-gray-400 font-bold">({paid.length})</span>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Paid orders · {neverSent === 0 ? 'every receipt sent' : `${neverSent} not emailed yet`}
            </p>
          </div>
        </div>
        <button onClick={load}
          className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors"
          title="Refresh what has been sent">
          <ArrowsClockwise size={14} weight="bold" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {note && (
          <div className={`flex items-start gap-3 rounded-xl p-4 border ${note.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            {note.ok
              ? <CheckCircle size={16} weight="duotone" className="text-emerald-600 shrink-0 mt-0.5" />
              : <WarningCircle size={16} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />}
            <p className={`text-sm font-medium flex-1 ${note.ok ? 'text-emerald-900' : 'text-rose-900'}`}>{note.text}</p>
            <button onClick={() => setNote(null)} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600">
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Order number, client, email or item" className={input} />
          </div>
          <button onClick={() => setOnlyUnsent(v => !v)}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${onlyUnsent
              ? 'bg-[#FF9900] border-[#FF9900] text-white'
              : 'bg-white border-neutral-200 text-gray-500 hover:border-[#FF9900] hover:text-[#FF9900]'}`}>
            Not emailed yet
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        ) : !paid.length ? (
          <p className="text-sm text-gray-400 font-medium">
            {onlyUnsent ? 'Every paid order has had its receipt emailed.' : 'No paid orders yet.'}
          </p>
        ) : paid.map(inv => {
          const last = lastByRef[inv.invoiceNumber];
          const ok = last?.status === 'sent';
          return (
            <div key={inv.id} className="p-4 rounded-2xl border border-neutral-100 bg-white flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
                  {inv.clientName || 'Client'}
                  <span className="text-[10px] font-bold text-gray-400">{inv.invoiceNumber}</span>
                  {ok ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest">
                      Sent {when(last.createdAt)}
                    </span>
                  ) : last ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest"
                      title={last.error}>
                      Failed {when(last.createdAt)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#FF9900] text-[8px] font-black uppercase tracking-widest">
                      Not emailed
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-bold text-gray-500 mt-1 truncate">{inv.productName || '—'}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{money(inv, collectedKES(inv) || inv.totalKES || 0)} received</span>
                  <span className="text-gray-300">·</span>
                  <span>{when(inv.createdAt || inv.date)}</span>
                  <span className="text-gray-300">·</span>
                  {inv.clientEmail
                    ? <span className="inline-flex items-center gap-1"><Envelope size={10} weight="bold" /> {inv.clientEmail}</span>
                    : <span className="text-[#FF9900]">no email on file</span>}
                </p>
              </div>

              <button
                onClick={() => emailReceipt(inv, ok)}
                disabled={busy === inv.id}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-40 ${ok
                  ? 'border border-neutral-200 text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593]'
                  : 'bg-[#3D8593] text-white hover:bg-black'}`}
                title={ok ? 'Send another copy' : 'Email this receipt with its PDF'}
              >
                <PaperPlaneTilt size={13} weight="bold" />
                {busy === inv.id ? 'Sending…' : ok ? 'Send again' : 'Email receipt'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReceiptsTab;
