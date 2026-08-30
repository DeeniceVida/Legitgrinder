import React, { useEffect, useMemo, useState } from 'react';
import {
  UsersThree, Plus, LinkSimple, Copy, CheckCircle, CircleNotch, MagnifyingGlass,
  WhatsappLogo, LockSimple, LockSimpleOpen, CurrencyDollar, Package, ArrowLeft,
  PencilSimple, Clock, ArrowsClockwise, PaperPlaneTilt
} from '@phosphor-icons/react';
import {
  GroupCampaign, GroupColor, GroupOrder, fetchGroupCampaigns, fetchGroupOrders,
  createGroupCampaign, updateGroupCampaign, setGroupCampaignStatus,
  markCampaignArrived, sendGroupBalanceEmails
} from '../services/groupBuys';
import { normalizeKenyanPhone } from '../utils/phone';

const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors';
const label = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5';

/**
 * What the balance email tells buyers about getting their order.
 *
 * This used to be one hardcoded line — "our Nairobi CBD pickup point" — which
 * is not an address, so someone who had just paid still had to message to ask
 * where to go. It also never mentioned delivery, so nobody knew to ask.
 *
 * Editable per send and remembered below, because a campaign collected
 * somewhere else should just be typed over.
 */
const PICKUP_ADDRESS = 'Dynamic Mall, Shop ML 135, 3rd Floor — Tom Mboya Street, behind the National Archives, opposite Ambassadeur.';
const PICKUP_HOURS = 'Open Monday to Saturday, 9am–6pm. Closed Sunday.';
const DEFAULT_COLLECTION_NOTE =
  `Collect from ${PICKUP_ADDRESS}\n` +
  `${PICKUP_HOURS} Please bring your order code.\n\n` +
  // No longer "agreed with the rider" — the email now carries a button that
  // prices it properly, so pointing people back to a negotiation would undo it.
  `Can't reach town? Use the delivery button below to pin your location and see the rider's fee.`;
const NOTE_STORAGE_KEY = 'lg.groupbuy.collectionNote';

const GroupBuysTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'running' | 'past'>('all');
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedGroupMsg, setCopiedGroupMsg] = useState(false);
  /** The send dialog — replaces a blind confirm() you couldn't edit anything in. */
  const [sendFor, setSendFor] = useState<{ campaign: GroupCampaign; owing: GroupOrder[] } | null>(null);
  /** Whether THIS campaign is items bigger than a jerrycan — rides in the delivery link. */
  const [largeItems, setLargeItems] = useState(false);
  const [collectionNote, setCollectionNote] = useState(() => {
    try { return localStorage.getItem(NOTE_STORAGE_KEY) || DEFAULT_COLLECTION_NOTE; }
    catch { return DEFAULT_COLLECTION_NOTE; }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const blankForm = { title: '', description: '', imageUrls: '', videoUrl: '', shippingMode: 'air' as 'air' | 'sea', colors: '', unitPrice: '', minDeposit: '', slug: '', groupLink: '', closesAt: '' };
  const [form, setForm] = useState(blankForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // datetime-local <-> ISO helpers
  const toLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const load = async () => {
    setLoading(true);
    const [c, o] = await Promise.all([fetchGroupCampaigns(), fetchGroupOrders()]);
    setCampaigns(c); setOrders(o); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const statsFor = (id: string) => {
    const list = orders.filter(o => o.campaignId === id);
    return {
      count: list.length,
      collected: list.reduce((s, o) => s + o.amountPaidKES, 0),
      units: list.reduce((s, o) => s + o.units, 0)
    };
  };

  const openNew = () => { setEditingId(null); setForm(blankForm); setFormError(null); setShowForm(true); };

  // Colours are typed one per line as "Name" or "Name | image-url".
  const colorsToText = (list?: GroupColor[]) =>
    (list || []).map(c => (c.imageUrl ? `${c.name} | ${c.imageUrl}` : c.name)).join('\n');
  const textToColors = (text: string): GroupColor[] =>
    text.split('\n').map(line => {
      const [name, url] = line.split('|').map(s => s.trim());
      return name ? { name, imageUrl: url || undefined } : null;
    }).filter(Boolean) as GroupColor[];

  /**
   * Rerun a past campaign: opens the CREATE form pre-filled from the old one, so
   * it becomes a brand-new campaign (fresh link and fresh roster) that can be
   * fully edited first — price, description, images, deadline. The original and
   * its orders are left untouched.
   */
  const openRerun = (c: GroupCampaign) => {
    setEditingId(null);
    setForm({
      title: c.title,
      description: c.description || '',
      imageUrls: (c.imageUrls && c.imageUrls.length ? c.imageUrls : (c.imageUrl ? [c.imageUrl] : [])).join('\n'),
      videoUrl: c.videoUrl || '',
      shippingMode: (c.shippingMode || 'air') as 'air' | 'sea',
      colors: colorsToText(c.colors),
      unitPrice: String(c.unitPriceKES),
      minDeposit: String(c.minDepositKES),
      slug: '',       // auto-generate a new link so it doesn't clash
      groupLink: c.whatsappGroupLink || '',
      closesAt: ''    // set a fresh deadline
    });
    setFormError(null);
    setShowForm(true);
  };
  const openEdit = (c: GroupCampaign) => {
    setEditingId(c.id);
    setForm({
      title: c.title, description: c.description || '',
      imageUrls: (c.imageUrls && c.imageUrls.length ? c.imageUrls : (c.imageUrl ? [c.imageUrl] : [])).join('\n'),
      videoUrl: c.videoUrl || '',
      shippingMode: (c.shippingMode || 'air') as 'air' | 'sea',
      colors: colorsToText(c.colors),
      unitPrice: String(c.unitPriceKES), minDeposit: String(c.minDepositKES),
      slug: c.slug, groupLink: c.whatsappGroupLink || '', closesAt: toLocalInput(c.closesAt)
    });
    setFormError(null); setShowForm(true);
  };

  /** A campaign is "past" once it's closed or its deadline has gone by. */
  const isPast = (c: GroupCampaign) =>
    c.status !== 'open' || (!!c.closesAt && new Date(c.closesAt).getTime() < Date.now());

  const visibleCampaigns = useMemo(() => {
    const list = view === 'all' ? campaigns
      : view === 'running' ? campaigns.filter(c => !isPast(c))
        : campaigns.filter(isPast);
    // Running first, then most recent deadline.
    return [...list].sort((a, b) => Number(isPast(a)) - Number(isPast(b)));
  }, [campaigns, view]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.unitPrice) { setFormError('Give it a title and a unit price.'); return; }
    setCreating(true);
    const closesAt = form.closesAt ? new Date(form.closesAt).toISOString() : null;
    const common = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      // Accept one URL per line or comma-separated — first one becomes the cover.
      imageUrls: form.imageUrls.split(/[\n,]+/).map(s => s.trim()).filter(Boolean),
      videoUrl: form.videoUrl.trim() || undefined,
      shippingMode: form.shippingMode,
      colors: textToColors(form.colors),
      unitPriceKES: parseInt(form.unitPrice) || 0,
      minDepositKES: parseInt(form.minDeposit) || Math.round((parseInt(form.unitPrice) || 0) / 2),
      whatsappGroupLink: form.groupLink.trim() || undefined,
      closesAt
    };
    const res = editingId
      ? await updateGroupCampaign(editingId, { ...common, slug: form.slug.trim() || undefined })
      : await createGroupCampaign({ ...common, slug: form.slug.trim() || undefined });
    setCreating(false);
    if (!res.success) { setFormError(res.error || 'Could not save campaign.'); return; }
    // Saved, but the DB was missing columns — tell the admin plainly rather than
    // letting colours/images vanish with no explanation.
    if (res.warning) alert(`⚠️ Saved, but:\n\n${res.warning}`);
    setForm(blankForm); setShowForm(false); setEditingId(null);
    load();
  };

  const toggleStatus = async (c: GroupCampaign) => {
    await setGroupCampaignStatus(c.id, c.status === 'open' ? 'closed' : 'open');
    load();
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/group/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1800);
    });
  };

  const selectedCampaign = campaigns.find(c => c.id === selected) || null;
  const roster = useMemo(() => {
    let list = selected ? orders.filter(o => o.campaignId === selected) : [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(o =>
      (o.clientName || '').toLowerCase().includes(q) ||
      (o.clientWhatsapp || '').includes(q) ||
      (o.orderCode || '').toLowerCase().includes(q));
    return list;
  }, [orders, selected, search]);

  /**
   * Mark the campaign arrived and email every buyer who still owes money their
   * own balance and pay link. Safe to run again — already-paid buyers are
   * skipped, so nobody gets chased for money they've settled.
   */
  const handleArrivedAndNotify = async (c: GroupCampaign, owing: GroupOrder[]) => {
    const withEmail = owing.filter(o => (o.clientEmail || '').includes('@'));
    const noEmail = owing.length - withEmail.length;

    setSendFor(null);
    // Remember it for next time, so the address is typed once.
    try { localStorage.setItem(NOTE_STORAGE_KEY, collectionNote); } catch { /* private window */ }

    setNotifying(true);
    setNotifyResult(null);

    if (!c.arrivedAt) {
      const mark = await markCampaignArrived(c.id);
      if (!mark.success) {
        setNotifying(false);
        setNotifyResult({ ok: false, msg: mark.error || 'Could not mark the campaign as arrived.' });
        return;
      }
    }

    const origin = window.location.origin;
    const res = await sendGroupBalanceEmails({
      campaignTitle: c.title,
      imageUrl: (c.imageUrls && c.imageUrls[0]) || c.imageUrl,
      collectionNote: collectionNote.trim() || undefined,
      // Buyers who cannot reach town get a rider instead of a lost sale.
      deliveryUrl: origin + '/request-delivery?item=' + encodeURIComponent(c.title) + (largeItems ? '&large=1' : ''),
      recipients: withEmail.map(o => ({
        email: o.clientEmail!, name: o.clientName, orderCode: o.orderCode,
        units: o.units, color: o.color,
        totalKES: o.totalKES, paidKES: o.amountPaidKES,
        balanceKES: Math.max(o.totalKES - o.amountPaidKES, 0),
        payUrl: `${origin}/group/pay/${o.orderCode}`
      }))
    });

    setNotifying(false);
    setNotifyResult(res.success
      ? { ok: true, msg: `✅ Emailed ${res.sent} buyer${res.sent === 1 ? '' : 's'}.${noEmail > 0 ? ` ${noEmail} had no email — WhatsApp them below.` : ''}` }
      : { ok: false, msg: `❌ ${res.error || 'The emails could not be sent.'}` });
    load();
  };

  /** One announcement to paste into the shared WhatsApp group. */
  const copyGroupMessage = (c: GroupCampaign) => {
    const msg =
      `📦 *${c.title} has arrived!*\n\n` +
      `Everyone who reserved — your order is in and ready for collection at:\n` +
      `📍 ${PICKUP_ADDRESS}\n` +
      `🕘 ${PICKUP_HOURS}\n\n` +
      `Your exact balance and a pay link have been emailed to you. Kindly clear it so we can hand yours over.\n\n` +
      `Need it delivered instead? Message me and I'll arrange a rider.\n\n` +
      `Didn't get the email? Reply here with your order code (GRP-XXXXXX) and we'll resend it.\n\n` +
      `— LegitGrinder`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedGroupMsg(true);
      setTimeout(() => setCopiedGroupMsg(false), 2200);
    });
  };

  const waBalance = (o: GroupOrder, title: string) => {
    const first = (o.clientName || 'there').split(' ')[0];
    const balance = Math.max(o.totalKES - o.amountPaidKES, 0);
    const msg = encodeURIComponent(
      `Hi ${first}! Your ${title} order (${o.orderCode}) has arrived and is ready for collection.\n\n` +
      `Balance due: KES ${balance.toLocaleString()}.\n\n` +
      // The buyers WhatsApped individually are the ones with no email, so this
      // is the only place they will ever be told where to go.
      `📍 ${PICKUP_ADDRESS}\n` +
      `🕘 ${PICKUP_HOURS}\n\n` +
      `Prefer delivery? Let me know and I'll arrange a rider. Thank you!`
    );
    window.open(`https://wa.me/${normalizeKenyanPhone(o.clientWhatsapp)}?text=${msg}`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><CircleNotch size={30} className="text-[#3D8593] animate-spin" /></div>;
  }

  // ── Roster view ──────────────────────────────────────────────────────────
  if (selectedCampaign) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <button onClick={() => { setSelected(null); setSearch(''); }} className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">
          <ArrowLeft size={14} weight="bold" /> All campaigns
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedCampaign.title}</h2>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#3D8593] mt-1">
              {statsFor(selectedCampaign.id).count} orders · {statsFor(selectedCampaign.id).units} units · KES {statsFor(selectedCampaign.id).collected.toLocaleString()} collected
            </p>
          </div>
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / number / code"
              className="h-11 bg-neutral-50 border border-neutral-200 rounded-full pl-10 pr-5 text-sm font-medium outline-none focus:border-[#3D8593]" />
          </div>
        </div>

        {/* ARRIVAL & BALANCE COLLECTION */}
        {(() => {
          const owing = orders.filter(o => o.campaignId === selectedCampaign.id && (o.totalKES - o.amountPaidKES) > 0);
          const settled = orders.filter(o => o.campaignId === selectedCampaign.id && (o.totalKES - o.amountPaidKES) <= 0);
          const owed = owing.reduce((s, o) => s + Math.max(o.totalKES - o.amountPaidKES, 0), 0);
          const arrived = !!selectedCampaign.arrivedAt;
          return (
            <div className={`rounded-[2rem] border p-6 ${arrived ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-neutral-100 shadow-sm'}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    {arrived ? 'Stock has landed' : 'When the stock lands'}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {arrived
                      ? `Marked arrived ${new Date(selectedCampaign.arrivedAt!).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'One click emails every buyer their balance and a pay link.'}
                  </p>
                  <p className="text-[11px] font-bold text-gray-500 mt-2">
                    <span className="text-[#FF9900]">{owing.length}</span> still owe KES {owed.toLocaleString()} ·{' '}
                    <span className="text-emerald-600">{settled.length}</span> fully paid
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyGroupMessage(selectedCampaign)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] transition-all"
                  >
                    {copiedGroupMsg ? <><CheckCircle size={13} weight="fill" className="text-emerald-500" /> Copied</> : <><Copy size={13} weight="bold" /> Group message</>}
                  </button>
                  <button
                    onClick={() => { setNotifyResult(null); setSendFor({ campaign: selectedCampaign, owing }); }}
                    disabled={notifying || owing.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all disabled:opacity-40"
                  >
                    {notifying
                      ? <><CircleNotch size={13} className="animate-spin" /> Emailing…</>
                      : arrived
                        ? <><PaperPlaneTilt size={13} weight="fill" /> Resend balance emails</>
                        : <><Package size={13} weight="fill" /> Mark arrived &amp; email balances</>}
                  </button>
                </div>
              </div>
              {notifyResult && (
                <p className={`text-xs font-bold mt-4 ${notifyResult.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{notifyResult.msg}</p>
              )}
            </div>
          );
        })()}

        <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">
                <th className="px-5 py-4">Client</th><th className="px-4 py-4">Order</th><th className="px-4 py-4 text-center">Units</th>
                <th className="px-4 py-4 text-right">Paid</th><th className="px-4 py-4 text-right">Balance</th>
                <th className="px-4 py-4 text-center">Joined</th><th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {roster.map(o => {
                const balance = Math.max(o.totalKES - o.amountPaidKES, 0);
                return (
                  <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-gray-900">{o.clientName}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{o.clientWhatsapp}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-gray-500">{o.orderCode}</span>
                      {o.color && (
                        <span className="block mt-1 w-fit px-2 py-0.5 rounded-full bg-[#3D8593]/10 text-[#3D8593] text-[10px] font-black uppercase tracking-widest">
                          {o.color}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">{o.units}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{o.amountPaidKES.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">
                      {balance > 0
                        ? <span className="font-black text-[#FF9900]">{balance.toLocaleString()}</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                            <CheckCircle size={11} weight="fill" /> Paid
                          </span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {o.joinedGroup ? <CheckCircle size={18} weight="fill" className="text-emerald-500 inline" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => waBalance(o, selectedCampaign.title)} title="WhatsApp balance request"
                        className="p-2 bg-[#25D366]/10 text-[#1eb955] rounded-xl hover:bg-[#25D366] hover:text-white transition-all">
                        <WhatsappLogo size={15} weight="fill" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {roster.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 font-medium">{search ? 'No matches.' : 'No orders yet on this campaign.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Campaigns list ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Group <span className="text-[#3D8593]">Buys</span></h2>
        <button onClick={openNew} className="px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-2 shadow-xl">
          <Plus size={15} weight="bold" /> New Campaign
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm p-6 md:p-8 space-y-4">
          {formError && <p className="text-sm text-rose-600 font-medium">{formError}</p>}
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className={label}>Item title *</label><input className={input} placeholder="e.g. Monitor (Group Buy)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <label className={label}>
                Link code <span className="text-gray-300">{editingId ? '— changing this breaks links already shared' : '(optional)'}</span>
              </label>
              <input className={input} placeholder="auto from title" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              <p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-1">
                Never paste a supplier URL here — it becomes the public link customers see.
              </p>
            </div>
          </div>
          <div><label className={label}>Description</label><textarea rows={2} className={`${input} resize-none`} placeholder="Short pitch shown on the page" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className={label}>Price per unit (KES) *</label><input type="number" className={input} placeholder="7000" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} /></div>
            <div><label className={label}>Min deposit per unit (KES)</label><input type="number" className={input} placeholder="half of price" value={form.minDeposit} onChange={e => setForm({ ...form, minDeposit: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className={label}>WhatsApp group link</label><input className={input} placeholder="https://chat.whatsapp.com/…" value={form.groupLink} onChange={e => setForm({ ...form, groupLink: e.target.value })} /></div>
            <div><label className={label}>Closes at <span className="text-gray-300">(deadline)</span></label><input type="datetime-local" className={input} value={form.closesAt} onChange={e => setForm({ ...form, closesAt: e.target.value })} /></div>
          </div>
          <div>
            <label className={label}>Images <span className="text-gray-300">— one URL per line, first is the cover</span></label>
            <textarea rows={3} className={`${input} resize-none`} placeholder={"https://…/front.jpg\nhttps://…/side.jpg\nhttps://…/box.jpg"} value={form.imageUrls} onChange={e => setForm({ ...form, imageUrls: e.target.value })} />
          </div>
          <div>
            <label className={label}>
              Colours <span className="text-gray-300">— one per line. Buyers pick one; price never changes.</span>
            </label>
            <textarea
              rows={3}
              className={`${input} resize-none`}
              placeholder={"Gray\nBlack | https://…/black.jpg\nWhite | https://…/white.jpg"}
              value={form.colors}
              onChange={e => setForm({ ...form, colors: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-1">
              Add an image after a “|” to show a real swatch. Leave blank if there's only one colour.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Video link <span className="text-gray-300">(TikTok / YouTube / IG — optional)</span></label>
              <input className={input} placeholder="https://www.tiktok.com/@you/video/…" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
            </div>
            <div>
              <label className={label}>Shipping <span className="text-gray-300">— sets the ETA on the poster</span></label>
              <select className={input} value={form.shippingMode} onChange={e => setForm({ ...form, shippingMode: e.target.value as 'air' | 'sea' })}>
                <option value="air">Air · 2–3 weeks</option>
                <option value="sea">Sea · 30–45 days</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 hover:bg-neutral-50">Cancel</button>
            <button onClick={handleSubmit} disabled={creating} className="btn-vibrant-teal px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
              {creating ? <><CircleNotch size={15} className="animate-spin" /> Saving…</> : <><CheckCircle size={15} weight="fill" /> {editingId ? 'Save changes' : 'Create campaign'}</>}
            </button>
          </div>
        </div>
      )}

      {/* Running / Past filter */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-100 rounded-full p-1 w-fit">
          {([
            ['all', `All (${campaigns.length})`],
            ['running', `Running (${campaigns.filter(c => !isPast(c)).length})`],
            ['past', `Past (${campaigns.filter(isPast).length})`],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setView(val)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === val ? 'bg-[#3D8593] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm py-16 text-center">
          <UsersThree size={40} weight="duotone" className="text-gray-300 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">No campaigns yet</p>
          <p className="text-sm text-gray-500 font-light">Create one, then share its link when clients DM you.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibleCampaigns.map(c => {
            const s = statsFor(c.id);
            const open = c.status === 'open';
            return (
              <div key={c.id} className="bg-white rounded-[1.75rem] border border-neutral-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 truncate">{c.title}</h3>
                    <p className="text-[11px] text-gray-400 font-bold">KES {c.unitPriceKES.toLocaleString()}/unit · min {c.minDepositKES.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEdit(c)} title="Edit campaign" className="p-1.5 rounded-full bg-gray-100 text-gray-400 hover:bg-[#3D8593] hover:text-white transition-all">
                      <PencilSimple size={13} weight="bold" />
                    </button>
                    <button onClick={() => toggleStatus(c)} title={open ? 'Close campaign' : 'Reopen'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${open ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {open ? <LockSimpleOpen size={12} weight="fill" /> : <LockSimple size={12} weight="fill" />} {c.status}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] font-bold text-gray-500 mb-4">
                  <span className="inline-flex items-center gap-1.5"><Package size={13} weight="duotone" /> {s.count} orders</span>
                  <span className="inline-flex items-center gap-1.5"><CurrencyDollar size={13} weight="duotone" /> {s.collected.toLocaleString()} in</span>
                  {c.closesAt && (
                    <span className={`inline-flex items-center gap-1.5 ${new Date(c.closesAt).getTime() < Date.now() ? 'text-rose-500' : ''}`}>
                      <Clock size={13} weight="duotone" />
                      {new Date(c.closesAt).getTime() < Date.now() ? 'Closed ' : 'Closes '}
                      {new Date(c.closesAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {isPast(c) ? (
                    <button onClick={() => openRerun(c)} title="Start a fresh campaign pre-filled from this one — edit price, deadline, anything"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#FF9900] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0f1a1c] transition-all">
                      <ArrowsClockwise size={13} weight="bold" /> Rerun
                    </button>
                  ) : (
                    <button onClick={() => copyLink(c.slug)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-brand-bg border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] transition-all">
                      {copiedSlug === c.slug ? <><CheckCircle size={13} weight="fill" className="text-emerald-500" /> Copied</> : <><LinkSimple size={13} weight="bold" /> Copy link</>}
                    </button>
                  )}
                  <button onClick={() => setSelected(c.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all">
                    View orders
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEND BALANCE EMAILS — the collection wording is the last thing you see
          before it goes out, because it is the part that changes. */}
      {sendFor && (() => {
        const withEmail = sendFor.owing.filter(o => (o.clientEmail || '').includes('@'));
        const noEmail = sendFor.owing.length - withEmail.length;
        const owed = sendFor.owing.reduce((s, o) => s + Math.max(o.totalKES - o.amountPaidKES, 0), 0);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="px-7 py-5 border-b border-neutral-100">
                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">Email {withEmail.length} buyer{withEmail.length === 1 ? '' : 's'}</h3>
                <p className="text-[11px] font-bold text-gray-400 mt-1.5">
                  “{sendFor.campaign.title}” has arrived · KES {owed.toLocaleString()} outstanding
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
                <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                  Each buyer gets their own email with their own balance and pay link — nobody sees anyone else's.
                </p>

                <div>
                  <label className={label}>Collection &amp; delivery <span className="text-neutral-300 normal-case font-medium">— appears in the 📍 box</span></label>
                  <textarea
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    rows={6}
                    className={input + ' resize-none leading-relaxed'}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] font-medium text-gray-400">Saved for next time.</p>
                    {collectionNote !== DEFAULT_COLLECTION_NOTE && (
                      <button
                        onClick={() => setCollectionNote(DEFAULT_COLLECTION_NOTE)}
                        className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:underline"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>

                {/* Rides in the delivery button's link. Without it every buyer
                    who picks delivery is quoted 150 short of what the rider
                    will actually want for a big load. */}
                <label className="flex items-start gap-3 cursor-pointer bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                  <input type="checkbox" checked={largeItems} onChange={e => setLargeItems(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#FF9900]" />
                  <span>
                    <span className="block text-[13px] font-bold text-gray-900">
                      These are bigger than a 20-litre jerrycan
                    </span>
                    <span className="block text-[11px] font-medium text-gray-400 leading-relaxed">
                      Adds KES 150 to any delivery booked from this email, shown to the buyer as an
                      explained line. Leave it off for small items.
                    </span>
                  </span>
                </label>

                {noEmail > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-[12px] font-medium text-amber-900/80 leading-relaxed">
                      <strong>{noEmail} buyer{noEmail === 1 ? ' has' : 's have'} no email on file</strong> and will not receive
                      this. WhatsApp them from the list — their button is already there.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-7 py-5 border-t border-neutral-100 flex justify-end gap-2">
                <button
                  onClick={() => setSendFor(null)}
                  className="px-5 py-3 rounded-full border border-neutral-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleArrivedAndNotify(sendFor.campaign, sendFor.owing)}
                  disabled={withEmail.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all disabled:opacity-40"
                >
                  <PaperPlaneTilt size={13} weight="fill" /> Send {withEmail.length} email{withEmail.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default GroupBuysTab;
