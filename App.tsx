import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Calculators from './pages/Calculators';
import Tracking from './pages/Tracking';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Pricelist from './pages/Pricelist';
import Consultancy from './pages/Consultancy';
import Collaboration from './pages/Collaboration';
import MyOrders from './pages/MyOrders';
import ProductDetails from './pages/ProductDetails';
import Contact from './pages/Contact';
import AIAssistant from './components/AIAssistant';
import { supabase } from './src/lib/supabase';
import {
  Smartphone, Package, Globe, HelpCircle, Instagram, Youtube, Mail, MapPin,
  Plus, ArrowUpRight, Box, Clock, ChevronRight, CheckCircle2
} from 'lucide-react';
import { STATUS_SEQUENCE } from './constants';
import { OrderStatus } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setCurrentPage('home');
  };

  const mockUserOrders = [
    {
      id: 'LG-9821',
      product: 'iPhone 15 Pro Max',
      status: OrderStatus.SHIPPING,
      date: '2024-05-10',
      updates: [
        { status: OrderStatus.RECEIVED_BY_AGENT, date: '2024-05-10', location: 'USA Warehouse' },
        { status: OrderStatus.SHIPPING, date: '2024-05-12', location: 'Transit to Kenya' }
      ]
    }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} onNavigate={setCurrentPage} />;
      case 'signup': return <Signup onSignupSuccess={handleLoginSuccess} />;
      case 'pricelist': return <Pricelist />;
      case 'collaboration': return <Collaboration />;
      case 'my-orders': return <MyOrders />;
      case 'contact': return <Contact />;
      case 'product-details': return selectedProductId ? <ProductDetails productId={selectedProductId} onNavigate={setCurrentPage} /> : <Home onNavigate={setCurrentPage} />;
      case 'shop': return (
        <div className="py-24 px-4 max-w-7xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-[#FF9900]/5 rounded-[1.5rem] mb-8 border border-[#FF9900]/10">
            <Smartphone className="w-8 h-8 text-[#FF9900]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-medium mb-6 tracking-tight-custom text-neutral-900 leading-tight">Elite <span className="italic heading-accent text-neutral-400">Inventory.</span></h1>
          <p className="text-neutral-500 mb-20 max-w-xl mx-auto text-lg font-light leading-relaxed">Vetted tech and industrial machinery ready for deployment in Kenya.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {products.length > 0 ? products.map(product => (
              <div
                key={product.id}
                className="group flex flex-col cursor-pointer text-left"
                onClick={() => {
                  setSelectedProductId(product.id);
                  setCurrentPage('product-details');
                }}
              >
                <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden rounded-[2.5rem] mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-700">
                  <img src={product.image || `https://picsum.photos/seed/${product.id}/800/1000`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" alt={product.name} />
                  <div className={`absolute top-6 right-6 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${product.inventory_quantity > 0 ? 'bg-[#3B8392] text-white' : 'bg-red-500 text-white'}`}>
                    {product.inventory_quantity > 0 ? `In Stock (${product.inventory_quantity})` : 'Out of Stock'}
                  </div>
                  {product.discount_price > 0 && (
                    <div className="absolute top-6 left-6 bg-[#FF9900] text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                      Sale Impact
                    </div>
                  )}
                </div>
                <div className="px-2">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-2xl font-medium text-neutral-900 group-hover:text-[#FF9900] transition-colors tracking-tight-custom">{product.name}</h3>
                    <div className="p-2 bg-neutral-50 rounded-xl group-hover:bg-[#FF9900] group-hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-6 font-light leading-relaxed line-clamp-2">{product.description || 'Direct import from verified vendors in the USA and China.'}</p>
                  <div className="flex justify-between items-end border-t border-neutral-50 pt-6">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest block mb-1">Buy Price</span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-neutral-900">KES {(product.discount_price > 0 ? product.discount_price : product.priceKES)?.toLocaleString()}</span>
                        {product.discount_price > 0 && (
                          <span className="text-sm font-bold text-neutral-400 line-through decoration-red-400">KES {product.priceKES?.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <button className="btn-brand bg-neutral-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-neutral-100">Order Now</button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-neutral-400 font-light italic">No products available in the shop yet.</div>
            )}
          </div>
        </div>
      );
      case 'calculators': return <Calculators />;
      case 'tracking': return <Tracking />;
      case 'consultancy': return <Consultancy />;
      case 'admin': return <AdminDashboard />;
      default: return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isLoggedIn={isLoggedIn}
      />

      <main>
        {renderPage()}
      </main>

      <footer className="bg-neutral-50 border-t border-neutral-100 py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-[#3B8392] p-2 rounded-xl text-white shadow-lg shadow-[#3B8392]/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="font-bold text-2xl tracking-tighter">LegitGrinder.</span>
              </div>
              <p className="text-neutral-500 font-light text-lg mb-10 max-w-md">Premium gateway for tech and industrial imports. Bridging the gap between global markets and East Africa.</p>
              <div className="flex gap-6">
                {[Instagram, Youtube, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="p-3 bg-white border border-neutral-100 rounded-full hover:border-[#3B8392] hover:text-[#3B8392] transition-all shadow-sm">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-8 uppercase tracking-widest text-xs">Solutions</h4>
              <ul className="space-y-4 text-neutral-500 font-light">
                {['Shop Inventory', 'Price Calculator', 'Order Tracking', 'Consultancy'].map((item, i) => (
                  <li key={i} className="hover:text-[#3B8392] cursor-pointer transition-colors">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 mb-8 uppercase tracking-widest text-xs">Contact</h4>
              <ul className="space-y-4 text-neutral-500 font-light">
                <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-neutral-300 mt-1" /> <span>Nairobi CBD, Kenya<br />Vision Plaza, Mombasa Rd</span></li>
                <li className="flex items-center gap-3"><Mail className="w-5 h-5 text-neutral-300" /> <span>mungaimports@gmail.com</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-24 pt-12 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-neutral-400 text-sm">© 2024 LegitGrinder Logistics. All rights reserved.</p>
            <div className="flex gap-8 text-neutral-400 text-sm">
              <span className="hover:text-black cursor-pointer">Privacy Policy</span>
              <span className="hover:text-black cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
};

export default App;
