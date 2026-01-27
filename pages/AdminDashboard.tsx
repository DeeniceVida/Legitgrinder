
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, Plus, RefreshCcw, Calendar, Clock, Box, Package,
  MessageSquare, CreditCard, Trash2, Edit3,
  Info, ChevronRight, X, FileText, BarChart3, TrendingUp, Save, Search,
  User, List, Download, Mail, ExternalLink, Filter, MapPin, Truck,
  Activity, DollarSign, Smartphone, History, Image as ImageIcon, Tag, AlignLeft
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { syncBackMarketPrices } from '../services/scraper';
import { supabase } from '../src/lib/supabase';
import { updateConsultationStatus, updateProduct } from '../src/services/supabaseData';
import PriceEditModal from '../components/PriceEditModal';
import ProductEditModal from '../components/ProductEditModal';
import {
  PricelistItem, Product, OrderStatus,
  Consultation, ConsultationStatus, Availability, Invoice,
  BlogPost, FAQItem, Client
} from '../types';

const REVENUE_DATA = [
  { name: 'Jan', revenue: 1.2, profit: 0.3 },
  { name: 'Feb', revenue: 1.8, profit: 0.45 },
  { name: 'Mar', revenue: 1.5, profit: 0.38 },
  { name: 'Apr', revenue: 2.1, profit: 0.52 },
  { name: 'May', revenue: 2.8, profit: 0.70 },
  { name: 'Jun', revenue: 3.5, profit: 0.88 },
];

const CATEGORY_DATA = [
  { name: 'iPhones', value: 450, color: '#3D8593' },
  { name: 'Samsung', value: 310, color: '#FF9900' },
  { name: 'Pixels', value: 180, color: '#6366f1' },
];

