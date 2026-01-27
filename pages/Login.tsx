
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Mail, Lock, LogIn, UserPlus, Info, Phone, MapPin, Package, Check } from 'lucide-react';
import { saveClientToSupabase } from '../src/services/supabaseData';

interface LoginProps {
  onLoginSuccess: (isAdminLogin?: boolean, userData?: any) => void;
}

const IMPORT_CATEGORIES = [
  'General products',
  'Home products',
  'Business supplies',
  'Electronic and gadgets'
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+254');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (category: string) => {
    if (interests.includes(category)) {
      setInterests(interests.filter(i => i !== category));
    } else {
      setInterests([...interests, category]);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check if admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const isAdmin = profile?.role === 'admin' || data.user.email === 'mungaimports@gmail.com';
        onLoginSuccess(isAdmin, data.user);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Save to clients table
          const { error: clientError } = await saveClientToSupabase({
            id: data.user.id,
            name: fullName,
            email: email,
            phone: phone,
            location: location,
            joinedDate: new Date().toISOString().split('T')[0],
            totalSpentKES: 0,
            orderCount: 0,
            lastOrderDate: 'Never',
            interests: interests,
            purchasedItems: [],
            purchaseFrequency: 'Low'
          });

          if (clientError) {
            console.error('Error saving client data:', clientError);
            // We don't throw here to avoid blocking signup if client record fails
          }
        }

        alert('Verification email sent! Please check your inbox.');
        setIsLogin(true); // Switch to login after successful registration
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 pt-32 pb-20">
      <div className="w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl border border-neutral-100 overflow-hidden">
        <div className="p-12 md:p-16">
          <div className="flex flex-col items-center mb-12">
            <div className="bg-[#3D8593]/10 p-5 rounded-[2rem] text-[#3D8593] mb-6">
              {isLogin ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-3">
              {isLogin ? 'Welcome Back' : 'Join the Elite'}
            </h1>
            <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.4em]">
              {isLogin ? 'Secure Logistics Access' : 'Create Logistics Profile'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div className="relative">
                  <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Full Identity Name"
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Phone Number (+254...)"
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Town / Location"
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">What are you looking to import?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {IMPORT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        className={`flex items-center gap-2 p-4 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border ${interests.includes(cat)
                            ? 'bg-teal-50 border-teal-200 text-[#3D8593]'
                            : 'bg-neutral-50 border-transparent text-gray-400 hover:border-neutral-200'
                          }`}
                      >
                        <div className={`p-1 rounded-md ${interests.includes(cat) ? 'bg-[#3D8593] text-white' : 'bg-gray-200 text-transparent'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="email"
                placeholder="Email Registry"
                required
                className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="password"
                placeholder="Security Passcode"
                required
                className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-500 p-5 rounded-2xl text-[11px] font-bold border border-rose-100 flex items-center gap-3">
                <Info className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-6 bg-neutral-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-2xl disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Manifest Login' : 'Register Identity'}
            </button>
          </form>

          <div className="mt-12 text-center space-y-8">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest hover:text-teal-700 transition-all"
            >
              {isLogin ? "Need a new identity? register here" : "Already registered? login here"}
            </button>

            <div className="pt-8 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                Legit Grinder Secure Access
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
