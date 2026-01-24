
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingBag, Users, TrendingUp, Plus, RefreshCcw, Zap, 
  Settings, ShieldAlert, Calendar, Clock, Box, Tag, Smartphone, CheckCircle2, 
  Search, ShieldCheck, Link as LinkIcon, Image as ImageIcon, Trash2, Edit3, Save, ExternalLink,
  FileText, Printer, ChevronRight, X
} from 'lucide-react';
import { syncBackMarketPrices } from '../services/scraper';
import { PricelistItem, Product, Origin, Order, OrderStatus, ShippingMode } from '../types';
import { PHONE_MODELS_SCHEMA, STATUS_SEQUENCE } from '../constants';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'clients' | 'pricelist' | 'products'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'iPhone 15 Pro', priceKES: 145000, origin: Origin.USA, category: 'Electronics', image: 'https://picsum.photos/seed/lg-1/800/1000', description: 'Premium condition', stockStatus: 'In Stock' }
  ]);
  const [orders, setOrders] = useState<Order[]>([
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
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  const [showDocModal, setShowDocModal] = useState<{type: 'invoice' | 'label', order: Order} | null>(null);

  useEffect(() => {
    if (pricelist.length === 0) {
      const initialList: PricelistItem[] = [];
      Object.entries(PHONE_MODELS_SCHEMA).forEach(([brand, models]) => {
        models.forEach(m => {
          initialList.push({
            id: Math.random().toString(36).substr(2, 9),
            modelName: m.name,
            brand: brand as any,
            series: m.series,
            capacities: m.capacities.map(c => ({
              capacity: c,
              sourcePriceUSD: 0,
              currentPriceKES: 0,
              previousPriceKES: 0,
              lastSynced: 'Never',
              isManualOverride: false
            })),
            syncAlert: false,
            sourceUrl: ''
          });
        });
      });
      setPricelist(initialList);
    }
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const newData = await syncBackMarketPrices(pricelist);
      setPricelist(newData);
      setLastSyncTime(new Date().toLocaleTimeString());
    } finally {
      setIsSyncing(false);
    }
  };

  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
  };

  const renderOrderRow = (order: Order) => {
    const statusIdx = STATUS_SEQUENCE.indexOf(order.status);
    const progress = ((statusIdx + 1) / STATUS_SEQUENCE.length) * 100;

    return (
      <div key={order.id} className="p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 hover:bg-neutral-50/50 transition-all group border-b border-neutral-50">
        <div className="flex items-center gap-6 min-w-[250px]">
          <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-white font-black text-xs">
            {order.id.split('-')[1]}
          </div>
          <div>
            <h4 className="font-bold text-neutral-900">{order.clientName}</h4>
            <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">{order.productName}</p>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">{order.status}</span>
            <span className="text-[9px] font-black uppercase text-neutral-900 tracking-widest">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FF9900] transition-all duration-1000" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDocModal({ type: 'invoice', order })}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[#FF9900] hover:text-[#FF9900] transition-all"
          >
            <FileText className="w-3.5 h-3.5" /> Invoice
          </button>
          <button 
            onClick={() => setShowDocModal({ type: 'label', order })}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[#FF9900] hover:text-[#FF9900] transition-all"
          >
            <Tag className="w-3.5 h-3.5" /> Label
          </button>
          
          <select 
            value={order.status}
            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
            className="bg-neutral-900 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-black transition-all"
          >
            {STATUS_SEQUENCE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const renderDocModal = () => {
    if (!showDocModal) return null;
    const { type, order } = showDocModal;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-10 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50">
            <h3 className="text-xl font-bold tracking-tight-custom uppercase">
              {type === 'invoice' ? 'Official Invoice' : 'Shipping Label'}
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.print()}
                className="p-3 bg-neutral-900 text-white rounded-xl hover:bg-black transition-all"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowDocModal(null)}
                className="p-3 bg-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-300 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-16 overflow-y-auto max-h-[70vh]" id="printable-area">
            {type === 'invoice' ? (
              <div className="space-y-12">
                <div className="flex justify-between items-start">
                  <div>
                    <img src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg" className="h-12 w-auto grayscale rounded-xl mb-6" alt="Logo" />
                    <h2 className="text-2xl font-black">LegitGrinder Logistics</h2>
                    <p className="text-neutral-400 text-sm">Nairobi CBD, Kenya</p>
                    <p className="text-neutral-400 text-sm">+254 791 873 538</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-4xl font-black text-neutral-200 uppercase mb-4">Invoice</h1>
                    <p className="font-bold text-neutral-900">{order.id}</p>
                    <p className="text-neutral-400 text-sm">Date: {order.datePlaced}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-12 border-t border-neutral-100">
                  <div>
                    <p className="text-[10px] font-black uppercase text-neutral-300 tracking-widest mb-4">Billed To</p>
                    <p className="font-bold text-neutral-900">{order.clientName}</p>
                    <p className="text-neutral-500 text-sm">{order.clientEmail}</p>
                    <p className="text-neutral-500 text-sm">{order.clientLocation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-neutral-300 tracking-widest mb-4">Payment Info</p>
                    <p className="font-bold text-[#FF9900]">Status: {order.isPaid ? 'PAID' : 'PENDING'}</p>
                    <p className="text-neutral-500 text-sm">Via: Mpesa/Direct Bank</p>
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="py-4 text-[10px] font-black uppercase text-neutral-400">Description</th>
                      <th className="py-4 text-[10px] font-black uppercase text-neutral-400 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    <tr>
                      <td className="py-6">
                        <p className="font-bold">{order.productName}</p>
                        <p className="text-xs text-neutral-400">Import Sourcing Fee ({order.origin})</p>
                      </td>
                      <td className="py-6 text-right font-bold text-lg">KES {order.buyingPriceKES.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-6">Shipping & Logistics ({order.mode})</td>
                      <td className="py-6 text-right font-bold">KES {order.shippingFeeKES.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-6">Service & Facilitation Fee</td>
                      <td className="py-6 text-right font-bold">KES {order.serviceFeeKES.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-neutral-900">
                      <td className="py-8 font-black text-xl uppercase">Total Amount</td>
                      <td className="py-8 text-right font-black text-2xl text-[#FF9900]">KES {order.totalCostKES.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="border-4 border-black p-12 space-y-10 rounded-2xl">
                <div className="flex justify-between items-center border-b-4 border-black pb-8">
                  <div className="text-4xl font-black italic">LEGITGRINDER</div>
                  <div className="bg-black text-white px-6 py-2 rounded-lg font-black text-xl uppercase">{order.mode}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-10">
                  <div className="border-r-2 border-black pr-10">
                    <p className="text-xs font-black uppercase mb-4">From:</p>
                    <p className="font-black text-lg">LegitGrinder Agent</p>
                    <p className="text-sm font-bold uppercase">{order.origin} WAREHOUSE</p>
                    <p className="text-xs mt-2 italic">Ref: {order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase mb-4">To:</p>
                    <p className="font-black text-2xl uppercase">{order.clientName}</p>
                    <p className="font-bold text-lg">{order.clientLocation}</p>
                    <p className="text-sm">{order.clientPhone}</p>
                  </div>
                </div>

                <div className="pt-10 border-t-2 border-black flex justify-between items-end">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase">Weight:</p>
                    <p className="font-black text-xl">{order.weightKg || '0.5'} KG</p>
                    <p className="text-[10px] font-black uppercase mt-4">Dimensions:</p>
                    <p className="font-bold">{order.dimensions || 'Standard Pouch'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 h-12 bg-neutral-200 mb-2 relative flex items-center justify-center overflow-hidden">
                       <div className="flex gap-1 h-full w-full">
                          {[...Array(40)].map((_,i) => <div key={i} className="bg-black w-1 h-full" style={{opacity: Math.random()}}></div>)}
                       </div>
                    </div>
                    <p className="text-[10px] font-black font-mono tracking-[0.5em]">{order.id}</p>
                  </div>
                </div>
                <div className="bg-black text-white text-center py-4 font-black uppercase tracking-widest rounded-xl">
                   Do Not Open if Seal is Broken
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* Added missing renderPricelistAutomation function to manage the price scraper UI */
  const renderPricelistAutomation = () => {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold tracking-tight-custom">Price Scraper Control</h3>
            <p className="text-neutral-400 text-xs font-light mt-1 uppercase tracking-widest">Connect specific BackMarket URLs to sync live prices.</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`bg-neutral-900 text-white px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${isSyncing ? 'opacity-50' : 'hover:bg-black hover:scale-105 active:scale-95'}`}
          >
            {isSyncing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSyncing ? 'Syncing...' : 'Sync All URLs'}
          </button>
        </div>

        <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/30">
             <div className="flex items-center gap-4">
                <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Last Successful Sync: {lastSyncTime}</span>
             </div>
             <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                <input 
                 type="text" 
                 placeholder="Search models..."
                 className="pl-12 pr-6 py-3 bg-white border border-neutral-100 rounded-xl text-xs outline-none focus:border-[#FF9900]/30 transition-all w-64"
                />
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50">
                  <th className="p-8 text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-50">Device Model</th>
                  <th className="p-8 text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-50">BackMarket URL</th>
                  <th className="p-8 text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-50">Sync Status</th>
                  <th className="p-8 text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-50">Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {pricelist.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/30 transition-colors group">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase ${
                          item.brand === 'iphone' ? 'bg-blue-50 text-blue-600' : 
                          item.brand === 'samsung' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {item.brand.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{item.modelName}</p>
                          <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">{item.series}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="relative group/input max-w-xs">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 group-hover/input:text-[#FF9900] transition-colors" />
                        <input 
                          type="text"
                          value={item.sourceUrl || ''}
                          onChange={(e) => {
                            const newUrl = e.target.value;
                            setPricelist(prev => prev.map(p => p.id === item.id ? { ...p, sourceUrl: newUrl } : p));
                          }}
                          placeholder="Target URL..."
                          className="w-full bg-neutral-50 border border-transparent rounded-xl pl-10 pr-4 py-3 text-[11px] outline-none focus:bg-white focus:border-[#FF9900]/30 transition-all"
                        />
                      </div>
                    </td>
                    <td className="p-8">
                      {item.syncAlert ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <ShieldAlert className="w-3 h-3" /> Error
                         </span>
                      ) : (
                        item.sourceUrl ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3" /> Monitoring
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                             Standby
                          </span>
                        )
                      )}
                    </td>
                    <td className="p-8">
                      {item.sourceUrl && (
                        <a 
                          href={item.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 bg-white border border-neutral-100 rounded-xl text-neutral-300 hover:text-[#FF9900] hover:border-[#FF9900] transition-all inline-block"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
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

  return (
    <div className="flex min-h-screen bg-neutral-50 selection:bg-neutral-900 selection:text-white font-['Instrument_Sans']">
      <aside className="w-72 bg-white border-r border-neutral-100 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-10 flex items-center space-x-4">
          <div className="bg-neutral-900 p-3 rounded-[1.2rem] text-white shadow-xl shadow-neutral-100 hover:rotate-12 transition-transform">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight-custom">Admin Hub</span>
        </div>
        <nav className="flex-1 px-6 py-4 space-y-2">
          {[
            { id: 'overview', name: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'orders', name: 'Order Logs', icon: <Calendar className="w-4 h-4" /> },
            { id: 'pricelist', name: 'Price Scraper', icon: <Tag className="w-4 h-4" /> },
            { id: 'products', name: 'Shop Manager', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'clients', name: 'Clients', icon: <Users className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center space-x-4 px-6 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-neutral-900 text-white shadow-2xl shadow-neutral-200 translate-x-2' 
                  : 'text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-10 lg:p-20 overflow-y-auto">
        <header className="flex justify-between items-start mb-16 animate-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-bold tracking-tight-custom capitalize">{activeTab.replace('orders', 'Order Management')}</h1>
            <p className="text-neutral-400 font-light mt-1 uppercase text-[10px] tracking-[0.2em]">LegitGrinder Logistics Control</p>
          </div>
        </header>

        {activeTab === 'orders' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-neutral-50 flex justify-between items-center">
                   <h3 className="text-xl font-bold">Active Shipments</h3>
                   <div className="flex gap-4">
                      <button className="px-6 py-3 bg-neutral-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all">Export Report</button>
                   </div>
                </div>
                <div className="divide-y divide-neutral-50">
                   {orders.map(renderOrderRow)}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'pricelist' && renderPricelistAutomation()}
        {activeTab === 'products' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold tracking-tight-custom">Shop Catalog</h3>
              <button className="btn-brand bg-[#FF9900] text-white px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3">
                <Plus className="w-4 h-4" /> New Product
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-40 italic font-light text-center py-20">
               Updating shop inventory logic...
            </div>
          </div>
        )}
        
        {activeTab !== 'pricelist' && activeTab !== 'orders' && activeTab !== 'products' && (
          <div className="h-[500px] bg-white rounded-[3rem] border border-neutral-100 flex flex-col items-center justify-center text-center opacity-20 animate-in zoom-in-95 duration-1000">
            <LayoutDashboard className="w-16 h-16 mb-8 relative z-10" />
            <p className="text-xl font-light italic">Module in standby mode.</p>
          </div>
        )}
      </main>
      {renderDocModal()}
    </div>
  );
};

export default AdminDashboard;
