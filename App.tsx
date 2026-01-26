
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
import { fetchPricelistData } from './src/services/supabaseData';
import { calculateAutomatedPrice } from './utils/priceCalculations';
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
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);

  // --- GLOBAL STATE ---

  // Pricelist State - Starting with mock data so the list is never empty
  const [pricelist, setPricelist] = useState<PricelistItem[]>(() => {
    const items: PricelistItem[] = [];

    // Example mapping for iPhone 11 based on user provided links
    const examples: Record<string, Record<string, number>> = {
      "iPhone 11": { "64GB": 166, "128GB": 165, "256GB": 217 }
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
            const baseUSD = examples[m.name]?.[cap] || 800; // Use real baseline if it's the iPhone 11 example
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

  // Shop Products
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'p1',
      name: 'iPhone 15 Pro Max',
      priceKES: 175000,
      discountPriceKES: 168000,
      imageUrls: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=800'],
      variations: [
        { type: 'Capacity', name: '256GB', priceKES: 0 },
        { type: 'Capacity', name: '512GB', priceKES: 15000 },
        { type: 'Capacity', name: '1TB', priceKES: 30000 },
        { type: 'Color', name: 'Natural Titanium', priceKES: 0 },
        { type: 'Color', name: 'Black', priceKES: 0 },
        { type: 'Color', name: 'Blue', priceKES: 0 }
      ],
      availability: Availability.IMPORT,
      shippingDuration: '2-3 Weeks Air',
      description: 'The ultimate iPhone experience with titanium build and advanced zoom.',
      category: 'Electronics'
    },
    {
      id: 'p2',
      name: 'Samsung S24 Ultra',
      priceKES: 165000,
      discountPriceKES: 158000,
      imageUrls: ['https://images.unsplash.com/photo-1707055745727-465494191d57?auto=format&fit=crop&q=80&w=800'],
      variations: [
        { type: 'Capacity', name: '256GB', priceKES: 0 },
        { type: 'Capacity', name: '512GB', priceKES: 12000 },
        { type: 'Color', name: 'Titanium Gray', priceKES: 0 },
        { type: 'Color', name: 'Black', priceKES: 0 }
      ],
      availability: Availability.LOCAL,
      shippingDuration: '2-3 Business Days',
      description: 'Galaxy AI is here. Stunning 200MP camera and built-in S Pen.',
      category: 'Electronics'
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

  // Fetch real pricelist on load
  useEffect(() => {
    const loadPricelist = async () => {
      const data = await fetchPricelistData();
      if (data.length > 0) {
        setPricelist(data);
      }
    };
    loadPricelist();
  }, []);

  const handleLoginSuccess = (isAdminLogin: boolean = false, userData?: Partial<Client>) => {
    setIsLoggedIn(true);
    setIsAdmin(isAdminLogin);
    if (userData && !isAdminLogin) {
      // Add new client if registering
      const newClient: Client = {
        id: `u-${Date.now()}`,
        name: userData.name || 'New Member',
        email: userData.email || '',
        phone: userData.phone || '',
        location: userData.location || 'Nairobi',
        joinedDate: new Date().toISOString().split('T')[0],
        totalSpentKES: 0,
        orderCount: 0,
        lastOrderDate: 'Never',
        interests: userData.interests || [],
        purchasedItems: [],
        purchaseFrequency: 'Low'
      };
      setClients(prev => [...prev, newClient]);
    }
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
      <Navbar onNavigate={setCurrentPage} currentPage={currentPage} isAdmin={isAdmin} />

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
