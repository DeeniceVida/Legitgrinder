import React, { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Optional: Check if user has admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'admin') {
          throw new Error('Access denied. Admin privileges required.');
        }

        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-12 border border-neutral-100 shadow-xl animate-in zoom-in-95 duration-500">
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-neutral-900 rounded-[1.5rem] text-white mb-6 shadow-lg shadow-neutral-200">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight-custom mb-2">Admin Portal</h1>
          <p className="text-neutral-400 font-light">Secure access for LegitGrinder team.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                placeholder="admin@legitgrinder.site"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-16 pr-6 py-4 bg-neutral-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-neutral-200 focus:shadow-lg transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-[#FF9900] text-white rounded-[1.5rem] font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-xl shadow-[#FF9900]/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3 mt-8"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
