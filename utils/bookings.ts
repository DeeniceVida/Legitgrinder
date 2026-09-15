/**
 * Slot rules for hub pickups and in-person consultations.
 *
 * Pure functions, no network — so the booking pages, the admin panel and the
 * tests all agree on which slot is open, and the database applies the same
 * rules again when a booking is actually made (add_bookings.sql). The browser
 * deciding alone would let an edited page book a locked slot.
 *
 * TIME ZONE: everything is Nairobi time, UTC+3, which has no daylight saving.
 * A customer browsing from London at 3pm must see Tuesday's 5pm cut-off as
 * Nairobi's 5pm, not theirs — otherwise the page and the server disagree about
 * whether a slot is still open.
 *
 * Dates are carried as 'YYYY-MM-DD' strings for the Nairobi calendar day, so a
 * Date object's local time zone can never shift a booking onto the wrong day.
 */

export const NAIROBI_OFFSET_HOURS = 3;

/** Slot labels per weekday, keyed by JS day number (0 = Sunday … 6 = Saturday). */
export type SlotsByWeekday = Record<string, string[]>;

export interface BookingSettings {
  consultationsEnabled: boolean;
  pickupsEnabled: boolean;
  hubName: string;
  hubAddress: string;
  hubMapUrl: string;
  consultationFeeKes: number;
  consultationCreditDays: number;
  consultationSlots: SlotsByWeekday;
  pickupSlots: SlotsByWeekday;
  /** Hour (Nairobi) on the day BEFORE a slot when it stops taking bookings. */
  cutoffHour: number;
  /** How many days ahead consultations can be booked. */
  consultationDaysAhead: number;
  pickupDaysAhead: number;
}

/** The owner's spec, used until the settings row says otherwise. */
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  consultationsEnabled: false,
  pickupsEnabled: false,
  hubName: 'LegitGrinder Hub',
  hubAddress: '',
  hubMapUrl: '',
  consultationFeeKes: 4000,
  consultationCreditDays: 7,
  consultationSlots: {
    '4': ['10:00 AM - 11:30 AM', '12:00 PM - 1:30 PM', '2:30 PM - 4:00 PM'],
    '5': ['10:00 AM - 11:30 AM', '12:00 PM - 1:30 PM', '2:30 PM - 4:00 PM'],
  },
  pickupSlots: {
    '3': ['2:00 PM - 3:30 PM', '3:30 PM - 5:00 PM', '5:00 PM - 6:30 PM'],
    '6': ['10:00 AM - 12:00 PM', '12:00 PM - 2:00 PM', '2:00 PM - 4:00 PM'],
  },
  cutoffHour: 17,
  consultationDaysAhead: 28,
  pickupDaysAhead: 14,
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's calendar date in Nairobi, plus the hour, however the viewer's clock is set. */
export const nairobiNow = (now: Date = new Date()) => {
  const shifted = new Date(now.getTime() + NAIROBI_OFFSET_HOURS * 3600_000);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
};

/** Day of week for a 'YYYY-MM-DD' calendar date. Timezone-proof: built in UTC. */
export const weekdayOf = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const addDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/** "Thursday 17 September" */
export const formatDateLong = (iso: string): string => {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(iso)]} ${d} ${MONTHS[m - 1]}`;
};

/**
 * Is a slot on this date still open?
 *
 * A slot locks at `cutoffHour` Nairobi time on the day BEFORE — Wednesday's
 * collection closes Tuesday 5pm, Saturday's closes Friday 5pm. That also rules
 * out anything today or in the past, which is what routes a same-day request
 * to courier delivery instead.
 */
export const isStillOpen = (dateIso: string, cutoffHour: number, now: Date = new Date()): boolean => {
  const n = nairobiNow(now);
  const lockDay = addDays(dateIso, -1);
  if (n.date < lockDay) return true;
  if (n.date > lockDay) return false;
  return n.hour < cutoffHour;
};

export interface OpenSlot {
  date: string;
  weekday: number;
  label: string;
}

/**
 * Every open slot from tomorrow to `daysAhead`, in order, minus any taken.
 * `taken` is "date|label" — the shape the availability RPC returns.
 */
export const openSlots = (
  slots: SlotsByWeekday,
  cutoffHour: number,
  daysAhead: number,
  taken: Set<string> = new Set(),
  now: Date = new Date(),
): OpenSlot[] => {
  const today = nairobiNow(now).date;
  const out: OpenSlot[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    const date = addDays(today, i);
    const weekday = weekdayOf(date);
    const labels = slots[String(weekday)] || [];
    if (!labels.length || !isStillOpen(date, cutoffHour, now)) continue;
    for (const label of labels) {
      if (!taken.has(`${date}|${label}`)) out.push({ date, weekday, label });
    }
  }
  return out;
};

/** Group slots by date for display, preserving order. */
export const groupByDate = (slots: OpenSlot[]): { date: string; slots: OpenSlot[] }[] => {
  const map = new Map<string, OpenSlot[]>();
  for (const s of slots) {
    if (!map.has(s.date)) map.set(s.date, []);
    map.get(s.date)!.push(s);
  }
  return Array.from(map.entries()).map(([date, list]) => ({ date, slots: list }));
};

/** The day a consultation credit runs out: the meeting date plus the credit window. */
export const creditExpires = (meetingDate: string, creditDays: number): string =>
  addDays(meetingDate, creditDays);

/** Parse the owner's "one slot per line" admin textarea into clean labels. */
export const parseSlotLines = (text: string): string[] =>
  text.split('\n').map(l => l.trim()).filter(Boolean);
