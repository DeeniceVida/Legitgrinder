// Calendar and slot rules. The part most likely to be subtly wrong, and the
// part the founder's day in Nairobi depends on.
const B = await import('./bookings.built.mjs');

const results = [];
const check = (l, c, got) => { results.push([l, c]); if (!c) console.log('      got:', JSON.stringify(got)); };

const eat = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h - 3, mi));
const S = B.DEFAULT_BOOKING_SETTINGS;

/* ---- dates & time zone --------------------------------------------------- */
check('2026-09-15 is a Tuesday', B.weekdayOf('2026-09-15') === 2);
check('23:30 UTC Monday is already Tuesday in Nairobi', B.nairobiNow(new Date(Date.UTC(2026, 8, 14, 23, 30))).date === '2026-09-15');
check('Mon 16:59 EAT: Tuesday meetings still bookable', B.isStillOpen('2026-09-15', 17, eat(2026, 9, 14, 16, 59)) === true);
check('Mon 17:00 EAT: Tuesday closed', B.isStillOpen('2026-09-15', 17, eat(2026, 9, 14, 17, 0)) === false);
check('same day never bookable', B.isStillOpen('2026-09-28', 17, eat(2026, 9, 28, 8)) === false);
check('viewer in London at 15:00 BST sees Nairobi 5pm cut-off as passed',
  B.isStillOpen('2026-09-16', 17, new Date(Date.UTC(2026, 8, 15, 14, 0))) === false);
check('addDays across a year', B.addDays('2026-12-31', 1) === '2027-01-01');
check('formatDateLong', B.formatDateLong('2026-09-28') === 'Monday 28 September', B.formatDateLong('2026-09-28'));

/* ---- the month grid ------------------------------------------------------ */
// September 2026 starts on a Tuesday → one blank before it, Monday first.
const sep = B.monthCells(2026, 8);
check('Sept 2026 grid starts with one blank (Monday)', sep[0] === null && sep[1] === '2026-09-01', sep.slice(0, 3));
check('Sept 2026 has all 30 days', sep.filter(Boolean).length === 30);
check('grid rows are complete weeks', sep.length % 7 === 0, sep.length);
check('28 September sits in the Monday column', sep.indexOf('2026-09-28') % 7 === 0, sep.indexOf('2026-09-28'));
// February 2027: starts Monday, 28 days → exactly 4 rows, no padding.
const feb = B.monthCells(2027, 1);
check('Feb 2027 starts on Monday with no blank', feb[0] === '2027-02-01', feb[0]);
check('Feb 2027 is exactly four rows', feb.length === 28, feb.length);
check('leap year Feb 2028 has 29 days', B.monthCells(2028, 1).filter(Boolean).length === 29);
check('shiftMonth December → January rolls the year', JSON.stringify(B.shiftMonth(2026, 11, 1)) === '{"year":2027,"month":0}');
check('shiftMonth January → December rolls back', JSON.stringify(B.shiftMonth(2027, 0, -1)) === '{"year":2026,"month":11}');
check('monthLabel', B.monthLabel(2026, 8) === 'September 2026');

/* ---- times ---------------------------------------------------------------- */
check('formatTime morning', B.formatTime('10:00') === '10:00 AM');
check('formatTime noon', B.formatTime('12:30') === '12:30 PM', B.formatTime('12:30'));
check('formatTime midnight', B.formatTime('00:15') === '12:15 AM', B.formatTime('00:15'));
check('formatTime afternoon', B.formatTime('13:30') === '1:30 PM');
check('formatSlot', B.formatSlot('10:00-11:30') === '10:00 AM - 11:30 AM', B.formatSlot('10:00-11:30'));
check('formatSlot leaves a non-key alone', B.formatSlot('2:00 PM - 3:30 PM') === '2:00 PM - 3:30 PM');

/* ---- packing a day: the founder's actual goal ---------------------------- */
// His own example: 10 to 12, then the next from 12:30.
const his = B.generateSlots('10:00', '18:00', 120, 30);
check('his example: 2-hour meetings, 30 min between → 10-12, 12:30-2:30, 3-5',
  JSON.stringify(his) === JSON.stringify(['10:00-12:00', '12:30-14:30', '15:00-17:00']), his);

const def = B.generateSlots(S.dayStart, S.dayEnd, S.meetingMinutes, S.breakMinutes);
check('default day (10am-6pm, 90 min + 30 break) fits FOUR meetings',
  JSON.stringify(def) === JSON.stringify(['10:00-11:30', '12:00-13:30', '14:00-15:30', '16:00-17:30']), def);

check('a meeting that would run past the end is not added',
  B.generateSlots('10:00', '11:00', 90, 0).length === 0);
check('back to back with no break', JSON.stringify(B.generateSlots('09:00', '11:00', 60, 0)) === JSON.stringify(['09:00-10:00', '10:00-11:00']));
check('nonsense pattern gives nothing, not a crash', B.generateSlots('18:00', '10:00', 60, 0).length === 0 && B.generateSlots('xx', '10:00', 60, 0).length === 0);
check('keys sort chronologically as text', JSON.stringify(B.sortSlots(['14:00-15:00', '09:00-10:00', '10:30-11:00'])) === JSON.stringify(['09:00-10:00', '10:30-11:00', '14:00-15:00']));

/* ---- what may not be saved ---------------------------------------------- */
check('a clean day has no problem', B.slotProblem(def) === null, B.slotProblem(def));
check('overlap caught', /overlaps/.test(B.slotProblem(['10:00-11:30', '11:00-12:00']) || ''), B.slotProblem(['10:00-11:30', '11:00-12:00']));
check('touching meetings are fine (11:30 end, 11:30 start)', B.slotProblem(['10:00-11:30', '11:30-12:00']) === null);
check('backwards meeting caught', /ends before/.test(B.slotProblem(['12:00-11:00']) || ''));
check('garbage caught', /not a time range/.test(B.slotProblem(['lunch']) || ''));
check('order does not matter for overlap detection', /overlaps/.test(B.slotProblem(['11:00-12:00', '10:00-11:30']) || ''));

/* ---- every label and key is plain ASCII (matched byte for byte in the DB) */
const all = [...Object.values(S.pickupSlots).flat(), ...def];
check('every slot label and key is plain ASCII', all.every(l => /^[\x20-\x7E]+$/.test(l)), all.filter(l => !/^[\x20-\x7E]+$/.test(l)));

/* ---- weekly pickups still behave ----------------------------------------- */
const pick = B.openSlots(S.pickupSlots, S.cutoffHour, S.pickupDaysAhead, new Set(), eat(2026, 9, 15, 10));
check('pickups only on Wed and Sat', pick.every(s => s.weekday === 3 || s.weekday === 6), pick.map(s => s.weekday));
check('first pickup is tomorrow, Wednesday', pick[0]?.date === '2026-09-16', pick[0]);
const late = B.openSlots(S.pickupSlots, S.cutoffHour, S.pickupDaysAhead, new Set(), eat(2026, 9, 15, 18));
check('after Tuesday 5pm the first pickup is Saturday', late[0]?.date === '2026-09-19', late[0]);
check('credit runs 7 days from the meeting', B.creditExpires('2026-09-28', 7) === '2026-10-05');

let pass = 0;
console.log('');
for (const [l, ok] of results) { console.log((ok ? 'PASS  ' : 'FAIL  ') + l); if (ok) pass++; }
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
