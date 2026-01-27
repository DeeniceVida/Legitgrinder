
import React, { useState } from 'react';
import { Menu, X, User } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage, isLoggedIn = false, isAdmin = false, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Shop', id: 'shop' },
    { name: 'Pricelist', id: 'pricelist' },
    { name: 'Calculators', id: 'calculators' },
    { name: 'Blogs', id: 'blogs' },
    { name: 'Tracking', id: 'tracking' },
    { name: 'Consult', id: 'consultation' },
  ];

  // Add Admin link only if isAdmin is true
  if (isAdmin) {
    navLinks.push({ name: 'Admin', id: 'admin' });
  }

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-[1.8rem] px-6 py-3 flex justify-between items-center shadow-xl shadow-teal-900/5 border-white/50">
        <div className="flex items-center cursor-pointer group" onClick={() => onNavigate('home')}>
          <img
            src="https://res.cloudinary.com/dsthpp4oj/image/upload/v1766830586/legitGrinder_PNG_3x-100_oikrja.jpg"
            className="h-10 w-auto rounded-lg transition-transform group-hover:scale-110"
            alt="LegitGrinder Logo"
          />
          <div className="ml-3 flex flex-col">
            <span className="text-sm font-black text-gray-900 tracking-tight leading-none">LEGIT GRINDER</span>
            <span className="text-[8px] font-bold text-[#3D8593] uppercase tracking-[0.3em] mt-1">Global Logistics</span>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex space-x-1 bg-gray-50/50 p-1.5 rounded-full">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === link.id
                ? 'bg-white text-[#3D8593] shadow-md shadow-teal-900/5'
                : 'text-gray-400 hover:text-[#FF9900]'
                }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-4 md:px-6 py-3 rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[#3D8593] text-white px-4 md:px-6 py-3 rounded-full hover:bg-[#2c636e] transition-all shadow-lg shadow-teal-100"
            >
              <User className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Account</span>
            </button>
          )}
          <button className="lg:hidden p-2 text-gray-900" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-20 left-0 w-full glass rounded-[2rem] p-6 lg:hidden animate-in slide-in-from-top-4 shadow-2xl border-teal-100">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  setIsOpen(false);
                }}
                className={`text-xl font-bold p-4 rounded-2xl text-left transition-all ${currentPage === link.id ? 'bg-teal-50 text-[#3D8593]' : 'text-gray-400 hover:text-[#FF9900]'
                  }`}
              >
                {link.name}
              </button>
            ))}
            <div className="h-px bg-gray-100 my-2"></div>
            {isLoggedIn ? (
              <button
                onClick={() => {
                  onLogout?.();
                  setIsOpen(false);
                }}
                className="text-xl font-bold p-4 rounded-2xl text-left text-rose-500 flex items-center gap-3 w-full"
              >
                Logout Account
              </button>
            ) : (
              <button
                onClick={() => {
                  onNavigate('login');
                  setIsOpen(false);
                }}
                className="text-xl font-bold p-4 rounded-2xl text-left text-[#3D8593] flex items-center gap-3"
              >
                <User className="w-5 h-5" /> Account / Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
