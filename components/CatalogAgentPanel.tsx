import React, { useState } from 'react';
import {
  Sparkle, X, ArrowClockwise, ImageSquare, Tag, WarningCircle,
  CheckCircle, PencilSimple, Package, Plus, TrashSimple, Swatches
} from '@phosphor-icons/react';
import { generateProductListing } from '../services/catalogAgent';
import { createProduct } from '../services/supabaseData';
import { Product, ProductVariation, Availability } from '../types';

type VariationRow = { name: string; addOn: string; imageUrl: string };
type VariationType = ProductVariation['type'];

interface CatalogAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories: string[];
  onCreated: (product: Product) => void;
}

const inputBase =
  'w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors';
const labelBase = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2';

const CatalogAgentPanel: React.FC<CatalogAgentPanelProps> = ({
  isOpen, onClose, existingCategories, onCreated
}) => {
  // Inputs the admin provides
  const [note, setNote] = useState('');
  const [availability, setAvailability] = useState<Availability>(Availability.LOCAL);
  const [priceKES, setPriceKES] = useState('');
  const [discountKES, setDiscountKES] = useState('');
  const [stockCount, setStockCount] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [productLink, setProductLink] = useState('');

  const isLocal = availability === Availability.LOCAL;

  // Agent output (editable before saving) — availability is the admin's own toggle, not here
  const [draft, setDraft] = useState<{
    name: string; description: string; category: string;
    shippingDuration: string; seoKeywords: string[];
  } | null>(null);

  // Designs / variations (edited in the preview stage)
  const [variationType, setVariationType] = useState<VariationType>('Design');
  const [variations, setVariations] = useState<VariationRow[]>([]);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseImages = () =>
    imagesText.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);

  const handleGenerate = async () => {
    setError(null);
    if (!note.trim()) { setError('Add a short note about the product first.'); return; }
    setGenerating(true);
    const res = await generateProductListing({
      note: note.trim(),
      priceKES: priceKES ? parseInt(priceKES) : undefined,
      imageUrls: parseImages(),
      productLink: productLink.trim() || undefined,
      categories: existingCategories,
      availability: isLocal ? 'Available Locally' : 'Import on Order'
    });
    setGenerating(false);
    if (!res.success || !res.product) {
      setError(res.error || 'The catalog agent could not generate a listing.');
      return;
    }
    setDraft({
      name: res.product.name,
      description: res.product.description,
      category: res.product.category,
      shippingDuration: res.product.shippingDuration,
      seoKeywords: res.product.seoKeywords || []
    });

    // Pre-fill designs the agent detected in the note; admin can edit/add/remove.
    const images = parseImages();
    const suggested = res.product.variations || [];
    if (suggested.length) {
      setVariationType((res.product.variationType as VariationType) || 'Design');
      setVariations(
        suggested.map((name, i) => ({ name, addOn: '', imageUrl: images[i] || '' }))
      );
    }
  };

  const addVariationRow = () =>
    setVariations([...variations, { name: '', addOn: '', imageUrl: '' }]);
  const updateVariationRow = (i: number, patch: Partial<VariationRow>) =>
    setVariations(variations.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeVariationRow = (i: number) =>
    setVariations(variations.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    setSaving(true);
    const builtVariations: ProductVariation[] = variations
      .filter(v => v.name.trim())
      .map(v => ({
        type: variationType,
        name: v.name.trim(),
        priceKES: v.addOn ? parseInt(v.addOn) : 0,
        imageUrl: v.imageUrl || undefined
      }));

    const productData: Partial<Product> = {
      name: draft.name,
      priceKES: priceKES ? parseInt(priceKES) : 0,
      discountPriceKES: discountKES ? parseInt(discountKES) : undefined,
      imageUrls: parseImages(),
      availability,
      shippingDuration: draft.shippingDuration,
      description: draft.description,
      category: draft.category,
      stockCount: isLocal && stockCount ? parseInt(stockCount) : 0,
      variations: builtVariations
    };
    const result = await createProduct(productData);
    setSaving(false);
    if (result.success && result.id) {
      onCreated({
        id: result.id,
        name: productData.name || '',
        priceKES: productData.priceKES || 0,
        discountPriceKES: productData.discountPriceKES,
        imageUrls: productData.imageUrls || [],
        variations: builtVariations,
        availability: productData.availability || Availability.IMPORT,
        shippingDuration: productData.shippingDuration || '',
        description: productData.description || '',
        category: productData.category || '',
        stockCount: productData.stockCount || 0
      });
      resetAll();
      onClose();
    } else {
      setError(result.error?.message || 'Failed to save the product. Check the console.');
    }
  };

  const resetAll = () => {
    setNote(''); setAvailability(Availability.LOCAL); setPriceKES(''); setDiscountKES('');
    setStockCount(''); setImagesText(''); setProductLink(''); setDraft(null); setError(null);
    setVariationType('Design'); setVariations([]);
  };

  const imageCount = parseImages().length;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-2xl my-8 bg-brand-bg rounded-[1.75rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="relative bg-[#0f1a1c] text-white px-7 py-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#3D8593]/20 rounded-full -mr-16 -mt-16 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]">
                <Sparkle size={22} weight="fill" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">AI Product Writer</h2>
                <p className="text-[11px] text-white/50 font-medium">Paste the basics — it writes the listing</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-7 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3" role="alert">
              <WarningCircle size={20} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {!draft ? (
            /* ---------- INPUT STAGE ---------- */
            <>
              {/* In stock vs import — the admin's explicit choice */}
              <div>
                <span className={labelBase}>Is this in stock, or imported on order? *</span>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Stock status">
                  <button
                    type="button" role="radio" aria-checked={isLocal}
                    onClick={() => setAvailability(Availability.LOCAL)}
                    className={`px-4 py-3.5 rounded-2xl text-left transition-all border ${isLocal
                      ? 'border-[#3D8593] bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-[#3D8593]/40'}`}
                  >
                    <span className={`block text-sm font-black ${isLocal ? 'text-[#3D8593]' : 'text-gray-700'}`}>In Stock</span>
                    <span className="block text-[10px] text-gray-400 font-medium mt-0.5">Held locally · ready now</span>
                  </button>
                  <button
                    type="button" role="radio" aria-checked={!isLocal}
                    onClick={() => setAvailability(Availability.IMPORT)}
                    className={`px-4 py-3.5 rounded-2xl text-left transition-all border ${!isLocal
                      ? 'border-[#FF9900] bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-[#FF9900]/40'}`}
                  >
                    <span className={`block text-sm font-black ${!isLocal ? 'text-[#FF9900]' : 'text-gray-700'}`}>Import on Order</span>
                    <span className="block text-[10px] text-gray-400 font-medium mt-0.5">Sourced abroad when ordered</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="ai-note" className={labelBase}>
                  Product details * <span className="text-gray-300">— paste the name + features, any format</span>
                </label>
                <textarea
                  id="ai-note" rows={4}
                  placeholder="Paste everything: name, specs, features… e.g. Samsung 34&quot; curved gaming monitor, 165Hz, 1ms, HDMI+DP, from Amazon US"
                  className={`${inputBase} resize-none`}
                  value={note} onChange={e => setNote(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ai-price" className={labelBase}>Price (KES)</label>
                  <input id="ai-price" type="number" inputMode="numeric" min="0" placeholder="0"
                    className={inputBase} value={priceKES} onChange={e => setPriceKES(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ai-discount" className={labelBase}>Discount price <span className="text-gray-300">(optional)</span></label>
                  <input id="ai-discount" type="number" inputMode="numeric" min="0" placeholder="—"
                    className={inputBase} value={discountKES} onChange={e => setDiscountKES(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Stock count only matters when the item is actually in stock */}
                {isLocal ? (
                  <div>
                    <label htmlFor="ai-stock" className={labelBase}>Stock count</label>
                    <input id="ai-stock" type="number" inputMode="numeric" min="0" placeholder="0"
                      className={inputBase} value={stockCount} onChange={e => setStockCount(e.target.value)} />
                  </div>
                ) : (
                  <div className="flex flex-col justify-end pb-1">
                    <p className="text-[11px] text-gray-400 font-medium leading-snug">
                      Stock count isn't needed for imports — it's sourced per order.
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="ai-link" className={labelBase}>Source link <span className="text-gray-300">(optional)</span></label>
                  <input id="ai-link" type="url" placeholder="https://…"
                    className={inputBase} value={productLink} onChange={e => setProductLink(e.target.value)} />
                </div>
              </div>

              <div>
                <label htmlFor="ai-images" className={labelBase}>
                  Image links <span className="text-gray-300">(one per line or comma-separated)</span>
                </label>
                <textarea
                  id="ai-images" rows={2}
                  placeholder="https://res.cloudinary.com/…/img1.jpg"
                  className={`${inputBase} resize-none font-mono text-xs`}
                  value={imagesText} onChange={e => setImagesText(e.target.value)}
                />
                {imageCount > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#3D8593]">
                    <ImageSquare size={14} weight="fill" /> {imageCount} image{imageCount > 1 ? 's' : ''} attached
                  </p>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !note.trim()}
                className="btn-vibrant-teal w-full py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating
                  ? (<><ArrowClockwise size={16} weight="bold" className="animate-spin" /> Writing listing…</>)
                  : (<><Sparkle size={16} weight="fill" /> Generate Listing</>)}
              </button>
            </>
          ) : (
            /* ---------- PREVIEW / EDIT STAGE ---------- */
            <>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#3D8593]">
                <PencilSimple size={14} weight="fill" /> Review &amp; edit before saving
              </div>

              <div>
                <label htmlFor="d-name" className={labelBase}>Title</label>
                <input id="d-name" className={inputBase} value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })} />
              </div>

              <div>
                <label htmlFor="d-desc" className={labelBase}>Description</label>
                <textarea id="d-desc" rows={6} className={`${inputBase} resize-none leading-relaxed`}
                  value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="d-cat" className={labelBase}>Category</label>
                  <input id="d-cat" list="existing-cats" className={inputBase} value={draft.category}
                    onChange={e => setDraft({ ...draft, category: e.target.value })} />
                  <datalist id="existing-cats">
                    {existingCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="d-avail" className={labelBase}>Availability</label>
                  <select id="d-avail" className={inputBase} value={availability}
                    onChange={e => setAvailability(e.target.value as Availability)}>
                    <option value={Availability.IMPORT}>Import on Order</option>
                    <option value={Availability.LOCAL}>Available Locally</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="d-ship" className={labelBase}>Delivery estimate</label>
                <input id="d-ship" className={inputBase} value={draft.shippingDuration}
                  onChange={e => setDraft({ ...draft, shippingDuration: e.target.value })} />
              </div>

              {draft.seoKeywords.length > 0 && (
                <div>
                  <span className={labelBase}>SEO keywords</span>
                  <div className="flex flex-wrap gap-2">
                    {draft.seoKeywords.map((k, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-[#3D8593] text-[11px] font-bold">
                        <Tag size={12} weight="fill" /> {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Designs / variations */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
                    <Swatches size={15} weight="duotone" className="text-[#3D8593]" /> Designs &amp; Variations
                  </span>
                  <select
                    aria-label="Variation type"
                    className="bg-brand-bg border border-gray-200 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-600 outline-none focus:border-[#3D8593]"
                    value={variationType}
                    onChange={e => setVariationType(e.target.value as VariationType)}
                  >
                    {(['Design', 'Color', 'Size', 'Bundle', 'Capacity'] as VariationType[]).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {variations.length === 0 ? (
                  <p className="text-[12px] text-gray-400 font-medium mb-3">
                    No variations — the item has one version. Add designs if buyers choose between options.
                  </p>
                ) : (
                  <div className="space-y-2.5 mb-3">
                    {variations.map((v, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input
                          placeholder={`${variationType} name (e.g. Floral)`}
                          className="flex-1 min-w-[8rem] bg-brand-bg border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-[#3D8593]"
                          value={v.name}
                          onChange={e => updateVariationRow(i, { name: e.target.value })}
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">+KES</span>
                          <input
                            type="number" inputMode="numeric" min="0" placeholder="0"
                            title="Extra cost for this option (hidden from customer as a +)"
                            className="w-full bg-brand-bg border border-gray-200 rounded-xl pl-11 pr-2 py-2.5 text-sm font-medium outline-none focus:border-[#3D8593]"
                            value={v.addOn}
                            onChange={e => updateVariationRow(i, { addOn: e.target.value })}
                          />
                        </div>
                        <select
                          aria-label={`Image for ${v.name || 'variation'}`}
                          className="w-32 bg-brand-bg border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs font-medium text-gray-600 outline-none focus:border-[#3D8593]"
                          value={v.imageUrl}
                          onChange={e => updateVariationRow(i, { imageUrl: e.target.value })}
                        >
                          <option value="">No image</option>
                          {parseImages().map((url, idx) => (
                            <option key={url} value={url}>Image {idx + 1}</option>
                          ))}
                        </select>
                        <button
                          type="button" onClick={() => removeVariationRow(i)}
                          aria-label="Remove variation"
                          className="w-9 h-9 shrink-0 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          <TrashSimple size={15} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button" onClick={addVariationRow}
                  className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#3D8593] hover:gap-3 transition-all"
                >
                  <Plus size={14} weight="bold" /> Add {variationType.toLowerCase()}
                </button>
                {variations.some(v => v.addOn && parseInt(v.addOn) > 0) && (
                  <p className="mt-3 text-[11px] text-gray-400 font-medium">
                    +KES add-ons are folded into that option's price — customers see the final amount, never a "+".
                  </p>
                )}
              </div>

              {/* summary of pass-through fields */}
              <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                <span className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${isLocal ? 'bg-teal-50 text-[#3D8593]' : 'bg-orange-50 text-[#FF9900]'}`}>
                  {isLocal ? 'In Stock' : 'Import on Order'}
                </span>
                {priceKES && <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200">KES {parseInt(priceKES).toLocaleString()}</span>}
                {isLocal && <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 inline-flex items-center gap-1.5"><Package size={12} weight="fill" /> {stockCount || 0} in stock</span>}
                <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 inline-flex items-center gap-1.5"><ImageSquare size={12} weight="fill" /> {imageCount} images</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setDraft(null)}
                  className="px-6 py-4 rounded-full font-black uppercase text-[11px] tracking-widest text-gray-500 border border-gray-200 hover:bg-white transition-colors">
                  ← Edit inputs
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 btn-vibrant-teal py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2.5 disabled:opacity-40">
                  {saving
                    ? (<><ArrowClockwise size={16} weight="bold" className="animate-spin" /> Saving…</>)
                    : (<><CheckCircle size={16} weight="fill" /> Create Product</>)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogAgentPanel;
