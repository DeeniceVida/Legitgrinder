import React, { useMemo, useState } from 'react';
import { Boat, AirplaneTilt, Copy, Check, Package } from '@phosphor-icons/react';
import { KES_PER_USD } from '../constants';
import {
  SEA_RATE_KES_PER_CBM, AIR_RATE_USD_PER_KG,
  goodsToKES, seaFreightKES, airFreightKES, quoteChina, QuoteLines,
} from '../utils/chinaQuote';
import { looksLikeBusinessGoods } from '../utils/serviceFee';

/**
 * Admin → China Quote.
 *
 * Type what the supplier wants and either the volume or the weight, and both
 * ways of shipping it are priced at once — because the cheaper one depends
 * entirely on the carton. It lives in the dashboard rather than on the site:
 * the freight rates are exactly what a competitor would like to know.
 *
 * Quotes only. Nothing here is saved, and nothing is sent.
 */

const money = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const ChinaQuoteTab: React.FC = () => {
  const [itemName, setItemName] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KES'>('USD');
  const [cbm, setCbm] = useState('');
  const [kg, setKg] = useState('');
  const [business, setBusiness] = useState(false);
  const [addTransaction, setAddTransaction] = useState(true);
  const [seaRate, setSeaRate] = useState(String(SEA_RATE_KES_PER_CBM));
  const [airRate, setAirRate] = useState(String(AIR_RATE_USD_PER_KG));
  const [copied, setCopied] = useState<'sea' | 'air' | null>(null);

  const goodsKES = goodsToKES(parseFloat(cost) || 0, currency);
  const hasCost = goodsKES > 0;

  const sea = useMemo(() => quoteChina({
    goodsKES, business, addTransaction,
    freightKES: seaFreightKES(parseFloat(cbm) || 0, parseFloat(seaRate) || 0),
  }), [goodsKES, cbm, seaRate, business, addTransaction]);

  const air = useMemo(() => quoteChina({
    goodsKES, business, addTransaction,
    freightKES: airFreightKES(parseFloat(kg) || 0, parseFloat(airRate) || 0),
  }), [goodsKES, kg, airRate, business, addTransaction]);

  const copyQuote = (mode: 'sea' | 'air', q: QuoteLines) => {
    const text = [
      '*LegitGrinder — Import Quote*',
      itemName.trim() ? itemName.trim() : 'Your order',
      mode === 'sea'
        ? `By sea · ${cbm || 0} CBM · 30–45 days`
        : `By air · ${kg || 0} kg · 2–3 weeks`,
      '',
      `Buying price: ${money(q.buyingKES)}`,
      `Shipping: ${money(q.freightKES)}`,
      `Service fee: ${money(q.serviceFeeKES)}`,
      '',
      `*TOTAL: ${money(q.totalKES)}*`,
      'Delivered to Nairobi CBD.',
      '',
      'LegitGrinder · +254 791 873 538',
    ].join('\n');
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(mode); setTimeout(() => setCopied(null), 2000); })
      .catch(() => window.prompt('Copy the quote:', text));
  };

  const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors placeholder:text-neutral-300 placeholder:font-medium';
  const label = 'text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5';

  const card = (
    mode: 'sea' | 'air', q: QuoteLines, measured: boolean, basis: string,
  ) => (
    <div className={`rounded-2xl border p-5 ${measured && hasCost ? 'border-[#3D8593]/40 bg-white' : 'border-neutral-100 bg-neutral-50/40'}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'sea' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-[#FF9900]'}`}>
            {mode === 'sea' ? <Boat size={18} weight="duotone" /> : <AirplaneTilt size={18} weight="duotone" />}
          </span>
          <div>
            <p className="text-sm font-black text-gray-900 tracking-tight">{mode === 'sea' ? 'By sea' : 'By air'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {mode === 'sea' ? '30–45 days' : '2–3 weeks'}
            </p>
          </div>
        </div>
        {measured && hasCost && (
          <button onClick={() => copyQuote(mode, q)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] flex items-center gap-1.5">
            {copied === mode ? <><Check size={12} weight="bold" /> Copied</> : <><Copy size={12} weight="bold" /> Copy</>}
          </button>
        )}
      </div>

      {!hasCost || !measured ? (
        <p className="text-[12px] font-medium text-gray-400">
          {!hasCost ? 'Enter what the supplier charges.' : basis}
        </p>
      ) : (
        <>
          <dl className="space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <dt className="text-gray-500">Buying price{addTransaction ? ' (incl. 5%)' : ''}</dt>
              <dd className="font-bold text-gray-900">{money(q.buyingKES)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping · {basis}</dt>
              <dd className="font-bold text-gray-900">{money(q.freightKES)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Service fee{business ? ' · business' : ''}</dt>
              <dd className="font-bold text-emerald-600">{money(q.serviceFeeKES)}</dd>
            </div>
          </dl>
          <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-neutral-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quote</span>
            <span className="text-xl font-black text-gray-900 tracking-tight">{money(q.totalKES)}</span>
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-2">
            You keep {money(q.serviceFeeKES)} of this.
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-50 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-teal-50 text-[#3D8593] flex items-center justify-center">
          <Package size={18} weight="duotone" />
        </span>
        <div>
          <h3 className="text-sm font-black text-gray-900 tracking-tight">China quote</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            Sea by volume · air by weight · your fee on top
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>What is it <span className="text-neutral-300 normal-case font-medium">— optional, used on the copied quote</span></label>
            <input value={itemName} onChange={e => setItemName(e.target.value)} className={input}
              placeholder="e.g. 2x embroidery machine" />
          </div>

          <div>
            <label className={label}>What the supplier charges</label>
            <div className="flex gap-2">
              <input value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal" className={input} placeholder="0" />
              <div className="flex rounded-xl border border-neutral-200 overflow-hidden shrink-0">
                {(['USD', 'KES'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className={`px-3 text-[10px] font-black tracking-widest transition-colors ${currency === c ? 'bg-[#3D8593] text-white' : 'bg-white text-gray-400 hover:text-[#3D8593]'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {hasCost && currency === 'USD' && (
              <p className="text-[10px] font-bold text-gray-400 mt-1">= {money(goodsKES)} at {KES_PER_USD}/USD</p>
            )}
          </div>

          <div className="flex items-end gap-2">
            <label className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border cursor-pointer select-none ${business
              ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#b36b00]' : 'border-neutral-200 text-gray-400'}`}>
              <input type="checkbox" checked={business} onChange={e => setBusiness(e.target.checked)} className="accent-[#FF9900]" />
              <span className="text-[9px] font-black uppercase tracking-widest">Business goods</span>
            </label>
            <label className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl border cursor-pointer select-none ${addTransaction
              ? 'border-[#3D8593] bg-[#3D8593]/10 text-[#2d626c]' : 'border-neutral-200 text-gray-400'}`}>
              <input type="checkbox" checked={addTransaction} onChange={e => setAddTransaction(e.target.checked)} className="accent-[#3D8593]" />
              <span className="text-[9px] font-black uppercase tracking-widest">Add 5%</span>
            </label>
          </div>
        </div>

        {!business && looksLikeBusinessGoods(itemName) && (
          <p className="text-[11px] font-bold text-[#FF9900]">
            That looks like a work machine — tick Business goods for the 7% rate.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Volume for sea <span className="text-neutral-300 normal-case font-medium">— CBM</span></label>
            <input value={cbm} onChange={e => setCbm(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" className={input} placeholder="e.g. 0.1" />
          </div>
          <div>
            <label className={label}>Weight for air <span className="text-neutral-300 normal-case font-medium">— kg</span></label>
            <input value={kg} onChange={e => setKg(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" className={input} placeholder="e.g. 20" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {card('sea', sea, (parseFloat(cbm) || 0) > 0, `${cbm || 0} CBM × ${money(parseFloat(seaRate) || 0)}`)}
          {card('air', air, (parseFloat(kg) || 0) > 0, `${kg || 0} kg × $${airRate}`)}
        </div>

        {/* Freight moves. Changing it here changes this quote only. */}
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-[#3D8593] list-none">
            Freight rates for this quote
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className={label}>Sea · KES per CBM</label>
              <input value={seaRate} onChange={e => setSeaRate(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal" className={input} />
            </div>
            <div>
              <label className={label}>Air · USD per kg</label>
              <input value={airRate} onChange={e => setAirRate(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal" className={input} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-2">
            Changed here for this quote only. Tell me if a rate has moved for good and I'll change the default.
          </p>
        </details>
      </div>
    </div>
  );
};

export default ChinaQuoteTab;
