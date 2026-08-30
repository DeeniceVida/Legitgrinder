import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DeliveryEstimator from '../components/DeliveryEstimator';

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

  return (
    <div className="bg-brand-bg min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
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

        <DeliveryEstimator reference={reference} item={item} origin={origin} large={large} />
      </div>
    </div>
  );
};

export default RequestDelivery;
