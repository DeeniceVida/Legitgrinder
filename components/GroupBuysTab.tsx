import React, { useEffect, useMemo, useState } from 'react';
import {
  UsersThree, Plus, LinkSimple, Copy, CheckCircle, CircleNotch, MagnifyingGlass,
  WhatsappLogo, LockSimple, LockSimpleOpen, CurrencyDollar, Package, ArrowLeft,
  PencilSimple, Clock
} from '@phosphor-icons/react';
import {
  GroupCampaign, GroupOrder, fetchGroupCampaigns, fetchGroupOrders,
  createGroupCampaign, updateGroupCampaign, setGroupCampaignStatus
} from '../services/groupBuys';
import { normalizeKenyanPhone } from '../utils/phone';

const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors';
const label = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5';

const GroupBuysTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const blankForm = { title: '', description: '', imageUrl: '', unitPrice: '', minDeposit: '', slug: '', groupLink: '', closesAt: '' };
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
  const openEdit = (c: GroupCampaign) => {
    setEditingId(c.id);
    setForm({
      title: c.title, description: c.description || '', imageUrl: c.imageUrl || '',
      unitPrice: String(c.unitPriceKES), minDeposit: String(c.minDepositKES),
      slug: c.slug, groupLink: c.whatsappGroupLink || '', closesAt: toLocalInput(c.closesAt)
    });
    setFormError(null); setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.unitPrice) { setFormError('Give it a title and a unit price.'); return; }
    setCreating(true);
    const closesAt = form.closesAt ? new Date(form.closesAt).toISOString() : null;
    const common = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      unitPriceKES: parseInt(form.unitPrice) || 0,
      minDepositKES: parseInt(form.minDeposit) || Math.round((parseInt(form.unitPrice) || 0) / 2),
      whatsappGroupLink: form.groupLink.trim() || undefined,
      closesAt
    };
    const res = editingId
      ? await updateGroupCampaign(editingId, common)
      : await createGroupCampaign({ ...common, slug: form.slug.trim() || undefined });
    setCreating(false);
    if (!res.success) { setFormError(res.error || 'Could not save campaign.'); return; }
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

  const waBalance = (o: GroupOrder, title: string) => {
    const first = (o.clientName || 'there').split(' ')[0];
    const balance = Math.max(o.totalKES - o.amountPaidKES, 0);
    const msg = encodeURIComponent(
      `Hi ${first}! Your ${title} order (${o.orderCode}) has arrived and is ready for collection. ` +
      `Balance due: KES ${balance.toLocaleString()}. Kindly clear it so we can hand it over. Thank you!`
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
                    <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">{o.orderCode}</td>
                    <td className="px-4 py-3.5 text-center font-bold">{o.units}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{o.amountPaidKES.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-black text-[#FF9900]">{balance.toLocaleString()}</td>
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
            {!editingId && <div><label className={label}>Link code <span className="text-gray-300">(optional)</span></label><input className={input} placeholder="auto from title" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>}
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
          <div><label className={label}>Image URL <span className="text-gray-300">(optional)</span></label><input className={input} placeholder="https://…" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 hover:bg-neutral-50">Cancel</button>
            <button onClick={handleSubmit} disabled={creating} className="btn-vibrant-teal px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
              {creating ? <><CircleNotch size={15} className="animate-spin" /> Saving…</> : <><CheckCircle size={15} weight="fill" /> {editingId ? 'Save changes' : 'Create campaign'}</>}
            </button>
          </div>
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
          {campaigns.map(c => {
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
                  <button onClick={() => copyLink(c.slug)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-brand-bg border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593] transition-all">
                    {copiedSlug === c.slug ? <><CheckCircle size={13} weight="fill" className="text-emerald-500" /> Copied</> : <><LinkSimple size={13} weight="bold" /> Copy link</>}
                  </button>
                  <button onClick={() => setSelected(c.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all">
                    View orders
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupBuysTab;
