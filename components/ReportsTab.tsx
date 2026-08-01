import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { Invoice, Client, PaymentStatus } from '../types';

/**
 * Reports — month-by-month money, and the ability to compare any two periods.
 *
 * Conventions are deliberately identical to the Dashboard tab so the two never
 * disagree: revenue is the total of invoices marked PAID and dated in the
 * period, profit is the service fee, and an invoice is dated by createdAt
 * falling back to date.
 */

interface ReportsTabProps {
  invoices: Invoice[];
  clients: Client[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;
const compact = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${Math.round(n)}`;

const invDate = (inv: Invoice): Date | null => {
  const ds = inv.createdAt || inv.date;
  if (!ds) return null;
  const d = new Date(ds);
  return isNaN(d.getTime()) ? null : d;
};

const key = (y: number, m: number) => `${y}-${m}`;

interface Bucket {
  revenue: number;      // paid invoices, total value
  orders: number;       // every invoice raised
  paidOrders: number;
  profit: number;       // service fee on paid invoices
  outstanding: number;  // unpaid invoice value
  noBreakdown: number;  // paid invoices with no costs captured
}

const emptyBucket = (): Bucket =>
  ({ revenue: 0, orders: 0, paidOrders: 0, profit: 0, outstanding: 0, noBreakdown: 0 });

/** Percentage change, or null when there's no baseline to compare against. */
const pctChange = (cur: number, prev: number): number | null =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;

/** A change badge: ▲12.4%, ▼8%, "new" when coming off zero, or "—". */
const Delta: React.FC<{ cur: number; prev: number; label: string; mute?: boolean }> = ({ cur, prev, label, mute }) => {
  const pct = mute ? null : pctChange(cur, prev);
  const isNew = !mute && prev === 0 && cur > 0;
  return (
    <div className="flex items-baseline gap-1.5">
      {pct === null ? (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isNew ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-neutral-50'}`}>
          {isNew ? 'new' : '—'}
        </span>
      ) : (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${pct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
          {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
        </span>
      )}
      <span className="text-[10px] font-medium text-gray-400">{label}</span>
    </div>
  );
};

