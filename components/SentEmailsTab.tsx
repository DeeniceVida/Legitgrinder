import React, { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCcw, AlertTriangle, Search, Check, X } from 'lucide-react';
import { SentEmail, fetchSentEmails, KIND_LABEL } from '../services/sentEmails';

/**
 * Admin → Emails. Everything the site has sent, and — the part that actually
 * earns its place — everything it failed to send. A bounced invoice used to be
 * invisible unless you went looking in Resend.
 */

const KIND_STYLE: Record<string, string> = {
  invoice: 'bg-sky-50 text-sky-600',
  receipt: 'bg-emerald-50 text-emerald-600',
  restock: 'bg-[#FF9900]/10 text-[#FF9900]',
  corporate: 'bg-teal-50 text-[#3D8593]',
  'sale-alert': 'bg-violet-50 text-violet-600',
  'order-status': 'bg-neutral-100 text-gray-500',
  'group-balance': 'bg-amber-50 text-amber-600',
};

const SentEmailsTab: React.FC = () => {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<string>('all');
  const [failedOnly, setFailedOnly] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSentEmails().then(setEmails).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const failed = emails.filter(e => e.status === 'failed');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emails.filter(e => {
      if (failedOnly && e.status !== 'failed') return false;
      if (kind !== 'all' && e.kind !== kind) return false;
      if (!q) return true;
      return `${e.recipient} ${e.subject || ''} ${e.reference || ''}`.toLowerCase().includes(q);
    });
  }, [emails, search, kind, failedOnly]);

  const kinds = useMemo(() => {
    const seen: string[] = [];
    emails.forEach(e => { if (!seen.includes(e.kind)) seen.push(e.kind); });
    return seen;
  }, [emails]);

  const when = (iso: string) => {
    const d = new Date(iso);
    const mins = (Date.now() - d.getTime()) / 60000;
    if (mins < 1) return 'just now';
    if (mins < 60) return `${Math.floor(mins)}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
            Sent <span className="text-[#3D8593]">Emails</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Every message the site has sent — and the ones that failed
          </p>
        </div>
        <button onClick={load} className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors" title="Reload">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {failed.length > 0 && (
        <button
          onClick={() => setFailedOnly(f => !f)}
          className={`w-full text-left flex items-start gap-3 rounded-xl p-4 border transition-colors ${failedOnly ? 'bg-rose-100 border-rose-200' : 'bg-rose-50 border-rose-100 hover:bg-rose-100'}`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium text-rose-900/80 leading-relaxed">
            <strong>{failed.length} email{failed.length === 1 ? '' : 's'} failed to send.</strong>{' '}
            {failedOnly ? 'Showing only these — click to show everything again.' : 'Click to see just those.'}
          </p>
        </button>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipient, subject or reference…"
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
            />
          </div>
          <select
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:border-[#3D8593]"
          >
            <option value="all">All types</option>
            {kinds.map(k => <option key={k} value={k}>{KIND_LABEL[k] || k}</option>)}
          </select>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {visible.length} of {emails.length}
          </span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-400 font-medium">Loading…</p>
        ) : !emails.length ? (
          <div className="p-6">
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Nothing logged yet. Every email sent from here on appears in this list.
              {' '}If you have just added this, run <code>add_sent_emails.sql</code> in Supabase first.
            </p>
            <p className="text-[11px] text-gray-400 font-medium mt-3 leading-relaxed">
              This log starts from today — anything sent before it existed lives only in your
              Resend dashboard.
            </p>
          </div>
        ) : !visible.length ? (
          <p className="p-6 text-sm text-gray-400 font-medium">Nothing matches that.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {visible.map(e => (
              <div key={e.id} className="px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-neutral-50/40 transition-colors">
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${e.status === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  {e.status === 'failed' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </span>

                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {e.subject || KIND_LABEL[e.kind] || e.kind}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5">
                    {e.recipient}
                    {e.recipients > 1 && <span className="text-gray-400"> · {e.recipients} recipients</span>}
                  </p>
                  {e.error && (
                    <p className="text-[11px] font-bold text-rose-500 mt-1 leading-snug">{e.error}</p>
                  )}
                </div>

                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${KIND_STYLE[e.kind] || 'bg-neutral-100 text-gray-500'}`}>
                  {KIND_LABEL[e.kind] || e.kind}
                </span>

                <span className="shrink-0 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24 text-right">
                  {when(e.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400 font-medium leading-relaxed px-1">
        Recorded by the site as each message is sent. For delivery, opens and bounces as the
        mail provider saw them, your Resend dashboard remains the authority.
      </p>
    </div>
  );
};

export default SentEmailsTab;
