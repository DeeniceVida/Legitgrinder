
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
import Books from './pages/Books';
import OrderHistory from './pages/OrderHistory';
import AboutUs from './pages/AboutUs';
import ResetPassword from './pages/ResetPassword';
import PayInvoice from './pages/PayInvoice';
import WhatsAppWidget from './components/WhatsAppWidget';
import SafeImage from './components/SafeImage';
import ValentineTheme from './components/ValentineTheme';
import EidTheme from './components/EidTheme';
import './valentines.css';
import './eid.css';
import { supabase } from './lib/supabase';
import {
  fetchPricelistData,
  fetchInventoryProducts,
  fetchClientsData,
  fetchConsultations,
  fetchBlogsData,
  fetchInvoicesData,
  logVisit,
  fetchEBooks
} from './services/supabaseData';
import {
  InstagramLogo, TiktokLogo, WhatsappLogo, GoogleLogo, PaperPlaneTilt, MapPin, Phone
} from '@phosphor-icons/react';
import { PHONE_MODELS_SCHEMA, WHATSAPP_NUMBER } from './constants';
import {
  OrderStatus, Availability, Product, BlogPost, FAQItem,
  Client, Invoice, PricelistItem, Consultation, ConsultationStatus, EBook
} from './types';

import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  // True once the session AND profile role have been resolved — prevents the
  // /admin route from bouncing admins to /login during the initial auth check.
  const [authChecked, setAuthChecked] = useState(false);

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

  // eBooks
  const [ebooks, setEbooks] = useState<EBook[]>([]);

  // Global data loading flag (prevents "vanishing" flashes on data-driven pages)
  const [dataLoaded, setDataLoaded] = useState(false);

  // Supabase Auth and Data Listener
  useEffect(() => {
    // 1. Initial Session Check
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleAuthSession(session);
      }
      setAuthChecked(true);
    };
    checkUser();

    // 2. Auth State Listener
    // NOTE: Supabase deadlocks if you await supabase queries directly inside this
    // callback (it holds the auth lock) — defer the work with setTimeout(0).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (session) {
          await handleAuthSession(session);
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
          setUser(null);
        }
        setAuthChecked(true);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Visitor Tracking
  useEffect(() => {
    logVisit();
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

        const ebooksData = await fetchEBooks();
        setEbooks(ebooksData || []);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      } finally {
        setDataLoaded(true);
      }
    };
    loadAllData();
  }, []);

  const handleLoginSuccess = (isAdminLogin: boolean = false, userData?: Partial<Client>) => {
    setIsLoggedIn(true);
    setIsAdmin(isAdminLogin);
    navigate('/');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#3D8593] selection:text-white">
      <ValentineTheme />
      <EidTheme />
      <Navbar
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      <main className="flex-1 bg-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/pricelist" element={<Pricelist pricelist={pricelist} loading={!dataLoaded} />} />
          <Route path="/collaboration" element={<Collaboration />} />
          <Route path="/consultation" element={<ConsultationPage onSubmit={(c) => setConsultations([...consultations, c])} />} />
          <Route path="/shop" element={<Shop products={products} onUpdateProducts={setProducts} />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/blogs" element={<Blogs blogs={blogs} faqs={faqs} />} />
          <Route path="/books" element={<Books />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/tracking" element={<Tracking isLoggedIn={isLoggedIn} invoices={invoices} />} />
          <Route path="/history" element={<OrderHistory invoices={invoices.filter(inv => inv.userId === user?.id)} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pay/:invoiceNumber" element={<PayInvoice />} />
          <Route
            path="/admin"
            element={
              !authChecked ? (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-teal-100 border-t-[#3D8593] rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Verifying access…</p>
                  </div>
                </div>
              ) : isAdmin ? (
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
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Catch-all for 404 - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <footer className="px-4 md:px-6 pb-6 bg-white">
        <div className="bg-[#0f1a1c] text-white rounded-[2.5rem] md:rounded-[3rem] px-8 md:px-14 pt-16 md:pt-20 pb-10 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-[#3D8593]/25 rounded-full blur-[110px]" aria-hidden="true"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-12 gap-14 mb-16">
              {/* Brand + newsletter */}
              <div className="lg:col-span-5">
                <div className="flex items-center mb-6">
                  <SafeImage src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg" className="h-10 w-auto mr-4 rounded-lg" alt="LegitGrinder logo" />
                  <span className="text-xl font-bold tracking-tight">LegitGrinder</span>
                </div>
                <p className="text-white/50 max-w-sm mb-8 font-light leading-relaxed">
                  The most reliable bridge between global tech markets and Kenyan importers. Powered by transparency.
                </p>

                <p className="eyebrow text-white/40 mb-4">Get price drops &amp; import tips</p>
                <form
                  className="flex max-w-sm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = new FormData(e.currentTarget).get('newsletter_email');
                    const msg = encodeURIComponent(`Hi LegitGrinder! Please add me to your newsletter for price drops & import tips. My email: ${email}`);
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                  }}
                >
                  <label htmlFor="newsletter_email" className="sr-only">Email address</label>
                  <input
                    id="newsletter_email"
                    name="newsletter_email"
                    type="email"
                    required
                    placeholder="Your email address"
                    className="flex-1 bg-white/5 border border-white/15 rounded-l-full px-6 py-4 text-sm placeholder:text-white/30 focus:bg-white/10 transition-colors"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="bg-[#FF9900] hover:bg-[#e68a00] transition-colors rounded-r-full px-6 flex items-center justify-center"
                  >
                    <PaperPlaneTilt size={18} weight="fill" />
                  </button>
                </form>
              </div>

              {/* Link columns */}
              <div className="lg:col-span-2">
                <h4 className="eyebrow text-white/40 mb-7">Solutions</h4>
                <ul className="space-y-3.5 text-white/60 font-light">
                  <li><Link to="/shop" className="hover:text-[#FF9900] transition-colors">Shop</Link></li>
                  <li><Link to="/pricelist" className="hover:text-[#FF9900] transition-colors">Market Prices</Link></li>
                  <li><Link to="/calculators" className="hover:text-[#FF9900] transition-colors">Calculators</Link></li>
                  <li><Link to="/tracking" className="hover:text-[#FF9900] transition-colors">Order Tracking</Link></li>
                </ul>
              </div>
              <div className="lg:col-span-2">
                <h4 className="eyebrow text-white/40 mb-7">Company</h4>
                <ul className="space-y-3.5 text-white/60 font-light">
                  <li><Link to="/about" className="hover:text-[#FF9900] transition-colors">About Us</Link></li>
                  <li><Link to="/consultation" className="hover:text-[#FF9900] transition-colors">Consultation</Link></li>
                  <li><Link to="/blogs" className="hover:text-[#FF9900] transition-colors">Blogs &amp; FAQ</Link></li>
                  <li><Link to="/books" className="hover:text-[#FF9900] transition-colors">eBooks</Link></li>
                </ul>
              </div>
              <div className="lg:col-span-3">
                <h4 className="eyebrow text-white/40 mb-7">HQ</h4>
                <ul className="space-y-4 text-white/60 font-light">
                  <li className="flex items-center gap-3"><MapPin size={18} weight="duotone" className="text-[#3D8593]" /> Nairobi CBD, Kenya</li>
                  <li>
                    <a href="tel:+254791873538" className="flex items-center gap-3 text-white font-bold hover:text-[#FF9900] transition-colors">
                      <Phone size={18} weight="duotone" className="text-[#3D8593]" /> +254 791 873 538
                    </a>
                  </li>
                </ul>
                <div className="flex gap-3 mt-8">
                  <a href="https://www.instagram.com/legitgrinder.imports" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center hover:bg-[#3D8593] hover:border-[#3D8593] transition-all" aria-label="Instagram">
                    <InstagramLogo size={20} weight="duotone" />
                  </a>
                  <a href="https://www.tiktok.com/@legitgrinderimports" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center hover:bg-[#3D8593] hover:border-[#3D8593] transition-all" aria-label="TikTok">
                    <TiktokLogo size={20} weight="duotone" />
                  </a>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] transition-all" aria-label="WhatsApp">
                    <WhatsappLogo size={20} weight="duotone" />
                  </a>
                  <a href="https://share.google/DDnPWrlwWvOIsYdHZ" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center hover:bg-[#3D8593] hover:border-[#3D8593] transition-all" aria-label="Google Reviews">
                    <GoogleLogo size={20} weight="duotone" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
              <p>&copy; 2026 LegitGrinder Logistics · Precision Sourcing Hub</p>
              <p>Nairobi · Shenzhen · New York</p>
            </div>
          </div>
        </div>
      </footer>
      <WhatsAppWidget />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
