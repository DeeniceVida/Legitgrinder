import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, TrendingUp, RefreshCcw, Settings,
  Box, LogOut, Search, Plus, Trash2, Edit3, X, Save, Calendar as CalendarIcon,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { Product, Origin, OrderStatus, ProductVariant } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pricelist' | 'shop' | 'consultancy' | 'orders'>('overview');
  const [pricelist, setPricelist] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'pricelist') fetchPricelist();
    if (activeTab === 'shop') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'consultancy') fetchConsultations();
  };

  const fetchPricelist = async () => {
    const { data } = await supabase.from('product_variants').select(`*, products(name, series, brand)`).order('id');
    if (data) setPricelist(data);
  };

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
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-[#FF9900]/10 text-[#FF9900] rounded-xl"><ShoppingBag className="w-5 h-5" /></div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Total Products</p>
        </div>
        <p className="text-4xl font-bold">{products.length}</p>
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><RefreshCcw className="w-5 h-5" /></div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Price Variants</p>
        </div>
        <p className="text-4xl font-bold">{pricelist.length}</p>
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-green-50 text-green-500 rounded-xl"><Box className="w-5 h-5" /></div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Total Orders</p>
        </div>
        <p className="text-4xl font-bold">{orders.length}</p>
      </div>
    </div>
  );

  const renderPricelistManager = () => (
    <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-10 border-b border-neutral-100 flex justify-between items-center">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Price Override Engine</p>
        <button onClick={fetchPricelist} className="p-2 hover:bg-neutral-50 rounded-lg transition-all"><RefreshCcw className="w-4 h-4 text-neutral-400" /></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50/50">
            <tr>
              <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Device</th>
              <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Manual Price (KES)</th>
              <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Source URL</th>
              <th className="p-6 text-right text-[10px] font-black uppercase text-neutral-400 tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {pricelist.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                <td className="p-6">
                  <div className="font-bold text-neutral-900">{(item as any).products?.name}</div>
                  <div className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest font-bold bg-neutral-100 px-2 py-0.5 rounded inline-block">{item.capacity}</div>
                </td>
                <td className="p-6">
                  <input
                    type="number"
                    id={`price-${item.id}`}
                    defaultValue={item.price_kes || 0}
                    className="w-32 bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:bg-white focus:border-[#FF9900]"
                  />
                </td>
                <td className="p-6">
                  <input
                    type="text"
                    id={`url-${item.id}`}
                    defaultValue={item.source_url || ''}
                    placeholder="Back Market URL"
                    className="w-full min-w-[200px] bg-neutral-50 border border-neutral-100 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:bg-white focus:border-[#FF9900]"
                  />
                </td>
                <td className="p-6 text-right">
                  <button
                    onClick={async () => {
                      const priceInput = document.getElementById(`price-${item.id}`) as HTMLInputElement;
                      const urlInput = document.getElementById(`url-${item.id}`) as HTMLInputElement;
                      const manualPrice = Number(priceInput.value);
                      const { error } = await supabase.from('product_variants').update({
                        price_kes: manualPrice,
                        source_url: urlInput.value,
                        previous_price_kes: item.price_kes || manualPrice
                      }).eq('id', item.id);
                      if (!error) {
                        alert('Updated successfully');
                        fetchPricelist();
                      }
                    }}
                    className="p-3 bg-[#FF9900]/10 text-[#FF9900] rounded-xl hover:bg-[#FF9900]/20 transition-all"
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

  const renderShopManager = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
          className="btn-brand bg-neutral-900 text-white px-8 py-4 rounded-[2rem] text-xs font-bold uppercase tracking-widest flex items-center space-x-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-[3rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-2xl transition-all duration-700 group">
            <div className="aspect-square relative overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute top-6 right-6 flex space-x-2">
                <button
                  onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                  className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-100 text-neutral-600 hover:text-[#FF9900] transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-100 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-10">
              <span className="text-[10px] font-black uppercase text-neutral-300 tracking-[0.2em]">{product.category}</span>
              <h3 className="text-2xl font-bold mt-2 mb-6 text-neutral-900">{product.name}</h3>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-[#FF9900]">KES {product.priceKES?.toLocaleString()}</p>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${product.stockStatus === 'In Stock' ? 'bg-[#3B8392]/10 text-[#3B8392]' : 'bg-amber-100 text-amber-700'}`}>
                  {product.stockStatus}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSubmit={handleProductSubmit}
        />
      )}
    </div>
  );

  const renderConsultancy = () => (
    <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-10 border-b border-neutral-100">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Consultation Bookings</p>
      </div>
      <table className="w-full">
        <thead className="bg-neutral-50/50">
          <tr>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Client</th>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Requested Date</th>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status</th>
            <th className="p-6 text-right text-[10px] font-black uppercase text-neutral-400 tracking-widest">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50 text-sm">
          {consultations.map(booking => (
            <tr key={booking.id} className="hover:bg-neutral-50 transition-colors">
              <td className="p-6">
                <div className="font-bold">{booking.client_name}</div>
                <div className="text-xs text-neutral-400">{booking.client_phone}</div>
              </td>
              <td className="p-6 font-medium">{new Date(booking.requested_date).toLocaleString()}</td>
              <td className="p-6 capitalize text-xs">{booking.status}</td>
              <td className="p-6 text-right">
                <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold">Approve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOrders = () => (
    <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-10 border-b border-neutral-100">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Order Management</p>
      </div>
      <table className="w-full">
        <thead className="bg-neutral-50/50">
          <tr>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Order ID</th>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Client</th>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Mode</th>
            <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50 text-sm">
          {orders.map(order => (
            <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
              <td className="p-6 font-black tracking-tighter text-blue-600">{order.id}</td>
              <td className="p-6">{order.client_name}</td>
              <td className="p-6 uppercase text-[10px] font-bold">{order.shipping_mode}</td>
              <td className="p-6 capitalize text-xs">{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
      <aside className="w-80 bg-white border-r border-neutral-100 flex flex-col fixed h-screen z-10 hidden lg:flex">
        <div className="p-10 flex items-center space-x-4 mb-10">
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

      <main className="flex-1 p-10 lg:p-20 overflow-y-auto lg:ml-80">
        <header className="mb-12">
          <h1 className="text-3xl font-bold capitalize">{activeTab.replace('_', ' ')}</h1>
        </header>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'shop' && renderShopManager()}
        {activeTab === 'pricelist' && renderPricelistManager()}
        {activeTab === 'consultancy' && renderConsultancy()}
        {activeTab === 'orders' && renderOrders()}
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
