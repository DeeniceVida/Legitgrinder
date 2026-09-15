import React, { useEffect, useMemo, useState } from 'react';
import { CircleNotch, Plus, X, WarningCircle, Check, Lightning } from '@phosphor-icons/react';
import MonthGrid from './MonthGrid';
import {
  BookingSettings, nairobiNow, shiftMonth, isoDate, formatDateLong, formatSlot, generateSlots,
  slotProblem, sortSlots, slotKey, toMinutes, addDays,
} from '../utils/bookings';
import {
  ConsultationBooking, ConsultationDay, fetchConsultationDays, saveConsultationDay, closeConsultationDay,
} from '../services/bookings';

/**
 * The founder's consultation calendar.
 *
 * He opens the days he will be in Nairobi and packs each with meetings. What he
 * saves here is exactly what the public booking calendar offers, and a paid
 * booking fills its slot here as soon as it lands — both read the same rows.
 *
 * The database enforces the two rules that matter (add_bookings.sql trigger):
 * meetings may not overlap, and a paid meeting cannot be removed from under a
 * client. The checks here only say so sooner.
 */

interface Props {
  settings: BookingSettings;
  bookings: ConsultationBooking[];
  /** Called after a save so the parent can refresh its lists. */
  onChanged?: () => void;
}

const input = 'bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-sm font-medium outline-none focus:border-[#3D8593]';

