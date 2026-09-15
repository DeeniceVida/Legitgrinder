import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Storefront, Truck, CalendarBlank } from '@phosphor-icons/react';
import { BookingSettings, openSlots, groupByDate, formatDateLong, weekdayOf, addDays } from '../utils/bookings';

/**
 * "How will you get it?" for an in-stock item, shown only when hub pickups are
 * switched on.
 *
 * Collection runs on the owner's fixed days and slots, and closes at the
 * cut-off the evening before. Anyone who needs it sooner is pointed at courier
 * delivery rather than left looking at a closed calendar.
 */

export type Fulfilment =
  | { mode: 'collect'; date: string; label: string }
  | { mode: 'deliver' }
  | null;

const cutoffText = (hour: number) => {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PickupSlotPicker: React.FC<{
  settings: BookingSettings;
  value: Fulfilment;
  onChange: (f: Fulfilment) => void;
}> = ({ settings, value, onChange }) => {
  const days = useMemo(() => groupByDate(
    openSlots(settings.pickupSlots, settings.cutoffHour, settings.pickupDaysAhead),
  ), [settings]);

  const collectDays = Object.keys(settings.pickupSlots)
    .filter(k => (settings.pickupSlots[k] || []).length)
    .map(k => WEEKDAY_NAMES[Number(k)])
    .join(' and ');

  const chosenDate = value?.mode === 'collect' ? value.date : days[0]?.date;
  const slots = days.find(d => d.date === chosenDate)?.slots || [];

  // The first collection day is more than two days off: someone who needs it
  // this week should hear about delivery before they pay, not after.
  const firstDay = days[0]?.date;
  const today = new Date().toISOString().slice(0, 10);
  const waitIsLong = !firstDay || firstDay > addDays(today, 2);

  return (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">How will you get it?</p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button"
          onClick={() => days[0] && onChange({ mode: 'collect', date: days[0].date, label: days[0].slots[0].label })}
          disabled={!days.length}
          className={`p-3 rounded-xl border text-left transition-colors disabled:opacity-40 ${value?.mode === 'collect'
            ? 'border-[#3D8593] bg-[#3D8593]/10' : 'border-gray-200 hover:border-gray-300'}`}>
          <Storefront size={17} weight="duotone" className="text-[#3D8593] mb-1" />
          <span className="block text-[12px] font-black text-gray-900">Collect — free</span>
          <span className="block text-[10.5px] text-gray-400 font-medium">{settings.hubName}</span>
        </button>
        <button type="button" onClick={() => onChange({ mode: 'deliver' })}
          className={`p-3 rounded-xl border text-left transition-colors ${value?.mode === 'deliver'
            ? 'border-[#3D8593] bg-[#3D8593]/10' : 'border-gray-200 hover:border-gray-300'}`}>
          <Truck size={17} weight="duotone" className="text-[#FF9900] mb-1" />
          <span className="block text-[12px] font-black text-gray-900">Deliver it</span>
          <span className="block text-[10.5px] text-gray-400 font-medium">Rider fee from KES 300</span>
        </button>
      </div>

      {value?.mode === 'collect' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map(d => (
              <button key={d.date} type="button"
                onClick={() => onChange({ mode: 'collect', date: d.date, label: d.slots[0].label })}
                className={`shrink-0 px-3 py-2 rounded-xl border text-[11.5px] font-black transition-colors ${value.date === d.date
                  ? 'border-[#3D8593] bg-[#3D8593] text-white' : 'border-gray-200 text-gray-700'}`}>
                <CalendarBlank size={12} weight="bold" className="inline mr-1 align-[-1px]" />
                {formatDateLong(d.date).split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(s => (
              <button key={s.label} type="button"
                onClick={() => onChange({ mode: 'collect', date: s.date, label: s.label })}
                className={`px-2 py-2.5 rounded-xl border text-[11px] font-bold transition-colors ${value.label === s.label
                  ? 'border-[#3D8593] bg-[#3D8593]/10 text-[#276a76]' : 'border-gray-200 text-gray-600'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Collection is on {collectDays}. Each day closes at {cutoffText(settings.cutoffHour)} the day before
            {firstDay ? ` — your earliest is ${WEEKDAY_NAMES[weekdayOf(firstDay)]}` : ''}.
            {settings.hubAddress ? ` ${settings.hubAddress}.` : ''}
          </p>
        </>
      )}

      {value?.mode === 'deliver' && (
        <p className="text-[11px] text-gray-500 leading-relaxed">
          After you pay we will send you a link to drop your pin and see the exact rider fee. Paid to the rider on arrival.
        </p>
      )}

      {!value && waitIsLong && (
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Need it sooner than {firstDay ? formatDateLong(firstDay) : 'our next collection day'}? Choose delivery, or
          {' '}<Link to="/request-delivery" className="text-[#3D8593] font-bold underline">see the rider fee</Link>.
        </p>
      )}
    </div>
  );
};

export default PickupSlotPicker;
