import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, TrendingUp, Plus, RefreshCcw, Zap,
  Settings, ShieldAlert, Calendar as CalendarIcon, Clock, Box, Tag, Smartphone, CheckCircle2,
  Search, ShieldCheck, Link as LinkIcon, Image as ImageIcon, Trash2, Edit3, Save, ExternalLink,
  FileText, Printer, ChevronRight, X, ChevronLeft, ArrowUp, ArrowDown, PieChart, PenTool,
  DollarSign, CreditCard, MessageCircle, Mail, ArrowRight, BookOpen, HelpCircle, LogOut
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import InvoiceGenerator from '../components/InvoiceGenerator';
import { Product, Origin, Order, OrderStatus, ShippingMode, ProductVariant } from '../types';

// Calendar Component for Consultancy
const ConsultancyCalendar = ({ bookings, onSelect }: { bookings: any[], onSelect: (b: any) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth(currentMonth) }, (_, i) => null);

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-neutral-50 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-neutral-50 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase text-neutral-400 py-2">{d}</div>
        ))}
        {padding.map((_, i) => <div key={`pad-${i}`} className="aspect-square"></div>)}
        {days.map(d => {
          const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          const dayBookings = bookings.filter(b => b.requested_date?.startsWith(dateStr));
          return (
            <div key={d} className="aspect-square border border-neutral-50 rounded-xl p-1 relative hover:bg-neutral-50 transition-colors cursor-pointer group">
              <span className="text-xs font-bold text-neutral-400 group-hover:text-neutral-900">{d}</span>
              {dayBookings.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#FF9900] rounded-full shadow-[0_0_10px_rgba(255,153,0,0.5)]"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data States
  const [pricelist, setPricelist] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const { data: o } = await supabase.from('orders').select('*').limit(5).order('created_at', { ascending: false });
        if (o) setOrders(o);
      }
      if (activeTab === 'products') {
        const { data: p } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (p) setProducts(p.map((item: any) => ({
          ...item,
          priceKES: item.price_kes, // Map for UI consistency
          stockStatus: item.stock_status
        })));
      }
      if (activeTab === 'orders') {
        const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (o) setOrders(o);
      }
      if (activeTab === 'invoices') {
        const { data: i } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (i) setInvoices(i);
      }
      if (activeTab === 'consultation') {
        const { data: c } = await supabase.from('consultations').select('*').order('created_at', { ascending: false });
        if (c) setConsultations(c);
      }
      if (activeTab === 'pricelist') {
        const { data: pr } = await supabase.from('product_variants').select(`*, products(name, series, brand)`).order('id');
        if (pr) setPricelist(pr);
      }
      if (activeTab === 'content') {
        const { data: b } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
        if (b) setBlogs(b);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (formData: any) => {
    // Map UI names to DB names
    const dbData = {
      name: formData.name,
      price_kes: formData.priceKES,
      category: formData.category,
      stock_status: formData.stockStatus,
      image: formData.image,
      images: formData.images,
      description: formData.description,
      shop_variants: formData.shop_variants,
      origin: formData.origin
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(dbData).eq('id', editingProduct.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('products').insert(dbData);
      if (error) alert(error.message);
    }
    fetchData();
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const clearProducts = async () => {
    if (confirm('Delete all products in shop manager? This cannot be undone.')) {
      const { error } = await supabase.from('products').delete().gt('id', 0);
      if (!error) {
        alert('All products wiped.');
        fetchData();
      } else {
        alert(error.message);
      }
    }
  };

  // UI Components
  const Sidebar = () => (
    <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-neutral-100 flex flex-col fixed h-screen z-30 transition-all duration-500`}>
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#3B8392] p-2 rounded-xl text-white shadow-lg shadow-[#3B8392]/20">
            <Zap className="w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tighter">LegitHub.</span>}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-10 overflow-y-auto pb-10 scrollbar-hide">
        {/* Operations */}
        <div>
          {isSidebarOpen && <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Operations</p>}
          <div className="space-y-1">
            <NavItem id="dashboard" icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} />
            <NavItem id="orders" icon={<ShoppingBag />} label="Orders" active={activeTab === 'orders'} />
            <NavItem id="products" icon={<Box />} label="Merchant Shop" active={activeTab === 'products'} />
            <NavItem id="pricelist" icon={<RefreshCcw />} label="Scraper Bot" active={activeTab === 'pricelist'} />
          </div>
        </div>

        {/* Marketing & CRM */}
        <div>
          {isSidebarOpen && <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Engagement</p>}
          <div className="space-y-1">
            <NavItem id="consultation" icon={<CalendarIcon />} label="Consultancy" active={activeTab === 'consultation'} />
            <NavItem id="content" icon={<PenTool />} label="Blogs & Content" active={activeTab === 'content'} />
            <NavItem id="customers" icon={<Users />} label="Customer CRM" active={activeTab === 'customers'} />
          </div>
        </div>

        {/* Finances */}
        <div>
          {isSidebarOpen && <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Finances</p>}
          <div className="space-y-1">
            <NavItem id="invoices" icon={<FileText />} label="Invoices Hub" active={activeTab === 'invoices'} />
            <NavItem id="analytics" icon={<PieChart />} label="Performance" active={activeTab === 'analytics'} />
          </div>
        </div>
      </nav>

      <div className="p-6 border-t border-neutral-50">
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
          className="flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl w-full font-bold transition-all text-xs"
        >
          <LogOut className="w-4 h-4" /> {isSidebarOpen && "Log Out"}
        </button>
      </div>
    </aside>
  );

  const NavItem = ({ id, icon, label, active }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-bold transition-all relative group ${active
        ? 'bg-[#3B8392] text-white shadow-xl shadow-[#3B8392]/20 translate-x-1'
        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
        }`}
    >
      {React.cloneElement(icon, { size: 18, className: "shrink-0" })}
      {isSidebarOpen && <span>{label}</span>}
      {!isSidebarOpen && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-neutral-900 text-white rounded-lg text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );

  // --- TAB VIEWS ---

  const DashboardView = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value="KES 4.2M" trend="24.4%" icon={<DollarSign />} color="teal" />
        <StatCard title="Page Views" value="16,431" trend="15.5%" icon={<BookOpen />} color="blue" />
        <StatCard title="Conversion" value="3.2%" trend="-2.4%" icon={<TrendingUp />} color="orange" />
        <StatCard title="Active Orders" value={orders.length.toString()} trend="+4.4%" icon={<Box />} color="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-neutral-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold">Flow Overview</h3>
            <select className="bg-neutral-50 border-none rounded-xl px-4 py-2 text-xs font-bold font-mono">
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 flex items-end gap-2 px-2">
            {[45, 67, 43, 89, 100, 78, 56, 90, 110, 80, 95, 120].map((h, i) => (
              <div key={i} className="flex-1 bg-neutral-100 rounded-t-xl relative group hover:bg-[#3B8392] transition-all duration-300" style={{ height: `${h}%` }}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">KES {h}k</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 px-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
            <span>Jan 01</span>
            <span>Jan 15</span>
            <span>Jan 30</span>
          </div>
        </div>

        <div className="bg-[#3B8392] rounded-[3rem] p-10 text-white relative overflow-hidden group">
          <Zap className="absolute -right-10 -top-10 w-48 h-48 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          <div className="relative z-10">
            <div className="bg-white/10 p-4 rounded-2xl w-fit mb-8 border border-white/10 backdrop-blur-md">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-bold mb-4 leading-tight">Content Studio</h3>
            <p className="text-white/70 mb-10 font-light leading-relaxed">Admin tools for blogs, SEO, and client resources are ready for your input.</p>
            <button onClick={() => setActiveTab('content')} className="w-full bg-white text-[#3B8392] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-neutral-900 hover:text-white transition-all">Go to Content Hub</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-10 border border-neutral-100">
        <h3 className="text-xl font-bold mb-8">Recent Orders</h3>
        <table className="w-full">
          <thead className="text-[10px] font-black uppercase text-neutral-400 tracking-widest font-mono">
            <tr className="border-b border-neutral-50">
              <th className="pb-6 text-left">Client</th>
              <th className="pb-6 text-left">Item</th>
              <th className="pb-6 text-left">Status</th>
              <th className="pb-6 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 text-sm">
            {orders.map(o => (
              <tr key={o.id} className="group hover:bg-neutral-50 transition-colors">
                <td className="py-6 font-bold">{o.client_name} <span className="block text-[10px] text-neutral-400 font-normal uppercase tracking-tighter mt-1">{o.id}</span></td>
                <td className="py-6 text-neutral-500 font-medium">{o.product_name}</td>
                <td className="py-6"><StatusBadge status={o.status || 'Pending'} /></td>
                <td className="py-6 text-right font-black text-[#3B8392]">KES {o.total_cost_kes?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ShopView = () => (
    <div className="space-y-10 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Merchant Inventory</h2>
          <p className="text-neutral-400 text-sm mt-1">Global items ready for delivery or import.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={clearProducts} className="bg-red-50 text-red-500 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Wipe All
          </button>
          <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-[3rem] overflow-hidden border border-neutral-100 group hover:shadow-2xl transition-all duration-700">
            <div className="aspect-[4/3] relative">
              <img src={p.image || 'https://picsum.photos/400/300'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.stockStatus === 'In Stock' ? 'bg-[#3B8392] text-white' : 'bg-[#FF9900] text-white'}`}>
                {p.stockStatus}
              </div>
            </div>
            <div className="p-10">
              <span className="text-[10px] font-black uppercase text-neutral-300 tracking-widest font-mono">{p.category}</span>
              <h3 className="text-xl font-bold mt-2 mb-6 line-clamp-1">{p.name}</h3>
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-[#FF9900]">KES {p.priceKES?.toLocaleString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={async () => { if (confirm('Delete?')) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showProductModal && <ProductModal product={editingProduct} onClose={() => setShowProductModal(false)} onSubmit={handleProductSubmit} />}
    </div>
  );

  const ScraperView = () => (
    <div className="space-y-10 animate-in fade-in">
      <div className="bg-white p-10 rounded-[3rem] border border-neutral-100 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Cloudflare Worker Scraper <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          </h2>
          <p className="text-neutral-400 text-sm mt-1 uppercase tracking-widest font-black text-[10px] font-mono">Market Rate Sync System</p>
        </div>
        <button onClick={fetchData} className="p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-all"><RefreshCcw className="w-5 h-5 text-neutral-400" /></button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50/50">
            <tr className="text-[10px] font-black uppercase text-neutral-400 tracking-widest font-mono border-b border-neutral-100">
              <th className="p-8 text-left">Variant Name</th>
              <th className="p-8 text-left">Override Price (KES)</th>
              <th className="p-8 text-left">Automation Link</th>
              <th className="p-8 text-right">Commit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 text-sm">
            {pricelist.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50/30 group">
                <td className="p-8">
                  <div className="font-bold text-neutral-900">{(item as any).products?.name}</div>
                  <div className="text-[10px] text-neutral-400 font-black uppercase mt-1 opacity-60 font-mono tracking-tighter">{item.capacity} | {(item as any).products?.brand}</div>
                </td>
                <td className="p-8">
                  <input id={`p-${item.id}`} type="number" defaultValue={item.price_kes || 0} className="w-32 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 font-bold text-[#3B8392] outline-none focus:bg-white focus:border-[#3B8392] focus:ring-4 focus:ring-[#3B8392]/5 transition-all" />
                </td>
                <td className="p-8">
                  <input id={`u-${item.id}`} type="text" defaultValue={item.source_url || ''} placeholder="Cloudflare Scraping Path" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:bg-white focus:border-[#3B8392]" />
                </td>
                <td className="p-8 text-right">
                  <button
                    onClick={async () => {
                      const p = (document.getElementById(`p-${item.id}`) as HTMLInputElement).value;
                      const u = (document.getElementById(`u-${item.id}`) as HTMLInputElement).value;
                      await supabase.from('product_variants').update({ price_kes: Number(p), source_url: u, previous_price_kes: item.price_kes }).eq('id', item.id);
                      alert('Sync Success');
                      fetchData();
                    }}
                    className="bg-neutral-900 text-white p-4 rounded-2xl shadow-xl hover:bg-[#3B8392] transition-all hover:scale-105"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ConsultancyView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in">
      <ConsultancyCalendar bookings={consultations} onSelect={() => { }} />

      <div className="space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm">
          <h3 className="text-xl font-bold mb-6">Pending Bookings</h3>
          <div className="space-y-4">
            {consultations.map(c => (
              <div key={c.id} className="p-6 bg-neutral-50 rounded-[2rem] border border-transparent hover:border-[#FF9900]/20 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-lg">{c.client_name}</p>
                    <p className="text-xs text-neutral-400 font-mono">{new Date(c.requested_date).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex gap-3">
                  {c.status === 'pending_approval' && (
                    <button
                      onClick={async () => {
                        const msg = encodeURIComponent(`Hello ${c.client_name}, your consultation request has been confirmed. Please secure your slot by paying KES 2,025 via M-PESA Till: 8537538 (Vision Plaza). Please reply with payment confirmation.`);
                        window.open(`https://wa.me/${c.client_phone}?text=${msg}`, '_blank');
                        await supabase.from('consultations').update({ status: 'confirmed_waiting_payment' }).eq('id', c.id);
                        fetchData();
                      }}
                      className="flex-1 bg-neutral-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#FF9900] transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" /> Confirm & WA
                    </button>
                  )}
                  {c.status === 'confirmed_waiting_payment' && (
                    <button
                      onClick={async () => {
                        await supabase.from('consultations').update({ status: 'scheduled', payment_status: 'paid' }).eq('id', c.id);
                        fetchData();
                      }}
                      className="flex-1 bg-[#3B8392] text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#3B8392]/20"
                    >
                      Approve Payment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const InvoiceView = () => (
    <div className="space-y-10 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Hub</h2>
          <p className="text-neutral-400 text-sm mt-1">Order invoices, tax labels, and generated reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-neutral-50/50">
            <tr className="text-[10px] font-black uppercase text-neutral-400 tracking-widest font-mono border-b border-neutral-100">
              <th className="p-8 text-left">Invoice ID</th>
              <th className="p-8 text-left">Recipient</th>
              <th className="p-8 text-left">Amount</th>
              <th className="p-8 text-left">Date</th>
              <th className="p-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 text-sm">
            {invoices.map(i => (
              <tr key={i.id} className="hover:bg-neutral-50/20">
                <td className="p-8 font-black text-[#3B8392]">{i.id}</td>
                <td className="p-8 font-bold">{i.client_name}</td>
                <td className="p-8 font-black">KES {i.total_amount?.toLocaleString()}</td>
                <td className="p-8 text-neutral-400">{new Date(i.created_at).toLocaleDateString()}</td>
                <td className="p-8 text-right">
                  <button className="p-3 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-all"><Printer className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="p-20 text-center text-neutral-300 italic font-light">No records found. Invoices are generated during order processing.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[#FDFDFD] min-h-screen">
      <Sidebar />
      <main className={`flex-1 ${isSidebarOpen ? 'ml-72' : 'ml-20'} p-10 lg:p-14 transition-all duration-500`}>
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white border border-neutral-100 rounded-xl shadow-sm hover:scale-105 transition-all text-neutral-400 hover:text-neutral-900">
              {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
            <h1 className="text-3xl font-black tracking-tighter text-neutral-900 capitalize font-mono">{activeTab.replace('_', ' ')}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-sm">Super Admin</p>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[#3B8392] rounded-full"></div>
                <p className="text-[9px] font-black uppercase text-neutral-400 tracking-[0.2em]">Verified Hub Mastery</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-neutral-100 rounded-[1.25rem] border border-neutral-200 relative group overflow-hidden shadow-inner">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Legit" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#3B8392]/20 border-t-[#3B8392] rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'products' && <ShopView />}
            {activeTab === 'pricelist' && <ScraperView />}
            {activeTab === 'consultation' && <ConsultancyView />}
            {activeTab === 'invoices' && <InvoiceView />}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-[3rem] p-12 border border-neutral-100 animate-in fade-in">
                <h2 className="text-2xl font-bold mb-8">Order Logistics</h2>
                <p className="text-neutral-400 font-light mb-12 italic">Order status updates and shipping label generation tools are optimized for the US/UK to Kenya route.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {orders.map(o => (
                    <div key={o.id} className="p-8 bg-neutral-50 rounded-[2.5rem] border border-transparent hover:border-[#3B8392]/20 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <span className="font-black text-blue-600 tracking-tighter text-xl">{o.id}</span>
                        <StatusBadge status={o.status || 'Pending'} />
                      </div>
                      <p className="font-bold mb-1">{o.client_name}</p>
                      <p className="text-sm text-neutral-500 mb-8">{o.product_name}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            // Generate Invoice Logic
                            const invId = `INV-${Math.floor(Math.random() * 100000)}`;
                            await supabase.from('invoices').insert({
                              id: invId,
                              order_id: o.id,
                              client_name: o.client_name,
                              total_amount: o.total_cost_kes,
                              items: [{ name: o.product_name, price: o.total_cost_kes }]
                            });
                            alert('Invoice Generated in Finanace Hub');
                          }}
                          className="flex-1 bg-white border border-neutral-100 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:border-[#3B8392] transition-all"
                        >
                          Generate Invoice
                        </button>
                        <button className="flex-1 bg-neutral-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl">Shipping Label</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'content' && (
              <div className="space-y-10 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Blog Studio</h2>
                  <button className="bg-neutral-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl"><Plus className="w-4 h-4 mr-2 inline" /> New Article</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {blogs.map(b => (
                    <div key={b.id} className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-xl leading-snug max-w-[200px]">{b.title}</h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-neutral-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                          <button className="p-2 bg-red-50 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-neutral-400 text-sm line-clamp-2 font-light mb-6">{b.excerpt}</p>
                      <StatusBadge status={b.is_published ? 'Published' : 'Draft'} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
    images: (product as any)?.images || [],
    image: product?.image || '',
    description: product?.description || '',
    shop_variants: (product as any)?.shop_variants || [],
    origin: product?.origin || Origin.USA
  });

  const [newImg, setNewImg] = useState('');
  const [newVar, setNewVar] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold">{product ? 'Edit Global Product' : 'Add New Inventory'}</h2>
            <p className="text-neutral-400 text-sm mt-1 uppercase font-black text-[10px] tracking-widest font-mono">Market Listing Configuration</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-neutral-100 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-10">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3B8392] flex items-center gap-2">
                  <Box className="w-3 h-3" /> Identity & Value
                </label>
                <input type="text" placeholder="Product Name (Real Items)" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="modal-input" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Price (KES)" value={formData.priceKES} onChange={(e) => setFormData({ ...formData, priceKES: Number(e.target.value) })} className="modal-input" required />
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="modal-input appearance-none">
                    {['Electronics & Gadgets', 'General Products', 'Machinery', 'Lifestyle', 'Business Tools'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3B8392] flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Visual Gallery
                </label>
                <div className="flex gap-3 mb-3 flex-wrap">
                  {formData.images.map((img: string, i: number) => (
                    <div key={i} className="group relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-neutral-100 shadow-sm">
                      <img src={img} className="w-full h-full object-cover" alt="" />
                      <button type="button" onClick={() => setFormData({ ...formData, images: formData.images.filter((_: any, idx: number) => idx !== i) })} className="absolute inset-0 bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-xs">RM</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add Image URL..." value={newImg} onChange={e => setNewImg(e.target.value)} className="modal-input flex-1" />
                  <button type="button" onClick={() => { if (newImg) { setFormData({ ...formData, images: [...formData.images, newImg], image: formData.image || newImg }); setNewImg(''); } }} className="px-5 bg-neutral-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-neutral-200">Push</button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3B8392] flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Variations & Colors
                </label>
                <div className="flex gap-2 mb-3 flex-wrap min-h-[46px]">
                  {formData.shop_variants.map((v: any, i: number) => (
                    <span key={i} className="bg-neutral-900 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2 shadow-xl shadow-neutral-200">
                      {v.name} <X className="w-3 h-3 cursor-pointer text-red-400" onClick={() => setFormData({ ...formData, shop_variants: formData.shop_variants.filter((_: any, idx: number) => idx !== i) })} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Navy Blue" value={newVar} onChange={e => setNewVar(e.target.value)} className="modal-input flex-1" />
                  <button type="button" onClick={() => { if (newVar) { setFormData({ ...formData, shop_variants: [...formData.shop_variants, { name: newVar, type: 'variant' }] }); setNewVar(''); } }} className="px-5 bg-[#3B8392] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-[#3B8392]/20">Tag</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3B8392] flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Supply Chain Status
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, stockStatus: 'In Stock' })} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.stockStatus === 'In Stock' ? 'border-[#3B8392] bg-[#3B8392]/5 text-[#3B8392] shadow-xl shadow-[#3B8392]/10 scale-[1.02]' : 'border-neutral-100 text-neutral-400'}`}>Local Hub</button>
                  <button type="button" onClick={() => setFormData({ ...formData, stockStatus: 'Import on Order' })} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.stockStatus === 'Import on Order' ? 'border-[#FF9900] bg-[#FF9900]/5 text-[#FF9900] shadow-xl shadow-[#FF9900]/10 scale-[1.02]' : 'border-neutral-100 text-neutral-400'}`}>Import Only</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#3B8392]">Narrative Description</label>
                <textarea placeholder="Write item details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="modal-input h-32 resize-none leading-relaxed" />
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-neutral-100 flex justify-end">
            <button type="submit" className="w-full md:w-auto md:px-20 py-5 bg-neutral-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-neutral-300 hover:bg-[#3B8392] transition-all active:scale-[0.98]">
              {product ? 'Commit Database Entry' : 'Publish Growth Inventory'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-input {
          width: 100%;
          padding: 1.25rem 1.75rem;
          background: #F8F9FA;
          border-radius: 1.5rem;
          border: 1px solid transparent;
          outline: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 600;
          font-size: 0.875rem;
          color: #1A1A1A;
        }
        .modal-input:focus {
          border-color: #3B8392;
          background: #FFF;
          box-shadow: 0 10px 40px -10px rgba(59,131,146,0.15);
          transform: translateY(-2px);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }: any) => {
  const colorMap: any = {
    teal: 'bg-[#3B8392]/10 text-[#3B8392] shadow-[#3B8392]/5',
    blue: 'bg-blue-50 text-blue-500 shadow-blue-500/5',
    orange: 'bg-[#FF9900]/10 text-[#FF9900] shadow-[#FF9900]/5',
    green: 'bg-green-50 text-green-500 shadow-green-500/5',
    red: 'bg-red-50 text-red-500 shadow-red-500/5'
  };
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm hover:translate-y-[-4px] transition-all duration-500 group">
      <div className="flex justify-between items-start mb-8">
        <div className={`p-5 rounded-2xl ${colorMap[color]} transition-transform duration-700 group-hover:scale-110`}>{icon}</div>
        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${trend.startsWith('+') ? 'bg-green-50 text-green-600' : trend.startsWith('-') ? 'bg-red-50 text-red-600' : 'bg-neutral-50 text-neutral-400'}`}>
          {trend}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300 mb-2 font-mono">{title}</p>
      <h3 className="text-3xl font-black text-neutral-900 tracking-tighter transition-colors group-hover:text-[#3B8392]">{value}</h3>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    'Published': 'bg-[#3B8392]/10 text-[#3B8392]',
    'Draft': 'bg-neutral-100 text-neutral-500',
    'Pending': 'bg-amber-100 text-amber-700',
    'pending_approval': 'bg-amber-100 text-amber-900',
    'confirmed_waiting_payment': 'bg-blue-50 text-blue-600',
    'scheduled': 'bg-green-50 text-green-600',
    'Delivered': 'bg-green-100 text-green-700',
    'Received by Agent': 'bg-[#3B8392]/10 text-[#3B8392]'
  };
  return (
    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-transparent ${styles[status] || 'bg-neutral-100 text-neutral-500'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export default AdminDashboard;
