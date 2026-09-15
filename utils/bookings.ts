/**
 * Slot and calendar rules for hub pickups and in-person consultations.
 *
 * Pure functions, no network — so the booking page, the admin calendar and the
 * tests all agree, and the database applies the same rules again when a
 * booking is made (add_bookings.sql). The browser deciding alone would let an
 * edited page book a locked slot.
 *
 * TWO DIFFERENT MODELS, on purpose:
 *   - Pickups repeat weekly. The shop is open the same days every week.
 *   - Consultations are DATE-BY-DATE. The founder travels into Nairobi for
 *     them, so he opens the specific days he is in town and packs as many
 *     meetings into each as he can.
 *
 * TIME ZONE: Nairobi, UTC+3, no daylight saving. A customer browsing from
 * London must see a 5pm cut-off as Nairobi's 5pm, or the page and the server
 * disagree about whether a slot is open.
 *
 * Dates are 'YYYY-MM-DD' strings for the Nairobi calendar day, so a Date
 * object's local time zone can never shift a booking onto the wrong day.
 *
 * Consultation slots are stored as 24-hour keys, "10:00-11:30". Zero-padded,
 * so they sort chronologically as plain text, and plain ASCII, so they match
 * the database byte for byte. They are only turned into "10:00 AM" for people.
 */

export const NAIROBI_OFFSET_HOURS = 3;

/** Pickup slot labels per weekday, keyed by JS day number (0 = Sunday … 6 = Saturday). */
export type SlotsByWeekday = Record<string, string[]>;

export interface BookingSettings {
  consultationsEnabled: boolean;
  pickupsEnabled: boolean;
  hubName: string;
  hubAddress: string;
  hubMapUrl: string;
  consultationFeeKes: number;
  consultationCreditDays: number;
  /** Template used when the founder opens a new day on the calendar. */
  meetingMinutes: number;
  breakMinutes: number;
  dayStart: string;
  dayEnd: string;
  pickupSlots: SlotsByWeekday;
  /** Hour (Nairobi) on the day BEFORE a slot when it stops taking bookings. */
  cutoffHour: number;
  pickupDaysAhead: number;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  consultationsEnabled: false,
  pickupsEnabled: false,
  hubName: 'LegitGrinder Hub',
  hubAddress: '',
  hubMapUrl: '',
  consultationFeeKes: 4000,
  consultationCreditDays: 7,
  meetingMinutes: 90,
  breakMinutes: 30,
  dayStart: '10:00',
  dayEnd: '18:00',
  pickupSlots: {
    '3': ['2:00 PM - 3:30 PM', '3:30 PM - 5:00 PM', '5:00 PM - 6:30 PM'],
    '6': ['10:00 AM - 12:00 PM', '12:00 PM - 2:00 PM', '2:00 PM - 4:00 PM'],
  },
  cutoffHour: 17,
  pickupDaysAhead: 14,
};

/** How far ahead the public booking calendar reaches, whatever is opened. */
export const CONSULTATION_HORIZON_DAYS = 120;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

/* ── Dates ──────────────────────────────────────────────────────────────── */

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

export const isoDate = (year: number, monthIndex: number, day: number): string =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

/** "Thursday 17 September" */
export const formatDateLong = (iso: string): string => {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(iso)]} ${d} ${MONTHS[m - 1]}`;
};

export const monthLabel = (year: number, monthIndex: number): string => `${MONTHS[monthIndex]} ${year}`;

/**
 * The cells of a month, Monday first, padded with nulls so every week row is
 * complete. Monday first because that is how a Kenyan diary reads.
 */
export const monthCells = (year: number, monthIndex: number): (string | null)[] => {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(isoDate(year, monthIndex, d));
  while (cells.length % 7) cells.push(null);
  return cells;
};

/** Step a month forwards or backwards, rolling the year. */
export const shiftMonth = (year: number, monthIndex: number, by: number) => {
  const t = year * 12 + monthIndex + by;
  return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
};

/**
 * Is a slot on this date still open for booking?
 *
 * Locks at `cutoffHour` Nairobi time on the day BEFORE — so nothing can be
 * booked for today, and a traveller always has the evening before to plan.
 */
export const isStillOpen = (dateIso: string, cutoffHour: number, now: Date = new Date()): boolean => {
  const n = nairobiNow(now);
  const lockDay = addDays(dateIso, -1);
  if (n.date < lockDay) return true;
  if (n.date > lockDay) return false;
  return n.hour < cutoffHour;
};

/* ── Times and consultation slots ───────────────────────────────────────── */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const KEY = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

export const toMinutes = (hhmm: string): number => {
  const m = hhmm.match(TIME);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const fromMinutes = (mins: number): string => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

/** "13:30" → "1:30 PM" */
export const formatTime = (hhmm: string): string => {
  const mins = toMinutes(hhmm);
  if (!Number.isFinite(mins)) return hhmm;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const slotKey = (start: string, end: string): string => `${start}-${end}`;

export const slotBounds = (key: string): { start: string; end: string } | null => {
  const m = key.match(KEY);
  return m ? { start: `${m[1]}:${m[2]}`, end: `${m[3]}:${m[4]}` } : null;
};

/** "10:00-11:30" → "10:00 AM - 11:30 AM". Anything that isn't a key is returned as-is. */
export const formatSlot = (key: string): string => {
  const b = slotBounds(key);
  return b ? `${formatTime(b.start)} - ${formatTime(b.end)}` : key;
};

export const sortSlots = (keys: string[]): string[] => [...keys].sort();

/**
 * Pack a day with meetings: back to back from `dayStart`, with `breakMinutes`
 * between, stopping before a meeting would run past `dayEnd`.
 *
 * The whole point for the founder — every extra meeting in a day is one fewer
 * trip into Nairobi.
 */
export const generateSlots = (dayStart: string, dayEnd: string, meetingMinutes: number, breakMinutes: number): string[] => {
  const start = toMinutes(dayStart), end = toMinutes(dayEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || meetingMinutes < 15 || breakMinutes < 0 || end <= start) return [];
  const out: string[] = [];
  for (let t = start; t + meetingMinutes <= end; t += meetingMinutes + breakMinutes) {
    out.push(slotKey(fromMinutes(t), fromMinutes(t + meetingMinutes)));
    if (out.length >= 24) break; // a safety stop, not a business rule
  }
  return out;
};

/**
 * Why a day's slot list cannot be saved, or null if it can. Same checks the
 * database trigger makes, so the admin sees the reason before pressing Save.
 */
export const slotProblem = (keys: string[]): string | null => {
  const sorted = sortSlots(keys);
  for (const k of sorted) {
    const b = slotBounds(k);
    if (!b) return `"${k}" is not a time range.`;
    if (toMinutes(b.end) <= toMinutes(b.start)) return `${formatSlot(k)} ends before it starts.`;
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = slotBounds(sorted[i - 1])!, cur = slotBounds(sorted[i])!;
    if (toMinutes(cur.start) < toMinutes(prev.end)) {
      return `${formatSlot(sorted[i - 1])} overlaps ${formatSlot(sorted[i])}.`;
    }
  }
  return null;
};

/* ── Weekly pickup slots ────────────────────────────────────────────────── */

export interface OpenSlot {
  date: string;
  weekday: number;
  label: string;
}

/**
 * Every open weekly pickup slot from tomorrow to `daysAhead`, in order,
 * minus any taken ("date|label").
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
