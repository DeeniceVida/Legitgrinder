import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, TrendingUp, Plus, RefreshCcw, Zap,
  Settings, ShieldAlert, Calendar as CalendarIcon, Clock, Box, Tag, Smartphone, CheckCircle2,
  Search, ShieldCheck, Link as LinkIcon, Image as ImageIcon, Trash2, Edit3, Save, ExternalLink,
  FileText, Printer, ChevronRight, X, ChevronLeft, ArrowUp, ArrowDown, PieChart, PenTool,
  DollarSign, CreditCard, MessageCircle
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import InvoiceGenerator from '../components/InvoiceGenerator';
import { Product, Variant, Origin, Order, OrderStatus, ShippingMode, ProductVariant } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Analytics
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    monthlyTrend: 0,
    pendingConsultations: 0,
    pageViews: 16431, // Mock
    visitors: 6225 // Mock
  });

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders' || activeTab === 'invoices') fetchOrders();
    if (activeTab === 'customers') fetchConsultations();
    if (activeTab === 'pricelist') fetchPricelist();
    if (activeTab === 'content') fetchBlogs();
  }, [activeTab]);

  // Fetchers
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id');
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
    // Real calculation would go here
    const { count: pending } = await supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval');
    setAnalytics(prev => ({ ...prev, pendingConsultations: pending || 0 }));
  };

  // Actions
  const handleBlogSubmit = async (formData: any) => {
    if (editingBlog) {
      await supabase.from('blogs').update(formData).eq('id', editingBlog.id);
    } else {
      await supabase.from('blogs').insert(formData);
    }
    fetchBlogs();
    setShowBlogModal(false);
    setEditingBlog(null);
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm('Delete this blog?')) {
      await supabase.from('blogs').delete().eq('id', id);
      fetchBlogs();
    }
  };

  // Consultation Logic
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
    <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col fixed h-screen z-10">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-[#FF9900] p-2 rounded-lg text-white">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight">AdminHub</span>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto pb-4">
        <div>
          <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2">Main</p>
          <div className="space-y-1">
            <SidebarItem id="dashboard" icon={<PieChart />} label="Dashboard" />
            <SidebarItem id="orders" icon={<ShoppingBag />} label="Orders" badge={orders.filter(o => o.status !== 'Delivered').length} />
            <SidebarItem id="products" icon={<Box />} label="Products" />
            <SidebarItem id="customers" icon={<Users />} label="Customers" />
            <SidebarItem id="pricelist" icon={<RefreshCcw />} label="Scraper Manager" />
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2">Content</p>
          <div className="space-y-1">
            <SidebarItem id="content" icon={<PenTool />} label="Blog Posts" />
            <SidebarItem id="store" icon={<Smartphone />} label="Online Store" />
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-2">Finances</p>
          <div className="space-y-1">
            <SidebarItem id="invoices" icon={<FileText />} label="Invoices" />
            <SidebarItem id="transactions" icon={<CreditCard />} label="Transactions" />
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl w-full font-bold transition-all"
        >
          <Settings className="w-5 h-5" /> Log Out
        </button>
      </div>
    </aside>
  );

  const SidebarItem = ({ id, icon, label, badge }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-[#FF9900] text-white shadow-lg shadow-orange-200' : 'text-neutral-500 hover:bg-neutral-50'
        }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { size: 18 })}
        <span>{label}</span>
      </div>
      {badge > 0 && (
        <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-orange-100 text-[#FF9900]'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Page Views" value={analytics.pageViews.toLocaleString()} trend="+15.5%" icon={<EyeBox />} color="blue" />
        <StatCard title="Visitors" value={analytics.visitors.toLocaleString()} trend="+8.4%" icon={<Users />} color="green" />
        <StatCard title="Total Orders" value={orders.length.toString()} trend="+4.4%" icon={<ShoppingBag />} color="orange" />
        <StatCard title="Pending Consults" value={analytics.pendingConsultations.toString()} trend="Action Req" icon={<MessageCircle />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-xl">Total Profit</h3>
            <select className="bg-neutral-50 border-none rounded-lg text-xs font-bold py-2 px-3"><option>Last 30 Days</option></select>
          </div>
          <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-2xl text-neutral-400 font-bold">
            Analytics Chart Placeholder
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 shadow-sm">
          <h3 className="font-bold text-xl mb-6">Most Active Day</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {/* Mock bars */}
            {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
              <div key={i} className={`w-full rounded-t-xl transition-all hover:opacity-80 ${h === 90 ? 'bg-[#FF9900]' : 'bg-neutral-100'}`} style={{ height: `${h}%` }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs font-bold text-neutral-400">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ConsultationManager = () => (
    <div className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden animate-in fade-in">
      <div className="p-8 border-b border-neutral-100">
        <h2 className="text-2xl font-bold">Consultation Requests</h2>
      </div>
      <table className="w-full text-left">
        <thead className="bg-neutral-50">
          <tr>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Client</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Requested Date</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Status</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {consultations.map(c => (
            <tr key={c.id} className="hover:bg-neutral-50">
              <td className="p-6">
                <div className="font-bold">{c.client_name}</div>
                <div className="text-xs text-neutral-400">{c.client_phone}</div>
              </td>
              <td className="p-6 font-medium">{new Date(c.requested_date).toLocaleString()}</td>
              <td className="p-6">
                <StatusBadge status={c.status} />
              </td>
              <td className="p-6">
                {c.status === 'pending_approval' && (
                  <button onClick={() => handleConsultationAction(c, 'confirm')} className="bg-[#FF9900] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-600">
                    <MessageCircle className="w-4 h-4" /> Confirm & WhatsApp
                  </button>
                )}
                {c.status === 'confirmed_waiting_payment' && (
                  <button onClick={() => handleConsultationAction(c, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4" /> Confirm Payment
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const BlogManager = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Blog Management</h2>
        <button onClick={() => { setEditingBlog(null); setShowBlogModal(true); }} className="bg-[#FF9900] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map(blog => (
          <div key={blog.id} className="bg-white rounded-[2rem] p-6 border border-neutral-100 hover:shadow-lg transition-all">
            <div className="h-40 bg-neutral-100 rounded-xl mb-4 overflow-hidden">
              {blog.image_url ? <img src={blog.image_url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="text-neutral-300" /></div>}
            </div>
            <h3 className="font-bold text-lg mb-2 line-clamp-1">{blog.title}</h3>
            <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{blog.excerpt}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditingBlog(blog); setShowBlogModal(true); }} className="flex-1 py-2 bg-neutral-50 rounded-lg text-xs font-bold hover:bg-neutral-100">Edit</button>
              <button onClick={() => handleDeleteBlog(blog.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showBlogModal && (
        <BlogModal blog={editingBlog} onClose={() => setShowBlogModal(false)} onSubmit={handleBlogSubmit} />
      )}
    </div>
  );

  const InvoiceManager = () => (
    <div className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden animate-in fade-in">
      <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoices & Orders</h2>
        <div className="flex gap-2">
          <button className="p-2 border border-neutral-200 rounded-lg"><Printer className="w-5 h-5" /></button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="bg-neutral-50">
          <tr>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Order ID</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Customer</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Amount</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Status</th>
            <th className="p-6 text-xs font-black uppercase text-neutral-400">Invoice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {orders.map(order => (
            <tr key={order.id} className="hover:bg-neutral-50">
              <td className="p-6 font-mono text-xs font-bold">{order.id.slice(0, 8)}...</td>
              <td className="p-6 font-bold">{order.client_name}</td>
              <td className="p-6 font-bold text-[#FF9900]">KES {order.total_cost_kes?.toLocaleString()}</td>
              <td className="p-6"><StatusBadge status={order.status} /></td>
              <td className="p-6">
                <InvoiceGenerator order={order} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />
      <main className="ml-64 flex-1 p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold capitalize">{activeTab}</h1>
            <p className="text-neutral-400">Welcome back, Admin</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-neutral-100">
              <CalendarIcon className="w-5 h-5 text-neutral-400" />
            </div>
            <button className="bg-[#FF9900] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-200">
              Export Report
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'customers' && <ConsultationManager />}
        {activeTab === 'content' && <BlogManager />}
        {activeTab === 'invoices' && <InvoiceManager />}
        {activeTab === 'orders' && <InvoiceManager />} {/* Reusing table for now */}
        {/* Placeholder for other tabs if selected */}
        {(['products', 'pricelist', 'store', 'transactions'].includes(activeTab)) && <div className="text-center py-20 text-neutral-400 font-bold">Module Loading...</div>}
      </main>
    </div>
  );
};

// Utilities
const StatCard = ({ title, value, trend, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-black text-neutral-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-500`}>
        {icon}
      </div>
    </div>
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-${color === 'red' ? 'red' : 'green'}-50 text-${color === 'red' ? 'red' : 'green'}-600`}>
      {trend}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    'pending_approval': 'bg-amber-100 text-amber-700',
    'confirmed_waiting_payment': 'bg-blue-100 text-blue-700',
    'scheduled': 'bg-green-100 text-green-700',
    'Delivered': 'bg-green-100 text-green-700',
    'SHIPPING': 'bg-purple-100 text-purple-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-neutral-100 text-neutral-500'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

// Icons helper
const EyeBox = () => <div className="w-5 h-5 border-2 border-blue-500 rounded-md"></div>;

// Blog Modal
const BlogModal = ({ blog, onClose, onSubmit }: any) => {
  const [formData, setFormData] = useState({
    title: blog?.title || '',
    excerpt: blog?.excerpt || '',
    content: blog?.content || '',
    image_url: blog?.image_url || ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] p-8">
        <h2 className="text-2xl font-bold mb-6">{blog ? 'Edit Post' : 'New Blog Post'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-4 bg-neutral-50 rounded-xl outline-none font-bold" required />
          <input type="text" placeholder="Short Excerpt" value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} className="w-full p-4 bg-neutral-50 rounded-xl outline-none" required />
          <input type="text" placeholder="Image URL (Unsplash etc.)" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} className="w-full p-4 bg-neutral-50 rounded-xl outline-none" />
          <textarea placeholder="Content..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full p-4 bg-neutral-50 rounded-xl outline-none h-40 resize-none" required />
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 rounded-xl font-bold">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-[#FF9900] text-white rounded-xl font-bold">Save Post</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
