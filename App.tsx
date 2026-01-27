
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
import AIAssistant from './components/AIAssistant';
import { supabase } from './src/lib/supabase';
import { fetchPricelistData, fetchInventoryProducts, fetchClientsData, saveClientToSupabase, fetchConsultations } from './src/services/supabaseData';
import { calculateAutomatedPrice } from './utils/priceCalculations';
import {
  Instagram, Youtube, Globe
} from 'lucide-react';
import { PHONE_MODELS_SCHEMA } from './constants';
import {
  OrderStatus, Availability, Product, BlogPost, FAQItem,
  Client, Invoice, PricelistItem, Consultation, ConsultationStatus
} from './types';

console.log('--- LEGITGRINDER APP INITIALIZING (v3.2) ---');

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.log('App State Check:', { currentPage, isLoggedIn, isAdmin, userEmail: user?.email });
  }, [currentPage, isLoggedIn, isAdmin, user]);

  // --- GLOBAL STATE ---

  // Pricelist State - Starting with mock data so the list is never empty
  const [pricelist, setPricelist] = useState<PricelistItem[]>(() => {
    const items: PricelistItem[] = [];

    // Example mapping for all iPhone models based on user provided precise figures
    const examples: Record<string, Record<string, number>> = {
      "iPhone 7": { "default": 75 },
      "iPhone 8": { "default": 101 },
      "iPhone 8 Plus": { "default": 120 },
      "iPhone XR": { "default": 117 },
      "iPhone SE (2nd Gen)": { "default": 110 },
      "iPhone SE (3rd Gen)": { "default": 137 },
      "iPhone 11": { "64GB": 164, "128GB": 194, "256GB": 256 },
      "iPhone 11 Pro": { "64GB": 203, "256GB": 235, "512GB": 265 },
      "iPhone 11 Pro Max": { "default": 233 },
      "iPhone 12 mini": { "default": 155 },
      "iPhone 12": { "64GB": 184, "128GB": 212, "256GB": 230 },
      "iPhone 12 Pro": { "128GB": 286, "256GB": 307, "512GB": 322 },
      "iPhone 12 Pro Max": { "128GB": 308, "256GB": 321, "512GB": 343 },
      "iPhone 13 mini": { "128GB": 231, "256GB": 260, "512GB": 280 },
      "iPhone 13": { "128GB": 245, "256GB": 275, "512GB": 289 },
      "iPhone 13 Pro": { "128GB": 315, "256GB": 335, "512GB": 355, "1TB": 375 },
      "iPhone 13 Pro Max": { "128GB": 398, "256GB": 418, "512GB": 448, "1TB": 468 },
      "iPhone 14": { "128GB": 277, "256GB": 300, "512GB": 362 },
      "iPhone 14 Plus": { "128GB": 303, "256GB": 323, "512GB": 353 },
      "iPhone 14 Pro": { "128GB": 394, "256GB": 414, "512GB": 444, "1TB": 474 },
      "iPhone 14 Pro Max": { "128GB": 414, "256GB": 434, "512GB": 464, "1TB": 494 },
      "iPhone 15": { "128GB": 407, "256GB": 400, "512GB": 407 },
      "iPhone 15 Plus": { "128GB": 410, "256GB": 430, "512GB": 450 },
      "iPhone 15 Pro": { "128GB": 446, "256GB": 476, "512GB": 506, "1TB": 536 },
      "iPhone 15 Pro Max": { "256GB": 561, "512GB": 591, "1TB": 621 },
      "iPhone 16e": { "128GB": 410, "256GB": 505 },
      "iPhone 16": { "128GB": 511, "256GB": 609, "512GB": 835 },
      "iPhone 16 Plus": { "128GB": 600, "256GB": 630, "512GB": 660 },
      "iPhone 16 Pro": { "128GB": 618, "256GB": 698, "512GB": 720, "1TB": 750 },
      "iPhone 16 Pro Max": { "256GB": 770, "512GB": 898, "1TB": 928 },
      "iPhone 17 Pro Max": { "default": 1440 },

      // Samsung
      "S24 Ultra": { "256GB": 595, "512GB": 618, "1TB": 802 },
      "S24+": { "256GB": 428, "512GB": 450 },
      "S24": { "128GB": 365, "256GB": 450, "512GB": 480 },
      "S23 Ultra": { "256GB": 391, "512GB": 428, "1TB": 642 },
      "S23+": { "256GB": 350, "512GB": 380 },
      "S23": { "128GB": 248, "256GB": 300, "512GB": 320 },
      "S22 Ultra": { "128GB": 267, "256GB": 305, "512GB": 365, "1TB": 400 },
      "S22+": { "128GB": 204, "256GB": 182 },
      "S22": { "128GB": 193, "256GB": 192 },
      "S21 Ultra": { "128GB": 281, "256GB": 265, "512GB": 365 },
      "S21+": { "128GB": 190, "256GB": 210 },
      "S21": { "128GB": 165, "256GB": 178 },
      "S21 FE": { "128GB": 130, "256GB": 150 },
      "S20 Ultra": { "128GB": 245, "512GB": 479 },
      "S20+": { "128GB": 249, "512GB": 270 },
      "S20": { "128GB": 166, "512GB": 190 },
      "S20 FE": { "128GB": 180, "256GB": 290 },
      "S10+": { "default": 140 },
      "S10": { "default": 125 },
      "S10e": { "default": 100 },

      // Pixel
      "Pixel 9": { "128GB": 390, "256GB": 390 },
      "Pixel 9 Pro": { "128GB": 434, "256GB": 535, "512GB": 600, "1TB": 700 },
      "Pixel 9 Pro XL": { "128GB": 439, "256GB": 556, "512GB": 619, "1TB": 700 },
      "Pixel 9 Pro Fold": { "256GB": 900, "512GB": 1000 },
      "Pixel 8a": { "128GB": 250, "256GB": 290 },
      "Pixel 8": { "128GB": 269, "256GB": 322 },
      "Pixel 8 Pro": { "128GB": 315, "256GB": 363, "512GB": 437, "1TB": 500 },
      "Pixel 7a": { "default": 170 },
      "Pixel 7": { "128GB": 191, "256GB": 210 },
      "Pixel 7 Pro": { "128GB": 254, "256GB": 257, "512GB": 258 },
      "Pixel Fold": { "256GB": 550, "512GB": 600 },
      "Pixel 6a": { "default": 130 },
      "Pixel 6": { "128GB": 140, "256GB": 163 },
      "Pixel 6 Pro": { "128GB": 167, "256GB": 185, "512GB": 220 }
    };

    Object.entries(PHONE_MODELS_SCHEMA).forEach(([brand, models]) => {
      const typedModels = models as any[];
      typedModels.forEach((m, idx) => {
        const item: PricelistItem = {
          id: `${brand}-${idx}`,
          modelName: m.name,
          brand: brand as 'iphone' | 'samsung' | 'pixel',
          series: m.series,
          syncAlert: false,
          capacities: m.capacities.map((cap: string) => {
            const baseUSD = examples[m.name]?.[cap] || examples[m.name]?.['default'] || 800;
            const isExample = !!examples[m.name];

            return {
              capacity: cap,
              currentPriceKES: isExample ? calculateAutomatedPrice(baseUSD) : 120000 + Math.floor(Math.random() * 50000),
              previousPriceKES: 0,
              lastSynced: isExample ? 'Verified Price' : 'Local Only',
              sourcePriceUSD: baseUSD,
              isManualOverride: false
            };
          })
        };
        items.push(item);
      });
    });
    return items;
  });

  const [products, setProducts] = useState<Product[]>([
    {
      id: 'p1',
      name: 'iPhone 15 Pro Max',
      priceKES: 165000,
      discountPriceKES: 185000,
      imageUrls: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=800'],
      variations: [
        { type: 'Storage', name: '256GB', priceKES: 0 },
        { type: 'Storage', name: '512GB', priceKES: 25000 }
      ],
      availability: Availability.LOCAL,
      shippingDuration: 'Ready for Pickup',
      description: 'The definitive iPhone experience with Titanium design and Pro camera system.',
      category: 'Smartphones',
      stockCount: 15
    },
    {
      id: 'p2',
      name: 'MacBook Pro M3',
      priceKES: 245000,
      discountPriceKES: 275000,
      imageUrls: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800'],
      variations: [],
      availability: Availability.IMPORT,
      shippingDuration: '2 Weeks Air',
      description: 'The most advanced laptop for builders and creators.',
      category: 'Laptops',
      stockCount: 5
    }
  ]);

  // Blogs and FAQs
  const [blogs, setBlogs] = useState<BlogPost[]>([
    {
      id: 'b1',
      title: 'How to Avoid Hidden Import Taxes in 2026',
      excerpt: 'Navigating the latest Kenya Revenue Authority updates for tech imports.',
      content: 'Importing tech into Kenya can be a minefield of unexpected costs. In this guide, we break down the VAT, Excise Duty, and Railway Development Levy...',
      imageUrl: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&q=80&w=800',
      category: 'Guides',
      date: 'Jan 12, 2026',
      author: 'LegitGrinder'
    },
    {
      id: 'b2',
      title: 'China vs USA: Which Source is Best for Your Business?',
      excerpt: 'Comparing lead times, quality, and shipping rates across the two largest hubs.',
      content: 'Choosing the right sourcing origin is the first step in building a successful import business...',
      imageUrl: 'https://images.unsplash.com/photo-1494412574743-019485b78287?auto=format&fit=crop&q=80&w=800',
      category: 'Sourcing',
      date: 'Jan 15, 2026',
      author: 'LegitGrinder'
    }
  ]);

  const [faqs, setFaqs] = useState<FAQItem[]>([
    { id: 'f1', question: 'How long does shipping really take?', answer: 'USA Air takes 2-3 weeks, while China Sea freight takes 45-50 days average.', category: 'Logistics' },
    { id: 'f2', question: 'Do I pay for customs separately?', answer: 'No, all our quotes are all-inclusive of customs and handling to Nairobi CBD.', category: 'Pricing' }
  ]);

  // Clients
  const [clients, setClients] = useState<Client[]>([
    {
      id: 'u1',
      name: 'Munga Kamau',
      email: 'munga@legit.co.ke',
      phone: '+254 711 222 333',
      location: 'Nairobi, Westlands',
      joinedDate: '2025-06-12',
      totalSpentKES: 845000,
      orderCount: 5,
      lastOrderDate: '2026-01-05',
      interests: ['iPhones', 'USA Sourcing'],
      purchasedItems: ['iPhone 15 Pro Max', 'MacBook Air M2'],
      purchaseFrequency: 'High'
    }
  ]);

  // Invoices/Tracking
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'inv-001', invoiceNumber: '4932', clientName: 'Munga Kamau', productName: 'iPhone 15 Pro Max', status: OrderStatus.SHIPPING, progress: 60, lastUpdate: '2 hours ago', isPaid: true }
  ]);

  // Consultations
  const [consultations, setConsultations] = useState<Consultation[]>([
    { id: 'c1', name: 'Brian Otieno', email: 'brian@example.com', phone: '+254 700 000 000', whatsapp: '+254 700 000 000', date: '2026-01-20', time: '14:30', topic: 'Sourcing 50 refurbished laptops.', status: ConsultationStatus.PENDING, feeUSD: 15 }
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Fetch real data on load
  useEffect(() => {
    const loadAllData = async () => {
      // 1. Fetch Public Data (No Auth Required)
      try {
        const [plist, prods] = await Promise.all([
          fetchPricelistData().catch(() => []),
          fetchInventoryProducts().catch(() => [])
        ]);
        if (plist.length > 0) setPricelist(plist);
        if (prods.length > 0) setProducts(prods);
        console.log('Public data loaded:', { pricelist: plist.length, products: prods.length });
      } catch (e) {
        console.warn("Public data fetch partially failed", e);
      }

      // 2. Fetch Admin Data (Only if logged in)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const [clist, cons] = await Promise.all([
            fetchClientsData().catch(() => []),
            fetchConsultations().catch(() => [])
          ]);
          if (clist.length > 0) setClients(clist);
          if (cons.length > 0) setConsultations(cons);
          console.log('Admin data loaded:', { clients: clist.length, consultations: cons.length });
        } catch (e) {
          console.log("Admin data not accessible for this user");
        }
      }
    };
    loadAllData();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase Auth Event:', event);
      if (session) {
        setUser(session.user);
        setIsLoggedIn(true);

        // Check for admin role
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        console.log('Profile Fetch Result:', { profile, error });

        // If profile doesn't exist (legacy user), create it
        if (error && error.code === 'PGRST116') {
          console.log('Profile missing for user, attempting creation...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({ id: session.user.id, email: session.user.email })
            .select('role')
            .single();

          if (createError) console.error('Profile creation failed:', createError);
          profile = newProfile;
        }

        setIsAdmin(profile?.role === 'admin');
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (isAdminLogin: boolean = false, userData?: Partial<Client>) => {
    setIsLoggedIn(true);
    setIsAdmin(isAdminLogin);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    console.log('Logout start...');
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setIsLoggedIn(false);
      setIsAdmin(false);
      setUser(null);
      setCurrentPage('home');
      window.location.replace('/'); // replace instead of href for cleaner history
    } catch (err) {
      console.error('Logout error:', err);
      window.location.replace('/');
    }
  };

  const DebugIndicator = () => (
    <div style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999, padding: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '10px', borderRadius: '10px', pointerEvents: 'none' }}>
      v3.2 | Auth: {isLoggedIn ? 'IN' : 'OUT'} | Admin: {isAdmin ? 'YES' : 'NO'} | Page: {currentPage}
    </div>
  );

  const renderPage = () => {
    try {
      switch (currentPage) {
        case 'home': return <Home onNavigate={setCurrentPage} />;
        case 'login': return <Login onLoginSuccess={handleLoginSuccess} />;
        case 'pricelist': return <Pricelist pricelist={pricelist} />;
        case 'collaboration': return <Collaboration />;
        case 'consultation': return <ConsultationPage />;
        case 'shop': return <Shop products={products} onUpdateProducts={setProducts} />;
        case 'calculators': return <Calculators />;
        case 'blogs': return <Blogs blogs={blogs} faqs={faqs} />;
        case 'tracking': return <Tracking isLoggedIn={isLoggedIn} onNavigate={setCurrentPage} invoices={invoices} />;
        case 'admin':
          if (!isAdmin) {
            console.warn("Blocked non-admin from admin page");
            return <Home onNavigate={setCurrentPage} />;
          }
          return (
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
    } catch (err) {
      console.error("Render Page Crash:", err);
      return (
        <div className="pt-48 px-6 text-center">
          <h2 className="text-2xl font-bold text-rose-600">Something went wrong.</h2>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-full">Refresh Page</button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#3D8593] selection:text-white">
      <Navbar
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

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
      <DebugIndicator />
      <AIAssistant />
    </div>
  );
};

export default App;