interface AdminDashboardProps {
  blogs: BlogPost[];
  faqs: FAQItem[];
  onUpdateBlogs: (blogs: BlogPost[]) => void;
  onUpdateFaqs: (faqs: FAQItem[]) => void;
  pricelist: PricelistItem[];
  onUpdatePricelist: (list: PricelistItem[]) => void;
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
  invoices: Invoice[];
  onUpdateInvoices: (invoices: Invoice[]) => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  consultations: Consultation[];
  onUpdateConsultations: (consults: Consultation[]) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  blogs,
  pricelist, onUpdatePricelist,
  clients,
  invoices, onUpdateInvoices,
  products, onUpdateProducts,
  consultations, onUpdateConsultations
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'products' | 'consultations' | 'pricelist' | 'content' | 'clients'>('overview');
  const [syncing, setSyncing] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ plId: string, capIdx: number } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'clients', name: 'Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'invoices', name: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'products', name: 'Inventory', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'consultations', name: 'Consult', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'content', name: 'Content', icon: <List className="w-4 h-4" /> },
    { id: 'pricelist', name: 'Sync', icon: <RefreshCcw className="w-4 h-4" /> },
  ] as const;

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(adminSearchTerm.toLowerCase())
    );
  }, [clients, adminSearchTerm]);

  const runSync = async () => {
    setSyncing(true);
    const updated = await syncBackMarketPrices(pricelist);
    onUpdatePricelist(updated);
    setSyncing(false);
  };

  const updateInvoiceStatus = (id: string, newStatus: OrderStatus) => {
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv);
    onUpdateInvoices(updated);
  };

  const handleSavePrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPrice) return;

    const formData = new FormData(e.currentTarget);
    const newUSD = parseFloat(formData.get('priceUSD') as string);
    const newKES = parseInt(formData.get('priceKES') as string);

    const updatedList = pricelist.map(item => {
      if (item.id === editingPrice.plId) {
        const newCaps = [...item.capacities];
        newCaps[editingPrice.capIdx] = {
          ...newCaps[editingPrice.capIdx],
          currentPriceKES: newKES,
          sourcePriceUSD: newUSD,
          isManualOverride: true,
          lastSynced: 'Manual Override'
        };
        return { ...item, capacities: newCaps };
      }
      return item;
    });

    onUpdatePricelist(updatedList);
    setEditingPrice(null);

    // Update Supabase
    try {
      const variant = pricelist.find(i => i.id === editingPrice.plId)?.capacities[editingPrice.capIdx];
      if (variant) {
        await supabase
          .from('product_variants')
          .update({
            price_usd: newUSD,
            price_kes: newKES,
            is_manual_override: true,
            last_updated: new Date().toISOString()
          })
          .match({ product_id: editingPrice.plId, capacity: variant.capacity });
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleAddProduct = async (newProduct: Product) => {
    setIsUpdating(true);
    try {
      const { data: created, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          price_kes: newProduct.priceKES,
          discount_price: newProduct.discountPriceKES,
          images: newProduct.imageUrls,
          stock_status: newProduct.availability,
          shipping_duration: newProduct.shippingDuration,
          description: newProduct.description,
          category: newProduct.category || 'Electronics',
          inventory_quantity: newProduct.stockCount,
          shop_variants: newProduct.variations
        })
        .select()
        .single();

      if (error) throw error;

      if (created) {
        const formatted: Product = {
          id: created.id.toString(),
          name: created.name,
          priceKES: parseFloat(created.price_kes),
          discountPriceKES: created.discount_price ? parseFloat(created.discount_price) : undefined,
          imageUrls: created.images || [],
          variations: created.shop_variants || [],
          availability: created.stock_status as Availability,
          shippingDuration: created.shipping_duration,
          description: created.description,
          category: created.category,
          stockCount: created.inventory_quantity
        };
        onUpdateProducts([formatted, ...products]);
        setEditingProduct(null);
      }
    } catch (err: any) {
      console.error('Error adding product:', err);
      alert('Failed to add product: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Delete this product unit?')) {
      try {
        await supabase.from('products').delete().eq('id', id);
        onUpdateProducts(products.filter(p => p.id !== id));
      } catch (err) {
        alert('Delete failed.');
      }
    }
  };

  const handleUpdateConsultationStatus = async (id: string, status: ConsultationStatus) => {
    setIsUpdating(true);
    const success = await updateConsultationStatus(id, status);
    if (success) {
      onUpdateConsultations(consultations.map(c => c.id === id ? { ...c, status } : c));
    }
    setIsUpdating(false);
  };

  const handleConfirmConsultation = (c: Consultation) => {
    const mpesaText = "\n\n*Payment Instructions:*\nLipa na M-Pesa: Buy Goods and Services\nTill Number: *8537538*\nFee: *KES 2,000* ($15)";
    const message = `Hi ${c.name}, this is Legit Grinder. We've reviewed your consultation request for ${c.date} at ${c.time}. Your topic "${c.topic}" is doable! Please proceed with the payment to lock in the slot.${mpesaText}`;
    const url = `https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    handleUpdateConsultationStatus(c.id, ConsultationStatus.DOABLE);
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    alert('Dashboard Header: Starting Save Process');
    setIsUpdating(true);
    try {
      if (!updatedProduct.id || updatedProduct.id === '') {
        alert('Dashboard: Routing to CREATE NEW');
        await handleAddProduct(updatedProduct);
        return;
      }

      alert('Dashboard: Calling Service for ID ' + updatedProduct.id);
      const result = await updateProduct(updatedProduct);

      if (result === true) {
        alert('Dashboard: SERVICE RETURNED SUCCESS');
        onUpdateProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setEditingProduct(null);
      } else {
        alert('Dashboard: SERVICE RETURNED FAILURE: ' + result);
        throw new Error(typeof result === 'string' ? result : 'Update failed');
      }
    } catch (err: any) {
      alert('Dashboard: EXCEPTION CAUGHT: ' + err.message);
      console.error('Error updating product:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F9FAFB] pt-24 pb-20">
      <aside className="w-72 bg-white hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] ml-6 my-6 rounded-[2.5rem] shadow-2xl">
        <div className="p-10 flex items-center space-x-4">
          <div className="bg-[#3D8593] p-3 rounded-2xl text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#3D8593]">LEGIT HUB</span>
        </div>
        <nav className="flex-1 px-6 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-teal-50 text-[#3D8593]' : 'text-gray-400 hover:text-[#3D8593]'}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-12">
        <header className="mb-16">
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 capitalize">{activeTab}</h1>
          <p className="text-[#3D8593] font-bold uppercase text-[9px] tracking-[0.4em] mt-3">Elite Logistics Control</p>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="grid grid-cols-4 gap-8">
              {[
                { label: 'Total Revenue', val: 'KES 5.8M', icon: <DollarSign />, bg: 'bg-emerald-50' },
                { label: 'Gross Profit', val: 'KES 1.1M', icon: <TrendingUp />, bg: 'bg-teal-50' },
                { label: 'Active Clients', val: clients.length.toString(), icon: <Activity />, bg: 'bg-orange-50' },
                { label: 'Shipments', val: invoices.length.toString(), icon: <Truck />, bg: 'bg-indigo-50' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-neutral-100 shadow-xl">
                  <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mb-8`}>{stat.icon}</div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-3">{stat.label}</p>
                  <h2 className="text-4xl font-black text-gray-900">{stat.val}</h2>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pricelist' && (
          <div className="bg-white rounded-[4rem] p-12 border border-neutral-100 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-gray-900">Live Market Sync</h3>
              <button
                onClick={runSync}
                disabled={syncing}
                className="btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                {syncing ? <RefreshCcw className="animate-spin" /> : <RefreshCcw />} Global Market Sync
              </button>
            </div>

            <div className="space-y-4">
              {pricelist.map((item) => (
                <div key={item.id} className="p-8 bg-neutral-50 rounded-3xl border border-neutral-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-xl font-black text-gray-900">{item.modelName}</h4>
                      <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest">{item.brand} | {item.series}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {item.capacities.map((cap, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-white flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 mb-2 uppercase">{cap.capacity}</span>
                        <span className="text-lg font-black text-gray-900">KES {cap.currentPriceKES.toLocaleString()}</span>
                        <button
                          onClick={() => setEditingPrice({ plId: item.id, capIdx: idx })}
                          className="mt-4 p-2 text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center bg-teal-50 px-10 py-6 rounded-full border border-teal-100 mb-8">
              <span className="text-[10px] font-black uppercase text-[#3D8593] tracking-[0.2em]">Active Inventory Stock Units ({products.length})</span>
              <button
                onClick={() => setEditingProduct({ id: '', name: '', priceKES: 0, imageUrls: [''], variations: [], availability: Availability.LOCAL, description: '', category: '' })}
                className="btn-vibrant-teal px-8 py-3 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add New Unit
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-[3rem] p-8 border border-neutral-100 shadow-xl group">
                  <div className="h-48 rounded-[2rem] overflow-hidden mb-6 bg-gray-50 relative">
                    <img src={p.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg hover:bg-teal-50 text-[#3D8593] transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">{p.name}</h4>
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-2xl font-black text-[#3D8593]">KES {p.priceKES.toLocaleString()}</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{p.availability}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all underline-none border-none ring-0 shadow-none"
                  >
                    Retire Unit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'consultations' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center bg-teal-50 px-10 py-6 rounded-full border border-teal-100 mb-8">
              <span className="text-[10px] font-black uppercase text-[#3D8593] tracking-[0.2em]">Scheduled strategy sessions ({consultations.length})</span>
            </div>

            <div className="grid gap-6">
              {consultations.map((c) => (
                <div key={c.id} className="bg-white rounded-[3rem] p-10 border border-neutral-100 shadow-xl flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-2xl font-black text-gray-900 mb-1">{c.name}</h4>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{c.email} | {c.whatsapp}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === ConsultationStatus.PENDING ? 'bg-orange-50 text-orange-600' :
                        c.status === ConsultationStatus.PAID ? 'bg-green-50 text-green-600' : 'bg-teal-50 text-teal-600'
                        }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6 p-6 bg-neutral-50 rounded-[2rem]">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#3D8593]" />
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Date</p>
                          <p className="text-sm font-black text-gray-900">{c.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[#3D8593]" />
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Time</p>
                          <p className="text-sm font-black text-gray-900">{c.time}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest mb-3">Consultation Topic</p>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium bg-neutral-50/50 p-6 rounded-2xl">{c.topic}</p>
                    </div>
                  </div>

                  <div className="w-full md:w-64 flex flex-col gap-4 justify-center">
                    {c.status === ConsultationStatus.PENDING && (
                      <button
                        onClick={() => handleConfirmConsultation(c)}
                        className="w-full py-5 bg-[#3D8593] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-teal-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Confirm & Send WhatsApp
                      </button>
                    )}
                    {c.status === ConsultationStatus.DOABLE && (
                      <button
                        onClick={() => handleUpdateConsultationStatus(c.id, ConsultationStatus.PAID)}
                        className="w-full py-5 bg-[#FF9900] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Mark as Paid
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateConsultationStatus(c.id, ConsultationStatus.CANCELLED)}
                      className="w-full py-5 bg-rose-50 text-rose-500 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all underline-none border-none ring-0 shadow-none"
                    >
                      Cancel Session
                    </button>
                  </div>
                </div>
              ))}
              {consultations.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[4rem] border border-neutral-100 shadow-xl">
                  <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">No sessions booked yet</h3>
                  <p className="text-sm text-gray-400 mt-2">Active requests will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center mb-8">
              <div className="relative w-96">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="w-full bg-white border border-neutral-100 rounded-full pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all shadow-sm"
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button className="p-5 bg-white border border-neutral-100 rounded-2xl text-gray-400 hover:text-[#3D8593] transition-all shadow-sm">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-5 bg-white border border-neutral-100 rounded-2xl text-gray-400 hover:text-[#3D8593] transition-all shadow-sm">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[3.5rem] border border-neutral-100 shadow-2xl overflow-hidden">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">Identity</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">Contact</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">Location</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">Interests</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-neutral-100">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="group hover:bg-neutral-50/50 transition-all">
                      <td className="px-10 py-8 border-b border-neutral-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#3D8593]/10 rounded-2xl flex items-center justify-center text-[#3D8593] font-black text-sm">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{client.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Joined {client.joinedDate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 border-b border-neutral-50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-300" /> {client.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <Smartphone className="w-3.5 h-3.5 text-gray-300" /> {client.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 border-b border-neutral-50">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-tight">
                          <MapPin className="w-3.5 h-3.5 text-gray-300" /> {client.location}
                        </div>
                      </td>
                      <td className="px-10 py-8 border-b border-neutral-50">
                        <div className="flex flex-wrap gap-2">
                          {(client.interests || []).map((interest, i) => (
                            <span key={i} className="px-3 py-1 bg-teal-50 text-[#3D8593] text-[9px] font-black uppercase rounded-full border border-teal-100">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-10 py-8 border-b border-neutral-50">
                        <div>
                          <p className="font-black text-gray-900">KES {client.totalSpentKES.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{client.orderCount} Orders</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {editingPrice && (
        <PriceEditModal
          onClose={() => setEditingPrice(null)}
          onSave={handleSavePrice}
          initialUSD={pricelist.find(i => i.id === editingPrice.plId)?.capacities[editingPrice.capIdx].sourcePriceUSD || 0}
          initialKES={pricelist.find(i => i.id === editingPrice.plId)?.capacities[editingPrice.capIdx].currentPriceKES || 0}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          isUpdating={isUpdating}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
