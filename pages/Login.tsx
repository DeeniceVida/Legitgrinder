
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Mail, Lock, LogIn, UserPlus, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
  onNavigate: (page: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        alert('Verification email sent! Please check your inbox.');
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Full Identity Name"
                  required
                  className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
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
