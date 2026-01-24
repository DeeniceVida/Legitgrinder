
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
import AIAssistant from './components/AIAssistant';
import {
  Smartphone, Package, Globe, HelpCircle, Instagram, Youtube, Mail, MapPin,
  Plus, ArrowUpRight, Box, Clock, ChevronRight, CheckCircle2
} from 'lucide-react';
import { STATUS_SEQUENCE } from './constants';
import { OrderStatus } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setCurrentPage('home');
  };

  const mockUserOrders = [
    {
      id: 'LG-9821',
      product: 'iPhone 15 Pro Max',
      status: OrderStatus.SHIPPING,
      date: 'May 12, 2024',
      estArrival: 'June 5, 2024'
    }
  ];

  const renderMyOrders = () => (
    <div className="py-24 px-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-16">
        <h1 className="text-5xl font-bold tracking-tight-custom mb-4">My Dashboard</h1>
        <p className="text-neutral-400 font-light">Track your active global imports in real-time.</p>
      </div>

      <div className="space-y-10">
        {mockUserOrders.map(order => {
          const statusIdx = STATUS_SEQUENCE.indexOf(order.status);
          return (
            <div key={order.id} className="bg-white border border-neutral-100 rounded-[3rem] p-12 shadow-sm hover:shadow-xl transition-all duration-700 group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl group-hover:bg-[#FF9900] transition-colors duration-500">
                    <Box className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Order #{order.id}</p>
                    <h3 className="text-3xl font-bold text-neutral-900 tracking-tight-custom">{order.product}</h3>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Est. Arrival</p>
                  <p className="text-xl font-bold text-neutral-900">{order.estArrival}</p>
                </div>
              </div>

              {/* Progress Logic */}
              <div className="relative mb-12 px-2">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 -translate-y-1/2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF9900] transition-all duration-1000"
                    style={{ width: `${(statusIdx / (STATUS_SEQUENCE.length - 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="relative z-10 flex justify-between">
                  {STATUS_SEQUENCE.map((s, i) => (
                    <div key={s} className="flex flex-col items-center group/step">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all duration-500 ${i <= statusIdx ? 'bg-[#FF9900] text-white scale-110' : 'bg-white text-neutral-200'
                        }`}>
                        {i < statusIdx ? <CheckCircle2 className="w-5 h-5" /> : (i === statusIdx ? <Clock className="w-5 h-5 animate-pulse" /> : <Box className="w-4 h-4" />)}
                      </div>
                      <p className={`absolute -bottom-8 text-[9px] font-black uppercase tracking-tighter w-20 text-center transition-colors ${i <= statusIdx ? 'text-[#FF9900]' : 'text-neutral-300'}`}>
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-20 pt-10 border-t border-neutral-50 flex justify-between items-center">
                <div className="flex items-center gap-3 text-neutral-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-light italic">Last scan: Agents Warehouse, Shenzhen</span>
                </div>
                <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF9900] hover:text-black transition-colors">
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} />;
      case 'signup': return <Signup onSignupSuccess={handleLoginSuccess} />;
      case 'pricelist': return <Pricelist />;
      case 'collaboration': return <Collaboration />;
      case 'my-orders': return <MyOrders />;
      case 'shop': return (
        <div className="py-24 px-4 max-w-7xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-[#FF9900]/5 rounded-[1.5rem] mb-8 border border-[#FF9900]/10">
            <Smartphone className="w-8 h-8 text-[#FF9900]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-medium mb-6 tracking-tight-custom text-neutral-900 leading-tight">Elite <span className="italic heading-accent text-neutral-400">Inventory.</span></h1>
          <p className="text-neutral-500 mb-20 max-w-xl mx-auto text-lg font-light leading-relaxed">Vetted tech and industrial machinery ready for deployment in Kenya.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="group flex flex-col cursor-pointer text-left">
                <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden rounded-[2.5rem] mb-6 shadow-sm group-hover:shadow-2xl transition-all duration-700">
                  <img src={`https://picsum.photos/seed/lg-${i}/800/1000`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" alt="Product" />
                  <div className="absolute top-6 right-6 bg-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">Verified Source</div>
                </div>
                <div className="px-2">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-2xl font-medium text-neutral-900 group-hover:text-[#FF9900] transition-colors tracking-tight-custom">Premium Sourcing #{i}</h3>
                    <div className="p-2 bg-neutral-50 rounded-xl group-hover:bg-[#FF9900] group-hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-6 font-light leading-relaxed line-clamp-2">Direct import from verified vendors in the USA and China.</p>
                  <div className="flex justify-between items-end border-t border-neutral-50 pt-6">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest block mb-1">Buy Price</span>
                      <span className="text-2xl font-black text-neutral-900">KES {(65000 + (i * 15000)).toLocaleString()}</span>
                    </div>
                    <button className="btn-brand bg-neutral-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-neutral-100">Order Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'calculators': return <Calculators />;
      case 'tracking': return <Tracking />;
      case 'consultancy': return <Consultancy />;
      case 'admin': return <AdminDashboard />;
      case 'faq': return (
        <div className="max-w-3xl mx-auto py-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-medium mb-6 tracking-tight-custom">Common Inquiries</h1>
          </div>
          <div className="space-y-4">
            {[
              { q: "How long does shipping from China take?", a: "Air shipping typically takes 2-3 weeks, while sea shipping takes 45-50 days." },
              { q: "Can I track my order live?", a: "Yes! Every client gets a unique 4-digit tracking code once their order is processed." }
            ].map((item, idx) => (
              <details key={idx} className="group bg-white rounded-3xl border border-neutral-100 hover:border-[#FF9900]/20 transition-all duration-500 overflow-hidden">
                <summary className="list-none flex justify-between items-center cursor-pointer p-8">
                  <span className="font-medium text-lg md:text-xl text-neutral-900 group-hover:text-[#FF9900] transition-colors">{item.q}</span>
                  <Plus className="w-4 h-4 text-neutral-400" />
                </summary>
                <div className="px-8 pb-8 text-neutral-500 leading-relaxed text-lg font-light">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      );
      default: return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#FF9900] selection:text-white">
      <Navbar
        onNavigate={(page) => {
          if (page === 'admin') setCurrentPage('admin');
          else setCurrentPage(page);
        }}
        currentPage={currentPage}
      />

      <main className="flex-1 bg-white">
        {isLoggedIn && currentPage === 'home' && (
          <div className="max-w-7xl mx-auto px-6 pt-12">
            <button
              onClick={() => setCurrentPage('my-orders')}
              className="bg-[#FF9900]/5 border border-[#FF9900]/20 text-[#FF9900] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-[#FF9900] hover:text-white transition-all shadow-sm"
            >
              <Box className="w-4 h-4" /> Active Shipments (1)
            </button>
          </div>
        )}
        {renderPage()}
      </main>

      <footer className="bg-[#0a0a0a] text-white py-24 px-4 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-10">
                <img src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg" className="h-8 w-auto mr-4 grayscale brightness-200 rounded-lg" alt="Logo" />
                <span className="text-2xl font-semibold tracking-tight-custom">LegitGrinder</span>
              </div>
              <p className="text-neutral-500 max-w-sm mb-12 text-lg font-light leading-relaxed">
                A premium logistics gateway connecting Kenya to global marketplaces. Precision sourcing for tech and machinery.
              </p>
              <div className="flex space-x-4">
                {[Instagram, Youtube, Globe].map((Icon, idx) => (
                  <a key={idx} href="#" className="p-4 rounded-full border border-neutral-800 hover:bg-[#FF9900] hover:text-white transition-all duration-300">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-8">Navigation</h4>
              <ul className="space-y-4 text-neutral-400 text-lg font-light">
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('shop')}>US Tech Shop</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('pricelist')}>Pricelist</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('calculators')}>China Imports</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('tracking')}>Live Tracking</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('consultancy')}>Book Consultation</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-8">Contact</h4>
              <ul className="space-y-6 text-neutral-400 text-lg font-light">
                <li>Nairobi CBD, Kenya</li>
                <li>hello@legitgrinder.site</li>
                <li className="text-white font-medium underline underline-offset-8 decoration-[#FF9900]">+254 791 873 538</li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center text-neutral-600 text-[10px] font-bold uppercase tracking-[0.2em]">
            <p>&copy; 2024 LegitGrinder Logistics. Built for the modern importer.</p>
            <div className="flex space-x-8 mt-6 md:mt-0">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
            </div>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
};

export default App;
