import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import DeliveryEstimator from '../components/DeliveryEstimator';
import { WHATSAPP_NUMBER } from '../constants';

/**
 * /request-delivery — the page behind "would you rather have it delivered?"
 *
 * Not linked from anywhere on the site, and that is deliberate. Nobody browses
 * for a delivery quote; this is reached from the email sent when an order has
 * landed, or from a link sent by hand. It used to sit on How It Works, where
 * it read as a feature rather than a step in an order.
 *
 * ?order=GRP-XXXXXX ties the request to an order; ?item=… names the goods.
 */
const RequestDelivery: React.FC = () => {
  const [params] = useSearchParams();
  const reference = params.get('order') || params.get('ref') || undefined;
  const item = params.get('item') || undefined;
  // The owner's calls ride in the link: where the package is, and whether it
  // is a large one. The customer is never asked either.
  const origin = params.get('from') === 'industrial' ? 'industrial' as const : 'cbd' as const;
  const large = params.get('large') === '1';
  /** Sent here straight from a paid shop order, rather than from a link. */
  const justPaid = params.get('paid') === '1';
  /**
   * The email they typed at checkout, handed over in this browser rather than
   * in the link — an email address does not belong in a URL that gets shared,
   * logged and sat in history.
   */
  const email = (() => {
    if (!justPaid) return undefined;
    try { return sessionStorage.getItem('lg.checkout.email') || undefined; } catch { return undefined; }
  })();

  return (
    <div className="bg-brand-bg min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Straight off the shop's Pay button: say the money landed before
            asking for anything else, or this page reads like a second charge. */}
        {justPaid && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-7">
            <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-emerald-900">Payment received — your order is confirmed.</p>
              <p className="text-[12.5px] text-emerald-800/80 font-light mt-1 leading-relaxed">
                One last thing: tell us where to bring it. The delivery fee below is separate, and is paid
                to the rider when they hand it over.{' '}
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="font-bold underline">
                  Prefer to collect it yourself? Message us
                </a>.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <p className="eyebrow text-[#3D8593] mb-3">Delivery</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05] mb-3">
            Have it brought <span className="heading-accent italic font-light text-[#3D8593]">to you.</span>
          </h1>
          <p className="text-gray-500 font-light leading-relaxed">
            {reference
              ? <>For order <strong className="text-gray-900">{reference}</strong>. Pin where you are, see the fee, and a rider is sent.</>
              : <>Pin where you are, see the fee, and a rider is sent. No haggling at the door.</>}
          </p>
        </div>

        <DeliveryEstimator reference={reference} item={item} origin={origin} large={large} prefillEmail={email} />
      </div>
    </div>
  );
};

export default RequestDelivery;