const ReportsTab: React.FC<ReportsTabProps> = ({ invoices, clients }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  /** One pass over every invoice — buckets by month, and the years we have data for. */
  const { buckets, years } = useMemo(() => {
    const b: Record<string, Bucket> = {};
    const ys = new Set<number>([now.getFullYear()]);

    invoices.forEach(inv => {
      const d = invDate(inv);
      if (!d) return;
      const k = key(d.getFullYear(), d.getMonth());
      ys.add(d.getFullYear());
      if (!b[k]) b[k] = emptyBucket();

      const total = inv.totalKES || 0;
      b[k].orders += 1;
      if (inv.isPaid) {
        b[k].revenue += total;
        b[k].paidOrders += 1;
        b[k].profit += inv.serviceFeeKES || 0;
        const hasCosts = (inv.buyingPriceKES || 0) > 0 || (inv.shippingFeeKES || 0) > 0
          || (inv.logisticsCostKES || 0) > 0 || (inv.serviceFeeKES || 0) > 0;
        if (!hasCosts) b[k].noBreakdown += 1;
      }
      if (inv.paymentStatus === PaymentStatus.UNPAID) b[k].outstanding += total;
    });

    return { buckets: b, years: Array.from(ys).sort((a, c) => a - c) };
  }, [invoices, now]);

  const get = (y: number, m: number): Bucket => buckets[key(y, m)] || emptyBucket();

  const sel = get(year, month);
  const prevM = month === 0 ? get(year - 1, 11) : get(year, month - 1);
  const prevMLabel = month === 0 ? `vs Dec ${year - 1}` : `vs ${MONTHS_SHORT[month - 1]}`;
  const lastY = get(year - 1, month);

  /** A month that hasn't happened yet isn't a decline — it's simply not here. */
  const isFuture = (y: number, m: number) =>
    y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth());

  /** Twelve months of the chosen year, alongside the same months a year earlier. */
  const yearRows = useMemo(() => MONTHS_SHORT.map((name, m) => {
    const cur = get(year, m);
    const prior = get(year - 1, m);
    const future = isFuture(year, m);
    return {
      name, m, future,
      revenue: cur.revenue,
      priorRevenue: prior.revenue,
      orders: cur.orders,
      profit: cur.profit,
      aov: cur.paidOrders > 0 ? cur.revenue / cur.paidOrders : 0,
      yoy: future ? null : pctChange(cur.revenue, prior.revenue),
      mom: future ? null : pctChange(cur.revenue, m === 0 ? get(year - 1, 11).revenue : get(year, m - 1).revenue),
    };
  }), [buckets, year]);

  const yearTotal = yearRows.reduce((s, r) => s + r.revenue, 0);
  // Compare like with like: eight months of this year against the same eight of
  // last year, never against a full twelve.
  const priorYearTotal = yearRows.reduce((s, r) => s + (r.future ? 0 : r.priorRevenue), 0);
  const partialYear = yearRows.some(r => r.future);
  const traded = yearRows.filter(r => r.revenue > 0);
  const best = traded.length ? traded.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null;
  const worst = traded.length ? traded.reduce((a, b) => (b.revenue < a.revenue ? b : a)) : null;

  /** Day-by-day inside the selected month, plus weekday and product breakdowns. */
  const monthDetail = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i + 1}`, revenue: 0 }));
    const weekdays = WEEKDAYS.map(name => ({ name, revenue: 0, orders: 0 }));
    const products: Record<string, { sold: number; revenue: number }> = {};
    const rows: Invoice[] = [];

    invoices.forEach(inv => {
      const d = invDate(inv);
      if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
      rows.push(inv);
      if (!inv.isPaid) return;
      const total = inv.totalKES || 0;
      days[d.getDate() - 1].revenue += total;
      weekdays[d.getDay()].revenue += total;
      weekdays[d.getDay()].orders += 1;
      const name = (inv.productName || 'Unspecified').replace(/\s*\(.*\)$/, '').trim();
      if (!products[name]) products[name] = { sold: 0, revenue: 0 };
      products[name].sold += inv.quantity || 1;
      products[name].revenue += total;
    });

    const topProducts = Object.entries(products).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
    const bestDay = days.reduce((a, b) => (b.revenue > a.revenue ? b : a), days[0]);
    const bestWeekday = weekdays.reduce((a, b) => (b.revenue > a.revenue ? b : a), weekdays[0]);
    const newClients = clients.filter(c => {
      if (!c.joinedDate) return false;
      const d = new Date(c.joinedDate);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
    }).length;

    return { days, weekdays, topProducts, bestDay, bestWeekday, rows, newClients };
  }, [invoices, clients, year, month]);

  const selFuture = isFuture(year, month);
  const aov = sel.paidOrders > 0 ? sel.revenue / sel.paidOrders : 0;
  const prevAov = prevM.paidOrders > 0 ? prevM.revenue / prevM.paidOrders : 0;

  /** Invoice-level rows, shared by both exports. */
  const orderRows = (list: Invoice[]) => list.map(inv => {
    const d = invDate(inv);
    return {
      'Invoice #': inv.invoiceNumber,
      'Date': d ? d.toLocaleDateString('en-GB') : '',
      'Client': inv.clientName,
      'Product': inv.productName,
      'Qty': inv.quantity || 1,
      'Status': inv.paymentStatus,
      'Total (KES)': inv.totalKES || 0,
      'Buying (KES)': inv.buyingPriceKES || 0,
      'Shipping (KES)': inv.shippingFeeKES || 0,
      'Logistics (KES)': inv.logisticsCostKES || 0,
      'Service Fee (KES)': inv.serviceFeeKES || 0,
    };
  });

  const autoWidth = (ws: XLSX.WorkSheet, data: any[]) => {
    if (data.length) ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
  };

  const exportMonth = () => {
    const summary = [
      { Metric: 'Period', Value: `${MONTHS[month]} ${year}` },
      { Metric: 'Paid revenue (KES)', Value: Math.round(sel.revenue) },
      { Metric: 'Orders raised', Value: sel.orders },
      { Metric: 'Orders paid', Value: sel.paidOrders },
      { Metric: 'Service fees (KES)', Value: Math.round(sel.profit) },
      { Metric: 'Average order value (KES)', Value: Math.round(aov) },
      { Metric: 'Outstanding (KES)', Value: Math.round(sel.outstanding) },
      { Metric: 'New clients', Value: monthDetail.newClients },
      { Metric: '', Value: '' },
      { Metric: `Previous month revenue (KES)`, Value: Math.round(prevM.revenue) },
      { Metric: 'Change vs previous month (%)', Value: pctChange(sel.revenue, prevM.revenue)?.toFixed(1) ?? 'n/a' },
      { Metric: `${MONTHS[month]} ${year - 1} revenue (KES)`, Value: Math.round(lastY.revenue) },
      { Metric: 'Change vs same month last year (%)', Value: pctChange(sel.revenue, lastY.revenue)?.toFixed(1) ?? 'n/a' },
      { Metric: '', Value: '' },
      { Metric: 'Best day', Value: monthDetail.bestDay && monthDetail.bestDay.revenue > 0 ? `${MONTHS_SHORT[month]} ${monthDetail.bestDay.name} — ${money(monthDetail.bestDay.revenue)}` : 'No paid orders' },
      { Metric: 'Strongest weekday', Value: monthDetail.bestWeekday && monthDetail.bestWeekday.revenue > 0 ? `${monthDetail.bestWeekday.name} — ${money(monthDetail.bestWeekday.revenue)}` : 'No paid orders' },
      { Metric: '', Value: '' },
      ...monthDetail.topProducts.map(([name, s], i) => ({
        Metric: `Top product ${i + 1}`, Value: `${name} — ${s.sold} sold, ${money(s.revenue)}`,
      })),
      { Metric: '', Value: '' },
      { Metric: 'Paid orders with no cost breakdown', Value: sel.noBreakdown },
      { Metric: 'Note', Value: 'Revenue counts invoices marked paid, dated by created date. Service fees are only as complete as the cost breakdowns entered.' },
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summary);
    ws1['!cols'] = [{ wch: 40 }, { wch: 52 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    const rows = orderRows(monthDetail.rows);
    if (rows.length) {
      const ws2 = XLSX.utils.json_to_sheet(rows);
      autoWidth(ws2, rows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Orders');
    }
    XLSX.writeFile(wb, `LegitGrinder_Report_${year}-${String(month + 1).padStart(2, '0')}.xlsx`);
  };

  const exportYear = () => {
    const monthly = yearRows.map(r => ({
      'Month': `${r.name} ${year}`,
      'Paid revenue (KES)': Math.round(r.revenue),
      'Orders': r.orders,
      'Service fees (KES)': Math.round(r.profit),
      'Avg order value (KES)': Math.round(r.aov),
      'vs previous month (%)': r.mom === null ? '' : r.mom.toFixed(1),
      [`vs ${year - 1} (%)`]: r.yoy === null ? '' : r.yoy.toFixed(1),
      [`${year - 1} revenue (KES)`]: Math.round(r.priorRevenue),
    }));
    monthly.push({
      'Month': `TOTAL ${year}`,
      'Paid revenue (KES)': Math.round(yearTotal),
      'Orders': yearRows.reduce((s, r) => s + r.orders, 0),
      'Service fees (KES)': Math.round(yearRows.reduce((s, r) => s + r.profit, 0)),
      'Avg order value (KES)': '' as any,
      'vs previous month (%)': '',
      [`vs ${year - 1} (%)`]: pctChange(yearTotal, priorYearTotal)?.toFixed(1) ?? '',
      [`${year - 1} revenue (KES)`]: Math.round(priorYearTotal),
    });
    if (partialYear) {
      monthly.push({
        'Month': `Note: the ${year} total is compared against the same elapsed months of ${year - 1}, not the full year.`,
      } as any);
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(monthly);
    autoWidth(ws1, monthly);
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly');

    const inYear = invoices.filter(inv => {
      const d = invDate(inv);
      return d && d.getFullYear() === year;
    });
    const rows = orderRows(inYear);
    if (rows.length) {
      const ws2 = XLSX.utils.json_to_sheet(rows);
      autoWidth(ws2, rows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Orders');
    }
    XLSX.writeFile(wb, `LegitGrinder_Report_${year}.xlsx`);
  };

  const minYear = years[0];
  const maxYear = Math.max(years[years.length - 1], now.getFullYear());
  const monthMax = Math.max(...yearRows.map(r => r.revenue), 1);

  return (
    <div className="space-y-4">
      {/* ── Year navigation + exports ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setYear(y => Math.max(minYear, y - 1))}
            disabled={year <= minYear}
            className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] disabled:opacity-30 disabled:hover:border-neutral-200 disabled:hover:text-gray-500 transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[92px]">
            <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{year}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{money(yearTotal)}</p>
          </div>
          <button
            onClick={() => setYear(y => Math.min(maxYear, y + 1))}
            disabled={year >= maxYear}
            className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] disabled:opacity-30 disabled:hover:border-neutral-200 disabled:hover:text-gray-500 transition-colors"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {priorYearTotal > 0 && (
            <div className="ml-2 hidden sm:block">
              <Delta
                cur={yearTotal}
                prev={priorYearTotal}
                label={`vs ${year - 1}${partialYear ? ' same period' : ''} (${compact(priorYearTotal)})`}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMonth}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-50 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> {MONTHS_SHORT[month]} report
          </button>
          <button
            onClick={exportYear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> {year} report
          </button>
        </div>
      </div>

      {/* ── The twelve months, at a glance ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Every month of {year}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Click a month to break it down</p>
          </div>
          {best && (
            <p className="text-[10px] font-bold text-gray-400 hidden md:block">
              Best <span className="text-gray-900">{best.name}</span> {compact(best.revenue)}
              {worst && worst.name !== best.name && <> · Leanest <span className="text-gray-900">{worst.name}</span> {compact(worst.revenue)}</>}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {yearRows.map(r => {
            const on = r.m === month;
            const isBest = best?.m === r.m && r.revenue > 0;
            const dead = r.revenue === 0 && r.orders === 0;
            return (
              <button
                key={r.name}
                onClick={() => setMonth(r.m)}
                className={`text-left rounded-xl border p-3 transition-all ${on
                  ? 'border-[#3D8593] bg-teal-50/60 ring-2 ring-teal-100'
                  : dead ? 'border-neutral-100 bg-neutral-50/40 hover:border-neutral-200'
                    : 'border-neutral-100 hover:border-neutral-300'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${on ? 'text-[#3D8593]' : dead ? 'text-gray-300' : 'text-gray-500'}`}>{r.name}</span>
                  {isBest && <span className="text-[8px] font-black uppercase tracking-widest text-[#FF9900] bg-amber-50 px-1.5 py-0.5 rounded">Best</span>}
                </div>
                <p className={`text-sm font-black tracking-tight ${dead ? 'text-gray-300' : 'text-gray-900'}`}>
                  {r.revenue > 0 ? compact(r.revenue) : '—'}
                </p>
                <div className="h-1 rounded-full bg-neutral-100 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${on ? 'bg-[#3D8593]' : 'bg-neutral-300'}`}
                    style={{ width: `${Math.min(100, (r.revenue / monthMax) * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] font-bold text-gray-400 mt-1.5">
                  {r.future ? 'Upcoming' : <>
                    {r.orders} order{r.orders === 1 ? '' : 's'}
                    {r.yoy !== null && <span className={r.yoy >= 0 ? ' text-emerald-600' : ' text-rose-500'}> · {r.yoy >= 0 ? '+' : ''}{r.yoy.toFixed(0)}% yoy</span>}
                  </>}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── The selected month ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">{MONTHS[month]} {year}</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {sel.paidOrders} paid of {sel.orders} raised
            {monthDetail.newClients > 0 && ` · ${monthDetail.newClients} new client${monthDetail.newClients === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Paid revenue', val: money(sel.revenue), cur: sel.revenue, prev: prevM.revenue, yoyPrev: lastY.revenue },
            { label: 'Service fees', val: money(sel.profit), cur: sel.profit, prev: prevM.profit, yoyPrev: lastY.profit },
            { label: 'Avg order value', val: money(aov), cur: aov, prev: prevAov, yoyPrev: lastY.paidOrders > 0 ? lastY.revenue / lastY.paidOrders : 0 },
            { label: 'Outstanding', val: money(sel.outstanding), cur: sel.outstanding, prev: prevM.outstanding, yoyPrev: lastY.outstanding },
          ].map(t => (
            <div key={t.label} className="rounded-xl border border-neutral-100 p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.label}</p>
              <p className="text-xl font-black text-gray-900 tracking-tight mb-2.5 break-words">{t.val}</p>
              <div className="space-y-1">
                <Delta cur={t.cur} prev={t.prev} label={prevMLabel} mute={selFuture} />
                <Delta cur={t.cur} prev={t.yoyPrev} label={`vs ${MONTHS_SHORT[month]} ${year - 1}`} mute={selFuture} />
              </div>
            </div>
          ))}
        </div>

        {/* Day by day */}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Day by day</p>
        <div className="h-[170px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthDetail.days} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} interval={2} tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize: 9, fontWeight: 700, fill: '#c4c8ce' }} tickFormatter={(v: number) => compact(v)} />
              <Tooltip
                cursor={{ fill: 'rgba(61,133,147,0.05)' }}
                formatter={(v: number) => [money(v), 'Revenue']}
                labelFormatter={(l) => `${MONTHS_SHORT[month]} ${l}`}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #f3f4f6', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 700 }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {monthDetail.days.map((d, i) => (
                  <Cell key={i} fill={d.revenue === monthDetail.bestDay?.revenue && d.revenue > 0 ? '#FF9900' : '#3D8593'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {(monthDetail.bestDay?.revenue || 0) > 0 && (
          <p className="text-[11px] font-medium text-gray-500 mt-3">
            Strongest day was <strong className="text-gray-900">{MONTHS_SHORT[month]} {monthDetail.bestDay.name}</strong> at {money(monthDetail.bestDay.revenue)}
            {monthDetail.bestWeekday.revenue > 0 && <> · most money lands on a <strong className="text-gray-900">{monthDetail.bestWeekday.name}</strong></>}
          </p>
        )}

        {sel.noBreakdown > 0 && (
          <div className="flex items-start gap-2.5 mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3.5">
            <AlertTriangle className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-amber-900/80 leading-relaxed">
              <strong>{sel.noBreakdown}</strong> paid order{sel.noBreakdown === 1 ? ' has' : 's have'} no cost breakdown entered, so the
              service-fee figure for this month is understated. Add the breakdown on those invoices to make profit accurate.
            </p>
          </div>
        )}
      </div>

      {/* ── This year against last year ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">{year} against {year - 1}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Paid revenue, month by month</p>
          </div>
          <TrendingUp className="w-4 h-4 text-gray-300" />
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearRows} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 10, fontWeight: 700, fill: '#c4c8ce' }} tickFormatter={(v: number) => compact(v)} />
              <Tooltip
                cursor={{ fill: 'rgba(61,133,147,0.05)' }}
                formatter={(v: number, n: string) => [money(v), n]}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #f3f4f6', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} iconType="circle" iconSize={8} />
              <Bar name={`${year - 1}`} dataKey="priorRevenue" fill="#e2e8ec" radius={[4, 4, 0, 0]} />
              <Bar name={`${year}`} dataKey="revenue" radius={[4, 4, 0, 0]}>
                {yearRows.map(r => (
                  <Cell key={r.name} fill={r.m === month ? '#0f1a1c' : '#3D8593'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── The numbers, as a table ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50">
          <h3 className="text-sm font-black text-gray-900 tracking-tight">{year} month by month</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Revenue counts invoices marked paid</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50/60">
              <tr>
                {['Month', 'Paid revenue', 'Orders', 'Avg order', 'Service fees', 'vs prev', `vs ${year - 1}`].map(h => (
                  <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {yearRows.map(r => (
                <tr
                  key={r.name}
                  onClick={() => setMonth(r.m)}
                  className={`cursor-pointer transition-colors ${r.m === month ? 'bg-teal-50/50' : 'hover:bg-neutral-50/60'}`}
                >
                  <td className="px-5 py-3 text-sm font-black text-gray-900 whitespace-nowrap">
                    {r.name}
                    {best?.m === r.m && r.revenue > 0 && <span className="ml-2 text-[8px] font-black uppercase tracking-widest text-[#FF9900] bg-amber-50 px-1.5 py-0.5 rounded">Best</span>}
                  </td>
                  <td className={`px-5 py-3 text-sm font-bold whitespace-nowrap ${r.revenue > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {r.revenue > 0 ? money(r.revenue) : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-500">{r.orders || '—'}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">{r.aov > 0 ? money(r.aov) : '—'}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">{r.profit > 0 ? money(r.profit) : '—'}</td>
                  {[r.mom, r.yoy].map((v, i) => (
                    <td key={i} className="px-5 py-3 whitespace-nowrap">
                      {v === null ? <span className="text-xs text-gray-300">—</span> : (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${v >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                          {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50/60 border-t border-neutral-100">
              <tr>
                <td className="px-5 py-3 text-sm font-black text-gray-900">Total</td>
                <td className="px-5 py-3 text-sm font-black text-gray-900 whitespace-nowrap">{money(yearTotal)}</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-600">{yearRows.reduce((s, r) => s + r.orders, 0)}</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-sm font-bold text-gray-600 whitespace-nowrap">{money(yearRows.reduce((s, r) => s + r.profit, 0))}</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3">
                  {priorYearTotal > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${yearTotal >= priorYearTotal ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                      {yearTotal >= priorYearTotal ? '▲' : '▼'} {Math.abs(pctChange(yearTotal, priorYearTotal) || 0).toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── What sold that month ───────────────────────────────── */}
      {monthDetail.topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-50">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">What sold in {MONTHS[month]}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ranked by paid revenue</p>
          </div>
          <div className="divide-y divide-neutral-50">
            {monthDetail.topProducts.map(([name, s], i) => (
              <div key={name} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-neutral-50 text-gray-400 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-sm font-bold text-gray-900 truncate">{name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="px-2.5 py-1 bg-teal-50 text-[#3D8593] rounded-lg text-xs font-black">{s.sold} sold</span>
                  <span className="text-sm font-black text-gray-900 whitespace-nowrap">{money(s.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
