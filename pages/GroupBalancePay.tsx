import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PaystackButton } from 'react-paystack';
import {
  SealCheck, CircleNotch, Package, WhatsappLogo, ShieldCheck
} from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
import { verifyPaystackPayment } from '../services/supabaseData';
import { fetchGroupOrderByCode, recordGroupBalancePayment, notifyGroupBalancePaid, PublicGroupOrder } from '../services/groupBuys';

const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

/**
 * Public page a group-buy buyer lands on from the "your order has arrived"
 * email: /group/pay/GRP-A1B2C3. Shows what they still owe and takes it.
 */
const GroupBalancePay: React.FC = () => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const [order, setOrder] = useState<PublicGroupOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [email, setEmail] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    (async () => {
      if (orderCode) setOrder(await fetchGroupOrderByCode(orderCode));
      setLoading(false);
    })();
  }, [orderCode]);

  const balance = order?.balanceKES || 0;

  const handleSuccess = async (response: any) => {
    setPaid(true);
    verifyPaystackPayment(response.reference).catch(console.error);
    const rec = await recordGroupBalancePayment(order!.orderCode, balance, response.reference);

    // Tell the owner. The WhatsApp hand-off below only arrives if the buyer
    // presses send, so a closed tab used to mean a silently settled balance.
    notifyGroupBalancePaid({
      orderCode: order!.orderCode,
      clientName: order!.clientName,
      campaignTitle: order!.campaignTitle,
      amountKES: balance,
      balanceKES: rec.balanceKES ?? 0,
      fullyPaid: rec.fullyPaid ?? false,
      reference: response.reference,
    });

    // Let the admin know without them having to watch the dashboard.
    const msg = encodeURIComponent(
      `✅ GROUP BALANCE PAID\n\n` +
      `Order: ${order!.orderCode}\n` +
      `Item: ${order!.campaignTitle}\n` +
      `Client: ${order!.clientName || '—'}\n` +
      `Amount: KES ${balance.toLocaleString()}\n` +
      `Ref: ${response.reference}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  const wrap = (inner: React.ReactNode) => (
    <div className="bg-mesh min-h-screen pt-36 pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-md">{inner}</div>
    </div>
  );

  if (loading) return wrap(
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-12 flex flex-col items-center gap-4">
      <CircleNotch size={32} className="text-[#3D8593] animate-spin" />
      <p className="eyebrow text-gray-400">Loading your order…</p>
    </div>
  );

  if (!order) return wrap(
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-10 text-center">
      <Package size={40} weight="duotone" className="text-gray-300 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Order not found</h1>
      <p className="text-sm text-gray-500 font-light mb-6">
        Double-check the link from your email, or message us and we'll sort it out.
      </p>
      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#25D366] text-white px-7 py-3 rounded-full font-black uppercase text-[10px] tracking-widest">
        <WhatsappLogo size={15} weight="fill" /> Message us
      </a>
    </div>
  );

  // Already settled — whether they just paid or paid earlier.
  if (paid || balance <= 0) return wrap(
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-9 text-center">
      <SealCheck size={48} weight="fill" className="text-emerald-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{paid ? 'Payment received 🎉' : 'Fully paid'}</h1>
      <p className="text-sm text-gray-500 font-light mb-1">
        {paid
          ? 'Thank you — your balance is cleared and your order is ready for collection.'
          : 'This order has no outstanding balance.'}
      </p>
      <p className="text-[11px] font-black uppercase tracking-widest text-[#3D8593] mb-6">Order {order.orderCode}</p>
      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! Order ${order.orderCode} — when can I collect?`)}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#25D366] text-white px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest">
        <WhatsappLogo size={15} weight="fill" /> Arrange collection
      </a>
    </div>
  );

  return wrap(
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
      <div className="bg-ink-hero text-white px-8 py-7">
        <p className="eyebrow text-[#FF9900] mb-2">Balance due</p>
        <h1 className="text-2xl font-bold tracking-tight">{order.campaignTitle}</h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-white/50 mt-1.5">Order {order.orderCode}</p>
      </div>

      <div className="p-8">
        {order.clientName && (
          <p className="text-sm text-gray-500 font-light mb-5">
            Hi <strong className="text-gray-900">{order.clientName.split(' ')[0]}</strong> — your order has arrived. Clear the balance below and it's ready to collect.
          </p>
        )}

        <div className="bg-brand-bg rounded-2xl border border-gray-100 p-5 text-sm space-y-2 mb-6">
          <div className="flex justify-between"><span className="text-gray-400 font-bold">Units</span><span className="font-bold text-gray-900">{order.units}</span></div>
          {order.color && (
            <div className="flex justify-between"><span className="text-gray-400 font-bold">Colour</span><span className="font-bold text-gray-900">{order.color}</span></div>
          )}
          <div className="flex justify-between"><span className="text-gray-400 font-bold">Order total</span><span className="font-bold text-gray-900">KES {order.totalKES.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 font-bold">Deposit paid</span><span className="font-bold text-[#3D8593]">− KES {order.amountPaidKES.toLocaleString()}</span></div>
          <div className="flex justify-between pt-3 border-t-2 border-gray-900">
            <span className="font-black text-gray-900">Balance now</span>
            <span className="font-black text-xl text-[#FF9900]">KES {balance.toLocaleString()}</span>
          </div>
        </div>

        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email for your receipt</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full bg-brand-bg border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors mb-5"
        />

        {emailValid ? (
          <PaystackButton
            className="w-full h-14 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#3D8593] transition-colors"
            publicKey={PAYSTACK_PUBLIC_KEY}
            amount={balance * 100}
            currency="KES"
            email={email.trim()}
            metadata={{ custom_fields: [
              { display_name: 'Order', variable_name: 'order_code', value: order.orderCode },
              { display_name: 'Type', variable_name: 'type', value: 'Group buy balance' }
            ] }}
            text={`Pay KES ${balance.toLocaleString()}`}
            onSuccess={handleSuccess}
            onClose={() => {}}
          />
        ) : (
          <button disabled className="w-full h-14 bg-neutral-200 text-neutral-400 rounded-full font-black uppercase text-[11px] tracking-[0.25em] cursor-not-allowed">
            Enter your email to pay
          </button>
        )}

        <p className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium mt-4">
          <ShieldCheck size={14} weight="duotone" className="text-[#3D8593]" />
          Secured by Paystack · card or M-Pesa
        </p>

        <p className="text-[11px] text-gray-400 font-medium text-center mt-4">
          Already paid another way? <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I've paid the balance for order ${order.orderCode}.`)}`} target="_blank" rel="noopener noreferrer" className="text-[#3D8593] font-bold hover:underline">Tell us here</a>.
        </p>
      </div>
    </div>
  );
};

export default GroupBalancePay;
