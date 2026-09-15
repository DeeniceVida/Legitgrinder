import React from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { monthCells, monthLabel } from '../utils/bookings';

/**
 * A plain month calendar, Monday first. Shared by the founder's availability
 * calendar and the client's booking calendar, so both read the same way — the
 * day a client sees open is the day he opened, in the same place on the grid.
 *
 * It draws the frame only. What a day looks like and does is up to `renderDay`.
 */

const HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  renderDay: (iso: string) => React.ReactNode;
  /** Shown under the month name, e.g. a legend or a count. */
  subtitle?: React.ReactNode;
}

const MonthGrid: React.FC<Props> = ({ year, month, onPrev, onNext, canPrev = true, canNext = true, renderDay, subtitle }) => {
  const cells = monthCells(year, month);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous month"
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
          <CaretLeft size={15} weight="bold" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-gray-900 tracking-tight">{monthLabel(year, month)}</p>
          {subtitle && <div className="text-[10.5px] font-medium text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next month"
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
          <CaretRight size={15} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {HEAD.map(h => (
          <div key={h} className="text-center text-[9px] font-black uppercase tracking-widest text-gray-400 pb-1">{h}</div>
        ))}
        {cells.map((iso, i) => (
          <div key={iso || `pad-${i}`} className="min-w-0">
            {iso ? renderDay(iso) : <div className="aspect-square" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthGrid;
