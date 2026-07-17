import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PaystackButton } from 'react-paystack';
import {
  SealCheck, WhatsappLogo, ShieldCheck, CircleNotch, UsersThree,
  Minus, Plus, Copy, CheckCircle, Package
} from '@phosphor-icons/react';
import { WHATSAPP_NUMBER, WHATSAPP_GROUP_LINK } from '../constants';
import { verifyPaystackPayment } from '../services/supabaseData';
import { fetchGroupCampaign, recordGroupOrder, markGroupJoined, GroupCampaign } from '../services/groupBuys';
import { normalizeKenyanPhone } from '../utils/phone';

const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

const GroupBuy: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<GroupCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [units, setUnits] = useState(1);
  const [deposit, setDeposit] = useState('');

  const [paid, setPaid] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const isClosed = !!campaign && (
    campaign.status !== 'open' ||
    (!!campaign.closesAt && new Date(campaign.closesAt).getTime() < Date.now())
  );

  useEffect(() => {
    (async () => {
      if (slug) setCampaign(await fetchGroupCampaign(slug));
      setLoading(false);
    })();
  }, [slug]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = normalizeKenyanPhone(whatsapp).length >= 12;
  const unitPrice = campaign?.unitPriceKES || 0;
  const minPerUnit = campaign?.minDepositKES || 0;
  const total = units * unitPrice;
  const minDeposit = Math.max(units * minPerUnit, 1);
  const parsedDeposit = parseInt(deposit || '0', 10) || 0;
  const amountToCharge = Math.min(Math.max(parsedDeposit || minDeposit, minDeposit), total);
  const balanceAfter = Math.max(total - amountToCharge, 0);
  const canPay = !!name.trim() && phoneValid && emailValid && amountToCharge >= minDeposit;

  const handleSuccess = async (response: any) => {
    verifyPaystackPayment(response.reference).catch(console.error);
    const res = await recordGroupOrder({
      campaignId: campaign!.id,
      clientName: name.trim(),
      clientWhatsapp: normalizeKenyanPhone(whatsapp),
      clientEmail: email.trim(),
      units,
      totalKES: total,
      amountPaidKES: amountToCharge,
      paystackReference: response.reference
    });
    setOrderCode(res.orderCode || '');
    setPaid(true);

    // Ping the admin on WhatsApp so they see it even while asleep.
    const adminMsg = encodeURIComponent(
      `🛒 GROUP-BUY DEPOSIT\n\n` +
      `Campaign: ${campaign!.title}\n` +
      `Client: ${name.trim()} (${normalizeKenyanPhone(whatsapp)})\n` +
      `Units: ${units}\n` +
      `Paid now: KES ${amountToCharge.toLocaleString()}\n` +
      `Balance: KES ${balanceAfter.toLocaleString()}\n` +
      `Order: ${res.orderCode || '—'}\n` +
      `Ref: ${response.reference}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${adminMsg}`, '_blank');
  };

  // Leads with the item name so the admin can tell orders apart in the one shared group.
  const confirmationText = `✅ Deposit paid — ${campaign?.title}\nOrder ${orderCode} · ${units} unit${units > 1 ? 's' : ''} · ${name}`;

  // Every campaign points to the one community group unless it sets its own link.
  const groupLink = campaign?.whatsappGroupLink || WHATSAPP_GROUP_LINK;

  const copyConfirmation = () => {
    navigator.clipboard.writeText(confirmationText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const joinGroup = () => {
    if (orderCode) markGroupJoined(orderCode);
    if (groupLink) window.open(groupLink, '_blank');
  };

  return (
    <div className="bg-mesh min-h-screen pt-36 pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-12 flex flex-col items-center gap-4">
            <CircleNotch size={32} className="text-[#3D8593] animate-spin" />
            <p className="eyebrow text-gray-400">Loading…</p>
          </div>
        ) : !campaign ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-10 text-center">
            <UsersThree size={40} weight="duotone" className="text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Campaign not found</h1>
            <p className="text-sm text-gray-500 font-light">This group-buy link may be wrong or closed. Please confirm it with us.</p>
          </div>
        ) : paid ? (
          /* ---------- SUCCESS: join the group + confirm ---------- */
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-9 text-center">
            <SealCheck size={48} weight="fill" className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">You're in! 🎉</h1>
            <p className="text-sm text-gray-500 font-light mb-1">Your reservation is confirmed.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#3D8593] mb-6">Order {orderCode}</p>

            <div className="bg-brand-bg rounded-2xl border border-gray-100 p-5 text-left text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-gray-400 font-bold">Units</span><span className="font-bold text-gray-900">{units}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-bold">Paid now</span><span className="font-bold text-emerald-600">KES {amountToCharge.toLocaleString()}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><span className="text-gray-400 font-bold">Balance (on arrival)</span><span className="font-black text-[#FF9900]">KES {balanceAfter.toLocaleString()}</span></div>
            </div>

            <p className="text-sm text-gray-600 font-medium mb-3">Last step — join the group and paste your confirmation so we lock in your order:</p>
            {groupLink && (
              <button onClick={joinGroup} className="w-full h-14 bg-[#25D366] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#1eb955] transition-colors mb-3">
                <UsersThree size={18} weight="fill" /> Join the WhatsApp group
              </button>
            )}
            <button onClick={copyConfirmation} className="w-full h-12 bg-white border border-gray-200 text-gray-600 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:border-[#3D8593] hover:text-[#3D8593] transition-colors">
              {copied ? <><CheckCircle size={15} weight="fill" className="text-emerald-500" /> Copied — paste it in the group</> : <><Copy size={15} weight="bold" /> Copy confirmation message</>}
            </button>
          </div>
        ) : isClosed ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-10 text-center">
            <UsersThree size={40} weight="duotone" className="text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">This group buy is closed</h1>
            <p className="text-sm text-gray-500 font-light">Reservations for “{campaign.title}” are no longer open. Reach out for the next batch.</p>
          </div>
        ) : (
          /* ---------- RESERVE / PAY ---------- */
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="bg-ink-hero text-white px-8 py-7">
              <p className="eyebrow text-[#FF9900] mb-2 flex items-center gap-2"><UsersThree size={14} weight="fill" /> Group Buy</p>
              <h1 className="text-2xl font-bold tracking-tight">{campaign.title}</h1>
            </div>
            <div className="p-8">
              {campaign.imageUrl && (
                <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-44 object-cover rounded-2xl mb-5 border border-gray-100" />
              )}
              {campaign.description && <p className="text-sm text-gray-500 font-light leading-relaxed mb-6">{campaign.description}</p>}

              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price per unit · all-inclusive</span>
                <span className="text-xl font-black text-gray-900">KES {unitPrice.toLocaleString()}</span>
              </div>

              {campaign.closesAt && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-5">
                  <span className="text-amber-500">⏳</span>
                  <p className="text-[11px] font-bold text-amber-700">
                    Reservations close {new Date(campaign.closesAt).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}

              {/* Units */}
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">How many units?</label>
              <div className="flex items-center gap-3 mb-2">
                <button type="button" onClick={() => setUnits(u => Math.max(1, u - 1))} className="w-11 h-11 rounded-xl bg-brand-bg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593]"><Minus size={16} weight="bold" /></button>
                <span className="flex-1 text-center text-2xl font-black text-gray-900">{units}</span>
                <button type="button" onClick={() => setUnits(u => u + 1)} className="w-11 h-11 rounded-xl bg-brand-bg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593]"><Plus size={16} weight="bold" /></button>
              </div>
              <div className="flex gap-2 mb-5">
                {[1, 2, 3, 5].map(n => (
                  <button key={n} type="button" onClick={() => setUnits(n)} className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${units === n ? 'bg-[#3D8593] text-white' : 'bg-brand-bg border border-gray-200 text-gray-400 hover:border-[#3D8593]'}`}>{n} pc{n > 1 ? 's' : ''}</button>
                ))}
              </div>

              <div className="bg-brand-bg rounded-2xl border border-gray-100 p-4 text-sm space-y-2 mb-5">
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Order total ({units} × {unitPrice.toLocaleString()})</span><span className="font-bold text-gray-900">KES {total.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Minimum deposit</span><span className="font-bold text-[#3D8593]">KES {minDeposit.toLocaleString()}</span></div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 gap-3 mb-4">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors" />
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp number (07… or 254…)"
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email (for your receipt)"
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors" />
              </div>

              {/* Deposit amount */}
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Deposit now (min KES {minDeposit.toLocaleString()}, or pay full)</label>
              <div className="relative mb-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">KES</span>
                <input type="number" min={minDeposit} max={total} value={deposit} onChange={e => setDeposit(e.target.value)} placeholder={String(minDeposit)}
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl pl-14 pr-4 text-sm font-bold outline-none focus:border-[#3D8593] transition-colors" />
              </div>
              <p className="text-[11px] font-medium text-gray-500 mb-4">Balance after this: <strong className="text-[#FF9900]">KES {balanceAfter.toLocaleString()}</strong> — payable when your order arrives.</p>

              {/* Terms — always accessible before paying */}
              <div className="mb-5 rounded-2xl border border-gray-100 overflow-hidden">
                <button type="button" onClick={() => setShowTerms(s => !s)} className="w-full flex items-center justify-between px-4 py-3 bg-brand-bg text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">How this group buy works</span>
                  <span className="text-gray-400 text-xs">{showTerms ? '▲' : '▼'}</span>
                </button>
                {showTerms && (
                  <ul className="px-5 py-4 space-y-2 text-[12px] text-gray-500 font-medium leading-relaxed list-disc list-inside">
                    <li>Your order is placed <strong className="text-gray-700">once the group closes</strong> — not when you pay. Everyone's items are ordered together as a batch.</li>
                    <li>Delivery: <strong className="text-gray-700">air 2–3 weeks</strong>, <strong className="text-gray-700">sea 30–45 days</strong> after the group closes.</li>
                    <li>Your <strong className="text-gray-700">balance is paid before collection</strong> — once you're notified the item has arrived and is ready to collect.</li>
                    <li>Please <strong className="text-gray-700">pay only through this link</strong> unless we tell you otherwise.</li>
                  </ul>
                )}
              </div>

              {canPay ? (
                <PaystackButton
                  key={amountToCharge}
                  className="w-full h-14 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#3D8593] transition-all shadow-xl"
                  publicKey={PAYSTACK_PUBLIC_KEY}
                  amount={Math.round(amountToCharge * 100)}
                  currency="KES"
                  email={email}
                  metadata={{ custom_fields: [
                    { display_name: 'Group Buy', variable_name: 'campaign', value: campaign.title },
                    { display_name: 'Units', variable_name: 'units', value: String(units) },
                    { display_name: 'Client', variable_name: 'client', value: name.trim() },
                  ] }}
                  text={`Pay KES ${amountToCharge.toLocaleString()} Deposit`}
                  onSuccess={handleSuccess}
                  onClose={() => { /* dismissed */ }}
                />
              ) : (
                <button disabled className="w-full h-14 bg-neutral-200 text-neutral-400 rounded-full font-black uppercase text-[11px] tracking-[0.25em] cursor-not-allowed">
                  {!name.trim() ? 'Enter your name' : !phoneValid ? 'Enter a valid WhatsApp number' : !emailValid ? 'Enter your email' : 'Enter a valid deposit'}
                </button>
              )}

              <p className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-5">
                <ShieldCheck size={14} className="text-[#3D8593]" /> Secured by Paystack · Card &amp; M-Pesa
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupBuy;
