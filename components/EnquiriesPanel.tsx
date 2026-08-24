import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Check, X, RefreshCcw, AlertTriangle, Clock } from 'lucide-react';
import { Product } from '../types';
import { updateProduct } from '../services/supabaseData';
import {
  ProductEnquiry, fetchProductEnquiries, setEnquiryOutcome, deleteEnquiry,
  ageHours, needsFollowUp,
} from '../services/enquiries';

/**
 * Admin → Stock → WhatsApp enquiries.
 *
 * Every "Order via WhatsApp" tap lands here. Answering "Bought" takes the
 * pieces off stock — including the specific variant when one was chosen — so
 * the shop stops offering something that has already gone. "No sale" closes it
 * and leaves stock alone.
 *
 * Anything over a day old is surfaced as needing an answer, because an
 * unanswered enquiry is exactly how stock goes wrong.
 */

interface Props {
  products: Product[];
  onProductsChanged: () => void;
}

const EnquiriesPanel: React.FC<Props> = ({ products, onProductsChanged }) => {
  const [enquiries, setEnquiries] = useState<ProductEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProductEnquiries()
      .then(setEnquiries)
      .catch(() => setError('Could not load enquiries'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const open = useMemo(() => enquiries.filter(e => e.status === 'open'), [enquiries]);
  const resolved = useMemo(() => enquiries.filter(e => e.status !== 'open'), [enquiries]);
  const chase = open.filter(needsFollowUp);

  /** Take this enquiry's pieces off the shelf. */
  const deductStock = async (e: ProductEnquiry): Promise<string | null> => {
    const product = products.find(p => p.id === e.productId);
    if (!product) return 'That product no longer exists, so stock was left alone.';

    const qty = e.quantity || 1;
    const patch: Partial<Product> = {
      stockCount: Math.max((product.stockCount || 0) - qty, 0),
    };

    // The enquiry stores the variant as "Size: 90 x 30cm Black". Match on the
    // name after the colon so the right piece is the one deducted.
    if (e.variant && product.variations?.length) {
      const wanted = e.variant.split(',').map(s => s.split(':').pop()!.trim().toLowerCase());
      patch.variations = product.variations.map(v =>
        typeof v.stockCount === 'number' && wanted.includes((v.name || '').trim().toLowerCase())
          ? { ...v, stockCount: Math.max(v.stockCount - qty, 0) }
          : v);
    }

    const res = await updateProduct(product.id, patch);
    return res.success ? null : 'Stock could not be updated.';
  };

  const answer = async (e: ProductEnquiry, bought: boolean) => {
    setBusy(e.id); setError(null);
    let adjusted = false;

    if (bought && !e.stockAdjusted) {
      const problem = await deductStock(e);
      if (problem) setError(problem);
      else { adjusted = true; onProductsChanged(); }
    }

    const res = await setEnquiryOutcome(e.id, bought ? 'bought' : 'lost', adjusted || e.stockAdjusted);
    setBusy(null);
    if (!res.success) { setError(res.error || 'Could not save that.'); return; }
    setEnquiries(prev => prev.map(x => x.id === e.id
      ? { ...x, status: bought ? 'bought' : 'lost', stockAdjusted: adjusted || x.stockAdjusted }
      : x));
  };

  const reopen = async (e: ProductEnquiry) => {
    setBusy(e.id);
    await setEnquiryOutcome(e.id, 'open');
    setBusy(null);
    setEnquiries(prev => prev.map(x => (x.id === e.id ? { ...x, status: 'open' } : x)));
  };

  const remove = async (e: ProductEnquiry) => {
    setBusy(e.id);
    await deleteEnquiry(e.id);
    setBusy(null);
    setEnquiries(prev => prev.filter(x => x.id !== e.id));
  };

  const age = (e: ProductEnquiry) => {
    const h = ageHours(e);
    if (h < 1) return 'just now';
    if (h < 24) return `${Math.floor(h)}h ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  };

  const row = (e: ProductEnquiry) => (
    <div key={e.id} className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 ${needsFollowUp(e) ? 'border-amber-200 bg-amber-50/60' : 'border-neutral-100 bg-white'}`}>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-black text-gray-900 tracking-tight truncate">{e.productName}</p>
        <p className="text-[11px] font-bold text-gray-500 mt-0.5">
          {e.variant || 'No option chosen'} · {e.quantity} pc{e.quantity === 1 ? '' : 's'}
          {e.unitPriceKES ? ` · KES ${(e.unitPriceKES * e.quantity).toLocaleString()}` : ''}
        </p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> {age(e)}
          {e.stockAdjusted && <span className="text-emerald-600">· stock deducted</span>}
        </p>
      </div>

      {e.status === 'open' ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => answer(e, true)}
            disabled={busy === e.id}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5 inline mr-1" /> Bought — take {e.quantity} off
          </button>
          <button
            onClick={() => answer(e, false)}
            disabled={busy === e.id}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors disabled:opacity-40"
          >
            No sale
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${e.status === 'bought' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-gray-400'}`}>
            {e.status === 'bought' ? 'Bought' : 'No sale'}
          </span>
          <button onClick={() => reopen(e)} disabled={busy === e.id}
            className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#3D8593] transition-colors">
            Reopen
          </button>
          <button onClick={() => remove(e)} disabled={busy === e.id}
            className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 transition-colors" title="Delete">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#25D366]/10 text-[#1eb955] flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              WhatsApp enquiries {open.length > 0 && <span className="text-gray-400 font-bold">({open.length} open)</span>}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Answer these and your stock stays right
            </p>
          </div>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors" title="Reload">
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-6 space-y-3">
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </div>
        )}

        {chase.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <p className="text-[12px] font-medium text-amber-900/80 leading-relaxed">
              <strong>{chase.length} enquir{chase.length === 1 ? 'y has' : 'ies have'} been waiting over a day.</strong> Until
              you answer, anything already sold is still on sale in the shop.
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        ) : !enquiries.length ? (
          <p className="text-sm text-gray-400 font-medium">
            Nothing yet. Enquiries appear here the moment a shopper taps “Order via WhatsApp”.
            {' '}If you’ve just added the feature, run <code>add_product_enquiries.sql</code> first.
          </p>
        ) : (
          <>
            {open.length === 0 && <p className="text-sm text-gray-400 font-medium">All answered — nothing waiting on you.</p>}
            {open.map(row)}

            {resolved.length > 0 && (
              <button
                onClick={() => setShowResolved(s => !s)}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#3D8593] transition-colors pt-2"
              >
                {showResolved ? 'Hide' : 'Show'} {resolved.length} answered
              </button>
            )}
            {showResolved && resolved.map(row)}
          </>
        )}
      </div>
    </div>
  );
};

export default EnquiriesPanel;
