import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Copy, Download, RefreshCcw, Check, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Invoice, Client, Consultation } from '../types';
import { fetchWaitlistEmails } from '../services/supabaseData';
import { fetchCorporateQuotes } from '../services/corporate';
import { fetchGroupOrders } from '../services/groupBuys';

/**
 * Admin → Clients → the mailing list.
 *
 * Every address that has ever touched the business is already sitting in the
 * database — but scattered across six tables, so there was nowhere to actually
 * see them. This gathers them into one deduplicated list you can copy or
 * export when a campaign is worth running.
 *
 * Deliberately NOT a new table. Nothing is stored, nothing has to be kept in
 * sync, and no migration has to be run: it reads what is already there, every
 * time you open it. An address that only exists here is an address that came
 * from somewhere real.
 */

/** Where an address was picked up. Order matters — first match names the row. */
const SOURCES = [
  { key: 'buyer', label: 'Bought', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'client', label: 'Registered', color: 'bg-teal-50 text-[#3D8593]' },
  { key: 'group', label: 'Group buy', color: 'bg-indigo-50 text-indigo-500' },
  { key: 'corporate', label: 'Corporate', color: 'bg-violet-50 text-violet-600' },
  { key: 'consult', label: 'Consultation', color: 'bg-amber-50 text-[#FF9900]' },
  { key: 'waitlist', label: 'Restock waitlist', color: 'bg-rose-50 text-rose-500' },
] as const;

type SourceKey = typeof SOURCES[number]['key'];

interface Person {
  email: string;
  name?: string;
  sources: Set<SourceKey>;
  lastSeen: number;
  spentKES: number;
}

interface Props {
  clients: Client[];
  invoices: Invoice[];
  consultations: Consultation[];
}

const time = (v?: string | number | null): number => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

