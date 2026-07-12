import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, ArrowRight, ChevronDown, History, LayoutDashboard, LogOut, PackageSearch, ShoppingBag, BookOpen, Tag, Calculator, Newspaper, MessageSquare, Info } from 'lucide-react';
import SafeImage from './SafeImage';

interface NavbarProps {
  isAdmin: boolean;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAdmin, isLoggedIn, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the account dropdown whenever the route changes
  useEffect(() => { setAccountOpen(false); }, [location.pathname]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'eBooks', path: '/books' },
    { name: 'Pricelist', path: '/pricelist' },
    { name: 'Calculators', path: '/calculators' },
    { name: 'Blogs', path: '/blogs' },
    { name: 'Consult', path: '/consultation' },
    { name: 'About Us', path: '/about' },
  ];

  // Icons for the mobile menu (keyed by path)
  const mobileIcons: Record<string, React.ReactNode> = {
    '/shop': <ShoppingBag className="w-5 h-5" />,
    '/books': <BookOpen className="w-5 h-5" />,
    '/pricelist': <Tag className="w-5 h-5" />,
    '/calculators': <Calculator className="w-5 h-5" />,
    '/blogs': <Newspaper className="w-5 h-5" />,
    '/consultation': <MessageSquare className="w-5 h-5" />,
    '/about': <Info className="w-5 h-5" />,
    '/tracking': <PackageSearch className="w-5 h-5" />,
    '/history': <History className="w-5 h-5" />,
    '/admin': <LayoutDashboard className="w-5 h-5" />,
  };

  const getLinkClass = (isActive: boolean, isAdminHub: boolean = false) => {
    if (isActive) {
      return `px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isAdminHub ? 'bg-white text-rose-600 shadow-md shadow-teal-900/5' : 'bg-white text-[#3D8593] shadow-md shadow-teal-900/5'}`;
    }
    return `px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isAdminHub ? 'text-gray-400 hover:text-rose-600' : 'text-gray-400 hover:text-[#FF9900]'}`;
  };

  const getMobileLinkClass = (isActive: boolean, isAdminHub: boolean = false) => {
    if (isActive) {
      return `text-xl font-bold p-4 rounded-2xl text-left transition-all ${isAdminHub ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-[#3D8593]'}`;
    }
    return `text-xl font-bold p-4 rounded-2xl text-left transition-all ${isAdminHub ? 'text-gray-400 hover:text-rose-600' : 'text-gray-400 hover:text-[#FF9900]'}`;
  };

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-[1.8rem] px-6 py-3 flex justify-between items-center shadow-xl shadow-teal-900/5 border-white/50">
        <Link to="/" className="flex items-center cursor-pointer group shrink-0">
          <div className="relative shrink-0">
            <SafeImage
              src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg"
              className="h-10 w-auto rounded-lg transition-transform group-hover:scale-110"
              alt="LegitGrinder Logo"
            />
            {(new Date().getMonth() === 1 && new Date().getDate() >= 1 && new Date().getDate() <= 20) && (
              <span className="absolute -top-2 -right-2 text-xs animate-pulse">❤️</span>
            )}
          </div>
          <div className="ml-3 hidden xl:flex flex-col whitespace-nowrap">
            <span className="text-sm font-black text-gray-900 tracking-tight leading-none">LEGIT GRINDER</span>
            <span className="text-[8px] font-bold text-[#3D8593] uppercase tracking-[0.3em] mt-1">Global Logistics</span>
          </div>
        </Link>

        {/* Desktop Links — account actions live in the dropdown, so this never overflows */}
        <div className="hidden lg:flex space-x-0.5 bg-gray-50/50 p-1.5 rounded-full">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => getLinkClass(isActive)}
            >
              {link.name}
            </NavLink>
          ))}
          <NavLink
            to="/tracking"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            My Tracker
          </NavLink>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isLoggedIn ? (
            <div className="hidden lg:block relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2 pl-2 pr-4 py-2 rounded-full transition-all border ${accountOpen ? 'bg-[#3D8593] text-white border-[#3D8593]' : 'bg-white/70 text-gray-900 border-gray-200 hover:border-[#3D8593]'}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${accountOpen ? 'bg-white/20' : 'bg-teal-50 text-[#3D8593]'}`}>
                  <User className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">{isAdmin ? 'Admin' : 'Account'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountOpen && (
                <>
                  {/* click-outside backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)}></div>
                  <div role="menu" className="absolute right-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-2xl shadow-teal-900/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isAdmin && (
                      <Link to="/admin" role="menuitem" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50/60 text-[#3D8593] hover:bg-teal-50 transition-colors mb-1">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Admin Hub</span>
                      </Link>
                    )}
                    <Link to="/tracking" role="menuitem" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      <PackageSearch className="w-4 h-4" />
                      <span className="text-xs font-bold">My Tracker</span>
                    </Link>
                    <Link to="/history" role="menuitem" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      <History className="w-4 h-4" />
                      <span className="text-xs font-bold">Order History</span>
                    </Link>
                    <div className="h-px bg-gray-100 my-1.5"></div>
                    <button
                      onClick={() => { setAccountOpen(false); onLogout(); }}
                      role="menuitem"
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[#3D8593] text-white px-6 py-3 rounded-full hover:bg-[#2c636e] transition-all shadow-lg shadow-teal-100 whitespace-nowrap"
            >
              Join Elite <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button className="lg:hidden p-2 text-gray-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white rounded-[2rem] p-5 lg:hidden animate-in slide-in-from-top-4 duration-300 shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto">
          {/* Browse — icon grid */}
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 px-1 mb-3">Browse</p>
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-center transition-all ${isActive ? 'bg-teal-50 text-[#3D8593]' : 'bg-gray-50 text-gray-500 active:bg-gray-100'}`}
              >
                {mobileIcons[link.path]}
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">{link.name}</span>
              </NavLink>
            ))}
          </div>

          {/* My Account — list rows */}
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 px-1 mb-2">My Account</p>
          <div className="space-y-1 mb-4">
            <NavLink
              to="/tracking"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-teal-50 text-[#3D8593]' : 'text-gray-600 active:bg-gray-50'}`}
            >
              {mobileIcons['/tracking']} My Tracker
            </NavLink>
            {isLoggedIn && (
              <NavLink
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-teal-50 text-[#3D8593]' : 'text-gray-600 active:bg-gray-50'}`}
              >
                {mobileIcons['/history']} Order History
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-rose-50 text-rose-600' : 'text-gray-600 active:bg-gray-50'}`}
              >
                {mobileIcons['/admin']} Admin Hub
              </NavLink>
            )}
          </div>

          {/* Login / Logout */}
          {isLoggedIn ? (
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest active:bg-gray-200 transition-all"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full bg-[#3D8593] text-white py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest active:bg-[#2c636e] transition-all flex items-center justify-center gap-2"
            >
              Join Elite <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
