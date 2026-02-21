import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, User, ArrowRight } from 'lucide-react';
import SafeImage from './SafeImage';

interface NavbarProps {
  isAdmin: boolean;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAdmin, isLoggedIn, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'eBooks', path: '/books' },
    { name: 'Pricelist', path: '/pricelist' },
    { name: 'Calculators', path: '/calculators' },
    { name: 'Blogs', path: '/blogs' },
    { name: 'Consult', path: '/consultation' },
  ];

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
        <Link to="/" className="flex items-center cursor-pointer group">
          <div className="relative">
            <SafeImage
              src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg"
              className="h-10 w-auto rounded-lg transition-transform group-hover:scale-110"
              alt="LegitGrinder Logo"
            />
            {(new Date().getMonth() === 1 && new Date().getDate() >= 1 && new Date().getDate() <= 20) && (
              <span className="absolute -top-2 -right-2 text-xs animate-pulse">❤️</span>
            )}
          </div>
          <div className="ml-3 flex flex-col">
            <span className="text-sm font-black text-gray-900 tracking-tight leading-none">LEGIT GRINDER</span>
            <span className="text-[8px] font-bold text-[#3D8593] uppercase tracking-[0.3em] mt-1">Global Logistics</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex space-x-1 bg-gray-50/50 p-1.5 rounded-full">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => getLinkClass(isActive)}
            >
              {link.name}
            </NavLink>
          ))}

          {/* My Tracker - Public for all users including guests */}
          <NavLink
            to="/tracking"
            className={({ isActive }) => getLinkClass(isActive)}
          >
            My Tracker
          </NavLink>

          {/* Order History - Only for logged-in users */}
          {isLoggedIn && (
            <NavLink
              to="/history"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              Order History
            </NavLink>
          )}

          {/* Admin Link */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => getLinkClass(isActive, true)}
            >
              Admin Hub
            </NavLink>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[#3D8593] text-white px-6 py-3 rounded-full hover:bg-[#2c636e] transition-all shadow-lg shadow-teal-100"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[#3D8593] text-white px-6 py-3 rounded-full hover:bg-[#2c636e] transition-all shadow-lg shadow-teal-100"
            >
              Join Elite <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button className="lg:hidden p-2 text-gray-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full glass rounded-[2rem] p-6 lg:hidden animate-in slide-in-from-top-4 shadow-2xl border-teal-100">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => getMobileLinkClass(isActive)}
              >
                {link.name}
              </NavLink>
            ))}

            {/* My Tracker - Public */}
            <NavLink
              to="/tracking"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => getMobileLinkClass(isActive)}
            >
              My Tracker
            </NavLink>

            {/* Order History - Only for logged-in users */}
            {isLoggedIn && (
              <NavLink
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => getMobileLinkClass(isActive)}
              >
                Order History
              </NavLink>
            )}

            {/* Admin Hub - Conditional */}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => getMobileLinkClass(isActive, true)}
              >
                Admin Hub
              </NavLink>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2"></div>

            {/* Login/Logout */}
            {isLoggedIn ? (
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-[#3D8593] text-white py-4 px-6 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-[#2c636e] transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-[#3D8593] text-white py-4 px-6 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-[#2c636e] transition-all flex items-center justify-center gap-2"
              >
                Join Elite <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
