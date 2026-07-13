import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PaystackButton } from 'react-paystack';
import { SealCheck, WhatsappLogo, Receipt, ShieldCheck, CircleNotch } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { verifyPaystackPayment, recordInvoicePayment, sendInvoiceEmail } from '../services/supabaseData';
import { generateDocumentAttachment } from '../utils/receiptDocument';
import { WHATSAPP_NUMBER } from '../constants';

/**
 * Public payment page for admin-generated pay links: /pay/<invoiceNumber>
 * The admin creates a manual order in the dashboard, clicks "Copy Pay Link",
 * and sends it to the client. The client pays here via Paystack.
 * On success we verify server-side and notify the admin on WhatsApp
 * (payment status is flipped by the admin — guests cannot write to invoices).
 */

const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

interface PayableInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  productName: string;
  quantity: number;
  totalKES: number;
  currency: string;
  isPaid: boolean;
  paymentStatus: string;
}

const PayInvoice: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [invoice, setInvoice] = useState<PayableInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [email, setEmail] = useState('');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, client_name, product_name, quantity, total_kes, currency, is_paid, payment_status')
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        if (!error && data) {
          setInvoice({
            id: data.id,
            invoiceNumber: data.invoice_number,
            clientName: data.client_name,
            productName: data.product_name,
            quantity: data.quantity || 1,
            totalKES: data.total_kes || 0,
            currency: data.currency || 'KES',
            isPaid: !!data.is_paid,
            paymentStatus: data.payment_status || 'Unpaid',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceNumber]);

  const handleSuccess = async (response: any) => {
    setPaid(true);
    // Server-side verification (non-blocking)
    verifyPaystackPayment(response.reference).catch(console.error);
    // Record the payment in Supabase (marks Paid / Partially Paid, stores email + ref)
    const result = await recordInvoicePayment(invoice!.invoiceNumber, invoice!.totalKES, response.reference, email);
    const balanceKES = result ? result.balanceKES : 0;
    const balanceNote = balanceKES > 0 ? `\nBalance remaining: KES ${balanceKES.toLocaleString()}` : '';

    // Email the client their receipt with a downloadable branded PDF attached
    // (best-effort; the /api/send-email function runs on the live site only)
    (async () => {
      const docData = {
        kind: 'receipt' as const,
        invoiceNumber: invoice!.invoiceNumber,
        clientName: invoice!.clientName,
        productName: invoice!.productName,
        currency: invoice!.currency,
        totalKES: invoice!.totalKES,
        amountPaidKES: invoice!.totalKES - balanceKES,
        balanceKES,
        reference: response.reference,
      };
      const attachment = await generateDocumentAttachment(docData);
      await sendInvoiceEmail({
        ...docData,
        to: email,
        payUrl: balanceKES > 0 ? `${window.location.origin}/pay/${invoice!.invoiceNumber}` : undefined,
        attachment,
      });
    })().catch(console.error);
    const msg = encodeURIComponent(
      `✅ PAY-LINK PAYMENT RECEIVED\n\n` +
      `Invoice: IG-${invoice?.invoiceNumber}\n` +
      `Item: ${invoice?.productName}\n` +
      `Amount: KES ${invoice?.totalKES.toLocaleString()}\n` +
      `Client email: ${email}\n` +
      `Paystack Ref: ${response.reference}${balanceNote}\n\n` +
      `Please confirm and start processing.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  const waFallback = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! I have a question about paying invoice IG-${invoiceNumber}.`)}`;

  return (
    <div className="bg-mesh min-h-screen pt-36 pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-12 flex flex-col items-center gap-4">
            <CircleNotch size={32} className="text-[#3D8593] animate-spin" />
            <p className="eyebrow text-gray-400">Loading invoice…</p>
          </div>
        ) : !invoice ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-10 text-center">
            <Receipt size={40} weight="duotone" className="text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice not found</h1>
            <p className="text-sm text-gray-500 font-light mb-6">This payment link may be incorrect or expired. Please confirm it with us.</p>
            <a href={waFallback} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest">
              <WhatsappLogo size={16} weight="fill" /> Ask on WhatsApp
            </a>
          </div>
        ) : paid || invoice.isPaid ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-10 text-center">
            <SealCheck size={48} weight="fill" className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{paid ? 'Payment received!' : 'Already paid'}</h1>
            <p className="text-sm text-gray-500 font-light mb-6">
              Invoice <span className="font-bold text-gray-900">IG-{invoice.invoiceNumber}</span>
              {paid ? ' has been paid. We have been notified and will start processing your order right away.' : ' has already been settled. Thank you!'}
            </p>
            <Link to="/tracking" className="inline-flex items-center gap-2 bg-[#0f1a1c] text-white px-8 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#3D8593] transition-colors">
              Track My Order
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="bg-ink-hero text-white px-8 py-7">
              <p className="eyebrow text-[#FF9900] mb-2">Secure Payment</p>
              <h1 className="text-2xl font-bold tracking-tight">Invoice IG-{invoice.invoiceNumber}</h1>
            </div>
            <div className="p-8">
              <dl className="space-y-3 mb-8">
                <div className="flex justify-between text-sm"><dt className="text-gray-400 font-bold">Billed to</dt><dd className="font-bold text-gray-900">{invoice.clientName}</dd></div>
                <div className="flex justify-between text-sm gap-4"><dt className="text-gray-400 font-bold shrink-0">Item</dt><dd className="font-bold text-gray-900 text-right">{invoice.productName}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-gray-400 font-bold">Quantity</dt><dd className="font-bold text-gray-900">×{invoice.quantity}</dd></div>
                <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
                  <dt className="text-gray-400 font-bold text-sm">Total Due</dt>
                  <dd className="font-black text-2xl text-gray-900 tracking-tight">{invoice.currency} {invoice.totalKES.toLocaleString()}</dd>
                </div>
              </dl>

              {invoice.currency === 'KES' && invoice.totalKES > 0 ? (
                <>
                  <label htmlFor="pay-email" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Your email (your invoice &amp; receipt are sent here)
                  </label>
                  <input
                    id="pay-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors mb-4"
                  />
                  {emailValid ? (
                    <PaystackButton
                      className="w-full h-14 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#3D8593] transition-all shadow-xl"
                      publicKey={PAYSTACK_PUBLIC_KEY}
                      amount={Math.round(invoice.totalKES * 100)}
                      currency="KES"
                      email={email}
                      metadata={{
                        custom_fields: [
                          { display_name: 'Invoice', variable_name: 'invoice_number', value: invoice.invoiceNumber },
                          { display_name: 'Client', variable_name: 'client', value: invoice.clientName },
                        ]
                      }}
                      text={`Pay KES ${invoice.totalKES.toLocaleString()} Securely`}
                      onSuccess={handleSuccess}
                      onClose={() => { /* user dismissed */ }}
                    />
                  ) : (
                    <button disabled className="w-full h-14 bg-neutral-200 text-neutral-400 rounded-full font-black uppercase text-[11px] tracking-[0.25em] cursor-not-allowed">
                      Enter your email to pay
                    </button>
                  )}
                </>
              ) : (
                <a href={waFallback} target="_blank" rel="noopener noreferrer" className="w-full h-14 bg-[#25D366] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-2">
                  <WhatsappLogo size={18} weight="fill" /> Arrange Payment on WhatsApp
                </a>
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

export default PayInvoice;
