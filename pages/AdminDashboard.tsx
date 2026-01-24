import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, TrendingUp, Plus, RefreshCcw, Zap,
  Settings, ShieldAlert, Calendar as CalendarIcon, Clock, Box, Tag, Smartphone, CheckCircle2,
  Search, ShieldCheck, Link as LinkIcon, Image as ImageIcon, Trash2, Edit3, Save, ExternalLink,
  FileText, Printer, ChevronRight, X, ChevronLeft, ArrowUp, ArrowDown
} from 'lucide-react';
import { PricelistItem, Product, Origin, Order, OrderStatus, ShippingMode, ProductVariant } from '../types';
import { PHONE_MODELS_SCHEMA, STATUS_SEQUENCE } from '../constants';
import { supabase } from '../src/lib/supabase';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'shop' | 'pricelist' | 'consultancy'>('overview');
  const [pricelist, setPricelist] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    monthlyTrend: 0,
    pendingConsultations: 0
  });

  useEffect(() => {
    if (activeTab === 'pricelist') fetchPricelist();
    if (activeTab === 'consultancy') fetchConsultations();
    if (activeTab === 'shop') fetchProducts();
    if (activeTab === 'overview') fetchAnalytics();
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const fetchPricelist = async () => {
    const { data } = await supabase
      .from('product_variants')
      .select(`*, products(name, series, brand)`)
      .order('id', { ascending: true });
    if (data) setPricelist(data);
  };

  const fetchConsultations = async () => {
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setConsultations(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (data) setProducts(data as any);
  };

  const fetchOrders = async () => {
    // Mock for now - you can create an orders table later
    setOrders([
      {
        id: 'LG-9821',
        clientName: 'Munga Kamau',
        clientPhone: '+254791873538',
        clientEmail: 'mungakamau@gmail.com',
        clientLocation: 'Westlands, Nairobi',
        productName: 'iPhone 15 Pro Max 256GB',
        buyingPriceKES: 165400,
        shippingFeeKES: 8500,
        serviceFeeKES: 4500,
        totalCostKES: 178400,
        status: OrderStatus.SHIPPING,
        mode: ShippingMode.AIR,
        origin: Origin.USA,
        datePlaced: '2024-05-12',
        isPaid: true,
        weightKg: 0.5,
        dimensions: '20x15x5 cm'
      }
    ]);
  };

  const fetchAnalytics = async () => {
    // Calculate from orders (mock for now)
    const totalRevenue = 1200000;
    const activeOrders = 8;
    const monthlyTrend = 12;

    const { count } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval');

    setAnalytics({
      totalRevenue,
      activeOrders,
      monthlyTrend,
      pendingConsultations: count || 0
    });
  };

  const updateSourceUrl = async (id: number, url: string) => {
    await supabase.from('product_variants').update({ source_url: url }).eq('id', id);
    setPricelist(prev => prev.map(p => p.id === id ? { ...p, source_url: url } : p));
  };

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

  const approveConsultation = async (id: number) => {
    await supabase
      .from('consultations')
      .update({ status: 'scheduled' })
      .eq('id', id);
    fetchConsultations();
  };

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Total Revenue</p>
          <h3 className="text-4xl font-bold text-neutral-900">KES {analytics.totalRevenue.toLocaleString()}</h3>
          <p className="text-green-500 text-xs font-bold mt-4 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" /> +{analytics.monthlyTrend}% vs last month
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Active Orders</p>
          <h3 className="text-4xl font-bold text-neutral-900">{analytics.activeOrders}</h3>
          <p className="text-neutral-400 text-xs font-bold mt-4">2 Arriving this week</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Pending Consultations</p>
          <h3 className="text-4xl font-bold text-neutral-900">{analytics.pendingConsultations}</h3>
          <p className="text-amber-500 text-xs font-bold mt-4">Action Required</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-4">Products Listed</p>
          <h3 className="text-4xl font-bold text-neutral-900">{products.length}</h3>
          <p className="text-neutral-400 text-xs font-bold mt-4">Across all categories</p>
        </div>
      </div>
    </div>
  );

  const renderShopManager = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Product Catalog</h2>
        <button
          onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
          className="bg-[#FF9900] text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-neutral-100 p-20 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-bold mb-2">No Products Yet</h3>
          <p className="text-neutral-400 mb-6">Start by adding your first product to the catalog</p>
          <button
            onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
            className="bg-[#FF9900] text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-[2rem] border border-neutral-100 p-6 hover:shadow-lg transition-all">
              <div className="aspect-square bg-neutral-100 rounded-xl mb-4 overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-neutral-300" />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <p className="text-sm text-neutral-500 mb-4">{product.category}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-xl">KES {product.priceKES?.toLocaleString() || 0}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stockStatus === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                  {product.stockStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                  className="flex-1 py-2 bg-neutral-100 rounded-lg text-xs font-bold hover:bg-neutral-200"
                >
                  <Edit3 className="w-4 h-4 inline" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 inline" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showProductModal && <ProductModal
        product={editingProduct}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleProductSubmit}
      />}
    </div>
  );

  const renderPricelistManager = () => {
    const filteredList = pricelist.filter(item =>
      (item as any).products?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Scraper Manager</h2>
            <p className="text-neutral-400 text-sm mt-1">Paste Back Market URLs to enable auto-pricing</p>
          </div>
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs font-bold">
            Worker: Active (10m)
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-4 text-left text-xs font-black uppercase text-neutral-400">Product</th>
                  <th className="p-4 text-left text-xs font-black uppercase text-neutral-400">Back Market URL</th>
                  <th className="p-4 text-left text-xs font-black uppercase text-neutral-400">Price (KES)</th>
                  <th className="p-4 text-left text-xs font-black uppercase text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="p-4">
                      <div className="font-bold">{item.products?.name}</div>
                      <div className="text-xs text-neutral-400">{item.capacity}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={item.source_url || ''}
                          onBlur={(e) => updateSourceUrl(item.id, e.target.value)}
                          placeholder="Paste URL..."
                          className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg text-sm"
                        />
                        {item.source_url && (
                          <a href={item.source_url} target="_blank" className="p-2 hover:text-[#FF9900]">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {item.price_kes ? (
                        <span className="font-bold text-green-600">KES {item.price_kes.toLocaleString()}</span>
                      ) : (
                        <span className="text-neutral-300 italic">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.source_url ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'
                        }`}>
                        {item.source_url ? 'Active' : 'Unlinked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderConsultancy = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const bookedDates = consultations.map(c => new Date(c.requested_date).getDate());

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Consultancy Calendar</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-neutral-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-lg">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-neutral-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-neutral-100 p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-neutral-400 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => (
              <div key={i} className={`aspect-square flex items-center justify-center rounded-lg ${day ? 'bg-neutral-50 hover:bg-neutral-100 cursor-pointer' : ''
                } ${bookedDates.includes(day!) ? 'bg-green-100 font-bold text-green-700' : ''}`}>
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-neutral-100 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <h3 className="font-bold text-lg">Booking Requests</h3>
          </div>
          <div className="divide-y divide-neutral-50">
            {consultations.map((booking) => (
              <div key={booking.id} className="p-6 flex justify-between items-center hover:bg-neutral-50">
                <div>
                  <p className="font-bold">{booking.client_name}</p>
                  <p className="text-sm text-neutral-500">{booking.client_email}</p>
                  <p className="text-xs text-neutral-400 mt-1">{new Date(booking.requested_date).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'scheduled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                  {booking.status === 'pending_approval' && (
                    <button
                      onClick={() => approveConsultation(booking.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-72 bg-white border-r border-neutral-100 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-10 flex items-center space-x-4">
          <div className="bg-neutral-900 p-3 rounded-[1.2rem] text-white shadow-xl">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">Admin Hub</span>
        </div>
        <nav className="flex-1 px-6 py-4 space-y-2">
          {[
            { id: 'overview', name: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'pricelist', name: 'Scraper Manager', icon: <RefreshCcw className="w-4 h-4" /> },
            { id: 'shop', name: 'Shop Manager', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'consultancy', name: 'Consultancy', icon: <CalendarIcon className="w-4 h-4" /> },
            { id: 'orders', name: 'Orders', icon: <Box className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center space-x-4 px-6 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === item.id
                ? 'bg-neutral-900 text-white shadow-2xl translate-x-2'
                : 'text-neutral-400 hover:bg-neutral-50'
                }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="w-full flex items-center space-x-4 px-6 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-50 mt-auto"
          >
            <Settings className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-10 lg:p-20 overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold capitalize">{activeTab.replace('_', ' ')}</h1>
        </header>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'shop' && renderShopManager()}
        {activeTab === 'pricelist' && renderPricelistManager()}
        {activeTab === 'consultancy' && renderConsultancy()}
        {activeTab === 'orders' && <div className="text-neutral-400">Orders view (existing code)</div>}
      </main>
    </div>
  );
};

// Product Modal Component
const ProductModal: React.FC<{ product: Product | null; onClose: () => void; onSubmit: (data: any) => void }> = ({ product, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    priceKES: product?.priceKES || 0,
    category: product?.category || 'Electronics & Gadgets',
    stockStatus: product?.stockStatus || 'In Stock',
    image: product?.image || '',
    description: product?.description || '',
    origin: product?.origin || Origin.USA
  });

  const categories = [
    'Electronics & Gadgets',
    'Home Accessories',
    'Business Suppliers',
    'Machinery & Equipment',
    'General Products'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] p-8 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600">Product Name</label>
            <input
              type="text"
              placeholder="e.g., iPhone 15 Pro, Dell Monitor, Coffee Maker"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600">Price (KES)</label>
              <input
                type="number"
                placeholder="50000"
                value={formData.priceKES}
                onChange={(e) => setFormData({ ...formData, priceKES: Number(e.target.value) })}
                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none transition-all"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600">Stock Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stockStatus: 'In Stock' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${formData.stockStatus === 'In Stock'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
              >
                ✓ In Stock
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stockStatus: 'Import on Delivery' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${formData.stockStatus === 'Import on Delivery'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
              >
                ⏳ Import on Delivery
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600">Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full p-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600">Description</label>
            <textarea
              placeholder="Brief description of the product..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 bg-neutral-50 rounded-xl h-24 border border-neutral-200 focus:border-[#FF9900] outline-none transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#FF9900] text-white rounded-xl font-bold hover:bg-orange-600 transition-all hover:scale-105 active:scale-95"
          >
            {product ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