const AvailabilityCalendar: React.FC<Props> = ({ settings, bookings, onChanged }) => {
  const today = nairobiNow().date;
  const [ym, setYm] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [days, setDays] = useState<Map<string, ConsultationDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // "Fill the day" pattern, starting from the saved defaults.
  const [pStart, setPStart] = useState(settings.dayStart);
  const [pEnd, setPEnd] = useState(settings.dayEnd);
  const [pMeeting, setPMeeting] = useState(settings.meetingMinutes);
  const [pBreak, setPBreak] = useState(settings.breakMinutes);
  useEffect(() => {
    setPStart(settings.dayStart); setPEnd(settings.dayEnd);
    setPMeeting(settings.meetingMinutes); setPBreak(settings.breakMinutes);
  }, [settings.dayStart, settings.dayEnd, settings.meetingMinutes, settings.breakMinutes]);

  // Manual "add one meeting" fields.
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');

  const monthFrom = isoDate(ym.year, ym.month, 1);
  const monthTo = addDays(isoDate(shiftMonth(ym.year, ym.month, 1).year, shiftMonth(ym.year, ym.month, 1).month, 1), -1);

  const load = async () => {
    setLoading(true);
    setDays(await fetchConsultationDays(monthFrom, monthTo));
    setLoading(false);
  };
  useEffect(() => { load(); }, [monthFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Bookings that occupy a slot: paid, or mid-payment in the last 20 minutes. */
  const bookingsByDay = useMemo(() => {
    const m = new Map<string, ConsultationBooking[]>();
    const holdSince = Date.now() - 20 * 60 * 1000;
    for (const b of bookings) {
      const live = b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid_conflict'
        || (b.status === 'pending_payment' && new Date(b.createdAt).getTime() > holdSince);
      if (!live) continue;
      if (!m.has(b.slotDate)) m.set(b.slotDate, []);
      m.get(b.slotDate)!.push(b);
    }
    return m;
  }, [bookings]);

  const paidOn = (day: string, slot: string) =>
    (bookingsByDay.get(day) || []).find(b => b.slotLabel === slot && (b.status === 'confirmed' || b.status === 'completed'));
  const heldOn = (day: string, slot: string) =>
    (bookingsByDay.get(day) || []).find(b => b.slotLabel === slot && b.status === 'pending_payment');

  const open = (day: string) => {
    setSelected(day);
    setError(null);
    const existing = days.get(day);
    if (existing) {
      setDraft(sortSlots(existing.slots));
      setNote(existing.note || '');
    } else {
      // A closed day opens pre-filled with the usual pattern. Nothing is saved
      // until "Make available" — a stray click must not publish a day.
      setDraft(generateSlots(settings.dayStart, settings.dayEnd, settings.meetingMinutes, settings.breakMinutes));
      setNote('');
    }
  };

  const isOpenDay = selected ? days.has(selected) : false;
  const isPast = selected ? selected <= today : false;
  const problem = slotProblem(draft);
  const paidSlotsOnSelected = selected ? draft.filter(s => paidOn(selected, s)) : [];

  const fillDay = () => {
    if (!selected) return;
    const fresh = generateSlots(pStart, pEnd, Number(pMeeting), Number(pBreak));
    if (!fresh.length) { setError('That pattern fits no meetings — check the start, end and meeting length.'); return; }
    // Keep every paid meeting where it is; the pattern fills around them.
    const keep = draft.filter(s => paidOn(selected, s));
    const merged = sortSlots(Array.from(new Set([...keep, ...fresh.filter(f => !keep.some(k => {
      const [ks, ke] = k.split('-').map(toMinutes), [fs, fe] = f.split('-').map(toMinutes);
      return fs < ke && ks < fe; // overlaps a paid meeting: leave that gap to the booking
    }))])));
    setDraft(merged);
    setError(null);
  };

  const addOne = () => {
    if (!addStart || !addEnd) return;
    const key = slotKey(addStart, addEnd);
    const next = sortSlots(Array.from(new Set([...draft, key])));
    const why = slotProblem(next);
    if (why) { setError(why); return; }
    setDraft(next); setAddStart(''); setAddEnd(''); setError(null);
  };

  const save = async () => {
    if (!selected) return;
    if (problem) { setError(problem); return; }
    if (!draft.length) { setError('Add at least one meeting time, or close the day instead.'); return; }
    setSaving(true); setError(null);
    const res = await saveConsultationDay(selected, draft, note);
    setSaving(false);
    if (!res.success) { setError(res.error || 'Could not save.'); return; }
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800);
    await load();
    onChanged?.();
  };

  const close = async () => {
    if (!selected) return;
    if (paidSlotsOnSelected.length) {
      setError('Someone has paid for a meeting on this day. Move or cancel it before closing the day.');
      return;
    }
    if (!window.confirm(`Close ${formatDateLong(selected)}? Clients will no longer be able to book it.`)) return;
    setSaving(true); setError(null);
    const res = await closeConsultationDay(selected);
    setSaving(false);
    if (!res.success) { setError(res.error || 'Could not close the day.'); return; }
    await load();
    onChanged?.();
  };

  const earliest = shiftMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, -1);
  const canPrev = ym.year * 12 + ym.month > earliest.year * 12 + earliest.month;

  const openCount = Array.from(days.keys()).filter(d => d > today).length;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5">
      {/* ── The month ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5">
        <MonthGrid
          year={ym.year} month={ym.month}
          onPrev={() => setYm(shiftMonth(ym.year, ym.month, -1))}
          onNext={() => setYm(shiftMonth(ym.year, ym.month, 1))}
          canPrev={canPrev}
          subtitle={loading ? 'Loading…' : `${openCount} day${openCount === 1 ? '' : 's'} open for booking`}
          renderDay={(iso) => {
            const d = days.get(iso);
            const past = iso <= today;
            const total = d?.slots.length || 0;
            const taken = d ? d.slots.filter(s => paidOn(iso, s)).length : 0;
            const full = total > 0 && taken >= total;
            const isSel = iso === selected;
            const tone = !d
              ? (past ? 'bg-transparent text-gray-300' : 'bg-neutral-50 text-gray-500 hover:bg-neutral-100')
              : full
                ? 'bg-[#FF9900]/15 text-[#8a4b00]'
                : past ? 'bg-teal-50/50 text-teal-700/50' : 'bg-[#3D8593]/12 text-[#1d4d55] hover:bg-[#3D8593]/20';
            return (
              <button type="button" onClick={() => open(iso)}
                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-colors ${tone} ${isSel ? 'ring-2 ring-[#0f1a1c]' : ''} ${iso === today ? 'font-black underline underline-offset-2' : ''}`}>
                <span className="text-[13px] font-bold leading-none">{Number(iso.slice(8))}</span>
                {d && (
                  <span className="text-[8.5px] font-black mt-1 leading-none">
                    {full ? 'FULL' : taken ? `${taken}/${total}` : `${total} open`}
                  </span>
                )}
              </button>
            );
          }}
        />
        <div className="flex flex-wrap gap-3 mt-4 text-[10px] font-bold text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#3D8593]/20" /> Open</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#FF9900]/20" /> Fully booked</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-neutral-100" /> Not available</span>
        </div>
      </div>

      {/* ── The chosen day ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <p className="text-sm font-black text-gray-900">Pick a day</p>
            <p className="text-[12px] text-gray-500 mt-1 max-w-xs leading-relaxed">
              Tap a date you will be in Nairobi to open it for meetings, or tap an open day to see who is booked.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-gray-900">{formatDateLong(selected)}</p>
                <p className="text-[11px] font-bold mt-0.5 text-gray-400">
                  {isPast ? 'In the past — view only' : isOpenDay ? 'Open for booking' : 'Not available yet'}
                </p>
              </div>
              {loading && <CircleNotch size={16} className="animate-spin text-gray-300" />}
            </div>

            {/* Meetings on the day */}
            <div className="space-y-1.5">
              {draft.length === 0 && <p className="text-[12px] text-gray-400">No meeting times.</p>}
              {draft.map(slot => {
                const paid = paidOn(selected, slot);
                const held = heldOn(selected, slot);
                return (
                  <div key={slot} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${paid
                    ? 'border-emerald-200 bg-emerald-50/60' : held ? 'border-amber-200 bg-amber-50/60' : 'border-neutral-100'}`}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-gray-900">{formatSlot(slot)}</p>
                      <p className="text-[11px] font-medium text-gray-500 truncate">
                        {paid ? `${paid.clientName} · ${paid.clientPhone}` : held ? `Being paid for by ${held.clientName}` : 'Free'}
                      </p>
                    </div>
                    {!paid && !held && !isPast && (
                      <button type="button" onClick={() => setDraft(draft.filter(s => s !== slot))}
                        aria-label={`Remove ${formatSlot(slot)}`}
                        className="w-7 h-7 rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                        <X size={13} weight="bold" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {!isPast && (
              <>
                {/* Fill the day with a pattern */}
                <div className="rounded-xl bg-neutral-50 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fill the day</p>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
                    <input type="time" value={pStart} onChange={e => setPStart(e.target.value)} className={input} aria-label="Day starts" />
                    <span>to</span>
                    <input type="time" value={pEnd} onChange={e => setPEnd(e.target.value)} className={input} aria-label="Day ends" />
                    <span>·</span>
                    <input type="number" min={15} step={15} value={pMeeting} onChange={e => setPMeeting(Number(e.target.value))} className={`${input} w-20`} aria-label="Meeting minutes" />
                    <span>min meetings,</span>
                    <input type="number" min={0} step={5} value={pBreak} onChange={e => setPBreak(Number(e.target.value))} className={`${input} w-16`} aria-label="Break minutes" />
                    <span>min between</span>
                  </div>
                  <button type="button" onClick={fillDay}
                    className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] flex items-center gap-1.5 hover:underline">
                    <Lightning size={12} weight="fill" /> Fill — {generateSlots(pStart, pEnd, Number(pMeeting), Number(pBreak)).length} meetings
                  </button>
                </div>

                {/* Add one by hand */}
                <div className="flex flex-wrap items-center gap-2">
                  <input type="time" value={addStart} onChange={e => setAddStart(e.target.value)} className={input} aria-label="New meeting starts" />
                  <span className="text-[12px] text-gray-500">to</span>
                  <input type="time" value={addEnd} onChange={e => setAddEnd(e.target.value)} className={input} aria-label="New meeting ends" />
                  <button type="button" onClick={addOne} disabled={!addStart || !addEnd}
                    className="px-3 py-2 rounded-lg border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-gray-600 disabled:opacity-40 flex items-center gap-1">
                    <Plus size={11} weight="bold" /> Add
                  </button>
                </div>

                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Private note for this day (optional)"
                  className={`${input} w-full`} />

                {(error || problem) && (
                  <p className="text-[12px] font-bold text-rose-600 flex items-start gap-2">
                    <WarningCircle size={15} weight="duotone" className="shrink-0 mt-0.5" /> {error || problem}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={save} disabled={saving || !!problem || !draft.length}
                    className="px-5 py-2.5 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] disabled:opacity-40 flex items-center gap-1.5">
                    {saving ? 'Saving…' : savedFlash ? <><Check size={12} weight="bold" /> Saved</> : isOpenDay ? 'Save changes' : 'Make available'}
                  </button>
                  {isOpenDay && (
                    <button type="button" onClick={close} disabled={saving}
                      className="px-5 py-2.5 rounded-full border border-neutral-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-500 disabled:opacity-40">
                      Close this day
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