const AudiencePanel: React.FC<Props> = ({ clients, invoices, consultations }) => {
  // The three tables the dashboard doesn't already hold in memory.
  const [waitlist, setWaitlist] = useState<{ email: string; createdAt: string }[]>([]);
  const [corporate, setCorporate] = useState<{ email: string; name?: string; createdAt: string }[]>([]);
  const [group, setGroup] = useState<{ email: string; name?: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SourceKey | 'all'>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchWaitlistEmails().catch(() => []),
      fetchCorporateQuotes().catch(() => []),
      fetchGroupOrders().catch(() => []),
    ]).then(([w, c, g]) => {
      setWaitlist(w);
      setCorporate(c.filter(q => q.email).map(q => ({
        email: q.email, name: q.fullName || q.businessName, createdAt: q.createdAt,
      })));
      setGroup(g.filter(o => o.clientEmail).map(o => ({
        email: o.clientEmail!, name: o.clientName, createdAt: o.createdAt,
      })));
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const people = useMemo(() => {
    const byEmail = new Map<string, Person>();

    const add = (raw: string | undefined, src: SourceKey, opts?: { name?: string; at?: string | number; spent?: number }) => {
      const email = (raw || '').trim().toLowerCase();
      // A bare sanity check, not validation — the addresses were already good
      // enough to take an order or send a receipt to.
      if (!email || !email.includes('@')) return;
      let p = byEmail.get(email);
      if (!p) { p = { email, sources: new Set(), lastSeen: 0, spentKES: 0 }; byEmail.set(email, p); }
      p.sources.add(src);
      if (!p.name && opts?.name && opts.name !== 'Guest Elite') p.name = opts.name;
      p.lastSeen = Math.max(p.lastSeen, time(opts?.at));
      p.spentKES += opts?.spent || 0;
    };

    clients.forEach(c => add(c.email, 'client', { name: c.name, at: c.joinedDate }));
    invoices.forEach(i => add(i.clientEmail, 'buyer', {
      name: i.clientName,
      at: i.createdAt || i.date,
      // Only money actually settled counts as spend.
      spent: i.isPaid ? (i.totalKES || 0) : 0,
    }));
    consultations.forEach(c => add(c.email, 'consult', { name: c.name, at: c.date }));
    corporate.forEach(c => add(c.email, 'corporate', { name: c.name, at: c.createdAt }));
    group.forEach(g => add(g.email, 'group', { name: g.name, at: g.createdAt }));
    waitlist.forEach(w => add(w.email, 'waitlist', { at: w.createdAt }));

    return [...byEmail.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }, [clients, invoices, consultations, corporate, group, waitlist]);

  const counts = useMemo(() => {
    const n: Record<string, number> = {};
    SOURCES.forEach(s => { n[s.key] = people.filter(p => p.sources.has(s.key)).length; });
    return n;
  }, [people]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p =>
      (filter === 'all' || p.sources.has(filter)) &&
      (!q || p.email.includes(q) || (p.name || '').toLowerCase().includes(q)));
  }, [people, filter, query]);

  const copyAll = () => {
    navigator.clipboard.writeText(shown.map(p => p.email).join(', ')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportList = () => {
    const rows = shown.map(p => ({
      Email: p.email,
      Name: p.name || '',
      'Where from': [...p.sources].map(s => SOURCES.find(x => x.key === s)?.label).join(', '),
      'Last seen': p.lastSeen ? new Date(p.lastSeen).toLocaleDateString('en-GB') : '',
      'Spent (KES)': p.spentKES || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Audience');
    const tag = filter === 'all' ? 'All' : SOURCES.find(s => s.key === filter)?.label.replace(/\s/g, '');
    XLSX.writeFile(wb, `LegitGrinder_Audience_${tag}.xlsx`);
  };

  const chip = (key: SourceKey) => SOURCES.find(s => s.key === key)!;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-[#3D8593] flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Mailing list {!loading && <span className="text-gray-400 font-bold">({people.length} address{people.length === 1 ? '' : 'es'})</span>}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Everyone who has bought, booked, enquired or signed up — gathered, not stored
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyAll} disabled={!shown.length}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593] transition-colors disabled:opacity-40 flex items-center gap-2">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : `Copy ${shown.length}`}
          </button>
          <button onClick={exportList} disabled={!shown.length}
            className="px-4 py-2.5 rounded-xl bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40 flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={load} title="Reload"
            className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${filter === 'all' ? 'bg-[#3D8593] text-white' : 'bg-neutral-50 text-gray-400 hover:text-gray-600'}`}>
          All {people.length}
        </button>
        {SOURCES.filter(s => counts[s.key] > 0).map(s => (
          <button key={s.key} onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${filter === s.key ? 'bg-[#3D8593] text-white' : `${s.color} hover:opacity-80`}`}>
            {s.label} {counts[s.key]}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input
            type="search" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
            className="h-9 w-44 bg-neutral-50 border border-transparent rounded-full pl-9 pr-4 text-xs font-medium outline-none focus:border-[#3D8593] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <p className="px-6 py-5 text-sm text-gray-400 font-medium">Gathering addresses…</p>
      ) : !people.length ? (
        <p className="px-6 py-5 text-sm text-gray-400 font-medium">
          No addresses yet. They appear here as soon as someone orders, books a consultation,
          joins a group buy or asks to be told about a restock.
        </p>
      ) : (
        <>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-neutral-50">
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Address</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Where from</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Spent</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {shown.map(p => (
                  <tr key={p.email} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-bold text-[13px] text-gray-900 lowercase truncate max-w-[260px]">{p.email}</p>
                      {p.name && <p className="text-[10px] font-bold text-gray-400 mt-0.5 truncate max-w-[260px]">{p.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[...p.sources].map(s => (
                          <span key={s} className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${chip(s).color}`}>
                            {chip(s).label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-black text-gray-900">
                      {p.spentKES > 0 ? `KES ${p.spentKES.toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400 font-medium">
                      {p.lastSeen ? new Date(p.lastSeen).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr><td colSpan={4} className="px-6 py-5 text-sm text-gray-400 font-medium">Nothing matches that.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="px-6 py-3 border-t border-neutral-50 text-[10px] font-medium text-gray-400 leading-relaxed">
            These addresses were given to place an order or ask a question, not to receive marketing.
            When you do run a campaign, send it through a proper bulk sender with an unsubscribe link —
            pasting a few hundred into a normal email gets the domain flagged as spam.
          </p>
        </>
      )}
    </div>
  );
};

export default AudiencePanel;
