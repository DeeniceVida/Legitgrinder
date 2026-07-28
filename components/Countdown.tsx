import React, { useState, useEffect } from 'react';

interface CountdownProps {
  /** ISO deadline. */
  to: string;
  /** 'full' = boxed segments for the campaign page, 'chip' = compact pill for the poster. */
  variant?: 'full' | 'chip';
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Live countdown to a group-buy deadline. Green while there's comfortable time,
 * red once it's under a day — so urgency reads at a glance without shouting.
 */
const Countdown: React.FC<CountdownProps> = ({ to, variant = 'full', className = '' }) => {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  // Under a day we show a live seconds digit, so we must tick every second;
  // above that only days/hours/minutes show, where 30s is plenty.
  const showsSeconds = !isNaN(target) && target - now > 0 && target - now < 86_400_000;

  useEffect(() => {
    if (isNaN(target)) return;
    const t = setInterval(() => setNow(Date.now()), showsSeconds ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [target, showsSeconds]);

  if (isNaN(target)) return null;

  const ms = target - now;
  const over = ms <= 0;

  const totalSec = Math.max(Math.floor(ms / 1000), 0);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  // Under a day turns red; otherwise green.
  const urgent = !over && ms < 86_400_000;
  const tone = over
    ? { text: 'text-gray-400', dot: 'bg-gray-300', ring: 'border-gray-200', bg: 'bg-gray-50' }
    : urgent
      ? { text: 'text-rose-600', dot: 'bg-rose-500', ring: 'border-rose-200', bg: 'bg-rose-50' }
      : { text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'border-emerald-200', bg: 'bg-emerald-50' };

  const label = over ? 'Reservations closed' : urgent ? 'Closing soon' : 'Reservations close in';

  // Compact pill for the poster (on a dark background).
  if (variant === 'chip') {
    const chipTone = over ? 'text-white/50' : urgent ? 'text-rose-300' : 'text-emerald-300';
    const chipDot = over ? 'bg-white/40' : urgent ? 'bg-rose-400' : 'bg-emerald-400';
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest ${chipTone} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${chipDot} ${!over && urgent ? 'animate-pulse' : ''}`} />
        {over ? 'Closed' : days > 0
          ? `${days}d ${pad(hours)}h left`
          : `${pad(hours)}:${pad(mins)}:${pad(secs)} left`}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border ${tone.ring} ${tone.bg} px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} ${urgent ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${tone.text}`}>{label}</span>
      </div>
      {over ? (
        <p className="text-sm font-bold text-gray-500">This group buy has closed.</p>
      ) : (
        <div className="flex items-end gap-1.5">
          {(days > 0 ? [[days, 'days'], [hours, 'hrs'], [mins, 'min']] : [[hours, 'hrs'], [mins, 'min'], [secs, 'sec']]).map(
            ([val, unit], i) => (
              <React.Fragment key={unit as string}>
                {i > 0 && <span className={`pb-1.5 text-lg font-black ${tone.text} opacity-30`}>:</span>}
                <span className="flex flex-col items-center">
                  <span className={`tabular-nums text-2xl font-black leading-none ${tone.text}`}>{pad(val as number)}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{unit as string}</span>
                </span>
              </React.Fragment>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Countdown;
