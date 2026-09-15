import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Storefront, Coins, Clock, Handshake } from '@phosphor-icons/react';
import LegacyConsultation from './Consultation';
import ConsultationBooking from '../components/ConsultationBooking';
import { fetchBookingSettings } from '../services/bookings';
import { BookingSettings } from '../utils/bookings';
import { Reveal } from '../components/Motion';

/**
 * /consultation — decides which page a visitor gets.
 *
 * While the owner's "Paid in-person consultations" switch is OFF (as it ships),
 * this renders the existing request form, untouched. Switched ON, it renders the
 * paid hub booking. `?preview=bookings` shows the new flow early so it can be
 * checked before launch; the database still refuses the booking unless the
 * visitor is a signed-in admin.
 *
 * The existing page is imported, not edited, so turning the switch back off
 * restores exactly what was there.
 */

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

const ConsultationGate: React.FC<{ onSubmit?: (c: any) => void }> = () => {
  const location = useLocation();
  const preview = new URLSearchParams(location.search).get('preview') === 'bookings';
  const [settings, setSettings] = useState<BookingSettings | null>(null);

  useEffect(() => { fetchBookingSettings().then(setSettings); }, []);

  // Hold the layout for the moment it takes to read one settings row, so a
  // visitor never sees the old page flash and then swap.
  if (!settings) return <div className="bg-brand-bg min-h-screen" />;

  if (!settings.consultationsEnabled && !preview) return <LegacyConsultation />;

  const points = [
    { icon: <Coins size={24} weight="duotone" className="text-[#3D8593]" />, title: `${money(settings.consultationFeeKes)} consultation fee`, body: `Credited in full to your order if you place it within ${settings.consultationCreditDays} days of the meeting.` },
    { icon: <Storefront size={24} weight="duotone" className="text-[#FF9900]" />, title: 'In person, at the hub', body: [settings.hubName, settings.hubAddress].filter(Boolean).join(' · ') || settings.hubName },
    { icon: <Clock size={24} weight="duotone" className="text-[#3D8593]" />, title: 'Thursdays and Fridays', body: 'Choose a slot that suits you. Your time is held once payment clears.' },
    { icon: <Handshake size={24} weight="duotone" className="text-[#FF9900]" />, title: 'Leave with a plan', body: 'Suppliers, landed cost, lead time and the risks — for exactly what you want to import.' },
  ];

  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <Reveal>
          <div className="lg:pt-6">
            <p className="eyebrow text-[#3D8593] mb-4">In-person strategy meeting</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-[1.02]">
              Sit down with <span className="heading-accent italic font-light text-[#3D8593]">the founder.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed mb-10 max-w-lg">
              A one-on-one meeting to plan your procurement properly — what to buy, where from, what it will really
              cost landed in Nairobi, and how long it takes.
            </p>
            <div className="space-y-4">
              {points.map(p => (
                <div key={p.title} className="flex gap-5 items-center p-5 rounded-2xl bg-white border border-gray-100">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0">{p.icon}</div>
                  <div>
                    <p className="font-bold text-gray-900">{p.title}</p>
                    <p className="text-sm text-gray-500 font-light">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={130}>
          <ConsultationBooking settings={settings} preview={preview && !settings.consultationsEnabled} />
        </Reveal>
      </div>
    </div>
  );
};

export default ConsultationGate;
