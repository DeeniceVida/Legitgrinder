
import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, Plus, RefreshCcw, Calendar, Clock, Box,
  MessageSquare, CreditCard, Trash2, Edit3,
  Info, ChevronRight, X, FileText, BarChart3, TrendingUp, Save, Search,
  User, List, Download, Mail, ExternalLink, Filter, MapPin, Truck,
  Activity, DollarSign, Smartphone, History, Image as ImageIcon, Tag, AlignLeft, Check, Printer,
  ShieldCheck, MessageCircle, Youtube, Book
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { syncBackMarketPrices } from '../services/scraper';
import { seedFullInventory } from '../services/syncLinks';
import { WHATSAPP_NUMBER } from '../constants';
import { supabase } from '../lib/supabase';
import { calculateFinalPrice, updatePricelistItem, updateConsultation, createProduct, updateProduct, deleteProduct, createBlog, updateBlog, deleteBlog, updateClient, deleteClient, fetchSourcingRequests, updateSourcingStatus, updateInvoiceStatus as updateInvoiceStatusInDB, fetchVisitCount, createEBook, updateEBook, deleteEBook, fetchEBooks, createManualInvoice } from '../services/supabaseData';
import {
  PricelistItem, Product, OrderStatus, getOrderProgress,
  Consultation, ConsultationStatus, Availability, Invoice,
  BlogPost, FAQItem, Client, ProductVariation, SourcingRequest, EBook
} from '../types';
import SafeImage from '../components/SafeImage';



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
  // Memoized Live Statistics
  const revenueData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyStats: Record<string, { revenue: number, profit: number }> = {};

    invoices.forEach(inv => {
      if (!inv.date) return;
      const date = new Date(inv.date);
      if (date.getFullYear() !== currentYear) return;
      const monthName = months[date.getMonth()];
      if (!monthlyStats[monthName]) monthlyStats[monthName] = { revenue: 0, profit: 0 };
      const rev = (inv.totalKES || 0) / 1000000;
      monthlyStats[monthName].revenue += rev;
      monthlyStats[monthName].profit += rev * 0.25;
    });

    return months.slice(0, 6).map(name => ({
      name,
      revenue: parseFloat((monthlyStats[name]?.revenue || 0).toFixed(2)),
      profit: parseFloat((monthlyStats[name]?.profit || 0).toFixed(2))
    }));
  }, [invoices]);

  const categoryData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const colors = ['#3D8593', '#FF9900', '#6366f1', '#ec4899', '#f59e0b'];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    }));
  }, [products]);

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'products' | 'consultations' | 'pricelist' | 'content' | 'clients' | 'leads' | 'books'>('overview');
  const [syncing, setSyncing] = useState(false);
  const [syncingMaster, setSyncingMaster] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncBrandFilter, setSyncBrandFilter] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ plId: string, capIdx: number } | null>(null);

  // Product Management State
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);

  // Price Editing State
  const [priceEditUSD, setPriceEditUSD] = useState<string>('');
  const [priceEditKES, setPriceEditKES] = useState<number | null>(null);
  const [priceManualOverride, setPriceManualOverride] = useState(false);
  const [priceCalculating, setPriceCalculating] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);

  // Advanced Variation State
  const [localVariations, setLocalVariations] = useState<ProductVariation[]>([]);

  // Blog Management State
  const [editingBlog, setEditingBlog] = useState<BlogPost | 'new' | null>(null);

  // Printing State
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Sourcing Leads State
  const [leads, setLeads] = useState<SourcingRequest[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [visitCount, setVisitCount] = useState<number>(0);

  const hasNewPaidOrders = invoices.some(inv => inv.isPaid && inv.status === OrderStatus.RECEIVED_BY_AGENT);

  const tabs = [
    { id: 'overview', name: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'clients', name: 'Clients', icon: <Users className="w-4 h-4" /> },
    {
      id: 'invoices', name: 'Invoices', icon: (
        <div className="relative">
          <FileText className="w-4 h-4" />
          {hasNewPaidOrders && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white pulse"></span>}
        </div>
      )
    },
    { id: 'products', name: 'Stock (Non-Phones)', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'consultations', name: 'Consult', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'content', name: 'Content', icon: <List className="w-4 h-4" /> },
    { id: 'pricelist', name: 'Sync', icon: <RefreshCcw className="w-4 h-4" /> },
    { id: 'leads', name: 'Leads', icon: <Activity className="w-4 h-4" /> },
    { id: 'books', name: 'Books', icon: <Book className="w-4 h-4" /> },
  ] as const;

  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [editingBook, setEditingBook] = useState<EBook | 'new' | null>(null);
  const [isCreatingManualInvoice, setIsCreatingManualInvoice] = useState(false);
  const [receiptData, setReceiptData] = useState<{ sumInWords: string; amountReceived: string } | null>(null);
  const [printingReceiptInvoice, setPrintingReceiptInvoice] = useState<Invoice | null>(null);

  const copyTrackingLink = (invoiceNumber: string) => {
    const link = `${window.location.origin}/tracking?id=${invoiceNumber}`;
    navigator.clipboard.writeText(link);
    alert('✅ Tracking link copied to clipboard!');
  };

  const handleCreateManualOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceData: Partial<Invoice> = {
      clientName: formData.get('clientName') as string,
      productName: formData.get('productName') as string,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      totalKES: parseFloat(formData.get('totalKES') as string),
      isPaid: formData.get('isPaid') === 'on'
    };

    const result = await createManualInvoice(invoiceData);
    if (result.success) {
      setIsCreatingManualInvoice(false);
      window.location.reload(); // Refresh to show new invoice
    } else {
      alert('Error creating order: ' + JSON.stringify(result.error));
    }
  };

  useEffect(() => {
    if (activeTab === 'books') {
      fetchEBooks().then(setEbooks);
    }
  }, [activeTab]);

  const handleSaveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookData: Partial<EBook> = {
      title: formData.get('title') as string,
      author: formData.get('author') as string,
      description: formData.get('description') as string,
      priceKES: parseInt(formData.get('priceKES') as string),
      discountPriceKES: parseInt(formData.get('discountPriceKES') as string) || undefined,
      coverImage: formData.get('coverImage') as string,
      content: formData.get('content') as string,
      pdfUrl: formData.get('pdfUrl') as string || undefined,
    };

    let result;
    if (editingBook === 'new') {
      result = await createEBook(bookData);
    } else if (editingBook) {
      result = await updateEBook(editingBook.id, bookData);
    }

    if (result?.success) {
      setEditingBook(null);
      const updated = await fetchEBooks();
      setEbooks(updated);
    } else {
      alert('Error saving book: ' + JSON.stringify(result?.error));
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    const result = await deleteEBook(id);
    if (result.success) {
      setEbooks(ebooks.filter(b => b.id !== id));
    }
  };

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


  const runSeed = async () => {
    if (!window.confirm("Restore full inventory schema? This will create any missing phone models and reset baseline prices.")) return;

    setSeeding(true);
    try {
      console.log("🌱 Admin: Triggering Phone Pricelist Sync...");
      const result = await seedFullInventory();
      console.log("✅ Pricelist Sync Complete:", result);

      // Refresh local state to show new items
      // Assuming fetchPricelistData and fetchInventoryProducts are available or will be added
      // const newList = await fetchPricelistData();
      // onUpdatePricelist(newList);

      // const newProducts = await fetchInventoryProducts();
      console.log("✅ Seed Complete:", result);

      const message = result.productCount > 0
        ? `Success! Created ${result.productCount} new models and synchronized ${result.variantCount} prices.`
        : `Success! Price registry is already full. Synchronized ${result.variantCount} prices across all models.`;

      alert(message);
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Phone Pricelist Sync failed. Check connection.");
    } finally {
      setSeeding(false);
    }
  };

  const refreshLeads = async () => {
    setLoadingLeads(true);
    const data = await fetchSourcingRequests();
    setLeads(data);
    setLoadingLeads(false);
  };

  useEffect(() => {
    refreshLeads();
    const loadVisits = async () => {
      const count = await fetchVisitCount();
      setVisitCount(count);
    };
    loadVisits();
  }, []);

  const handlePrintInvoice = (inv: Invoice) => {
    setPrintingInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 100);
    // Note: We don't nullify printingInvoice immediately so the template stays rendered during print dialog.
    // The user will close the dialog and the site remains.
  };

  // Sync variations when editing starts
  useEffect(() => {
    if (editingProduct && typeof editingProduct === 'object') {
      setLocalVariations(editingProduct.variations || []);
    } else {
      setLocalVariations([]);
    }
  }, [editingProduct]);

  const addVariation = () => {
    setLocalVariations([...localVariations, { type: 'Color', name: '', priceKES: 0 }]);
  };

  const removeVariation = (index: number) => {
    setLocalVariations(localVariations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, updates: Partial<ProductVariation>) => {
    setLocalVariations(localVariations.map((v, i) => i === index ? { ...v, ...updates } : v));
  };

  const updateInvoiceStatus = async (id: string, newStatus: OrderStatus) => {
    const progress = getOrderProgress(newStatus);

    // 1. Optimistic Update
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status: newStatus, progress } : inv);
    onUpdateInvoices(updated);

    // 2. Persist to DB
    const result = await updateInvoiceStatusInDB(id, newStatus, progress);
    if (!result.success) {
      alert("⚠️ Service Sync Delayed: Status updated locally but database persistence failed. Check connection.");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const imageUrlsString = formData.get('imageUrls') as string;

    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      priceKES: parseInt(formData.get('priceKES') as string),
      discountPriceKES: formData.get('discountPriceKES') ? parseInt(formData.get('discountPriceKES') as string) : undefined,
      imageUrls: imageUrlsString ? imageUrlsString.split(',').map(u => u.trim()) : [],
      availability: formData.get('availability') as Availability,
      shippingDuration: formData.get('shippingDuration') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      stockCount: formData.get('stockCount') ? parseInt(formData.get('stockCount') as string) : 0,
      variations: localVariations,
      videoUrl: formData.get('videoUrl') as string,
    };

    console.log('🚀 Initiating Save Protocol:', productData);

    try {
      if (editingProduct === 'new') {
        const result = await createProduct(productData);
        if (result.success && result.id) {
          const newProduct: Product = {
            id: result.id,
            name: productData.name || '',
            priceKES: productData.priceKES || 0,
            imageUrls: productData.imageUrls || [],
            variations: localVariations,
            category: productData.category || 'Electronics',
            availability: productData.availability || Availability.IMPORT,
            shippingDuration: productData.shippingDuration || '',
            description: productData.description || '',
            stockCount: productData.stockCount || 0,
            videoUrl: productData.videoUrl || '',
            ...productData
          };
          onUpdateProducts([...products, newProduct]);
          setEditingProduct(null);
          alert("✅ Asset Registered in Global Inventory");
        } else {
          console.error('❌ Save Error:', result.error);
          alert("❌ Failed to register asset: " + (result.error?.message || "Check console for details"));
        }
      } else if (editingProduct && typeof editingProduct !== 'string') {
        const result = await updateProduct(editingProduct.id, productData);
        if (result.success) {
          onUpdateProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
          setEditingProduct(null);
          alert("✅ Specifications Refined & Synced");
        } else {
          console.error('❌ Update Error:', result.error);
          alert("❌ Failed to update specifications: " + (result.error?.message || "Check console for details"));
        }
      }
    } catch (err: any) {
      console.error('💥 Crash in handleSaveProduct:', err);
      alert("💥 System Crash during save: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to remove this item from inventory?')) {
      const result = await deleteProduct(id);
      if (result.success) {
        onUpdateProducts(products.filter(p => p.id !== id));
      }
    }
  };

  // Price Editing Handlers
  const handleOpenPriceEdit = (plId: string, capIdx: number) => {
    const item = pricelist.find(p => p.id === plId);
    if (item && item.capacities[capIdx]) {
      const cap = item.capacities[capIdx];
      setPriceEditUSD(cap.sourcePriceUSD?.toString() || '');
      setPriceEditKES(null);
      setPriceManualOverride(cap.isManualOverride || false);
      setEditingPrice({ plId, capIdx });
    }
  };

  const handlePriceUSDChange = async (value: string) => {
    setPriceEditUSD(value);
    const usd = parseFloat(value);

    if (!isNaN(usd) && usd > 0 && !priceManualOverride) {
      setPriceCalculating(true);
      try {
        const result = await calculateFinalPrice(usd);
        setPriceEditKES(result.totalKES);
      } catch (error) {
        console.error('Price calculation error:', error);
        setPriceEditKES(null);
      }
      setPriceCalculating(false);
    }
  };

  const handleSavePriceEdit = async () => {
    if (!editingPrice) return;

    const usd = parseFloat(priceEditUSD);
    if (isNaN(usd) || usd <= 0) {
      alert('Please enter a valid USD price');
      return;
    }

    setPriceSaving(true);

    try {
      const item = pricelist.find(p => p.id === editingPrice.plId);
      if (item && item.capacities[editingPrice.capIdx]) {
        const cap = item.capacities[editingPrice.capIdx];

        // 1. Persist to DB
        const result = await updatePricelistItem(
          cap.id, // Current capacity variant ID
          usd,
          priceManualOverride,
          priceEditKES || undefined
        );

        if (!result.success) throw result.error;

        // 2. Update local state for immediate feedback
        const updated = pricelist.map(p => {
          if (p.id === editingPrice.plId) {
            const newCaps = [...p.capacities];
            newCaps[editingPrice.capIdx] = {
              ...newCaps[editingPrice.capIdx],
              sourcePriceUSD: usd,
              currentPriceKES: priceEditKES || result.calculatedKES || newCaps[editingPrice.capIdx].currentPriceKES,
              isManualOverride: priceManualOverride,
              lastSynced: new Date().toLocaleString()
            };
            return { ...p, capacities: newCaps };
          }
          return p;
        });

        onUpdatePricelist(updated);
        setEditingPrice(null);
        setPriceEditUSD('');
        setPriceEditKES(null);
        alert('Price strategy cemented successfully!');
      }
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Failed to save price strategy. Check connection.');
    }

    setPriceSaving(false);
  };

  // Blog Management Handlers
  const handleSaveBlog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const blogData: Partial<BlogPost> = {
      title: formData.get('title') as string,
      excerpt: formData.get('excerpt') as string,
      content: formData.get('content') as string,
      imageUrl: formData.get('imageUrl') as string,
      category: formData.get('category') as string,
      author: formData.get('author') as string,
      date: formData.get('date') as string,
    };

    if (editingBlog === 'new') {
      const result = await createBlog(blogData);
      if (result.success && result.id) {
        onUpdateBlogs([{ ...blogData, id: result.id } as BlogPost, ...blogs]);
        setEditingBlog(null);
      }
    } else if (editingBlog && typeof editingBlog !== 'string') {
      const result = await updateBlog(editingBlog.id, blogData);
      if (result.success) {
        onUpdateBlogs(blogs.map(b => b.id === editingBlog.id ? { ...b, ...blogData } : b));
        setEditingBlog(null);
      }
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      const result = await deleteBlog(id);
      if (result.success) {
        onUpdateBlogs(blogs.filter(b => b.id !== id));
      }
    }
  };



  const handleUpdateConsultationStatus = async (id: string, status: ConsultationStatus) => {
    const result = await updateConsultation(id, status);
    if (result.success) {
      onUpdateConsultations(consultations.map(c => c.id === id ? { ...c, status } : c));
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to remove this client?')) {
      const result = await deleteClient(id);
      if (result.success) {
        onUpdateClients(clients.filter(c => c.id !== id));
      }
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
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    if (confirm('CRITICAL: This will permanently delete ALL phone models from your Shop Inventory (Pipe B). Your Price List (Pipe A) is safe. Continue?')) {
                      const { error } = await supabase
                        .from('products')
                        .delete()
                        .or('category.ilike.%Phone%,category.ilike.%Smartphone%,name.ilike.%iPhone%,name.ilike.%Galaxy%,name.ilike.%Samsung%,name.ilike.%Pixel%,name.ilike.%Google%,name.ilike.%Ultra%,name.ilike.%S20%,name.ilike.%S21%,name.ilike.%S22%,name.ilike.%S23%,name.ilike.%S24%,name.ilike.%S25%,name.ilike.%Plus%,name.ilike.%Note%,name.ilike.%Fold%,name.ilike.%Flip%,name.ilike.%Apple%,name.ilike.%GB%');

                      if (error) alert("Purge failed: " + error.message);
                      else {
                        alert("✅ Inventory Purged! Refreshing...");
                        window.location.reload();
                      }
                    }
                  }}
                  className="flex-1 md:flex-none bg-rose-50 text-rose-600 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest border border-rose-100 shadow-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Purge Legacy Models
                </button>
                <button
                  onClick={() => setEditingProduct('new')}
                  className="flex-1 md:flex-none btn-vibrant-teal px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New Shop Asset
                </button>
              </div>
            )}
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            {pricelist.length < 10 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-8 rounded-r-xl flex justify-between items-center shadow-lg">
                <div className="flex gap-6 items-center">
                  <div className="p-4 bg-amber-100 rounded-full text-amber-600">
                    <RefreshCcw className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-amber-700 uppercase tracking-tight">Phone Price List: Sync Required</h3>
                    <p className="text-sm font-bold text-amber-500 mt-1">
                      The market price registry for phones is currently empty or incomplete. <br />
                      <span className="text-amber-600 font-black">Note: This will ONLY restore phone prices and will NOT affect your Shop Inventory (golf clubs, kits, etc.)</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={runSeed}
                  disabled={seeding}
                  className="px-8 py-4 bg-amber-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                >
                  {seeding ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  {seeding ? 'Syncing Phones...' : 'RESTORE PHONE PRICE LIST'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Total Revenue', val: `KES ${(invoices.reduce((acc, inv) => acc + (inv.totalKES || 0), 0) / 1000000).toFixed(1)}M`, trend: '+14.2%', icon: <DollarSign className="text-emerald-500" />, bg: 'bg-emerald-50' },
                { label: 'Gross Profit', val: `KES ${(invoices.reduce((acc, inv) => acc + (inv.totalKES || 0) * 0.25, 0) / 1000000).toFixed(1)}M`, trend: '+18.5%', icon: <TrendingUp className="text-[#3D8593]" />, bg: 'bg-teal-50' },
                { label: 'Active Clients', val: clients.length.toString(), trend: '+5.4%', icon: <Activity className="text-[#FF9900]" />, bg: 'bg-orange-50' },
                { label: 'Total Visitors', val: visitCount.toLocaleString(), trend: 'Live Growth', icon: <Users className="text-indigo-500" />, bg: 'bg-indigo-50' }
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
                    <AreaChart data={revenueData}>
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
                      <Pie data={categoryData} innerRadius={80} outerRadius={120} paddingAngle={10} dataKey="value" stroke="none">
                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 mt-8">
                  {categoryData.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                        <span className="text-gray-400">{c.name}</span>
                      </div>
                      <span className="text-gray-900">{((c.value / Math.max(1, products.length)) * 100).toFixed(1)}%</span>
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
                          <button title="Remove Client" onClick={() => handleDeleteClient(client.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
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
            <div className="flex justify-between items-center px-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Order <span className="text-[#3D8593]">Control</span></h2>
              <button
                onClick={() => setIsCreatingManualInvoice(true)}
                className="px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-2 shadow-xl"
              >
                <Plus className="w-4 h-4" /> Create Manual Order
              </button>
            </div>

            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-12 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Order/Invoice</th>
                    <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">QTY</th>
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
                        <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">{inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'Date Unknown'}</p>
                      </td>
                      <td className="px-10 py-10">
                        <span className="bg-neutral-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black">×{inv.quantity || 1}</span>
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{inv.clientName}</p>
                            <p className="text-[9px] text-gray-400 font-medium mt-1">Ref: {inv.paystackReference || 'Manual Sync'}</p>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${inv.isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {inv.isPaid ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span className="text-[9px] font-black uppercase tracking-widest">{inv.isPaid ? 'Paid' : 'Unpaid'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatusInDB(inv.id, e.target.value as OrderStatus, getOrderProgress(e.target.value as OrderStatus))}
                          className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-teal-100"
                        >
                          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => copyTrackingLink(inv.invoiceNumber)}
                            className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"
                            title="Copy Tracking Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const printWin = window.open('', '', 'width=900,height=1000');
                              if (!printWin) return;
                              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";
                              printWin.document.write(`
                                <html>
                                  <head>
                                    <title>Invoice IG-${inv.invoiceNumber}</title>
                                    <style>
                                      body { font-family: 'Inter', sans-serif; padding: 60px; color: #1a1a1a; position: relative; }
                                      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.03; width: 80%; z-index: -1; }
                                      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
                                      .brand h1 { margin: 0; font-size: 32px; font-weight: 900; }
                                      .brand p { margin: 5px 0 0; font-size: 14px; font-weight: 500; color: #666; }
                                      .logo { width: 120px; }
                                      .meta { text-align: right; margin-top: 20px; }
                                      .meta p { margin: 5px 0; font-size: 14px; font-weight: 700; }
                                      .meta span { font-weight: 400; color: #666; margin-right: 10px; }
                                      .title { text-align: center; font-size: 24px; font-weight: 500; margin: 40px 0; letter-spacing: 1px; }
                                      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                                      th { background: #3d8593; color: white; padding: 15px; text-align: left; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
                                      td { padding: 20px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
                                      .total-row td { border: none; padding-top: 30px; font-size: 18px; font-weight: 900; text-align: right; }
                                      .terms { margin-top: 60px; border-top: 2px solid #000; pt-20; }
                                      .terms h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; }
                                      .terms p { font-size: 13px; color: #444; margin: 8px 0; line-height: 1.6; }
                                      .footer { margin-top: 100px; text-align: center; font-size: 12px; font-weight: 500; color: #999; }
                                    </style>
                                  </head>
                                  <body>
                                    <img src="${logoUrl}" class="watermark" />
                                    <div class="header">
                                      <div class="brand">
                                        <h1>LegitGrinder</h1>
                                        <p>+254791873538</p>
                                      </div>
                                      <img src="${logoUrl}" class="logo" />
                                    </div>
                                    <div class="meta">
                                      <p><span>Quote Date:</span> ${new Date(inv.date || inv.createdAt).toLocaleDateString('en-GB')}</p>
                                      <p><span>Client Details:</span> ${inv.clientName}</p>
                                      <p><span>Invoice No:</span> IG-${inv.invoiceNumber}</p>
                                    </div>
                                    <div class="title">${inv.productName} Invoice</div>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th style="width: 10%">QTY</th>
                                          <th style="width: 50%">Description</th>
                                          <th style="width: 20%">Unit Price</th>
                                          <th style="width: 20%">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td>${(inv.quantity || 1).toFixed(2)}</td>
                                          <td>${inv.productName}</td>
                                          <td>${(inv.totalKES / (inv.quantity || 1)).toLocaleString()}</td>
                                          <td>KES ${inv.totalKES.toLocaleString()}</td>
                                        </tr>
                                        <tr class="total-row">
                                          <td colspan="3">Total</td>
                                          <td style="border-bottom: 3px double #000; padding-bottom: 5px;">KES ${inv.totalKES.toLocaleString()}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div class="terms">
                                      <h2>Terms and Conditions</h2>
                                      <p>The total fee is all inclusive to Nairobi, the client will cater for delivery to their home/work location.</p>
                                      <p>Payment is done via mobile money/cash.</p>
                                      <p>Shipping duration via air(2 weeks) sea(30-45days)</p>
                                    </div>
                                    <div class="footer">LegitGrinder KE deals in imports</div>
                                  </body>
                                </html>
                              `);
                              printWin.document.close();
                              printWin.print();
                            }}
                            className="p-4 bg-teal-50 text-[#3D8593] rounded-2xl hover:bg-[#3D8593] hover:text-white transition-all"
                            title="Generate Elite Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintingReceiptInvoice(inv)}
                            className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"
                            title="Print Official Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const printWin = window.open('', '', 'width=500,height=400');
                              if (!printWin) return;
                              printWin.document.write(`
                                <html>
                                  <body style="font-family: sans-serif; padding: 20px; border: 2px dashed #000; width: 400px; margin: auto;">
                                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
                                      <h2 style="margin: 0;">LEGITGRINDER SHIPPING</h2>
                                      <p style="font-size: 10px; margin: 0;">TRACKING CODE: <strong>${inv.paystackReference || 'MANUAL-SYNC'}</strong></p>
                                    </div>
                                    <p><strong>TO:</strong> ${inv.clientName}</p>
                                    <p><strong>ITEM:</strong> ${inv.productName} (Qty: ${inv.quantity || 1})</p>
                                    <p><strong>REF:</strong> #${inv.invoiceNumber}</p>
                                    <div style="margin-top: 20px; text-align: center; font-size: 12px; font-weight: bold;">
                                      ${inv.status.toUpperCase()}
                                    </div>
                                    <div style="margin-top: 20px; border: 1px solid #000; height: 50px; display: flex; align-items: center; justify-content: center;">
                                      ||| |||| || ||||| ||| ||
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWin.document.close();
                              printWin.print();
                            }}
                            className="p-4 bg-neutral-900 text-white rounded-2xl hover:bg-teal-600 transition-all"
                            title="Print Shipping Label"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const msg = encodeURIComponent(`Hi ${inv.clientName}, I've received your payment (Ref: ${inv.paystackReference}). Your order for ${inv.productName} is now: ${inv.status}.`);
                              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                            }}
                            className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"
                            title="Quick Response (WhatsApp)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEADS MANAGEMENT TAB (PHASE 4) */}
        {
          activeTab === 'leads' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Sourcing <span className="text-[#3D8593]">Intelligence</span></h2>
                <button
                  onClick={refreshLeads}
                  disabled={loadingLeads}
                  className="px-6 py-3 bg-[#3D8593] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loadingLeads ? 'animate-spin' : ''}`} /> Refresh Nodes
                </button>
              </div>

              <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-100">
                      <th className="px-12 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Target Asset</th>
                      <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Client Protocol</th>
                      <th className="px-10 py-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Nodes & Logistics</th>
                      <th className="px-12 py-10 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-12 py-10">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-neutral-100 rounded-[1.2rem] flex items-center justify-center text-neutral-400 group-hover:bg-[#3D8593]/10 group-hover:text-[#3D8593] transition-all">
                              <Box className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-lg tracking-tight uppercase leading-none">{lead.productName}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-black text-[#3D8593] tracking-widest uppercase">Budget: KES {lead.targetBudgetKES?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-10">
                          <p className="font-bold text-sm text-gray-900 flex items-center gap-2"><User className="w-3.5 h-3.5 text-[#3D8593]" /> {lead.clientName}</p>
                          <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest italic">{lead.clientWhatsapp}</p>
                        </td>
                        <td className="px-10 py-10">
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${lead.shippingPreference === 'Air' ? 'bg-cyan-50 text-cyan-600' : 'bg-blue-50 text-blue-600'}`}>
                                {lead.shippingPreference} Freight
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${lead.urgency === 'High' ? 'bg-rose-50 text-rose-500' : 'bg-neutral-50 text-gray-400'}`}>
                                {lead.urgency} Urgency
                              </span>
                            </div>

                            {/* Shipping Calculator Data */}
                            <div className="space-y-1">
                              {lead.shippingPreference === 'Air' && lead.shippingWeight && (
                                <p className="text-[10px] font-black text-cyan-700 uppercase tracking-widest">Weight: {lead.shippingWeight} kg</p>
                              )}
                              {lead.shippingPreference === 'Sea' && lead.calculatedCBM && (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Volume: {lead.calculatedCBM.toFixed(4)} CBM</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase italic">Dim: {lead.packageLength || '?'}{'x'}{lead.packageWidth || '?'}{'x'}{lead.packageHeight || '?'} cm</p>
                                </div>
                              )}
                              {lead.estimatedShippingCost && (
                                <p className="text-[11px] font-black text-[#FF9900] uppercase tracking-widest">Est. Shipping: KES {lead.estimatedShippingCost.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-gray-300 uppercase italic">Type: {lead.itemType}</p>
                        </td>
                        <td className="px-12 py-10 text-right">
                          <select
                            value={lead.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await updateSourcingStatus(lead.id!, newStatus);
                              refreshLeads();
                            }}
                            className={`bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-teal-100 transition-all ${lead.status === 'completed' ? 'text-emerald-600 font-black' :
                              lead.status === 'contacted' ? 'text-amber-600 font-black' :
                                'text-neutral-400 font-bold'
                              }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="viewed">Viewed</option>
                            <option value="contacted">Contacted</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-12 py-20 text-center">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] italic">No active quest intelligence available.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {/* SHOP INVENTORY TAB (STOCK) */}
        {
          activeTab === 'products' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4" /> Decoupled Stock Manager
                </p>
                <p className="text-[9px] font-bold text-amber-600 mt-1">
                  Phones are managed in the <span className="font-black">SYNC</span> tab. This list is for accessories, special items, and legacy stock cleanup.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {products.map(p => (
                  <div key={p.id} className="bg-white rounded-[3.5rem] p-10 border border-neutral-100 shadow-2xl relative group overflow-hidden">
                    <div className="aspect-square rounded-[2.5rem] overflow-hidden mb-8 relative border border-neutral-50">
                      <SafeImage src={p.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
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
          )
        }

        {/* SYNC TOOLS TAB */}
        {
          activeTab === 'pricelist' && (
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
                  <div className="flex gap-4">
                    <button onClick={runSeed} disabled={seeding} className="px-10 py-5 bg-emerald-600 text-white rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 shadow-2xl hover:bg-emerald-700 transition-all">
                      {seeding ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {seeding ? 'Restoring Global Inventory...' : 'RESTORE PHONE MODELS'}
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Manual Price Management Mode Active</p>
                </div>
              </div>

              <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50">
                {pricelist.filter(item => item.brand.toLowerCase() === syncBrandFilter.toLowerCase() && item.modelName.toLowerCase().includes(adminSearchTerm.toLowerCase())).map(item => (
                  <div key={item.id} className="p-12 hover:bg-neutral-50/50 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <div>
                        <h4 className="text-3xl font-black text-gray-900 tracking-tight">{item.modelName}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] mt-2">{item.series}</p>
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
                              <button onClick={() => handleOpenPriceEdit(item.id, idx)} className="p-4 bg-neutral-50 rounded-2xl text-gray-300 hover:text-[#3D8593] shadow-inner">
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
          )
        }

        {/* CONSULTATIONS REGISTRY */}
        {
          activeTab === 'consultations' && (
            <div className="bg-white rounded-[4rem] border border-neutral-100 shadow-2xl overflow-hidden divide-y divide-neutral-50 animate-in fade-in duration-700">
              <div className="p-12 bg-neutral-50/30 flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight text-gray-900">Expert Booking Pipeline</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-4 py-1.5 rounded-full">{consultations.length} Active Requests</span>
              </div>
              {consultations.map(c => (
                <div key={c.id} className="p-12 flex flex-col xl:flex-row gap-12 hover:bg-neutral-50/20 transition-all border-b border-neutral-50 last:border-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-8">
                      <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-sm border border-white transition-all ${c.status === ConsultationStatus.PAID ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {c.status === ConsultationStatus.PAID ? <ShieldCheck className="w-10 h-10" /> : <User className="w-10 h-10" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{c.name}</h4>
                          {c.status === ConsultationStatus.PAID && (
                            <span className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">{c.whatsapp} • {c.email}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white/80 p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] mb-3 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Booked Timeline
                        </p>
                        <div className="flex items-end gap-3">
                          <p className="text-xl font-black text-gray-900 leading-none">{c.date}</p>
                          <span className="text-sm font-bold text-gray-300">at</span>
                          <p className="text-xl font-black text-gray-900 leading-none">{c.time}</p>
                        </div>
                      </div>
                      <div className="bg-white/80 p-8 rounded-[2rem] border border-neutral-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-3">Strategic Objective</p>
                        <p className="text-sm font-bold text-gray-600 leading-relaxed italic truncate">"{c.topic}"</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => {
                          const message = encodeURIComponent(
                            `Hi ${c.name}, your expert logistics consultation for "${c.topic}" is suggested for ${c.date} at ${c.time}.\n\n` +
                            `Please confirm if this works for you and complete the $15 (approx. KES 2,025) commitment fee to lock your slot.\n\n` +
                            `Once confirmed, the date will be locked in our master calendar.`
                          );
                          window.open(`https://wa.me/${c.whatsapp.replace(/\+/g, '')}?text=${message}`, '_blank');
                        }}
                        className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-emerald-100"
                      >
                        <MessageCircle className="w-4 h-4" /> Confirm & Request $15
                      </button>
                      {c.status === ConsultationStatus.PAID && (
                        <button className="px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed flex items-center gap-2 border border-indigo-100">
                          <Calendar className="w-4 h-4" /> Locked on Calendar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full xl:w-80 flex flex-col justify-center gap-6">
                    <div className="grid grid-cols-2 gap-3">
                      {[ConsultationStatus.PENDING, ConsultationStatus.DOABLE, ConsultationStatus.PAID, ConsultationStatus.CANCELLED].map(s => (
                        <button key={s} onClick={() => handleUpdateConsultationStatus(c.id, s)} className={`px-4 py-4 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all ${c.status === s ? 'bg-[#3D8593] text-white shadow-xl' : 'bg-white border border-neutral-100 text-gray-400'}`}>
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
          )
        }

        {/* CONTENT MANAGER */}
        {
          activeTab === 'content' && (
            <div className="grid md:grid-cols-2 gap-12 animate-in fade-in duration-700">
              {blogs.map(b => (
                <div key={b.id} className="bg-white rounded-[4rem] p-10 border border-neutral-100 shadow-2xl group relative overflow-hidden">
                  <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-8 relative">
                    <SafeImage src={b.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute top-6 right-6 flex gap-3">
                      <button onClick={() => setEditingBlog(b)} className="p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl hover:bg-white hover:scale-110 transition-all"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => handleDeleteBlog(b.id)} className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 hover:scale-110 transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest bg-teal-50 px-4 py-2 rounded-full">{b.category}</span>
                  <h3 className="text-3xl font-black text-gray-900 mt-6 mb-4 leading-tight">{b.title}</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 mb-8">{b.excerpt}</p>
                </div>
              ))}
              <button onClick={() => setEditingBlog('new')} className="aspect-video border-4 border-dashed border-neutral-100 rounded-[4rem] flex flex-col items-center justify-center text-neutral-200 hover:border-[#3D8593] hover:text-[#3D8593] transition-all group">
                <Plus className="w-16 h-16 mb-4 group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-black uppercase text-[12px] tracking-widest">New Intelligence Piece</span>
              </button>
            </div>
          )
        }

        {/* EBOOK MANAGEMENT */}
        {
          activeTab === 'books' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-4">Digital Assets</h2>
                  <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">eBook <span className="text-[#3D8593]">Library</span></h3>
                </div>
                <button
                  onClick={() => setEditingBook('new')}
                  className="px-8 h-16 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#3D8593] transition-all flex items-center gap-3 shadow-2xl"
                >
                  <Plus className="w-4 h-4" /> Add New eBook
                </button>
              </div>

              {editingBook && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" onClick={() => setEditingBook(null)} />
                  <div className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="h-2 bg-gradient-to-r from-[#3D8593] to-teal-200" />
                    <form onSubmit={handleSaveBook} className="p-12 md:p-20 overflow-y-auto max-h-[85vh] no-scrollbar">
                      <div className="flex justify-between items-start mb-16">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3D8593] mb-4">Book Configuration</h4>
                          <h5 className="text-4xl font-bold text-gray-900 tracking-tighter">
                            {editingBook === 'new' ? 'Publish New Title' : 'Edit Book Metadata'}
                          </h5>
                        </div>
                        <button type="button" onClick={() => setEditingBook(null)} className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Book Title</label>
                            <input name="title" defaultValue={editingBook !== 'new' ? editingBook.title : ''} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold focus:ring-4 focus:ring-teal-100 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Author / Knowledge Expert</label>
                            <input name="author" defaultValue={editingBook !== 'new' ? editingBook.author : ''} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold focus:ring-4 focus:ring-teal-100 transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Base Price (KES)</label>
                              <input name="priceKES" type="number" defaultValue={editingBook !== 'new' ? editingBook.priceKES : 0} required className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Sale Price (Optional)</label>
                              <input name="discountPriceKES" type="number" defaultValue={editingBook !== 'new' ? editingBook.discountPriceKES : ''} className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Cover Image URL</label>
                            <input name="coverImage" defaultValue={editingBook !== 'new' ? editingBook.coverImage : ''} required placeholder="https://..." className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">PDF Download URL (Optional)</label>
                            <input name="pdfUrl" defaultValue={editingBook !== 'new' ? editingBook.pdfUrl : ''} placeholder="https://..." className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Short Description</label>
                            <textarea name="description" defaultValue={editingBook !== 'new' ? editingBook.description : ''} rows={3} className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-bold resize-none" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-12">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Digital Content (HTML Recommended)</label>
                        <textarea name="content" defaultValue={editingBook !== 'new' ? editingBook.content : ''} rows={10} required className="w-full bg-neutral-50 border-none rounded-[2.5rem] px-8 py-6 font-medium leading-relaxed" placeholder="<h1>Chapter 1</h1><p>Welcome to the masterclass...</p>" />
                      </div>

                      <div className="mt-16 flex justify-end gap-6">
                        <button type="button" onClick={() => setEditingBook(null)} className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Cancel</button>
                        <button type="submit" className="px-12 py-6 bg-[#3D8593] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl shadow-teal-100">
                          Deploy Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ebooks.map(book => (
                  <div key={book.id} className="bg-white rounded-[3rem] p-8 border border-neutral-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 shadow-lg">
                      <SafeImage src={book.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{book.title}</h4>
                    <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-widest mb-6">by {book.author}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-neutral-50">
                      <div>
                        <p className="text-lg font-black text-gray-900">KES {(book.discountPriceKES || book.priceKES).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBook(book)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-[#3D8593] hover:text-white transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBook(book.id)} className="p-3 bg-neutral-50 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
      </main >

      {/* Product Edit/Add Modal */}
      {
        editingProduct && (
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><ImageIcon className="w-3.5 h-3.5" /> Image URLs (Comma separated)</label>
                      <input
                        name="imageUrls"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.imageUrls.join(', ') : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-4 focus:ring-teal-100 transition-all text-xs"
                        placeholder="https://image1.com, https://image2.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><Youtube className="w-3.5 h-3.5" /> Product Video URL (Optional)</label>
                      <input
                        name="videoUrl"
                        defaultValue={typeof editingProduct === 'object' ? editingProduct.videoUrl : ''}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-4 focus:ring-teal-100 transition-all text-xs"
                        placeholder="https://youtube.com/watch?v=..."
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
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2"><List className="w-3.5 h-3.5" /> Stock Count & Meta</label>
                      <div className="flex gap-2">
                        <input
                          name="stockCount"
                          type="number"
                          placeholder="Quantity"
                          defaultValue={typeof editingProduct === 'object' ? editingProduct.stockCount : 0}
                          className="flex-1 bg-neutral-50 border-none rounded-2xl px-4 py-3 text-xs font-bold"
                        />
                        <div className="flex-1 bg-neutral-50 border-none rounded-2xl px-4 py-3 text-xs font-bold text-gray-400 flex items-center">
                          {typeof editingProduct === 'object' ? editingProduct.variations.length : 0} Variants
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADVANCED VARIATION MANAGER */}
                <div className="bg-neutral-50 rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] flex items-center gap-2">
                      <Box className="w-3.5 h-3.5" /> High-Ticket Variations
                    </label>
                    <button
                      type="button"
                      onClick={addVariation}
                      className="px-4 py-2 bg-[#3D8593] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  </div>

                  {localVariations.length === 0 ? (
                    <p className="text-[10px] text-gray-400 font-bold italic py-4 text-center">No variations defined for this asset.</p>
                  ) : (
                    <div className="space-y-3">
                      {localVariations.map((v, idx) => (
                        <div key={idx} className="flex gap-3 animate-in slide-in-from-right-2 duration-300">
                          <select
                            value={v.type}
                            onChange={(e) => updateVariation(idx, { type: e.target.value as any })}
                            className="w-32 bg-white border border-neutral-100 rounded-xl px-3 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-teal-100"
                          >
                            <option value="Color">Color</option>
                            <option value="Capacity">Capacity</option>
                            <option value="Size">Size</option>
                            <option value="Design">Design</option>
                            <option value="Bundle">Bundle</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Name (e.g. Titanium Blue)"
                            value={v.name}
                            onChange={(e) => updateVariation(idx, { name: e.target.value })}
                            className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                          />
                          <input
                            type="text"
                            placeholder="Variation Image URL"
                            value={v.imageUrl || ''}
                            onChange={(e) => updateVariation(idx, { imageUrl: e.target.value })}
                            className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-100"
                          />
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">KES</span>
                            <input
                              type="number"
                              placeholder="Price"
                              value={v.priceKES || ''}
                              onChange={(e) => updateVariation(idx, { priceKES: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white border border-neutral-100 rounded-xl pl-10 pr-3 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariation(idx)}
                            className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
        )
      }

      {/* PRICE EDIT MODAL */}
      {
        editingPrice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-[#3D8593]" />

              <div className="mb-8">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Adjust Strategy</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Live Currency Sync & Margin Calc
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3">
                    <DollarSign className="w-3.5 h-3.5" /> Source Base Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      autoFocus
                      value={priceEditUSD}
                      onChange={(e) => handlePriceUSDChange(e.target.value)}
                      className="w-full bg-neutral-50 border-none rounded-[2rem] pl-10 pr-6 py-5 text-xl font-black focus:ring-4 focus:ring-teal-100 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] transition-all bg-neutral-50 border border-neutral-100`}>
                  <div className="flex justify-between items-start mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <RefreshCcw className="w-3.5 h-3.5" /> Calculated Output
                    </label>
                    <button
                      onClick={() => setPriceManualOverride(!priceManualOverride)}
                      className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${priceManualOverride ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-neutral-200 hover:border-gray-300'}`}
                    >
                      {priceManualOverride ? 'Manual Mode Active' : 'Auto-Sync Mode'}
                    </button>
                  </div>

                  {priceCalculating ? (
                    <div className="flex items-center gap-2 text-teal-600 font-medium py-2">
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      <span className="text-xs uppercase tracking-widest">Calculating...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      {priceManualOverride ? (
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-900 font-black text-sm">KES</span>
                          <input
                            type="number"
                            value={priceEditKES || ''}
                            onChange={(e) => setPriceEditKES(parseFloat(e.target.value))}
                            className="w-full bg-white border-2 border-orange-100 rounded-2xl pl-12 pr-4 py-3 font-black text-2xl text-gray-900 focus:outline-none focus:border-orange-300"
                          />
                        </div>
                      ) : (
                        <p className="text-4xl font-black text-gray-900 tracking-tighter">
                          KES {(priceEditKES || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {!priceManualOverride && (
                    <p className="text-[9px] font-bold text-gray-400 mt-4 leading-relaxed">
                      Includes flat logistics fee ($20 + 3.5%) + service fee. Strategy auto-rounds up.
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleSavePriceEdit}
                    disabled={priceSaving || priceCalculating}
                    className="flex-1 py-5 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {priceSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {priceSaving ? 'Syncing...' : 'Save Strategy'}
                  </button>
                  <button
                    onClick={() => setEditingPrice(null)}
                    disabled={priceSaving}
                    className="px-8 py-5 bg-white border border-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-neutral-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* BLOG EDIT MODAL */}
      {
        editingBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-[#3D8593]" />
              <div className="absolute top-0 right-0 p-8 z-10">
                <button
                  onClick={() => setEditingBlog(null)}
                  className="p-2 bg-white rounded-full hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="h-full flex flex-col">
                <div className="mb-6 shrink-0">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                    {editingBlog === 'new' ? 'New Intelligence Piece' : 'Edit Intelligence'}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Content Management System
                  </p>
                </div>

                <form onSubmit={handleSaveBlog} className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar pb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5" /> Headline / Title
                    </label>
                    <input
                      required
                      name="title"
                      defaultValue={editingBlog !== 'new' ? editingBlog.title : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all"
                      placeholder="Enter article title..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                        <Tag className="w-3.5 h-3.5" /> Category
                      </label>
                      <select
                        name="category"
                        defaultValue={editingBlog !== 'new' ? editingBlog.category : 'Tech Insights'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      >
                        <option value="Tech Insights">Tech Insights</option>
                        <option value="Market Analysis">Market Analysis</option>
                        <option value="Product Reviews">Product Reviews</option>
                        <option value="Company News">Company News</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                        <User className="w-3.5 h-3.5" /> Author
                      </label>
                      <input
                        name="author"
                        defaultValue={editingBlog !== 'new' ? editingBlog.author : 'Admin'}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <ImageIcon className="w-3.5 h-3.5" /> Cover Image URL
                    </label>
                    <input
                      required
                      name="imageUrl"
                      defaultValue={editingBlog !== 'new' ? editingBlog.imageUrl : ''}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <AlignLeft className="w-3.5 h-3.5" /> Short Excerpt
                    </label>
                    <textarea
                      required
                      name="excerpt"
                      defaultValue={editingBlog !== 'new' ? editingBlog.excerpt : ''}
                      rows={2}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-medium text-sm focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                      placeholder="Brief summary for the card view..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5" /> Full Article Content
                    </label>
                    <textarea
                      required
                      name="content"
                      defaultValue={editingBlog !== 'new' ? editingBlog.content : ''}
                      rows={12}
                      className="w-full bg-neutral-50 border-none rounded-3xl px-8 py-6 font-medium text-base focus:ring-4 focus:ring-teal-100 transition-all resize-none leading-relaxed"
                      placeholder="Write your article content here..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4 shrink-0">
                    <button
                      type="submit"
                      className="flex-1 py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all"
                    >
                      {editingBlog === 'new' ? 'Publish Piece' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                      className="px-10 py-6 bg-neutral-100 text-gray-400 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-neutral-200 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* HIDDEN PRINT TEMPLATE */}
      {
        printingInvoice && (
          <div id="printable-invoice" className="hidden print:block fixed inset-0 z-[-1] bg-white p-12 text-black">
            <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">LEGIT GRINDER</h1>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Official Sales Invoice / Ship Label</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">#{printingInvoice.invoiceNumber}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Consignee Details</p>
                <p className="text-2xl font-black mb-2">{printingInvoice.clientName}</p>
                <p className="text-sm font-bold text-gray-600 mb-1">{printingInvoice.email}</p>
                <p className="text-sm font-bold text-gray-600">{printingInvoice.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Shipping Destination</p>
                <p className="text-lg font-bold mb-2">{printingInvoice.location}</p>
                <p className="text-[10px] font-black uppercase py-2 px-4 bg-black text-white rounded inline-block">
                  Priority Fulfillment
                </p>
              </div>
            </div>

            <div className="border-t-2 border-neutral-100 pt-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest">Article Description</th>
                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-100">
                    <td className="py-6">
                      <p className="text-lg font-black uppercase">{printingInvoice.productName}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Standard Legit Assurance Warranty Included</p>
                    </td>
                    <td className="py-6 text-right">
                      <p className="text-xl font-black">KES {printingInvoice.totalKES?.toLocaleString()}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-12 flex justify-between items-end border-t-2 border-black pt-8">
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Authenticator Signature</p>
                <div className="w-48 h-12 border-b-2 border-neutral-200"></div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status</p>
                <p className="text-xl font-black uppercase tracking-widest">{printingInvoice.status}</p>
              </div>
            </div>

            <div className="mt-20 pt-8 border-t border-dashed border-gray-200 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 italic">Authenticity Guaranteed by LEGIT GRINDER • Logistics Dept</p>
            </div>
          </div>
        )
      }

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 20px;
          }
        }
      `}</style>
      {/* MANUAL INVOICE CREATION MODAL */}
      {isCreatingManualInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 relative border border-white/20">
            <button
              onClick={() => setIsCreatingManualInvoice(false)}
              className="absolute top-10 right-10 p-4 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="mb-12">
              <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-4 uppercase">Direct <span className="text-[#3D8593]">Protocol</span></h3>
              <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-[0.3em]">Manual Entry & Logistics Initialization</p>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Client Full Name</label>
                  <input required name="clientName" className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all placeholder:text-neutral-200" placeholder="e.g. Dennis Munga" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Product Specification</label>
                  <input required name="productName" className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all placeholder:text-neutral-200" placeholder="e.g. M3 Pro MacBook Pro 14" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Quantity</label>
                  <input required type="number" name="quantity" defaultValue="1" className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 ml-2">Total Amount (KES)</label>
                  <input required type="number" name="totalKES" className="w-full bg-neutral-50 border-none rounded-2xl px-8 py-5 font-bold text-lg focus:ring-4 focus:ring-teal-100 transition-all placeholder:text-neutral-200" placeholder="45000" />
                </div>
              </div>

              <div className="flex items-center gap-4 bg-teal-50/50 p-6 rounded-3xl border border-teal-100/50">
                <input type="checkbox" name="isPaid" id="isPaid" className="w-6 h-6 rounded-lg border-teal-200 text-[#3D8593] focus:ring-[#3D8593]" />
                <label htmlFor="isPaid" className="font-bold text-sm text-gray-600">Mark as Paid Immediately</label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreatingManualInvoice(false)}
                  className="flex-1 py-6 bg-neutral-100 text-gray-400 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-6 bg-[#3D8593] text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-[0_20px_40px_rgba(61,133,147,0.3)] shadow-teal-100"
                >
                  Initialize Logistics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT DATA CAPTURE MODAL */}
      {printingReceiptInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative border border-white/20">
            <button
              onClick={() => setPrintingReceiptInvoice(null)}
              className="absolute top-8 right-8 p-3 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-all shadow-sm"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">Elite <span className="text-rose-500">Receipting</span></h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Order Ref: LG-{printingReceiptInvoice.invoiceNumber}</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sumInWords = formData.get('sumInWords') as string;
              const amountReceived = formData.get('amountReceived') as string;
              const balance = formData.get('balance') as string;
              const transactionRef = formData.get('transactionRef') as string;

              const inv = printingReceiptInvoice;
              const printWin = window.open('', '', 'width=900,height=800');
              if (!printWin) return;
              const logoUrl = "https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg";

              printWin.document.write(`
                <html>
                  <head>
                    <title>Receipt LG-${inv.invoiceNumber}</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
                      .container { border: 1px solid #ccc; padding: 40px; position: relative; }
                      .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); opacity: 0.05; width: 60%; z-index: -1; }
                      .header-logo { text-align: center; margin-bottom: 20px; }
                      .header-logo img { width: 100px; }
                      .contact-bar { display: flex; justify-content: space-between; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 10px 0; font-size: 11px; margin-bottom: 30px; font-weight: 600; }
                      .receipt-label { background: black; color: white; display: inline-block; padding: 5px 20px; font-size: 14px; font-weight: 900; margin-bottom: 40px; letter-spacing: 2px; text-transform: uppercase; }
                      .top-meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
                      .field { margin-bottom: 25px; display: flex; align-items: flex-end; font-size: 15px; }
                      .field label { font-weight: 500; min-width: 140px; }
                      .field div { border-bottom: 1px solid #999; flex: 1; margin-left: 10px; padding: 3px 10px; font-weight: 700; font-style: italic; }
                      .financial-summary { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; }
                      .summary-table { border-collapse: collapse; width: 250px; }
                      .summary-table td { border: 1px solid #ccc; padding: 10px; font-size: 13px; font-weight: 500; }
                      .summary-table .val { text-align: right; font-weight: 900; }
                      .signature { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; font-size: 12px; font-weight: 700; }
                      .invoice-ref { text-align: right; font-size: 13px; font-weight: 700; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <img src="${logoUrl}" class="watermark" />
                      <div class="header-logo">
                        <img src="${logoUrl}" />
                      </div>
                      <div class="contact-bar">
                        <div>Email: Mungaimports@gmail.com</div>
                        <div>Socials: LegitGrinder Ke</div>
                        <div>Phone: +254 791873538</div>
                      </div>
                      <center><div class="receipt-label">RECEIPT</div></center>
                      
                      <div class="top-meta">
                        <div class="field" style="width: 45%"><label>Date:</label> <div>${new Date().toLocaleDateString('en-GB')}</div></div>
                        <div class="field" style="width: 45%"><label>Receipt No:</label> <div>LG-${inv.invoiceNumber}</div></div>
                      </div>

                      <div class="field"><label>Received From:</label> <div>${inv.clientName}</div></div>
                      <div class="field"><label>The sum of money:</label> <div>${sumInWords}</div></div>
                      <div class="field"><label>REF:</label> <div>${transactionRef || inv.paystackReference || 'MANUAL-ENTRY'}</div></div>
                      <div class="field"><label>Being Payment of:</label> <div>${inv.productName}</div></div>

                      <div class="financial-summary">
                        <table class="summary-table">
                          <tr><td>Amount received:</td> <td class="val" style="color: #3d8593;">KES ${parseFloat(amountReceived).toLocaleString()}</td></tr>
                          <tr><td>Balance:</td> <td class="val" style="color: #ef4444;">KES ${parseFloat(balance).toLocaleString()}</td></tr>
                          <tr><td style="background: #f9f9f9;">Total:</td> <td class="val" style="background: #f9f9f9; color: #3d8593;">KES ${inv.totalKES.toLocaleString()}</td></tr>
                        </table>
                        
                        <div>
                          <div class="invoice-ref">Invoice No: IG-${inv.invoiceNumber}</div>
                          <div style="margin-top: 40px;" class="signature">
                            Dennis Munga<br/>
                            Recieved/Approved By:
                          </div>
                        </div>
                      </div>
                    </div>
                  </body>
                </html>
              `);
              printWin.document.close();
              setTimeout(() => {
                printWin.print();
                setPrintingReceiptInvoice(null);
              }, 500);
            }} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Sum in Words</label>
                <input required name="sumInWords" placeholder="e.g. Fifty thousand three hundred only" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Transaction Reference (e.g. M-Pesa Code)</label>
                <input name="transactionRef" defaultValue={printingReceiptInvoice.paystackReference || ''} placeholder="Paste transaction code here..." className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all placeholder:text-neutral-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Amount Received</label>
                  <input required name="amountReceived" type="number" defaultValue={printingReceiptInvoice.totalKES} className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 ml-2">Balance Due</label>
                  <input required name="balance" type="number" defaultValue="0" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-rose-100 transition-all" />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-rose-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-rose-100"
              >
                Generate Print Preview
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
