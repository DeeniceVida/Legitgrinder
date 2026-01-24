import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, TrendingUp, Plus, RefreshCcw, Zap,
  Settings, ShieldAlert, Calendar as CalendarIcon, Clock, Box, Tag, Smartphone, CheckCircle2,
  Search, ShieldCheck, Link as LinkIcon, Image as ImageIcon, Trash2, Edit3, Save, ExternalLink,
  FileText, Printer, ChevronRight, X, ChevronLeft, ArrowUp, ArrowDown, PieChart, PenTool,
  DollarSign, CreditCard, MessageCircle, Mail, ArrowRight
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import InvoiceGenerator from '../components/InvoiceGenerator';
import { Product, Variant, Origin, Order, OrderStatus, ShippingMode, ProductVariant } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data States
  const [pricelist, setPricelist] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState({
    totalRevenue: 2450000,
    activeOrders: 12,
    pendingConsultations: 3,
    pageViews: 16431,
    visitors: 6225
  });

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders' || activeTab === 'invoices') fetchOrders();
    if (activeTab === 'consultation') fetchConsultations();
    if (activeTab === 'pricelist') fetchPricelist();
    if (activeTab === 'content') fetchBlogs();
  }, [activeTab]);

  // Fetchers
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data as any);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const fetchConsultations = async () => {
    const { data } = await supabase.from('consultations').select('*').order('created_at', { ascending: false });
    if (data) setConsultations(data);
  };

  const fetchPricelist = async () => {
    const { data } = await supabase.from('product_variants').select(`*, products(name, series, brand)`).order('id');
    if (data) setPricelist(data);
  };

  const fetchBlogs = async () => {
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    if (data) setBlogs(data);
  };

  const fetchAnalytics = async () => {
    const { count: pending } = await supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval');
    setAnalytics(prev => ({ ...prev, pendingConsultations: pending || 0 }));
  };

  // Actions
  const handleProductSubmit = async (formData: any) => {
    if (editingProduct) {
      await supabase.from('products').update(formData).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert(formData);
    }
    fetchProducts();
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Delete this product?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  // OTHER ACTIONS (RESTORED)...
  const handleConsultationAction = async (booking: any, action: 'confirm' | 'approve') => {
    if (action === 'confirm') {
      const message = `Hello ${booking.client_name}, your consultation request for ${new Date(booking.requested_date).toLocaleString()} has been confirmed. Please pay the consultation fee to secure your slot. M-PESA Paybill: 123456, Account: CONSULT.`;
      const whatsappUrl = `https://wa.me/${booking.client_phone}?text=${encodeURIComponent(message)}`;
      await supabase.from('consultations').update({ status: 'confirmed_waiting_payment' }).eq('id', booking.id);
      window.open(whatsappUrl, '_blank');
    } else if (action === 'approve') {
      await supabase.from('consultations').update({ status: 'scheduled', payment_status: 'paid' }).eq('id', booking.id);
    }
    fetchConsultations();
  };

  // --- UI COMPONENTS ---

  const Sidebar = () => (
    <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col fixed h-screen z-20">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-[#FF9900] p-2 rounded-lg text-white">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tighter">LegitHub.</span>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto pb-4">
        <div>
          <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2">Operations</p>
          <div className="space-y-1">
            <SidebarItem id="dashboard" icon={<PieChart />} label="Dashboard" />
            <SidebarItem id="orders" icon={<ShoppingBag />} label="Orders" badge={orders.filter(o => o.status !== 'Delivered').length} />
            <SidebarItem id="products" icon={<Box />} label="Shop Items" />
            <SidebarItem id="pricelist" icon={<RefreshCcw />} label="Price Scraper" />
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2">Marketing</p>
          <div className="space-y-1">
            <SidebarItem id="marketing" icon={<Mail />} label="Emailing" />
            <SidebarItem id="customers" icon={<Users />} label="CRM" />
            <SidebarItem id="consultation" icon={<MessageCircle />} label="Bookings" badge={analytics.pendingConsultations} />
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl w-full font-bold transition-all text-xs"
        >
          <Settings className="w-4 h-4" /> Log Out
        </button>
      </div>
    </aside>
  );

  const SidebarItem = ({ id, icon, label, badge }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === id ? 'bg-[#3B8392] text-white shadow-xl shadow-[#3B8392]/20' : 'text-neutral-500 hover:bg-neutral-50'
        }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { size: 16 })}
        <span>{label}</span>
      </div>
      {badge > 0 && (
        <span className={`px-2 py-0.5 rounded-md text-[9px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-[#FF9900] text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Revenue" value={`KES ${(analytics.totalRevenue / 1000000).toFixed(1)}M`} trend="+12%" icon={<DollarSign />} color="blue" />
        <StatCard title="Visitors" value={analytics.visitors.toLocaleString()} trend="+8.4%" icon={<Users />} color="green" />
        <StatCard title="Active Orders" value={orders.length.toString()} trend="Live" icon={<Box />} color="orange" />
        <StatCard title="Consultations" value={analytics.pendingConsultations.toString()} trend="Pending" icon={<MessageCircle />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-10 border border-neutral-100 shadow-sm">
          <h3 className="font-bold text-xl mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between items-center border-b border-neutral-50 pb-4">
                <div>
                  <p className="font-bold text-sm">{o.client_name}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{o.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#FF9900] text-sm">KES {o.total_cost_kes?.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-400 capitalize">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#3B8392] rounded-[2.5rem] p-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">Worker Status</h3>
            <p className="text-[#FDFDFD]/70 mb-8 font-light max-w-xs">The price scraper is currently monitoring 42 items from Back Market and eBay.</p>
            <button
              onClick={() => setActiveTab('pricelist')}
              className="bg-white text-[#3B8392] px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              Manage Scraper <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <Zap className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
        </div>
      </div>
    </div>
  );

  const PricelistManager = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-neutral-100">
        <div>
          <h2 className="text-2xl font-bold mb-1">Scraper & Trends</h2>
          <p className="text-xs text-neutral-400 tracking-wider font-medium uppercase">Back Market + eBay Live Bridge</p>
        </div>
        <div className="bg-[#3B8392]/10 text-[#3B8392] px-4 py-2 rounded-lg text-xs font-bold border border-[#3B8392]/20">Worker Status: Active</div>
      </div>
      <div className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Variant</th>
              <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Manual (KES)</th>
              <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Source URL</th>
              <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 text-sm">
            {pricelist.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50/50 group">
                <td className="p-6">
                  <div className="font-bold">{(item as any).products?.name}</div>
                  <div className="text-[10px] text-neutral-400 uppercase font-black">{item.capacity}</div>
                </td>
                <td className="p-6">
                  <input
                    type="number"
                    id={`price-${item.id}`}
                    defaultValue={item.price_kes || 0}
                    className="bg-neutral-50 border border-neutral-100 p-2 rounded-lg w-28 text-sm outline-none focus:border-[#FF9900]"
                  />
                </td>
                <td className="p-6">
                  <input
                    type="text"
                    id={`url-${item.id}`}
                    defaultValue={item.source_url || ''}
                    placeholder="Paste BackMarket Link"
                    className="bg-neutral-50 border border-neutral-100 p-2 rounded-lg w-full text-xs outline-none focus:border-[#3B8392]"
                  />
                </td>
                <td className="p-6 text-right">
                  <button
                    onClick={async () => {
                      const priceInput = document.getElementById(`price-${item.id}`) as HTMLInputElement;
                      const urlInput = document.getElementById(`url-${item.id}`) as HTMLInputElement;
                      const { error } = await supabase.from('product_variants').update({
                        price_kes: Number(priceInput.value),
                        source_url: urlInput.value,
                        previous_price_kes: item.price_kes
                      }).eq('id', item.id);
                      if (!error) {
                        alert('Updated successfully!');
                        fetchPricelist();
                      }
                    }}
                    className="p-3 bg-[#3B8392]/10 text-[#3B8392] rounded-xl hover:bg-[#3B8392] hover:text-white transition-all"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ShopManager = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-neutral-400 text-sm mt-1">Manage what shows up on your online shop.</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="bg-[#FF9900] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-orange-100">
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 hover:shadow-2xl transition-all duration-700 group">
            <div className="aspect-[4/3] relative">
              <img src={p.image || 'https://picsum.photos/400/300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.stockStatus === 'In Stock' ? 'bg-[#3B8392] text-white' : 'bg-white text-black'}`}>
                {p.stockStatus}
              </div>
            </div>
            <div className="p-8">
              <h3 className="font-bold text-xl mb-1 line-clamp-1">{p.name}</h3>
              <p className="text-neutral-400 text-xs uppercase tracking-widest font-black mb-6">{p.category}</p>
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-[#FF9900]">KES {p.priceKES?.toLocaleString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showProductModal && <ProductModal product={editingProduct} onClose={() => setShowProductModal(false)} onSubmit={handleProductSubmit} />}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <Sidebar />
      <main className="ml-64 flex-1 p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h1>
            <p className="text-neutral-400 text-sm mt-1">LegitGrinder Logistics Portal</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-sm">Main Admin</p>
              <p className="text-[10px] text-[#3B8392] font-black uppercase tracking-widest">Overseer Role</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200"></div>
          </div>
        </header>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'products' && <ShopManager />}
        {activeTab === 'pricelist' && <PricelistManager />}
        {/* Placeholder for others... */}
        {(activeTab === 'marketing' || activeTab === 'customers' || activeTab === 'consultation' || activeTab === 'content') && (
          <div className="p-20 text-center text-neutral-300 font-light italic">Tab Content Loaded via Overwrite...</div>
        )}
      </main>
    </div>
  );
};

