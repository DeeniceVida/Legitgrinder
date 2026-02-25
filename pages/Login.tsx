
import React, { useState } from 'react';
import { ArrowRight, Mail, Lock, Phone, User, MapPin, Check, Eye, EyeOff, Sparkles, ShieldCheck, Globe } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../lib/supabase';

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
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // MFA State
  const [mfaFactor, setMfaFactor] = useState<any>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

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
    setError(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        // Check for MFA factors
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const totpFactor = factors.all.find(f => f.factor_type === 'totp' && f.status === 'verified');

        if (totpFactor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          if (challengeError) throw challengeError;
          setMfaFactor(totpFactor);
          setMfaChallengeId(challenge.id);
          setLoading(false);
          return;
        }

        handleSuccessfulAuth(data.user);
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone,
              location: formData.location,
              interests: selectedInterests
            }
          }
        });

        if (authError) throw authError;
        alert('Registration successful! Please check your email to confirm your account.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred');
      console.error('Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactor || !mfaChallengeId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactor.id,
        challengeId: mfaChallengeId,
        code: mfaCode
      });

      if (verifyError) throw verifyError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        handleSuccessfulAuth(user);
      }
    } catch (err: any) {
      setError(err.message || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulAuth = async (user: any) => {
    // Fetch user profile to get role and extra info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    onLoginSuccess(profile?.role === 'admin', {
      name: profile?.name || formData.name,
      email: user.email,
      phone: profile?.phone || formData.phone,
      location: profile?.location || formData.location,
      interests: profile?.interests || []
    });
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
            {error && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex bg-neutral-50 p-2 rounded-3xl mb-12 relative z-10">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl ${isLogin ? 'bg-white shadow-xl text-indigo-600' : 'text-neutral-400'}`}>Member Login</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl ${!isLogin ? 'bg-white shadow-xl text-indigo-600' : 'text-neutral-400'}`}>Join Elite</button>
          </div>

          {mfaFactor ? (
            <form onSubmit={handleMFAVerify} className="space-y-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                  <ShieldCheck className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Two-Step Verification</h3>
                <p className="text-sm text-neutral-500 font-medium">Please enter the 6-digit code from your authenticator app to continue.</p>
              </div>

              <div className="space-y-6">
                <input
                  required
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  className="w-full bg-neutral-50 border-none rounded-[2.5rem] px-10 py-8 font-black text-4xl tracking-[0.5em] text-center focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-neutral-200"
                  placeholder="000000"
                />

                <button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full btn-vibrant-teal py-6 rounded-full font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50">
                  {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMfaFactor(null); setMfaChallengeId(null); setMfaCode(''); }}
                  className="w-full text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-indigo-600 transition-colors"
                >
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {!isLogin && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <input required className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    <input required className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" placeholder="Location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                  <input
                    required
                    type="tel"
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none"
                    placeholder="Phone Number (+254 XXX XXX XXX)"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </>
              )}
              <input type="email" required placeholder="Email Address" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required placeholder="Password" className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none pr-12" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-indigo-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

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
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
