
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Check, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the user back with tokens in the URL hash.
  // We must wait for the AUTH_SESSION_CHANGED / PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // Also check if there's already an active session (e.g. page refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mesh pt-32 pb-20">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[4rem] p-10 md:p-16 border border-neutral-100 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

          <div className="text-center mb-10 relative z-10">
            <h1 className="text-4xl font-bold tracking-tight mb-3 text-neutral-900">New Password</h1>
            <p className="text-sm text-neutral-500 font-medium">Choose a strong password to secure your account.</p>
            {error && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </div>

          <div className="relative z-10">
            {done ? (
              <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight mb-2">Password Updated!</h3>
                  <p className="text-sm text-neutral-500 font-medium">Your password has been changed successfully. Redirecting you to login…</p>
                </div>
              </div>
            ) : !sessionReady ? (
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center">
                  <ShieldCheck className="w-9 h-9 text-amber-500" />
                </div>
                <p className="text-sm text-neutral-500 font-medium">
                  Waiting for secure session… If nothing happens, please click the reset link in your email again.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                {/* New password */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 px-2">New Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-indigo-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 px-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-600/20 outline-none pr-12"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-indigo-600 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <p className={`mt-2 px-2 text-[10px] font-black uppercase tracking-widest ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-vibrant-teal py-5 rounded-full font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    : <><KeyRound className="w-4 h-4" /> Update Password</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
