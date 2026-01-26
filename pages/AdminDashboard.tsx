
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
import { bulkUpdateSourceLinks } from '../src/services/bulkSeedLinks';
import { seedDatabaseProducts } from '../src/services/masterSeeder';
import { supabase } from '../src/lib/supabase';
import { calculateAutomatedPrice } from '../utils/priceCalculations';
import {
  PricelistItem, Product, OrderStatus,
  Consultation, ConsultationStatus, Availability, Invoice,
  BlogPost, FAQItem, Client, ProductVariation
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
  blogs, onUpdateBlogs,
  pricelist, onUpdatePricelist,
  clients, onUpdateClients,
  invoices, onUpdateInvoices,
  products, onUpdateProducts,
  consultations, onUpdateConsultations
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'products' | 'consultations' | 'pricelist' | 'content' | 'clients'>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncBrandFilter, setSyncBrandFilter] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ plId: string, capIdx: number } | null>(null);

  // Product Management State
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [currentVariations, setCurrentVariations] = useState<ProductVariation[]>([]);

  React.useEffect(() => {
    if (editingProduct && typeof editingProduct === 'object') {
      setCurrentVariations(editingProduct.variations || []);
    } else {
      setCurrentVariations([]);
    }
  }, [editingProduct]);

  const handleAddVariation = () => {
    setCurrentVariations([...currentVariations, { type: 'Color', name: '', priceKES: 0 }]);
  };

  const handleUpdateVariation = (index: number, updates: Partial<ProductVariation>) => {
    const updated = [...currentVariations];
    updated[index] = { ...updated[index], ...updates };
    setCurrentVariations(updated);
  };

  const handleRemoveVariation = (index: number) => {
    setCurrentVariations(currentVariations.filter((_, i) => i !== index));
  };

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

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const productData: Product = {
      id: typeof editingProduct === 'object' ? editingProduct.id : `prod-${Date.now()}`,
      name: formData.get('name') as string,
      priceKES: parseInt(formData.get('priceKES') as string),
      discountPriceKES: formData.get('discountPriceKES') ? parseInt(formData.get('discountPriceKES') as string) : undefined,
      imageUrls: [(formData.get('imageUrl') as string) || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800'],
      variations: currentVariations,
      availability: formData.get('availability') as Availability,
      shippingDuration: formData.get('shippingDuration') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
    };

    if (editingProduct === 'new') {
      onUpdateProducts([...products, productData]);
    } else {
      onUpdateProducts(products.map(p => p.id === productData.id ? productData : p));
    }
    setEditingProduct(null);
  };

  const handleSavePrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPrice) return;

    const formData = new FormData(e.currentTarget);
    const newUSD = parseFloat(formData.get('priceUSD') as string);
    const newKES = parseInt(formData.get('priceKES') as string);

    // 1. Update local state
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

    // 2. Update Supabase
    try {
      const variant = pricelist.find(i => i.id === editingPrice.plId)?.capacities[editingPrice.capIdx];
      if (variant) {
        const { error } = await supabase
          .from('product_variants')
          .update({
            price_usd: newUSD,
            price_kes: newKES,
            is_manual_override: true,
            last_updated: new Date().toISOString()
          })
          .match({ product_id: editingPrice.plId, capacity: variant.capacity });

        if (error) console.error('Error updating DB:', error);
      }
    } catch (err) {
      console.error('Unexpected update error:', err);
    }

    setEditingPrice(null);
  };

  const downloadPricelistCSV = () => {
    // 1. Header Row
    const headers = ['Brand,Model,Capacity,USD Price,Calculated KES Price'];

    // 2. Data Rows
    const rows = pricelist.flatMap(item =>
      item.capacities.map(cap =>
        `${item.brand},"${item.modelName}",${cap.capacity},${cap.sourcePriceUSD},${cap.currentPriceKES}`
      )
    );

    // 3. Combine and Blob
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // 4. Download Trigger
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `legitgrinder_pricelist_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header

      let updateCount = 0;
      setSyncing(true);

      for (const row of rows) {
        // Parse CSV row: Brand, "Model", Capacity, USD, KES
        // Handle quotes around model name if present
        const match = row.match(/^(.*?),"(.*?)",(.*?),(.*?),(.*?)$/) || row.split(',');

        let modelName, capacity, usdPrice;

        if (row.includes('"')) {
          // Quoted model name
          modelName = match[2];
          capacity = match[3];
          usdPrice = parseFloat(match[4]);
        } else {
          // Simple split
          modelName = match[1];
          capacity = match[2];
          usdPrice = parseFloat(match[3]);
        }

        if (!modelName || !capacity || isNaN(usdPrice)) continue;

        // 1. Find the product in local state to get ID
        const product = pricelist.find(p => p.modelName === modelName.trim());
        if (!product) continue;

        // 2. Calculate new KES price
        // Logic: Shipping ($20 + 3.5%) + Service ($30 or 4.5%) * Rate (135)
        const shipping = 20 + (usdPrice * 0.035);
        const service = usdPrice > 750 ? (usdPrice * 0.045) : 30;
        const totalUSD = usdPrice + shipping + service;
        const newKES = Math.ceil(totalUSD * 135);

        // 3. Update Supabase
        try {
          const { error } = await supabase
            .from('product_variants')
            .update({
              price_usd: usdPrice,
              price_kes: newKES,
              is_manual_override: true,
              last_updated: new Date().toISOString()
            })
            .match({ product_id: product.id, capacity: capacity.trim() });

          if (!error) updateCount++;
        } catch (err) {
          console.error(`Failed to update ${modelName} ${capacity}`, err);
        }
      }

      setSyncing(false);
      alert(`Successfully updated ${updateCount} prices from CSV! Refresh to see changes.`);

      // Trigger a re-fetch of the pricelist
      const updated = await syncBackMarketPrices(pricelist); // Re-fetch
      onUpdatePricelist(updated);
    };
    reader.readAsText(file);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to remove this item from inventory?')) {
      onUpdateProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F9FAFB] pt-24 pb-20">
      {/* Mobile Tab Nav */}
      <div className="lg:hidden sticky top-24 z-40 bg-white border-b border-gray-100 px-4 py-3 overflow-x-auto flex no-scrollbar gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-[#3D8593] text-white shadow-lg shadow-teal-100' : 'bg-gray-50 text-gray-400'
              }`}
          >
            {item.icon}
            {item.name}
          </button>
        ))}
      </div>

      <aside className="w-72 bg-white border-r border-gray-100 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] ml-6 my-6 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-10 flex items-center space-x-4">
          <div className="bg-[#3D8593] p-3 rounded-2xl text-white shadow-xl shadow-teal-100">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#3D8593]">LEGIT HUB</span>
        </div>
        <nav className="flex-1 px-6 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-teal-50 text-[#3D8593] shadow-sm' : 'text-gray-400 hover:text-[#3D8593]'
                }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-10 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-16 gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-gray-900 capitalize leading-none">{activeTab}</h1>
            <p className="text-[#3D8593] font-bold uppercase text-[9px] tracking-[0.4em] mt-3">Elite Logistics Control & Intelligence</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            {activeTab === 'clients' && (
              <button className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl">
                <Download className="w-4 h-4 mr-2" /> Export Segment
              </button>
            )}
            {activeTab === 'products' && (
              <button
                onClick={() => setEditingProduct('new')}
                className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Global Stock Unit
              </button>
            )}
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Total Revenue', val: 'KES 5.8M', trend: '+14.2%', icon: <DollarSign className="text-emerald-500" />, bg: 'bg-emerald-50' },
                { label: 'Gross Profit', val: 'KES 1.1M', trend: '+18.5%', icon: <TrendingUp className="text-[#3D8593]" />, bg: 'bg-teal-50' },
                { label: 'Active Clients', val: clients.length.toString(), trend: '+5.4%', icon: <Activity className="text-[#FF9900]" />, bg: 'bg-orange-50' },
                { label: 'Pending Shipments', val: invoices.filter(i => i.status !== OrderStatus.READY_FOR_COLLECTION).length.toString(), trend: 'High Priority', icon: <Truck className="text-indigo-500" />, bg: 'bg-indigo-50' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-neutral-100 relative group">
                  <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">{stat.label}</p>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tighter">{stat.val}</h2>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-lg">{stat.trend}</span>
                    <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Growth Rate</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-white rounded-[4rem] p-12 border border-neutral-100 shadow-2xl">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-10">Revenue Velocity</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3D8593" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3D8593" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#3D8593" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-[4rem] p-12 border border-neutral-100 shadow-2xl">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Category Split</h3>
                <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={CATEGORY_DATA} innerRadius={80} outerRadius={120} paddingAngle={10} dataKey="value" stroke="none">
                        {CATEGORY_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 mt-8">
                  {CATEGORY_DATA.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                        <span className="text-gray-400">{c.name}</span>
                      </div>
                      <span className="text-gray-900">{((c.value / 940) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS CRM TAB */}
        {activeTab === 'clients' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="text"
                placeholder="Search by name, email, or location..."
                className="w-full bg-white border border-neutral-100 rounded-[2.5rem] pl-20 pr-10 py-6 text-sm font-medium shadow-2xl focus:ring-8 focus:ring-[#3D8593]/5 outline-none transition-all"
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-12 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Client Identity</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">HQ & Region</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Financial Value</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Buying Pulse</th>
                    <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">CRM Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-neutral-50/30 transition-colors group">
                      <td className="px-12 py-10">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-indigo-50 rounded-[1.8rem] flex items-center justify-center text-[#3D8593] font-black text-2xl border border-white group-hover:scale-110 transition-transform">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-xl tracking-tight leading-none">{client.name}</p>
                            <p className="text-[11px] text-gray-400 font-bold mt-2 lowercase">{client.email}</p>
                            <p className="text-[10px] text-[#3D8593] font-bold mt-1 uppercase tracking-widest">{client.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <p className="font-bold text-sm flex items-center gap-2 text-gray-900"><MapPin className="w-4 h-4 text-[#3D8593]" /> {client.location}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Member since {client.joinedDate}</p>
                      </td>
                      <td className="px-10 py-10">
                        <p className="text-xl font-black text-gray-900 tracking-tighter">KES {client.totalSpentKES.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.purchaseFrequency === 'High' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                            {client.purchaseFrequency} Frequency
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {client.purchasedItems.slice(0, 2).map((item, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-neutral-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500">{item}</span>
                          ))}
                          {client.purchasedItems.length > 2 && (
                            <span className="px-2 py-1 bg-neutral-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400">+{client.purchasedItems.length - 2} More</span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Last Activity: {client.lastOrderDate}</p>
                      </td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-3">
                          <button title="Marketing Blast" className="p-4 bg-teal-50 text-[#3D8593] rounded-2xl hover:bg-[#3D8593] hover:text-white transition-all"><Mail className="w-4 h-4" /></button>
                          <button title="Full Audit Log" className="p-4 bg-neutral-900 text-white rounded-2xl hover:bg-black transition-all"><History className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVOICES MANAGEMENT TAB */}
        {activeTab === 'invoices' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-12 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Order/Invoice</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Client Status</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Logistics Phase</th>
                    <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="px-12 py-10">
                        <p className="font-black text-gray-900 text-xl tracking-tight leading-none">#{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-[#3D8593] font-black uppercase tracking-widest mt-2">{inv.productName}</p>
                      </td>
                      <td className="px-10 py-10">
                        <p className="font-bold text-sm text-gray-900">{inv.clientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${inv.isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{inv.isPaid ? 'Transaction Paid' : 'Payment Pending'}</p>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as OrderStatus)}
                          className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-teal-100"
                        >
                          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-3">
                          <button className="p-4 bg-neutral-900 text-white rounded-2xl"><ExternalLink className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'products' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-[3.5rem] p-10 border border-neutral-100 shadow-2xl relative group overflow-hidden">
                  <div className="aspect-square rounded-[2.5rem] overflow-hidden mb-8 relative border border-neutral-50">
                    <img src={p.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className={`absolute top-6 left-6 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl ${p.availability === Availability.LOCAL ? 'bg-emerald-500 text-white' : 'bg-[#FF9900] text-white'}`}>
                      {p.availability}
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight truncate">{p.name}</h4>
                      <span className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">{p.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-2xl font-black text-[#3D8593] tracking-tighter">KES {p.priceKES.toLocaleString()}</p>
                      {p.discountPriceKES && (
                        <p className="text-[10px] text-gray-400 line-through">KES {p.discountPriceKES.toLocaleString()}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.shippingDuration || 'Standard Shipping'}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="flex-1 py-5 bg-neutral-900 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Specs
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-5 bg-rose-50 text-rose-500 rounded-[1.8rem] hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setEditingProduct('new')}
                className="flex flex-col items-center justify-center border-4 border-dashed border-neutral-100 rounded-[3.5rem] p-12 text-neutral-200 hover:border-[#3D8593] hover:text-[#3D8593] transition-all group min-h-[500px]"
              >
                <Plus className="w-16 h-16 mb-6 group-hover:scale-125 transition-transform" />
                <span className="font-black uppercase text-[12px] tracking-widest">Stock Global Unit</span>
              </button>
            </div>
          </div>
        )}

        {/* SYNC TOOLS TAB */}
        {activeTab === 'pricelist' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col gap-10">
              <div className="flex justify-center">
                <div className="glass p-2 rounded-[3rem] flex shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                  {(['iphone', 'samsung', 'pixel'] as const).map((brand) => (
                    <button key={brand} onClick={() => setSyncBrandFilter(brand)} className={`whitespace-nowrap px-10 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${syncBrandFilter === brand ? 'bg-[#3D8593] text-white' : 'text-gray-400 hover:text-[#3D8593]'}`}>
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative max-w-2xl mx-auto w-full group">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#3D8593] transition-colors" />
                <input type="text" placeholder="Search Master Pricelist Registry..." className="w-full bg-white border border-neutral-100 rounded-[2.5rem] pl-20 pr-10 py-6 text-sm font-black uppercase tracking-widest outline-none focus:ring-8 focus:ring-[#3D8593]/5 transition-all shadow-xl" value={adminSearchTerm} onChange={(e) => setAdminSearchTerm(e.target.value)} />
              </div>
              <div className="flex justify-center flex-col items-center gap-4">
                <button onClick={runSync} disabled={syncing} className="btn-vibrant-teal px-12 py-6 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 shadow-2xl">
                  {syncing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                  {syncing ? 'Global Pulse Sync In Progress...' : 'Force Global Price Sync'}
                </button>
                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      if (confirm('This will map all known Back Market links to your database. Proceed?')) {
                        await bulkUpdateSourceLinks();
                        alert('Links mapped successfully!');
                      }
                    }}
                    className="px-6 py-3 bg-neutral-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all"
                  >
                    Bulk Map Known Links
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('This will repopulate your entire product database and map all known links. Proceed?')) {
                        setSyncing(true);
                        await seedDatabaseProducts();
                        await bulkUpdateSourceLinks();
                        setSyncing(false);
                        alert('Database seeded and links mapped successfully!');
                      }
                    }}
                    className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    Restore & Seed All Data
                  </button>
                  <button
                    onClick={downloadPricelistCSV}
                    className="px-6 py-3 bg-teal-50 text-teal-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all flex items-center gap-2"
                  >
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                  <label className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                    <Package className="w-3 h-3" /> Import CSV
                  </label>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest self-center">Connected to Cloudflare Worker (legit-sync-master)</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50">
              {pricelist.filter(item => item.brand === syncBrandFilter && item.modelName.toLowerCase().includes(adminSearchTerm.toLowerCase())).map(item => (
                <div key={item.id} className="p-12 hover:bg-neutral-50/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                    <div>
                      <h4 className="text-3xl font-black text-gray-900 tracking-tight">{item.modelName}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">{item.series}</p>
                        <button
                          onClick={() => window.open(`https://www.backmarket.com/en-us/search?q=${encodeURIComponent(item.modelName)}`, '_blank')}
                          className="flex items-center gap-1.5 text-[9px] font-black text-[#3D8593] uppercase tracking-widest hover:underline"
                        >
                          <Search className="w-3 h-3" /> Find Link
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {item.capacities.map((cap, idx) => (
                      <div key={idx} className={`p-8 rounded-[3rem] border transition-all relative ${cap.isManualOverride ? 'bg-orange-50 border-orange-100' : 'bg-white border-neutral-100 hover:border-teal-100 shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-8">
                          <span className="px-4 py-2 bg-neutral-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">{cap.capacity}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{cap.lastSynced}</span>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3">Live KES Strategy Price</label>
                          <div className="flex justify-between items-end">
                            <p className="text-3xl font-black text-gray-900 tracking-tighter">KES {cap.currentPriceKES.toLocaleString()}</p>
                            <button onClick={() => setEditingPrice({ plId: item.id, capIdx: idx })} className="p-4 bg-neutral-50 rounded-2xl text-gray-300 hover:text-[#3D8593] shadow-inner">
                              <Edit3 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSULTATIONS REGISTRY */}
        {activeTab === 'consultations' && (
          <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50 animate-in fade-in duration-700">
            <div className="p-12 bg-neutral-50/30 flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">Expert Booking Pipeline</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-4 py-1.5 rounded-full">{consultations.length} Active Requests</span>
            </div>
            {consultations.map(c => (
              <div key={c.id} className="p-12 flex flex-col xl:flex-row gap-12 hover:bg-neutral-50/20 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-sm border border-white">
                      <User className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{c.name}</h4>
                      <p className="text-[11px] text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">{c.whatsapp} • {c.email}</p>
                    </div>
                  </div>
                  <div className="bg-white/80 p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4">Strategic Objective</p>
                    <p className="text-lg font-bold text-gray-600 leading-relaxed italic">"{c.topic}"</p>
                  </div>
                </div>
                <div className="w-full xl:w-80 flex flex-col justify-center gap-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[ConsultationStatus.PENDING, ConsultationStatus.DOABLE, ConsultationStatus.PAID, ConsultationStatus.CANCELLED].map(s => (
                      <button key={s} onClick={() => onUpdateConsultations(consultations.map(item => item.id === c.id ? { ...item, status: s } : item))} className={`px-4 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all ${c.status === s ? 'bg-[#3D8593] text-white shadow-xl' : 'bg-white border border-neutral-100 text-gray-400'}`}>
                        {s.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 bg-neutral-50 p-6 rounded-2xl">
                    <span>Phase: {c.status}</span>
                    <span className="text-[#3D8593]">Fee: ${c.feeUSD}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONTENT MANAGER */}
        {activeTab === 'content' && (
          <div className="grid md:grid-cols-2 gap-12 animate-in fade-in duration-700">
            {blogs.map(b => (
              <div key={b.id} className="bg-white rounded-[4rem] p-10 border border-neutral-100 shadow-2xl group relative overflow-hidden">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-8 relative">
                  <img src={b.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-6 right-6 flex gap-3">
                    <button className="p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl"><Edit3 className="w-5 h-5" /></button>
                    <button className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <span className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest bg-teal-50 px-4 py-2 rounded-full">{b.category}</span>
                <h3 className="text-3xl font-black text-gray-900 mt-6 mb-4 leading-tight">{b.title}</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 mb-8">{b.excerpt}</p>
              </div>
            ))}
            <button className="aspect-video border-4 border-dashed border-neutral-100 rounded-[4rem] flex flex-col items-center justify-center text-neutral-200 hover:border-[#3D8593] hover:text-[#3D8593] transition-all group">
              <Plus className="w-16 h-16 mb-4 group-hover:rotate-90 transition-transform duration-500" />
              <span className="font-black uppercase text-[12px] tracking-widest">New Intelligence Piece</span>
            </button>
          </div>
        )}
      </main>

      {/* Manual Price Edit Modal */}
      {editingPrice && (() => {
        const item = pricelist.find(i => i.id === editingPrice.plId);
        const cap = item?.capacities[editingPrice.capIdx];
        if (!item || !cap) return null;

        // Local state for the modal form to handle live updates
        const [localUSD, setLocalUSD] = React.useState(cap.sourcePriceUSD);
        const [localKES, setLocalKES] = React.useState(cap.currentPriceKES);

        // Auto-calculate KES when USD changes
        const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = parseFloat(e.target.value);
          setLocalUSD(val);
          if (!isNaN(val)) {
            setLocalKES(calculateAutomatedPrice(val));
          }
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#0f1a1c]/60 backdrop-blur-sm" onClick={() => setEditingPrice(null)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
              <header className="px-10 py-8 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Manual Price Control</h3>
                  <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest mt-1">{item.modelName} • {cap.capacity}</p>
                </div>
                <button onClick={() => setEditingPrice(null)} className="p-3 hover:bg-white rounded-2xl">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </header>

              <form onSubmit={handleSavePrice} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Market USD Price</label>
                    <input
                      name="priceUSD"
                      type="number"
                      step="0.01"
                      value={localUSD}
                      onChange={handleUSDChange}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Final KES Strategy</label>
                    <input
                      name="priceKES"
                      type="number"
                      value={localKES}
                      onChange={(e) => setLocalKES(parseInt(e.target.value) || 0)}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-neutral-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                    Apply Override
                  </button>
                  <button type="button" onClick={() => setEditingPrice(null)} className="px-8 py-5 bg-neutral-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Product Edit/Add Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#0f1a1c]/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
            <header className="px-10 py-8 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-black tracking-tight text-gray-900">
                  {editingProduct === 'new' ? 'New Global Stock Unit' : 'Refine Stock Specifications'}
                </h3>
                <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-[0.3em] mt-1">Inventory Management Suite</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-3 hover:bg-white rounded-2xl transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </header>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Smartphone className="w-3.5 h-3.5" /> Product Name</label>
                    <input
                      required
                      name="name"
                      defaultValue={typeof editingProduct === 'object' ? editingProduct.name : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                      placeholder="e.g. iPhone 15 Pro Max"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5" /> Price (KES)</label>
                      <input
                        required
                        type="number"
                        name="priceKES"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.priceKES : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                        placeholder="120000"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><TrendingUp className="w-3.5 h-3.5" /> Old Price (Optional)</label>
                      <input
                        type="number"
                        name="discountPriceKES"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.discountPriceKES : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                        placeholder="135000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><ImageIcon className="w-3.5 h-3.5" /> Hero Image URL</label>
                    <input
                      name="imageUrl"
                      defaultValue={typeof editingProduct === 'object' ? editingProduct.imageUrls[0] : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-4 focus:ring-teal-100 transition-all text-xs"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Tag className="w-3.5 h-3.5" /> Global Category</label>
                    <input
                      required
                      name="category"
                      defaultValue={typeof editingProduct === 'object' ? editingProduct.category : 'Electronics'}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><RefreshCcw className="w-3.5 h-3.5" /> Availability</label>
                      <select
                        name="availability"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.availability : Availability.IMPORT}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                      >
                        <option value={Availability.LOCAL}>Local Stock</option>
                        <option value={Availability.IMPORT}>On Import</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Truck className="w-3.5 h-3.5" /> Shipping ETA</label>
                      <input
                        name="shippingDuration"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.shippingDuration : '2-3 Weeks Air'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-[#F9FAFB] rounded-[2.5rem] p-10 border border-neutral-100">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#3D8593]/10 p-2 rounded-xl text-[#3D8593]">
                          <Package className="w-5 h-5" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f1a1c]">Market Variations</h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariation}
                        className="w-10 h-10 bg-white border border-neutral-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-all shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {currentVariations.length === 0 ? (
                      <div className="py-20 border-2 border-dashed border-neutral-200 rounded-[2rem] flex flex-col items-center justify-center text-neutral-400 group">
                        <p className="text-[10px] font-black uppercase tracking-widest">No variations defined. Click + to add.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 overflow-x-auto pb-4">
                        {currentVariations.map((v, idx) => (
                          <div key={idx} className="bg-white p-5 rounded-[2.5rem] border border-neutral-100 grid grid-cols-1 md:grid-cols-12 gap-5 items-center animate-in slide-in-from-right-4 duration-300 min-w-[850px]">
                            <div className="md:col-span-2">
                              <select
                                value={v.type}
                                onChange={(e) => handleUpdateVariation(idx, { type: e.target.value as any })}
                                className="w-full bg-white border border-neutral-100 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-teal-100 outline-none transition-all cursor-pointer"
                              >
                                <option value="Color">Color</option>
                                <option value="Capacity">Capacity</option>
                                <option value="Design">Design</option>
                                <option value="Size">Size</option>
                                <option value="Bundle">Bundle</option>
                              </select>
                            </div>
                            <div className="md:col-span-4">
                              <input
                                placeholder="Variation Name"
                                value={v.name}
                                onChange={(e) => handleUpdateVariation(idx, { name: e.target.value })}
                                className="w-full bg-white border border-neutral-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <input
                                type="number"
                                placeholder="Price"
                                value={v.priceKES || ''}
                                onChange={(e) => handleUpdateVariation(idx, { priceKES: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white border border-neutral-100 rounded-2xl px-6 py-4 text-sm font-black text-center text-gray-400 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <input
                                placeholder="https://image-link.com"
                                value={v.imageUrl || ''}
                                onChange={(e) => handleUpdateVariation(idx, { imageUrl: e.target.value })}
                                className="w-full bg-white border border-neutral-100 rounded-2xl px-6 py-4 text-[10px] font-medium text-gray-400 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariation(idx)}
                                className="w-12 h-12 flex-shrink-0 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><AlignLeft className="w-3.5 h-3.5" /> Detailed Strategic Description</label>
                <textarea
                  required
                  name="description"
                  defaultValue={typeof editingProduct === 'object' ? editingProduct.description : ''}
                  rows={4}
                  className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                  placeholder="The most premium device featuring AI capabilities and titanium structure..."
                />
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button
                  type="submit"
                  className="flex-1 py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all"
                >
                  Confirm Stock Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-10 py-6 bg-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
