import React, { useEffect, useState } from 'react';
import { Motorcycle, Plus, Trash, Star, Check, X, WarningCircle, LinkSimple, BellRinging } from '@phosphor-icons/react';
import { Rider, fetchRiders, createRider, updateRider, setDefaultRider, deleteRider, setRiderPin } from '../services/riders';
import { rotateRiderToken } from '../services/deliveries';
import { notifyRider } from '../services/push';
import { normalizeKenyanPhone } from '../utils/phone';

/**
 * Admin → the two or three people who actually carry deliveries.
 *
 * A rider who leaves is deactivated rather than deleted, because old jobs
 * still name them. Deleting is there for a row typed in by mistake.
 */

const RidersPanel: React.FC = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  /** Confirmation for actions with no visible effect on this screen, like a test push. */
  const [note, setNote] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const load = () => {
    setLoading(true);
    fetchRiders().then(setRiders).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!name.trim() || !phone.trim()) { setError('A rider needs a name and a number.'); return; }
    setBusy('new'); setError(null);
    const res = await createRider({ name, phone });
    setBusy(null);
    if (!res.success) {
      setError(/relation|does not exist|schema cache/i.test(res.error || '')
        ? 'Run add_riders.sql in Supabase first — the table does not exist yet.'
        : res.error || 'Could not add that rider.');
      return;
    }
    setName(''); setPhone(''); setAdding(false); load();
  };

  const toggleActive = async (r: Rider) => {
    setBusy(r.id);
    await updateRider(r.id, { active: !r.active });
    setBusy(null); load();
  };

  const makeDefault = async (r: Rider) => {
    setBusy(r.id);
    const res = await setDefaultRider(r.id);
    setBusy(null);
    if (!res.success) setError(res.error || 'Could not set the default.');
    else load();
  };

  const remove = async (r: Rider) => {
    if (!confirm(`Delete ${r.name} completely?\n\nIf they've simply stopped riding for you, deactivate them instead — that keeps their name on past jobs.`)) return;
    setBusy(r.id);
    await deleteRider(r.id);
    setBusy(null); load();
  };

  /** The PIN they type after opening their link. Four to eight digits. */
  const savePin = async (r: Rider) => {
    setBusy(r.id); setError(null);
    const res = await setRiderPin(r.id, pinValue.trim());
    setBusy(null);
    if (!res.success) { setError(res.error || 'Could not set that PIN.'); return; }
    setPinFor(null); setPinValue('');
    alert(res.cleared
      ? `${r.name} no longer needs a PIN — their link alone opens the dashboard.`
      : `PIN set. Tell ${r.name} in person or on a call, not in the same message as the link.`);
  };

  /** Their dashboard link, ready to paste into WhatsApp. */
  const copyLink = (r: Rider) => {
    const url = `${window.location.origin}/rider/${r.accessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(r.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  /**
   * Buzz a rider's phone on demand.
   *
   * Worth having as its own button: the alternative way to find out whether
   * alerts work is to assign a real delivery and hope, which is not a test.
   * Says plainly which of the three things went wrong — nobody has turned
   * alerts on, the deployment has no VAPID key, or the push was rejected.
   */
  const testAlert = async (r: Rider) => {
    setBusy(r.id); setError(null); setNote(null);
    const res = await notifyRider({
      riderId: r.id,
      riderToken: r.accessToken,
      title: 'Test alert',
      body: `Hi ${r.name.split(' ')[0]} — this is LegitGrinder checking your alerts work. No job attached.`,
    });
    setBusy(null);
    if (res.success) {
      setNote(`Sent to ${r.name.split(' ')[0]}${res.sent > 1 ? ` on ${res.sent} devices` : ''}. Their phone should buzz within a few seconds.`);
    } else {
      setError(`Could not alert ${r.name.split(' ')[0]} — ${res.error}`);
    }
  };

  /** Kill the old link. Use it the day a rider stops working with you. */
  const revoke = async (r: Rider) => {
    if (!confirm(
      `Revoke ${r.name}'s link?\n\n` +
      `Their current link stops working immediately, and you'll need to send them the new one.`
    )) return;
    setBusy(r.id);
    const res = await rotateRiderToken(r.id);
    setBusy(null);
    if (!res.success) { setError(res.error || 'Could not revoke that link.'); return; }
    load();
  };

  const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors';

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-50 text-[#FF9900] flex items-center justify-center">
            <Motorcycle size={18} weight="duotone" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Riders {!loading && <span className="text-gray-400 font-bold">({riders.filter(r => r.active).length} active)</span>}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Who carries local deliveries
            </p>
          </div>
        </div>
        <button
          onClick={() => { setAdding(a => !a); setError(null); }}
          className="px-4 py-2.5 rounded-xl bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
        >
          <Plus size={13} weight="bold" /> Add rider
        </button>
      </div>

      <div className="p-6 space-y-3">
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
            <WarningCircle size={16} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </div>
        )}

        {note && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <BellRinging size={16} weight="duotone" className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-emerald-900 flex-1">{note}</p>
            <button onClick={() => setNote(null)} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600">
              Dismiss
            </button>
          </div>
        )}

        {adding && (
          <div className="bg-neutral-50/60 border border-neutral-100 rounded-2xl p-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={input} placeholder="e.g. Kevin" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">WhatsApp number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={input} placeholder="0712 345678" />
            </div>
            <button
              onClick={add}
              disabled={busy === 'new'}
              className="h-[42px] px-5 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        ) : !riders.length ? (
          <p className="text-sm text-gray-400 font-medium">
            No riders yet. Add the one you use most and mark them default.
            {' '}If you've just added this feature, run <code>add_riders.sql</code> first.
          </p>
        ) : riders.map(r => (
          <div
            key={r.id}
            className={`p-4 rounded-2xl border flex flex-wrap items-center gap-4 ${r.active ? 'border-neutral-100 bg-white' : 'border-neutral-100 bg-neutral-50/60 opacity-60'}`}
          >
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                {r.name}
                {r.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#FF9900] text-[8px] font-black uppercase tracking-widest">Default</span>
                )}
                {!r.active && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-gray-400 text-[8px] font-black uppercase tracking-widest">Inactive</span>
                )}
              </p>
              <a
                href={`https://wa.me/${normalizeKenyanPhone(r.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#3D8593] hover:underline mt-0.5 inline-block"
              >
                {r.phone}
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {r.accessToken && r.active && (
                <>
                  <button
                    onClick={() => copyLink(r)}
                    className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#1eb955] text-[9px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-colors flex items-center gap-1.5"
                    title="Copy their dashboard link to send on WhatsApp"
                  >
                    {copied === r.id ? <><Check size={12} weight="bold" /> Copied</> : <><LinkSimple size={12} weight="bold" /> Their link</>}
                  </button>
                  <button
                    onClick={() => { setPinFor(pinFor === r.id ? null : r.id); setPinValue(''); setError(null); }}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593] transition-colors"
                    title="The PIN they type after opening their link"
                  >
                    Set PIN
                  </button>
                  <button
                    onClick={() => testAlert(r)}
                    disabled={busy === r.id}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    title="Buzz their phone now, to check alerts are working"
                  >
                    <BellRinging size={12} weight="bold" /> Test alert
                  </button>
                  <button
                    onClick={() => revoke(r)}
                    disabled={busy === r.id}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-400 text-[9px] font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                    title="Kill the old link and issue a new one"
                  >
                    Revoke link
                  </button>
                </>
              )}
              {!r.isDefault && r.active && (
                <button
                  onClick={() => makeDefault(r)}
                  disabled={busy === r.id}
                  className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:border-[#FF9900] hover:text-[#FF9900] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Star size={12} weight="bold" /> Make default
                </button>
              )}
              <button
                onClick={() => toggleActive(r)}
                disabled={busy === r.id}
                className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593] transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {r.active ? <><X size={12} weight="bold" /> Deactivate</> : <><Check size={12} weight="bold" /> Reactivate</>}
              </button>
              <button
                onClick={() => remove(r)}
                disabled={busy === r.id}
                className="p-2 rounded-lg text-gray-300 hover:text-rose-500 transition-colors"
                title="Delete permanently"
              >
                <Trash size={14} />
              </button>
            </div>

            {pinFor === r.id && (
              <div className="w-full mt-1 pt-4 border-t border-neutral-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                  {r.name}'s PIN <span className="text-neutral-300 normal-case font-medium">— 4 to 8 digits, or leave blank to remove it</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={pinValue}
                    onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    inputMode="numeric"
                    placeholder="e.g. 4821"
                    className={input + ' max-w-[180px] tracking-[0.3em] font-black'}
                  />
                  <button
                    onClick={() => savePin(r)}
                    disabled={busy === r.id}
                    className="px-5 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
                  >
                    Save PIN
                  </button>
                </div>
                {/* The link and the PIN are two factors only while they travel
                    separately. In one WhatsApp message they are one. */}
                <p className="text-[11px] font-medium text-gray-400 mt-2 leading-relaxed">
                  Send the link and tell them the PIN <strong className="text-gray-600">separately</strong> — a call, or in
                  person. Both in one message is the same as having no PIN at all.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RidersPanel;