const ProductModal: React.FC<{ product: Product | null; onClose: () => void; onSubmit: (data: any) => void }> = ({ product, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    priceKES: product?.priceKES || 0,
    category: product?.category || 'Electronics & Gadgets',
    stockStatus: product?.stockStatus || 'In Stock',
    image: product?.image || '',
    images: (product as any)?.images || [],
    description: product?.description || '',
    shop_variants: (product as any)?.shop_variants || [],
    origin: product?.origin || Origin.USA
  });

  const [newImg, setNewImg] = useState('');
  const [newVar, setNewVar] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold">{product ? 'Update Inventory' : 'New Shop Listing'}</h2>
            <p className="text-neutral-400 text-sm mt-1">Define variations, gallery, and market status.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-neutral-100 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Main Information</label>
                <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="modal-input" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Price (KES)" value={formData.priceKES} onChange={(e) => setFormData({ ...formData, priceKES: Number(e.target.value) })} className="modal-input" required />
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="modal-input appearance-none">
                    {['Electronics & Gadgets', 'General Products', 'Machinery'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Gallery URLs (Add multi)</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {formData.images.map((img: string, i: number) => (
                    <div key={i} className="group relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-200">
                      <img src={img} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData({ ...formData, images: formData.images.filter((_: any, idx: number) => idx !== i) })} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="https://..." value={newImg} onChange={e => setNewImg(e.target.value)} className="modal-input flex-1" />
                  <button type="button" onClick={() => { if (newImg) { setFormData({ ...formData, images: [...formData.images, newImg] }); setNewImg(''); } }} className="px-4 bg-neutral-900 text-white rounded-xl font-bold text-xs uppercase">Add</button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Variation Options (Colors/Sizes)</label>
                <div className="flex gap-2 mb-2 flex-wrap min-h-[40px]">
                  {formData.shop_variants.map((v: any, i: number) => (
                    <span key={i} className="bg-[#3B8392]/10 text-[#3B8392] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      {v.name} <X className="w-3 h-3 cursor-pointer" onClick={() => setFormData({ ...formData, shop_variants: formData.shop_variants.filter((_: any, idx: number) => idx !== i) })} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Midnight Black" value={newVar} onChange={e => setNewVar(e.target.value)} className="modal-input flex-1" />
                  <button type="button" onClick={() => { if (newVar) { setFormData({ ...formData, shop_variants: [...formData.shop_variants, { name: newVar, type: 'variant' }] }); setNewVar(''); } }} className="px-4 bg-neutral-900 text-white rounded-xl font-bold text-xs uppercase">Plus</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Stock Status Toggle</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, stockStatus: 'In Stock' })} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.stockStatus === 'In Stock' ? 'border-[#3B8392] bg-[#3B8392]/10 text-[#3B8392]' : 'border-neutral-100'}`}>In Stock</button>
                  <button type="button" onClick={() => setFormData({ ...formData, stockStatus: 'Import on Order' })} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.stockStatus === 'Import on Order' ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900]' : 'border-neutral-100'}`}>Import Prep</button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-100">
            <button type="submit" className="w-full py-5 bg-neutral-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-[#FF9900] transition-all shadow-2xl active:scale-[0.98]">
              {product ? 'Commit Inventory Update' : 'Publish to Online Shop'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-input {
          width: 100%;
          padding: 1rem 1.5rem;
          background: #f9f9f9;
          border-radius: 1.25rem;
          border: 1px solid #eee;
          outline: none;
          transition: all 0.3s;
          font-weight: 500;
          font-size: 0.875rem;
        }
        .modal-input:focus {
          border-color: #FF9900;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(255,153,0,0.05);
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:translate-y-[-4px] transition-all duration-500">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-500 shadow-sm`}>{icon}</div>
      <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-neutral-50 rounded-md text-neutral-400`}>{trend}</div>
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{title}</p>
    <h3 className="text-3xl font-black text-neutral-900 tracking-tighter">{value}</h3>
  </div>
);

export default AdminDashboard;
