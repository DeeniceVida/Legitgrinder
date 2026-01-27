
import React, { useState } from 'react';
import { ArrowRight, Mail, Lock, Phone, User, MapPin, Check, Eye, EyeOff, Sparkles, ShieldCheck, Globe } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../src/lib/supabase';

interface LoginProps {
  onLoginSuccess: (isAdmin: boolean, userData?: Partial<Client>) => void;
}

const SOURCING_CATEGORIES = [
  'General Products',
  'Home Products',
  'Business Supplies',
  'Electronics and Gadgets'
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    password: '',
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        alert(`Login failed: ${error.message}`);
        setLoading(false);
        return;
      }

      // Check if user has admin role in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      onLoginSuccess(isAdmin, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        interests: selectedInterests
      });
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mesh pt-32 pb-20">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-[4rem] p-10 md:p-16 border border-neutral-100 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
          <div className="text-center mb-12 relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-neutral-900">
              {isLogin ? 'Welcome back' : 'Elite Sourcing Hub'}
            </h1>
          </div>

          <div className="flex bg-neutral-50 p-2 rounded-3xl mb-12 relative z-10">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl ${isLogin ? 'bg-white shadow-xl text-indigo-600' : 'text-neutral-400'}`}>Member Login</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl ${!isLogin ? 'bg-white shadow-xl text-indigo-600' : 'text-neutral-400'}`}>Join Elite</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {!isLogin && (
              <div className="grid md:grid-cols-2 gap-6">
                <input required className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                <input required className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" placeholder="Location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
            )}
            {!isLogin && (
              <input
                type="tel"
                required
                className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            )}
            <input type="email" required placeholder="Email Address" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <input type={showPassword ? 'text' : 'password'} required placeholder="Password" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />

            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                {SOURCING_CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => toggleInterest(cat)} className={`px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${selectedInterests.includes(cat) ? 'bg-indigo-600 text-white' : 'bg-white text-neutral-400 border-neutral-100'}`}>{cat}</button>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-vibrant-teal py-5 rounded-full font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-2xl">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{isLogin ? 'Access Dashboard' : 'Confirm Registration'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
