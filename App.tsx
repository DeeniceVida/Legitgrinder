
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Calculators from './pages/Calculators';
import Tracking from './pages/Tracking';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Pricelist from './pages/Pricelist';
import Collaboration from './pages/Collaboration';
// Fix: Aliased Consultation page component to ConsultationPage to avoid conflict with Consultation type from types.ts
import ConsultationPage from './pages/Consultation';
import Shop from './pages/Shop';
import Blogs from './pages/Blogs';
import OrderHistory from './pages/OrderHistory';
import AIAssistant from './components/AIAssistant';
import { supabase } from './lib/supabase';
import {
  fetchPricelistData,
  fetchInventoryProducts,
  fetchClientsData,
  fetchConsultations,
  fetchBlogsData,
  fetchInvoicesData
} from './services/supabaseData';
import {
  Instagram, Youtube, Globe
} from 'lucide-react';
import { PHONE_MODELS_SCHEMA } from './constants';
import {
  OrderStatus, Availability, Product, BlogPost, FAQItem,
  Client, Invoice, PricelistItem, Consultation, ConsultationStatus
} from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  // --- GLOBAL STATE ---

  // Pricelist State
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);

  // Shop Products
  const [products, setProducts] = useState<Product[]>([]);

  // Blogs and FAQs
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);

  // Invoices/Tracking
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Consultations
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Supabase Auth and Data Listener
  useEffect(() => {
    // 1. Initial Session Check
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleAuthSession(session);
      }
    };
    checkUser();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        handleAuthSession(session);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSession = async (session: any) => {
    console.log('🔐 Auth Session Detected:', session.user.email);
    setIsLoggedIn(true);
    setUser(session.user);

    // Fetch profile for role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error.message);
    }

    if (profile) {
      console.log('✅ Profile found! Role:', profile.role, '| isAdmin will be:', profile.role === 'admin');
      setIsAdmin(profile.role === 'admin');
    } else {
      console.warn('⚠️ No profile record found for user ID:', session.user.id);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [plist, prods, clist, cons, blogsData, invs] = await Promise.all([
          fetchPricelistData(),
          fetchInventoryProducts(),
          fetchClientsData(),
          fetchConsultations(),
          fetchBlogsData(),
          fetchInvoicesData()
        ]);

        setPricelist(plist || []);
        setProducts(prods || []);
        setClients(clist || []);
        setConsultations(cons || []);
        setBlogs(blogsData || []);
        setInvoices(invs || []);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      }
    };
    loadAllData();
  }, []);

  const handleLoginSuccess = (isAdminLogin: boolean = false, userData?: Partial<Client>) => {
    setIsLoggedIn(true);
    setIsAdmin(isAdminLogin);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUser(null);
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} />;
      case 'login': return <Login onLoginSuccess={handleLoginSuccess} />;
      case 'pricelist': return <Pricelist pricelist={pricelist} />;
      case 'collaboration': return <Collaboration />;
      case 'consultation': return <ConsultationPage onSubmit={(c) => setConsultations([...consultations, c])} />;
      case 'shop': return <Shop products={products} onUpdateProducts={setProducts} />;
      case 'calculators': return <Calculators />;
      case 'blogs': return <Blogs blogs={blogs} faqs={faqs} />;
      case 'tracking': return <Tracking isLoggedIn={isLoggedIn} onNavigate={setCurrentPage} invoices={invoices} />;
      case 'history': return <OrderHistory invoices={invoices.filter(inv => inv.userId === user?.id)} onNavigate={setCurrentPage} />;
      case 'admin': return (
        <AdminDashboard
          blogs={blogs}
          faqs={faqs}
          onUpdateBlogs={setBlogs}
          onUpdateFaqs={setFaqs}
          pricelist={pricelist}
          onUpdatePricelist={setPricelist}
          clients={clients}
          onUpdateClients={setClients}
          invoices={invoices}
          onUpdateInvoices={setInvoices}
          products={products}
          onUpdateProducts={setProducts}
          consultations={consultations}
          onUpdateConsultations={setConsultations}
        />
      );
      default: return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#3D8593] selection:text-white">
      <Navbar onNavigate={setCurrentPage} currentPage={currentPage} isAdmin={isAdmin} isLoggedIn={isLoggedIn} onLogout={handleLogout} />

      <main className="flex-1 bg-white">
        {renderPage()}
      </main>

      <footer className="bg-[#0f1a1c] text-white py-24 px-6 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-20 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-10">
                <img src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg" className="h-10 w-auto mr-4 rounded-lg" alt="Logo" />
                <span className="text-2xl font-bold tracking-tight">LegitGrinder</span>
              </div>
              <p className="text-gray-400 max-w-sm mb-12 text-lg font-light leading-relaxed">
                The most reliable bridge between global tech markets and Kenyan importers. Powered by transparency.
              </p>
              <div className="flex space-x-4">
                {[Instagram, Youtube, Globe].map((Icon, idx) => (
                  <a key={idx} href="#" className="p-4 rounded-full border border-gray-800 hover:bg-[#3D8593] hover:border-[#3D8593] transition-all">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">Solutions</h4>
              <ul className="space-y-4 text-gray-400 text-lg font-light">
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('shop')}>Shop</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('blogs')}>Blogs & FAQ</li>
                <li className="hover:text-[#FF9900] cursor-pointer transition-colors" onClick={() => setCurrentPage('pricelist')}>Market Prices</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">HQ</h4>
              <ul className="space-y-6 text-gray-400 text-lg font-light">
                <li>Nairobi CBD, Kenya</li>
                <li className="text-white font-bold text-xl underline decoration-[#3D8593] underline-offset-8">+254 791 873 538</li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">
            <p>&copy; 2026 LegitGrinder Logistics. Precision Sourcing Hub.</p>
          </div>
        </div>
      </footer>
      <AIAssistant />
    </div>
  );
};

export default App;
