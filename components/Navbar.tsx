import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, Calculator, Package, User, HelpCircle, LayoutDashboard, Tag, Handshake } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Define checkAdmin outside useEffect so it can be called directly and by the listener
  const checkAdmin = async () => {
    try {
      // Import supabase here to ensure it's available when checkAdmin is called
      const { supabase } = await import('../src/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(profile?.role === 'admin');
    } catch (err) {
      console.error('Admin check error:', err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    checkAdmin(); // Initial check on component mount

    let authListener: any; // Declare authListener here

    // Set up auth state change listener
    const setupAuthListener = async () => {
      const { supabase } = await import('../src/lib/supabase');
      const { data } = supabase.auth.onAuthStateChange(() => {
        checkAdmin(); // Re-check admin status on auth state change
      });
      authListener = data;
    };

    setupAuthListener();

    // Cleanup function to unsubscribe from the listener
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const navLinks = [
    { name: 'Shop', id: 'shop' },
    { name: 'Pricelist', id: 'pricelist' },
    { name: 'Calculators', id: 'calculators' },
    { name: 'Tracking', id: 'tracking' },
    { name: 'Collaboration', id: 'collaboration' },
    { name: 'Consultancy', id: 'consultancy' },
    { name: 'FAQ', id: 'faq' },
  ];

  // Only show Admin if user is logged in as admin
  if (isAdmin) {
    navLinks.push({ name: 'Admin', id: 'admin' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100 h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
        <div className="flex items-center cursor-pointer group" onClick={() => onNavigate('home')}>
          <img
            src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg"
            alt="Logo"
            className="h-8 w-auto rounded-lg grayscale group-hover:grayscale-0 transition-all duration-500"
          />
          <span className="ml-3 text-lg font-semibold text-neutral-900 tracking-tight-custom">LegitGrinder</span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex space-x-10">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 ${currentPage === link.id ? 'text-[#3B8392]' : 'text-neutral-400 hover:text-[#3B8392]'
                }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-6">
          <button
            onClick={() => onNavigate('login')}
            className="hidden md:block text-xs font-bold uppercase tracking-widest bg-neutral-900 text-white px-8 py-3.5 rounded-full hover:bg-[#3B8392] transition-all shadow-xl shadow-neutral-100"
          >
            Account
          </button>
          <button className="md:hidden p-2 text-neutral-900" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-white border-b border-neutral-100 p-8 md:hidden animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  setIsOpen(false);
                }}
                className={`text-2xl font-medium text-left ${currentPage === link.id ? 'text-neutral-900' : 'text-neutral-400'}`}
              >
                {link.name}
              </button>
            ))}
            <button
              onClick={() => {
                onNavigate('login');
                setIsOpen(false);
              }}
              className="text-lg font-medium text-blue-600 text-left"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
