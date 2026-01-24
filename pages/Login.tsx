
import React, { useState } from 'react';
import { ArrowRight, Mail, Lock, Phone, User, MapPin, Check } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const SOURCING_CATEGORIES = [
  'General Products',
  'Machines',
  'Business Suppliers',
  'Home Products',
  'Electronics & Gadgets'
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth and data collection
    console.log("Collected Sign-up Data:", { selectedInterests });
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-700">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 border border-neutral-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium tracking-tight-custom mb-3 text-neutral-900">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-neutral-400 font-light">
              {isLogin ? 'Access your global import dashboard' : 'Join the elite sourcing platform in Kenya'}
            </p>
          </div>

          <div className="flex bg-neutral-50 p-1 rounded-full mb-10">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${isLogin ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${!isLogin ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      className="w-full bg-neutral-50 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-neutral-200 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Town Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Westlands, Nairobi"
                      className="w-full bg-neutral-50 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-neutral-200 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">What are you sourcing for?</label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCING_CATEGORIES.map(cat => {
                      const isSelected = selectedInterests.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleInterest(cat)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-medium transition-all flex items-center gap-2 border ${
                            isSelected 
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200' 
                              : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full bg-neutral-50 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-neutral-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                <input
                  type="tel"
                  required
                  placeholder="+254..."
                  className="w-full bg-neutral-50 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-neutral-200 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-5 rounded-full font-medium transition-all hover:bg-black flex items-center justify-center group disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Continue to Dashboard' : 'Create Free Account'}
                  <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-8 text-center">
              <button className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">
                Forgot password?
              </button>
            </div>
          )}
        </div>
        
        <p className="mt-10 text-center text-neutral-400 text-xs font-light">
          By continuing, you agree to LegitGrinder's <br/>
          <span className="underline cursor-pointer hover:text-neutral-900 transition-colors">Terms of Service</span> and <span className="underline cursor-pointer hover:text-neutral-900 transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default Login;
